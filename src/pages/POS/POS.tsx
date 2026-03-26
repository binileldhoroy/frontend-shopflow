import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@hooks/useRedux';
import { productService } from '@api/services/product.service';
import { customerService } from '@api/services/customer.service';
import { saleService } from '@api/services/sale.service';
import { priceTierService, PriceTier, ProductTierPrice } from '@api/services/priceTier.service';
import { addNotification } from '@store/slices/uiSlice';
import { fetchCurrentSession } from '@store/slices/sessionSlice';
import { Search, Plus, Minus, Trash2, ShoppingCart, Package, Tag, Lock, Flag, Wallet } from 'lucide-react';
import PaymentModal from '../../components/pos/PaymentModal';
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
}

interface CartState {
  items: CartItem[];
  customer_id: number | null;
  billing_state: number | null;
  discount_percentage: number;
  discount_amount: number;
  discount_type: 'percentage' | 'amount';
}

const POS: React.FC = () => {
  const dispatch = useAppDispatch();
  const [productSearch, setProductSearch] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [priceTiers, setPriceTiers] = useState<PriceTier[]>([]);
  const [productRules, setProductRules] = useState<ProductTierPrice[]>([]);
  const [selectedTierId, setSelectedTierId] = useState<number | null>(null);

  // Infinite scroll state
  const [posPage, setPosPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [posLoading, setPosLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [, setIsLoading] = useState(false);

  const { needsSessionSetup, currentSession, loading: sessionLoading } = useAppSelector((state) => state.session);

  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [currentCustomerObj, setCurrentCustomerObj] = useState<any>(null);

  const [completedSale, setCompletedSale] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const [cart, setCart] = useState<CartState>({
    items: [],
    customer_id: null,
    billing_state: null,
    discount_percentage: 0,
    discount_amount: 0,
    discount_type: 'amount',
  });

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

  // Fetch products (paginated, appending)
  const fetchProducts = useCallback(async (page: number, search: string, reset: boolean) => {
    if (posLoading) return;
    setPosLoading(true);
    try {
      const data = await productService.getAll({
        page,
        page_size: 25,
        ...(search ? { search } : {}),
      });
      const results: any[] = data.results || data;
      const totalCount = data.count ?? results.length;

      const inStock = results.filter((p: any) => p.stock_quantity > 0);
      setProducts(prev => reset ? inStock : [...prev, ...inStock]);
      setHasMore(page * 25 < totalCount);
      setPosPage(page);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setPosLoading(false);
    }
  }, []);

  // Fetch initial data (tiers + rules once, products paginated)
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [tiersData, rulesData] = await Promise.all([
          priceTierService.getAllTiers(),
          priceTierService.getProductRules()
        ]);
        setPriceTiers(tiersData.filter((t: PriceTier) => t.is_active));
        setProductRules(rulesData);
      } catch (error) {
        console.error('Error fetching tiers/rules:', error);
        dispatch(addNotification({ message: 'Failed to load POS data', type: 'error' }));
      }
    };
    fetchInitialData();
    fetchProducts(1, '', true);
  }, [dispatch, fetchProducts]);

  // Handle Session State
  useEffect(() => {
    dispatch(fetchCurrentSession());
  }, [dispatch]);

  // IntersectionObserver: load next page when sentinel is visible
  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !posLoading) {
          fetchProducts(posPage + 1, productSearch, false);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, posLoading, posPage, productSearch, fetchProducts]);

  // Debounce search → reset to page 1
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setProducts([]);
      setHasMore(true);
      fetchProducts(1, productSearch, true);
    }, 300);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [productSearch]); // intentionally omit fetchProducts to avoid loop

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
        const product = products.find(p => p.id === item.product_id);
        if (!product) return item;

        const newSellingPrice = calculateEffectivePrice(product);

        // Calculate base price with proper GST handling
        let newBasePrice = newSellingPrice;
        if (product.tax_included) {
          const gstRate = parseFloat(product.gst_rate) || 0;
          if (gstRate > 0 && gstRate < 100) {
            newBasePrice = newSellingPrice / (1 + gstRate / 100);
          }
        }

        // Round to 2 decimal places to prevent excessive precision
        const roundedBasePrice = parseFloat(newBasePrice.toFixed(2));
        const roundedSellingPrice = parseFloat(newSellingPrice.toFixed(2));

        return {
          ...item,
          selling_price: roundedSellingPrice,
          unit_price: roundedBasePrice
        };
      })
    }));
  }, [selectedTierId, products, productRules]); // Dependent on these changes

  // Credit Eligibility Check
  const currentCustomer = currentCustomerObj;
  const isEligibleForCredit = currentCustomer && !currentCustomer.is_guest;

  const handleAddToCart = (product: any) => {
    if (!product.stock_quantity || product.stock_quantity <= 0) {
      dispatch(addNotification({ message: 'Product is out of stock', type: 'error' }));
      return;
    }

    const effectivePrice = calculateEffectivePrice(product);

    // Check if already in cart
    const existingItem = cart.items.find(item => item.product_id === product.id);
    if (existingItem) {
      if (existingItem.quantity >= product.stock_quantity) {
        dispatch(addNotification({ message: `Only ${product.stock_quantity} units available`, type: 'error' }));
        return;
      }
      setCart(prev => ({
        ...prev,
        items: prev.items.map(item =>
          item.product_id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        ),
      }));
    } else {
      // Calculate base price with proper GST handling
      let basePrice = effectivePrice;
      if (product.tax_included) {
        const gstRate = parseFloat(product.gst_rate) || 0;
        if (gstRate > 0 && gstRate < 100) {
          basePrice = effectivePrice / (1 + gstRate / 100);
        }
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
      };

      setCart(prev => ({
        ...prev,
        items: [...prev.items, newItem],
      }));
    }
    setProductSearch('');
  };

  const handleQuantityChange = (itemId: number, newQuantity: number) => {
    const item = cart.items.find(i => i.id === itemId);
    if (item && item.stock_quantity && newQuantity > item.stock_quantity) {
      dispatch(addNotification({ message: `Only ${item.stock_quantity} units available`, type: 'error' }));
      return;
    }
    if (newQuantity < 1) return;

    setCart(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.id === itemId ? { ...item, quantity: newQuantity } : item
      ),
    }));
  };

  const handleRemoveItem = (itemId: number) => {
    setCart(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== itemId),
    }));
  };

  const calculateTotals = () => {
    let subtotal = 0;
    const taxBreakdown: Record<number, { taxableAmount: number; cgst: number; sgst: number; taxAmount: number }> = {};
    let totalGst = 0;
    let exemptedAmount = 0;

    cart.items.forEach(item => {
      const quantity = item.quantity;
      const gstRate = item.gst_rate;
      const rateConfig = gstRate / 100;

      let itemBaseTotal = 0;
      let itemGstAmount = 0;

      if (item.tax_included) {
        const totalWithTax = item.selling_price * quantity;
        itemBaseTotal = totalWithTax / (1 + rateConfig);
        itemGstAmount = totalWithTax - itemBaseTotal;
      } else {
        itemBaseTotal = item.unit_price * quantity;
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
  const creditLimit = currentCustomer?.credit_limit ? parseFloat(currentCustomer.credit_limit) : 0;
  const outstandingBalance = currentCustomer?.outstanding_balance ? parseFloat(currentCustomer.outstanding_balance) : 0;
  const walletBalance = currentCustomer?.wallet_balance ? parseFloat(currentCustomer.wallet_balance) : 0;

  const hasCreditLimit = creditLimit > 0;
  const availableCredit = hasCreditLimit ? creditLimit - outstandingBalance : Infinity;
  const canAffordCredit = availableCredit >= totals.grandTotal;

  const filteredProducts = products;

  const handleInitiateCheckout = () => {
    if (cart.items.length === 0) {
      dispatch(addNotification({ message: 'Cart is empty', type: 'error' }));
      return;
    }

    setShowPaymentModal(true);
  };

  const handlePaymentSelect = async (paymentMethod: string) => {
    if (guestPhone && guestPhone.length !== 10) {
      dispatch(addNotification({ message: 'Phone number must be exactly 10 digits', type: 'error' }));
      return;
    }

    setShowPaymentModal(false);
    setIsProcessing(true);

    try {
      let customerId = cart.customer_id;

      if (!customerId && (guestName || guestPhone)) {
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

      const saleData = {
        order_number: `SO-${Date.now()}`,
        customer: customerId,
        payment_method: paymentMethod,
        payment_status: 'paid',
        billing_state: cart.billing_state,
        place_of_supply: cart.billing_state,
        discount_percentage: cart.discount_type === 'percentage' ? cart.discount_percentage : 0,
        discount_amount: cart.discount_type === 'amount' ? cart.discount_amount : 0,
        items: cart.items.map(item => {
          // Ensure unit_price is rounded to 2 decimal places
          const validUnitPrice = parseFloat(item.unit_price.toFixed(2));
          return {
            product: item.product_id,
            quantity: item.quantity,
            unit_price: validUnitPrice,
            gst_rate: item.gst_rate,
            hsn_code: item.hsn_code,
          };
        }),
      };

      const sale = await saleService.create(saleData);

      // Attach customer data for InvoicePreview
      const printCustomer = currentCustomerObj || { name: guestName || 'Walk-in Customer', phone: guestPhone };
      sale.customer = printCustomer;

      dispatch(addNotification({ message: 'Sale completed successfully!', type: 'success' }));
      setCompletedSale(sale);
      setShowInvoice(true);
    } catch (error: any) {
      const errorMsg = error?.response?.data?.error || 'Failed to process sale';
      dispatch(addNotification({ message: errorMsg, type: 'error' }));
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
      discount_type: 'amount',
    });
    setGuestName('');
    setGuestPhone('');
    setCurrentCustomerObj(null);
  };

  return (
    <div className="h-full flex gap-4 overflow-hidden">
      {/* Left Panel - Products */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden py-2 pl-2">
        {/* Fixed header bar */}
        <div className="card shadow-sm p-3 shrink-0 mb-3">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
             <div className="flex items-center gap-3">
               <h2 className="text-lg font-bold text-gray-800">Products</h2>
               {currentSession && (
                 <div className="flex items-center border border-green-200 rounded-full overflow-hidden shadow-sm">
                   <span className="px-2 py-0.5 bg-green-50 text-green-700 text-xs font-semibold">
                     Session Active
                   </span>
                   <button
                     onClick={() => setShowCloseModal(true)}
                     className="px-2 py-0.5 bg-white hover:bg-red-50 text-red-600 text-xs font-semibold border-l border-green-200 flex items-center gap-1 transition-colors"
                   >
                     <Flag className="w-3 h-3" /> Close Register
                   </button>
                 </div>
               )}
             </div>

             <div className="flex flex-1 max-w-lg items-center gap-3">
               <div className="relative flex-1">
                 <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                 <input
                   type="text"
                   placeholder="Search products..."
                   value={productSearch}
                   onChange={(e) => setProductSearch(e.target.value)}
                   className="input-field pl-8 py-1.5 text-sm"
                 />
               </div>

               {/* Tier Selection */}
               <div className="flex items-center gap-2 bg-gray-50 rounded border border-gray-200 px-2 py-1">
                  <Tag className="w-3.5 h-3.5 text-gray-500" />
                  <select
                    value={selectedTierId || ''}
                    onChange={(e) => setSelectedTierId(e.target.value ? Number(e.target.value) : null)}
                    className="bg-transparent border-none text-xs focus:ring-0 outline-none w-28 text-gray-700 cursor-pointer"
                  >
                    <option value="">Standard Price</option>
                    {priceTiers.map(tier => (
                      <option key={tier.id} value={tier.id}>
                        {tier.name} ({tier.default_percentage > 0 ? '+' : ''}{tier.default_percentage}%)
                      </option>
                    ))}
                  </select>
               </div>
             </div>
          </div>
        </div>

        {/* Scrollable product area */}
        <div className="flex-1 min-h-0 overflow-y-auto pr-1">

        {/* Block UI if session is locked */}
        {needsSessionSetup && !sessionLoading ? (
          <div className="h-full flex flex-col items-center justify-center bg-white rounded-xl shadow-sm border border-gray-100">
             <Lock className="w-16 h-16 text-gray-300 mb-4" />
             <h3 className="text-xl font-bold text-gray-800">Register Closed</h3>
             <p className="text-gray-500 mt-2">Open a register session on the right to start making sales.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-4 gap-3 pb-4">
              {filteredProducts.map((product: any) => {
                 const effectivePrice = calculateEffectivePrice(product);
                 const isDiscounted = effectivePrice < parseFloat(product.selling_price);
                 const isPremium = effectivePrice > parseFloat(product.selling_price);
                 const priceColor = isDiscounted ? 'text-green-600' : isPremium ? 'text-yellow-600' : 'text-blue-600';

                 return (
                <button
                  key={product.id}
                  onClick={() => handleAddToCart(product)}
                  className="card p-0 hover:border-blue-400 hover:shadow-md active:scale-[0.98] transition-all text-left flex flex-row items-stretch border border-gray-100 group relative overflow-hidden bg-white"
                >
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-blue-50/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none z-10">
                     <div className="bg-blue-600 text-white rounded-full p-2 shadow-lg">
                       <Plus className="w-4 h-4" />
                     </div>
                  </div>

                  {/* Thumbnail */}
                  <div className="shrink-0 w-16 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center overflow-hidden">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          (e.target as HTMLImageElement).parentElement!.innerHTML = '<span class="text-2xl">📦</span>';
                        }}
                      />
                    ) : (
                      <Package className="w-7 h-7 text-gray-300" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 p-2.5 flex flex-col justify-between">
                    <div>
                      <div className="font-semibold text-gray-800 text-xs leading-tight">{product.name}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5">{product.sku}</div>
                    </div>
                    <div className="flex items-end justify-between mt-1.5 pt-1.5 border-t border-gray-100">
                       <div className="flex flex-col">
                         {effectivePrice !== parseFloat(product.selling_price) && (
                           <span className="text-[9px] text-gray-400 line-through leading-none">₹{product.selling_price}</span>
                         )}
                         <span className={`text-sm font-bold leading-none ${priceColor}`}>
                           ₹{effectivePrice.toFixed(2)}
                         </span>
                       </div>
                       <div className="text-right">
                         <div className="text-[9px] text-gray-400">GST {product.gst_rate}%</div>
                         <span className="text-[9px] font-semibold text-green-700 bg-green-50 px-1 py-0.5 rounded border border-green-100 inline-block mt-0.5">
                           {product.stock_quantity} pcs
                         </span>
                       </div>
                    </div>
                  </div>
                </button>
              )})}

              {/* Sentinel: triggers next page when scrolled into view */}
              <div ref={sentinelRef} className="col-span-full h-10 flex items-center justify-center">
                {posLoading && (
                  <div className="flex items-center gap-2 text-gray-400 text-xs">
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-primary-500 rounded-full animate-spin" />
                    Loading more products…
                  </div>
                )}
                {!hasMore && filteredProducts.length > 0 && (
                  <span className="text-xs text-gray-300">All products loaded</span>
                )}
              </div>
            </div>

            {filteredProducts.length === 0 && !posLoading && (
               <div className="card text-center py-12 text-gray-500 shadow-sm">
                 <Package className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                 <p className="text-sm">No products found or out of stock</p>
               </div>
             )}
          </>
        )}
        </div> {/* end scrollable area */}
      </div>

      {/* Right Panel - Cart */}
      {needsSessionSetup ? (
        <div className="w-[350px] lg:w-[400px] h-[calc(100vh-6rem)]">
          <OpeningBalanceModal />
        </div>
      ) : (
      <div className="shrink-0 flex flex-col h-full overflow-hidden space-y-3 py-2 pr-2">
        <div className="card shrink-0 shadow-sm p-3">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5 border-l-2 border-blue-500 pl-2 -ml-3">
              Customer Details
            </h3>
          </div>
          {cart.customer_id ? (
            <div className="flex items-center justify-between p-2 bg-blue-50/50 border border-blue-100 rounded-lg">
              <div className="flex-1 min-w-0 pr-2">
                <div className="font-semibold text-sm text-gray-800 truncate">{currentCustomerObj?.name}</div>
                <div className="text-[11px] text-gray-500">{currentCustomerObj?.phone}</div>
                {isEligibleForCredit && (
                  <div className="mt-0.5 flex flex-wrap gap-1">
                    <div className="text-[10px]">
                      <span className="text-gray-500">Bal: </span>
                      <span className={outstandingBalance > 0 ? 'text-red-500 font-medium' : 'text-green-600 font-medium'}>
                        ₹{outstandingBalance.toFixed(2)}
                      </span>
                      {hasCreditLimit && (
                        <>
                          <span className="mx-1 text-gray-300">|</span>
                          <span className="text-gray-500">Limit: </span>
                          <span className="text-gray-700 font-medium">₹{creditLimit.toFixed(2)}</span>
                        </>
                      )}
                    </div>
                    <div className="text-[10px] font-medium bg-purple-50 px-1.5 py-0.5 rounded inline-flex items-center gap-0.5 border border-purple-100">
                      <Wallet className="w-2.5 h-2.5 text-purple-500" />
                      <span className="text-purple-600">₹{walletBalance.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                   setCart(prev => ({ ...prev, customer_id: null }));
                   setCurrentCustomerObj(null);
                }}
                className="text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors"
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

        {/* Cart Items */}
        <div className="card flex-1 overflow-hidden flex flex-col shadow-sm p-0">
          <div className="p-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2 text-sm border-l-2 border-blue-500 pl-2 -ml-3">
              <ShoppingCart className="w-4 h-4" />
              Current Sale
            </h3>
            {cart.items.length > 0 && (
              <span className="text-[10px] font-medium bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                {cart.items.reduce((acc, item) => acc + item.quantity, 0)} Items
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1.5 bg-gray-50/30">
            {cart.items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-2">
                <ShoppingCart className="w-10 h-10 opacity-20" />
                <span className="text-sm">Cart is empty</span>
              </div>
            ) : (
              cart.items.map((item) => (
                <div key={item.id} className="p-2 border border-gray-100 rounded-lg hover:border-gray-200 transition-colors bg-white group shadow-sm">
                  <div className="flex justify-between items-start mb-1.5">
                    <div className="flex-1 pr-2">
                      <div className="font-medium text-xs text-gray-800 leading-tight">{item.name}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5">₹{item.unit_price.toFixed(2)} / unit</div>
                    </div>
                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      className="text-gray-300 hover:text-red-500 hover:bg-red-50 p-1 rounded transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between pt-1.5 border-t border-gray-50">
                    <div className="flex items-center bg-gray-50 rounded border border-gray-200 shadow-[0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden">
                      <button
                        onClick={() => handleQuantityChange(item.id, Math.max(1, item.quantity - 1))}
                        className="px-2 py-0.5 hover:bg-gray-200 text-gray-600 transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-8 text-center text-xs font-semibold bg-white py-0.5">{item.quantity}</span>
                      <button
                        onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                        className="px-2 py-0.5 hover:bg-gray-200 text-gray-600 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="font-bold text-gray-800 text-sm">
                      ₹{(item.selling_price * item.quantity).toFixed(2)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {cart.items.length > 0 && (
            <div className="bg-white border-t border-gray-100 p-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
              <div className="space-y-1 mb-3">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Subtotal</span>
                  <span className="font-medium text-gray-700">₹{totals.subtotal.toFixed(2)}</span>
                </div>

                <div className="flex justify-between items-center text-xs text-gray-500 gap-2 overflow-visible">
                  <span>Discount</span>
                  <div className="flex items-center gap-1">
                    <div className="flex bg-gray-100 rounded p-0.5 border border-gray-200">
                      <button
                        onClick={() => setCart(prev => ({ ...prev, discount_type: 'percentage' }))}
                        className={`px-1.5 py-0.5 text-[10px] font-semibold rounded ${cart.discount_type === 'percentage' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'}`}
                      >%</button>
                      <button
                        onClick={() => setCart(prev => ({ ...prev, discount_type: 'amount' }))}
                        className={`px-1.5 py-0.5 text-[10px] font-semibold rounded ${cart.discount_type === 'amount' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'}`}
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
                      className="w-16 text-right p-0.5 border border-gray-200 rounded text-xs outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-all font-medium text-gray-700"
                      placeholder="0"
                    />
                  </div>
                </div>

                {totals.discount > 0 && (
                  <div className="flex justify-between text-xs text-green-600 font-medium">
                    <span>Discount Applied</span>
                    <span>-₹{totals.discount.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between text-xs text-gray-500">
                  <div className="group relative flex items-center gap-1 cursor-help">
                    <span className="border-b border-dashed border-gray-300 pointer-events-auto">Total Tax</span>
                    <div className="hidden group-hover:block absolute bottom-full left-0 mb-1 w-48 bg-gray-800 text-white p-2 text-[10px] rounded shadow-lg z-50">
                      {Object.entries(totals.taxBreakdown).length > 0 ? Object.entries(totals.taxBreakdown).sort(([a], [b]) => Number(b) - Number(a)).map(([rate, breakdown]) => (
                         <div key={rate} className="flex justify-between mb-0.5">
                            <span>GST @ {rate}%:</span>
                            <span>₹{breakdown.taxAmount.toFixed(2)}</span>
                         </div>
                      )) : "No tax applicable"}
                      {totals.exemptedAmount > 0 && (
                         <div className="flex justify-between text-gray-300 mt-1 border-t border-gray-600 pt-1">
                            <span>Exempted 0%:</span>
                            <span>₹{totals.exemptedAmount.toFixed(2)}</span>
                         </div>
                      )}
                    </div>
                  </div>
                  <span className="font-medium text-gray-700">₹{totals.totalGst.toFixed(2)}</span>
                </div>

                {totals.roundOff !== 0 && (
                  <div className="flex justify-between text-[11px] text-gray-400">
                    <span>Round Off</span>
                    <span>{totals.roundOff > 0 ? '+' : ''}₹{totals.roundOff.toFixed(2)}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-end pt-2 border-t border-gray-100 mb-3 bg-blue-50/50 -mx-3 px-3 py-2 rounded">
                <span className="font-bold text-gray-700 text-sm">Grand Total</span>
                <span className="text-xl font-bold text-blue-600 leading-none">₹{totals.grandTotal.toFixed(2)}</span>
              </div>

              <button
                onClick={handleInitiateCheckout}
                disabled={isProcessing}
                className="btn btn-primary w-full py-2.5 shadow-md flex justify-center items-center font-bold tracking-wide"
              >
                {isProcessing ? 'Processing...' : 'Complete Sale'}
              </button>
            </div>
          )}
        </div>
      </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <PaymentModal
          total={totals.grandTotal}
          isEligibleForCredit={isEligibleForCredit}
          canAffordCredit={canAffordCredit}
          walletBalance={walletBalance}
          onSelectPayment={handlePaymentSelect}
          onClose={() => setShowPaymentModal(false)}
        />
      )}

      {/* Invoice Preview */}
      {showInvoice && completedSale && (
        <InvoicePreview
          sale={completedSale}
          onClose={handleCloseInvoice}
        />
      )}

      {/* Session Management Modals */}
      {showCloseModal && <CloseRegisterModal onClose={() => setShowCloseModal(false)} />}
    </div>
  );
};

export default POS;
