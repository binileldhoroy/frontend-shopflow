import React, { useState, useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '@hooks/useRedux';
import { useDebounce } from '@hooks/useDebounce';
import { productService } from '@api/services/product.service';
import { saleService } from '@api/services/sale.service';
import { customerService } from '@api/services/customer.service';
import { priceTierService, PriceTier, ProductTierPrice } from '@api/services/priceTier.service';
import { addNotification } from '@store/slices/uiSlice';
import { fetchCurrentSession } from '@store/slices/sessionSlice';
import { Search, ShoppingCart, Trash2, CreditCard, Banknote, Plus, Minus, Smartphone, Building2, Tag, BookOpenCheck, Lock, Flag } from 'lucide-react';
import InvoicePreview from '../../components/pos/InvoicePreview';
import OpeningBalanceModal from '../../components/pos/OpeningBalanceModal';
import CloseRegisterModal from '../../components/pos/CloseRegisterModal';

interface CartItem {
  id: number;
  product_id: number;
  name: string;
  sku: string;
  unit_price: number;
  selling_price: number;
  quantity: number;
  gst_rate: number;
  hsn_code: string;
  tax_included: boolean;
  stock_quantity?: number;
  original_selling_price: number;
}

interface CartState {
  items: CartItem[];
  customer_id: number | null;
  billing_state: number | null;
  discount_percentage: number;
  discount_amount: number;
  discount_type: 'percentage' | 'amount';
}

const QuickSale: React.FC = () => {
  const dispatch = useAppDispatch();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // State
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [products, setProducts] = useState<any[]>([]);
  const [priceTiers, setPriceTiers] = useState<PriceTier[]>([]);
  const [productRules, setProductRules] = useState<ProductTierPrice[]>([]);
  const [selectedTierId, setSelectedTierId] = useState<number | null>(null);

  const [cart, setCart] = useState<CartState>({
    items: [],
    customer_id: null,
    billing_state: null,
    discount_percentage: 0,
    discount_amount: 0,
    discount_type: 'amount',
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [completedSale, setCompletedSale] = useState<any>(null);
  const [showInvoice, setShowInvoice] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { needsSessionSetup, currentSession, loading: sessionLoading } = useAppSelector((state) => state.session);

  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [currentCustomerObj, setCurrentCustomerObj] = useState<any>(null);

  // Auto-select if phone matches exactly
  useEffect(() => {
    const searchCustomer = async () => {
      if (guestPhone && guestPhone.length === 10) {
        setIsLoading(true);
        try {
          const response = await customerService.search(guestPhone);
          const results = response.results || response;
          const exactMatch = results.find((c: any) => c.phone === guestPhone);

          if (exactMatch) {
            setCart(prev => ({ ...prev, customer_id: exactMatch.id }));

            // Set the active customer to state so we have their details without reloading all customers
            setCurrentCustomerObj(exactMatch);

            setGuestPhone('');
            setGuestName('');
          }
        } catch (error) {
          console.error('Error searching customer by phone:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    searchCustomer();
  }, [guestPhone]);

  // Fetch Tiers & Rules on Mount
  useEffect(() => {
    const fetchPricingData = async () => {
        try {
            const [tiersData, rulesData] = await Promise.all([
                priceTierService.getAllTiers(),
                priceTierService.getProductRules()
            ]);
            setPriceTiers(tiersData.filter((t: PriceTier) => t.is_active));
            setProductRules(rulesData);
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    };
    fetchPricingData();
  }, []);

  // Fetch Session State
  useEffect(() => {
    dispatch(fetchCurrentSession());
  }, [dispatch]);

  // Server-side search effect
  useEffect(() => {
    const searchProducts = async () => {
      // If search is empty, don't load anything (User request for efficiency)
      if (!debouncedSearchTerm.trim()) {
          setProducts([]);
          return;
      }

      setIsLoading(true);
      try {
        const params: any = { search: debouncedSearchTerm };
        const response = await productService.getAll(params);
        const data = response.results || response;
        setProducts(data.filter((p: any) => p.stock_quantity > 0));
      } catch (error) {
        console.error('Error searching products:', error);
      } finally {
        setIsLoading(false);
      }
    };

    searchProducts();
  }, [debouncedSearchTerm]);

  // Focus search on mount
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  // Price Calculation Logic
  const calculateEffectivePrice = (product: any) => {
    const baseSellingPrice = parseFloat(product.selling_price);
    if (!selectedTierId) return baseSellingPrice;

    // 1. Check for specific product rule
    const rule = productRules.find(r => r.product === product.id && r.tier === selectedTierId);
    if (rule) {
      if (rule.type === 'fixed') {
        return parseFloat(rule.value as any);
      } else {
        // Percentage adjustments
        const percentage = parseFloat(rule.value as any);
        return baseSellingPrice + (baseSellingPrice * (percentage / 100));
      }
    }

    // 2. Check for tier default percentage
    const tier = priceTiers.find(t => t.id === selectedTierId);
    if (tier && tier.default_percentage) {
      const percentage = parseFloat(tier.default_percentage as any);
      return baseSellingPrice + (baseSellingPrice * (percentage / 100));
    }

    // 3. Fallback to base price
    return baseSellingPrice;
  };

  // Recalculate cart when tier changes
  useEffect(() => {
    if (cart.items.length === 0) return;

    setCart(prev => ({
      ...prev,
      items: prev.items.map(item => {
        // Use stored original price as base
        const baseSellingPrice = item.original_selling_price;

        let newSellingPrice = baseSellingPrice;

        if (selectedTierId) {
            // 1. Check for specific product rule
            const rule = productRules.find(r => r.product === item.product_id && r.tier === selectedTierId);
            if (rule) {
              if (rule.type === 'fixed') {
                newSellingPrice = parseFloat(rule.value as any);
              } else {
                // Percentage adjustments
                const percentage = parseFloat(rule.value as any);
                newSellingPrice = baseSellingPrice + (baseSellingPrice * (percentage / 100));
              }
            } else {
                // 2. Check for tier default percentage
                const tier = priceTiers.find(t => t.id === selectedTierId);
                if (tier && tier.default_percentage) {
                  const percentage = parseFloat(tier.default_percentage as any);
                  newSellingPrice = baseSellingPrice + (baseSellingPrice * (percentage / 100));
                }
            }
        }

        // Recalculate unit price (base price before tax) if tax is included
        let newUnitPrice = newSellingPrice;

        if (item.tax_included) {
          // Ensure gst_rate is valid and positive
          const gstRate = item.gst_rate || 0;
          if (gstRate > 0 && gstRate < 100) {
            const divisor = 1 + (gstRate / 100);
            newUnitPrice = newSellingPrice / divisor;
          } else {
            // If GST rate is invalid, use selling price as unit price
            console.warn(`Invalid GST rate for ${item.name}: ${gstRate}. Using selling price as unit price.`);
            newUnitPrice = newSellingPrice;
          }
        }

        // Validate the calculated unit price
        if (isNaN(newUnitPrice) || !isFinite(newUnitPrice) || newUnitPrice > 9999999999.99 || newUnitPrice < 0) {
          console.error(`Invalid unit_price calculated for ${item.name}:`, {
            newUnitPrice,
            newSellingPrice,
            gst_rate: item.gst_rate,
            tax_included: item.tax_included
          });
          // Fallback to original selling price
          newUnitPrice = baseSellingPrice;
        }

        return {
          ...item,
          selling_price: newSellingPrice,
          unit_price: newUnitPrice
        };
      })
    }));
  }, [selectedTierId, productRules, priceTiers]);


  const handleAddToCart = (product: any) => {
    const existingItem = cart.items.find(item => item.product_id === product.id);
    const effectivePrice = calculateEffectivePrice(product);

    if (existingItem) {
      if (existingItem.quantity >= product.stock_quantity) {
        dispatch(addNotification({ message: `Only ${product.stock_quantity} available`, type: 'error' }));
        return;
      }
      // Update price if tier changed (handled by effect usually, but here immediate)
       setCart(prev => ({
        ...prev,
        items: prev.items.map(item =>
          item.product_id === product.id
          ? { ...item, quantity: item.quantity + 1, selling_price: effectivePrice }
          : item
        )
      }));
    } else {
      // Calculate base price (unit_price before tax)
      let basePrice = effectivePrice;

      if (product.tax_included) {
        const gstRate = parseFloat(product.gst_rate) || 0;
        if (gstRate > 0 && gstRate < 100) {
          const divisor = 1 + (gstRate / 100);
          basePrice = effectivePrice / divisor;
        } else {
          console.warn(`Invalid GST rate for ${product.name}: ${gstRate}. Using selling price as unit price.`);
          basePrice = effectivePrice;
        }
      }

      // Validate the calculated base price
      if (isNaN(basePrice) || !isFinite(basePrice) || basePrice > 9999999999.99 || basePrice < 0) {
        console.error(`Invalid unit_price calculated for ${product.name}:`, {
          basePrice,
          effectivePrice,
          gst_rate: product.gst_rate,
          tax_included: product.tax_included
        });
        dispatch(addNotification({
          message: `Error: Invalid price for ${product.name}. Please check product settings.`,
          type: 'error'
        }));
        return;
      }

      // Round to 2 decimal places to prevent excessive precision
      const roundedBasePrice = parseFloat(basePrice.toFixed(2));
      const roundedEffectivePrice = parseFloat(effectivePrice.toFixed(2));

      const newItem: CartItem = {
        id: Date.now(),
        product_id: product.id,
        name: product.name,
        sku: product.sku,
        unit_price: roundedBasePrice,
        selling_price: roundedEffectivePrice,
        quantity: 1,
        gst_rate: parseFloat(product.gst_rate),
        hsn_code: product.hsn_code,
        tax_included: product.tax_included,
        stock_quantity: product.stock_quantity,
        original_selling_price: parseFloat(product.selling_price),
      };
      setCart(prev => ({ ...prev, items: [...prev.items, newItem] }));
    }
    // Optional: Clear search after selection to be ready for next scan?
    // User might want to search again.
    setSearchTerm('');
    if(searchInputRef.current) searchInputRef.current.focus();
  };

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (!searchTerm.trim()) return;

      // Immediate search for scanning behavior
      try {
         const response = await productService.getAll({ search: searchTerm });
         const results = response.results || response;

         const validResults = results.filter((p: any) => p.stock_quantity > 0);
         setProducts(validResults);

         // Check exact match
         const exactMatch = validResults.find((p: any) =>
            p.sku.toLowerCase() === searchTerm.toLowerCase() ||
            (p.barcode && p.barcode.toLowerCase() === searchTerm.toLowerCase())
         );

         if (exactMatch) {
            handleAddToCart(exactMatch);
         } else if (validResults.length === 1) {
             // Optional: if only one result found but not exact string match, auto add?
             // Maybe safer to only auto-add on exact barcode/sku match.
             // handleAddToCart(validResults[0]);
         }
      } catch (err) {
         console.error("Scan error", err);
      }
    }
  };

  const removeItem = (id: number) => {
    setCart(prev => ({ ...prev, items: prev.items.filter(i => i.id !== id) }));
  };

  const updateQuantity = (id: number, delta: number) => {
    setCart(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.id === id) {
          const newQty = item.quantity + delta;
          if (newQty < 1) return item;
          if (item.stock_quantity && newQty > item.stock_quantity) {
             // dispatch(addNotification(...)); // Optional: notify
             return item;
          }
          return { ...item, quantity: newQty };
        }
        return item;
      })
    }));
  };

  // Calculations
  const calculateTotals = () => {
    let subtotal = 0;
    const taxBreakdown: Record<number, { taxableAmount: number; cgst: number; sgst: number; taxAmount: number }> = {};
    let totalGst = 0;
    let exemptedAmount = 0;

    cart.items.forEach(item => {
      const q = item.quantity;
      const gstRate = item.gst_rate;
      const rateConfig = gstRate / 100;

      let itemBaseTotal = 0;
      let itemGstAmount = 0;

      if (item.tax_included) {
        const totalWithTax = item.selling_price * q;
        itemBaseTotal = totalWithTax / (1 + rateConfig);
        itemGstAmount = totalWithTax - itemBaseTotal;
      } else {
        itemBaseTotal = item.unit_price * q;
        itemGstAmount = itemBaseTotal * rateConfig;
      }

      subtotal += itemBaseTotal;

      if (gstRate === 0) {
        exemptedAmount += itemBaseTotal;
      } else {
        if (!taxBreakdown[gstRate]) {
          taxBreakdown[gstRate] = { taxableAmount: 0, cgst: 0, sgst: 0, taxAmount: 0 };
        }
        taxBreakdown[gstRate].taxableAmount += itemBaseTotal;
        taxBreakdown[gstRate].taxAmount += itemGstAmount;
        taxBreakdown[gstRate].cgst += itemGstAmount / 2;
        taxBreakdown[gstRate].sgst += itemGstAmount / 2;
        totalGst += itemGstAmount;
      }
    });

    const discount = cart.discount_type === 'percentage'
      ? (subtotal * cart.discount_percentage) / 100
      : cart.discount_amount;
    const grossTotal = subtotal + totalGst - discount;
    const grandTotal = Math.round(grossTotal);
    const roundOff = grandTotal - grossTotal;

    return {
        subtotal,
        taxBreakdown,
        totalGst,
        exemptedAmount,
        discount,
        grossTotal,
        roundOff,
        grandTotal
    };
  };

  const totals = calculateTotals();

  // Credit Eligibility Check
  const currentCustomer = currentCustomerObj;
  const isEligibleForCredit = currentCustomer && !currentCustomer.is_guest;
  const creditLimit = currentCustomer?.credit_limit ? parseFloat(currentCustomer.credit_limit) : 0;
  const outstandingBalance = currentCustomer?.outstanding_balance ? parseFloat(currentCustomer.outstanding_balance) : 0;

  const hasCreditLimit = creditLimit > 0;
  const availableCredit = hasCreditLimit ? creditLimit - outstandingBalance : Infinity;
  const canAffordCredit = availableCredit >= totals.grandTotal;

  // Payment
  const processPayment = async (method: string) => {
    if (cart.items.length === 0) return;

    if (guestPhone && guestPhone.length !== 10) {
      dispatch(addNotification({ message: 'Phone number must be exactly 10 digits', type: 'error' }));
      return;
    }

    setIsProcessing(true);

    try {
      // Setup customer
      let customerId = cart.customer_id;

      if (!customerId && (guestName || guestPhone)) {
        // If there's an exact phone match in the current retrieved obj, use that instead of creating
        if (currentCustomerObj && currentCustomerObj.phone === guestPhone) {
          customerId = currentCustomerObj.id;
        } else {
          const payload: any = {
            name: guestName || 'Walk-in Customer',
          };
          if (guestPhone) payload.phone = guestPhone;
          // Create customer in DB
          const guest = await customerService.create(payload);
          customerId = guest.id;
          setCurrentCustomerObj(guest);
        }
      }

      // Debug: Log cart items to identify the issue
      console.log("=== DEBUG: Cart Items Before Payment ===");
      cart.items.forEach((item, idx) => {
        console.log(`Item ${idx}:`, {
          name: item.name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          selling_price: item.selling_price,
          gst_rate: item.gst_rate,
          tax_included: item.tax_included,
          original_selling_price: item.original_selling_price
        });

        // Validate unit_price
        if (item.unit_price > 9999999999.99) {
          console.error(`ERROR: Item ${item.name} has invalid unit_price: ${item.unit_price}`);
        }
      });
      console.log("=" + "=".repeat(39));

      const saleData = {
        order_number: `QS-${Date.now()}`,
        customer: customerId,
        payment_method: method,
        payment_status: 'paid',
        billing_state: cart.billing_state,
        place_of_supply: cart.billing_state,
        discount_percentage: cart.discount_type === 'percentage' ? cart.discount_percentage : 0,
        discount_amount: cart.discount_type === 'amount' ? cart.discount_amount : 0,
        items: cart.items.map(item => {
          // Round unit_price to 2 decimal places and ensure it's a valid number
          const validUnitPrice = parseFloat(item.unit_price.toFixed(2));

          // Additional validation
          if (isNaN(validUnitPrice) || validUnitPrice > 9999999999.99) {
            console.error(`Invalid unit_price for ${item.name}: ${item.unit_price}`);
            throw new Error(`Invalid price for ${item.name}. Please check the product pricing.`);
          }

          return {
            product: item.product_id,
            quantity: item.quantity,
            unit_price: validUnitPrice,
            gst_rate: item.gst_rate,
            hsn_code: item.hsn_code,
          };
        })
      };

      console.log("=== DEBUG: Sale Data Being Sent ===", saleData);

      const sale = await saleService.create(saleData);

      // Attach customer data for InvoicePreview
      const printCustomer = currentCustomerObj || { name: guestName || 'Walk-in Customer', phone: guestPhone };
      sale.customer = printCustomer;

      setCompletedSale(sale);
      setShowInvoice(true);
      dispatch(addNotification({ message: 'Sale Completed', type: 'success' }));
    } catch (err: any) {
      console.error("Payment Error:", err);
      dispatch(addNotification({ message: err?.response?.data?.error || err?.message || 'Payment Failed', type: 'error' }));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCloseInvoice = () => {
    setShowInvoice(false);
    setCompletedSale(null);
    setCart({
      items: [],
      customer_id: null,
      billing_state: null,
      discount_percentage: 0,
      discount_amount: 0,
      discount_type: 'amount'
    });
    setGuestName('');
    setGuestPhone('');
    setCurrentCustomerObj(null);
    setSearchTerm('');
    if (searchInputRef.current) searchInputRef.current.focus(); // Refocus for next sale
  };

  // Handle Search Input Click
  const [showSearchResults, setShowSearchResults] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) && searchInputRef.current && !searchInputRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Render
  return (
    <div className="h-full flex gap-4 p-2 relative">
      {/* Left Panel: Search & Cart (Main Area) */}
      <div className="flex-1 flex flex-col gap-3 h-[calc(100vh-4rem)]">
        {/* Search Bar - Top of Left Panel */}
        <div className="card shadow-sm p-3 relative z-20">
           <div className="relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
             <input
               ref={searchInputRef}
               type="text"
               placeholder="Scan barcode or type product name..."
               className="w-full pl-10 pr-4 py-2 text-lg border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all outline-none"
               value={searchTerm}
               onChange={e => {
                  setSearchTerm(e.target.value);
                  setShowSearchResults(true);
               }}
               onFocus={() => { if(searchTerm || products.length > 0) setShowSearchResults(true); }}
               onKeyDown={handleKeyDown}
               autoFocus
             />
           </div>

           {/* Floating Search Results */}
           {showSearchResults && (searchTerm || products.length > 0) && (
             <div ref={dropdownRef} className="absolute left-0 right-0 top-full mt-2 bg-white rounded-xl shadow-xl border border-gray-200 max-h-[60vh] overflow-y-auto z-50">
                {isLoading ? (
                  <div className="p-4 text-center text-gray-500">Searching...</div>
                ) : products.length > 0 ? (
                  <div className="p-2 space-y-1">
                    {products.map(product => {
                       const effectivePrice = calculateEffectivePrice(product);
                       const isDiscounted = effectivePrice < parseFloat(product.selling_price);
                       const isPremium = effectivePrice > parseFloat(product.selling_price);

                       return (
                      <button
                        key={product.id}
                        onClick={() => {
                           handleAddToCart(product);
                           setShowSearchResults(false);
                        }}
                        className="w-full flex items-center justify-between p-3 hover:bg-blue-50 rounded-lg group transition-colors text-left"
                      >
                        <div>
                          <div className="font-semibold text-gray-800">{product.name}</div>
                          <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                            <span className="bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">SKU: {product.sku}</span>
                            {product.barcode && <span className="text-gray-400">| {product.barcode}</span>}
                          </div>
                        </div>
                        <div className="text-right">
                           <div className={`font-bold text-lg leading-none ${isDiscounted ? 'text-green-600' : isPremium ? 'text-yellow-600' : 'text-blue-600'}`}>
                               ₹{effectivePrice.toFixed(2)}
                           </div>
                           <div className="text-[10px] font-medium text-green-600 mt-1 bg-green-50 inline-block px-1 rounded-sm border border-green-100">
                             {product.stock_quantity} in stock
                           </div>
                        </div>
                      </button>
                    )})}
                  </div>
                ) : searchTerm && !isLoading ? (
                  <div className="p-8 text-center text-gray-400">No products found for "{searchTerm}"</div>
                ) : null}
             </div>
           )}
        </div>

      {/* Block UI if session is locked */}
      {needsSessionSetup && !sessionLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-xl shadow-sm border border-gray-100">
           <Lock className="w-16 h-16 text-gray-300 mb-4" />
           <h3 className="text-xl font-bold text-gray-800">Register Closed</h3>
           <p className="text-gray-500 mt-2">Open a register session on the right to start making sales.</p>
        </div>
      ) : (
        <div className="flex-1 card shadow-sm flex flex-col p-0 overflow-hidden relative z-10">
          <div className="p-3 border-b bg-gray-50 flex justify-between items-center">
            <h2 className="font-semibold text-gray-700 flex items-center gap-2 text-sm border-l-2 border-blue-500 pl-2 -ml-3">
              <ShoppingCart className="w-5 h-5"/>
              Cart Items
            </h2>
            <div className="flex items-center gap-3">
              {currentSession && (
                <div className="flex items-center border border-green-200 rounded-full overflow-hidden shadow-sm">
                  <span className="px-2 py-0.5 bg-green-50 text-green-700 text-xs font-semibold">
                    Session Active
                  </span>
                  <button
                    onClick={() => setShowCloseModal(true)}
                    className="px-2 py-0.5 bg-white hover:bg-red-50 text-red-600 text-[10px] font-bold border-l border-green-200 flex items-center gap-1 transition-colors uppercase tracking-wider"
                  >
                    <Flag className="w-3 h-3" /> Close Register
                  </button>
                </div>
              )}
              {cart.items.length > 0 && (
                <span className="text-xs font-medium bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                  {cart.items.reduce((acc, i) => acc + i.quantity, 0)} Items
                </span>
              )}
            </div>
          </div>

          <div className="overflow-y-auto flex-1 p-3 bg-gray-50/30">
            {cart.items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-3">
                 <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-2">
                   <ShoppingCart className="w-10 h-10 text-gray-300"/>
                 </div>
                 <p className="text-gray-500 font-medium text-lg">Your cart is empty</p>
                 <p className="text-sm">Scan a barcode or search for products above to begin</p>
              </div>
            ) : (
              <div className="space-y-2">
                 {cart.items.map((item, index) => (
                   <div key={item.id} className="flex items-center gap-4 p-3 bg-white border border-gray-100 rounded-xl shadow-sm hover:border-blue-200 transition-colors group">
                     {/* Row Number connecting it physically in layout */}
                     <div className="w-6 h-6 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center text-xs font-bold font-mono shrink-0">
                       {index + 1}
                     </div>

                     {/* Product Details */}
                     <div className="flex-1 min-w-0">
                       <div className="font-bold text-gray-800 text-sm xl:text-base truncate pr-4">{item.name}</div>
                       <div className="flex items-center gap-3 mt-1">
                          <span className="text-[11px] text-gray-400 font-mono">SKU: {item.sku}</span>
                          <span className="text-[11px] font-medium text-gray-500 bg-gray-50 px-1.5 rounded">₹{item.unit_price.toFixed(2)} / unit</span>
                          {item.tax_included && <span className="text-[10px] text-blue-600 bg-blue-50 px-1 rounded border border-blue-100">Inc. Tax ({item.gst_rate}%)</span>}
                       </div>
                     </div>

                     {/* Quantity Control */}
                     <div className="flex items-center bg-gray-50 rounded-lg border border-gray-200 shadow-inner h-10 w-32 shrink-0">
                       <button onClick={() => updateQuantity(item.id, -1)} className="w-10 h-full flex items-center justify-center hover:bg-gray-200 text-gray-600 transition-colors rounded-l-lg"><Minus className="w-4 h-4"/></button>
                       <span className="flex-1 text-center font-bold text-gray-800 text-sm bg-white h-full flex items-center justify-center">{item.quantity}</span>
                       <button onClick={() => updateQuantity(item.id, 1)} className="w-10 h-full flex items-center justify-center hover:bg-gray-200 text-gray-600 transition-colors rounded-r-lg"><Plus className="w-4 h-4"/></button>
                     </div>

                     {/* Totals & Delete */}
                     <div className="flex flex-col items-end shrink-0 w-28">
                       <div className="font-bold text-lg text-gray-900 leading-none mb-1">
                         ₹{(item.selling_price * item.quantity).toFixed(2)}
                       </div>
                       <div className="text-[10px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                         Base: ₹{(item.unit_price * item.quantity).toFixed(2)}
                       </div>
                     </div>
                     <button
                       onClick={() => removeItem(item.id)}
                       className="p-2 ml-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-50 group-hover:opacity-100"
                       title="Remove Item"
                     >
                       <Trash2 className="w-5 h-5"/>
                     </button>
                   </div>
                 ))}
              </div>
            )}
          </div>
        </div>
      )}
      </div>

      {/* Right Panel: Customer, Totals & Payments */}
      {needsSessionSetup ? (
        <div className="w-[350px] lg:w-[400px]">
          <OpeningBalanceModal />
        </div>
      ) : (
      <div className="w-[350px] lg:w-[400px] flex flex-col gap-3 h-[calc(100vh-4rem)]">

        {/* Customer Details & Pricing Tier */}
        <div className="card shrink-0 shadow-sm p-3 border border-gray-100">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5 border-l-2 border-blue-500 pl-2 -ml-3">
              Customer Details
            </h3>
            <div className="flex items-center gap-1.5 bg-gray-50 rounded border border-gray-200 px-2 py-0.5">
              <Tag className="w-3 h-3 text-gray-500" />
              <select
                value={selectedTierId || ''}
                onChange={(e) => setSelectedTierId(e.target.value ? Number(e.target.value) : null)}
                className="bg-transparent border-none text-[11px] focus:ring-0 outline-none w-20 text-gray-700 cursor-pointer p-0"
              >
                <option value="">Standard</option>
                {priceTiers.map(tier => (
                  <option key={tier.id} value={tier.id}>
                    {tier.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {cart.customer_id ? (
            <div className="flex items-center justify-between p-2.5 bg-blue-50/50 border border-blue-100 rounded-lg">
              <div className="flex-1 min-w-0 pr-2">
                <div className="font-semibold text-sm text-gray-800 truncate">{currentCustomerObj?.name}</div>
                <div className="text-xs text-gray-500">{currentCustomerObj?.phone}</div>
                {isEligibleForCredit && (
                  <div className="mt-1 text-[11px] font-medium bg-white px-2 py-0.5 rounded shadow-sm inline-block border border-gray-100">
                    <span className="text-gray-500">Bal: </span>
                    <span className={outstandingBalance > 0 ? 'text-red-500' : 'text-green-600'}>
                      ₹{outstandingBalance.toFixed(2)}
                    </span>
                    {hasCreditLimit && (
                      <>
                        <span className="mx-1.5 text-gray-300">|</span>
                        <span className="text-gray-500">Limit: </span>
                        <span className="text-gray-700">₹{creditLimit.toFixed(2)}</span>
                      </>
                    )}
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                   setCart(prev => ({ ...prev, customer_id: null }));
                   setCurrentCustomerObj(null);
                }}
                className="text-red-500 hover:bg-red-50 p-2 rounded transition-colors"
                title="Remove Customer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="tel"
                placeholder="Phone No."
                value={guestPhone}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setGuestPhone(val);
                }}
                className="input-field py-1.5 px-2.5 text-xs flex-1 border-gray-200"
              />
              <input
                type="text"
                placeholder="Name (opt)"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className="input-field py-1.5 px-2.5 text-xs flex-1 border-gray-200"
              />
            </div>
          )}
        </div>

        {/* Totals & Payments */}
        <div className="card flex-1 flex flex-col p-0 shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-3 border-b border-gray-100 bg-gray-50/50">
             <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5 border-l-2 border-blue-500 pl-2 -ml-3">
               Order Summary
             </h3>
          </div>

          <div className="p-4 space-y-2.5 flex-1 overflow-y-auto">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span>
                <span className="font-medium text-gray-700">₹{totals.subtotal.toFixed(2)}</span>
              </div>

              {/* Discount Input */}
              <div className="flex justify-between items-center py-2.5 border-y border-dashed border-gray-100 my-1">
                <span className="text-sm text-gray-600">Discount</span>
                <div className="flex items-center gap-2">
                  <div className="flex bg-gray-100 rounded p-0.5 border border-gray-200">
                    <button
                      onClick={() => setCart(prev => ({ ...prev, discount_type: 'percentage' }))}
                      className={`px-2 py-0.5 text-xs font-semibold rounded ${cart.discount_type === 'percentage' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'}`}
                    >%</button>
                    <button
                      onClick={() => setCart(prev => ({ ...prev, discount_type: 'amount' }))}
                      className={`px-2 py-0.5 text-xs font-semibold rounded ${cart.discount_type === 'amount' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'}`}
                    >₹</button>
                  </div>
                  <input
                    type="number"
                    min="0"
                    value={cart.discount_type === 'percentage' ? (cart.discount_percentage || '') : (cart.discount_amount || '')}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      if (cart.discount_type === 'percentage') {
                        setCart(prev => ({ ...prev, discount_percentage: val > 100 ? 100 : val }));
                      } else {
                        setCart(prev => ({ ...prev, discount_amount: val }));
                      }
                    }}
                    className="w-20 text-right p-1 border border-gray-200 rounded text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-all text-gray-700 font-medium"
                    placeholder="0"
                  />
                </div>
              </div>

              {totals.discount > 0 && (
                <div className="flex justify-between text-sm text-green-600 font-medium pb-2">
                  <span>Discount Applied</span>
                  <span>-₹{totals.discount.toFixed(2)}</span>
                </div>
              )}

              {/* Compact Tax display with Tooltip */}
              <div className="flex justify-between text-sm text-gray-600 py-1">
                  <div className="group relative flex items-center gap-1 cursor-help">
                    <span className="border-b border-dashed border-gray-400">Total Tax</span>
                    <div className="hidden group-hover:block absolute bottom-full left-0 mb-1 w-52 bg-gray-800 text-white p-2.5 text-xs rounded-lg shadow-xl z-50">
                      <div className="font-semibold mb-1 pb-1 border-b border-gray-600">Tax Breakdown</div>
                      {Object.entries(totals.taxBreakdown).length > 0 ? Object.entries(totals.taxBreakdown).sort(([a], [b]) => Number(b) - Number(a)).map(([rate, breakdown]) => (
                         <div key={rate} className="flex justify-between mb-0.5">
                            <span>GST @ {rate}%:</span>
                            <span>₹{breakdown.taxAmount.toFixed(2)}</span>
                         </div>
                      )) : <div className="text-gray-400 italic">No tax applicable</div>}
                      {totals.exemptedAmount > 0 && (
                         <div className="flex justify-between text-gray-300 mt-2 border-t border-gray-600 pt-1">
                            <span>Exempted 0%:</span>
                            <span>₹{totals.exemptedAmount.toFixed(2)}</span>
                         </div>
                      )}
                    </div>
                  </div>
                  <span className="font-medium text-gray-700">₹{totals.totalGst.toFixed(2)}</span>
              </div>

              {totals.roundOff !== 0 && (
                <div className="flex justify-between text-xs text-gray-400 py-1">
                  <span>Round Off</span>
                  <span>{totals.roundOff > 0 ? '+' : ''}₹{totals.roundOff.toFixed(2)}</span>
                </div>
              )}
          </div>

          <div className="bg-blue-50/50 p-4 border-t border-blue-100">
              <div className="flex justify-between items-end mb-4">
                <span className="font-bold text-gray-700 text-lg">Grand Total</span>
                <span className="text-3xl font-bold text-blue-600 leading-none tracking-tight">₹{totals.grandTotal.toFixed(2)}</span>
              </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                disabled={isProcessing || cart.items.length === 0}
                onClick={() => processPayment('cash')}
                className="flex items-center justify-center gap-2 py-3 bg-white border-2 border-green-500 hover:bg-green-50 text-green-700 rounded-xl shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:border-gray-200 disabled:text-gray-400 disabled:bg-gray-50 group"
              >
                <Banknote className="w-5 h-5 group-disabled:text-gray-400 text-green-600"/>
                <span className="font-bold text-sm">CASH</span>
              </button>
              <button
                disabled={isProcessing || cart.items.length === 0}
                onClick={() => processPayment('upi')}
                className="flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
              >
                <Smartphone className="w-5 h-5"/>
                <span className="font-bold text-sm tracking-wide">UPI</span>
              </button>
              <button
                disabled={isProcessing || cart.items.length === 0}
                onClick={() => processPayment('card')}
                className="flex items-center justify-center gap-2 py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl shadow-md transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
              >
                <CreditCard className="w-5 h-5"/>
                <span className="font-bold text-sm tracking-wide">CARD</span>
              </button>
              <button
                disabled={isProcessing || cart.items.length === 0 || !isEligibleForCredit || !canAffordCredit}
                onClick={() => processPayment('credit')}
                title={!isEligibleForCredit ? 'Only for registered customers' : !canAffordCredit ? 'Credit limit exceeded' : 'Pay via Credit'}
                className="flex items-center justify-center gap-2 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl shadow-md transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
              >
                <BookOpenCheck className="w-5 h-5"/>
                <span className="font-bold text-sm tracking-wide">CREDIT</span>
              </button>
            </div>

             <button
                disabled={isProcessing || cart.items.length === 0}
                onClick={() => processPayment('net_banking')}
                className="mt-2.5 w-full flex items-center justify-center gap-2 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
              >
                <Building2 className="w-4 h-4 text-gray-500"/>
                <span className="font-semibold text-xs tracking-wide">NET BANKING</span>
              </button>
          </div>
        </div>
      </div>
      )}

      {/* Invisible Invoice for Printing (or Modal if preferred) */}
      {showInvoice && completedSale && (
        <InvoicePreview sale={completedSale} onClose={handleCloseInvoice} />
      )}

      {/* Session Management Modals */}
      {showCloseModal && <CloseRegisterModal onClose={() => setShowCloseModal(false)} />}
    </div>
  );
};

export default QuickSale;
