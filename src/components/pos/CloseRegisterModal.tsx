import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@hooks/useRedux';
import { closeSession, fetchCurrentSession } from '@store/slices/sessionSlice';
import { addNotification } from '@store/slices/uiSlice';
import { Flag } from 'lucide-react';

interface Props {
  onClose: () => void;
}

const CloseRegisterModal: React.FC<Props> = ({ onClose }) => {
  const dispatch = useAppDispatch();
  const { currentSession, loading } = useAppSelector((state) => state.session);
  const [closingBalance, setClosingBalance] = useState<string>('');

  useEffect(() => {
    dispatch(fetchCurrentSession());
  }, [dispatch]);

  if (!currentSession) {
    onClose();
    return null;
  }

  const expectedTotal = Number(currentSession.opening_balance) + Number(currentSession.total_cash);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!closingBalance || isNaN(Number(closingBalance)) || Number(closingBalance) < 0) {
      dispatch(addNotification({ message: 'Please enter a valid closing balance', type: 'error' }));
      return;
    }

    try {
      await dispatch(
        closeSession({
          id: currentSession.id,
          closingBalance: Number(closingBalance),
        })
      ).unwrap();
      dispatch(addNotification({ message: 'Register closed successfully', type: 'success' }));
      onClose(); // Parent handles showing the opening modal next
    } catch (error: any) {
      dispatch(addNotification({ message: error || 'Failed to close register', type: 'error' }));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="bg-red-600 p-6 text-white text-center rounded-t-xl">
          <div className="inline-flex items-center justify-center p-3 bg-white/20 rounded-full mb-3 shadow-sm">
            <Flag className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold">Close Register</h2>
          <p className="text-red-100 mt-1">End your sales session</p>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="text-sm font-semibold text-gray-500 mb-1">Opening Balance</div>
              <div className="text-xl font-bold font-mono text-gray-800">₹{Number(currentSession.opening_balance).toFixed(2)}</div>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-sm font-semibold text-blue-700 mb-1">Total Sales</div>
              <div className="text-xl font-bold font-mono text-blue-700">₹{Number(currentSession.total_sales).toFixed(2)}</div>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-6">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 px-1">Payment Breakdown</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white p-2 rounded border border-gray-100 shadow-sm text-center">
                <div className="text-[10px] text-gray-400 uppercase font-semibold">Cash</div>
                <div className="font-mono font-bold text-green-600 text-sm">₹{Number(currentSession.total_cash).toFixed(2)}</div>
              </div>
              <div className="bg-white p-2 rounded border border-gray-100 shadow-sm text-center">
                <div className="text-[10px] text-gray-400 uppercase font-semibold">UPI</div>
                <div className="font-mono font-bold text-purple-600 text-sm">₹{Number(currentSession.total_upi).toFixed(2)}</div>
              </div>
              <div className="bg-white p-2 rounded border border-gray-100 shadow-sm text-center">
                <div className="text-[10px] text-gray-400 uppercase font-semibold">Card</div>
                <div className="font-mono font-bold text-blue-600 text-sm">₹{Number(currentSession.total_card).toFixed(2)}</div>
              </div>
              <div className="bg-white p-2 rounded border border-gray-100 shadow-sm text-center">
                <div className="text-[10px] text-gray-400 uppercase font-semibold">Credit</div>
                <div className="font-mono font-bold text-orange-600 text-sm">₹{Number(currentSession.total_credit).toFixed(2)}</div>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center px-4 py-3 bg-blue-50 text-blue-900 rounded-lg mb-6 shadow-inner font-semibold border border-blue-100">
            <span>Expected Cash in Drawer:</span>
            <span className="text-xl font-mono">₹{expectedTotal.toFixed(2)}</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Actual Cash Counted
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 font-semibold sm:text-sm">₹</span>
                </div>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  autoFocus
                  value={closingBalance}
                  onChange={(e) => setClosingBalance(e.target.value)}
                  className="block w-full pl-8 pr-12 py-3 border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500 font-mono text-lg shadow-sm border"
                  placeholder="0.00"
                />
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Count the physical cash present in your till right now.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 px-4 py-3 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-3 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Closing...' : 'Close Register'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CloseRegisterModal;
