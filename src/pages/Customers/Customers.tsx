import React, { useState, useEffect, useCallback } from 'react';
import { useAppDispatch } from '@hooks/useRedux';
import { customerService } from '@api/services/customer.service';
import { addNotification } from '@store/slices/uiSlice';
import { Plus, Search, Edit, Trash2, Users, UserCheck, Mail, Phone, Receipt } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CustomerFormModal from '../../components/features/customers/CustomerFormModal';
import DeleteConfirmModal from '../../components/common/DeleteConfirmModal/DeleteConfirmModal';

interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: any;
  pincode: string;
  gstin: string;
  is_guest: boolean;
  outstanding_balance?: string;
  credit_limit?: string;
}

const Customers: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'registered' | 'guest'>('all');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [showFormModal, setShowFormModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {
        page: currentPage,
        page_size: pageSize
      };
      if (searchQuery) params.search = searchQuery;
      if (filterType === 'guest') params.is_guest = true;
      if (filterType === 'registered') params.is_guest = false;

      const data = await customerService.getAll(params);

      const results = data.results || data;
      const count = data.count || (Array.isArray(results) ? results.length : 0);

      setCustomers(Array.isArray(results) ? results : []);
      setTotalCount(count);
      setTotalPages(Math.ceil(count / pageSize));
    } catch (error) {
      console.error('Error fetching customers:', error);
      dispatch(addNotification({
        message: 'Failed to fetch customers',
        type: 'error',
      }));
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filterType, currentPage, pageSize, dispatch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCustomers();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchCustomers]);

  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [searchQuery, filterType, pageSize]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  };

  const handleSave = async (data: any) => {
    try {
      if (selectedCustomer) {
        await customerService.update(selectedCustomer.id, data);
        dispatch(addNotification({
          message: 'Customer updated successfully',
          type: 'success',
        }));
      } else {
        await customerService.create(data);
        dispatch(addNotification({
          message: 'Customer created successfully',
          type: 'success',
        }));
      }
      setShowFormModal(false);
      setSelectedCustomer(null);
      fetchCustomers();
    } catch (error: any) {
      dispatch(addNotification({
        message: error.response?.data?.message || 'Failed to save customer',
        type: 'error',
      }));
    }
  };

  const handleDelete = async () => {
    if (!selectedCustomer) return;

    try {
      await customerService.delete(selectedCustomer.id);
      dispatch(addNotification({
        message: 'Customer deleted successfully',
        type: 'success',
      }));
      setShowDeleteModal(false);
      setSelectedCustomer(null);
      fetchCustomers();
    } catch (error: any) {
      dispatch(addNotification({
        message: error.response?.data?.message || 'Failed to delete customer',
        type: 'error',
      }));
    }
  };

  const totalCustomers = totalCount;
  // Local counts for current page visuals since paginated backend does not provide aggregate counts per type easily
  const registeredCustomers = customers.filter(c => !c.is_guest).length;
  const guestCustomers = customers.filter(c => c.is_guest).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-header-icon">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1>Customers</h1>
            <p>Manage customer information and accounts</p>
          </div>
        </div>
        <button
          onClick={() => { setSelectedCustomer(null); setShowFormModal(true); }}
          className="btn btn-primary self-start"
        >
          <Plus className="w-4 h-4 inline mr-1.5" />
          Add Customer
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="stat-card-stripe accent-indigo" />
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="stat-card-label">Total Customers</p>
              <p className="stat-card-value">{totalCustomers}</p>
            </div>
            <div className="stat-card-icon bg-primary-100 text-primary-600">
              <Users className="w-5 h-5" />
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-stripe accent-emerald" />
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="stat-card-label">Registered</p>
              <p className="stat-card-value">{registeredCustomers}</p>
            </div>
            <div className="stat-card-icon bg-success-100 text-success-600">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-stripe accent-amber" />
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="stat-card-label">Guest</p>
              <p className="stat-card-value">{guestCustomers}</p>
            </div>
            <div className="stat-card-icon bg-warning-100 text-warning-600">
              <Users className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <div className="search-wrap flex-1 min-w-[200px]">
          <Search className="search-icon" />
          <input
            type="text"
            placeholder="Search by name, email, or phone…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(['all', 'registered', 'guest'] as const).map(t => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`filter-chip ${filterType === t ? 'active' : ''}`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Customers Table */}
      <div className="section-card flex flex-col" style={{ height: 'calc(100vh - 360px)', minHeight: '360px' }}>
        {loading ? (
          <div className="loading-center flex-1">
            <div className="spinner" />
            <span className="text-sm text-gray-500">Loading customers…</span>
          </div>
        ) : customers.length === 0 ? (
          <div className="empty-state flex-1">
            <div className="empty-state-icon">
              <Users className="w-6 h-6" />
            </div>
            <p className="text-gray-700 font-medium">No customers found</p>
            <p className="text-sm text-gray-400 mt-1 mb-4">Add your first customer to get started</p>
            <button onClick={() => setShowFormModal(true)} className="btn btn-primary text-sm">
              Add Customer
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Contact</th>
                    <th className="hidden md:table-cell">Location</th>
                    <th className="hidden lg:table-cell">GSTIN</th>
                    <th className="th-center">Type</th>
                    <th className="th-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer) => (
                    <tr key={customer.id}>
                      <td className="font-semibold text-gray-900">{customer.name}</td>
                      <td>
                        <div className="space-y-0.5">
                          {customer.email && (
                            <div className="flex items-center gap-1.5 text-xs text-gray-500">
                              <Mail className="w-3 h-3 flex-shrink-0" />{customer.email}
                            </div>
                          )}
                          {customer.phone && (
                            <div className="flex items-center gap-1.5 text-xs text-gray-500">
                              <Phone className="w-3 h-3 flex-shrink-0" />{customer.phone}
                            </div>
                          )}
                          {!customer.email && !customer.phone && <span className="text-gray-300 text-xs">—</span>}
                        </div>
                      </td>
                      <td className="text-sm text-gray-500 hidden md:table-cell">
                        {customer.city && customer.state
                          ? `${customer.city}, ${customer.state.name}`
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="text-xs font-mono text-gray-500 hidden lg:table-cell">
                        {customer.gstin || <span className="text-gray-300">—</span>}
                      </td>
                      <td className="td-center">
                        <span className={`badge ${customer.is_guest ? 'badge-warning' : 'badge-success'}`}>
                          {customer.is_guest ? 'Guest' : 'Registered'}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-1">
                          {!customer.is_guest && (
                            <button className="action-btn action-btn-success" onClick={() => navigate(`/customers/${customer.id}/ledger`)} title="Ledger">
                              <Receipt className="w-4 h-4" />
                            </button>
                          )}
                          <button className="action-btn action-btn-primary" onClick={() => { setSelectedCustomer(customer); setShowFormModal(true); }} title="Edit">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button className="action-btn action-btn-danger" onClick={() => { setSelectedCustomer(customer); setShowDeleteModal(true); }} title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalCount > 0 && (
              <div className="pagination-bar px-4 pb-3 shrink-0">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span>Show</span>
                  <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="input-field py-1 px-2 text-xs w-16">
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <span className="hidden sm:inline whitespace-nowrap">
                    {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, totalCount)} of {totalCount}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="pag-btn">‹</button>
                  {getPageNumbers().map((page, i) => (
                    <button key={i} onClick={() => typeof page === 'number' && handlePageChange(page)} disabled={page === '...'} className={`pag-btn ${page === currentPage ? 'active' : ''} ${page === '...' ? 'dots' : ''}`}>{page}</button>
                  ))}
                  <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="pag-btn">›</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Form Modal */}
      {showFormModal && (
        <CustomerFormModal
          customer={selectedCustomer}
          onClose={() => {
            setShowFormModal(false);
            setSelectedCustomer(null);
          }}
          onSave={handleSave}
        />
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        show={showDeleteModal}
        title="Delete Customer"
        message={selectedCustomer ? `Are you sure you want to delete "${selectedCustomer.name}"? This action cannot be undone.` : ''}
        onConfirm={handleDelete}
        onHide={() => {
          setShowDeleteModal(false);
          setSelectedCustomer(null);
        }}
      />
    </div>
  );
};

export default Customers;
