import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '@hooks/useRedux';
import { useDebounce } from '@hooks/useDebounce';
import { productService } from '@api/services/product.service';
import { saleService } from '@api/services/sale.service';
import { customerService } from '@api/services/customer.service';
import { priceTierService, PriceTier, ProductTierPrice } from '@api/services/priceTier.service';
import { addNotification } from '@store/slices/uiSlice';
import { Search, ShoppingCart, Trash2, Plus, Minus, Tag, Building2, Smartphone, Edit2 } from 'lucide-react';
import CustomerFormModal from '../../components/features/customers/CustomerFormModal';

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

const AdvanceInvoiceCreate: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
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
  const [isLoading, setIsLoading] = useState(false);

  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [currentCustomerObj, setCurrentCustomerObj] = useState<any>(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);

  const handleCustomerSave = async (data: any) => {
    try {
      if (currentCustomerObj?.id) {
         const updated = await customerService.update(currentCustomerObj.id, data);
         setCurrentCustomerObj(updated);
         setCart(prev => ({ ...prev, customer_id: updated.id, billing_state: updated.state?.id || null }));
         dispatch(addNotification({ message: 'Customer updated successfully', type: 'success' }));
      } else {
         const created = await customerService.create(data);
         setCurrentCustomerObj(created);
         setCart(prev => ({ ...prev, customer_id: created.id, billing_state: created.state?.id || null }));
         dispatch(addNotification({ message: 'Customer added successfully', type: 'success' }));
      }
      setShowCustomerModal(false);
      setGuestName('');
      setGuestPhone('');
    } catch (error: any) {
      dispatch(addNotification({ message: error.response?.data?.error || 'Failed to save customer', type: 'error' }));
    }
  };

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

  useEffect(() => {
    const searchProducts = async () => {
      if (!debouncedSearchTerm.trim()) {
          setProducts([]);
          return;
      }
      setIsLoading(true);
      try {
        const params: any = { search: debouncedSearchTerm };
        const response = await productService.getAll(params);
        const data = response.results || response;
        setProducts(data);
      } catch (error) {
        console.error('Error searching products:', error);
      } finally {
        setIsLoading(false);
      }
    };
    searchProducts();
  }, [debouncedSearchTerm]);

  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  const calculateEffectivePrice = (product: any) => {
    const baseSellingPrice = parseFloat(product.selling_price);
    if (!selectedTierId) return baseSellingPrice;

    const rule = productRules.find(r => r.product === product.id && r.tier === selectedTierId);
    if (rule) {
      if (rule.type === 'fixed') {
        return parseFloat(rule.value as any);
      } else {
        const percentage = parseFloat(rule.value as any);
        return baseSellingPrice + (baseSellingPrice * (percentage / 100));
      }
    }

    const tier = priceTiers.find(t => t.id === selectedTierId);
    if (tier && tier.default_percentage) {
      const percentage = parseFloat(tier.default_percentage as any);
      return baseSellingPrice + (baseSellingPrice * (percentage / 100));
    }

    return baseSellingPrice;
  };

  useEffect(() => {
    if (cart.items.length === 0) return;

    setCart(prev => ({
      ...prev,
      items: prev.items.map(item => {
        const baseSellingPrice = item.original_selling_price;
        let newSellingPrice = baseSellingPrice;

        if (selectedTierId) {
            const rule = productRules.find(r => r.product === item.product_id && r.tier === selectedTierId);
            if (rule) {
              if (rule.type === 'fixed') {
                newSellingPrice = parseFloat(rule.value as any);
              } else {
                const percentage = parseFloat(rule.value as any);
                newSellingPrice = baseSellingPrice + (baseSellingPrice * (percentage / 100));
              }
            } else {
                const tier = priceTiers.find(t => t.id === selectedTierId);
                if (tier && tier.default_percentage) {
                  const percentage = parseFloat(tier.default_percentage as any);
                  newSellingPrice = baseSellingPrice + (baseSellingPrice * (percentage / 100));
                }
            }
        }

        let newUnitPrice = newSellingPrice;
        if (item.tax_included) {
          const gstRate = item.gst_rate || 0;
          if (gstRate > 0 && gstRate < 100) {
            const divisor = 1 + (gstRate / 100);
            newUnitPrice = newSellingPrice / divisor;
          } else {
            newUnitPrice = newSellingPrice;
          }
        }

        if (isNaN(newUnitPrice) || !isFinite(newUnitPrice) || newUnitPrice > 9999999999.99 || newUnitPrice < 0) {
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
       setCart(prev => ({
        ...prev,
        items: prev.items.map(item =>
          item.product_id === product.id
          ? { ...item, quantity: item.quantity + 1, selling_price: effectivePrice }
          : item
        )
      }));
    } else {
      let basePrice = effectivePrice;
      if (product.tax_included) {
        const gstRate = parseFloat(product.gst_rate) || 0;
        if (gstRate > 0 && gstRate < 100) {
          const divisor = 1 + (gstRate / 100);
          basePrice = effectivePrice / divisor;
        } else {
          basePrice = effectivePrice;
        }
      }

      if (isNaN(basePrice) || !isFinite(basePrice) || basePrice > 9999999999.99 || basePrice < 0) {
        dispatch(addNotification({
          message: `Error: Invalid price for ${product.name}. Please check product settings.`,
          type: 'error'
        }));
        return;
      }

      const newItem: CartItem = {
        id: Date.now(),
        product_id: product.id,
        name: product.name,
        sku: product.sku,
        unit_price: parseFloat(basePrice.toFixed(2)),
        selling_price: parseFloat(effectivePrice.toFixed(2)),
        quantity: 1,
        gst_rate: parseFloat(product.gst_rate),
        hsn_code: product.hsn_code,
        tax_included: product.tax_included,
        stock_quantity: product.stock_quantity,
        original_selling_price: parseFloat(product.selling_price),
      };
      setCart(prev => ({ ...prev, items: [...prev.items, newItem] }));
    }
    setSearchTerm('');
    if(searchInputRef.current) searchInputRef.current.focus();
  };

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (!searchTerm.trim()) return;
      try {
         const response = await productService.getAll({ search: searchTerm });
         const results = response.results || response;
         setProducts(results);

         const exactMatch = results.find((p: any) =>
            p.sku.toLowerCase() === searchTerm.toLowerCase() ||
            (p.barcode && p.barcode.toLowerCase() === searchTerm.toLowerCase())
         );

         if (exactMatch) handleAddToCart(exactMatch);
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
          return { ...item, quantity: newQty };
        }
        return item;
      })
    }));
  };

  const calculateTotals = () => {
    let subtotal = 0;
    let totalGst = 0;

    cart.items.forEach(item => {
      const q = item.quantity;
      const rateConfig = item.gst_rate / 100;
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
      if (item.gst_rate > 0) totalGst += itemGstAmount;
    });

    const discount = cart.discount_type === 'percentage'
      ? (subtotal * cart.discount_percentage) / 100
      : cart.discount_amount;
    const grossTotal = subtotal + totalGst - discount;
    const grandTotal = Math.round(grossTotal);

    return { subtotal, totalGst, discount, grandTotal };
  };

  const totals = calculateTotals();
  const [showSearchResults, setShowSearchResults] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) && searchInputRef.current && !searchInputRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const generateAdvanceInvoice = async () => {
    if (cart.items.length === 0) {
      dispatch(addNotification({ message: 'Cart is empty', type: 'error' }));
      return;
    }

    if (!cart.customer_id && !guestName && !guestPhone) {
      dispatch(addNotification({ message: 'Please select or enter customer details', type: 'warning' }));
      return;
    }

    if (guestPhone && guestPhone.length !== 10) {
      dispatch(addNotification({ message: 'Phone number must be exactly 10 digits', type: 'error' }));
      return;
    }

    setIsProcessing(true);

    try {
      let customerId = cart.customer_id;

      if (!customerId && (guestName || guestPhone)) {
        if (currentCustomerObj && currentCustomerObj.phone === guestPhone) {
          customerId = currentCustomerObj.id;
        } else {
          const payload: any = { name: guestName || 'Walk-in Customer' };
          if (guestPhone) payload.phone = guestPhone;
          const guest = await customerService.create(payload);
          customerId = guest.id;
          setCurrentCustomerObj(guest);
        }
      }

      const saleData = {
        order_number: `INV-${Date.now()}`,
        customer: customerId,
        payment_method: 'unpaid',
        payment_status: 'unpaid',
        billing_state: cart.billing_state,
        place_of_supply: cart.billing_state,
        discount_percentage: cart.discount_type === 'percentage' ? cart.discount_percentage : 0,
        discount_amount: cart.discount_type === 'amount' ? cart.discount_amount : 0,
        items: cart.items.map(item => ({
          product: item.product_id,
          quantity: item.quantity,
          unit_price: parseFloat(item.unit_price.toFixed(2)),
          gst_rate: item.gst_rate,
          hsn_code: item.hsn_code,
        }))
      };

      const newInvoice = await saleService.createAdvanceInvoice(saleData as any);
      dispatch(addNotification({ message: 'Advance Invoice Generated', type: 'success' }));
      navigate(`/advance-invoices/${newInvoice.id}`);
    } catch (err: any) {
      console.error("Generation Error:", err);
      dispatch(addNotification({ message: err?.response?.data?.error || err?.message || 'Failed to generate', type: 'error' }));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="h-full flex gap-4 p-2 relative">
      <div className="flex-1 flex flex-col gap-3 h-[calc(100vh-4rem)]">
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

           {showSearchResults && (searchTerm || products.length > 0) && (
             <div ref={dropdownRef} className="absolute left-0 right-0 top-full mt-2 bg-white rounded-xl shadow-xl border border-gray-200 max-h-[60vh] overflow-y-auto z-50">
                {isLoading ? (
                  <div className="p-4 text-center text-gray-500">Searching...</div>
                ) : products.length > 0 ? (
                  <div className="p-2 space-y-1">
                    {products.map(product => {
                       const effectivePrice = calculateEffectivePrice(product);
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
                          </div>
                        </div>
                        <div className="text-right">
                           <div className="font-bold text-lg leading-none text-blue-600">
                               ₹{effectivePrice.toFixed(2)}
                           </div>
                        </div>
                      </button>
                    )})}
                  </div>
                ) : searchTerm && !isLoading ? (
                  <div className="p-8 text-center text-gray-400">No products found</div>
                ) : null}
             </div>
           )}
        </div>

        <div className="flex-1 card shadow-sm flex flex-col p-0 overflow-hidden relative z-10">
          <div className="p-3 border-b bg-gray-50 flex justify-between items-center">
            <h2 className="font-semibold text-gray-700 flex items-center gap-2 text-sm border-l-2 border-blue-500 pl-2 -ml-3">
              <ShoppingCart className="w-5 h-5"/>
              Cart Items
            </h2>
            <div className="flex items-center gap-3">
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
                     <div className="w-6 h-6 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center text-xs font-bold font-mono shrink-0">
                       {index + 1}
                     </div>
                     <div className="flex-1 min-w-0">
                       <div className="font-bold text-gray-800 text-sm xl:text-base truncate pr-4">{item.name}</div>
                       <div className="flex items-center gap-3 mt-1">
                          <span className="text-[11px] text-gray-400 font-mono">SKU: {item.sku}</span>
                          <span className="text-[11px] font-medium text-gray-500 bg-gray-50 px-1.5 rounded">₹{item.unit_price.toFixed(2)} / unit</span>
                          {item.tax_included && <span className="text-[10px] text-blue-600 bg-blue-50 px-1 rounded border border-blue-100">Inc. Tax ({item.gst_rate}%)</span>}
                       </div>
                     </div>
                     <div className="flex items-center bg-gray-50 rounded-lg border border-gray-200 shadow-inner h-10 w-32 shrink-0">
                       <button onClick={() => updateQuantity(item.id, -1)} className="w-10 h-full flex items-center justify-center hover:bg-gray-200 text-gray-600 transition-colors rounded-l-lg"><Minus className="w-4 h-4"/></button>
                       <span className="flex-1 text-center font-bold text-gray-800 text-sm bg-white h-full flex items-center justify-center">{item.quantity}</span>
                       <button onClick={() => updateQuantity(item.id, 1)} className="w-10 h-full flex items-center justify-center hover:bg-gray-200 text-gray-600 transition-colors rounded-r-lg"><Plus className="w-4 h-4"/></button>
                     </div>
                     <div className="flex flex-col items-end shrink-0 w-28">
                       <div className="font-bold text-lg text-gray-900 leading-none mb-1">
                         ₹{(item.selling_price * item.quantity).toFixed(2)}
                       </div>
                     </div>
                     <button
                       onClick={() => removeItem(item.id)}
                       className="p-2 ml-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-50 group-hover:opacity-100"
                     >
                       <Trash2 className="w-5 h-5"/>
                     </button>
                   </div>
                 ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="w-[350px] lg:w-[400px] flex flex-col gap-3 h-[calc(100vh-4rem)]">
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
                  <option key={tier.id} value={tier.id}>{tier.name}</option>
                ))}
              </select>
            </div>
          </div>
          {cart.customer_id ? (
            <div className="flex items-center justify-between p-2.5 bg-blue-50/50 border border-blue-100 rounded-lg">
              <div className="flex-1 min-w-0 pr-2">
                <div className="font-semibold text-sm text-gray-800 truncate">{currentCustomerObj?.name}</div>
                <div className="text-xs text-gray-500">{currentCustomerObj?.phone}</div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => setShowCustomerModal(true)} className="text-[10px] text-blue-600 hover:bg-blue-100 px-2 py-1 rounded transition-colors font-medium border border-blue-200 flex items-center gap-1">
                  <Edit2 className="w-3 h-3" /> Edit Info
                </button>
                <button onClick={() => { setCart(p => ({ ...p, customer_id: null })); setCurrentCustomerObj(null); }} className="text-[10px] text-red-500 hover:bg-red-50 px-2 py-1 rounded transition-colors font-medium border border-red-100">
                  Clear
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2 mt-1">
              <div className="relative">
                <Building2 className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2"/>
                <input type="text" placeholder="Customer Name (Optional)" className="w-full text-sm pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all outline-none" value={guestName} onChange={e => setGuestName(e.target.value)} />
              </div>
              <div className="relative text-group">
                <Smartphone className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2"/>
                <input type="tel" maxLength={10} placeholder="Phone Number (Enter 10 pos to search)" className={`w-full text-sm pl-9 pr-3 py-2 bg-gray-50 border ${guestPhone.length > 0 && guestPhone.length !== 10 ? 'border-amber-300 focus:border-amber-500 focus:ring-amber-100' : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'} rounded-lg transition-all outline-none`} value={guestPhone} onChange={e => setGuestPhone(e.target.value.replace(/\D/g, ''))} />
              </div>
              <button onClick={() => { setCurrentCustomerObj({ name: guestName, phone: guestPhone }); setShowCustomerModal(true); }} className="w-full py-1.5 mt-1 text-sm bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200 font-medium">
                Add Full Customer Details
              </button>
            </div>
          )}
        </div>

        <div className="shrink-0 card shadow-sm p-4 border border-gray-100 bg-gradient-to-br from-white to-gray-50 flex flex-col">
          <h3 className="font-semibold text-gray-700 text-sm mb-4 border-l-2 border-blue-500 pl-2 -ml-4">Bill Summary</h3>
          <div className="space-y-2.5 flex-1 min-h-[150px]">
            <div className="flex justify-between text-gray-600 text-sm">
              <span>Subtotal ({cart.items.length} items)</span>
              <span className="font-medium text-gray-800">₹{totals.subtotal.toFixed(2)}</span>
            </div>
            {totals.discount > 0 && (
              <div className="flex justify-between text-green-600 text-sm font-medium bg-green-50 px-2 py-1 rounded">
                <span>Discount</span>
                <span>-₹{totals.discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-gray-600 text-sm pb-2 border-b border-gray-100">
              <span>Total Tax (GST)</span>
              <span className="font-medium text-gray-800">₹{totals.totalGst.toFixed(2)}</span>
            </div>
            <div className="pt-2">
              <div className="flex justify-between items-end">
                <span className="text-gray-900 font-bold text-lg">Grand Total</span>
                <span className="text-blue-600 font-bold text-3xl tabular-nums leading-none">
                  ₹{totals.grandTotal.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100 shrink-0">
             <button
               onClick={generateAdvanceInvoice}
               disabled={isProcessing || cart.items.length === 0}
               className="w-full btn bg-blue-600 text-white hover:bg-blue-700 py-3.5 rounded-xl shadow-lg hover:shadow-xl font-bold text-lg disabled:opacity-50 transition-all flex items-center justify-center gap-2"
             >
               {isProcessing ? 'Generating...' : 'Generate Advance Invoice'}
             </button>
          </div>
        </div>
      </div>

      {showCustomerModal && (
        <CustomerFormModal
          customer={currentCustomerObj}
          onClose={() => setShowCustomerModal(false)}
          onSave={handleCustomerSave}
        />
      )}
    </div>
  );
};

export default AdvanceInvoiceCreate;
