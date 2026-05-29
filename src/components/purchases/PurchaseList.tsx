import React from 'react';
import { PurchaseOrder } from '../../types/purchase.types';
import { Edit2, Trash2, Eye, CheckCircle, Inbox } from 'lucide-react';

interface PurchaseListProps {
  purchases: PurchaseOrder[];
  loading: boolean;
  onEdit: (purchase: PurchaseOrder) => void;
  onDelete: (purchase: PurchaseOrder) => void;
  onReceive: (purchase: PurchaseOrder) => void;
  onView: (purchase: PurchaseOrder) => void;
}

const PurchaseList: React.FC<PurchaseListProps> = ({
  purchases,
  loading,
  onEdit,
  onDelete,
  onReceive,
  onView,
}) => {
  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (purchases.length === 0) {
    return (
      <div className="text-center py-12">
        <Inbox className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">No purchase orders found</p>
      </div>
    );
  }

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'received': return 'badge-success';
      case 'ordered': return 'badge-info';
      case 'partially_received': return 'badge-warning';
      case 'cancelled': return 'badge-danger';
      default: return 'badge-secondary';
    }
  };

  const getStatusLabel = (status: string) => {
    if (status === 'partially_received') return 'Partial';
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <div className="table-container flex-1 overflow-auto">
      <table className="table">
        <thead>
          <tr>
            <th>Order #</th>
            <th>Date</th>
            <th>Supplier</th>
            <th>Status</th>
            <th>Items</th>
            <th>Total Amount</th>
            <th>Created By</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {purchases.map((purchase) => (
            <tr key={purchase.id}>
              <td>
                <strong>{purchase.order_number}</strong>
              </td>
              <td>{new Date(purchase.order_date).toLocaleDateString()}</td>
              <td>{purchase.supplier_name || `Supplier #${purchase.supplier}`}</td>
              <td>
                <span className={`badge ${getStatusBadgeClass(purchase.status)}`}>
                  {getStatusLabel(purchase.status)}
                </span>
              </td>
              <td>{purchase.items.length} items</td>
              <td>
                <strong>₹{parseFloat(String(purchase.total_amount)).toFixed(2)}</strong>
              </td>
              <td>User #{purchase.created_by}</td> {/* Ideally we'd have a user name here */}
              <td>
                <div className="flex gap-2">
                  <button
                    className="btn btn-outline-secondary text-sm"
                    onClick={() => onView(purchase)}
                    title="View Details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>

                  {purchase.status === 'draft' && (
                    <button
                      className="btn btn-outline-primary text-sm"
                      onClick={() => onEdit(purchase)}
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}

                  {(purchase.status === 'ordered' || purchase.status === 'partially_received') && (
                     <button
                       className="btn btn-outline-success text-sm"
                       onClick={() => onReceive(purchase)}
                       title={purchase.status === 'partially_received' ? 'Receive Remaining' : 'Receive Order'}
                     >
                       <CheckCircle className="w-4 h-4" />
                     </button>
                  )}

                  {purchase.status === 'draft' && (
                    <button
                      className="btn btn-outline-danger text-sm"
                      onClick={() => onDelete(purchase)}
                      title="Delete"
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
  );
};

export default PurchaseList;
