import React, { useState, useEffect } from 'react';
import { RegisterSession, sessionService } from '@api/services/session.service';
import { addNotification } from '@store/slices/uiSlice';
import { useAppDispatch } from '@hooks/useRedux';
import { ChevronLeft, ChevronRight, FileText, Banknote } from 'lucide-react';

const RegisterSessions: React.FC = () => {
  const dispatch = useAppDispatch();
  const [sessions, setSessions] = useState<RegisterSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    fetchSessions(currentPage);
  }, [currentPage]);

  const fetchSessions = async (page: number) => {
    setIsLoading(true);
    try {
      const response = await sessionService.getAll(page, 20);
      setSessions(response.results);
      setTotalCount(response.count);
      setTotalPages(Math.ceil(response.count / 20));
    } catch (error) {
      dispatch(addNotification({ message: 'Failed to fetch register sessions', type: 'error' }));
    } finally {
      setIsLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Register Sessions</h1>
          <p className="text-gray-500 mt-1">View and manage opening and closing balances across all shifts.</p>
        </div>
      </div>

      <div className="card">
        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-sm font-semibold text-gray-600">
                <th className="p-4 whitespace-nowrap">Session Info</th>
                <th className="p-4 whitespace-nowrap">Status</th>
                <th className="p-4 whitespace-nowrap">Cash Timeline</th>
                <th className="p-4 text-right whitespace-nowrap">Sales Breakdown</th>
                <th className="p-4 text-right whitespace-nowrap">Difference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-4 h-4 rounded-full bg-primary-600 animate-bounce" style={{ animationDelay: '0s' }}></div>
                      <div className="w-4 h-4 rounded-full bg-primary-600 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-4 h-4 rounded-full bg-primary-600 animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  </td>
                </tr>
              ) : sessions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">
                    <FileText className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    <p>No register sessions found.</p>
                  </td>
                </tr>
              ) : (
                sessions.map((session) => (
                  <tr key={session.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4 align-top">
                      <div className="font-medium text-gray-900">Session #{session.id}</div>
                      <div className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                        <span className="font-medium">User:</span> {session.user_name}
                      </div>
                      <div className="text-xs text-gray-400 mt-2">
                        Opened: {new Date(session.opened_at).toLocaleString()}
                      </div>
                    </td>
                    <td className="p-4 align-top">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        session.status === 'open' ? 'bg-warning-100 text-warning-800 border border-warning-200' : 'bg-success-100 text-success-800 border border-success-200'
                      }`}>
                        {session.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4 align-top">
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Opening:</span>
                          <span className="font-mono font-medium">₹{Number(session.opening_balance).toFixed(2)}</span>
                        </div>
                        {session.status === 'closed' && (
                           <>
                             <div className="flex justify-between text-sm">
                               <span className="text-gray-500 flex items-center gap-1">Cash in <Banknote className="w-3 h-3"/>:</span>
                               <span className="font-mono text-success-600">+₹{Number(session.total_cash).toFixed(2)}</span>
                             </div>
                             <div className="flex justify-between text-sm pt-1 border-t border-dashed">
                               <span className="font-medium text-gray-700">Expected:</span>
                               <span className="font-mono font-semibold">₹{(Number(session.opening_balance) + Number(session.total_cash)).toFixed(2)}</span>
                             </div>
                             <div className="flex justify-between text-sm mt-2">
                               <span className="font-medium text-gray-700">Actual Closing:</span>
                               <span className="font-mono font-bold">₹{Number(session.closing_balance).toFixed(2)}</span>
                             </div>
                             <div className="text-xs text-gray-400 mt-1">
                               Closed: {new Date(session.closed_at!).toLocaleString()}
                             </div>
                           </>
                        )}
                      </div>
                    </td>
                    <td className="p-4 align-top text-right space-y-1">
                      <div className="text-sm font-bold text-gray-900 mb-1">
                        Total: ₹{Number(session.total_sales).toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-500 flex justify-end items-center gap-2">
                         <span>UPI: ₹{Number(session.total_upi).toFixed(2)}</span>
                      </div>
                      <div className="text-xs text-gray-500 flex justify-end items-center gap-2">
                         <span>Card: ₹{Number(session.total_card).toFixed(2)}</span>
                      </div>
                      <div className="text-xs text-gray-500 flex justify-end items-center gap-2">
                         <span>Credit: ₹{Number(session.total_credit).toFixed(2)}</span>
                      </div>
                    </td>
                    <td className="p-4 align-top text-right">
                       {session.status === 'closed' ? (
                          <div className={`font-mono font-bold ${Number(session.difference) === 0 ? 'text-gray-400' : Number(session.difference) > 0 ? 'text-success-600' : 'text-danger-600'}`}>
                            {Number(session.difference) > 0 ? '+' : ''}₹{Number(session.difference).toFixed(2)}
                          </div>
                       ) : (
                          <span className="text-gray-400 text-sm italic">Pending...</span>
                       )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!isLoading && totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 px-4 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Showing <span className="font-medium">{(currentPage - 1) * 20 + 1}</span> to{' '}
              <span className="font-medium">
                {Math.min(currentPage * 20, totalCount)}
              </span>{' '}
              of <span className="font-medium">{totalCount}</span> results
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="btn btn-secondary px-3 py-1 disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-4 py-1 font-medium text-gray-700">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="btn btn-secondary px-3 py-1 disabled:opacity-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RegisterSessions;
