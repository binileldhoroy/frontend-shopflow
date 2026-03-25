import React, { useState, useEffect } from 'react';
import { useAppDispatch } from '@hooks/useRedux';
import { saleService } from '@api/services/sale.service';
import { addNotification } from '@store/slices/uiSlice';
import { Calendar, Eye, Download, X, Printer, ShoppingCart, DollarSign } from 'lucide-react';
import { format, subMonths } from 'date-fns';

interface Sale {
  id: number;
  order_number: string;
  customer_name: string;
  sale_date: string;
  status: string;
  payment_method: string;
  payment_status: string;
  subtotal: string;
  cgst_amount: string;
  sgst_amount: string;
  igst_amount: string;
  gst_amount: string;
  discount_amount: string;
  round_off: number;
  total_amount: string;
  items: SaleItem[];
}

interface SaleItem {
  id: number;
  product_name: string;
  quantity: string;
  unit_price: string;
  gst_rate: string;
  total_with_gst: string;
  line_total: string;
}

const Sales: React.FC = () => {
  const dispatch = useAppDispatch();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(format(subMonths(new Date(), 1), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [paymentMethod, setPaymentMethod] = useState('');
  const [selectedSaleId, setSelectedSaleId] = useState<number | null>(null);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Server-side pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    fetchSales();
  }, [currentPage, pageSize, startDate, endDate, paymentMethod]);

  useEffect(() => {
    if (selectedSaleId) {
      fetchSaleDetail(selectedSaleId);
    }
  }, [selectedSaleId]);

  const fetchSales = async () => {
    try {
      setLoading(true);
      const response = await saleService.getAll(currentPage, pageSize, {
        startDate,
        endDate,
        paymentMethod
      });
      setSales(response.results);
      setTotalCount(response.count);
    } catch (error) {
      console.error('Error fetching sales:', error);
      dispatch(addNotification({
        message: 'Failed to fetch sales',
        type: 'error',
      }));
    } finally {
      setLoading(false);
    }
  };

  const fetchSaleDetail = async (id: number) => {
    try {
      setLoadingDetail(true);
      const data = await saleService.getById(id);
      setSelectedSale(data);
    } catch (error) {
      console.error('Error fetching sale detail:', error);
      dispatch(addNotification({
        message: 'Failed to fetch sale details',
        type: 'error',
      }));
    } finally {
      setLoadingDetail(false);
    }
  };

  const handlePrintInvoice = () => {
    if (selectedSale) {
      window.print();
    }
  };

  const handleDownloadInvoice = () => {
    if (selectedSale) {
      const invoiceWindow = window.open('', '_blank');
      if (invoiceWindow) {
        invoiceWindow.document.write(generateInvoiceHTML(selectedSale));
        invoiceWindow.document.close();
        invoiceWindow.print();
      }
    }
  };

  const generateInvoiceHTML = (sale: Sale) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice ${sale.order_number}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .details { margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .total { font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>INVOICE</h1>
          <p>Order #: ${sale.order_number}</p>
          <p>Date: ${format(new Date(sale.sale_date), 'MMM dd, yyyy')}</p>
        </div>
        <div class="details">
          <p><strong>Customer:</strong> ${sale.customer_name || 'Guest'}</p>
          <p><strong>Payment Method:</strong> ${sale.payment_method}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Quantity</th>
              <th>Unit Price</th>
              <th>GST</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${sale.items.map((item: SaleItem) => `
              <tr>
                <td>${item.product_name}</td>
                <td>${item.quantity}</td>
                <td>₹${item.unit_price}</td>
                <td>${item.gst_rate}%</td>
                <td>₹${item.total_with_gst}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="4" class="total">Subtotal</td>
              <td class="total">₹${sale.subtotal}</td>
            </tr>
            ${(() => {
              const taxBreakdown: Record<number, { taxableAmount: number, cgst: number, sgst: number, igst: number }> = {};
              let exemptedAmount = 0;
              let totalGST = 0;
              const isInterstate = parseFloat(sale.igst_amount || '0') > 0;

              sale.items.forEach(item => {
                 // Calculate taxable from unit price and quantity assuming unit_price is tax exclusive base
                 const qty = parseFloat(item.quantity) || 0;
                 const price = parseFloat(item.unit_price) || 0;
                 // Assuming unit_price is tax excluded based on POS logic refactor.
                 // However, legacy data might be mixed.
                 // Best approach: If we have separate tax amounts in item, use them?
                 // The SaleItem interface has 'total_with_gst'.
                 // Let's reverse calculate taxable if needed or use unit_price * quantity as taxable base.
                 const taxable = price * qty;
                 const rate = parseFloat(item.gst_rate) || 0;

                 if (rate === 0) {
                   exemptedAmount += taxable;
                 } else {
                   if (!taxBreakdown[rate]) taxBreakdown[rate] = { taxableAmount: 0, cgst: 0, sgst: 0, igst: 0 };
                   taxBreakdown[rate].taxableAmount += taxable;

                   const taxAmt = (taxable * rate) / 100;
                   totalGST += taxAmt;

                   if (isInterstate) {
                     taxBreakdown[rate].igst += taxAmt;
                   } else {
                     taxBreakdown[rate].cgst += taxAmt / 2;
                     taxBreakdown[rate].sgst += taxAmt / 2;
                   }
                 }
              });

              let html = '';

              // GST Breakdown Rows
              Object.entries(taxBreakdown).sort(([a], [b]) => Number(b) - Number(a)).forEach(([rate, breakdown]) => {
                 html += `
                   <tr>
                     <td colspan="4" class="total" style="text-align: right;font-weight:normal;font-size:12px">Taxable Amount (${rate}%)</td>
                     <td class="total" style="text-align: right;font-weight:normal;font-size:12px">₹${breakdown.taxableAmount.toFixed(2)}</td>
                   </tr>
                 `;
                 if (isInterstate) {
                   html += `
                     <tr>
                       <td colspan="4" class="total" style="text-align: right;font-size:12px;color:#666">IGST @ ${rate}%</td>
                       <td class="total" style="text-align: right;font-size:12px;color:#666">₹${breakdown.igst.toFixed(2)}</td>
                     </tr>
                   `;
                 } else {
                    html += `
                     <tr>
                       <td colspan="4" class="total" style="text-align: right;font-size:12px;color:#666">CGST @ ${Number(rate)/2}%</td>
                       <td class="total" style="text-align: right;font-size:12px;color:#666">₹${breakdown.cgst.toFixed(2)}</td>
                     </tr>
                     <tr>
                       <td colspan="4" class="total" style="text-align: right;font-size:12px;color:#666">SGST @ ${Number(rate)/2}%</td>
                       <td class="total" style="text-align: right;font-size:12px;color:#666">₹${breakdown.sgst.toFixed(2)}</td>
                     </tr>
                    `;
                 }
              });

              if (exemptedAmount > 0) {
                 html += `
                   <tr>
                     <td colspan="4" class="total" style="text-align: right;font-weight:normal;font-size:12px">Exempted Amount (0%)</td>
                     <td class="total" style="text-align: right;font-weight:normal;font-size:12px">₹${exemptedAmount.toFixed(2)}</td>
                   </tr>
                 `;
              }

              html += `
                <tr>
                  <td colspan="4" class="total" style="text-align: right;">Total GST</td>
                  <td class="total">₹${totalGST.toFixed(2)}</td>
                </tr>
              `;

              if (sale.round_off && Number(sale.round_off) !== 0) {
                 html += `
                   <tr>
                     <td colspan="4" class="total" style="text-align: right;font-weight:normal;">Round Off</td>
                     <td class="total" style="text-align: right;font-weight:normal;">${Number(sale.round_off) > 0 ? '+' : ''}₹{Number(sale.round_off).toFixed(2)}</td>
                   </tr>
                 `;
              }

              return html;
            })()}
            <tr>
              <td colspan="4" class="total">Total</td>
              <td class="total">₹${sale.total_amount}</td>
            </tr>
          </tfoot>
        </table>
      </body>
      </html>
    `;
  };

  // Server-side pagination calculations
  const totalPages = Math.ceil(totalCount / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalCount);

  const totalRevenue = sales.reduce((sum, sale) => sum + parseFloat(sale.total_amount), 0);
  const totalSales = totalCount;

  // Reset to page 1 when filters or page size change
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [startDate, endDate, paymentMethod, pageSize]);

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
            <ShoppingCart className="w-7 h-7 text-primary-600" />
            Sales History
          </h1>
          <p className="text-gray-600 mt-1">View all sales transactions</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Sales</p>
              <p className="text-2xl font-bold text-gray-900">{totalSales}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-success-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-success-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">₹{totalRevenue.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
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
          </div>
          <div className="flex-1">
             <label className="label">Payment Method</label>
             <select
               value={paymentMethod}
               onChange={(e) => setPaymentMethod(e.target.value)}
               className="input-field"
             >
               <option value="">All Methods</option>
               <option value="cash">Cash</option>
               <option value="card">Card</option>
               <option value="upi">UPI</option>
               <option value="net_banking">Net Banking</option>
             </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setStartDate(format(subMonths(new Date(), 1), 'yyyy-MM-dd'));
                setEndDate(format(new Date(), 'yyyy-MM-dd'));
                setPaymentMethod('');
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
            <p className="text-gray-600 mt-4">Loading sales...</p>
          </div>
        ) : sales.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">No sales found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Order #</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Date</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Customer</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Payment</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">Subtotal</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">GST</th>
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
                    <td className="py-3 px-4 text-gray-600 capitalize">{sale.payment_method?.replace('_', ' ') || '-'}</td>
                    <td className="py-3 px-4 text-right text-gray-900">₹{sale.subtotal}</td>
                    <td className="py-3 px-4 text-right text-gray-600">₹{sale.gst_amount}</td>
                    <td className="py-3 px-4 text-right font-medium text-gray-900">
                      ₹{sale.total_amount}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`badge ${sale.status === 'completed' ? 'badge-success' : 'badge-warning'}`}>
                        {sale.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedSaleId(sale.id)}
                          className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedSaleId(sale.id);
                            setTimeout(() => handleDownloadInvoice(), 500);
                          }}
                          className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                          title="Download Invoice"
                        >
                          <Download className="w-4 h-4" />
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

      {/* Sale Detail Modal */}
      {selectedSaleId && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Sale Details</h2>
              <button
                onClick={() => {
                  setSelectedSaleId(null);
                  setSelectedSale(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingDetail ? (
              <div className="p-12 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                <p className="text-gray-600 mt-4">Loading details...</p>
              </div>
            ) : selectedSale ? (
              <div className="p-6 space-y-6">
                {/* Order Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Order Number</p>
                    <p className="font-medium text-gray-900">{selectedSale.order_number}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Date</p>
                    <p className="font-medium text-gray-900">
                      {format(new Date(selectedSale.sale_date), 'MMM dd, yyyy HH:mm')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Customer</p>
                    <p className="font-medium text-gray-900">{selectedSale.customer_name || 'Guest'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Payment Method</p>
                    <p className="font-medium text-gray-900 capitalize">{selectedSale.payment_method}</p>
                  </div>
                </div>

                {/* Items Table */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Items</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-2 px-3 text-sm font-medium text-gray-700">Product</th>
                          <th className="text-right py-2 px-3 text-sm font-medium text-gray-700">Qty</th>
                          <th className="text-right py-2 px-3 text-sm font-medium text-gray-700">Price</th>
                          <th className="text-right py-2 px-3 text-sm font-medium text-gray-700">GST</th>
                          <th className="text-right py-2 px-3 text-sm font-medium text-gray-700">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedSale.items.map((item) => (
                          <tr key={item.id} className="border-b border-gray-100">
                            <td className="py-2 px-3 text-sm text-gray-900">{item.product_name}</td>
                            <td className="py-2 px-3 text-sm text-right text-gray-600">{item.quantity}</td>
                            <td className="py-2 px-3 text-sm text-right text-gray-600">₹{item.unit_price}</td>
                            <td className="py-2 px-3 text-sm text-right text-gray-600">{item.gst_rate}%</td>
                            <td className="py-2 px-3 text-sm text-right font-medium text-gray-900">
                              ₹{item.total_with_gst}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Totals */}
                <div className="border-t border-gray-200 pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium text-gray-900">₹{selectedSale.subtotal}</span>
                  </div>

                  {/* GST Breakdown */}
                  {(() => {
                     const isInterstate = parseFloat(selectedSale.igst_amount || '0') > 0;
                     const taxBreakdown: Record<number, { taxableAmount: number, cgst: number, sgst: number, igst: number }> = {};
                     let exemptedAmount = 0;
                     let totalGST = 0;

                     selectedSale.items.forEach(item => {
                       const qty = parseFloat(item.quantity) || 0;
                       const price = parseFloat(item.unit_price) || 0;
                       const taxable = qty * price;
                       const rate = parseFloat(item.gst_rate) || 0;

                       if (rate === 0) {
                         exemptedAmount += taxable;
                       } else {
                         if (!taxBreakdown[rate]) taxBreakdown[rate] = { taxableAmount: 0, cgst: 0, sgst: 0, igst: 0 };
                         taxBreakdown[rate].taxableAmount += taxable;
                         const taxAmt = (taxable * rate) / 100;
                         totalGST += taxAmt;

                         if (isInterstate) {
                           taxBreakdown[rate].igst += taxAmt;
                         } else {
                           taxBreakdown[rate].cgst += taxAmt / 2;
                           taxBreakdown[rate].sgst += taxAmt / 2;
                         }
                       }
                     });

                     return (
                       <>
                         {Object.entries(taxBreakdown).sort(([a], [b]) => Number(b) - Number(a)).map(([rate, breakdown]) => (
                           <React.Fragment key={rate}>
                             <div className="flex justify-between text-sm pt-1 border-t border-dashed border-gray-100">
                               <span className="text-gray-900 font-medium">Taxable Amount ({rate}%)</span>
                               <span className="text-gray-900 font-medium">₹{breakdown.taxableAmount.toFixed(2)}</span>
                             </div>
                             {isInterstate ? (
                               <div className="flex justify-between text-xs text-gray-500 pl-2">
                                 <span>IGST @ {rate}%</span>
                                 <span>₹{breakdown.igst.toFixed(2)}</span>
                               </div>
                             ) : (
                               <>
                                 <div className="flex justify-between text-xs text-gray-500 pl-2">
                                   <span>CGST @ {Number(rate)/2}%</span>
                                   <span>₹{breakdown.cgst.toFixed(2)}</span>
                                 </div>
                                 <div className="flex justify-between text-xs text-gray-500 pl-2">
                                   <span>SGST @ {Number(rate)/2}%</span>
                                   <span>₹{breakdown.sgst.toFixed(2)}</span>
                                 </div>
                               </>
                             )}
                           </React.Fragment>
                         ))}

                         {exemptedAmount > 0 && (
                            <div className="flex justify-between text-sm pt-1 border-t border-dashed border-gray-100">
                               <span className="text-gray-600">Exempted Amount (0%)</span>
                               <span className="text-gray-900">₹{exemptedAmount.toFixed(2)}</span>
                            </div>
                         )}

                         <div className="flex justify-between text-sm font-semibold pt-2 border-t border-gray-100">
                           <span className="text-gray-900">Total GST</span>
                           <span className="text-gray-900">₹{totalGST.toFixed(2)}</span>
                         </div>
                       </>
                     );
                  })()}

                  {parseFloat(selectedSale.discount_amount) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Discount</span>
                      <span className="font-medium text-danger-600">-₹{selectedSale.discount_amount}</span>
                    </div>
                  )}

                  {selectedSale.round_off && Number(selectedSale.round_off) !== 0 && (
                     <div className="flex justify-between text-sm">
                       <span className="text-gray-600">Round Off</span>
                       <span className="font-medium text-gray-900">
                         {Number(selectedSale.round_off) > 0 ? '+' : ''}₹{Number(selectedSale.round_off).toFixed(2)}
                       </span>
                     </div>
                  )}

                  <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2">
                    <span className="text-gray-900">Total</span>
                    <span className="text-gray-900">₹{selectedSale.total_amount}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={handlePrintInvoice}
                    className="btn btn-secondary flex items-center gap-2"
                  >
                    <Printer className="w-4 h-4" />
                    Print Bill
                  </button>
                  <button
                    onClick={handleDownloadInvoice}
                    className="btn btn-primary flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download Bill
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};

export default Sales;
