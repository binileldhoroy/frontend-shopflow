import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@hooks/useRedux';
import { fetchBranches, addBranchToList, updateBranchInList } from '@store/slices/branchSlice';
import { branchService } from '@api/services/branchService';
import { Branch, BranchFormData } from '../../types/branch.types';
import { GitBranch, Plus, Pencil, X, Check, Users, MapPin, Phone } from 'lucide-react';

const Branches: React.FC = () => {
  const dispatch = useAppDispatch();
  const { branches, loading } = useAppSelector((state) => state.branch);
  const maxBranches = useAppSelector(
    (state) => state.company.currentCompany?.features?.max_branches ?? 1
  );

  const [showForm, setShowForm] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<BranchFormData>({
    name: '',
    address_line1: '',
    city: '',
    state: '',
    pincode: '',
    phone: '',
    email: '',
  });

  useEffect(() => {
    dispatch(fetchBranches());
  }, [dispatch]);

  const openCreate = () => {
    setEditingBranch(null);
    setForm({ name: '', address_line1: '', city: '', state: '', pincode: '', phone: '', email: '' });
    setError(null);
    setShowForm(true);
  };

  const openEdit = (branch: Branch) => {
    setEditingBranch(branch);
    setForm({
      name: branch.name,
      address_line1: branch.address_line1,
      city: branch.city,
      state: branch.state,
      pincode: branch.pincode,
      phone: branch.phone,
      email: branch.email,
    });
    setError(null);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      if (editingBranch) {
        const updated = await branchService.update(editingBranch.id, form);
        dispatch(updateBranchInList(updated));
      } else {
        const created = await branchService.create(form);
        dispatch(addBranchToList(created));
      }
      setShowForm(false);
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.name?.[0] || 'Failed to save branch.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (branch: Branch) => {
    if (!window.confirm(`Deactivate branch "${branch.name}"?`)) return;
    try {
      await branchService.deactivate(branch.id);
      dispatch(updateBranchInList({ ...branch, is_active: false }));
    } catch {
      alert('Failed to deactivate branch.');
    }
  };

  const handleActivate = async (branch: Branch) => {
    if (!canCreate && !branch.is_active) {
      alert(`Branch limit (${maxBranches}) reached. Deactivate another branch first.`);
      return;
    }
    try {
      const updated = await branchService.activate(branch.id);
      dispatch(updateBranchInList(updated));
    } catch {
      alert('Failed to activate branch.');
    }
  };

  const activeBranches = branches.filter((b) => b.is_active);
  const canCreate = activeBranches.length < maxBranches;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <GitBranch className="w-6 h-6 text-[#0d9158]" />
            Branches
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {activeBranches.length} / {maxBranches} branches used
          </p>
        </div>
        <button
          onClick={openCreate}
          disabled={!canCreate}
          title={!canCreate ? `Branch limit (${maxBranches}) reached` : undefined}
          className="flex items-center gap-2 px-4 py-2 bg-[#0d9158] text-white rounded-lg text-sm font-medium hover:bg-[#0b7d4d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
          Add Branch
        </button>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingBranch ? 'Edit Branch' : 'New Branch'}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
              {error && (
                <div className="px-4 py-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Branch Name *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Main Store"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0d9158]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0d9158]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pincode</label>
                  <input
                    type="text"
                    value={form.pincode}
                    onChange={(e) => setForm({ ...form, pincode: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0d9158]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input
                  type="text"
                  value={form.address_line1}
                  onChange={(e) => setForm({ ...form, address_line1: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0d9158]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0d9158]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0d9158]"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#0d9158] text-white rounded-lg text-sm font-medium hover:bg-[#0b7d4d] transition-colors disabled:opacity-60"
                >
                  {saving ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  {editingBranch ? 'Save Changes' : 'Create Branch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Branch list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-[#0d9158] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : branches.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <GitBranch className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No branches yet</p>
          <p className="text-sm mt-1">Create your first branch to get started.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {branches.map((branch) => (
            <div
              key={branch.id}
              className={`bg-white rounded-xl border p-5 shadow-sm transition-all ${
                branch.is_active ? 'border-gray-200 hover:shadow-md' : 'border-gray-100 opacity-50'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#0d9158]/10 flex items-center justify-center">
                    <GitBranch className="w-4 h-4 text-[#0d9158]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm">{branch.name}</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      branch.is_active
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {branch.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1">
                  {branch.is_active ? (
                    <>
                      <button
                        onClick={() => openEdit(branch)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                        title="Edit branch"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeactivate(branch)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Deactivate branch"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleActivate(branch)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                      title="Activate branch"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-1.5 text-sm text-gray-500">
                {branch.city && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{branch.city}{branch.pincode ? ` - ${branch.pincode}` : ''}</span>
                  </div>
                )}
                {branch.phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{branch.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{branch.user_count} staff assigned</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Branches;
