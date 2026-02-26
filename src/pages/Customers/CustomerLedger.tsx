import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Receipt } from 'lucide-react';
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
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');
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
    if (!amount || parseFloat(amount) <= 0 || !customer) return;

    try {
      setIsProcessing(true);
      await customerService.settleCredit(customer.id, {
        amount: parseFloat(amount),
        payment_method: paymentMethod,
        notes: notes
      });
      dispatch(addNotification({ message: 'Credit settled successfully', type: 'success' }));
      setShowSettleForm(false);
      setAmount('');
      setNotes('');
      setPaymentMethod('cash');

      // Refresh ledger and customer data
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
  const creditLimit = customer.credit_limit ? parseFloat(customer.credit_limit) : 0;
  const hasLimit = creditLimit > 0;

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
            Credit Ledger
          </h1>
          <p className="text-gray-600 mt-1">Account details for <span className="font-semibold text-gray-900">{customer.name}</span></p>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col md:flex-row gap-6 flex-1">

        {/* Left panel: Balance & Actions */}
        <div className="w-full md:w-80 flex flex-col gap-6 flex-shrink-0">
          <div className="card bg-blue-50 border border-blue-100 p-6">
            <div className="text-sm text-blue-600 font-medium mb-1">Outstanding Balance</div>
            <div className={`text-3xl font-bold ${outstandingBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
              ₹{outstandingBalance.toFixed(2)}
            </div>
            {hasLimit && (
              <div className="mt-4 text-sm text-gray-600 flex justify-between border-t border-blue-200 pt-3">
                <span>Credit Limit:</span>
                <span className="font-medium">₹{creditLimit.toFixed(2)}</span>
              </div>
            )}
          </div>

          {outstandingBalance > 0 && !showSettleForm && (
            <button
              onClick={() => setShowSettleForm(true)}
              className="btn btn-primary w-full py-3"
            >
              Receive Payment
            </button>
          )}

          {showSettleForm && (
            <div className="card shadow-sm border border-gray-200">
              <form onSubmit={handleSettle} className="flex flex-col gap-4">
                <h3 className="font-semibold text-gray-800 border-b pb-2">Settle Balance</h3>

                <div>
                  <label className="block text-xs text-gray-600 mb-1">Amount to Pay</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    max={outstandingBalance.toString()}
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="input-field"
                    placeholder="Enter amount..."
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-600 mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="input-field bg-white"
                  >
                    <option value="cash">Cash</option>
                    <option value="upi">UPI/GPay</option>
                    <option value="card">Card</option>
                    <option value="net_banking">Net Banking</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-gray-600 mb-1">Notes (Optional)</label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="input-field"
                    placeholder="Transaction reference..."
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowSettleForm(false)}
                    className="btn btn-secondary flex-1"
                    disabled={isProcessing}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary flex-1"
                    disabled={isProcessing}
                  >
                    {isProcessing ? 'Processing' : 'Confirm'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Right panel: Ledger History */}
        <div className="flex-1 card flex flex-col overflow-hidden">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-200">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              Transaction History
            </h3>
          </div>

          <div className="flex-1 overflow-x-auto min-h-[300px]">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              </div>
            ) : ledgerEntries.length === 0 ? (
              <div className="text-center py-16 text-gray-500 flex flex-col items-center">
                <Receipt className="w-12 h-12 text-gray-300 mb-3" />
                No credit history found for this customer.
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
                        {entry.transaction_type === 'credit_sale' ? (
                          <span className="inline-flex items-center gap-1 text-danger-700 bg-danger-50 border border-danger-100 px-2.5 py-1 rounded-md text-xs font-semibold">
                            Credit Sale
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-success-700 bg-success-50 border border-success-100 px-2.5 py-1 rounded-md text-xs font-semibold">
                            Payment Recd
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-gray-600">
                        {entry.notes || '-'}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span className={`font-bold ${entry.amount > 0 ? 'text-danger-600' : 'text-success-600'}`}>
                          {entry.amount > 0 ? '+' : ''}{entry.amount}
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
