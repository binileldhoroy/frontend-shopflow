import React, { useState, useEffect, useRef } from 'react';
import Modal from '../common/Modal/Modal';
import { PurchaseOrder, PurchaseOrderCreate, PurchaseStatus } from '../../types/purchase.types';
import { Supplier } from '../../types/supplier.types';
import { Product } from '../../types/product.types';
import { Plus, Trash2 } from 'lucide-react';
import axiosInstance from '../../api/axios';

interface PurchaseFormModalProps {
  show: boolean;
  onHide: () => void;
  onSubmit: (data: PurchaseOrderCreate) => void;
  purchase: PurchaseOrder | null;
  suppliers: Supplier[];
  products?: Product[];
  loading?: boolean;
}

interface PurchaseItemFormData {
  product: number | string;
  product_name: string;
  quantity: number | string;
  unit: string;
  unit_price: number | string;
  tax_rate: number | string;
}

interface DropdownState {
  results: Product[];
  page: number;
  hasMore: boolean;
  loading: boolean;
}

type FormErrors = {
  supplier?: string;
  items?: string;
};

const EMPTY_DROPDOWN: DropdownState = { results: [], page: 1, hasMore: false, loading: false };

function formatINR(v: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(v);
}

const PurchaseFormModal: React.FC<PurchaseFormModalProps> = ({
  show,
  onHide,
  onSubmit,
  purchase,
  suppliers,
  loading = false,
}) => {
  const [formData, setFormData] = useState<{
    supplier: number | string;
    order_date: string;
    expected_delivery_date: string;
    status: PurchaseStatus;
    payment_status: 'paid' | 'pending' | 'partial';
    payment_method: 'cash' | 'card' | 'upi' | 'net_banking' | 'other';
    notes: string;
  }>({
    supplier: '',
    order_date: new Date().toISOString().split('T')[0],
    expected_delivery_date: '',
    status: 'draft',
    payment_status: 'pending',
    payment_method: 'cash',
    notes: '',
  });

  const [items, setItems] = useState<PurchaseItemFormData[]>([]);
  const [productSearches, setProductSearches] = useState<string[]>([]);
  const [dropdownStates, setDropdownStates] = useState<DropdownState[]>([]);
  const [openDropdownIndex, setOpenDropdownIndex] = useState<number | null>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const [errors, setErrors] = useState<FormErrors>({});
  const debounceRefs = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    if (purchase) {
      setFormData({
        supplier: purchase.supplier,
        order_date: purchase.order_date,
        expected_delivery_date: purchase.expected_delivery_date || '',
        status: purchase.status,
        payment_status: purchase.payment_status || 'pending',
        payment_method: purchase.payment_method || 'cash',
        notes: purchase.notes || '',
      });
      const newItems = purchase.items.map(item => ({
        product: item.product || '',
        product_name: item.product_name,
        quantity: item.quantity,
        unit: '',
        unit_price: item.unit_price,
        tax_rate: item.tax_rate,
      }));
      setItems(newItems);
      setProductSearches(newItems.map(item => item.product_name));
      setDropdownStates(newItems.map(() => ({ ...EMPTY_DROPDOWN })));
    } else {
      resetForm();
    }
    setErrors({});
  }, [purchase, show]);

  const resetForm = () => {
    setFormData({
      supplier: '',
      order_date: new Date().toISOString().split('T')[0],
      expected_delivery_date: '',
      status: 'draft',
      payment_status: 'pending',
      payment_method: 'cash',
      notes: '',
    });
    setItems([{ product: '', product_name: '', quantity: 1, unit: '', unit_price: 0, tax_rate: 0 }]);
    setProductSearches(['']);
    setDropdownStates([{ ...EMPTY_DROPDOWN }]);
  };

  const fetchProducts = async (index: number, search: string, page: number, append: boolean) => {
    setDropdownStates(prev => {
      const next = [...prev];
      if (!next[index]) next[index] = { ...EMPTY_DROPDOWN };
      next[index] = { ...next[index], loading: true };
      return next;
    });
    try {
      const response = await axiosInstance.get('/api/products/', { params: { search, page } });
      const data = response.data;
      setDropdownStates(prev => {
        const next = [...prev];
        const existing = next[index] || { ...EMPTY_DROPDOWN };
        next[index] = {
          results: append ? [...existing.results, ...(data.results || [])] : (data.results || []),
          page,
          hasMore: !!data.next,
          loading: false,
        };
        return next;
      });
    } catch {
      setDropdownStates(prev => {
        const next = [...prev];
        if (next[index]) next[index] = { ...next[index], loading: false };
        return next;
      });
    }
  };

  const handleSearchChange = (index: number, value: string) => {
    setProductSearches(prev => { const n = [...prev]; n[index] = value; return n; });
    setOpenDropdownIndex(index);
    clearTimeout(debounceRefs.current[index]);
    debounceRefs.current[index] = setTimeout(() => fetchProducts(index, value, 1, false), 300);
  };

  const handleDropdownOpen = (index: number, e: React.FocusEvent<HTMLInputElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setDropdownPos({ top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 260) });
    setOpenDropdownIndex(index);
    const state = dropdownStates[index];
    if (!state || state.results.length === 0) fetchProducts(index, productSearches[index] ?? '', 1, false);
  };

  const handleDropdownScroll = (e: React.UIEvent<HTMLDivElement>, index: number) => {
    const el = e.currentTarget;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 20) {
      const state = dropdownStates[index];
      if (state?.hasMore && !state?.loading) fetchProducts(index, productSearches[index] ?? '', state.page + 1, true);
    }
  };

  const handleAddItem = () => {
    setItems(prev => [...prev, { product: '', product_name: '', quantity: 1, unit: '', unit_price: 0, tax_rate: 0 }]);
    setProductSearches(prev => [...prev, '']);
    setDropdownStates(prev => [...prev, { ...EMPTY_DROPDOWN }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
    setProductSearches(prev => prev.filter((_, i) => i !== index));
    setDropdownStates(prev => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof PurchaseItemFormData, value: any) => {
    const newItems = [...items];
    const item = newItems[index];
    if (field === 'product') {
      const state = dropdownStates[index];
      const selectedProduct = state?.results.find(p => p.id === Number(value));
      if (selectedProduct) {
        item.product = selectedProduct.id;
        item.product_name = selectedProduct.name;
        item.unit = selectedProduct.unit || '';
        item.unit_price = selectedProduct.cost_price || 0;
        item.tax_rate = selectedProduct.gst_rate || 0;
      } else {
        item.product = '';
        item.product_name = '';
        item.unit = '';
        item.unit_price = 0;
        item.tax_rate = 0;
      }
    } else {
      (item as any)[field] = value;
    }
    setItems(newItems);
  };

  const calculateTotals = () => {
    let subtotal = 0;
    let taxTotal = 0;
    items.forEach(item => {
      const qty = Number(item.quantity) || 0;
      const price = Number(item.unit_price) || 0;
      const tax = Number(item.tax_rate) || 0;
      const base = qty * price;
      subtotal += base;
      taxTotal += (base * tax) / 100;
    });
    return { subtotal, taxTotal, grandTotal: subtotal + taxTotal };
  };

  const validateForm = (): boolean => {
    const e: FormErrors = {};
    if (!formData.supplier) e.supplier = 'Please select a supplier';
    const hasValidItem = items.some(item => item.product && Number(item.quantity) > 0);
    if (!hasValidItem) e.items = 'Add at least one item with a product selected';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    const submitData: PurchaseOrderCreate = {
      supplier: Number(formData.supplier),
      order_date: formData.order_date,
      expected_delivery_date: formData.expected_delivery_date || undefined,
      status: formData.status,
      payment_status: formData.payment_status,
      payment_method: formData.payment_method,
      notes: formData.notes,
      items: items.map(item => ({
        product: Number(item.product) || null,
        product_name: item.product_name,
        quantity: Number(item.quantity) || 0,
        unit_price: Number(item.unit_price) || 0,
        tax_rate: Number(item.tax_rate) || 0,
      })),
    };
    onSubmit(submitData);
  };

  const { subtotal, taxTotal, grandTotal } = calculateTotals();

  return (
    <Modal
      show={show}
      onHide={onHide}
      title={purchase ? `Edit Purchase Order` : 'New Purchase Order'}
      size="xl"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onHide} disabled={loading}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Saving…' : 'Save Purchase Order'}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Two-card header */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left card — Supplier & Dates */}
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 space-y-3">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Order Details</div>
            <div>
              <label className="label">Supplier *</label>
              <select
                className={`input-field ${errors.supplier ? 'border-red-500' : ''}`}
                value={formData.supplier}
                onChange={(e) => setFormData(p => ({ ...p, supplier: e.target.value }))}
              >
                <option value="">Select Supplier</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              {errors.supplier && <p className="mt-1 text-xs text-red-500">{errors.supplier}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Order Date *</label>
                <input
                  type="date"
                  className="input-field"
                  value={formData.order_date}
                  onChange={(e) => setFormData(p => ({ ...p, order_date: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">Expected Delivery</label>
                <input
                  type="date"
                  className="input-field"
                  value={formData.expected_delivery_date}
                  onChange={(e) => setFormData(p => ({ ...p, expected_delivery_date: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* Right card — Status & Payment */}
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 space-y-3">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Status & Payment</div>
            <div>
              <label className="label">Status</label>
              <select
                className="input-field"
                value={formData.status}
                onChange={(e) => setFormData(p => ({ ...p, status: e.target.value as PurchaseStatus }))}
              >
                <option value="draft">Draft</option>
                <option value="ordered">Ordered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Payment Status</label>
                <select
                  className="input-field"
                  value={formData.payment_status}
                  onChange={(e) => setFormData(p => ({ ...p, payment_status: e.target.value as any }))}
                >
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="partial">Partial</option>
                </select>
              </div>
              <div>
                <label className="label">Payment Method</label>
                <select
                  className="input-field"
                  value={formData.payment_method}
                  onChange={(e) => setFormData(p => ({ ...p, payment_method: e.target.value as any }))}
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="upi">UPI</option>
                  <option value="net_banking">Net Banking</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Items Section */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-gray-700 text-sm">Order Items</h3>
            <button
              type="button"
              className="btn btn-outline-primary btn-sm flex items-center gap-1"
              onClick={handleAddItem}
            >
              <Plus className="w-4 h-4" /> Add Item
            </button>
          </div>

          {errors.items && <p className="text-xs text-red-500">{errors.items}</p>}

          <div className="overflow-x-auto border border-gray-200 rounded-xl">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-3 py-3 w-8 text-center">#</th>
                  <th className="px-3 py-3 min-w-[220px]">Product *</th>
                  <th className="px-3 py-3 w-24">Qty *</th>
                  <th className="px-3 py-3 w-32">Unit Price *</th>
                  <th className="px-3 py-3 w-20">Tax %</th>
                  <th className="px-3 py-3 w-32 text-right">Total</th>
                  <th className="px-3 py-3 w-8" />
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => {
                  const qty = Number(item.quantity) || 0;
                  const price = Number(item.unit_price) || 0;
                  const tax = Number(item.tax_rate) || 0;
                  const total = (qty * price) * (1 + tax / 100);
                  const searchVal = productSearches[index] ?? '';
                  const dropState = dropdownStates[index] || EMPTY_DROPDOWN;

                  return (
                    <tr key={index} className={`border-b border-gray-100 last:border-b-0 ${index % 2 === 1 ? 'bg-gray-50/40' : ''}`}>
                      <td className="px-3 py-2 text-center text-xs text-gray-400 font-medium">{index + 1}</td>
                      <td className="px-3 py-2">
                        <div className="relative">
                          <input
                            type="text"
                            className="input-field text-sm w-full"
                            value={searchVal}
                            placeholder="Search product…"
                            autoComplete="off"
                            onChange={(e) => handleSearchChange(index, e.target.value)}
                            onFocus={(e) => handleDropdownOpen(index, e)}
                            onBlur={() => setTimeout(() => setOpenDropdownIndex(null), 150)}
                          />
                          {item.unit && (
                            <div className="text-xs text-gray-400 mt-0.5">{item.unit}</div>
                          )}
                        </div>
                        {openDropdownIndex === index && (
                          <div
                            className="fixed z-[9999] bg-white border border-gray-200 rounded-xl shadow-lg max-h-52 overflow-y-auto"
                            style={{ top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width }}
                            onScroll={(e) => handleDropdownScroll(e, index)}
                          >
                            {dropState.results.length === 0 && !dropState.loading ? (
                              <div className="px-3 py-3 text-sm text-gray-400 text-center">No products found</div>
                            ) : (
                              <>
                                {dropState.results.map(p => (
                                  <button
                                    key={p.id}
                                    type="button"
                                    className="w-full text-left px-3 py-2.5 hover:bg-primary-50 border-b border-gray-50 last:border-0 transition-colors"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => {
                                      handleItemChange(index, 'product', String(p.id));
                                      setProductSearches(prev => {
                                        const next = [...prev];
                                        next[index] = p.name;
                                        return next;
                                      });
                                      setOpenDropdownIndex(null);
                                    }}
                                  >
                                    <div className="text-sm font-medium text-gray-800">{p.name}</div>
                                    <div className="text-xs text-gray-400 flex gap-3">
                                      {p.sku && <span>SKU: {p.sku}</span>}
                                      {p.cost_price !== undefined && <span>Cost: {formatINR(Number(p.cost_price))}</span>}
                                    </div>
                                  </button>
                                ))}
                                {dropState.loading && (
                                  <div className="px-3 py-2 text-xs text-gray-400 text-center">Loading…</div>
                                )}
                                {!dropState.hasMore && !dropState.loading && dropState.results.length > 0 && (
                                  <div className="px-3 py-2 text-xs text-gray-300 text-center">End of results</div>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          className="input-field text-sm !w-16"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                          min="0.01"
                          step="0.01"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          className="input-field text-sm"
                          value={item.unit_price}
                          onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
                          min="0"
                          step="0.01"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          className="input-field text-sm"
                          value={item.tax_rate}
                          onChange={(e) => handleItemChange(index, 'tax_rate', e.target.value)}
                          min="0"
                          step="0.01"
                        />
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-gray-800 tabular-nums">
                        {formatINR(total)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {items.length > 1 && (
                          <button
                            type="button"
                            className="p-1 rounded-md text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                            onClick={() => handleRemoveItem(index)}
                            title="Remove"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Running Totals */}
        <div className="flex justify-end">
          <div className="w-full md:w-64 border border-gray-200 rounded-xl overflow-hidden text-sm">
            <div className="flex justify-between px-4 py-2.5 border-b border-gray-100">
              <span className="text-gray-500">Subtotal</span>
              <span className="font-medium tabular-nums">{formatINR(subtotal)}</span>
            </div>
            <div className="flex justify-between px-4 py-2.5 border-b border-gray-100">
              <span className="text-gray-500">Tax</span>
              <span className="font-medium tabular-nums">{formatINR(taxTotal)}</span>
            </div>
            <div className="flex justify-between px-4 py-3 bg-primary-50">
              <span className="font-bold text-primary-800">Grand Total</span>
              <span className="font-bold text-primary-800 tabular-nums">{formatINR(grandTotal)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="label">Notes</label>
          <textarea
            className="input-field"
            rows={2}
            value={formData.notes}
            onChange={(e) => setFormData(p => ({ ...p, notes: e.target.value }))}
            placeholder="Additional notes…"
          />
        </div>

      </form>
    </Modal>
  );
};

export default PurchaseFormModal;
