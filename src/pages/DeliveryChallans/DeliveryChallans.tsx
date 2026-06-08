import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAppDispatch } from '@hooks/useRedux';
import { addNotification } from '@store/slices/uiSlice';
import { challanService } from '@api/services/challan.service';
import { customerService } from '@api/services/customer.service';
import { productService } from '@api/services/product.service';
import { Truck, Plus, CheckCircle, Package, X, Eye } from 'lucide-react';
import Modal from '../../components/common/Modal/Modal';
import ChallanPrintModal from '../../components/challans/ChallanPrintModal';

const STATUS_COLORS: Record<string, string> = {
  draft: 'badge-warning', dispatched: 'badge-info', delivered: 'badge-success',
};

interface ChallanItem { product_id: number | null; product_name: string; quantity: string; unit: string; notes: string; }
const emptyItem = (): ChallanItem => ({ product_id: null, product_name: '', quantity: '1', unit: 'pcs', notes: '' });

const DeliveryChallans: React.FC = () => {
  const dispatch = useAppDispatch();
  const [challans, setChallans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Create form
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [vehicleNo, setVehicleNo] = useState('');
  const [driverName, setDriverName] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [items, setItems] = useState<ChallanItem[]>([emptyItem()]);
  const [productSearch, setProductSearch] = useState<string[]>(['']);
  const [productResults, setProductResults] = useState<any[][]>([[]]);
  const [productHasMore, setProductHasMore] = useState<boolean[]>([false]);
  const [productPage, setProductPage] = useState<number[]>([1]);
  const [productLoading, setProductLoading] = useState<boolean[]>([false]);
  const [openDropdownIndex, setOpenDropdownIndex] = useState<number | null>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const searchTimerRef = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  const fetchList = useCallback(async () => {
    try { setLoading(true); const d = await challanService.getAll({ page_size: 50 }); setChallans(d.results || d); }
    catch { dispatch(addNotification({ message: 'Failed to load challans', type: 'error' })); }
    finally { setLoading(false); }
  }, [dispatch]);

  useEffect(() => { fetchList(); }, [fetchList]);
  useEffect(() => {
    customerService.getAll({ page_size: 200 }).then(d => setCustomers(d.results || d)).catch(() => {});
  }, []);

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

  const selectProduct = (rowIdx: number, product: any) => {
    setItems(p => { const n = [...p]; n[rowIdx] = { ...n[rowIdx], product_id: product.id, product_name: product.name, unit: product.unit || 'pcs' }; return n; });
    setProductSearch(p => { const n = [...p]; n[rowIdx] = product.name; return n; });
    setOpenDropdownIndex(null);
  };

  const updateItem = (i: number, field: keyof ChallanItem, val: string) => {
    setItems(p => { const n = [...p]; (n[i] as any)[field] = val; return n; });
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

  const resetForm = () => {
    setCustomerId(''); setVehicleNo(''); setDriverName(''); setFormNotes('');
    setDate(new Date().toISOString().split('T')[0]);
    setItems([emptyItem()]); setProductSearch(['']); setProductResults([[]]); setProductHasMore([false]); setProductPage([1]); setProductLoading([false]);
  };

  const handleSave = async () => {
    if (!customerId) { dispatch(addNotification({ message: 'Select a customer', type: 'error' })); return; }
    const validItems = items.filter(i => i.product_name && parseFloat(i.quantity) > 0);
    if (validItems.length === 0) { dispatch(addNotification({ message: 'Add at least one item', type: 'error' })); return; }
    setSaving(true);
    try {
      await challanService.create({
        customer_id: parseInt(customerId), date, vehicle_no: vehicleNo, driver_name: driverName, notes: formNotes,
        items: validItems.map(i => ({ product_id: i.product_id, product_name: i.product_name, quantity: parseFloat(i.quantity) || 1, unit: i.unit, notes: i.notes })),
      });
      dispatch(addNotification({ message: 'Delivery Challan created', type: 'success' }));
      setShowCreateModal(false); resetForm(); fetchList();
    } catch (e: any) {
      dispatch(addNotification({ message: e?.response?.data?.error || 'Failed to save', type: 'error' }));
    } finally { setSaving(false); }
  };

  const handleDispatch = async (id: number) => {
    try { await challanService.dispatch(id); dispatch(addNotification({ message: 'Marked as dispatched', type: 'success' })); fetchList(); }
    catch { dispatch(addNotification({ message: 'Action failed', type: 'error' })); }
  };

  const handleDeliver = async (id: number) => {
    try { await challanService.deliver(id); dispatch(addNotification({ message: 'Marked as delivered', type: 'success' })); fetchList(); }
    catch { dispatch(addNotification({ message: 'Action failed', type: 'error' })); }
  };

  const [viewTarget, setViewTarget] = useState<any>(null);
  const [viewLoading, setViewLoading] = useState<number | null>(null);

  const handleViewChallan = async (c: any) => {
    setViewLoading(c.id);
    try {
      const detail = await challanService.getById(c.id);
      setViewTarget(detail);
    } catch {
      dispatch(addNotification({ message: 'Failed to load challan detail', type: 'error' }));
    } finally {
      setViewLoading(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-header-icon"><Truck className="w-5 h-5" /></div>
          <div><h1>Delivery Challans</h1><p>Track goods dispatched to customers</p></div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 inline mr-1.5" />New Challan
        </button>
      </div>

      <div className="section-card flex flex-col" style={{ height: 'calc(var(--viewport-height) - 220px)', minHeight: '300px' }}>
        {loading ? (
          <div className="loading-center flex-1"><div className="spinner" /></div>
        ) : challans.length === 0 ? (
          <div className="empty-state flex-1">
            <div className="empty-state-icon"><Package className="w-6 h-6" /></div>
            <p className="text-gray-700 font-medium">No delivery challans yet</p>
            <p className="text-sm text-gray-400 mt-1 mb-4">Create a challan to track dispatched goods</p>
            <button onClick={() => setShowCreateModal(true)} className="btn btn-primary text-sm">New Challan</button>
          </div>
        ) : (
          <div className="flex-1 table-scroll">
            <table className="data-table">
              <thead><tr>
                <th>Challan #</th><th>Customer</th><th>Date</th><th>Vehicle</th>
                <th>Items</th><th className="th-center">Status</th><th className="th-right">Actions</th>
              </tr></thead>
              <tbody>
                {challans.map(c => (
                  <tr key={c.id}>
                    <td className="font-mono text-sm">{c.challan_number}</td>
                    <td className="font-semibold">{c.customer_name}</td>
                    <td className="text-gray-500 text-sm">{c.date}</td>
                    <td className="text-gray-500 text-sm">{c.vehicle_no || '—'}</td>
                    <td className="text-gray-500 text-sm">{c.items?.length || 0} items</td>
                    <td className="td-center"><span className={`badge ${STATUS_COLORS[c.status] || 'badge-secondary'}`}>{c.status}</span></td>
                    <td><div className="flex items-center justify-end gap-1">
                      <button className="action-btn action-btn-secondary" title="View / Print" onClick={() => handleViewChallan(c)} disabled={viewLoading === c.id}>
                        {viewLoading === c.id ? <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin inline-block" /> : <Eye className="w-4 h-4" />}
                      </button>
                      {c.status === 'draft' && <button className="action-btn action-btn-primary" title="Dispatch" onClick={() => handleDispatch(c.id)}><Truck className="w-4 h-4" /></button>}
                      {c.status === 'dispatched' && <button className="action-btn action-btn-success" title="Delivered" onClick={() => handleDeliver(c.id)}><CheckCircle className="w-4 h-4" /></button>}
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} title="New Delivery Challan" size="xl">
        <div className="space-y-4 p-1">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer *</label>
              <select className="input-field w-full" value={customerId} onChange={e => setCustomerId(e.target.value)}>
                <option value="">Select customer</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input type="date" className="input-field w-full" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle No.</label>
              <input className="input-field w-full" placeholder="MH12AB1234" value={vehicleNo} onChange={e => setVehicleNo(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Driver Name</label>
              <input className="input-field w-full" value={driverName} onChange={e => setDriverName(e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <input className="input-field w-full" value={formNotes} onChange={e => setFormNotes(e.target.value)} />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Items *</label>
              <button onClick={addRow} className="text-xs text-primary-600 font-medium flex items-center gap-1"><Plus className="w-3 h-3" />Add Row</button>
            </div>
            <div className="border rounded-lg overflow-visible">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b rounded-t-lg">
                  <tr>
                    <th className="px-3 py-2 text-left">Product</th>
                    <th className="px-3 py-2 text-right w-20">Qty</th>
                    <th className="px-3 py-2 w-20">Unit</th>
                    <th className="px-3 py-2">Notes</th>
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
                          onChange={e => { const v = e.target.value; setProductSearch(p => { const n=[...p]; n[i]=v; return n; }); updateItem(i, 'product_name', v); searchProduct(i, v); }}
                          onFocus={e => handleSearchFocus(i, e)}
                          onBlur={() => setTimeout(() => setOpenDropdownIndex(null), 150)}
                        />
                      </td>
                      <td className="px-3 py-2"><input type="number" min="0.01" className="input-field w-full text-sm py-1 text-right" value={item.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} /></td>
                      <td className="px-3 py-2"><input className="input-field w-full text-sm py-1" value={item.unit} onChange={e => updateItem(i, 'unit', e.target.value)} /></td>
                      <td className="px-3 py-2"><input className="input-field w-full text-sm py-1" value={item.notes} onChange={e => updateItem(i, 'notes', e.target.value)} /></td>
                      <td className="px-3 py-2">{items.length > 1 && <button onClick={() => removeRow(i)} className="p-1 text-gray-300 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => { setShowCreateModal(false); resetForm(); }} className="btn btn-outline-secondary">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn btn-primary">{saving ? 'Saving…' : 'Create Challan'}</button>
          </div>
        </div>
      </Modal>

      <ChallanPrintModal
        show={!!viewTarget}
        onHide={() => setViewTarget(null)}
        challan={viewTarget}
      />

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
                  <div className="text-xs text-gray-400">{p.sku} · {p.unit}</div>
                </button>
              ))}
              {productLoading[openDropdownIndex] && (
                <div className="px-3 py-2 text-xs text-gray-400 text-center">Loading…</div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default DeliveryChallans;
