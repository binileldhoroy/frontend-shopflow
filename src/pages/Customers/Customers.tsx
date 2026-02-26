import React, { useState, useEffect } from 'react';
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
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const data = await customerService.getAll();
      setCustomers(data);
    } catch (error) {
      console.error('Error fetching customers:', error);
      dispatch(addNotification({
        message: 'Failed to fetch customers',
        type: 'error',
      }));
    } finally {
      setLoading(false);
    }
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

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.phone?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter = filterType === 'all' ||
      (filterType === 'registered' && !customer.is_guest) ||
      (filterType === 'guest' && customer.is_guest);

    return matchesSearch && matchesFilter;
  });

  const totalCustomers = filteredCustomers.length;
  const registeredCustomers = filteredCustomers.filter(c => !c.is_guest).length;
  const guestCustomers = filteredCustomers.filter(c => c.is_guest).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-7 h-7 text-primary-600" />
            Customers
          </h1>
          <p className="text-gray-600 mt-1">Manage customer information</p>
        </div>
        <button
          onClick={() => {
            setSelectedCustomer(null);
            setShowFormModal(true);
          }}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Customer
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Customers</p>
              <p className="text-2xl font-bold text-gray-900">{totalCustomers}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-success-100 rounded-lg flex items-center justify-center">
              <UserCheck className="w-6 h-6 text-success-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Registered</p>
              <p className="text-2xl font-bold text-gray-900">{registeredCustomers}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-warning-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-warning-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Guest</p>
              <p className="text-2xl font-bold text-gray-900">{guestCustomers}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFilterType('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterType === 'all'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterType('registered')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterType === 'registered'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Registered
            </button>
            <button
              onClick={() => setFilterType('guest')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterType === 'guest'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Guest
            </button>
          </div>
        </div>
      </div>

      {/* Customers Table */}
      <div className="card">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <p className="text-gray-600 mt-4">Loading customers...</p>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">No customers found</p>
            <button
              onClick={() => setShowFormModal(true)}
              className="btn btn-primary"
            >
              Add Your First Customer
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Name</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Contact</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Location</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">GSTIN</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-700">Type</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900">{customer.name}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        {customer.email && (
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <Mail className="w-3 h-3" />
                            {customer.email}
                          </div>
                        )}
                        {customer.phone && (
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <Phone className="w-3 h-3" />
                            {customer.phone}
                          </div>
                        )}
                        {!customer.email && !customer.phone && <span className="text-gray-400">-</span>}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {customer.city && customer.state ? (
                        <div>
                          {customer.city}, {customer.state.name}
                          {customer.pincode && ` - ${customer.pincode}`}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {customer.gstin || <span className="text-gray-400">-</span>}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`badge ${
                          customer.is_guest ? 'badge-warning' : 'badge-success'
                        }`}
                      >
                        {customer.is_guest ? (
                          <>
                            <Users className="w-3 h-3" />
                            Guest
                          </>
                        ) : (
                          <>
                            <UserCheck className="w-3 h-3" />
                            Registered
                          </>
                        )}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-2">
                        {!customer.is_guest && (
                          <button
                            onClick={() => navigate(`/customers/${customer.id}/ledger`)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Credit Ledger"
                          >
                            <Receipt className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setSelectedCustomer(customer);
                            setShowFormModal(true);
                          }}
                          className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedCustomer(customer);
                            setShowDeleteModal(true);
                          }}
                          className="p-2 text-danger-600 hover:bg-danger-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
