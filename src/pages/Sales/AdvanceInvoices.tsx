import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '@hooks/useRedux';
import { saleService } from '@api/services/sale.service';
import { addNotification } from '@store/slices/uiSlice';
import { Calendar, FileClock } from 'lucide-react';
import { format, subMonths } from 'date-fns';
import { SaleOrder } from '../../types/sale.types';
import { ArrowRight, Plus } from 'lucide-react';

const AdvanceInvoices: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [sales, setSales] = useState<SaleOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(format(subMonths(new Date(), 1), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [advanceStatus, setAdvanceStatus] = useState('');

  // Server-side pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    fetchSales();
  }, [currentPage, pageSize, startDate, endDate, advanceStatus]);

  const fetchSales = async () => {
    try {
      setLoading(true);
      const response = await saleService.getAdvanceInvoices(currentPage, pageSize, {
        status: advanceStatus || undefined
      });
      setSales(response.results);
      setTotalCount(response.count);
    } catch (error) {
      console.error('Error fetching advance invoices:', error);
      dispatch(addNotification({
        message: 'Failed to fetch advance invoices',
        type: 'error',
      }));
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeClass = (status: string | null) => {
    switch (status) {
      case 'draft': return 'badge-secondary';
      case 'sent': return 'badge-info';
      case 'payment_pending': return 'badge-warning';
      case 'payment_received': return 'badge-success';
      case 'product_released': return 'badge-success bg-green-100 text-green-800';
      default: return 'badge-secondary';
    }
  };

  const getStatusLabel = (status: string | null) => {
    if (!status) return 'Unknown';
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  // Server-side pagination calculations
  const totalPages = Math.ceil(totalCount / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalCount);

  // Reset to page 1 when filters or page size change
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [startDate, endDate, advanceStatus, pageSize]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileClock className="w-7 h-7 text-primary-600" />
            Advance Invoices
          </h1>
          <p className="text-gray-600 mt-1">Manage invoices issued before product delivery</p>
        </div>
        <button
          onClick={() => navigate('/advance-invoices/create')}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Create Advance Invoice
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-4">
          {/* <div className="flex-1">
            <label className="label">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input-field"
            />
          </div>
          <div className="flex-1">
            <label className="label">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="input-field"
            />
          </div> */}
          <div className="flex-1">
             <label className="label">Status</label>
             <select
               value={advanceStatus}
               onChange={(e) => setAdvanceStatus(e.target.value)}
               className="input-field"
             >
               <option value="">All Statuses</option>
               <option value="draft">Draft</option>
               <option value="sent">Sent</option>
               <option value="payment_pending">Payment Pending</option>
               <option value="payment_received">Payment Received</option>
               <option value="product_released">Product Released</option>
             </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setStartDate(format(subMonths(new Date(), 1), 'yyyy-MM-dd'));
                setEndDate(format(new Date(), 'yyyy-MM-dd'));
                setAdvanceStatus('');
              }}
              className="btn btn-secondary"
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* Sales Table */}
      <div className="card">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <p className="text-gray-600 mt-4">Loading advance invoices...</p>
          </div>
        ) : sales.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">No advance invoices found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Order #</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Date</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Customer</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">State</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">Total</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-700">Status</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => (
                  <tr key={sale.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-900">{sale.order_number}</td>
                    <td className="py-3 px-4 text-gray-600">
                      {format(new Date(sale.sale_date), 'MMM dd, yyyy')}
                    </td>
                    <td className="py-3 px-4 text-gray-600">{sale.customer_name || 'Guest'}</td>
                    <td className="py-3 px-4 text-gray-600">{sale.billing_state || '-'}</td>
                    <td className="py-3 px-4 text-right font-medium text-gray-900">
                      ₹{sale.total_amount}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`badge ${getStatusBadgeClass(sale.advance_status)}`}>
                        {getStatusLabel(sale.advance_status)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => navigate(`/advance-invoices/${sale.id}`)}
                          className="btn btn-primary px-3 py-1.5 text-xs font-semibold flex items-center gap-1 shadow-sm"
                          title="View Details"
                        >
                          View <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && totalCount > 0 && (
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
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
                entries (Showing {startIndex + 1}-{endIndex} of {totalCount})
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
      </div>

    </div>
  );
};

export default AdvanceInvoices;
