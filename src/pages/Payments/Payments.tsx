import React, { useState, useEffect, useCallback } from 'react';
import { paymentService } from '../../api/services/payment.service';
import { Payment, PaymentFormData } from '../../types/payment.types';
import { useAppDispatch } from '../../hooks/useRedux';
import { addNotification } from '../../store/slices/uiSlice';
import { Banknote, Plus, Search, Eye, ArrowUpRight, ArrowDownLeft, Inbox } from 'lucide-react';

import PaymentDetailModal from '../../components/payments/PaymentDetailModal';
import PaymentFormModal from '../../components/payments/PaymentFormModal';

const Payments: React.FC = () => {
  const dispatch = useAppDispatch();

  // Data
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [typeFilter, setTypeFilter] = useState('');
  const [modeFilter, setModeFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Modals
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {
        page: currentPage,
        page_size: pageSize,
      };
      if (typeFilter) params.type = typeFilter;
      if (modeFilter) params.mode = modeFilter;
      if (searchTerm) params.search = searchTerm;

      const data = await paymentService.getAll(params);
      const results = data.results || data;
      const count = data.count || (Array.isArray(results) ? results.length : 0);

      setPayments(Array.isArray(results) ? results : []);
      setTotalCount(count);
      setTotalPages(Math.ceil(count / pageSize));
    } catch (error: any) {
      dispatch(addNotification({
        message: 'Failed to load payments',
        type: 'error',
      }));
    } finally {
      setLoading(false);
    }
  }, [typeFilter, modeFilter, searchTerm, currentPage, pageSize, dispatch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 300);
    return () => clearTimeout(timer);
  }, [loadData]);

  useEffect(() => {
    setCurrentPage(1);
  }, [typeFilter, modeFilter, searchTerm, pageSize]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  };

  const handleCreate = () => {
    setShowFormModal(true);
  };

  const handleCreateSubmit = async (data: PaymentFormData) => {
    try {
      setActionLoading(true);
      await paymentService.create(data);
      dispatch(addNotification({ message: 'Payment recorded successfully', type: 'success' }));
      setShowFormModal(false);
      loadData();
    } catch (error: any) {
      dispatch(addNotification({
        message: error.response?.data?.message || 'Failed to record payment',
        type: 'error',
      }));
    } finally {
      setActionLoading(false);
    }
  };

  const handleView = (payment: Payment) => {
    setSelectedPayment(payment);
    setShowDetailModal(true);
  };

  const getBadge = (payment: Payment) => {
    const isIncome = payment.payment_type === 'sale';
    return (
      <span className={`badge ${isIncome ? 'badge-success' : 'badge-warning'} flex items-center gap-1 w-fit`}>
        {isIncome ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
        {isIncome ? 'Received' : 'Paid'}
      </span>
    );
  };

  const formatMode = (mode: string) =>
    mode.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Banknote className="w-8 h-8" />
            Payments
          </h1>
          <p className="text-gray-600 mt-1">Track processed transaction history</p>
        </div>
        <button className="btn btn-primary" onClick={handleCreate}>
          <Plus className="w-5 h-5 inline mr-2" />
          Record Payment
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            className="input-field pl-10"
            placeholder="Search by ID, amount, or reference..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-4">
          <select
            className="input-field w-40"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="">All Types</option>
            <option value="sale">Sale (Income)</option>
            <option value="purchase">Purchase (Expense)</option>
          </select>

          <select
            className="input-field w-40"
            value={modeFilter}
            onChange={(e) => setModeFilter(e.target.value)}
          >
            <option value="">All Modes</option>
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="upi">UPI</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="cheque">Cheque</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      {/* Payments Table */}
      <div className="card flex flex-col min-h-0 overflow-hidden" style={{ height: 'calc(100vh - 200px)' }}>
        {loading ? (
          <div className="flex justify-center items-center py-20 flex-1">
            <div className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : payments.length === 0 ? (
          <div className="text-center py-12 flex-1">
            <Inbox className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No payments found</p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-x-auto overflow-y-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Payment #</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Date</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Type</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Reference</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Mode</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700">Amount</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium text-primary-600">
                        {payment.payment_number}
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {new Date(payment.payment_date).toLocaleDateString()}
                        <div className="text-xs text-gray-400">
                          {new Date(payment.payment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="py-3 px-4">{getBadge(payment)}</td>
                      <td className="py-3 px-4 text-gray-600">
                        {payment.sale_order_number && (
                          <div className="text-sm">Sale: <span className="font-mono">{payment.sale_order_number}</span></div>
                        )}
                        {payment.purchase_order_number && (
                          <div className="text-sm">PO: <span className="font-mono">{payment.purchase_order_number}</span></div>
                        )}
                        {!payment.sale_order_number && !payment.purchase_order_number && (
                          payment.notes
                            ? <span className="text-xs text-gray-500 truncate max-w-[150px] block">{payment.notes}</span>
                            : <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="capitalize px-2 py-1 bg-gray-100 rounded text-xs font-medium">
                          {formatMode(payment.payment_mode)}
                        </span>
                        {payment.reference_number && (
                          <div className="text-xs text-gray-500 mt-1">Ref: {payment.reference_number}</div>
                        )}
                      </td>
                      <td className={`py-3 px-4 text-right font-bold ${payment.payment_type === 'sale' ? 'text-success-600' : 'text-danger-600'}`}>
                        {payment.payment_type === 'sale' ? '+ ' : '- '}
                        ₹{parseFloat(String(payment.amount)).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          className="btn btn-outline-secondary p-1"
                          onClick={() => handleView(payment)}
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

            {/* Pagination */}
            {totalCount > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-4 pt-4 mt-2 border-t border-gray-200 shrink-0 px-4 pb-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Show</span>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="input-field py-1 px-2 text-sm w-20"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <span className="text-sm text-gray-600 whitespace-nowrap">
                    entries (Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, totalCount)} of {totalCount})
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>

                  {getPageNumbers().map((page, index) => (
                    <button
                      key={index}
                      onClick={() => typeof page === 'number' && handlePageChange(page)}
                      disabled={page === '...'}
                      className={`px-3 py-1 text-sm border rounded ${
                        page === currentPage
                          ? 'bg-primary-600 text-white border-primary-600'
                          : page === '...'
                          ? 'border-transparent cursor-default'
                          : 'border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail Modal */}
      <PaymentDetailModal
        show={showDetailModal}
        onHide={() => setShowDetailModal(false)}
        payment={selectedPayment}
      />

      {/* Form Modal */}
      <PaymentFormModal
        show={showFormModal}
        onHide={() => setShowFormModal(false)}
        onSubmit={handleCreateSubmit}
        loading={actionLoading}
      />
    </div>
  );
};

export default Payments;
