import React, { useState, useEffect, useCallback } from 'react';
import { supplierService } from '../../api/services/supplier.service';
import { Supplier, SupplierFormData } from '../../types/supplier.types';
import { useAppDispatch } from '../../hooks/useRedux';
import { addNotification } from '../../store/slices/uiSlice';
import { Truck, Plus, Search } from 'lucide-react';

import SupplierList from '../../components/suppliers/SupplierList';
import SupplierFormModal from '../../components/suppliers/SupplierFormModal';

const Suppliers: React.FC = () => {
  const dispatch = useAppDispatch();

  // Data States
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal States
  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await supplierService.getAllSuppliers();
      setSuppliers(data);
    } catch (error: any) {
      dispatch(addNotification({
        message: 'Failed to load suppliers',
        type: 'error',
      }));
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtered Suppliers
  const filteredSuppliers = suppliers.filter(s => {
    if (statusFilter === 'active' && !s.is_active) return false;
    if (statusFilter === 'inactive' && s.is_active) return false;

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const nameMatch = s.name.toLowerCase().includes(search);
      const phoneMatch = s.phone.includes(search);
      const emailMatch = (s.email || '').toLowerCase().includes(search);
      if (!nameMatch && !phoneMatch && !emailMatch) return false;
    }

    return true;
  });

  const handleCreate = () => {
    setSelectedSupplier(null);
    setShowFormModal(true);
  };

  const handleEdit = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setShowFormModal(true);
  };

  const onFormSubmit = async (data: SupplierFormData) => {
    try {
      setActionLoading(true);
      if (selectedSupplier) {
        await supplierService.updateSupplier(selectedSupplier.id, data);
        dispatch(addNotification({ message: 'Supplier updated successfully', type: 'success' }));
      } else {
        await supplierService.createSupplier(data);
        dispatch(addNotification({ message: 'Supplier created successfully', type: 'success' }));
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-header-icon">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h1>Suppliers</h1>
            <p>Manage product suppliers and vendors</p>
          </div>
        </div>
        <button className="btn btn-primary self-start" onClick={handleCreate}>
          <Plus className="w-4 h-4 inline mr-1.5" />
          Add Supplier
        </button>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <div className="search-wrap flex-1 max-w-md">
          <Search className="search-icon" />
          <input type="text" className="input-field" placeholder="Search suppliers…" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <div className="flex gap-2">
          {(['', 'active', 'inactive'] as const).map(v => (
            <button key={v || 'all'} onClick={() => setStatusFilter(v)} className={`filter-chip ${statusFilter === v ? 'active' : ''}`}>
              {v === '' ? 'All' : v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="section-card" style={{ height: 'calc(100vh - 250px)', display: 'flex', flexDirection: 'column' }}>
        <SupplierList
          suppliers={filteredSuppliers}
          loading={loading}
          onEdit={handleEdit}
        />
      </div>

      {/* Modals */}
      <SupplierFormModal
        show={showFormModal}
        onHide={() => setShowFormModal(false)}
        onSubmit={onFormSubmit}
        supplier={selectedSupplier}
        loading={actionLoading}
      />
    </div>
  );
};

export default Suppliers;
