import React, { useState, useEffect, useCallback } from 'react';
import { useAppDispatch } from '@hooks/useRedux';
import { addNotification } from '@store/slices/uiSlice';
import { accountingService } from '@api/services/accounting.service';
import { BookOpen, Plus, Trash2 } from 'lucide-react';
import DeleteConfirmModal from '../../components/common/DeleteConfirmModal/DeleteConfirmModal';
import Modal from '../../components/common/Modal/Modal';

const TYPE_COLORS: Record<string, string> = {
  asset: 'badge-success', liability: 'badge-danger',
  income: 'badge-info', expense: 'badge-warning', equity: 'badge-primary',
};

const ACCOUNT_TYPES = ['asset', 'liability', 'income', 'expense', 'equity'];

const ChartOfAccounts: React.FC = () => {
  const dispatch = useAppDispatch();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selected, setSelected] = useState<any>(null);

  // Add account form
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [accountType, setAccountType] = useState('asset');
  const [parentId, setParentId] = useState('');
  const [description, setDescription] = useState('');

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      const data = await accountingService.getAccounts(filterType ? { type: filterType } : {});
      setAccounts(Array.isArray(data) ? data : data.results || []);
    } catch {
      dispatch(addNotification({ message: 'Failed to load accounts', type: 'error' }));
    } finally { setLoading(false); }
  }, [filterType, dispatch]);

  useEffect(() => { fetch(); }, [fetch]);

  const resetForm = () => { setCode(''); setName(''); setAccountType('asset'); setParentId(''); setDescription(''); };

  const handleAdd = async () => {
    if (!code.trim()) { dispatch(addNotification({ message: 'Enter an account code', type: 'error' })); return; }
    if (!name.trim()) { dispatch(addNotification({ message: 'Enter an account name', type: 'error' })); return; }
    setSaving(true);
    try {
      await accountingService.createAccount({
        code: code.trim(),
        name: name.trim(),
        account_type: accountType,
        parent_id: parentId ? parseInt(parentId) : null,
        description: description.trim(),
      });
      dispatch(addNotification({ message: 'Account created', type: 'success' }));
      setShowAddModal(false);
      resetForm();
      fetch();
    } catch (e: any) {
      dispatch(addNotification({ message: e?.response?.data?.error || 'Failed to create account', type: 'error' }));
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!selected) return;
    try {
      await accountingService.deleteAccount(selected.id);
      dispatch(addNotification({ message: 'Account deleted', type: 'success' }));
      setShowDeleteModal(false);
      fetch();
    } catch (e: any) {
      dispatch(addNotification({ message: e?.response?.data?.error || 'Failed to delete', type: 'error' }));
    }
  };

  // Accounts of same type for parent selection
  const parentOptions = accounts.filter(a => a.account_type === accountType);

  return (
    <div className="space-y-4">
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-header-icon"><BookOpen className="w-5 h-5" /></div>
          <div><h1>Chart of Accounts</h1><p>Manage your account ledger structure</p></div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 inline mr-1.5" />Add Account
        </button>
      </div>

      <div className="filter-bar">
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setFilterType('')} className={`filter-chip ${filterType === '' ? 'active' : ''}`}>All</button>
          {ACCOUNT_TYPES.map(t => (
            <button key={t} onClick={() => setFilterType(t)} className={`filter-chip capitalize ${filterType === t ? 'active' : ''}`}>{t}</button>
          ))}
        </div>
      </div>

      <div className="section-card flex flex-col" style={{ height: 'calc(var(--viewport-height) - 280px)', minHeight: '300px' }}>
        {loading ? (
          <div className="loading-center flex-1"><div className="spinner" /></div>
        ) : accounts.length === 0 ? (
          <div className="empty-state flex-1">
            <div className="empty-state-icon"><BookOpen className="w-6 h-6" /></div>
            <p className="text-gray-700 font-medium">No accounts found</p>
            <p className="text-sm text-gray-400 mt-1 mb-4">
              Run <code className="text-xs bg-gray-100 px-1 rounded">python manage.py seed_chart_of_accounts</code> to seed standard accounts, or add one manually.
            </p>
            <button onClick={() => setShowAddModal(true)} className="btn btn-primary text-sm">Add Account</button>
          </div>
        ) : (
          <div className="flex-1 table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th className="th-center">Type</th>
                  <th className="hidden md:table-cell">Description</th>
                  <th className="th-center">System</th>
                  <th className="th-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map(a => (
                  <tr key={a.id}>
                    <td className="font-mono font-semibold text-sm">{a.code}</td>
                    <td className="font-medium">{a.name}</td>
                    <td className="td-center">
                      <span className={`badge capitalize ${TYPE_COLORS[a.account_type] || 'badge-secondary'}`}>{a.account_type}</span>
                    </td>
                    <td className="text-sm text-gray-500 hidden md:table-cell">{a.description || '—'}</td>
                    <td className="td-center">{a.is_system ? <span className="text-xs text-gray-400">System</span> : '—'}</td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        {!a.is_system && (
                          <button
                            className="action-btn action-btn-danger"
                            title="Delete"
                            onClick={() => { setSelected(a); setShowDeleteModal(true); }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Account Modal */}
      <Modal show={showAddModal} onHide={() => { setShowAddModal(false); resetForm(); }} title="Add Account">
        <div className="space-y-4 p-1">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Account Code *</label>
              <input
                className="input-field w-full"
                placeholder="e.g. 1006"
                value={code}
                onChange={e => setCode(e.target.value)}
                maxLength={10}
              />
              <p className="text-xs text-gray-400 mt-1">Must be unique within your company</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Account Name *</label>
              <input
                className="input-field w-full"
                placeholder="e.g. Petty Cash"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
              <select
                className="input-field w-full"
                value={accountType}
                onChange={e => { setAccountType(e.target.value); setParentId(''); }}
              >
                {ACCOUNT_TYPES.map(t => (
                  <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Parent Account</label>
              <select className="input-field w-full" value={parentId} onChange={e => setParentId(e.target.value)}>
                <option value="">None (top-level)</option>
                {parentOptions.map(a => (
                  <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input
              className="input-field w-full"
              placeholder="Optional description"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => { setShowAddModal(false); resetForm(); }} className="btn btn-outline-secondary">Cancel</button>
            <button onClick={handleAdd} disabled={saving} className="btn btn-primary">
              {saving ? 'Saving…' : 'Add Account'}
            </button>
          </div>
        </div>
      </Modal>

      {showDeleteModal && selected && (
        <DeleteConfirmModal
          show={showDeleteModal}
          title="Delete Account"
          message={`Delete account ${selected.code} — ${selected.name}? This cannot be undone.`}
          onConfirm={handleDelete}
          onHide={() => { setShowDeleteModal(false); setSelected(null); }}
        />
      )}
    </div>
  );
};

export default ChartOfAccounts;
