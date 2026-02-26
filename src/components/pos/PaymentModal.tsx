import React from 'react';
import { X, Banknote, CreditCard, Smartphone, Building2, BookOpenCheck } from 'lucide-react';

interface PaymentModalProps {
  total: number;
  isEligibleForCredit?: boolean;
  canAffordCredit?: boolean;
  onSelectPayment: (method: string) => void;
  onClose: () => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ total, isEligibleForCredit = false, canAffordCredit = false, onSelectPayment, onClose }) => {
  const paymentMethods = [
    { id: 'cash', label: 'Cash', icon: Banknote, color: 'bg-green-500' },
    { id: 'card', label: 'Card', icon: CreditCard, color: 'bg-blue-500' },
    { id: 'upi', label: 'UPI/GPay', icon: Smartphone, color: 'bg-purple-500' },
    { id: 'net_banking', label: 'Net Banking', icon: Building2, color: 'bg-cyan-500' },
    { id: 'credit', label: 'Credit', icon: BookOpenCheck, color: 'bg-orange-500' },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Select Payment Method</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Total Amount</div>
            <div className="text-3xl font-bold text-gray-900">₹{total.toFixed(2)}</div>
          </div>

          <div className="space-y-3">
            {paymentMethods.map((method) => {
              const Icon = method.icon;
              return (
                <button
                  key={method.id}
                  disabled={method.id === 'credit' && (!isEligibleForCredit || !canAffordCredit)}
                  title={method.id === 'credit' && !isEligibleForCredit ? 'Only for registered customers' : method.id === 'credit' && !canAffordCredit ? 'Credit limit exceeded' : ''}
                  onClick={() => onSelectPayment(method.id)}
                  className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-all group disabled:opacity-50 disabled:hover:border-gray-200 disabled:hover:bg-white"
                >
                  <div className={`${method.color} p-3 rounded-lg text-white group-hover:scale-110 transition-transform ${method.id === 'credit' && (!isEligibleForCredit || !canAffordCredit) ? 'group-hover:scale-100' : ''}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-semibold text-gray-900">{method.label}</div>
                  </div>
                  <div className="text-gray-400 group-hover:text-primary-600">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
