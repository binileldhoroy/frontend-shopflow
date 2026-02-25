import React, { useState, useEffect } from 'react';
import { useAppDispatch } from '@hooks/useRedux';
import { productService } from '@api/services/product.service';
import { customerService } from '@api/services/customer.service';
import { saleService } from '@api/services/sale.service';
import { priceTierService, PriceTier, ProductTierPrice } from '@api/services/priceTier.service';
import { addNotification } from '@store/slices/uiSlice';
import { Search, Plus, Minus, Trash2, ShoppingCart, User, Package, Tag } from 'lucide-react';
import PaymentModal from '../../components/pos/PaymentModal';
import InvoicePreview from '../../components/pos/InvoicePreview';

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
  const [customers, setCustomers] = useState<any[]>([]);
  const [priceTiers, setPriceTiers] = useState<PriceTier[]>([]);
  const [productRules, setProductRules] = useState<ProductTierPrice[]>([]);
  const [selectedTierId, setSelectedTierId] = useState<number | null>(null);

  const [showCustomerSelect, setShowCustomerSelect] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
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

  // Fetch initial data
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [productsData, customersData, tiersData, rulesData] = await Promise.all([
          productService.getAll(),
          customerService.getAll(),
          priceTierService.getAllTiers(),
          priceTierService.getProductRules()
        ]);

        const pData = productsData.results || productsData;
        setProducts(pData.filter((p: any) => p.stock_quantity > 0));
        setCustomers(customersData);
        setPriceTiers(tiersData.filter((t: PriceTier) => t.is_active));
        setProductRules(rulesData);
      } catch (error) {
        console.error('Error fetching data:', error);
        dispatch(addNotification({ message: 'Failed to load POS data', type: 'error' }));
      }
    };
    fetchInitialData();
  }, [dispatch]);

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

  const selectedCustomer = customers.find((c: any) => c.id === cart.customer_id);

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

  const filteredProducts = products.filter((p: any) =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.sku.toLowerCase().includes(productSearch.toLowerCase())
  );

  const handleInitiateCheckout = () => {
    if (cart.items.length === 0) {
      dispatch(addNotification({ message: 'Cart is empty', type: 'error' }));
      return;
    }

    setShowPaymentModal(true);
  };

  const handlePaymentSelect = async (paymentMethod: string) => {
    setShowPaymentModal(false);
    setIsProcessing(true);

    try {
      let customerId = cart.customer_id;

      if (!customerId && guestName) {
        const guest = await customerService.create({
          name: guestName,
          phone: guestPhone || '',
        });
        customerId = guest.id;
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
  };

  return (
    <div className="h-full flex gap-6">
      {/* Left Panel - Products */}
      <div className="flex-1 space-y-4">
        <div className="card">
          <div className="flex justify-between items-center mb-4">
             <h2 className="text-lg font-semibold">Products</h2>

             {/* Tier Selection */}
             <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-gray-500" />
                <select
                  value={selectedTierId || ''}
                  onChange={(e) => setSelectedTierId(e.target.value ? Number(e.target.value) : null)}
                  className="input-field py-1 px-3 text-sm w-48"
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

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              className="input-field pl-10"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.slice(0, 12).map((product: any) => {
             const effectivePrice = calculateEffectivePrice(product);
             const isDiscounted = effectivePrice < parseFloat(product.selling_price);
             const isPremium = effectivePrice > parseFloat(product.selling_price);

             return (
            <button
              key={product.id}
              onClick={() => handleAddToCart(product)}
              className="card hover:shadow-lg transition-shadow text-left p-4"
            >
              <div className="font-medium text-gray-900">{product.name}</div>
              <div className="text-sm text-gray-500 mt-1">{product.sku}</div>
              <div className="mt-2 flex items-baseline gap-2">
                 <div className={`text-lg font-bold ${isDiscounted ? 'text-success-600' : isPremium ? 'text-warning-600' : 'text-primary-600'}`}>
                   ₹{effectivePrice.toFixed(2)}
                 </div>
                 {effectivePrice !== parseFloat(product.selling_price) && (
                   <div className="text-xs text-gray-400 line-through">
                      ₹{product.selling_price}
                   </div>
                 )}
              </div>
              <div className="text-xs text-gray-500">GST: {product.gst_rate}%</div>
              <div className="text-xs font-medium text-success-600 mt-1">
                Stock: {product.stock_quantity} {product.unit}
              </div>
            </button>
          )})}
        </div>

        {filteredProducts.length === 0 && (
           <div className="card text-center py-8 text-gray-500">
             <Package className="w-12 h-12 mx-auto mb-2 text-gray-300" />
             <p>No products found or out of stock</p>
           </div>
         )}
      </div>

      {/* Right Panel - Cart */}
      <div className="w-96 space-y-4">
        {/* Customer Selection */}
        <div className="card">
          <h3 className="font-semibold mb-3">Customer</h3>
          {selectedCustomer ? (
            <div className="flex items-center justify-between p-3 bg-primary-50 rounded-lg">
              <div>
                <div className="font-medium">{selectedCustomer.name}</div>
                <div className="text-sm text-gray-600">{selectedCustomer.phone}</div>
              </div>
              <button
                onClick={() => setCart(prev => ({ ...prev, customer_id: null }))}
                className="text-danger-600 hover:bg-danger-50 p-2 rounded"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Guest Name"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className="input-field"
              />
              <input
                type="tel"
                placeholder="Guest Phone (optional)"
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
                className="input-field"
              />
              <button
                onClick={() => setShowCustomerSelect(!showCustomerSelect)}
                className="btn btn-secondary w-full flex items-center justify-center gap-2"
              >
                <User className="w-4 h-4" />
                Select Registered Customer
              </button>
              {showCustomerSelect && (
                <div className="mt-2 max-h-40 overflow-y-auto border rounded-lg">
                  {customers.map((customer: any) => (
                    <button
                      key={customer.id}
                      onClick={() => {
                        setCart(prev => ({ ...prev, customer_id: customer.id }));
                        setShowCustomerSelect(false);
                      }}
                      className="w-full text-left p-2 hover:bg-gray-50"
                    >
                      <div className="font-medium">{customer.name}</div>
                      <div className="text-sm text-gray-600">{customer.phone}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Cart Items */}
        <div className="card flex-1 overflow-hidden flex flex-col">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Cart ({cart.items.length})
          </h3>

          <div className="flex-1 overflow-y-auto space-y-2">
            {cart.items.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Cart is empty
              </div>
            ) : (
              cart.items.map((item) => (
                <div key={item.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{item.name}</div>
                      <div className="text-xs text-gray-500">₹{item.unit_price.toFixed(2)} × {item.quantity}</div>
                      {item.stock_quantity && (
                        <div className="text-xs text-success-600 mt-1">
                          Stock: {item.stock_quantity} available
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      className="text-danger-600 hover:bg-danger-50 p-1 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleQuantityChange(item.id, Math.max(1, item.quantity - 1))}
                      className="p-1 bg-white rounded hover:bg-gray-100"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-12 text-center font-medium">{item.quantity}</span>
                    <button
                      onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                      className="p-1 bg-white rounded hover:bg-gray-100"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <div className="ml-auto font-medium">
                      ₹{(item.selling_price * item.quantity).toFixed(2)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {cart.items.length > 0 && (
            <div className="mt-4 pt-4 border-t space-y-2">
              <div className="flex justify-between text-sm pt-1">
                <span>Subtotal</span>
                <span>₹{totals.subtotal.toFixed(2)}</span>
              </div>

              {/* Discount Input */}
              <div className="flex justify-between items-center py-2 border-b border-dashed border-gray-200">
                <span className="text-sm font-medium text-gray-700">Discount</span>
                <div className="flex items-center gap-2">
                  <div className="flex bg-gray-200 rounded p-0.5">
                    <button
                      onClick={() => setCart(prev => ({ ...prev, discount_type: 'percentage' }))}
                      className={`px-2 py-0.5 text-xs font-semibold rounded ${cart.discount_type === 'percentage' ? 'bg-white shadow text-gray-800' : 'text-gray-500'}`}
                    >%</button>
                    <button
                      onClick={() => setCart(prev => ({ ...prev, discount_type: 'amount' }))}
                      className={`px-2 py-0.5 text-xs font-semibold rounded ${cart.discount_type === 'amount' ? 'bg-white shadow text-gray-800' : 'text-gray-500'}`}
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
                    className="w-20 text-right p-1 border rounded text-sm outline-none focus:border-primary-400"
                    placeholder="0"
                  />
                </div>
              </div>

              {totals.discount > 0 && (
                <div className="flex justify-between text-sm py-1">
                  <span>Discount Applied</span>
                  <span>-₹{totals.discount.toFixed(2)}</span>
                </div>
              )}

              {/* GST Breakdown */}
              {Object.entries(totals.taxBreakdown).sort(([a], [b]) => Number(b) - Number(a)).map(([rate, breakdown]) => (
                <div key={rate} className="space-y-1 py-1 border-t border-dashed border-gray-200">
                  <div className="flex justify-between text-sm font-medium">
                    <span>Taxable Amount ({rate}%)</span>
                    <span>₹{breakdown.taxableAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-600 pl-4">
                    <span>CGST @{Number(rate)/2}%</span>
                    <span>₹{breakdown.cgst.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-600 pl-4">
                    <span>SGST @{Number(rate)/2}%</span>
                    <span>₹{breakdown.sgst.toFixed(2)}</span>
                  </div>
                </div>
              ))}

              {totals.exemptedAmount > 0 && (
                <div className="flex justify-between text-sm py-1 border-t border-dashed border-gray-200">
                  <span>Exempted Amount (0%)</span>
                  <span>₹{totals.exemptedAmount.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between text-sm font-semibold border-t border-gray-300 pt-2">
                <span>Total GST</span>
                <span>₹{totals.totalGst.toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-sm pt-1">
                <span>Gross Total</span>
                <span>₹{totals.grossTotal.toFixed(2)}</span>
              </div>

              {totals.roundOff !== 0 && (
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Round Off</span>
                  <span>{totals.roundOff > 0 ? '+' : ''}₹{totals.roundOff.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-800">
                <span>Grand Total</span>
                <span>₹{totals.grandTotal.toFixed(2)}</span>
              </div>
              <button
                onClick={handleInitiateCheckout}
                disabled={isProcessing}
                className="btn btn-primary w-full mt-4"
              >
                {isProcessing ? 'Processing...' : 'Complete Sale'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <PaymentModal
          total={totals.grandTotal}
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
    </div>
  );
};

export default POS;
