import React, { useState, useEffect } from 'react';
import { useAppDispatch } from '@hooks/useRedux';
import { userService, UserCreateData } from '@api/services/user.service';
import { User, UserRole } from '../../types/auth.types';
import { addNotification } from '@store/slices/uiSlice';
import { Users as UsersIcon, Plus, Trash2, Search, Mail, Phone, Shield } from 'lucide-react';
import Modal from '../../components/common/Modal/Modal';
import DeleteConfirmModal from '../../components/common/DeleteConfirmModal/DeleteConfirmModal';

const Users: React.FC = () => {
  const dispatch = useAppDispatch();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Form state
  // We initialize with empty strings. Note: company is optional/handled by backend typically
  const [formData, setFormData] = useState<UserCreateData>({
    username: '',
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    role: UserRole.CASHIER,
    phone: '',
    password_confirm: '',
  });
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await userService.getAll();
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
      dispatch(addNotification({
        message: 'Failed to fetch users',
        type: 'error',
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      password: '',
      first_name: '',
      last_name: '',
      role: UserRole.CASHIER,
      phone: '',
      password_confirm: '',
    });
    setFormLoading(false);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.password_confirm) {
      dispatch(addNotification({
        message: 'Passwords do not match',
        type: 'error',
      }));
      return;
    }

    try {
      setFormLoading(true);
      await userService.create(formData);
      dispatch(addNotification({
        message: 'User created successfully',
        type: 'success',
      }));
      setShowAddModal(false);
      resetForm();
      fetchUsers();
    } catch (error: any) {
      console.error('Error creating user:', error);
      // Try to extract useful error message if possible
      const msg = error.response?.data?.username ? `Username: ${error.response.data.username[0]}` :
                  error.response?.data?.message || 'Failed to create user';
      dispatch(addNotification({
        message: msg,
        type: 'error',
      }));
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      setFormLoading(true);
      await userService.delete(selectedUser.id);
      dispatch(addNotification({
        message: 'User deleted successfully',
        type: 'success',
      }));
      setShowDeleteModal(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      dispatch(addNotification({
        message: 'Failed to delete user',
        type: 'error',
      }));
    } finally {
      setFormLoading(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case UserRole.ADMIN: return 'bg-purple-100 text-purple-800';
      case UserRole.MANAGER: return 'bg-blue-100 text-blue-800';
      case UserRole.CASHIER: return 'bg-green-100 text-green-800';
      case UserRole.INVENTORY_STAFF: return 'bg-yellow-100 text-yellow-800';
      case UserRole.SUPER_USER: return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleLabel = (role: string) => {
    return role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-header-icon">
            <UsersIcon className="w-5 h-5" />
          </div>
          <div>
            <h1>Users</h1>
            <p>Manage system users and access roles</p>
          </div>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn btn-primary self-start">
          <Plus className="w-4 h-4 inline mr-1.5" />
          Add User
        </button>
      </div>

      {/* Search */}
      <div className="filter-bar">
        <div className="search-wrap flex-1 max-w-md">
          <Search className="search-icon" />
          <input type="text" placeholder="Search users…" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="input-field" />
        </div>
        <span className="text-sm text-gray-500 ml-auto">{filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
             // Loading skeleton
             Array.from({ length: 6 }).map((_, i) => (
               <div key={i} className="card animate-pulse h-48">
                 <div className="flex items-center gap-4 mb-4">
                   <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                   <div className="space-y-2">
                     <div className="h-4 w-24 bg-gray-200 rounded"></div>
                     <div className="h-3 w-16 bg-gray-200 rounded"></div>
                   </div>
                 </div>
                 <div className="space-y-2">
                   <div className="h-3 w-full bg-gray-200 rounded"></div>
                   <div className="h-3 w-3/4 bg-gray-200 rounded"></div>
                 </div>
               </div>
             ))
        ) : filteredUsers.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <UsersIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">No users found</p>
          </div>
        ) : (
          filteredUsers.map((user) => (
            <div key={user.id} className="card hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold text-lg">
                    {user.first_name?.[0]?.toUpperCase() || user.username[0]?.toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {user.first_name} {user.last_name}
                    </h3>
                    <p className="text-sm text-gray-500">@{user.username}</p>
                  </div>
                </div>
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                  {getRoleLabel(user.role)}
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="w-4 h-4" />
                  <span>{user.email}</span>
                </div>
                {user.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="w-4 h-4" />
                    <span>{user.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Shield className="w-4 h-4" />
                  <span>{user.is_active ? 'Active' : 'Inactive'}</span>
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-gray-100">
                <button
                  onClick={() => {
                      setSelectedUser(user);
                      setShowDeleteModal(true);
                  }}
                  className="p-2 text-danger-600 hover:bg-danger-50 rounded-lg transition-colors"
                  title="Delete User"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add User Modal */}
      <Modal
        show={showAddModal}
        onHide={() => setShowAddModal(false)}
        title="Add New User"
        size="md"
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">First Name</label>
              <input
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleInputChange}
                required
                className="input-field"
              />
            </div>
            <div>
              <label className="label">Last Name</label>
              <input
                type="text"
                name="last_name"
                value={formData.last_name}
                onChange={handleInputChange}
                required
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="label">Username</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              required
              className="input-field"
            />
          </div>

          <div>
             <label className="label">Email</label>
             <input
               type="email"
               name="email"
               value={formData.email}
               onChange={handleInputChange}
               required
               className="input-field"
             />
          </div>

          <div>
             <label className="label">Phone</label>
             <input
               type="tel"
               name="phone"
               value={formData.phone}
               onChange={handleInputChange}
               className="input-field"
             />
          </div>

          <div>
            <label className="label">Role</label>
            <select
              name="role"
              value={formData.role}
              onChange={handleInputChange}
              className="input-field"
            >
              <option value={UserRole.ADMIN}>Admin</option>
              <option value={UserRole.MANAGER}>Manager</option>
              <option value={UserRole.CASHIER}>Cashier</option>
              <option value={UserRole.INVENTORY_STAFF}>Inventory Staff</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">Super User role cannot be assigned.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                required
                className="input-field"
                minLength={8}
              />
            </div>
            <div>
              <label className="label">Confirm Password</label>
              <input
                type="password"
                name="password_confirm"
                value={formData.password_confirm}
                onChange={handleInputChange}
                required
                className="input-field"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-6">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formLoading}
              className="btn btn-primary"
            >
              {formLoading ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        show={showDeleteModal}
        title="Delete User"
        message={`Are you sure you want to delete user ${selectedUser?.username}? This action cannot be undone.`}
        onConfirm={handleDeleteUser}
        onHide={() => setShowDeleteModal(false)}
        loading={formLoading}
      />
    </div>
  );
};

export default Users;
