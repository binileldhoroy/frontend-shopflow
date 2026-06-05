import React from 'react';
import Modal from '../common/Modal/Modal';
import { PurchaseOrder } from '../../types/purchase.types';

interface PurchaseDetailModalProps {
  show: boolean;
  onHide: () => void;
  purchase: PurchaseOrder | null;
}

const PurchaseDetailModal: React.FC<PurchaseDetailModalProps> = ({
  show,
  onHide,
  purchase,
}) => {
  if (!purchase) return null;

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'received': return 'badge-success';
      case 'ordered': return 'badge-info';
      case 'cancelled': return 'badge-danger';
      default: return 'badge-secondary';
    }
  };

  return (
    <Modal
      show={show}
      onHide={onHide}
      title={`Purchase Order: ${purchase.order_number}`}
      size="lg"
      footer={
        <button className="btn btn-secondary" onClick={onHide}>
          Close
        </button>
      }
    >
      <div className="space-y-6">
        {/* Header Info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-lg">
          <div>
            <div className="text-xs text-gray-500 uppercase">Order Date</div>
            <div className="font-medium">{new Date(purchase.order_date).toLocaleDateString()}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 uppercase">Supplier</div>
            <div className="font-medium text-primary-600">{purchase.supplier_name}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 uppercase">Status</div>
            <div className="">
              <span className={`badge ${getStatusBadgeClass(purchase.status)} capitalize`}>
                {purchase.status}
              </span>
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 uppercase">Expected Delivery</div>
            <div className="font-medium">
              {purchase.expected_delivery_date
                ? new Date(purchase.expected_delivery_date).toLocaleDateString()
                : '-'}
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="overflow-hidden border rounded-lg">
          <table className="table min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left">Product</th>
                <th className="px-4 py-2 text-right">Qty</th>
                <th className="px-4 py-2 text-right">Unit Price</th>
                <th className="px-4 py-2 text-right">Tax</th>
                <th className="px-4 py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {purchase.items.map((item, idx) => (
                <tr key={idx} className="border-b last:border-b-0">
                  <td className="px-4 py-2">
                    <div className="font-medium">{item.product_name}</div>
                  </td>
                  <td className="px-4 py-2 text-right">
                    {item.quantity}{item.unit ? <span className="text-xs text-gray-400 ml-1">{item.unit}</span> : null}
                  </td>
                  <td className="px-4 py-2 text-right">₹{item.unit_price}</td>
                  <td className="px-4 py-2 text-right">{item.tax_rate}%</td>
                  <td className="px-4 py-2 text-right font-medium">
                    ₹{((item.quantity * item.unit_price) * (1 + item.tax_rate / 100)).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 font-bold">
              <tr>
                <td colSpan={4} className="px-4 py-2 text-right">Subtotal:</td>
                <td className="px-4 py-2 text-right">₹{parseFloat(String(purchase.subtotal)).toFixed(2)}</td>
              </tr>
              <tr>
                <td colSpan={4} className="px-4 py-2 text-right">Tax:</td>
                <td className="px-4 py-2 text-right">₹{parseFloat(String(purchase.tax_amount)).toFixed(2)}</td>
              </tr>
              <tr className="bg-primary-50 text-primary-700">
                <td colSpan={4} className="px-4 py-2 text-right text-lg">Total:</td>
                <td className="px-4 py-2 text-right text-lg">₹{parseFloat(String(purchase.total_amount)).toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Footer Info */}
        <div className="text-sm text-gray-500">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div>
               <span className="font-semibold">Notes:</span> {purchase.notes || 'None'}
             </div>
             <div className="text-right">
               Created by User #{purchase.created_by} on {new Date(purchase.created_at).toLocaleString()}
             </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default PurchaseDetailModal;
