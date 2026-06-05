import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal/Modal';
import { PurchaseOrder } from '../../types/purchase.types';

interface ReceivePurchaseModalProps {
  show: boolean;
  onHide: () => void;
  onConfirm: (items: { id: number; received_quantity: number }[], updateStock: boolean) => void;
  purchase: PurchaseOrder | null;
  loading?: boolean;
}

const ReceivePurchaseModal: React.FC<ReceivePurchaseModalProps> = ({
  show, onHide, onConfirm, purchase, loading = false,
}) => {
  const [quantities, setQuantities] = useState<Record<number, string>>({});
  const [updateStock, setUpdateStock] = useState(true);

  useEffect(() => {
    if (purchase) {
      const defaults: Record<number, string> = {};
      purchase.items.forEach(item => {
        const pending = item.pending_quantity ?? (item.quantity - (item.received_quantity ?? 0));
        defaults[item.id!] = String(Math.max(0, pending));
      });
      setQuantities(defaults);
    }
  }, [purchase]);

  if (!purchase) return null;

  const handleQtyChange = (itemId: number, value: string) => {
    setQuantities(prev => ({ ...prev, [itemId]: value }));
  };

  const handleConfirm = () => {
    const items = purchase.items
      .filter(item => item.id != null)
      .map(item => ({
        id: item.id!,
        received_quantity: Math.max(0, parseFloat(quantities[item.id!] || '0') || 0),
      }))
      .filter(entry => entry.received_quantity > 0);
    onConfirm(items, updateStock);
  };

  return (
    <Modal
      show={show}
      onHide={onHide}
      title={purchase.status === 'partially_received' ? 'Receive Remaining Items' : 'Receive Purchase Order'}
      footer={
        <>
          <label className="flex items-center gap-2 mr-auto cursor-pointer select-none text-sm text-gray-700">
            <input
              type="checkbox"
              checked={updateStock}
              onChange={e => setUpdateStock(e.target.checked)}
              className="w-4 h-4 accent-primary-600"
            />
            Update stock
          </label>
          <button className="btn btn-secondary" onClick={onHide} disabled={loading}>Cancel</button>
          <button className="btn btn-success text-white" onClick={handleConfirm} disabled={loading}>
            {loading ? 'Processing...' : 'Confirm Receipt'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Enter the quantities received for each item. Leave 0 to skip an item for now.
        </p>

        {purchase.status === 'partially_received' && (
          <div className="text-sm bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-800">
            This order was partially received. Only remaining pending quantities are shown.
          </div>
        )}

        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-700">Product</th>
                <th className="px-4 py-2 text-right font-medium text-gray-700">Ordered</th>
                <th className="px-4 py-2 text-right font-medium text-gray-700">Already Recd</th>
                <th className="px-4 py-2 text-right font-medium text-gray-700">Receiving Now</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {purchase.items.map(item => {
                const alreadyReceived = item.received_quantity ?? 0;
                const pending = item.pending_quantity ?? (item.quantity - alreadyReceived);
                const isFullyReceived = pending <= 0;
                return (
                  <tr key={item.id} className={isFullyReceived ? 'bg-gray-50 opacity-60' : ''}>
                    <td className="px-4 py-2 font-medium">{item.product_name}</td>
                    <td className="px-4 py-2 text-right text-gray-600">
                      {item.quantity}{item.unit ? <span className="text-xs text-gray-400 ml-1">{item.unit}</span> : null}
                    </td>
                    <td className="px-4 py-2 text-right text-green-600 font-medium">
                      {alreadyReceived > 0
                        ? <>{alreadyReceived}{item.unit ? <span className="text-xs text-green-400 ml-1">{item.unit}</span> : null}</>
                        : '—'}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {isFullyReceived ? (
                        <span className="text-xs text-green-600 font-semibold">Fully received</span>
                      ) : (
                        <div className="flex items-center justify-end gap-1">
                          <input
                            type="number"
                            min="0"
                            max={String(pending)}
                            step="1"
                            value={quantities[item.id!] ?? String(pending)}
                            onChange={e => handleQtyChange(item.id!, e.target.value)}
                            className="input-field !w-20 text-right py-1"
                          />
                          {item.unit && <span className="text-xs text-gray-500 whitespace-nowrap">{item.unit}</span>}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-gray-400">
          If you receive fewer than ordered, the order status becomes <strong>Partially Received</strong>.
        </p>
      </div>
    </Modal>
  );
};

export default ReceivePurchaseModal;
