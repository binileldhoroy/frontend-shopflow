import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAppDispatch } from '@hooks/useRedux';
import { addNotification } from '@store/slices/uiSlice';
import { quotationService } from '@api/services/quotation.service';
import { customerService } from '@api/services/customer.service';
import { productService } from '@api/services/product.service';
import { ClipboardList, Plus, Trash2, CheckCircle, X } from 'lucide-react';
import DeleteConfirmModal from '../../components/common/DeleteConfirmModal/DeleteConfirmModal';
import Modal from '../../components/common/Modal/Modal';

const STATUS_COLORS: Record<string, string> = {
  draft: 'badge-warning', sent: 'badge-info', accepted: 'badge-success',
  expired: 'badge-danger', converted: 'badge-primary',
};

interface QuoteItem { product_id: number | null; product_name: string; hsn_code: string; quantity: string; unit_price: string; gst_rate: string; }
const emptyItem = (): QuoteItem => ({ product_id: null, product_name: '', hsn_code: '', quantity: '1', unit_price: '', gst_rate: '18' });

const Quotations: React.FC = () => {
  const dispatch = useAppDispatch();
  const [quotations, setQuotations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selected, setSelected] = useState<any>(null);

  // Create form state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [validityDate, setValidityDate] = useState('');
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState('');
  const [discount, setDiscount] = useState('0');
  const [items, setItems] = useState<QuoteItem[]>([emptyItem()]);

  // Product search state per row
  const [productSearch, setProductSearch] = useState<string[]>(['']);
  const [productResults, setProductResults] = useState<any[][]>([[]]);
  const [activeRow, setActiveRow] = useState<number | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load data
  const fetchList = useCallback(async () => {
    try { setLoading(true); const d = await quotationService.getAll({ page_size: 20 }); setQuotations(d.results || d); }
    catch { dispatch(addNotification({ message: 'Failed to load quotations', type: 'error' })); }
    finally { setLoading(false); }
  }, [dispatch]);

  useEffect(() => { fetchList(); }, [fetchList]);

  useEffect(() => {
    customerService.getAll({ page_size: 200 }).then(d => setCustomers(d.results || d)).catch(() => {});
  }, []);

  const searchProduct = (rowIdx: number, term: string) => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!term || term.length < 2) {
      setProductResults(prev => { const n = [...prev]; n[rowIdx] = []; return n; });
      return;
    }
    searchTimerRef.current = setTimeout(async () => {
      try {
        const d = await productService.getAll({ search: term, page_size: 8 });
        setProductResults(prev => { const n = [...prev]; n[rowIdx] = d.results || d; return n; });
      } catch {}
    }, 350);
  };

  const addRow = () => {
    setItems(p => [...p, emptyItem()]);
    setProductSearch(p => [...p, '']);
    setProductResults(p => [...p, []]);
  };

  const removeRow = (i: number) => {
    setItems(p => p.filter((_, idx) => idx !== i));
    setProductSearch(p => p.filter((_, idx) => idx !== i));
    setProductResults(p => p.filter((_, idx) => idx !== i));
  };

  const updateItem = (i: number, field: keyof QuoteItem, val: string | number | null) => {
    setItems(p => { const n = [...p]; (n[i] as any)[field] = val; return n; });
  };

  const selectProduct = (rowIdx: number, product: any) => {
    const base = product.tax_included
      ? parseFloat(product.selling_price) / (1 + parseFloat(product.gst_rate) / 100)
      : parseFloat(product.selling_price);
    setItems(p => {
      const n = [...p];
      n[rowIdx] = { product_id: product.id, product_name: product.name, hsn_code: product.hsn_code || '', quantity: '1', unit_price: base.toFixed(2), gst_rate: String(product.gst_rate) };
      return n;
    });
    setProductSearch(p => { const n = [...p]; n[rowIdx] = product.name; return n; });
    setProductResults(p => { const n = [...p]; n[rowIdx] = []; return n; });
    setActiveRow(null);
  };

  const lineTotal = (item: QuoteItem) => {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.unit_price) || 0;
    const gst = parseFloat(item.gst_rate) || 0;
    return qty * price * (1 + gst / 100);
  };

  const grandTotal = items.reduce((s, it) => s + lineTotal(it), 0) - (parseFloat(discount) || 0);

  const handleSave = async () => {
    if (!customerId) { dispatch(addNotification({ message: 'Select a customer', type: 'error' })); return; }
    if (!validityDate) { dispatch(addNotification({ message: 'Set a validity date', type: 'error' })); return; }
    const validItems = items.filter(i => i.product_name && parseFloat(i.unit_price) > 0);
    if (validItems.length === 0) { dispatch(addNotification({ message: 'Add at least one item', type: 'error' })); return; }
    setSaving(true);
    try {
      await quotationService.create({
        customer_id: parseInt(customerId),
        validity_date: validityDate,
        discount_amount: parseFloat(discount) || 0,
        notes, terms,
        items: validItems.map(i => ({
          product_id: i.product_id,
          product_name: i.product_name,
          hsn_code: i.hsn_code,
          quantity: parseFloat(i.quantity) || 1,
          unit_price: parseFloat(i.unit_price) || 0,
          gst_rate: parseFloat(i.gst_rate) || 0,
        })),
      });
      dispatch(addNotification({ message: 'Quotation created', type: 'success' }));
      setShowCreateModal(false);
      setCustomerId(''); setValidityDate(''); setNotes(''); setTerms(''); setDiscount('0');
      setItems([emptyItem()]); setProductSearch(['']); setProductResults([[]]);
      fetchList();
    } catch (e: any) {
      dispatch(addNotification({ message: e?.response?.data?.error || 'Failed to save', type: 'error' }));
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!selected) return;
    try {
      await quotationService.delete(selected.id);
      dispatch(addNotification({ message: 'Quotation deleted', type: 'success' }));
      setShowDeleteModal(false); fetchList();
    } catch { dispatch(addNotification({ message: 'Failed to delete', type: 'error' })); }
  };

  const handleConvert = async (q: any) => {
    try {
      const result = await quotationService.convert(q.id);
      dispatch(addNotification({ message: `Converted to order ${result.order_number}`, type: 'success' }));
      fetchList();
    } catch (e: any) {
      dispatch(addNotification({ message: e?.response?.data?.error || 'Conversion failed', type: 'error' }));
    }
  };

  return (
    <div className="space-y-4">
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-header-icon"><ClipboardList className="w-5 h-5" /></div>
          <div><h1>Quotations</h1><p>Create and manage price estimates for customers</p></div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 inline mr-1.5" />New Quotation
        </button>
      </div>

      <div className="section-card flex flex-col" style={{ height: 'calc(var(--viewport-height) - 220px)', minHeight: '300px' }}>
        {loading ? (
          <div className="loading-center flex-1"><div className="spinner" /></div>
        ) : quotations.length === 0 ? (
          <div className="empty-state flex-1">
            <div className="empty-state-icon"><ClipboardList className="w-6 h-6" /></div>
            <p className="text-gray-700 font-medium">No quotations yet</p>
            <p className="text-sm text-gray-400 mt-1 mb-4">Create your first price quote</p>
            <button onClick={() => setShowCreateModal(true)} className="btn btn-primary text-sm">New Quotation</button>
          </div>
        ) : (
          <div className="flex-1 table-scroll">
            <table className="data-table">
              <thead><tr>
                <th>Quote #</th><th>Customer</th><th>Created</th><th>Valid Until</th>
                <th className="th-right">Total</th><th className="th-center">Status</th><th className="th-right">Actions</th>
              </tr></thead>
              <tbody>
                {quotations.map(q => (
                  <tr key={q.id}>
                    <td className="font-mono text-sm">{q.quote_number}</td>
                    <td className="font-semibold">{q.customer_name}</td>
                    <td className="text-gray-500 text-sm">{q.created_date}</td>
                    <td className="text-gray-500 text-sm">{q.validity_date}</td>
                    <td className="td-right font-semibold">₹{Number(q.total_amount).toLocaleString()}</td>
                    <td className="td-center"><span className={`badge ${STATUS_COLORS[q.status] || 'badge-secondary'}`}>{q.status}</span></td>
                    <td><div className="flex items-center justify-end gap-1">
                      {!['converted','expired'].includes(q.status) && (
                        <button className="action-btn action-btn-success" title="Convert to Invoice" onClick={() => handleConvert(q)}>
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                      <button className="action-btn action-btn-danger" title="Delete" onClick={() => { setSelected(q); setShowDeleteModal(true); }}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} title="New Quotation" size="xl">
        <div className="space-y-4 p-1">
          {/* Customer + Validity */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer *</label>
              <select className="input-field w-full" value={customerId} onChange={e => setCustomerId(e.target.value)}>
                <option value="">Select customer</option>
                {customers.filter(c => !c.is_guest).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valid Until *</label>
              <input type="date" className="input-field w-full" value={validityDate} onChange={e => setValidityDate(e.target.value)} min={new Date().toISOString().split('T')[0]} />
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Items *</label>
              <button onClick={addRow} className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
                <Plus className="w-3 h-3" /> Add Row
              </button>
            </div>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Product</th>
                    <th className="px-3 py-2 text-left w-24">HSN</th>
                    <th className="px-3 py-2 text-right w-20">Qty</th>
                    <th className="px-3 py-2 text-right w-28">Unit Price (₹)</th>
                    <th className="px-3 py-2 text-right w-20">GST%</th>
                    <th className="px-3 py-2 text-right w-28">Total (₹)</th>
                    <th className="px-3 py-2 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {items.map((item, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 relative">
                        <input
                          className="input-field w-full text-sm py-1"
                          placeholder="Search product…"
                          value={productSearch[i] || ''}
                          onChange={e => { const v = e.target.value; setProductSearch(p => { const n=[...p]; n[i]=v; return n; }); updateItem(i, 'product_name', v); searchProduct(i, v); setActiveRow(i); }}
                          onFocus={() => setActiveRow(i)}
                        />
                        {activeRow === i && productResults[i]?.length > 0 && (
                          <div className="absolute left-3 top-full z-30 w-64 bg-white shadow-xl border rounded-lg overflow-hidden mt-0.5">
                            {productResults[i].map(p => (
                              <button key={p.id} className="w-full text-left px-3 py-2 text-sm hover:bg-primary-50 border-b last:border-b-0" onClick={() => selectProduct(i, p)}>
                                <div className="font-medium">{p.name}</div>
                                <div className="text-xs text-gray-400">{p.sku} · ₹{p.selling_price} · GST {p.gst_rate}%</div>
                              </button>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2"><input className="input-field w-full text-sm py-1" value={item.hsn_code} onChange={e => updateItem(i, 'hsn_code', e.target.value)} /></td>
                      <td className="px-3 py-2"><input type="number" min="0.01" step="0.01" className="input-field w-full text-sm py-1 text-right" value={item.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} /></td>
                      <td className="px-3 py-2"><input type="number" min="0" step="0.01" className="input-field w-full text-sm py-1 text-right" value={item.unit_price} onChange={e => updateItem(i, 'unit_price', e.target.value)} /></td>
                      <td className="px-3 py-2">
                        <select className="input-field w-full text-sm py-1" value={item.gst_rate} onChange={e => updateItem(i, 'gst_rate', e.target.value)}>
                          {[0,5,12,18,28].map(r => <option key={r} value={r}>{r}%</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2 text-right font-medium">₹{lineTotal(item).toFixed(2)}</td>
                      <td className="px-3 py-2">
                        {items.length > 1 && <button onClick={() => removeRow(i)} className="p-1 text-gray-300 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Discount + Notes */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Discount (₹)</label>
              <input type="number" min="0" className="input-field w-full" value={discount} onChange={e => setDiscount(e.target.value)} />
            </div>
            <div className="flex items-end">
              <div className="bg-gray-50 rounded-lg p-3 w-full text-right">
                <span className="text-sm text-gray-500">Grand Total: </span>
                <span className="text-lg font-bold text-gray-900">₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea className="input-field w-full" rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Internal notes…" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Terms & Conditions</label>
              <textarea className="input-field w-full" rows={2} value={terms} onChange={e => setTerms(e.target.value)} placeholder="Payment terms, delivery conditions…" />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowCreateModal(false)} className="btn btn-outline-secondary">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn btn-primary">{saving ? 'Saving…' : 'Create Quotation'}</button>
          </div>
        </div>
      </Modal>

      {showDeleteModal && selected && (
        <DeleteConfirmModal show={showDeleteModal}
          title="Delete Quotation"
          message={`Delete quotation ${selected.quote_number}? This cannot be undone.`}
          onConfirm={handleDelete}
          onHide={() => { setShowDeleteModal(false); setSelected(null); }}
        />
      )}
    </div>
  );
};

export default Quotations;
