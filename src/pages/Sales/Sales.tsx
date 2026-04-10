import React, { useState, useEffect, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@hooks/useRedux';
import { saleService } from '@api/services/sale.service';
import { addNotification } from '@store/slices/uiSlice';
import {
  Calendar, Eye, Download, X, Printer, ShoppingCart, DollarSign,
  Ban, GitBranch, ClipboardList, AlertTriangle, CheckCircle, Clock, CheckSquare,
  Pencil, Trash2, Plus,
} from 'lucide-react';
import { format, subMonths } from 'date-fns';
import { UserRole } from '../../types/auth.types';
import type { POSAuditLog, SaleOrderStatus } from '../../types/sale.types';

// ─── Local interfaces ────────────────────────────────────────────────────────

interface SaleItem {
  id: number;
  product_name: string;
  quantity: string;
  unit_price: string;
  gst_rate: string;
  total_with_gst: string;
  line_total: string;
}

interface Sale {
  id: number;
  order_number: string;
  customer_name: string;
  sale_date: string;
  status: SaleOrderStatus;
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
  notes: string | null;
  // Void fields
  voided_reason: string | null;
  voided_by: number | null;
  voided_at: string | null;
  // Correction link
  corrects_order: number | null;
  is_final: boolean;
}

// Mutable copy of a SaleItem used inside the edit modal
interface EditableItem {
  product: number | null;
  product_name: string;
  quantity: string;
  unit_price: string;
  gst_rate: string;
  hsn_code: string;
}

// ─── Status badge helper ──────────────────────────────────────────────────────

const STATUS_CONFIG: Record<SaleOrderStatus, { label: string; className: string }> = {
  completed:  { label: 'Completed',  className: 'badge-success' },
  draft:      { label: 'Draft',      className: 'badge-warning' },
  voided:     { label: 'Voided',     className: 'badge-danger' },
  corrected:  { label: 'Corrected',  className: 'badge-secondary' },
  cancelled:  { label: 'Cancelled',  className: 'badge-secondary' },
  refunded:   { label: 'Refunded',   className: 'badge-info' },
};

const StatusBadge: React.FC<{ status: SaleOrderStatus }> = ({ status }) => {
  const cfg = STATUS_CONFIG[status] ?? { label: status, className: 'badge-secondary' };
  return <span className={`badge ${cfg.className}`}>{cfg.label}</span>;
};

// ─── Audit log action label helper ───────────────────────────────────────────

const ACTION_ICONS: Record<string, React.ReactNode> = {
  bill_completed:    <CheckCircle className="w-4 h-4 text-green-500" />,
  bill_voided:       <Ban         className="w-4 h-4 text-red-500"   />,
  bill_corrected:    <GitBranch   className="w-4 h-4 text-amber-500" />,
  bill_cloned:       <GitBranch   className="w-4 h-4 text-blue-500"  />,
  bill_created:      <CheckCircle className="w-4 h-4 text-gray-400"  />,
  payment_added:     <DollarSign  className="w-4 h-4 text-green-500" />,
  payment_reversed:  <DollarSign  className="w-4 h-4 text-red-500"   />,
  ledger_adjusted:   <ClipboardList className="w-4 h-4 text-blue-500" />,
};

// ─── Main component ───────────────────────────────────────────────────────────

const Sales: React.FC = () => {
  const dispatch   = useAppDispatch();
  const authUser   = useAppSelector((s) => s.auth.user);
  const canManage  = [UserRole.SUPER_USER, UserRole.ADMIN, UserRole.MANAGER].includes(
    authUser?.role as UserRole,
  );
  // Cashiers can also complete bills
  const canComplete = [UserRole.SUPER_USER, UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER].includes(
    authUser?.role as UserRole,
  );

  // List state
  const [sales,       setSales]       = useState<Sale[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [startDate,   setStartDate]   = useState(format(subMonths(new Date(), 1), 'yyyy-MM-dd'));
  const [endDate,     setEndDate]     = useState(format(new Date(), 'yyyy-MM-dd'));
  const [paymentMethod, setPaymentMethod] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize,    setPageSize]    = useState(10);
  const [totalCount,  setTotalCount]  = useState(0);

  // Detail modal
  const [selectedSaleId, setSelectedSaleId] = useState<number | null>(null);
  const [selectedSale,   setSelectedSale]   = useState<Sale | null>(null);
  const [loadingDetail,  setLoadingDetail]  = useState(false);

  // Void modal
  const [voidTarget,    setVoidTarget]    = useState<Sale | null>(null);
  const [voidReason,    setVoidReason]    = useState('');
  const [voidLoading,   setVoidLoading]   = useState(false);

  // Correct modal
  const [correctTarget,  setCorrectTarget]  = useState<Sale | null>(null);
  const [correctReason,  setCorrectReason]  = useState('');
  const [correctLoading, setCorrectLoading] = useState(false);

  // Audit log modal
  const [auditTarget,  setAuditTarget]  = useState<Sale | null>(null);
  const [auditLogs,    setAuditLogs]    = useState<POSAuditLog[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  // Complete modal
  const [completeTarget,  setCompleteTarget]  = useState<Sale | null>(null);
  const [completeLoading, setCompleteLoading] = useState(false);

  // Edit draft modal
  const [editTarget,   setEditTarget]   = useState<Sale | null>(null);
  const [editItems,    setEditItems]    = useState<EditableItem[]>([]);
  const [editDiscount, setEditDiscount] = useState('0');
  const [editNotes,    setEditNotes]    = useState('');
  const [editLoading,  setEditLoading]  = useState(false);

  // Status filter
  const [statusFilter, setStatusFilter] = useState('');

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchSales = useCallback(async () => {
    try {
      setLoading(true);
      const response = await saleService.getAll(currentPage, pageSize, {
        startDate, endDate, paymentMethod, status: statusFilter || undefined,
      });
      setSales(response.results);
      setTotalCount(response.count);
    } catch {
      dispatch(addNotification({ message: 'Failed to fetch sales', type: 'error' }));
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, startDate, endDate, paymentMethod, statusFilter, dispatch]);

  useEffect(() => { fetchSales(); }, [fetchSales]);

  useEffect(() => {
    if (currentPage !== 1) setCurrentPage(1);
  }, [startDate, endDate, paymentMethod, statusFilter, pageSize]);

  const fetchSaleDetail = async (id: number) => {
    try {
      setLoadingDetail(true);
      setSelectedSale(await saleService.getById(id));
    } catch {
      dispatch(addNotification({ message: 'Failed to fetch sale details', type: 'error' }));
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    if (selectedSaleId) fetchSaleDetail(selectedSaleId);
  }, [selectedSaleId]);

  // ── Void ───────────────────────────────────────────────────────────────────

  const openVoidModal = (sale: Sale) => {
    setVoidTarget(sale);
    setVoidReason('');
  };

  const handleVoidConfirm = async () => {
    if (!voidTarget || voidReason.trim().length < 5) return;
    try {
      setVoidLoading(true);
      await saleService.voidBill(voidTarget.id, voidReason.trim());
      dispatch(addNotification({ message: `Bill ${voidTarget.order_number} voided.`, type: 'success' }));
      setVoidTarget(null);
      setVoidReason('');
      fetchSales();
    } catch (err: any) {
      dispatch(addNotification({
        message: err?.response?.data?.error ?? 'Failed to void bill.',
        type: 'error',
      }));
    } finally {
      setVoidLoading(false);
    }
  };

  // ── Correct ────────────────────────────────────────────────────────────────

  const openCorrectModal = (sale: Sale) => {
    setCorrectTarget(sale);
    setCorrectReason('');
  };

  const handleCorrectConfirm = async () => {
    if (!correctTarget || correctReason.trim().length < 5) return;
    try {
      setCorrectLoading(true);
      const res = await saleService.correctBill(correctTarget.id, correctReason.trim());
      dispatch(addNotification({
        message: `Correction created: ${res.new_order.order_number}`,
        type: 'success',
      }));
      setCorrectTarget(null);
      setCorrectReason('');
      fetchSales();
    } catch (err: any) {
      dispatch(addNotification({
        message: err?.response?.data?.error ?? 'Failed to correct bill.',
        type: 'error',
      }));
    } finally {
      setCorrectLoading(false);
    }
  };

  // ── Audit Log ──────────────────────────────────────────────────────────────

  const openAuditModal = async (sale: Sale) => {
    setAuditTarget(sale);
    setAuditLogs([]);
    setAuditLoading(true);
    try {
      setAuditLogs(await saleService.getBillAuditLogs(sale.id));
    } catch {
      dispatch(addNotification({ message: 'Failed to load audit log.', type: 'error' }));
    } finally {
      setAuditLoading(false);
    }
  };

  // ── Complete ───────────────────────────────────────────────────────────────

  const handleCompleteConfirm = async () => {
    if (!completeTarget) return;
    try {
      setCompleteLoading(true);
      await saleService.completeBill(completeTarget.id);
      dispatch(addNotification({
        message: `Bill ${completeTarget.order_number} completed successfully.`,
        type: 'success',
      }));
      setCompleteTarget(null);
      fetchSales();
    } catch (err: any) {
      dispatch(addNotification({
        message: err?.response?.data?.error ?? 'Failed to complete bill.',
        type: 'error',
      }));
    } finally {
      setCompleteLoading(false);
    }
  };

  // ── Edit Draft ────────────────────────────────────────────────────────────

  const openEditModal = (sale: Sale) => {
    setEditTarget(sale);
    setEditItems(sale.items.map(i => ({
      product: null,           // product FK not in list response; backend will use product_name
      product_name: i.product_name,
      quantity: i.quantity,
      unit_price: i.unit_price,
      gst_rate: i.gst_rate,
      hsn_code: '',
    })));
    setEditDiscount(String(sale.discount_amount || '0'));
    setEditNotes(sale.notes || '');
  };

  const updateEditItem = (index: number, field: keyof EditableItem, value: string) => {
    setEditItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const removeEditItem = (index: number) => {
    setEditItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleEditSave = async () => {
    if (!editTarget || editItems.length === 0) return;
    try {
      setEditLoading(true);
      await saleService.editDraft(editTarget.id, {
        items: editItems.map(i => ({
          product_name: i.product_name,
          quantity: parseFloat(i.quantity) || 1,
          unit_price: parseFloat(i.unit_price) || 0,
          gst_rate: parseFloat(i.gst_rate) || 0,
          hsn_code: i.hsn_code,
        })),
        discount_percentage: parseFloat(editDiscount) || 0,
        notes: editNotes,
      });
      dispatch(addNotification({ message: 'Draft bill updated.', type: 'success' }));
      setEditTarget(null);
      fetchSales();
    } catch (err: any) {
      dispatch(addNotification({
        message: err?.response?.data?.error ?? 'Failed to update draft.',
        type: 'error',
      }));
    } finally {
      setEditLoading(false);
    }
  };

  // ── Print / Download ───────────────────────────────────────────────────────

  const handlePrintInvoice = () => { if (selectedSale) window.print(); };

  const handleDownloadInvoice = () => {
    if (!selectedSale) return;
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(generateInvoiceHTML(selectedSale));
      win.document.close();
      win.print();
    }
  };

  const generateInvoiceHTML = (sale: Sale) => `
    <!DOCTYPE html><html><head><title>Invoice ${sale.order_number}</title>
    <style>body{font-family:Arial,sans-serif;padding:20px}.header{text-align:center;margin-bottom:30px}
    table{width:100%;border-collapse:collapse;margin-top:20px}th,td{border:1px solid #ddd;padding:8px;text-align:left}
    th{background:#f2f2f2}.total{font-weight:bold}</style></head><body>
    <div class="header"><h1>INVOICE</h1><p>Order #: ${sale.order_number}</p>
    <p>Date: ${format(new Date(sale.sale_date), 'MMM dd, yyyy')}</p></div>
    <div><p><strong>Customer:</strong> ${sale.customer_name || 'Guest'}</p>
    <p><strong>Payment:</strong> ${sale.payment_method}</p></div>
    <table><thead><tr><th>Product</th><th>Qty</th><th>Price</th><th>GST</th><th>Total</th></tr></thead>
    <tbody>${sale.items.map(i => `<tr><td>${i.product_name}</td><td>${i.quantity}</td>
    <td>₹${i.unit_price}</td><td>${i.gst_rate}%</td><td>₹${i.total_with_gst}</td></tr>`).join('')}
    </tbody><tfoot><tr><td colspan="4" class="total">Total</td><td class="total">₹${sale.total_amount}</td></tr>
    </tfoot></table></body></html>`;

  // ── Pagination ─────────────────────────────────────────────────────────────

  const totalPages  = Math.ceil(totalCount / pageSize);
  const startIndex  = (currentPage - 1) * pageSize;
  const endIndex    = Math.min(startIndex + pageSize, totalCount);
  const totalRevenue = sales.reduce((s, o) => s + parseFloat(o.total_amount), 0);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const max = 5;
    if (totalPages <= max) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else if (currentPage <= 3) {
      for (let i = 1; i <= 4; i++) pages.push(i);
      pages.push('...'); pages.push(totalPages);
    } else if (currentPage >= totalPages - 2) {
      pages.push(1); pages.push('...');
      for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1); pages.push('...');
      for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
      pages.push('...'); pages.push(totalPages);
    }
    return pages;
  };

  // ── GST breakdown (shared between detail modal and print) ──────────────────

  const buildGSTBreakdown = (sale: Sale) => {
    const isInterstate = parseFloat(sale.igst_amount || '0') > 0;
    const breakdown: Record<number, { taxable: number; cgst: number; sgst: number; igst: number }> = {};
    let exempted = 0;
    let totalGST = 0;
    sale.items.forEach(item => {
      const taxable = parseFloat(item.quantity) * parseFloat(item.unit_price);
      const rate    = parseFloat(item.gst_rate) || 0;
      if (rate === 0) { exempted += taxable; return; }
      if (!breakdown[rate]) breakdown[rate] = { taxable: 0, cgst: 0, sgst: 0, igst: 0 };
      breakdown[rate].taxable += taxable;
      const tax = (taxable * rate) / 100;
      totalGST += tax;
      if (isInterstate) breakdown[rate].igst += tax;
      else { breakdown[rate].cgst += tax / 2; breakdown[rate].sgst += tax / 2; }
    });
    return { breakdown, exempted, totalGST, isInterstate };
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-header-icon"><ShoppingCart className="w-5 h-5" /></div>
          <div>
            <h1>Sales History</h1>
            <p>View and manage all sales transactions</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="stat-card">
          <div className="stat-card-stripe accent-indigo" />
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="stat-card-label">Total Sales</p>
              <p className="stat-card-value">{totalCount}</p>
            </div>
            <div className="stat-card-icon bg-primary-100 text-primary-600">
              <ShoppingCart className="w-5 h-5" />
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-stripe accent-emerald" />
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="stat-card-label">Total Revenue</p>
              <p className="stat-card-value">₹{totalRevenue.toFixed(2)}</p>
            </div>
            <div className="stat-card-icon bg-success-100 text-success-600">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filter-bar !py-3 !px-4 flex flex-wrap items-end gap-3">
        {/* From date */}
        <div className="flex flex-col gap-0.5">
          <label className="text-xs text-gray-400 px-0.5">From</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent transition-all bg-white text-gray-700" />
        </div>
        <span className="text-gray-400 text-sm pb-2">—</span>
        {/* To date */}
        <div className="flex flex-col gap-0.5">
          <label className="text-xs text-gray-400 px-0.5">To</label>
          <input type="date" value={endDate} min={startDate || undefined} onChange={e => setEndDate(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent transition-all bg-white text-gray-700" />
        </div>
        {/* Payment method */}
        <div className="flex flex-col gap-0.5">
          <label className="text-xs text-gray-400 px-0.5">Payment</label>
          <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent transition-all bg-white text-gray-700 pr-8 appearance-none"
            style={{backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%2394a3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,backgroundRepeat:'no-repeat',backgroundPosition:'right 0.5rem center',backgroundSize:'1rem'}}>
            <option value="">All Methods</option>
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="upi">UPI</option>
            <option value="net_banking">Net Banking</option>
            <option value="credit">Credit</option>
          </select>
        </div>
        {/* Status */}
        <div className="flex flex-col gap-0.5">
          <label className="text-xs text-gray-400 px-0.5">Status</label>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent transition-all bg-white text-gray-700 pr-8 appearance-none"
            style={{backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%2394a3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,backgroundRepeat:'no-repeat',backgroundPosition:'right 0.5rem center',backgroundSize:'1rem'}}>
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="completed">Completed</option>
            <option value="voided">Voided</option>
            <option value="corrected">Corrected</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <button
          onClick={() => { setStartDate(format(subMonths(new Date(), 1), 'yyyy-MM-dd')); setEndDate(format(new Date(), 'yyyy-MM-dd')); setPaymentMethod(''); setStatusFilter(''); }}
          className="text-xs text-gray-400 hover:text-gray-700 underline underline-offset-2 transition-colors pb-2 ml-auto"
        >
          Reset
        </button>
      </div>

      {/* Table */}
      <div className="section-card">
        {loading ? (
          <div className="loading-center">
            <div className="spinner" />
            <span className="text-sm text-gray-500">Loading sales…</span>
          </div>
        ) : sales.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><Calendar className="w-6 h-6" /></div>
            <p className="text-gray-700 font-medium">No sales found</p>
            <p className="text-sm text-gray-400 mt-1">Try adjusting the date range</p>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Date</th>
                  <th>Customer</th>
                  <th className="hidden md:table-cell">Payment</th>
                  <th className="th-right hidden sm:table-cell">Subtotal</th>
                  <th className="th-right hidden lg:table-cell">GST</th>
                  <th className="th-right">Total</th>
                  <th className="th-center">Status</th>
                  <th className="th-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sales.map(sale => (
                  <tr key={sale.id} className={sale.status === 'voided' ? 'opacity-60' : ''}>
                    <td className="font-semibold text-primary-600 text-xs">
                      {sale.order_number}
                      {sale.corrects_order && (
                        <span className="ml-1 text-amber-500 text-xs">(correction)</span>
                      )}
                    </td>
                    <td className="text-gray-600 whitespace-nowrap">
                      {format(new Date(sale.sale_date), 'MMM dd, yyyy')}
                    </td>
                    <td className="text-gray-600">{sale.customer_name || 'Guest'}</td>
                    <td className="text-gray-600 capitalize hidden md:table-cell">
                      {sale.payment_method?.replace('_', ' ') || '—'}
                    </td>
                    <td className="td-right text-gray-900 hidden sm:table-cell">₹{sale.subtotal}</td>
                    <td className="td-right text-gray-500 hidden lg:table-cell">₹{sale.gst_amount}</td>
                    <td className="td-right font-semibold text-gray-900">₹{sale.total_amount}</td>
                    <td className="td-center">
                      <StatusBadge status={sale.status} />
                    </td>
                    <td className="td-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* View */}
                        <button
                          onClick={() => setSelectedSaleId(sale.id)}
                          className="action-btn action-btn-primary"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Download */}
                        <button
                          onClick={() => { setSelectedSaleId(sale.id); setTimeout(handleDownloadInvoice, 500); }}
                          className="action-btn"
                          title="Download Bill"
                        >
                          <Download className="w-4 h-4" />
                        </button>

                        {/* Edit & Complete — draft bills only */}
                        {canComplete && sale.status === 'draft' && (
                          <>
                            <button
                              onClick={() => openEditModal(sale)}
                              className="action-btn text-blue-500 hover:bg-blue-50"
                              title="Edit Draft"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setCompleteTarget(sale)}
                              className="action-btn text-green-600 hover:bg-green-50"
                              title="Complete Bill"
                            >
                              <CheckSquare className="w-4 h-4" />
                            </button>
                          </>
                        )}

                        {/* Manager+ only actions */}
                        {canManage && (
                          <>
                            {/* Void — only for completed */}
                            {sale.status === 'completed' && (
                              <button
                                onClick={() => openVoidModal(sale)}
                                className="action-btn text-red-500 hover:bg-red-50"
                                title="Void Bill"
                              >
                                <Ban className="w-4 h-4" />
                              </button>
                            )}

                            {/* Correct — only for completed */}
                            {sale.status === 'completed' && (
                              <button
                                onClick={() => openCorrectModal(sale)}
                                className="action-btn text-amber-500 hover:bg-amber-50"
                                title="Correct Bill"
                              >
                                <GitBranch className="w-4 h-4" />
                              </button>
                            )}

                            {/* Audit log — all statuses */}
                            <button
                              onClick={() => openAuditModal(sale)}
                              className="action-btn text-gray-500 hover:bg-gray-100"
                              title="View Audit Log"
                            >
                              <ClipboardList className="w-4 h-4" />
                            </button>
                          </>
                        )}
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
          <div className="pagination-bar">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Show</span>
              <select value={pageSize} onChange={e => setPageSize(Number(e.target.value))} className="input-field py-1 px-2 text-sm w-20">
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-sm text-gray-500 whitespace-nowrap">
                entries ({startIndex + 1}–{endIndex} of {totalCount})
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="pag-btn">‹</button>
              {getPageNumbers().map((page, i) => (
                <button
                  key={i}
                  onClick={() => typeof page === 'number' && handlePageChange(page)}
                  disabled={page === '...'}
                  className={`pag-btn ${page === currentPage ? 'active' : ''} ${page === '...' ? 'dots' : ''}`}
                >
                  {page}
                </button>
              ))}
              <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="pag-btn">›</button>
            </div>
          </div>
        )}
      </div>

      {/* ── DETAIL MODAL ─────────────────────────────────────────────────────── */}
      {selectedSaleId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-gray-900">Sale Details</h2>
                {selectedSale && <StatusBadge status={selectedSale.status} />}
              </div>
              <button onClick={() => { setSelectedSaleId(null); setSelectedSale(null); }} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingDetail ? (
              <div className="p-12 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
                <p className="text-gray-600 mt-4">Loading details...</p>
              </div>
            ) : selectedSale ? (
              <div className="p-6 space-y-6">

                {/* Void notice */}
                {selectedSale.status === 'voided' && selectedSale.voided_reason && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-red-700">This bill has been voided</p>
                      <p className="text-sm text-red-600 mt-1">{selectedSale.voided_reason}</p>
                      {selectedSale.voided_at && (
                        <p className="text-xs text-red-400 mt-1">
                          {format(new Date(selectedSale.voided_at), 'MMM dd, yyyy HH:mm')}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Corrected notice */}
                {selectedSale.status === 'corrected' && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
                    <GitBranch className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-700">
                      This bill has been superseded by a correction. A new draft was created from it.
                    </p>
                  </div>
                )}

                {/* Correction link */}
                {selectedSale.corrects_order && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                    This bill is a correction of order #{selectedSale.corrects_order}.
                  </div>
                )}

                {/* Order info */}
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

                {/* Items */}
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
                        {selectedSale.items.map(item => (
                          <tr key={item.id} className="border-b border-gray-100">
                            <td className="py-2 px-3 text-sm text-gray-900">{item.product_name}</td>
                            <td className="py-2 px-3 text-sm text-right text-gray-600">{item.quantity}</td>
                            <td className="py-2 px-3 text-sm text-right text-gray-600">₹{item.unit_price}</td>
                            <td className="py-2 px-3 text-sm text-right text-gray-600">{item.gst_rate}%</td>
                            <td className="py-2 px-3 text-sm text-right font-medium text-gray-900">₹{item.total_with_gst}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Totals */}
                {(() => {
                  const { breakdown, exempted, totalGST, isInterstate } = buildGSTBreakdown(selectedSale);
                  return (
                    <div className="border-t border-gray-200 pt-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Subtotal</span>
                        <span className="font-medium text-gray-900">₹{selectedSale.subtotal}</span>
                      </div>

                      {Object.entries(breakdown).sort(([a], [b]) => Number(b) - Number(a)).map(([rate, bd]) => (
                        <React.Fragment key={rate}>
                          <div className="flex justify-between text-sm pt-1 border-t border-dashed border-gray-100">
                            <span className="text-gray-900 font-medium">Taxable ({rate}%)</span>
                            <span className="text-gray-900 font-medium">₹{bd.taxable.toFixed(2)}</span>
                          </div>
                          {isInterstate ? (
                            <div className="flex justify-between text-xs text-gray-500 pl-2">
                              <span>IGST @ {rate}%</span><span>₹{bd.igst.toFixed(2)}</span>
                            </div>
                          ) : (
                            <>
                              <div className="flex justify-between text-xs text-gray-500 pl-2">
                                <span>CGST @ {Number(rate) / 2}%</span><span>₹{bd.cgst.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between text-xs text-gray-500 pl-2">
                                <span>SGST @ {Number(rate) / 2}%</span><span>₹{bd.sgst.toFixed(2)}</span>
                              </div>
                            </>
                          )}
                        </React.Fragment>
                      ))}

                      {exempted > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Exempted (0%)</span>
                          <span>₹{exempted.toFixed(2)}</span>
                        </div>
                      )}

                      <div className="flex justify-between text-sm font-semibold pt-2 border-t border-gray-100">
                        <span className="text-gray-900">Total GST</span>
                        <span className="text-gray-900">₹{totalGST.toFixed(2)}</span>
                      </div>

                      {parseFloat(selectedSale.discount_amount) > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Discount</span>
                          <span className="font-medium text-danger-600">-₹{selectedSale.discount_amount}</span>
                        </div>
                      )}

                      {selectedSale.round_off !== 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Round Off</span>
                          <span>{Number(selectedSale.round_off) > 0 ? '+' : ''}₹{Number(selectedSale.round_off).toFixed(2)}</span>
                        </div>
                      )}

                      <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2">
                        <span className="text-gray-900">Total</span>
                        <span className="text-gray-900">₹{selectedSale.total_amount}</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Actions */}
                <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200">
                  <button onClick={handlePrintInvoice} className="btn btn-secondary flex items-center gap-2">
                    <Printer className="w-4 h-4" />Print Bill
                  </button>
                  <button onClick={handleDownloadInvoice} className="btn btn-primary flex items-center gap-2">
                    <Download className="w-4 h-4" />Download Bill
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* ── EDIT DRAFT MODAL ────────────────────────────────────────────────── */}
      {editTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">

            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <Pencil className="w-5 h-5 text-blue-500" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Edit Draft Bill</h3>
                  <p className="text-xs text-gray-500">{editTarget.order_number}</p>
                </div>
              </div>
              <button onClick={() => setEditTarget(null)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Items list */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {editItems.length === 0 && (
                <p className="text-sm text-red-500 text-center py-4">
                  At least one item is required before completing.
                </p>
              )}

              {editItems.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  {/* Product name */}
                  <div className="flex-1 min-w-0">
                    <label className="block text-xs text-gray-500 mb-1">Product</label>
                    <input
                      type="text"
                      value={item.product_name}
                      onChange={e => updateEditItem(idx, 'product_name', e.target.value)}
                      className="input-field w-full text-sm"
                    />
                  </div>

                  {/* Quantity */}
                  <div className="w-20 flex-shrink-0">
                    <label className="block text-xs text-gray-500 mb-1">Qty</label>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={item.quantity}
                      onChange={e => updateEditItem(idx, 'quantity', e.target.value)}
                      className="input-field w-full text-sm text-right"
                    />
                  </div>

                  {/* Unit price */}
                  <div className="w-28 flex-shrink-0">
                    <label className="block text-xs text-gray-500 mb-1">Unit Price ₹</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unit_price}
                      onChange={e => updateEditItem(idx, 'unit_price', e.target.value)}
                      className="input-field w-full text-sm text-right"
                    />
                  </div>

                  {/* GST rate */}
                  <div className="w-20 flex-shrink-0">
                    <label className="block text-xs text-gray-500 mb-1">GST %</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={item.gst_rate}
                      onChange={e => updateEditItem(idx, 'gst_rate', e.target.value)}
                      className="input-field w-full text-sm text-right"
                    />
                  </div>

                  {/* Line total preview */}
                  <div className="w-24 flex-shrink-0 text-right">
                    <label className="block text-xs text-gray-500 mb-1">Total</label>
                    <p className="text-sm font-semibold text-gray-800 pt-2">
                      ₹{(
                        (parseFloat(item.quantity) || 0) *
                        (parseFloat(item.unit_price) || 0) *
                        (1 + (parseFloat(item.gst_rate) || 0) / 100)
                      ).toFixed(2)}
                    </p>
                  </div>

                  {/* Remove */}
                  <div className="flex-shrink-0 pt-6">
                    <button
                      onClick={() => removeEditItem(idx)}
                      className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                      title="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Discount & Notes */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Discount %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={editDiscount}
                    onChange={e => setEditDiscount(e.target.value)}
                    className="input-field w-full text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Notes</label>
                  <input
                    type="text"
                    value={editNotes}
                    onChange={e => setEditNotes(e.target.value)}
                    className="input-field w-full text-sm"
                    placeholder="Optional note"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center flex-shrink-0">
              <p className="text-xs text-gray-400">Changes are saved to the draft — complete it when ready.</p>
              <div className="flex gap-3">
                <button onClick={() => setEditTarget(null)} className="btn btn-outline-secondary">
                  Cancel
                </button>
                <button
                  onClick={handleEditSave}
                  disabled={editLoading || editItems.length === 0}
                  className="btn btn-primary flex items-center gap-2"
                >
                  {editLoading
                    ? <><div className="spinner w-4 h-4" />Saving…</>
                    : <><Plus className="w-4 h-4" />Save Changes</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── COMPLETE MODAL ──────────────────────────────────────────────────── */}
      {completeTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-green-600" />
                <h3 className="text-lg font-semibold text-gray-900">Complete Bill</h3>
              </div>
              <button onClick={() => setCompleteTarget(null)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800">
                  You are about to finalize bill{' '}
                  <span className="font-mono font-bold">{completeTarget.order_number}</span>{' '}
                  for ₹{completeTarget.total_amount}.
                </p>
                <p className="text-sm text-green-700 mt-2">
                  Once completed, this bill will be locked. Use <strong>Correct</strong> if you need to make further changes.
                </p>
              </div>

              {/* Items summary */}
              <div className="text-sm text-gray-600 space-y-1 max-h-40 overflow-y-auto">
                {completeTarget.items.map((item, i) => (
                  <div key={i} className="flex justify-between">
                    <span>{item.product_name} × {item.quantity}</span>
                    <span className="font-medium">₹{item.total_with_gst}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={() => setCompleteTarget(null)} className="btn btn-outline-secondary">
                Cancel
              </button>
              <button
                onClick={handleCompleteConfirm}
                disabled={completeLoading}
                className="btn btn-primary flex items-center gap-2"
              >
                {completeLoading
                  ? <><div className="spinner w-4 h-4" />Completing…</>
                  : <><CheckSquare className="w-4 h-4" />Complete Bill</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── VOID MODAL ───────────────────────────────────────────────────────── */}
      {voidTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Ban className="w-5 h-5 text-red-500" />
                <h3 className="text-lg font-semibold text-gray-900">Void Bill</h3>
              </div>
              <button onClick={() => setVoidTarget(null)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-700">
                  <p className="font-semibold">This action cannot be undone.</p>
                  <p className="mt-1">
                    Bill <span className="font-mono font-bold">{voidTarget.order_number}</span> (₹{voidTarget.total_amount})
                    will be voided. All associated ledger entries and stock movements will be reversed.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason for voiding <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={voidReason}
                  onChange={e => setVoidReason(e.target.value)}
                  placeholder="Enter reason (minimum 5 characters)"
                  rows={3}
                  className="input-field w-full resize-none"
                />
                {voidReason.length > 0 && voidReason.trim().length < 5 && (
                  <p className="text-xs text-red-500 mt-1">Reason must be at least 5 characters.</p>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={() => setVoidTarget(null)} className="btn btn-outline-secondary">
                Cancel
              </button>
              <button
                onClick={handleVoidConfirm}
                disabled={voidLoading || voidReason.trim().length < 5}
                className="btn btn-danger flex items-center gap-2"
              >
                {voidLoading ? <div className="spinner w-4 h-4" /> : <Ban className="w-4 h-4" />}
                {voidLoading ? 'Voiding…' : 'Void Bill'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CORRECT MODAL ────────────────────────────────────────────────────── */}
      {correctTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GitBranch className="w-5 h-5 text-amber-500" />
                <h3 className="text-lg font-semibold text-gray-900">Correct Bill</h3>
              </div>
              <button onClick={() => setCorrectTarget(null)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2">
                <Clock className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-700">
                  <p className="font-semibold">A new draft bill will be created.</p>
                  <p className="mt-1">
                    Bill <span className="font-mono font-bold">{correctTarget.order_number}</span> will be
                    marked as <em>Corrected</em>. A new editable draft with all the same items will be
                    created for you to fix and complete.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason for correction <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={correctReason}
                  onChange={e => setCorrectReason(e.target.value)}
                  placeholder="Enter reason (minimum 5 characters)"
                  rows={3}
                  className="input-field w-full resize-none"
                />
                {correctReason.length > 0 && correctReason.trim().length < 5 && (
                  <p className="text-xs text-red-500 mt-1">Reason must be at least 5 characters.</p>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={() => setCorrectTarget(null)} className="btn btn-outline-secondary">
                Cancel
              </button>
              <button
                onClick={handleCorrectConfirm}
                disabled={correctLoading || correctReason.trim().length < 5}
                className="btn btn-warning flex items-center gap-2"
              >
                {correctLoading ? <div className="spinner w-4 h-4" /> : <GitBranch className="w-4 h-4" />}
                {correctLoading ? 'Creating…' : 'Create Correction'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── AUDIT LOG MODAL ──────────────────────────────────────────────────── */}
      {auditTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-gray-500" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Audit Log</h3>
                  <p className="text-xs text-gray-500">{auditTarget.order_number}</p>
                </div>
              </div>
              <button onClick={() => setAuditTarget(null)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-6">
              {auditLoading ? (
                <div className="flex justify-center py-8">
                  <div className="spinner" />
                </div>
              ) : auditLogs.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-8">No audit entries found.</p>
              ) : (
                <ol className="relative border-l border-gray-200 space-y-6 ml-2">
                  {auditLogs.map(log => (
                    <li key={log.id} className="ml-6">
                      <span className="absolute -left-3 flex items-center justify-center w-6 h-6 bg-white border border-gray-200 rounded-full">
                        {ACTION_ICONS[log.action] ?? <Clock className="w-3 h-3 text-gray-400" />}
                      </span>
                      <div className="p-3 bg-gray-50 border border-gray-100 rounded-lg">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-sm font-semibold text-gray-800">{log.action_display}</span>
                          <span className="text-xs text-gray-400 whitespace-nowrap">
                            {format(new Date(log.timestamp), 'MMM dd, HH:mm')}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">by {log.user_name || 'System'}</p>
                        {log.reason && (
                          <p className="text-xs text-gray-600 mt-1 italic">"{log.reason}"</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Sales;
