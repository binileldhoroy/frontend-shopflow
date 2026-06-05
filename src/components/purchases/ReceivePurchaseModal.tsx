import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal/Modal';
import { PurchaseOrder } from '../../types/purchase.types';
import { CreditCard, Banknote, Smartphone, Building2, MoreHorizontal } from 'lucide-react';

interface ReceivePurchaseModalProps {
  show: boolean;
  onHide: () => void;
  onConfirm: (
    items: { id: number; received_quantity: number }[],
    updateStock: boolean,
    payment: { payment_status: string; payment_method: string } | null,
  ) => void;
  purchase: PurchaseOrder | null;
  loading?: boolean;
}

type PaymentStatus = 'no_change' | 'pending' | 'partial' | 'paid';
type PaymentMethod = 'cash' | 'card' | 'upi' | 'net_banking' | 'other';

const METHOD_OPTIONS: { value: PaymentMethod; label: string; icon: React.ReactNode }[] = [
  { value: 'cash',        label: 'Cash',        icon: <Banknote className="w-4 h-4" /> },
  { value: 'card',        label: 'Card',        icon: <CreditCard className="w-4 h-4" /> },
  { value: 'upi',         label: 'UPI',         icon: <Smartphone className="w-4 h-4" /> },
  { value: 'net_banking', label: 'Net Banking', icon: <Building2 className="w-4 h-4" /> },
  { value: 'other',       label: 'Other',       icon: <MoreHorizontal className="w-4 h-4" /> },
];

const PAYMENT_STATUS_OPTIONS: { value: PaymentStatus; label: string; description: string; cls: string }[] = [
  { value: 'no_change', label: 'No Change',    description: 'Keep current payment status',     cls: 'border-gray-200 text-gray-600' },
  { value: 'paid',      label: 'Fully Paid',   description: 'Payment received in full',         cls: 'border-emerald-400 text-emerald-700 bg-emerald-50' },
  { value: 'partial',   label: 'Partial Pay',  description: 'Partial payment made now',         cls: 'border-blue-400 text-blue-700 bg-blue-50' },
  { value: 'pending',   label: 'Not Paid',     description: 'Payment will be made later',       cls: 'border-amber-400 text-amber-700 bg-amber-50' },
];

const ReceivePurchaseModal: React.FC<ReceivePurchaseModalProps> = ({
  show, onHide, onConfirm, purchase, loading = false,
}) => {
  const [quantities, setQuantities] = useState<Record<number, string>>({});
  const [updateStock, setUpdateStock] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('no_change');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');

  useEffect(() => {
    if (purchase) {
      const defaults: Record<number, string> = {};
      purchase.items.forEach(item => {
        const pending = item.pending_quantity ?? (item.quantity - (item.received_quantity ?? 0));
        defaults[item.id!] = String(Math.max(0, pending));
      });
      setQuantities(defaults);
      // Pre-fill payment method from order
      setPaymentMethod((purchase.payment_method as PaymentMethod) ?? 'cash');
      // Default payment status selector based on current status
      setPaymentStatus('no_change');
    }
  }, [purchase, show]);

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

    const paymentUpdate = paymentStatus !== 'no_change'
      ? { payment_status: paymentStatus, payment_method: paymentMethod }
      : null;

    onConfirm(items, updateStock, paymentUpdate);
  };

  const showMethodSelector = paymentStatus !== 'no_change';

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
            {loading ? 'Processing…' : 'Confirm Receipt'}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <p className="text-sm text-gray-600">
          Enter the quantities received for each item. Leave 0 to skip an item for now.
        </p>

        {purchase.status === 'partially_received' && (
          <div className="text-sm bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-800">
            This order was partially received. Only remaining pending quantities are shown.
          </div>
        )}

        {/* Items table */}
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-2.5 text-left font-semibold text-gray-600">Product</th>
                <th className="px-4 py-2.5 text-right font-semibold text-gray-600">Ordered</th>
                <th className="px-4 py-2.5 text-right font-semibold text-gray-600">Already Recd</th>
                <th className="px-4 py-2.5 text-right font-semibold text-gray-600">Receiving Now</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {purchase.items.map(item => {
                const alreadyReceived = item.received_quantity ?? 0;
                const pending = item.pending_quantity ?? (item.quantity - alreadyReceived);
                const isFullyReceived = pending <= 0;
                return (
                  <tr key={item.id} className={isFullyReceived ? 'bg-gray-50 opacity-60' : ''}>
                    <td className="px-4 py-2.5 font-medium text-gray-800">{item.product_name}</td>
                    <td className="px-4 py-2.5 text-right text-gray-600">
                      {item.quantity}{item.unit ? <span className="text-xs text-gray-400 ml-1">{item.unit}</span> : null}
                    </td>
                    <td className="px-4 py-2.5 text-right text-emerald-600 font-medium">
                      {alreadyReceived > 0
                        ? <>{alreadyReceived}{item.unit ? <span className="text-xs text-emerald-400 ml-1">{item.unit}</span> : null}</>
                        : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {isFullyReceived ? (
                        <span className="text-xs text-emerald-600 font-semibold">Fully received</span>
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

        {/* Payment section */}
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">Payment Status</span>
            <span className="text-xs text-gray-400">
              Current: <span className="font-medium capitalize text-gray-600">{purchase.payment_status}</span>
            </span>
          </div>
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_STATUS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPaymentStatus(opt.value)}
                  className={`flex flex-col items-start px-3 py-2.5 rounded-lg border-2 text-left transition-all
                    ${paymentStatus === opt.value
                      ? opt.cls + ' border-current'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                >
                  <span className="text-sm font-semibold">{opt.label}</span>
                  <span className="text-xs opacity-70 mt-0.5">{opt.description}</span>
                </button>
              ))}
            </div>

            {/* Payment method — shown when changing status */}
            {showMethodSelector && (
              <div className="pt-1">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Payment Method</div>
                <div className="flex flex-wrap gap-2">
                  {METHOD_OPTIONS.map(m => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => setPaymentMethod(m.value)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all
                        ${paymentMethod === m.value
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                    >
                      {m.icon} {m.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ReceivePurchaseModal;
