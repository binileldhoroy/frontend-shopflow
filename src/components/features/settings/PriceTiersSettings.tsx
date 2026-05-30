import React, { useEffect, useState } from 'react';
import { priceTierService, PriceTier } from '@api/services/priceTier.service';
import { Plus, Trash2, Edit2, Check, X, Tag } from 'lucide-react';
import { addNotification } from '@store/slices/uiSlice';
import { useAppDispatch } from '@hooks/useRedux';
import DeleteConfirmModal from '@components/common/DeleteConfirmModal/DeleteConfirmModal';

const PriceTiersSettings: React.FC = () => {
  const dispatch = useAppDispatch();
  const [tiers, setTiers] = useState<PriceTier[]>([]);
  const [loading, setLoading] = useState(true);

  // Create State
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPercentage, setNewPercentage] = useState('');

  // Edit State
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editPercentage, setEditPercentage] = useState('');

  // Delete State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingTierId, setDeletingTierId] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchTiers = async () => {
    try {
      setLoading(true);
      const data = await priceTierService.getAllTiers();
      setTiers(data);
    } catch (error) {
      dispatch(addNotification({ message: 'Failed to load price tiers', type: 'error' }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTiers();
  }, []);

  const handleCreate = async () => {
    if (!newName) {
        dispatch(addNotification({ message: 'Name is required', type: 'error' }));
        return;
    }

    try {
      if(!isCreating) {
          setIsCreating(true);
          return;
      }

      await priceTierService.createTier({
        name: newName,
        default_percentage: parseFloat(newPercentage) || 0,
        is_active: true
      });

      dispatch(addNotification({ message: 'Price tier created', type: 'success' }));
      setIsCreating(false);
      setNewName('');
      setNewPercentage('');
      fetchTiers();
    } catch (error) {
      dispatch(addNotification({ message: 'Failed to create tier', type: 'error' }));
    }
  };

  const startEdit = (tier: PriceTier) => {
    setEditingId(tier.id);
    setEditName(tier.name);
    setEditPercentage(tier.default_percentage?.toString() || '0');
  };

  const handleUpdate = async () => {
    if (!editingId || !editName) return;

    try {
      await priceTierService.updateTier(editingId, {
        name: editName,
        default_percentage: parseFloat(editPercentage) || 0
      });

      dispatch(addNotification({ message: 'Price tier updated', type: 'success' }));
      setEditingId(null);
      fetchTiers();
    } catch (error) {
      dispatch(addNotification({ message: 'Failed to update tier', type: 'error' }));
    }
  };

  const openDeleteConfirm = (id: number) => {
    setDeletingTierId(id);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingTierId) return;
    try {
      setDeleteLoading(true);
      await priceTierService.deleteTier(deletingTierId);
      dispatch(addNotification({ message: 'Price tier deleted', type: 'success' }));
      setTiers(prev => prev.filter(t => t.id !== deletingTierId));
      setShowDeleteModal(false);
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Failed to delete tier';
      dispatch(addNotification({ message: msg, type: 'error' }));
    } finally {
      setDeleteLoading(false);
      setDeletingTierId(null);
    }
  };

  const cancelEdit = () => {
      setEditingId(null);
      setEditName('');
      setEditPercentage('');
  };

  const cancelCreate = () => {
      setIsCreating(false);
      setNewName('');
      setNewPercentage('');
  };

  return (
    <div className="card max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
           <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
             <Tag className="w-6 h-6 text-primary-600" />
             Price Tiers
           </h2>
           <p className="text-sm text-gray-500 mt-1">
             Manage customer pricing groups and default adjustments.
           </p>
        </div>

        {!isCreating && (
          <button
             onClick={() => setIsCreating(true)}
             className="btn btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add New Tier
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading tiers...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="py-3 px-4 font-semibold text-gray-700">Tier Name</th>
                <th className="py-3 px-4 font-semibold text-gray-700">Default Adj. (%)</th>
                <th className="py-3 px-4 font-semibold text-gray-700 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {/* Create Row */}
              {isCreating && (
                <tr className="bg-primary-50">
                   <td className="p-4">
                      <input
                         type="text"
                         className="input-field py-1"
                         placeholder="e.g. Wholesaler"
                         value={newName}
                         onChange={e => setNewName(e.target.value)}
                         autoFocus
                      />
                   </td>
                   <td className="p-4">
                      <div className="flex items-center gap-2">
                        <input
                           type="number"
                           className="input-field py-1 w-24"
                           placeholder="0"
                           value={newPercentage}
                           onChange={e => setNewPercentage(e.target.value)}
                        />
                        <span className="text-sm text-gray-500">%</span>
                      </div>
                      <span className="text-xs text-gray-400">Positive for surcharge, Negative for discount</span>
                   </td>
                   <td className="p-4 text-right">
                       <div className="flex justify-end gap-2">
                           <button onClick={handleCreate} className="btn btn-primary py-1 px-3 text-sm">Save</button>
                           <button onClick={cancelCreate} className="btn btn-secondary py-1 px-3 text-sm">Cancel</button>
                       </div>
                   </td>
                </tr>
              )}

              {/* List Rows */}
              {tiers.map(tier => (
                <tr key={tier.id} className="hover:bg-gray-50 group">
                   <td className="p-4">
                      {editingId === tier.id ? (
                          <input
                             type="text"
                             className="input-field py-1"
                             value={editName}
                             onChange={e => setEditName(e.target.value)}
                          />
                      ) : (
                          <span className="font-medium">{tier.name}</span>
                      )}
                   </td>
                   <td className="p-4">
                      {editingId === tier.id ? (
                           <input
                             type="number"
                             className="input-field py-1 w-24"
                             value={editPercentage}
                             onChange={e => setEditPercentage(e.target.value)}
                          />
                      ) : (
                          <span className={tier.default_percentage > 0 ? 'text-warning-600' : tier.default_percentage < 0 ? 'text-success-600' : 'text-gray-600'}>
                             {tier.default_percentage > 0 ? '+' : ''}{tier.default_percentage}%
                          </span>
                      )}
                   </td>
                   <td className="p-4 text-right">
                      {editingId === tier.id ? (
                          <div className="flex justify-end gap-2">
                             <button onClick={handleUpdate} className="text-success-600 hover:bg-success-50 p-1 rounded"><Check className="w-5 h-5"/></button>
                             <button onClick={cancelEdit} className="text-gray-500 hover:bg-gray-100 p-1 rounded"><X className="w-5 h-5"/></button>
                          </div>
                      ) : (
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                             <button onClick={() => startEdit(tier)} className="text-primary-600 hover:bg-primary-50 p-1 rounded">
                                <Edit2 className="w-4 h-4" />
                             </button>
                             <button onClick={() => openDeleteConfirm(tier.id)} className="text-danger-600 hover:bg-danger-50 p-1 rounded">
                                <Trash2 className="w-4 h-4" />
                             </button>
                          </div>
                      )}
                   </td>
                </tr>
              ))}

              {!isCreating && tiers.length === 0 && (
                  <tr>
                      <td colSpan={3} className="text-center py-8 text-gray-400">
                          No price tiers found. Create one to get started.
                      </td>
                  </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <DeleteConfirmModal
        show={showDeleteModal}
        title="Delete Price Tier"
        message="Are you sure? This will also remove all product pricing rules for this tier."
        onConfirm={handleConfirmDelete}
        onHide={() => { setShowDeleteModal(false); setDeletingTierId(null); }}
        loading={deleteLoading}
      />
    </div>
  );
};

export default PriceTiersSettings;
