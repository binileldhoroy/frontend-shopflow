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
    <div className="space-y-4">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-header-icon">
            <Banknote className="w-5 h-5" />
          </div>
          <div>
            <h1>Payments</h1>
            <p>Track all payment transactions</p>
          </div>
        </div>
        <button className="btn btn-primary self-start" onClick={handleCreate}>
          <Plus className="w-4 h-4 inline mr-1.5" />
          Record Payment
        </button>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <div className="search-wrap flex-1 min-w-[180px]">
          <Search className="search-icon" />
          <input
            type="text"
            className="input-field"
            placeholder="Search payments…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select className="input-field w-auto min-w-[150px]" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="">All Types</option>
          <option value="sale">Income</option>
          <option value="purchase">Expense</option>
        </select>
        <select className="input-field w-auto min-w-[130px]" value={modeFilter} onChange={(e) => setModeFilter(e.target.value)}>
          <option value="">All Modes</option>
          <option value="cash">Cash</option>
          <option value="card">Card</option>
          <option value="upi">UPI</option>
          <option value="bank_transfer">Bank Transfer</option>
          <option value="cheque">Cheque</option>
          <option value="other">Other</option>
        </select>
      </div>

      {/* Payments Table */}
      <div className="section-card flex flex-col" style={{ height: 'calc(100vh - 250px)', minHeight: '400px' }}>
        {loading ? (
          <div className="loading-center flex-1"><div className="spinner" /></div>
        ) : payments.length === 0 ? (
          <div className="empty-state flex-1">
            <div className="empty-state-icon"><Inbox className="w-6 h-6" /></div>
            <p className="text-gray-700 font-medium">No payments found</p>
          </div>
        ) : (
          <>
            <div className="flex-1 table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Payment #</th>
                    <th>Date</th>
                    <th>Type</th>
                    <th className="hidden md:table-cell">Reference</th>
                    <th className="hidden sm:table-cell">Mode</th>
                    <th className="th-right">Amount</th>
                    <th className="th-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id}>
                      <td className="font-semibold text-primary-600 text-xs">{payment.payment_number}</td>
                      <td className="text-gray-600 whitespace-nowrap">
                        <div>{new Date(payment.payment_date).toLocaleDateString()}</div>
                        <div className="text-xs text-gray-400">{new Date(payment.payment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      </td>
                      <td>{getBadge(payment)}</td>
                      <td className="hidden md:table-cell text-gray-500 text-sm">
                        {payment.sale_order_number ? <span className="font-mono text-xs">{payment.sale_order_number}</span>
                          : payment.purchase_order_number ? <span className="font-mono text-xs">{payment.purchase_order_number}</span>
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="hidden sm:table-cell">
                        <span className="badge badge-primary">{formatMode(payment.payment_mode)}</span>
                      </td>
                      <td className={`td-right font-bold ${payment.payment_type === 'sale' ? 'text-success-600' : 'text-danger-600'}`}>
                        {payment.payment_type === 'sale' ? '+' : '−'}₹{parseFloat(String(payment.amount)).toFixed(2)}
                      </td>
                      <td className="td-right">
                        <button className="action-btn action-btn-primary" onClick={() => handleView(payment)} title="View">
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
              <div className="pagination-bar shrink-0 px-4 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Show</span>
                  <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="input-field py-1 px-2 text-sm w-20">
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <span className="text-sm text-gray-500 whitespace-nowrap">
                    entries ({(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, totalCount)} of {totalCount})
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="pag-btn">‹</button>
                  {getPageNumbers().map((page, index) => (
                    <button key={index} onClick={() => typeof page === 'number' && handlePageChange(page)} disabled={page === '...'} className={`pag-btn ${page === currentPage ? 'active' : ''} ${page === '...' ? 'dots' : ''}`}>{page}</button>
                  ))}
                  <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="pag-btn">›</button>
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
