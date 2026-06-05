import React from 'react';
import { PurchaseOrder } from '../../types/purchase.types';
import { Edit2, Trash2, Eye, Inbox, PackageCheck } from 'lucide-react';

interface PurchaseListProps {
  purchases: PurchaseOrder[];
  loading: boolean;
  onEdit: (purchase: PurchaseOrder) => void;
  onDelete: (purchase: PurchaseOrder) => void;
  onReceive: (purchase: PurchaseOrder) => void;
  onView: (purchase: PurchaseOrder) => void;
}

const STATUS_CONFIG: Record<string, { badge: string; label: string }> = {
  received:           { badge: 'badge-success',   label: 'Received' },
  ordered:            { badge: 'badge-info',       label: 'Ordered' },
  partially_received: { badge: 'badge-warning',    label: 'Partial' },
  cancelled:          { badge: 'badge-danger',     label: 'Cancelled' },
  draft:              { badge: 'badge-secondary',  label: 'Draft' },
};

const PAYMENT_DOT: Record<string, string> = {
  paid:    'bg-green-500',
  pending: 'bg-amber-400',
  partial: 'bg-blue-400',
};

function formatINR(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(num);
}

function supplierInitial(name?: string): string {
  if (!name) return '?';
  const words = name.trim().split(/\s+/);
  return words.length >= 2
    ? (words[0][0] + words[1][0]).toUpperCase()
    : words[0].slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = [
  'bg-violet-100 text-violet-700',
  'bg-blue-100 text-blue-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-cyan-100 text-cyan-700',
];

function avatarColor(name?: string): string {
  if (!name) return AVATAR_COLORS[0];
  const code = [...name].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
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
        <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (purchases.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <Inbox className="w-8 h-8 text-gray-400" />
        </div>
        <p className="text-gray-600 font-medium">No purchase orders found</p>
        <p className="text-sm text-gray-400 mt-1">Create your first order or import an invoice</p>
      </div>
    );
  }

  return (
    <div className="table-container flex-1 overflow-auto">
      <table className="table">
        <thead>
          <tr>
            <th>Order #</th>
            <th>Supplier</th>
            <th>Date</th>
            <th>Status</th>
            <th>Items</th>
            <th className="text-right">Amount</th>
            <th className="text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {purchases.map((purchase) => {
            const { badge, label } = STATUS_CONFIG[purchase.status] ?? STATUS_CONFIG.draft;
            const supplierName = purchase.supplier_name || `Supplier #${purchase.supplier}`;
            const paymentDot = PAYMENT_DOT[purchase.payment_status] ?? 'bg-gray-300';

            return (
              <tr
                key={purchase.id}
                className="hover:bg-gray-50/70 cursor-pointer transition-colors"
                onClick={() => onView(purchase)}
              >
                <td onClick={(e) => e.stopPropagation()}>
                  <button
                    className="font-semibold text-primary-700 hover:underline text-sm"
                    onClick={() => onView(purchase)}
                  >
                    {purchase.order_number}
                  </button>
                </td>

                <td>
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${avatarColor(supplierName)}`}
                    >
                      {supplierInitial(supplierName)}
                    </div>
                    <span className="text-sm font-medium text-gray-800">{supplierName}</span>
                  </div>
                </td>

                <td className="text-sm text-gray-600 whitespace-nowrap">
                  {new Date(purchase.order_date).toLocaleDateString('en-IN', {
                    day: '2-digit', month: 'short', year: 'numeric',
                  })}
                </td>

                <td>
                  <span className={`badge ${badge} text-xs`}>{label}</span>
                </td>

                <td className="text-sm text-gray-500">
                  {purchase.items.length} {purchase.items.length === 1 ? 'item' : 'items'}
                </td>

                <td className="text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${paymentDot}`}
                      title={`Payment: ${purchase.payment_status}`}
                    />
                    <span className="font-semibold text-gray-800 text-sm tabular-nums">
                      {formatINR(purchase.total_amount)}
                    </span>
                  </div>
                </td>

                <td onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-center gap-1">
                    <button
                      className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                      onClick={() => onView(purchase)}
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    {purchase.status === 'draft' && (
                      <button
                        className="p-1.5 rounded-md text-primary-500 hover:bg-primary-50 hover:text-primary-700 transition-colors"
                        onClick={() => onEdit(purchase)}
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}

                    {(purchase.status === 'ordered' || purchase.status === 'partially_received') && (
                      <button
                        className="p-1.5 rounded-md text-emerald-500 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                        onClick={() => onReceive(purchase)}
                        title={purchase.status === 'partially_received' ? 'Receive Remaining' : 'Receive Order'}
                      >
                        <PackageCheck className="w-4 h-4" />
                      </button>
                    )}

                    {purchase.status === 'draft' && (
                      <button
                        className="p-1.5 rounded-md text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                        onClick={() => onDelete(purchase)}
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default PurchaseList;
