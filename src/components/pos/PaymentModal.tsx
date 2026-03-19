import React from 'react';
import { X, Banknote, CreditCard, Smartphone, Building2, BookOpenCheck, Wallet } from 'lucide-react';

interface PaymentModalProps {
  total: number;
  isEligibleForCredit?: boolean;
  canAffordCredit?: boolean;
  walletBalance?: number;
  onSelectPayment: (method: string) => void;
  onClose: () => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({
  total,
  isEligibleForCredit = false,
  canAffordCredit = false,
  walletBalance = 0,
  onSelectPayment,
  onClose
}) => {
  const hasWalletBalance = walletBalance > 0 && isEligibleForCredit;
  const walletCovers = walletBalance >= total;
  const walletShortfall = total - walletBalance;

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

          <div className="space-y-2.5">
            {[
              { id: 'cash', label: 'Cash', icon: Banknote, color: 'bg-green-500' },
              { id: 'card', label: 'Card', icon: CreditCard, color: 'bg-blue-500' },
              { id: 'upi', label: 'UPI/GPay', icon: Smartphone, color: 'bg-purple-500' },
              { id: 'net_banking', label: 'Net Banking', icon: Building2, color: 'bg-cyan-500' },
              { id: 'credit', label: 'Credit', icon: BookOpenCheck, color: 'bg-orange-500' },
            ].map((method) => {
              const Icon = method.icon;
              const isCreditDisabled = method.id === 'credit' && (!isEligibleForCredit || !canAffordCredit);
              const creditTitle = method.id === 'credit'
                ? (!isEligibleForCredit ? 'Only for registered customers' : !canAffordCredit ? 'Credit limit exceeded' : '')
                : '';
              return (
                <button
                  key={method.id}
                  disabled={isCreditDisabled}
                  title={creditTitle}
                  onClick={() => onSelectPayment(method.id)}
                  className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-all group disabled:opacity-50 disabled:hover:border-gray-200 disabled:hover:bg-white"
                >
                  <div className={`${method.color} p-3 rounded-lg text-white group-hover:scale-110 transition-transform ${isCreditDisabled ? 'group-hover:scale-100' : ''}`}>
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

            {/* Wallet option */}
            <button
              disabled={!hasWalletBalance}
              title={
                !isEligibleForCredit ? 'Only for registered customers' :
                !hasWalletBalance ? 'No wallet balance' :
                walletCovers
                  ? `Pay ₹${total.toFixed(2)} from wallet`
                  : `Wallet ₹${walletBalance.toFixed(2)} + Credit ₹${walletShortfall.toFixed(2)}`
              }
              onClick={() => onSelectPayment('wallet')}
              className="w-full flex items-center gap-4 p-4 border-2 border-purple-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all group disabled:opacity-50 disabled:hover:border-gray-200 disabled:hover:bg-white"
            >
              <div className="bg-violet-600 p-3 rounded-lg text-white group-hover:scale-110 transition-transform group-disabled:group-hover:scale-100">
                <Wallet className="w-6 h-6" />
              </div>
              <div className="flex-1 text-left">
                <div className="font-semibold text-gray-900">
                  Wallet {hasWalletBalance ? `(₹${walletBalance.toFixed(2)})` : ''}
                </div>
                {hasWalletBalance && !walletCovers && (
                  <div className="text-xs text-orange-500 mt-0.5">
                    Covers ₹{walletBalance.toFixed(2)}, ₹{walletShortfall.toFixed(2)} on credit
                  </div>
                )}
              </div>
              <div className="text-gray-400 group-hover:text-purple-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
