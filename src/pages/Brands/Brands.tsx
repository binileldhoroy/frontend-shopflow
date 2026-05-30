import React, { useState, useEffect } from 'react';
import { useAppDispatch } from '@hooks/useRedux';
import { brandService } from '@api/services/brand.service';
import { addNotification } from '@store/slices/uiSlice';
import { Plus, Search, Edit2, Trash2, Tag } from 'lucide-react';
import Modal from '@components/common/Modal/Modal';
import DeleteConfirmModal from '@components/common/DeleteConfirmModal/DeleteConfirmModal';
import { Brand } from '../../types/product.types';

interface BrandFormData {
  name: string;
  is_active: boolean;
}

const Brands: React.FC = () => {
  const dispatch = useAppDispatch();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formData, setFormData] = useState<BrandFormData>({ name: '', is_active: true });

  useEffect(() => { fetchBrands(); }, []);

  const fetchBrands = async () => {
    try {
      setLoading(true);
      const data = await brandService.getAll();
      setBrands(data);
    } catch {
      dispatch(addNotification({ message: 'Failed to fetch brands', type: 'error' }));
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    setSelectedBrand(null);
    setFormData({ name: '', is_active: true });
    setShowFormModal(true);
  };

  const openEdit = (brand: Brand) => {
    setSelectedBrand(brand);
    setFormData({ name: brand.name, is_active: brand.is_active });
    setShowFormModal(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setFormLoading(true);
      if (selectedBrand) {
        await brandService.update(selectedBrand.id, formData);
        dispatch(addNotification({ message: 'Brand updated', type: 'success' }));
      } else {
        await brandService.create(formData);
        dispatch(addNotification({ message: 'Brand created', type: 'success' }));
      }
      setShowFormModal(false);
      fetchBrands();
    } catch {
      dispatch(addNotification({ message: 'Operation failed', type: 'error' }));
    } finally {
      setFormLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedBrand) return;
    try {
      setFormLoading(true);
      await brandService.delete(selectedBrand.id);
      dispatch(addNotification({ message: 'Brand deleted', type: 'success' }));
      setShowDeleteModal(false);
      fetchBrands();
    } catch (error: any) {
      const msg = error.response?.data?.error || error.response?.data?.message || 'Failed to delete brand';
      dispatch(addNotification({ message: msg, type: 'error' }));
      if (error.response?.status !== 409) {
        setShowDeleteModal(false);
      }
    } finally {
      setFormLoading(false);
    }
  };

  const filtered = brands.filter(b => b.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-header-icon">
            <Tag className="w-5 h-5" />
          </div>
          <div>
            <h1>Brands</h1>
            <p>Manage product brands and manufacturers</p>
          </div>
        </div>
        <button className="btn btn-primary self-start" onClick={openAdd}>
          <Plus className="w-4 h-4 inline mr-1.5" />
          Add Brand
        </button>
      </div>

      <div className="filter-bar !py-3 !px-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search brands…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-gray-400 bg-white text-gray-700"
          />
        </div>
        <span className="text-sm text-gray-500 ml-auto">{filtered.length} brand{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="section-card">
        {loading ? (
          <div className="loading-center p-12">
            <div className="spinner" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state p-12">
            <p className="text-gray-500">No brands found</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th className="th-center">Status</th>
                <th className="th-center">Created</th>
                <th className="th-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(brand => (
                <tr key={brand.id}>
                  <td className="font-medium text-gray-800">{brand.name}</td>
                  <td className="td-center">
                    <span className={`badge ${brand.is_active ? 'badge-success' : 'badge-warning'}`}>
                      {brand.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="td-center text-gray-500 text-sm">
                    {new Date(brand.created_at).toLocaleDateString()}
                  </td>
                  <td>
                    <div className="flex items-center justify-end gap-1">
                      <button className="action-btn action-btn-primary" onClick={() => openEdit(brand)} title="Edit">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button className="action-btn action-btn-danger" onClick={() => { setSelectedBrand(brand); setShowDeleteModal(true); }} title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        show={showFormModal}
        onHide={() => setShowFormModal(false)}
        title={selectedBrand ? 'Edit Brand' : 'Add Brand'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowFormModal(false)} disabled={formLoading}>Cancel</button>
            <button className="btn btn-primary" onClick={handleFormSubmit} disabled={formLoading}>
              {formLoading ? 'Saving…' : 'Save'}
            </button>
          </>
        }
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div>
            <label className="label">Brand Name *</label>
            <input
              type="text"
              className="input-field"
              value={formData.name}
              onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="brand_active"
              checked={formData.is_active}
              onChange={e => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
              className="w-4 h-4 text-primary-600 rounded"
            />
            <label htmlFor="brand_active" className="text-sm text-gray-700">Active</label>
          </div>
        </form>
      </Modal>

      <DeleteConfirmModal
        show={showDeleteModal}
        onHide={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Brand"
        message={`Are you sure you want to delete "${selectedBrand?.name}"?`}
        loading={formLoading}
      />
    </div>
  );
};

export default Brands;
