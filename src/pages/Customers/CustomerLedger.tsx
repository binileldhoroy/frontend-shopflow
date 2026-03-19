import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Receipt, Wallet } from 'lucide-react';
import { customerService } from '@api/services/customer.service';
import { useAppDispatch } from '@hooks/useRedux';
import { addNotification } from '@store/slices/uiSlice';

const CustomerLedger: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const [customer, setCustomer] = useState<any>(null);
  const [ledgerEntries, setLedgerEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Settle Credit State
  const [showSettleForm, setShowSettleForm] = useState(false);
  const [settleAmount, setSettleAmount] = useState('');
  const [settlePaymentMethod, setSettlePaymentMethod] = useState('cash');
  const [settleNotes, setSettleNotes] = useState('');

  // Wallet Top-Up State
  const [showWalletForm, setShowWalletForm] = useState(false);
  const [walletAmount, setWalletAmount] = useState('');
  const [walletPaymentMethod, setWalletPaymentMethod] = useState('cash');
  const [walletNotes, setWalletNotes] = useState('');

  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (id) {
      fetchCustomerAndLedger(Number(id));
    }
  }, [id]);

  const fetchCustomerAndLedger = async (customerId: number) => {
    try {
      setLoading(true);
      const [customerData, ledgerData] = await Promise.all([
        customerService.getById(customerId),
        customerService.getLedger(customerId)
      ]);
      setCustomer(customerData);
      setLedgerEntries(ledgerData.results || ledgerData);
    } catch (error) {
      dispatch(addNotification({ message: 'Failed to load ledger details', type: 'error' }));
    } finally {
      setLoading(false);
    }
  };

  const handleSettle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settleAmount || parseFloat(settleAmount) <= 0 || !customer) return;

    try {
      setIsProcessing(true);
      await customerService.settleCredit(customer.id, {
        amount: parseFloat(settleAmount),
        payment_method: settlePaymentMethod,
        notes: settleNotes
      });
      dispatch(addNotification({ message: 'Credit settled successfully', type: 'success' }));
      setShowSettleForm(false);
      setSettleAmount('');
      setSettleNotes('');
      setSettlePaymentMethod('cash');
      fetchCustomerAndLedger(customer.id);
    } catch (error: any) {
      dispatch(addNotification({
        message: error.response?.data?.error || 'Failed to settle credit',
        type: 'error'
      }));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWalletTopUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletAmount || parseFloat(walletAmount) <= 0 || !customer) return;

    try {
      setIsProcessing(true);
      await customerService.walletTopUp(customer.id, {
        amount: parseFloat(walletAmount),
        payment_method: walletPaymentMethod,
        notes: walletNotes
      });
      dispatch(addNotification({ message: 'Wallet topped up successfully', type: 'success' }));
      setShowWalletForm(false);
      setWalletAmount('');
      setWalletNotes('');
      setWalletPaymentMethod('cash');
      fetchCustomerAndLedger(customer.id);
    } catch (error: any) {
      dispatch(addNotification({
        message: error.response?.data?.error || 'Failed to top up wallet',
        type: 'error'
      }));
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading && !customer) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-6 text-center text-gray-500">
        Customer not found.
      </div>
    );
  }

  const outstandingBalance = parseFloat(customer.outstanding_balance) || 0;
  const walletBalance = parseFloat(customer.wallet_balance) || 0;
  const creditLimit = customer.credit_limit ? parseFloat(customer.credit_limit) : 0;
  const hasLimit = creditLimit > 0;

  const getTransactionBadge = (type: string) => {
    switch (type) {
      case 'credit_sale':
        return <span className="inline-flex items-center gap-1 text-danger-700 bg-danger-50 border border-danger-100 px-2.5 py-1 rounded-md text-xs font-semibold">Credit Sale</span>;
      case 'payment_received':
        return <span className="inline-flex items-center gap-1 text-success-700 bg-success-50 border border-success-100 px-2.5 py-1 rounded-md text-xs font-semibold">Payment Recd</span>;
      case 'wallet_top_up':
        return <span className="inline-flex items-center gap-1 text-purple-700 bg-purple-50 border border-purple-100 px-2.5 py-1 rounded-md text-xs font-semibold">Wallet Top-Up</span>;
      case 'wallet_used':
        return <span className="inline-flex items-center gap-1 text-teal-700 bg-teal-50 border border-teal-100 px-2.5 py-1 rounded-md text-xs font-semibold">Wallet Used</span>;
      case 'refund':
        return <span className="inline-flex items-center gap-1 text-yellow-700 bg-yellow-50 border border-yellow-100 px-2.5 py-1 rounded-md text-xs font-semibold">Refund</span>;
      default:
        return <span className="inline-flex items-center gap-1 text-gray-700 bg-gray-50 border border-gray-100 px-2.5 py-1 rounded-md text-xs font-semibold">{type}</span>;
    }
  };

  const paymentMethodOptions = (
    <>
      <option value="cash">Cash</option>
      <option value="upi">UPI/GPay</option>
      <option value="card">Card</option>
      <option value="net_banking">Net Banking</option>
    </>
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/customers')}
          className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Receipt className="w-6 h-6 text-primary-600" />
            Customer Ledger
          </h1>
          <p className="text-gray-600 mt-1">Account details for <span className="font-semibold text-gray-900">{customer.name}</span></p>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col md:flex-row gap-6 flex-1">

        {/* Left panel: Balances & Actions */}
        <div className="w-full md:w-80 flex flex-col gap-4 flex-shrink-0">

          {/* Outstanding Credit Balance */}
          <div className="card bg-red-50 border border-red-100 p-4">
            <div className="text-xs text-red-500 font-semibold uppercase tracking-wide mb-1">Outstanding Credit</div>
            <div className={`text-3xl font-bold ${outstandingBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
              ₹{outstandingBalance.toFixed(2)}
            </div>
            {hasLimit && (
              <div className="mt-3 text-sm text-gray-600 flex justify-between border-t border-red-200 pt-3">
                <span>Credit Limit:</span>
                <span className="font-medium">₹{creditLimit.toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* Wallet Balance */}
          <div className="card bg-purple-50 border border-purple-100 p-4">
            <div className="text-xs text-purple-500 font-semibold uppercase tracking-wide mb-1 flex items-center gap-1">
              <Wallet className="w-3.5 h-3.5" /> Wallet Balance
            </div>
            <div className={`text-3xl font-bold ${walletBalance > 0 ? 'text-purple-600' : 'text-gray-400'}`}>
              ₹{walletBalance.toFixed(2)}
            </div>
            <p className="text-[11px] text-purple-400 mt-1">Used at checkout; shortfall becomes credit</p>
          </div>

          {/* Receive Payment (Credit Settlement) */}
          {outstandingBalance > 0 && !showSettleForm && !showWalletForm && (
            <button
              onClick={() => setShowSettleForm(true)}
              className="btn btn-primary w-full py-2.5"
            >
              Receive Payment
            </button>
          )}

          {showSettleForm && (
            <div className="card shadow-sm border border-gray-200">
              <form onSubmit={handleSettle} className="flex flex-col gap-3">
                <h3 className="font-semibold text-gray-800 border-b pb-2">Settle Balance</h3>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Amount</label>
                  <input
                    type="number" step="0.01" min="1" max={outstandingBalance.toString()} required
                    value={settleAmount} onChange={(e) => setSettleAmount(e.target.value)}
                    className="input-field" placeholder="Enter amount..."
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Payment Method</label>
                  <select value={settlePaymentMethod} onChange={(e) => setSettlePaymentMethod(e.target.value)} className="input-field bg-white">
                    {paymentMethodOptions}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Notes (Optional)</label>
                  <textarea rows={2} value={settleNotes} onChange={(e) => setSettleNotes(e.target.value)} className="input-field" placeholder="Reference..." />
                </div>
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => setShowSettleForm(false)} className="btn btn-secondary flex-1" disabled={isProcessing}>Cancel</button>
                  <button type="submit" className="btn btn-primary flex-1" disabled={isProcessing}>{isProcessing ? 'Processing...' : 'Confirm'}</button>
                </div>
              </form>
            </div>
          )}

          {/* Top Up Wallet */}
          {!showWalletForm && !showSettleForm && (
            <button
              onClick={() => setShowWalletForm(true)}
              className="btn btn-secondary w-full py-2.5 border-purple-300 text-purple-700 hover:bg-purple-50"
            >
              <Wallet className="w-4 h-4 inline mr-1.5" />
              Add to Wallet
            </button>
          )}

          {showWalletForm && (
            <div className="card shadow-sm border border-purple-200 bg-purple-50/30">
              <form onSubmit={handleWalletTopUp} className="flex flex-col gap-3">
                <h3 className="font-semibold text-purple-800 border-b border-purple-200 pb-2 flex items-center gap-1.5">
                  <Wallet className="w-4 h-4" /> Wallet Top-Up
                </h3>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Amount Received</label>
                  <input
                    type="number" step="0.01" min="1" required
                    value={walletAmount} onChange={(e) => setWalletAmount(e.target.value)}
                    className="input-field" placeholder="Enter amount..."
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Payment Method</label>
                  <select value={walletPaymentMethod} onChange={(e) => setWalletPaymentMethod(e.target.value)} className="input-field bg-white">
                    {paymentMethodOptions}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Notes (Optional)</label>
                  <textarea rows={2} value={walletNotes} onChange={(e) => setWalletNotes(e.target.value)} className="input-field" placeholder="Reference..." />
                </div>
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => setShowWalletForm(false)} className="btn btn-secondary flex-1" disabled={isProcessing}>Cancel</button>
                  <button type="submit" className="btn btn-primary flex-1 bg-purple-600 hover:bg-purple-700 border-purple-600" disabled={isProcessing}>
                    {isProcessing ? 'Processing...' : 'Add to Wallet'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Right panel: Ledger History */}
        <div className="flex-1 card flex flex-col overflow-hidden">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-200">
            <h3 className="font-semibold text-gray-800">Transaction History</h3>
          </div>

          <div className="flex-1 overflow-x-auto min-h-[300px]">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              </div>
            ) : ledgerEntries.length === 0 ? (
              <div className="text-center py-16 text-gray-500 flex flex-col items-center">
                <Receipt className="w-12 h-12 text-gray-300 mb-3" />
                No transaction history found for this customer.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-y border-gray-200 sticky top-0">
                  <tr>
                    <th className="py-3 px-4 text-left font-medium text-gray-700">Date</th>
                    <th className="py-3 px-4 text-left font-medium text-gray-700">Type</th>
                    <th className="py-3 px-4 text-left font-medium text-gray-700 w-1/2">Notes</th>
                    <th className="py-3 px-4 text-right font-medium text-gray-700">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {ledgerEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-4 text-gray-600 whitespace-nowrap">
                        {new Date(entry.created_at).toLocaleString()}
                      </td>
                      <td className="py-4 px-4">
                        {getTransactionBadge(entry.transaction_type)}
                      </td>
                      <td className="py-4 px-4 text-gray-600">
                        {entry.notes || '-'}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span className={`font-bold ${entry.amount > 0 ? 'text-danger-600' : 'text-success-600'}`}>
                          {entry.amount > 0 ? '+' : ''}₹{Math.abs(entry.amount).toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default CustomerLedger;
