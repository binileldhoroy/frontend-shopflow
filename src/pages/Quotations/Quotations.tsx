import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAppDispatch } from '@hooks/useRedux';
import { addNotification } from '@store/slices/uiSlice';
import { quotationService } from '@api/services/quotation.service';
import { customerService } from '@api/services/customer.service';
import { productService } from '@api/services/product.service';
import { ClipboardList, Plus, Trash2, CheckCircle, X, ChevronDown, Loader2, Eye } from 'lucide-react';
import DeleteConfirmModal from '../../components/common/DeleteConfirmModal/DeleteConfirmModal';
import Modal from '../../components/common/Modal/Modal';
import QuotationPrintModal from '../../components/quotations/QuotationPrintModal';

const STATUS_COLORS: Record<string, string> = {
  draft: 'badge-warning', sent: 'badge-info', accepted: 'badge-success',
  expired: 'badge-danger', converted: 'badge-primary',
};

const STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ['sent'],
  sent: ['accepted', 'draft'],
  accepted: ['sent'],
  expired: [],
  converted: [],
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
  const [productHasMore, setProductHasMore] = useState<boolean[]>([false]);
  const [productPage, setProductPage] = useState<number[]>([1]);
  const [productLoading, setProductLoading] = useState<boolean[]>([false]);
  const [openDropdownIndex, setOpenDropdownIndex] = useState<number | null>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const searchTimerRef = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  const [statusUpdating, setStatusUpdating] = useState<number | null>(null);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState<number | null>(null);
  const [printTarget, setPrintTarget] = useState<any>(null);
  const [printLoading, setPrintLoading] = useState<number | null>(null);

  const handleStatusChange = async (q: any, newStatus: string) => {
    setStatusDropdownOpen(null);
    if (q.status === newStatus) return;
    setStatusUpdating(q.id);
    try {
      await quotationService.updateStatus(q.id, newStatus);
      setQuotations(prev => prev.map(x => x.id === q.id ? { ...x, status: newStatus } : x));
    } catch {
      dispatch(addNotification({ message: 'Failed to update status', type: 'error' }));
    } finally {
      setStatusUpdating(null);
    }
  };

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

  useEffect(() => {
    if (statusDropdownOpen === null) return;
    const handler = () => setStatusDropdownOpen(null);
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [statusDropdownOpen]);

  const fetchProducts = async (rowIdx: number, term: string, page: number, append: boolean) => {
    setProductLoading(prev => { const n = [...prev]; n[rowIdx] = true; return n; });
    try {
      const d = await productService.getAll({ search: term, page_size: 10, page });
      const results = d.results || [];
      setProductResults(prev => { const n = [...prev]; n[rowIdx] = append ? [...(n[rowIdx] || []), ...results] : results; return n; });
      setProductHasMore(prev => { const n = [...prev]; n[rowIdx] = !!d.next; return n; });
      setProductPage(prev => { const n = [...prev]; n[rowIdx] = page; return n; });
    } catch {} finally {
      setProductLoading(prev => { const n = [...prev]; n[rowIdx] = false; return n; });
    }
  };

  const searchProduct = (rowIdx: number, term: string) => {
    clearTimeout(searchTimerRef.current[rowIdx]);
    if (!term || term.length < 2) {
      setProductResults(prev => { const n = [...prev]; n[rowIdx] = []; return n; });
      setProductHasMore(prev => { const n = [...prev]; n[rowIdx] = false; return n; });
      return;
    }
    searchTimerRef.current[rowIdx] = setTimeout(() => fetchProducts(rowIdx, term, 1, false), 300);
  };

  const handleSearchFocus = (rowIdx: number, e: React.FocusEvent<HTMLInputElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setDropdownPos({ top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 260) });
    setOpenDropdownIndex(rowIdx);
    if (!productResults[rowIdx]?.length) fetchProducts(rowIdx, productSearch[rowIdx] || '', 1, false);
  };

  const handleDropdownScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (openDropdownIndex === null) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 30) {
      if (productHasMore[openDropdownIndex] && !productLoading[openDropdownIndex]) {
        fetchProducts(openDropdownIndex, productSearch[openDropdownIndex] || '', (productPage[openDropdownIndex] || 1) + 1, true);
      }
    }
  };

  const addRow = () => {
    setItems(p => [...p, emptyItem()]);
    setProductSearch(p => [...p, '']);
    setProductResults(p => [...p, []]);
    setProductHasMore(p => [...p, false]);
    setProductPage(p => [...p, 1]);
    setProductLoading(p => [...p, false]);
  };

  const removeRow = (i: number) => {
    setItems(p => p.filter((_, idx) => idx !== i));
    setProductSearch(p => p.filter((_, idx) => idx !== i));
    setProductResults(p => p.filter((_, idx) => idx !== i));
    setProductHasMore(p => p.filter((_, idx) => idx !== i));
    setProductPage(p => p.filter((_, idx) => idx !== i));
    setProductLoading(p => p.filter((_, idx) => idx !== i));
    if (openDropdownIndex === i) setOpenDropdownIndex(null);
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
    setOpenDropdownIndex(null);
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
      setItems([emptyItem()]); setProductSearch(['']); setProductResults([[]]); setProductHasMore([false]); setProductPage([1]); setProductLoading([false]);
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

  const handleViewQuotation = async (q: any) => {
    setPrintLoading(q.id);
    try {
      const detail = await quotationService.getById(q.id);
      setPrintTarget(detail);
    } catch {
      dispatch(addNotification({ message: 'Failed to load quotation details', type: 'error' }));
    } finally {
      setPrintLoading(null);
    }
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
                    <td className="td-center">
                      {['converted', 'expired'].includes(q.status) ? (
                        <span className={`badge ${STATUS_COLORS[q.status] || 'badge-secondary'} capitalize`}>{q.status}</span>
                      ) : (
                        <div className="relative inline-block">
                          <button
                            className={`badge ${STATUS_COLORS[q.status] || 'badge-secondary'} capitalize flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity`}
                            onClick={() => setStatusDropdownOpen(prev => prev === q.id ? null : q.id)}
                            disabled={statusUpdating === q.id}
                            title="Click to change status"
                          >
                            {statusUpdating === q.id
                              ? <Loader2 className="w-3 h-3 animate-spin" />
                              : q.status
                            }
                            {statusUpdating !== q.id && <ChevronDown className="w-3 h-3 opacity-60" />}
                          </button>
                          {statusDropdownOpen === q.id && (STATUS_TRANSITIONS[q.status] || []).length > 0 && (
                            <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-xl shadow-lg min-w-[120px] overflow-hidden">
                              {(STATUS_TRANSITIONS[q.status] || []).map(s => (
                                <button
                                  key={s}
                                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors flex items-center gap-2 text-gray-700"
                                  onMouseDown={e => e.stopPropagation()}
                                  onClick={() => handleStatusChange(q, s)}
                                >
                                  <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[s]?.includes('warning') ? 'bg-amber-400' : STATUS_COLORS[s]?.includes('info') ? 'bg-blue-400' : STATUS_COLORS[s]?.includes('success') ? 'bg-green-500' : 'bg-gray-400'}`} />
                                  {s.charAt(0).toUpperCase() + s.slice(1)}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td><div className="flex items-center justify-end gap-1">
                      <button
                        className="action-btn action-btn-primary"
                        title="View Quotation"
                        onClick={() => handleViewQuotation(q)}
                        disabled={printLoading === q.id}
                      >
                        {printLoading === q.id
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <Eye className="w-4 h-4" />
                        }
                      </button>
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
            <div className="border rounded-lg overflow-visible">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b rounded-t-lg">
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
                      <td className="px-3 py-2">
                        <input
                          className="input-field w-full text-sm py-1"
                          placeholder="Search product…"
                          value={productSearch[i] || ''}
                          autoComplete="off"
                          onChange={e => {
                            const v = e.target.value;
                            setProductSearch(p => { const n=[...p]; n[i]=v; return n; });
                            updateItem(i, 'product_name', v);
                            searchProduct(i, v);
                          }}
                          onFocus={e => handleSearchFocus(i, e)}
                          onBlur={() => setTimeout(() => setOpenDropdownIndex(null), 150)}
                        />
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

      {/* Fixed-position product dropdown — renders outside modal overflow */}
      {openDropdownIndex !== null && (
        <div
          className="fixed z-[9999] bg-white border border-gray-200 rounded-xl shadow-lg max-h-52 overflow-y-auto"
          style={{ top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width }}
          onScroll={handleDropdownScroll}
        >
          {productResults[openDropdownIndex]?.length === 0 && !productLoading[openDropdownIndex] ? (
            <div className="px-3 py-3 text-sm text-gray-400 text-center">No products found</div>
          ) : (
            <>
              {productResults[openDropdownIndex]?.map((p: any) => (
                <button
                  key={p.id}
                  type="button"
                  className="w-full text-left px-3 py-2.5 hover:bg-primary-50 border-b border-gray-50 last:border-0 transition-colors"
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => selectProduct(openDropdownIndex, p)}
                >
                  <div className="font-medium text-sm text-gray-800">{p.name}</div>
                  <div className="text-xs text-gray-400">{p.sku} · ₹{p.selling_price} · GST {p.gst_rate}%</div>
                </button>
              ))}
              {productLoading[openDropdownIndex] && (
                <div className="px-3 py-2 text-xs text-gray-400 text-center">Loading…</div>
              )}
            </>
          )}
        </div>
      )}

      {showDeleteModal && selected && (
        <DeleteConfirmModal show={showDeleteModal}
          title="Delete Quotation"
          message={`Delete quotation ${selected.quote_number}? This cannot be undone.`}
          onConfirm={handleDelete}
          onHide={() => { setShowDeleteModal(false); setSelected(null); }}
        />
      )}

      <QuotationPrintModal
        show={!!printTarget}
        onHide={() => setPrintTarget(null)}
        quotation={printTarget}
      />
    </div>
  );
};

export default Quotations;
