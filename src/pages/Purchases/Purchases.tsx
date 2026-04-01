import React, { useState, useEffect, useCallback } from 'react';
import { purchaseService } from '../../api/services/purchase.service';
import { supplierService } from '../../api/services/supplier.service';
import { productService } from '../../api/services/product.service';
import { PurchaseOrder, PurchaseOrderCreate } from '../../types/purchase.types';
import { Supplier } from '../../types/supplier.types';
import { Product } from '../../types/product.types';
import { useAppDispatch } from '../../hooks/useRedux';
import { addNotification } from '../../store/slices/uiSlice';
import { ShoppingBag, Plus, Search } from 'lucide-react';

import PurchaseList from '../../components/purchases/PurchaseList';
import PurchaseFormModal from '../../components/purchases/PurchaseFormModal';
import PurchaseDetailModal from '../../components/purchases/PurchaseDetailModal';
import ReceivePurchaseModal from '../../components/purchases/ReceivePurchaseModal';
import DeleteConfirmModal from '../../components/common/DeleteConfirmModal/DeleteConfirmModal';

const Purchases: React.FC = () => {
  const dispatch = useAppDispatch();

  // Data States
  const [purchases, setPurchases] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal States
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
        productService.getAll({ limit: 1000 }), // Get all products for dropdown
      ]);

      setPurchases(purchasesData);
      setSuppliers(suppliersData);
      // Products response might be paginated
      const productsData = productsResponse.results || productsResponse;
      setProducts(Array.isArray(productsData) ? productsData : []);

    } catch (error: any) {
      dispatch(addNotification({
        message: 'Failed to load purchase data',
        type: 'error',
      }));
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtered Purchases
  const filteredPurchases = purchases.filter(p => {
    if (statusFilter && p.status !== statusFilter) return false;

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const orderMatch = p.order_number.toLowerCase().includes(search);
      const supplierMatch = (p.supplier_name || '').toLowerCase().includes(search);
      if (!orderMatch && !supplierMatch) return false;
    }

    return true;
  });

  // Handlers
  const handleCreate = () => {
    setSelectedPurchase(null);
    setShowFormModal(true);
  };

  const handleEdit = (purchase: PurchaseOrder) => {
    setSelectedPurchase(purchase);
    setShowFormModal(true);
  };

  const handleView = (purchase: PurchaseOrder) => {
    setSelectedPurchase(purchase);
    setShowDetailModal(true);
  };

  const handleReceive = (purchase: PurchaseOrder) => {
    setSelectedPurchase(purchase);
    setShowReceiveModal(true);
  };

  const handleDelete = (purchase: PurchaseOrder) => {
    setSelectedPurchase(purchase);
    setShowDeleteModal(true);
  };

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
      dispatch(addNotification({
        message: error.response?.data?.message || 'Operation failed',
        type: 'error',
      }));
    } finally {
      setActionLoading(false);
    }
  };

  const onReceiveConfirm = async () => {
    if (!selectedPurchase) return;
    try {
      setActionLoading(true);
      await purchaseService.receivePurchase(selectedPurchase.id);
      dispatch(addNotification({ message: 'Purchase received and stock updated', type: 'success' }));
      setShowReceiveModal(false);
      loadData();
    } catch (error: any) {
      dispatch(addNotification({
        message: error.response?.data?.message || 'Failed to receive purchase',
        type: 'error',
      }));
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
      dispatch(addNotification({
        message: error.response?.data?.message || 'Failed to delete purchase',
        type: 'error',
      }));
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
        <button className="btn btn-primary self-start" onClick={handleCreate}>
          <Plus className="w-4 h-4 inline mr-1.5" />
          New Purchase
        </button>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <div className="search-wrap flex-1 max-w-sm">
          <Search className="search-icon" />
          <input type="text" className="input-field" placeholder="Search by Order # or Supplier…" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <div className="flex gap-2 flex-wrap">
          {([
            { value: '', label: 'All' },
            { value: 'draft', label: 'Draft' },
            { value: 'ordered', label: 'Ordered' },
            { value: 'received', label: 'Received' },
            { value: 'cancelled', label: 'Cancelled' },
          ]).map(({ value, label }) => (
            <button key={value || 'all'} onClick={() => setStatusFilter(value)} className={`filter-chip ${statusFilter === value ? 'active' : ''}`}>{label}</button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="section-card" style={{ height: 'calc(100vh - 260px)', display: 'flex', flexDirection: 'column' }}>
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
        message={`Are you sure you want to delete order ${selectedPurchase?.order_number}?`}
        loading={actionLoading}
      />
    </div>
  );
};

export default Purchases;
