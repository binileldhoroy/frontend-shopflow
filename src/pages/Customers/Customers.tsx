import React, { useState, useEffect, useCallback } from 'react';
import { useAppDispatch } from '@hooks/useRedux';
import { customerService } from '@api/services/customer.service';
import { stateService } from '@api/services/state.service';
import { documentService } from '@api/services/document.service';
import { addNotification } from '@store/slices/uiSlice';
import { Plus, Search, Edit, Trash2, Users, UserCheck, Mail, Phone, Receipt, FileSpreadsheet, MessageCircle, MapPin, X, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CustomerFormModal from '../../components/features/customers/CustomerFormModal';
import DeleteConfirmModal from '../../components/common/DeleteConfirmModal/DeleteConfirmModal';
import PhoneInput from '../../components/common/PhoneInput/PhoneInput';
import { StateMaster } from '../../types/state.types';
import { CustomerShippingAddress } from '../../types/invoice.types';

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
  const [showShippingModal, setShowShippingModal] = useState(false);
  const [shippingCustomer, setShippingCustomer] = useState<Customer | null>(null);

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
        <div className="flex items-center gap-2">
          <ExportDropdown
            onExport={async (fmt) => {
              try {
                const resp = await documentService.exportData('customers', { format: fmt });
                const url = window.URL.createObjectURL(new Blob([resp.data]));
                const a = document.createElement('a');
                a.href = url;
                a.download = `customers_export.${fmt === 'excel' ? 'xlsx' : 'csv'}`;
                document.body.appendChild(a); a.click(); document.body.removeChild(a);
              } catch { dispatch(addNotification({ message: 'Export failed', type: 'error' })); }
            }}
          />
          <button
            onClick={() => { setSelectedCustomer(null); setShowFormModal(true); }}
            className="btn btn-primary self-start"
          >
            <Plus className="w-4 h-4 inline mr-1.5" />
            Add Customer
          </button>
        </div>
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
      <div className="section-card flex flex-col" style={{ height: 'calc(var(--viewport-height) - 360px)', minHeight: '360px' }}>
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
                    <th className="hidden xl:table-cell th-right">Outstanding</th>
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
                      <td className="hidden xl:table-cell td-right text-sm">
                        {parseFloat(customer.outstanding_balance || '0') > 0 ? (
                          <span className="text-red-600 font-semibold">
                            ₹{parseFloat(customer.outstanding_balance || '0').toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="td-center">
                        <span className={`badge ${customer.is_guest ? 'badge-warning' : 'badge-success'}`}>
                          {customer.is_guest ? 'Guest' : 'Registered'}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-1">
                          {customer.phone && (
                            <a
                              href={`https://wa.me/91${customer.phone.replace(/\D/g, '').slice(-10)}?text=${encodeURIComponent(`Hi ${customer.name},`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="action-btn"
                              title="WhatsApp"
                              style={{ color: '#25D366' }}
                            >
                              <MessageCircle className="w-4 h-4" />
                            </a>
                          )}
                          {!customer.is_guest && (
                            <button className="action-btn action-btn-success" onClick={() => navigate(`/customers/${customer.id}/ledger`)} title="Ledger">
                              <Receipt className="w-4 h-4" />
                            </button>
                          )}
                          {!customer.is_guest && (
                            <button className="action-btn" onClick={() => { setShippingCustomer(customer); setShowShippingModal(true); }} title="Shipping Addresses" style={{ color: '#6366f1' }}>
                              <MapPin className="w-4 h-4" />
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
        message={selectedCustomer ? `Are you sure you want to delete "${selectedCustomer.name}"? This will also remove their ledger history.` : ''}
        onConfirm={handleDelete}
        onHide={() => {
          setShowDeleteModal(false);
          setSelectedCustomer(null);
        }}
      />

      {/* Shipping Addresses Modal */}
      {showShippingModal && shippingCustomer && (
        <ShippingAddressesModal
          customer={shippingCustomer}
          onClose={() => { setShowShippingModal(false); setShippingCustomer(null); }}
        />
      )}
    </div>
  );
};

// ─── Shipping Addresses Modal ─────────────────────────────────────────────────

interface ShippingAddressesModalProps {
  customer: { id: number; name: string };
  onClose: () => void;
}

const emptyAddrForm = {
  label: '',
  contact_name: '',
  address_line1: '',
  address_line2: '',
  city: '',
  state: '' as string | number,
  pincode: '',
  phone_country_code: '91',
  phone: '',
  is_default: false,
};

const ShippingAddressesModal: React.FC<ShippingAddressesModalProps> = ({ customer, onClose }) => {
  const [addresses, setAddresses] = useState<CustomerShippingAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [states, setStates] = useState<StateMaster[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingAddr, setEditingAddr] = useState<CustomerShippingAddress | null>(null);
  const [form, setForm] = useState({ ...emptyAddrForm });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([
      customerService.getShippingAddresses(customer.id),
      stateService.getAll(),
    ]).then(([addrs, sts]) => {
      setAddresses(addrs);
      setStates(sts);
    }).finally(() => setLoading(false));
  }, [customer.id]);

  const openNew = () => { setEditingAddr(null); setForm({ ...emptyAddrForm }); setShowForm(true); };
  const openEdit = (addr: CustomerShippingAddress) => {
    setEditingAddr(addr);
    setForm({
      label: addr.label,
      contact_name: addr.contact_name,
      address_line1: addr.address_line1,
      address_line2: addr.address_line2,
      city: addr.city,
      state: addr.state ?? '',
      pincode: addr.pincode,
      phone_country_code: addr.phone_country_code || '91',
      phone: addr.phone,
      is_default: addr.is_default,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.address_line1.trim() || !form.city.trim()) return;
    setSaving(true);
    try {
      const payload = { ...form, state: form.state || null };
      if (editingAddr) {
        const updated = await customerService.updateShippingAddress(customer.id, editingAddr.id, payload);
        setAddresses(prev => prev.map(a => a.id === editingAddr.id ? updated : (updated.is_default ? { ...a, is_default: false } : a)));
      } else {
        const created = await customerService.createShippingAddress(customer.id, payload);
        setAddresses(prev => {
          const base = created.is_default ? prev.map(a => ({ ...a, is_default: false })) : prev;
          return [...base, created];
        });
      }
      setShowForm(false);
    } catch {
      // error silently — user can retry
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await customerService.deleteShippingAddress(customer.id, id);
      setAddresses(prev => prev.filter(a => a.id !== id));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-indigo-500" />
            <h2 className="font-semibold text-gray-900 text-sm">Shipping Addresses — {customer.name}</h2>
          </div>
          <div className="flex items-center gap-2">
            {!showForm && (
              <button onClick={openNew} className="btn btn-primary text-xs px-3 py-1.5 flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Add Address
              </button>
            )}
            <button onClick={onClose} className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Add / Edit Form */}
          {showForm && (
            <div className="border border-indigo-100 bg-indigo-50/40 rounded-lg p-4 space-y-3">
              <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">{editingAddr ? 'Edit Address' : 'New Address'}</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Label</label>
                  <input placeholder="e.g. Warehouse" value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-300" />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Contact Name</label>
                  <input placeholder="Recipient name" value={form.contact_name} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-300" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-gray-600 mb-1">Address Line 1 <span className="text-red-500">*</span></label>
                  <input placeholder="Street address" value={form.address_line1} onChange={e => setForm(f => ({ ...f, address_line1: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-300" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-gray-600 mb-1">Address Line 2</label>
                  <input placeholder="Area, landmark…" value={form.address_line2} onChange={e => setForm(f => ({ ...f, address_line2: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-300" />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">City <span className="text-red-500">*</span></label>
                  <input placeholder="City" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-300" />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Pincode</label>
                  <input placeholder="123456" maxLength={6} value={form.pincode} onChange={e => setForm(f => ({ ...f, pincode: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-300" />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">State</label>
                  <select value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value ? Number(e.target.value) : '' }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-300">
                    <option value="">Select state</option>
                    {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Phone</label>
                  <PhoneInput
                    phone={form.phone}
                    countryCode={form.phone_country_code}
                    onPhoneChange={v => setForm(f => ({ ...f, phone: v }))}
                    onCountryCodeChange={v => setForm(f => ({ ...f, phone_country_code: v }))}
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input type="checkbox" checked={form.is_default} onChange={e => setForm(f => ({ ...f, is_default: e.target.checked }))}
                  className="rounded border-gray-300" />
                Set as default shipping address
              </label>
              <div className="flex justify-end gap-2 pt-1">
                <button onClick={() => setShowForm(false)} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                <button onClick={handleSave} disabled={saving || !form.address_line1.trim() || !form.city.trim()}
                  className="px-4 py-1.5 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40">
                  {saving ? 'Saving…' : (editingAddr ? 'Update' : 'Add')}
                </button>
              </div>
            </div>
          )}

          {/* Addresses List */}
          {loading ? (
            <div className="py-8 text-center text-sm text-gray-400">
              <div className="w-5 h-5 border-2 border-gray-200 border-t-indigo-500 rounded-full animate-spin mx-auto mb-2" />Loading…
            </div>
          ) : addresses.length === 0 && !showForm ? (
            <div className="py-10 text-center text-sm text-gray-400">
              <MapPin className="w-8 h-8 mx-auto mb-2 text-gray-200" />
              <p>No shipping addresses yet.</p>
              <button onClick={openNew} className="mt-3 text-indigo-600 hover:underline text-xs">Add one now</button>
            </div>
          ) : (
            <div className="space-y-2">
              {addresses.map(addr => (
                <div key={addr.id} className={`border rounded-lg p-3.5 ${addr.is_default ? 'border-indigo-200 bg-indigo-50/50' : 'border-gray-100 bg-white'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {addr.label && <span className="text-xs font-semibold text-gray-700">{addr.label}</span>}
                        {addr.is_default && (
                          <span className="flex items-center gap-0.5 text-xs text-indigo-600 font-medium">
                            <Star className="w-3 h-3 fill-indigo-500 text-indigo-500" /> Default
                          </span>
                        )}
                      </div>
                      {addr.contact_name && <p className="text-sm text-gray-800 font-medium">{addr.contact_name}</p>}
                      <p className="text-sm text-gray-600">{addr.address_line1}{addr.address_line2 ? `, ${addr.address_line2}` : ''}</p>
                      <p className="text-sm text-gray-500">{[addr.city, addr.state_name, addr.pincode].filter(Boolean).join(', ')}</p>
                      {addr.phone && <p className="text-xs text-gray-400 mt-0.5">+{addr.phone_country_code || '91'} {addr.phone}</p>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => openEdit(addr)} className="action-btn action-btn-primary" title="Edit"><Edit className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDelete(addr.id)} disabled={deletingId === addr.id} className="action-btn action-btn-danger" title="Delete">
                        {deletingId === addr.id ? <div className="w-3.5 h-3.5 border-2 border-red-300 border-t-red-600 rounded-full animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ExportDropdown = ({ onExport }: { onExport: (fmt: 'csv' | 'excel') => void }) => {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen(v => !v)} className="btn btn-secondary flex items-center gap-2 text-sm">
        <FileSpreadsheet className="w-4 h-4" /> Export
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-100 z-10 w-36 py-1">
          <button onClick={() => { onExport('csv'); setOpen(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50">CSV</button>
          <button onClick={() => { onExport('excel'); setOpen(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50">Excel (.xlsx)</button>
        </div>
      )}
    </div>
  );
};

export default Customers;
