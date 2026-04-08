import React from 'react';
import { Payment } from '../../types/payment.types';
import { Eye, ArrowUpRight, ArrowDownLeft, RotateCcw } from 'lucide-react';

interface PaymentListProps {
  payments: Payment[];
  loading: boolean;
  onView: (payment: Payment) => void;
}

const PaymentList: React.FC<PaymentListProps> = ({
  payments,
  loading,
  onView,
}) => {
  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (payments.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No payments found
      </div>
    );
  }

  const getBadges = (payment: Payment) => {
    const isCredit = (payment.direction ?? 'credit') === 'credit';
    return (
      <div className="flex flex-col gap-1">
        <span className={`badge ${isCredit ? 'badge-success' : 'badge-danger'} flex items-center gap-1 w-fit`}>
          {isCredit ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
          {isCredit ? 'Received' : 'Refund'}
        </span>
        {payment.is_reversal && (
          <span className="badge badge-secondary flex items-center gap-1 w-fit text-xs">
            <RotateCcw className="w-3 h-3" />
            Reversal
          </span>
        )}
      </div>
    );
  };

  const formatMode = (mode: string) => {
    return mode.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <div className="table-container flex-1 overflow-auto">
      <table className="table">
        <thead>
          <tr>
            <th>Payment #</th>
            <th>Date</th>
            <th>Type</th>
            <th>Reference</th>
            <th>Mode</th>
            <th className="text-right">Amount</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((payment) => (
            <tr key={payment.id} className="hover:bg-gray-50">
              <td className="font-medium text-primary-600">
                {payment.payment_number}
              </td>
              <td>
                {new Date(payment.payment_date).toLocaleDateString()}
                <div className="text-xs text-gray-500">
                  {new Date(payment.payment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </td>
              <td>{getBadges(payment)}</td>
              <td>
                {payment.sale_order_number && (
                  <div className="text-sm">
                    Sale: <span className="font-mono">{payment.sale_order_number}</span>
                  </div>
                )}
                {payment.purchase_order_number && (
                  <div className="text-sm">
                    PO: <span className="font-mono">{payment.purchase_order_number}</span>
                  </div>
                )}
                {payment.reversal_of_number && (
                  <div className="text-xs text-gray-400 mt-0.5">
                    Reversal of <span className="font-mono">{payment.reversal_of_number}</span>
                  </div>
                )}
                {!payment.sale_order_number && !payment.purchase_order_number && parseReference(payment)}
              </td>
              <td>
                <span className="capitalize px-2 py-1 bg-gray-100 rounded text-xs font-medium">
                  {formatMode(payment.payment_mode)}
                </span>
                {payment.reference_number && (
                   <div className="text-xs text-gray-500 mt-1">Ref: {payment.reference_number}</div>
                )}
              </td>
              <td className={`text-right font-bold ${(payment.direction ?? 'credit') === 'credit' ? 'text-success-600' : 'text-danger-600'}`}>
                {(payment.direction ?? 'credit') === 'credit' ? '+' : '−'}₹{parseFloat(String(payment.amount)).toFixed(2)}
              </td>
              <td>
                <button
                  className="btn btn-outline-secondary p-1"
                  onClick={() => onView(payment)}
                  title="View Details"
                >
                  <Eye className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const parseReference = (payment: Payment) => {
  if (payment.notes) return <span className="text-xs text-gray-500 truncate max-w-[150px] block">{payment.notes}</span>;
  return <span className="text-gray-400">-</span>;
};

export default PaymentList;
