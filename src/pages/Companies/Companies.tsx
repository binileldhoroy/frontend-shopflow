import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@hooks/useRedux';
import { fetchAllCompanies } from '@store/slices/companySlice';
import { companyService } from '@api/services/company.service';
import { Company } from '../../types/company.types';
import CompanyFormModal from '@components/features/companies/CompanyFormModal';
import DeleteConfirmModal from '@components/common/DeleteConfirmModal/DeleteConfirmModal';
import { addNotification } from '@store/slices/uiSlice';
import { Building2, Plus, Search, Mail, Phone, MapPin, Edit2, Trash2, Play, Pause, Inbox } from 'lucide-react';

const Companies: React.FC = () => {
  const dispatch = useAppDispatch();
  const { companies, loading: reduxLoading } = useAppSelector(state => state.company);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal states
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    dispatch(fetchAllCompanies());
  }, [dispatch]);

  const handleAddCompany = () => {
    setSelectedCompany(null);
    setShowFormModal(true);
  };

  const handleEditCompany = (company: Company) => {
    setSelectedCompany(company);
    setShowFormModal(true);
  };

  const handleDeleteCompany = (company: Company) => {
    setSelectedCompany(company);
    setShowDeleteModal(true);
  };

  const handleToggleStatus = async (company: Company) => {
    try {
      const formData = new FormData();
      formData.append('is_active', (!company.is_active).toString());

      await companyService.update(company.id, formData as any);
      dispatch(addNotification({
        message: `Company ${company.is_active ? 'deactivated' : 'activated'} successfully`,
        type: 'success',
      }));
      dispatch(fetchAllCompanies());
    } catch (error: any) {
      const errorMessage = error.response?.data?.message
        || error.response?.data?.error
        || error.message
        || 'Failed to update company status';

      dispatch(addNotification({
        message: errorMessage,
        type: 'error',
      }));
    }
  };

  const handleFormSubmit = async (data: FormData) => {
    try {
      setFormLoading(true);

      if (selectedCompany) {
        // Update
        await companyService.update(selectedCompany.id, data as any);
        dispatch(addNotification({
          message: 'Company updated successfully',
          type: 'success',
        }));
      } else {
        // Create
        console.log('Creating new company...');
        await companyService.create(data as any);
        dispatch(addNotification({
          message: 'Company created successfully',
          type: 'success',
        }));
      }

      setShowFormModal(false);
      dispatch(fetchAllCompanies());
    } catch (error: any) {
      console.error('Company operation error:', error);
      console.error('Error response:', error.response);

      const data = error.response?.data;
      let errorMessage = 'Operation failed';
      if (data) {
        if (typeof data === 'string') {
          errorMessage = data;
        } else if (data.message) {
          errorMessage = data.message;
        } else if (data.error) {
          errorMessage = data.error;
        } else if (data.detail) {
          errorMessage = data.detail;
        } else if (typeof data === 'object') {
          // Django field-level validation errors: { field: ["msg", ...], ... }
          const messages = Object.entries(data)
            .map(([field, msgs]) => {
              const label = field.replace(/_/g, ' ');
              const text = Array.isArray(msgs) ? msgs.join(', ') : String(msgs);
              return `${label.charAt(0).toUpperCase() + label.slice(1)}: ${text}`;
            })
            .join(' | ');
          errorMessage = messages || 'Operation failed';
        }
      }

      dispatch(addNotification({
        message: errorMessage,
        type: 'error',
      }));
    } finally {
      setFormLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedCompany) return;

    try {
      setFormLoading(true);
      await companyService.deactivate(selectedCompany.id);
      dispatch(addNotification({
        message: 'Company deleted successfully',
        type: 'success',
      }));
      setShowDeleteModal(false);
      dispatch(fetchAllCompanies());
    } catch (error: any) {
      const errorMessage = error.response?.data?.message
        || error.response?.data?.error
        || error.message
        || 'Failed to delete company';

      dispatch(addNotification({
        message: errorMessage,
        type: 'error',
      }));
    } finally {
      setFormLoading(false);
    }
  };

  const filteredCompanies = companies.filter(company => {
    const matchesSearch = company.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         company.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         company.city.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = !statusFilter ||
                         (statusFilter === 'active' && company.is_active) ||
                         (statusFilter === 'inactive' && !company.is_active);

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-header-icon">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h1>Companies</h1>
            <p>Manage all companies in the system</p>
          </div>
        </div>
        <button className="btn btn-primary self-start" onClick={handleAddCompany}>
          <Plus className="w-4 h-4 inline mr-1.5" />
          Add Company
        </button>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <div className="search-wrap flex-1 max-w-md">
          <Search className="search-icon" />
          <input
            type="text"
            className="input-field"
            placeholder="Search companies…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {(['', 'active', 'inactive'] as const).map(v => (
            <button key={v || 'all'} onClick={() => setStatusFilter(v)} className={`filter-chip ${statusFilter === v ? 'active' : ''}`}>
              {v === '' ? 'All' : v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
        <span className="text-sm text-gray-500 ml-auto whitespace-nowrap">
          {filteredCompanies.length} compan{filteredCompanies.length !== 1 ? 'ies' : 'y'}
        </span>
      </div>

      {/* Companies Grid */}
      {reduxLoading ? (
        <div className="loading-center py-20">
          <div className="spinner" />
        </div>
      ) : filteredCompanies.length === 0 ? (
        <div className="empty-state py-20">
          <div className="empty-state-icon"><Inbox className="w-6 h-6" /></div>
          <p className="text-gray-700 font-medium">No companies found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCompanies.map(company => (
            <div key={company.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3 mb-4">
                {company.logo ? (
                  <img
                    src={company.logo}
                    alt={company.company_name}
                    className="w-12 h-12 object-cover rounded-lg"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      const fallback = e.currentTarget.nextElementSibling;
                      if (fallback) fallback.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <div className={`w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0 ${company.logo ? 'hidden' : ''}`}>
                  <Building2 className="w-6 h-6 text-primary-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h5 className="font-semibold text-gray-900 truncate">{company.company_name}</h5>
                  <span className={`badge ${company.is_active ? 'badge-success' : 'badge-secondary'} mt-1`}>
                    {company.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5 mb-4">
                <p className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{company.email}</span>
                </p>
                <p className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="w-4 h-4 flex-shrink-0" />
                  {company.phone}
                </p>
                <p className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="w-4 h-4 flex-shrink-0" />
                  {company.city}, {company.state}
                </p>
              </div>

              <div className="flex gap-2 pt-3 border-t border-gray-100">
                <button
                  className="btn btn-outline-primary text-sm flex-1"
                  onClick={() => handleEditCompany(company)}
                >
                  <Edit2 className="w-4 h-4 inline mr-1" />Edit
                </button>
                <button
                  className={`btn text-sm flex-1 ${company.is_active ? 'btn-outline-warning' : 'btn-outline-success'}`}
                  onClick={() => handleToggleStatus(company)}
                >
                  {company.is_active ? (
                    <><Pause className="w-4 h-4 inline mr-1" />Deactivate</>
                  ) : (
                    <><Play className="w-4 h-4 inline mr-1" />Activate</>
                  )}
                </button>
                <button
                  className="action-btn action-btn-danger"
                  onClick={() => handleDeleteCompany(company)}
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <CompanyFormModal
        show={showFormModal}
        onHide={() => setShowFormModal(false)}
        onSubmit={handleFormSubmit}
        company={selectedCompany}
        loading={formLoading}
      />

      <DeleteConfirmModal
        show={showDeleteModal}
        onHide={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Company"
        message={`Are you sure you want to delete "${selectedCompany?.company_name}"? This will also delete all associated data including users, products, and transactions. This action cannot be undone.`}
        loading={formLoading}
      />
    </div>
  );
};

export default Companies;
