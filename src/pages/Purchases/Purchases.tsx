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
import { ShoppingBag, Plus, Search, Upload, TrendingUp, Clock, Calendar } from 'lucide-react';

import PurchaseList from '../../components/purchases/PurchaseList';
import PurchaseFormModal from '../../components/purchases/PurchaseFormModal';
import PurchaseDetailModal from '../../components/purchases/PurchaseDetailModal';
import ReceivePurchaseModal from '../../components/purchases/ReceivePurchaseModal';
import DeleteConfirmModal from '../../components/common/DeleteConfirmModal/DeleteConfirmModal';

function formatINR(v: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);
}

const Purchases: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const [purchases, setPurchases] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => { loadData(); }, [loadData]);

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

      {/* Filters */}
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

      {/* List */}
      <div className="section-card" style={{ height: 'calc(var(--viewport-height) - 340px)', display: 'flex', flexDirection: 'column' }}>
        <PurchaseList
          purchases={filteredPurchases}
          loading={loading}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onReceive={handleReceive}
          onView={handleView}
        />
      </div>

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
