import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { purchaseService } from '../../api/services/purchase.service';
import { supplierService } from '../../api/services/supplier.service';
import { productService } from '../../api/services/product.service';
import { PurchaseOrder, PurchaseOrderCreate } from '../../types/purchase.types';
import { Supplier } from '../../types/supplier.types';
import { Product } from '../../types/product.types';
import { useAppDispatch } from '../../hooks/useRedux';
import { addNotification } from '../../store/slices/uiSlice';
import { ShoppingBag, Plus, Search, Upload, TrendingUp, Clock, Calendar, RotateCcw, FileText } from 'lucide-react';

import PurchaseList from '../../components/purchases/PurchaseList';
import PurchaseFormModal from '../../components/purchases/PurchaseFormModal';
import PurchaseDetailModal from '../../components/purchases/PurchaseDetailModal';
import ReceivePurchaseModal from '../../components/purchases/ReceivePurchaseModal';
import DeleteConfirmModal from '../../components/common/DeleteConfirmModal/DeleteConfirmModal';

function formatINR(v: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);
}

type ActiveTab = 'orders' | 'returns' | 'debit-notes';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

const Purchases: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<ActiveTab>('orders');

  const [purchases, setPurchases] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [returns, setReturns] = useState<any[]>([]);
  const [returnsLoading, setReturnsLoading] = useState(false);
  const [debitNotes, setDebitNotes] = useState<any[]>([]);
  const [debitNotesLoading, setDebitNotesLoading] = useState(false);

  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [showFormModal, setShowFormModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<PurchaseOrder | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [purchasesData, suppliersData, productsResponse] = await Promise.all([
        purchaseService.getAllPurchases(),
        supplierService.getAllSuppliers(),
        productService.getAll({ limit: 1000 }),
      ]);
      setPurchases(purchasesData);
      setSuppliers(suppliersData);
      const productsData = productsResponse.results || productsResponse;
      setProducts(Array.isArray(productsData) ? productsData : []);
    } catch {
      dispatch(addNotification({ message: 'Failed to load purchase data', type: 'error' }));
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  const loadReturns = useCallback(async () => {
    try {
      setReturnsLoading(true);
      const d = await purchaseService.getPurchaseReturns();
      setReturns(d.results || d);
    } catch {
      dispatch(addNotification({ message: 'Failed to load returns', type: 'error' }));
    } finally {
      setReturnsLoading(false);
    }
  }, [dispatch]);

  const loadDebitNotes = useCallback(async () => {
    try {
      setDebitNotesLoading(true);
      const d = await purchaseService.getDebitNotes();
      setDebitNotes(d.results || d);
    } catch {
      dispatch(addNotification({ message: 'Failed to load debit notes', type: 'error' }));
    } finally {
      setDebitNotesLoading(false);
    }
  }, [dispatch]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (activeTab === 'returns') loadReturns();
    if (activeTab === 'debit-notes') loadDebitNotes();
  }, [activeTab, loadReturns, loadDebitNotes]);

  // Summary stats
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const stats = {
    total: purchases.length,
    pendingAmount: purchases
      .filter(p => p.payment_status === 'pending' || p.payment_status === 'partial')
      .reduce((sum, p) => sum + parseFloat(String(p.total_amount)), 0),
    thisMonth: purchases
      .filter(p => p.order_date?.startsWith(thisMonth))
      .reduce((sum, p) => sum + parseFloat(String(p.total_amount)), 0),
  };

  const filteredPurchases = purchases.filter(p => {
    if (statusFilter && p.status !== statusFilter) return false;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      if (!p.order_number.toLowerCase().includes(s) && !(p.supplier_name || '').toLowerCase().includes(s)) return false;
    }
    return true;
  });

  const handleCreate = () => { setSelectedPurchase(null); setShowFormModal(true); };
  const handleEdit = (p: PurchaseOrder) => { setSelectedPurchase(p); setShowFormModal(true); };
  const handleView = (p: PurchaseOrder) => { setSelectedPurchase(p); setShowDetailModal(true); };
  const handleReceive = (p: PurchaseOrder) => { setSelectedPurchase(p); setShowReceiveModal(true); };
  const handleDelete = (p: PurchaseOrder) => { setSelectedPurchase(p); setShowDeleteModal(true); };

  const onFormSubmit = async (data: PurchaseOrderCreate) => {
    try {
      setActionLoading(true);
      if (selectedPurchase) {
        await purchaseService.updatePurchase(selectedPurchase.id, data);
        dispatch(addNotification({ message: 'Purchase updated successfully', type: 'success' }));
      } else {
        await purchaseService.createPurchase(data);
        dispatch(addNotification({ message: 'Purchase created successfully', type: 'success' }));
      }
      setShowFormModal(false);
      loadData();
    } catch (error: any) {
      dispatch(addNotification({ message: error.response?.data?.message || 'Operation failed', type: 'error' }));
    } finally {
      setActionLoading(false);
    }
  };

  const onReceiveConfirm = async (
    items: { id: number; received_quantity: number }[],
    updateStock: boolean,
    payment: { payment_status: string; payment_method: string } | null,
  ) => {
    if (!selectedPurchase) return;
    try {
      setActionLoading(true);
      const updated = await purchaseService.receivePurchase(selectedPurchase.id, items, updateStock, payment);
      const stockNote = updateStock ? ' — stock updated' : '';
      const payNote = payment ? ` · payment ${payment.payment_status}` : '';
      const msg = updated.status === 'received'
        ? `Purchase fully received${stockNote}${payNote}`
        : `Partial receipt recorded${stockNote}${payNote}`;
      dispatch(addNotification({ message: msg, type: 'success' }));
      setShowReceiveModal(false);
      loadData();
    } catch (error: any) {
      dispatch(addNotification({ message: error.response?.data?.error || 'Failed to receive purchase', type: 'error' }));
    } finally {
      setActionLoading(false);
    }
  };

  const onDeleteConfirm = async () => {
    if (!selectedPurchase) return;
    try {
      setActionLoading(true);
      await purchaseService.deletePurchase(selectedPurchase.id);
      dispatch(addNotification({ message: 'Purchase deleted successfully', type: 'success' }));
      setShowDeleteModal(false);
      loadData();
    } catch (error: any) {
      dispatch(addNotification({ message: error.response?.data?.message || 'Failed to delete purchase', type: 'error' }));
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-header-icon">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <h1>Purchases</h1>
            <p>Manage purchase orders and stock intake</p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start">
          <button className="btn btn-outline-primary flex items-center gap-1.5" onClick={() => navigate('/purchases/import-invoice')}>
            <Upload className="w-4 h-4" /> Import Invoice
          </button>
          <button className="btn btn-primary" onClick={handleCreate}>
            <Plus className="w-4 h-4 inline mr-1.5" /> New Purchase
          </button>
        </div>
      </div>

      {/* Stats cards */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="section-card flex items-center gap-4 !p-4">
            <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <div className="text-xs text-gray-400 uppercase tracking-wide font-medium">Total Orders</div>
              <div className="text-2xl font-bold text-gray-800">{stats.total}</div>
            </div>
          </div>

          <div className="section-card flex items-center gap-4 !p-4">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="text-xs text-gray-400 uppercase tracking-wide font-medium">Pending Payment</div>
              <div className="text-2xl font-bold text-gray-800">{formatINR(stats.pendingAmount)}</div>
            </div>
          </div>

          <div className="section-card flex items-center gap-4 !p-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <div className="text-xs text-gray-400 uppercase tracking-wide font-medium">This Month</div>
              <div className="text-2xl font-bold text-gray-800">{formatINR(stats.thisMonth)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {([
          { key: 'orders', label: 'Purchase Orders', icon: <ShoppingBag className="w-4 h-4" /> },
          { key: 'returns', label: 'Returns', icon: <RotateCcw className="w-4 h-4" /> },
          { key: 'debit-notes', label: 'Debit Notes', icon: <FileText className="w-4 h-4" /> },
        ] as { key: ActiveTab; label: string; icon: React.ReactNode }[]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px
              ${activeTab === tab.key
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      {/* Purchase Orders tab */}
      {activeTab === 'orders' && (
        <>
          <div className="filter-bar">
            <div className="search-wrap flex-1 max-w-sm">
              <Search className="search-icon" />
              <input
                type="text"
                className="input-field"
                placeholder="Search by Order # or Supplier…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {([
                { value: '', label: 'All' },
                { value: 'draft', label: 'Draft' },
                { value: 'ordered', label: 'Ordered' },
                { value: 'partially_received', label: 'Partial' },
                { value: 'received', label: 'Received' },
                { value: 'cancelled', label: 'Cancelled' },
              ]).map(({ value, label }) => (
                <button
                  key={value || 'all'}
                  onClick={() => setStatusFilter(value)}
                  className={`filter-chip ${statusFilter === value ? 'active' : ''}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="section-card" style={{ height: 'calc(var(--viewport-height) - 380px)', display: 'flex', flexDirection: 'column' }}>
            <PurchaseList
              purchases={filteredPurchases}
              loading={loading}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onReceive={handleReceive}
              onView={handleView}
            />
          </div>
        </>
      )}

      {/* Returns tab */}
      {activeTab === 'returns' && (
        <div className="section-card" style={{ height: 'calc(var(--viewport-height) - 300px)', display: 'flex', flexDirection: 'column' }}>
          {returnsLoading ? (
            <div className="loading-center flex-1"><div className="spinner" /></div>
          ) : returns.length === 0 ? (
            <div className="empty-state flex-1">
              <div className="empty-state-icon"><RotateCcw className="w-6 h-6" /></div>
              <p className="text-gray-700 font-medium">No purchase returns yet</p>
              <p className="text-sm text-gray-400 mt-1">Returns will appear here after processing from a purchase order.</p>
            </div>
          ) : (
            <div className="flex-1 table-scroll">
              <table className="data-table">
                <thead><tr>
                  <th>Return #</th><th>PO #</th><th>Supplier</th><th>Date</th>
                  <th className="th-center">Status</th><th>Reason</th>
                </tr></thead>
                <tbody>
                  {returns.map((r: any) => (
                    <tr key={r.id}>
                      <td className="font-mono text-sm font-semibold text-primary-700">{r.return_number}</td>
                      <td className="font-mono text-sm text-gray-600">{r.purchase_order_number}</td>
                      <td className="font-semibold text-gray-800">{r.supplier}</td>
                      <td className="text-gray-500 text-sm">{formatDate(r.created_at)}</td>
                      <td className="td-center">
                        <span className="badge badge-success capitalize">{r.status}</span>
                      </td>
                      <td className="text-gray-500 text-sm max-w-xs truncate">{r.reason || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Debit Notes tab */}
      {activeTab === 'debit-notes' && (
        <div className="section-card" style={{ height: 'calc(var(--viewport-height) - 300px)', display: 'flex', flexDirection: 'column' }}>
          {debitNotesLoading ? (
            <div className="loading-center flex-1"><div className="spinner" /></div>
          ) : debitNotes.length === 0 ? (
            <div className="empty-state flex-1">
              <div className="empty-state-icon"><FileText className="w-6 h-6" /></div>
              <p className="text-gray-700 font-medium">No debit notes yet</p>
              <p className="text-sm text-gray-400 mt-1">Debit notes are auto-generated when a purchase return is processed.</p>
            </div>
          ) : (
            <div className="flex-1 table-scroll">
              <table className="data-table">
                <thead><tr>
                  <th>Debit Note #</th><th>Supplier</th><th>Date</th>
                  <th className="th-right">Subtotal</th><th className="th-right">GST</th><th className="th-right">Total</th>
                </tr></thead>
                <tbody>
                  {debitNotes.map((dn: any) => (
                    <tr key={dn.id}>
                      <td className="font-mono text-sm font-semibold text-primary-700">{dn.debit_note_number}</td>
                      <td className="font-semibold text-gray-800">{dn.supplier}</td>
                      <td className="text-gray-500 text-sm">{formatDate(dn.created_at)}</td>
                      <td className="td-right tabular-nums">{formatINR(parseFloat(dn.subtotal))}</td>
                      <td className="td-right tabular-nums text-gray-500">{formatINR(parseFloat(dn.gst_amount))}</td>
                      <td className="td-right tabular-nums font-bold text-gray-900">{formatINR(parseFloat(dn.total))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <PurchaseFormModal
        show={showFormModal}
        onHide={() => setShowFormModal(false)}
        onSubmit={onFormSubmit}
        purchase={selectedPurchase}
        suppliers={suppliers}
        products={products}
        loading={actionLoading}
      />

      <PurchaseDetailModal
        show={showDetailModal}
        onHide={() => setShowDetailModal(false)}
        purchase={selectedPurchase}
        onPaymentUpdated={(updated) => {
          setPurchases(prev => prev.map(p => p.id === updated.id ? updated : p));
          setSelectedPurchase(updated);
        }}
        onReturnProcessed={() => {
          loadData();
          loadReturns();
          loadDebitNotes();
        }}
      />

      <ReceivePurchaseModal
        show={showReceiveModal}
        onHide={() => setShowReceiveModal(false)}
        onConfirm={onReceiveConfirm}
        purchase={selectedPurchase}
        loading={actionLoading}
      />

      <DeleteConfirmModal
        show={showDeleteModal}
        onHide={() => setShowDeleteModal(false)}
        onConfirm={onDeleteConfirm}
        title="Delete Purchase Order"
        message={`Are you sure you want to delete order ${selectedPurchase?.order_number}? This will also remove all purchase line items.`}
        loading={actionLoading}
      />
    </div>
  );
};

export default Purchases;
