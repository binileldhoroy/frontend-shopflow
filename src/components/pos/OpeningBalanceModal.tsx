import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@hooks/useRedux';
import { openSession, fetchPreviousClosedSession } from '@store/slices/sessionSlice';
import { addNotification } from '@store/slices/uiSlice';
import { Calculator, ArrowRight } from 'lucide-react';

const OpeningBalanceModal: React.FC = () => {
  const dispatch = useAppDispatch();
  const { loading, previousClosedSession } = useAppSelector((state) => state.session);
  const [balance, setBalance] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    dispatch(fetchPreviousClosedSession());
  }, [dispatch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!balance || isNaN(Number(balance)) || Number(balance) < 0) {
      dispatch(addNotification({ message: 'Please enter a valid opening balance', type: 'error' }));
      return;
    }

    setIsSubmitting(true);
    try {
      await dispatch(openSession(Number(balance))).unwrap();
      dispatch(addNotification({ message: 'Register session started successfully!', type: 'success' }));
    } catch (error: any) {
      dispatch(addNotification({ message: error || 'Failed to start session', type: 'error' }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 w-full overflow-hidden flex flex-col h-full">
      <div className="bg-blue-600 p-6 text-white text-center rounded-t-xl shrink-0">
        <div className="inline-flex items-center justify-center p-3 bg-white/20 rounded-full mb-3 shadow-sm">
          <Calculator className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold">Open Register</h2>
        <p className="text-blue-100 mt-1">Start a new sales session</p>
      </div>

      <div className="p-6 flex-1 overflow-y-auto">


          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Enter Opening Cash Balance
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
                  value={balance}
                  onChange={(e) => setBalance(e.target.value)}
                  className="block w-full pl-8 pr-12 py-3 border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 font-mono text-lg shadow-sm border"
                  placeholder="0.00"
                />
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Count the cash in your drawer to start the shift.
              </p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || loading}
              className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
            >
              {isSubmitting || loading ? 'Opening Session...' : 'Open Session'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
      </div>
    </div>
  );
};

export default OpeningBalanceModal;
