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
      onClose();
    } catch (error: any) {
      dispatch(addNotification({ message: error || 'Failed to close register', type: 'error' }));
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4 bg-gray-900/60 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl w-full sm:max-w-lg flex flex-col overflow-hidden"
        style={{ maxHeight: 'calc(var(--viewport-height, 100vh) - env(safe-area-inset-top) - 24px)' }}
      >
        {/* ── Header ── */}
        <div className="shrink-0 bg-red-600 px-5 pt-5 pb-4 text-white text-center">
          {/* Drag handle (mobile) */}
          <div className="flex justify-center mb-3 sm:hidden">
            <div className="w-10 h-1 bg-white/40 rounded-full" />
          </div>
          <div className="inline-flex items-center justify-center p-2.5 bg-white/20 rounded-full mb-2 shadow-sm">
            <Flag className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold">Close Register</h2>
          <p className="text-red-100 text-sm mt-0.5">End your sales session</p>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto min-h-0 px-4 py-4 space-y-4">

          {/* Opening balance + Total sales */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
              <div className="text-xs font-semibold text-gray-500 mb-1">Opening Balance</div>
              <div className="text-lg font-bold font-mono text-gray-800">
                ₹{Number(currentSession.opening_balance).toFixed(2)}
              </div>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
              <div className="text-xs font-semibold text-blue-700 mb-1">Total Sales</div>
              <div className="text-lg font-bold font-mono text-blue-700">
                ₹{Number(currentSession.total_sales).toFixed(2)}
              </div>
            </div>
          </div>

          {/* Payment breakdown */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
            <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2.5 px-1">
              Payment Breakdown
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white p-2.5 rounded-lg border border-gray-100 shadow-sm text-center">
                <div className="text-[10px] text-gray-400 uppercase font-semibold">Cash</div>
                <div className="font-mono font-bold text-green-600 text-sm mt-0.5">
                  ₹{Number(currentSession.total_cash).toFixed(2)}
                </div>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-gray-100 shadow-sm text-center">
                <div className="text-[10px] text-gray-400 uppercase font-semibold">UPI</div>
                <div className="font-mono font-bold text-purple-600 text-sm mt-0.5">
                  ₹{Number(currentSession.total_upi).toFixed(2)}
                </div>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-gray-100 shadow-sm text-center">
                <div className="text-[10px] text-gray-400 uppercase font-semibold">Card</div>
                <div className="font-mono font-bold text-blue-600 text-sm mt-0.5">
                  ₹{Number(currentSession.total_card).toFixed(2)}
                </div>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-gray-100 shadow-sm text-center">
                <div className="text-[10px] text-gray-400 uppercase font-semibold">Credit</div>
                <div className="font-mono font-bold text-orange-600 text-sm mt-0.5">
                  ₹{Number(currentSession.total_credit).toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          {/* Expected cash */}
          <div className="flex justify-between items-center px-4 py-3 bg-blue-50 text-blue-900 rounded-xl border border-blue-100 font-semibold">
            <span className="text-sm">Expected Cash in Drawer</span>
            <span className="text-xl font-mono font-bold">₹{expectedTotal.toFixed(2)}</span>
          </div>

          {/* Actual cash input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Actual Cash Counted
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 font-semibold text-sm">₹</span>
              </div>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                required
                autoFocus
                value={closingBalance}
                onChange={(e) => setClosingBalance(e.target.value)}
                className="block w-full pl-8 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-red-500 focus:border-red-500 font-mono text-lg shadow-sm outline-none transition-colors"
                placeholder="0.00"
              />
            </div>
            <p className="mt-1.5 text-xs text-gray-500">
              Count the physical cash present in your till right now.
            </p>
          </div>
        </div>

        {/* ── Pinned action buttons — always visible ── */}
        <div
          className="shrink-0 bg-white border-t border-gray-100 px-4 pt-3"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}
        >
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-3 border border-gray-300 text-sm font-medium rounded-xl text-gray-700 bg-white active:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 text-sm font-medium rounded-xl text-white bg-red-600 active:bg-red-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Closing...' : 'Close Register'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CloseRegisterModal;
