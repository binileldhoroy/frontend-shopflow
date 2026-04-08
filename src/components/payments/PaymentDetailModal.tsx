import React from 'react';
import Modal from '../common/Modal/Modal';
import { Payment } from '../../types/payment.types';
import { ArrowDownLeft, ArrowUpRight, RotateCcw } from 'lucide-react';

interface PaymentDetailModalProps {
  show: boolean;
  onHide: () => void;
  payment: Payment | null;
}

const PaymentDetailModal: React.FC<PaymentDetailModalProps> = ({
  show,
  onHide,
  payment,
}) => {
  if (!payment) return null;

  const isCredit = (payment.direction ?? 'credit') === 'credit';

  return (
    <Modal
      show={show}
      onHide={onHide}
      title={`Payment Details: ${payment.payment_number}`}
      size="md"
      footer={
        <button className="btn btn-secondary" onClick={onHide}>
          Close
        </button>
      }
    >
      <div className="space-y-4">

        {/* Reversal notice */}
        {payment.is_reversal && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
            <RotateCcw className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-700">
              <span className="font-semibold">This is a reversal payment.</span>
              {payment.reversal_of_number && (
                <span className="ml-1">
                  Original: <span className="font-mono font-bold">{payment.reversal_of_number}</span>
                </span>
              )}
              {payment.reversal_reason && (
                <p className="mt-1 italic">"{payment.reversal_reason}"</p>
              )}
            </div>
          </div>
        )}

        {/* Amount + direction */}
        <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <span className={`flex items-center gap-1 text-sm font-medium ${isCredit ? 'text-success-600' : 'text-danger-600'}`}>
              {isCredit
                ? <><ArrowDownLeft className="w-4 h-4" /> Received</>
                : <><ArrowUpRight className="w-4 h-4" /> Refund</>}
            </span>
          </div>
          <div className={`text-2xl font-bold ${isCredit ? 'text-success-600' : 'text-danger-600'}`}>
            {isCredit ? '+' : '−'}₹{parseFloat(String(payment.amount)).toFixed(2)}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-500 uppercase">Date</label>
            <div className="font-medium">{new Date(payment.payment_date).toLocaleString()}</div>
          </div>
          <div>
            <label className="text-xs text-gray-500 uppercase">Payment Mode</label>
            <div className="font-medium capitalize">{payment.payment_mode.replace('_', ' ')}</div>
          </div>
          <div>
            <label className="text-xs text-gray-500 uppercase">Type</label>
            <div className="font-medium capitalize">{payment.payment_type} Payment</div>
          </div>
          <div>
            <label className="text-xs text-gray-500 uppercase">Collected/Paid By</label>
            <div className="font-medium">{payment.received_by_name || 'System'}</div>
          </div>
        </div>

        <div className="border-t pt-4">
          <h4 className="font-semibold mb-2">Reference Details</h4>
          <div className="space-y-2 text-sm">
            {payment.sale_order_number && (
              <div className="flex justify-between">
                <span className="text-gray-600">Sale Order:</span>
                <span className="font-mono">{payment.sale_order_number}</span>
              </div>
            )}
            {payment.purchase_order_number && (
              <div className="flex justify-between">
                <span className="text-gray-600">Purchase Order:</span>
                <span className="font-mono">{payment.purchase_order_number}</span>
              </div>
            )}
            {payment.reference_number && (
              <div className="flex justify-between">
                <span className="text-gray-600">Reference ID:</span>
                <span>{payment.reference_number}</span>
              </div>
            )}
            {payment.notes && (
              <div className="mt-2">
                <span className="text-gray-600 block mb-1">Notes:</span>
                <p className="p-2 bg-gray-50 rounded italic text-gray-700">{payment.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default PaymentDetailModal;
