import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Plus, Eye, X, Printer, ChevronRight, ChevronLeft, Search, User, Share2, Mail, Copy, Check, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useReactToPrint } from 'react-to-print';
// import html2pdf from 'html2pdf.js';
import { invoiceService } from '../../api/services/invoice.service';
import { saleService } from '../../api/services/sale.service';
import { customerService } from '../../api/services/customer.service';
import { stateService } from '../../api/services/state.service';
import { TaxInvoice, TaxInvoiceCreate } from '../../types/invoice.types';
import { SaleOrder } from '../../types/sale.types';
import { Customer } from '../../types/customer.types';
import { StateMaster } from '../../types/state.types';
import InvoiceTemplate from '../../components/invoices/InvoiceTemplate';

const Invoices: React.FC = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<TaxInvoice[]>([]);
  const [sales, setSales] = useState<SaleOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [states, setStates] = useState<StateMaster[]>([]);
  const [searchingCustomers, setSearchingCustomers] = useState(false);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);

  // Pagination and search
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [saleSearchQuery, setSaleSearchQuery] = useState('');
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  // Sale order pagination
  const [salePage, setSalePage] = useState(1);
  const [saleTotalPages, setSaleTotalPages] = useState(1);
  const [loadingSales, setLoadingSales] = useState(false);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedSale, setSelectedSale] = useState<SaleOrder | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<number | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<TaxInvoice | null>(null);
  const [creating, setCreating] = useState(false);

  // Customer details form
  const [customerDetails, setCustomerDetails] = useState<Partial<TaxInvoiceCreate>>({
    customer_name: '',
    customer_gstin: '',
    customer_address: '',
    customer_city: '',
    customer_state: undefined,
    customer_pincode: '',
    customer_phone: '',
    customer_email: '',
  });

  // Form errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  const invoiceRef = useRef<HTMLDivElement>(null);
  const shareMenuRef = useRef<HTMLDivElement>(null);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  // const [downloading, setDownloading] = useState(false);

  // Close share menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (shareMenuRef.current && !shareMenuRef.current.contains(e.target as Node)) {
        setShowShareMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Debounce search input → searchQuery (triggers API)
  useEffect(() => {
    const id = setTimeout(() => setSearchQuery(searchInput), 400);
    return () => clearTimeout(id);
  }, [searchInput]);

  // Fetch data on mount and when page/search/date changes
  useEffect(() => {
    fetchInvoices();
  }, [currentPage, searchQuery, dateFrom, dateTo, pageSize]);

  useEffect(() => {
    fetchStates();
  }, []);


  useEffect(() => {
    if (showCreateModal && currentStep === 1) {
      fetchSales();
    }
  }, [showCreateModal, currentStep]);

  // Debounced sale search
  useEffect(() => {
    if (currentStep !== 1) return;

    const searchSales = async () => {
      try {
        setLoadingSales(true);
        let data;
        if (saleSearchQuery) {
          data = await saleService.search(saleSearchQuery, salePage, 10, { hasInvoice: false });
        } else {
          data = await saleService.getAll(salePage, 10, { hasInvoice: false });
        }
        setSales(data.results);
        setSaleTotalPages(Math.ceil(data.count / 10));
      } catch (error) {
        console.error('Error fetching sales:', error);
      } finally {
        setLoadingSales(false);
      }
    };

    const timeoutId = setTimeout(searchSales, 300); // 300ms debounce
    return () => clearTimeout(timeoutId);
  }, [saleSearchQuery, salePage, currentStep]);

  // Debounced customer search
  useEffect(() => {
    if (!showCustomerDropdown) return;

    const searchCustomers = async () => {
      if (!customerSearchQuery || customerSearchQuery.length < 2) {
        setCustomers([]);
        return;
      }

      try {
        setSearchingCustomers(true);
        const data = await customerService.search(customerSearchQuery);
        setCustomers(data.results || data);
      } catch (error) {
        console.error('Error searching customers:', error);
      } finally {
        setSearchingCustomers(false);
      }
    };

    const timeoutId = setTimeout(searchCustomers, 300); // 300ms debounce
    return () => clearTimeout(timeoutId);
  }, [customerSearchQuery, showCustomerDropdown]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const filters: any = {
        page: currentPage,
        page_size: pageSize,
      };
      if (searchQuery.trim()) filters.search = searchQuery.trim();
      if (dateFrom) filters.start_date = dateFrom;
      if (dateTo) filters.end_date = dateTo;

      const data = await invoiceService.getInvoices(filters);
      setInvoices(data.results);
      setTotalCount(data.count);
      setTotalPages(Math.ceil(data.count / pageSize));
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  };

  // Reset to page 1 when filters or page size change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchInput, dateFrom, dateTo, pageSize]);

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

  const fetchSales = async () => {
    try {
      setLoadingSales(true);
      const salesData = await saleService.getAll(1, 10, { hasInvoice: false });
      setSales(salesData.results);
      setSaleTotalPages(Math.ceil(salesData.count / 10));
    } catch (error) {
      console.error('Error fetching sales:', error);
    } finally {
      setLoadingSales(false);
    }
  };

  const fetchStates = async () => {
    try {
      const data = await stateService.getAll();
      setStates(data);
    } catch (error) {
      console.error('Error fetching states:', error);
    }
  };

  // Print handler
  const handlePrint = useReactToPrint({
    contentRef: invoiceRef,
    documentTitle: `${viewingInvoice?.invoice_number || 'Invoice'}`,
  });

  // const handleDownloadPDF = async () => {
  //   if (!invoiceRef.current || !viewingInvoice) return;
  //   setDownloading(true);
  //   const opt = {
  //     margin: [8, 8, 8, 8] as [number, number, number, number],
  //     filename: `Invoice_${viewingInvoice.invoice_number}.pdf`,
  //     image: { type: 'jpeg' as const, quality: 0.98 },
  //     html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
  //     jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const },
  //     pagebreak: { mode: ['css', 'legacy'], before: '.invoice-page:not(:first-child)' },
  //   };
  //   try {
  //     await html2pdf().set(opt).from(invoiceRef.current).save();
  //   } finally {
  //     setDownloading(false);
  //   }
  // };

  const getShareUrl = () =>
    viewingInvoice ? `${window.location.origin}/invoices/${viewingInvoice.id}` : '';

  const handleShareWhatsApp = () => {
    if (!viewingInvoice) return;
    const text = encodeURIComponent(
      `Invoice ${viewingInvoice.invoice_number} — ${viewingInvoice.customer_name}\n${getShareUrl()}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
    setShowShareMenu(false);
  };

  const handleShareEmail = () => {
    if (!viewingInvoice) return;
    const subject = encodeURIComponent(`Invoice ${viewingInvoice.invoice_number}`);
    const body = encodeURIComponent(
      `Invoice ${viewingInvoice.invoice_number} — ${viewingInvoice.customer_name}\n\nView invoice: ${getShareUrl()}`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`);
    setShowShareMenu(false);
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(getShareUrl());
    setCopied(true);
    setShowShareMenu(false);
    setTimeout(() => setCopied(false), 2000);
  };

  // Filter sales without invoices (now handled by API)
  const availableSales = sales;

  // Reset modal
  const resetModal = () => {
    setShowCreateModal(false);
    setCurrentStep(1);
    setSelectedSale(null);
    setSelectedCustomer(null);
    setSalePage(1);
    setSaleSearchQuery('');
    setCustomerSearchQuery('');
    setErrors({});
    setCustomerDetails({
      customer_name: '',
      customer_gstin: '',
      customer_address: '',
      customer_city: '',
      customer_state: undefined,
      customer_pincode: '',
      customer_phone: '',
      customer_email: '',
    });
  };

  // Step 1: Select sale order
  const handleSelectSale = (saleId: number) => {
    const sale = availableSales.find((s) => s.id === saleId);
    if (sale) {
      setSelectedSale(sale);
      setCustomerDetails({
        customer_name: sale.customer_name || '',
        customer_gstin: '',
        customer_address: '',
        customer_city: '',
        customer_state: undefined,
        customer_pincode: '',
        customer_phone: '',
        customer_email: '',
      });
      setCurrentStep(2);
    }
  };

  // Handle customer selection
  const handleCustomerSelect = (customerId: number) => {
    const customer = customers.find((c) => c.id === customerId);
    if (customer) {
      setSelectedCustomer(customerId);

      setCustomerDetails({
        customer_name: customer.name,
        customer_gstin: (customer as any).gstin || '',
        customer_address: (customer as any).billing_address_line1 || (customer as any).address_line1 || '',
        customer_city: (customer as any).billing_city || (customer as any).city || '',
        customer_state: Number((customer as any).state) || 0,
        customer_pincode: (customer as any).billing_pincode || (customer as any).pincode || '',
        customer_phone: customer.phone || '',
        customer_email: customer.email || '',
      });
      setErrors({});
    }
  };

  // Step 2: Update customer details
  const handleCustomerDetailChange = (field: keyof TaxInvoiceCreate, value: string) => {
    setCustomerDetails((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!customerDetails.customer_name?.trim()) {
      newErrors.customer_name = 'Customer name is required';
    }

    if (customerDetails.customer_pincode && !/^\d{6}$/.test(customerDetails.customer_pincode)) {
      newErrors.customer_pincode = 'Pincode must be 6 digits';
    }

    if (customerDetails.customer_phone && !/^\+?[\d\s-]{10,15}$/.test(customerDetails.customer_phone)) {
      newErrors.customer_phone = 'Invalid phone number';
    }

    if (customerDetails.customer_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerDetails.customer_email)) {
      newErrors.customer_email = 'Invalid email address';
    }

    if (customerDetails.customer_gstin && !customerDetails.customer_state) {
      newErrors.customer_state = 'State is required when GSTIN is provided';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Step 3: Generate invoice
  const handleGenerateInvoice = async () => {
    if (!selectedSale || !validateForm()) return;

    try {
      setCreating(true);

      const invoiceData: TaxInvoiceCreate = {
        sale_order_id: selectedSale.id,
      };

      // Only add fields that have values
      if (customerDetails.customer_name?.trim()) {
        invoiceData.customer_name = customerDetails.customer_name.trim();
      }
      if (customerDetails.customer_gstin?.trim()) {
        invoiceData.customer_gstin = customerDetails.customer_gstin.trim();
      }
      if (customerDetails.customer_address?.trim()) {
        invoiceData.customer_address = customerDetails.customer_address.trim();
      }
      if (customerDetails.customer_city?.trim()) {
        invoiceData.customer_city = customerDetails.customer_city.trim();
      }
      if (customerDetails.customer_pincode?.trim()) {
        invoiceData.customer_pincode = customerDetails.customer_pincode.trim();
      }
      if (customerDetails.customer_phone?.trim()) {
        invoiceData.customer_phone = customerDetails.customer_phone.trim();
      }
      if (customerDetails.customer_email?.trim()) {
        invoiceData.customer_email = customerDetails.customer_email.trim();
      }
      if (customerDetails.customer_state) {
        invoiceData.customer_state = Number(customerDetails.customer_state);
      }

      const created = await invoiceService.createInvoice(invoiceData);
      resetModal();
      navigate(`/invoices/${created.id}`);
    } catch (error: any) {
      console.error('Error creating invoice:', error);
      const errorMessage = error?.response?.data?.error ||
                          error?.response?.data?.sale_order_id?.[0] ||
                          'Failed to create invoice. Please try again.';
      alert(errorMessage);
    } finally {
      setCreating(false);
    }
  };

  // Animation state for modals
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);

  // Animated open
  const openCreateModal = useCallback(() => {
    setShowCreateModal(true);
    requestAnimationFrame(() => setCreateModalVisible(true));
  }, []);

  const closeCreateModal = useCallback(() => {
    setCreateModalVisible(false);
    setTimeout(resetModal, 200);
  }, []);

  const openViewModal = useCallback((invoice: TaxInvoice) => {
    setViewingInvoice(invoice);
    requestAnimationFrame(() => setViewModalVisible(true));
  }, []);

  const closeViewModal = useCallback(() => {
    setViewModalVisible(false);
    setTimeout(() => setViewingInvoice(null), 200);
  }, []);

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-10 h-10 border-gray-200 border-t-gray-600 rounded-full animate-spin mx-auto mb-3" style={{borderWidth: 3, borderStyle: 'solid'}}></div>
          <p className="text-sm text-gray-500">Loading invoices…</p>
        </div>
      </div>
    );
  }

  const stepLabels = ['Select Sale', 'Customer Details', 'Preview'];

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-gray-500" />
            Tax Invoices
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Generate and manage GST invoices</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Generate Invoice
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        {/* Search */}
        <div className="flex flex-col gap-0.5 flex-1 min-w-[220px] max-w-sm">
          <label className="text-xs text-gray-400 px-0.5">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Invoice no, customer, sale order…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent transition-all bg-white"
            />
            {searchInput && (
              <button onClick={() => setSearchInput('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Date range */}
        <div className="flex flex-col gap-0.5">
          <label className="text-xs text-gray-400 px-0.5">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent transition-all bg-white text-gray-700"
          />
        </div>
        <span className="text-gray-400 text-sm pb-2">—</span>
        <div className="flex flex-col gap-0.5">
          <label className="text-xs text-gray-400 px-0.5">To</label>
          <input
            type="date"
            value={dateTo}
            min={dateFrom || undefined}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent transition-all bg-white text-gray-700"
          />
        </div>
        {(dateFrom || dateTo) && (
          <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="text-xs text-gray-400 hover:text-gray-700 underline underline-offset-2 transition-colors pb-2">
            Clear
          </button>
        )}
      </div>

      {/* Table Card */}
      <div className="bg-white border border-gray-200 rounded-xl flex-1 flex flex-col min-h-0 overflow-hidden shadow-sm relative">
        {/* Inline loading overlay — shown on search/page changes without unmounting */}
        {loading && !initialLoading && (
          <div className="absolute inset-0 bg-white/70 z-10 flex items-center justify-center rounded-xl">
            <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-600 rounded-full animate-spin" />
          </div>
        )}

        {!loading && invoices.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-16 text-center">
            <FileText className="w-12 h-12 text-gray-200 mb-3" />
            <p className="text-sm font-medium text-gray-500">
              {searchInput || dateFrom || dateTo ? 'No invoices match the current filters' : 'No invoices yet'}
            </p>
            {!searchInput && !dateFrom && !dateTo && (
              <button
                onClick={openCreateModal}
                className="mt-4 px-4 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Generate First Invoice
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col h-full min-h-0">
            <div className="flex-1 overflow-x-auto overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    <th className="text-left py-3 px-4 font-semibold text-gray-500 text-xs uppercase tracking-wide">Invoice #</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-500 text-xs uppercase tracking-wide">Date</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-500 text-xs uppercase tracking-wide">Customer</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-500 text-xs uppercase tracking-wide">Sale Order</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-500 text-xs uppercase tracking-wide">Amount</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-500 text-xs uppercase tracking-wide">Status</th>
                    <th className="py-3 px-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-gray-50/70 transition-colors group">
                      <td className="py-3.5 px-4 font-semibold text-gray-800 font-mono text-sm">{invoice.invoice_number}</td>
                      <td className="py-3.5 px-4 text-gray-600 text-sm">{format(new Date(invoice.invoice_date), 'dd MMM yyyy')}</td>
                      <td className="py-3.5 px-4 text-gray-700 text-sm">{invoice.customer_name || '—'}</td>
                      <td className="py-3.5 px-4 text-gray-500 font-mono text-sm">{invoice.sale_order_data?.order_number}</td>
                      <td className="py-3.5 px-4 text-right font-semibold text-gray-800 text-sm">
                        ₹{Math.round(invoice.sale_order_data?.total_amount || 0).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {invoice.is_cancelled ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-600 border border-red-100">Cancelled</span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-100">Active</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => openViewModal(invoice)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Eye className="w-3.5 h-3.5" /> View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalCount > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-gray-100 bg-gray-50/40 shrink-0">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span>Show</span>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="border border-gray-200 rounded px-1.5 py-1 text-sm outline-none focus:ring-1 focus:ring-gray-400 bg-white"
                  >
                    {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                  <span>— {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, totalCount)} of {totalCount}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}
                    className="px-2.5 py-1.5 text-sm border border-gray-200 rounded hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {getPageNumbers().map((page, i) => (
                    <button key={i} onClick={() => typeof page === 'number' && handlePageChange(page)} disabled={page === '...'}
                      className={`px-3 py-1.5 text-sm border rounded transition-colors ${
                        page === currentPage ? 'bg-gray-900 text-white border-gray-900' :
                        page === '...' ? 'border-transparent cursor-default text-gray-400' :
                        'border-gray-200 hover:bg-white'}`}>
                      {page}
                    </button>
                  ))}
                  <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}
                    className="px-2.5 py-1.5 text-sm border border-gray-200 rounded hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Create Invoice Modal ── */}
      {showCreateModal && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-200 ${createModalVisible ? 'bg-black/40' : 'bg-black/0'}`}
          onClick={(e) => { if (e.target === e.currentTarget) closeCreateModal(); }}
        >
          <div className={`bg-white rounded-xl shadow-2xl w-full max-w-4xl w-[95vw] h-[95vh] flex flex-col transition-all duration-200 ${createModalVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-base font-bold text-gray-900">Generate Invoice</h2>
                {/* Step progress */}
                <div className="flex items-center gap-2 mt-2">
                  {stepLabels.map((label, i) => {
                    const step = i + 1;
                    const done = currentStep > step;
                    const active = currentStep === step;
                    return (
                      <React.Fragment key={step}>
                        <div className="flex items-center gap-1.5">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${
                            done ? 'bg-gray-900 text-white' : active ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-400'}`}>
                            {done ? '✓' : step}
                          </div>
                          <span className={`text-xs font-medium transition-colors ${active ? 'text-gray-900' : 'text-gray-400'}`}>{label}</span>
                        </div>
                        {i < stepLabels.length - 1 && (
                          <div className={`h-px w-6 transition-colors ${currentStep > step ? 'bg-gray-900' : 'bg-gray-200'}`} />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
              <button onClick={closeCreateModal} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-auto p-6">

              {/* Step 1 */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search by order number or customer…"
                      value={saleSearchQuery}
                      onChange={(e) => { setSaleSearchQuery(e.target.value); setSalePage(1); }}
                      className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-gray-400 transition-all"
                    />
                  </div>

                  {loadingSales ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                      <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin mb-2" />
                      <span className="text-xs">Loading…</span>
                    </div>
                  ) : availableSales.length === 0 ? (
                    <div className="text-center py-10 text-sm text-gray-400">
                      {saleSearchQuery ? `No sales matching "${saleSearchQuery}"` : 'All sales already have invoices'}
                    </div>
                  ) : (
                    <>
                      <div className="space-y-1.5 max-h-[60vh] overflow-y-auto pr-1">
                        {availableSales.map((sale) => (
                          <button
                            key={sale.id}
                            onClick={() => handleSelectSale(sale.id)}
                            className="w-full flex items-center justify-between p-3.5 border border-gray-200 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-all text-left group"
                          >
                            <div>
                              <p className="font-semibold text-sm text-gray-800 font-mono">{sale.order_number}</p>
                              <p className="text-xs text-gray-500 mt-0.5">{sale.customer_name || 'Walk-in'} · {format(new Date(sale.sale_date), 'dd MMM yyyy')}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-gray-700">₹{Math.round(sale.total_amount).toLocaleString()}</span>
                              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-600 transition-colors" />
                            </div>
                          </button>
                        ))}
                      </div>
                      {saleTotalPages > 1 && (
                        <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs text-gray-500">
                          <span>Page {salePage} of {saleTotalPages}</span>
                          <div className="flex gap-1">
                            <button onClick={() => setSalePage(p => Math.max(1, p - 1))} disabled={salePage === 1}
                              className="px-2.5 py-1 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40 transition-colors">
                              <ChevronLeft className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setSalePage(p => Math.min(saleTotalPages, p + 1))} disabled={salePage === saleTotalPages}
                              className="px-2.5 py-1 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40 transition-colors">
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Step 2 */}
              {currentStep === 2 && selectedSale && (
                <div className="space-y-4">
                  {/* Sale summary pill */}
                  <div className="flex items-center gap-3 px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm">
                    <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="font-mono font-semibold text-gray-700">{selectedSale.order_number}</span>
                    <span className="text-gray-400">·</span>
                    <span className="font-semibold text-gray-700">₹{Math.round(selectedSale.total_amount).toLocaleString()}</span>
                  </div>

                  {/* Customer lookup */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Load from existing customer <span className="text-gray-400 font-normal">(optional)</span></label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowCustomerDropdown(!showCustomerDropdown)}
                        className="w-full flex items-center justify-between px-3 py-2 text-sm border border-gray-200 rounded-lg hover:border-gray-400 transition-colors bg-white text-left"
                      >
                        <div className="flex items-center gap-2 text-gray-500">
                          <User className="w-4 h-4" />
                          <span className={selectedCustomer ? 'text-gray-900 font-medium' : ''}>
                            {selectedCustomer ? customers.find(c => c.id === selectedCustomer)?.name : 'Select a customer…'}
                          </span>
                        </div>
                        <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${showCustomerDropdown ? 'rotate-90' : ''}`} />
                      </button>

                      {showCustomerDropdown && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                          <div className="p-2 border-b border-gray-100 sticky top-0 bg-white">
                            <div className="relative">
                              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                              <input
                                type="text"
                                placeholder="Search customers…"
                                value={customerSearchQuery}
                                onChange={(e) => setCustomerSearchQuery(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-gray-400"
                                autoFocus
                              />
                            </div>
                          </div>
                          <div className="max-h-52 overflow-y-auto">
                            <button type="button" onClick={() => { setSelectedCustomer(null); setShowCustomerDropdown(false); setCustomerSearchQuery(''); }}
                              className="w-full text-left px-3 py-2 text-xs text-gray-400 hover:bg-gray-50 border-b border-gray-50 italic">
                              Enter manually
                            </button>
                            {searchingCustomers ? (
                              <div className="py-6 text-center text-xs text-gray-400">
                                <div className="w-4 h-4 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin mx-auto mb-1" />Searching…
                              </div>
                            ) : customerSearchQuery.length < 2 ? (
                              <div className="py-6 text-center text-xs text-gray-400">Type at least 2 characters</div>
                            ) : customers.length === 0 ? (
                              <div className="py-6 text-center text-xs text-gray-400">No customers found</div>
                            ) : customers.filter(c => !c.is_guest).map((customer) => (
                              <button key={customer.id} type="button"
                                onClick={() => { handleCustomerSelect(customer.id); setShowCustomerDropdown(false); setCustomerSearchQuery(''); }}
                                className={`w-full text-left px-3 py-2.5 hover:bg-gray-50 transition-colors ${selectedCustomer === customer.id ? 'bg-gray-50' : ''}`}>
                                <div className="text-sm font-medium text-gray-800">{customer.name}</div>
                                {customer.phone && <div className="text-xs text-gray-400">{customer.phone}</div>}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-gray-100 pt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      { label: 'Customer Name', field: 'customer_name', required: true, placeholder: 'Full name' },
                      { label: 'GSTIN', field: 'customer_gstin', placeholder: '22AAAAA0000A1Z5' },
                      { label: 'Phone', field: 'customer_phone', placeholder: '+91 9876543210', type: 'tel' },
                      { label: 'Email', field: 'customer_email', placeholder: 'customer@example.com', type: 'email' },
                      { label: 'City', field: 'customer_city', placeholder: 'City' },
                      { label: 'Pincode', field: 'customer_pincode', placeholder: '123456', maxLength: 6 },
                    ].map(({ label, field, required, placeholder, type, maxLength }) => (
                      <div key={field}>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          {label}{required && <span className="text-red-500 ml-0.5">*</span>}
                        </label>
                        <input
                          type={type || 'text'}
                          placeholder={placeholder}
                          maxLength={maxLength}
                          value={(customerDetails as any)[field] || ''}
                          onChange={(e) => handleCustomerDetailChange(field as keyof TaxInvoiceCreate, e.target.value)}
                          className={`w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent transition-all ${errors[field] ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
                        />
                        {errors[field] && <p className="text-xs text-red-500 mt-1">{errors[field]}</p>}
                      </div>
                    ))}

                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Address</label>
                      <input
                        type="text"
                        placeholder="Street address"
                        value={customerDetails.customer_address || ''}
                        onChange={(e) => handleCustomerDetailChange('customer_address', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        State {errors.customer_state && <span className="text-red-500">*</span>}
                      </label>
                      <select
                        value={customerDetails.customer_state || ''}
                        onChange={(e) => handleCustomerDetailChange('customer_state', e.target.value ? parseInt(e.target.value) : undefined as any)}
                        className={`w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent transition-all ${errors.customer_state ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
                      >
                        <option value="">Select state</option>
                        {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                      {errors.customer_state && <p className="text-xs text-red-500 mt-1">{errors.customer_state}</p>}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3 */}
              {currentStep === 3 && selectedSale && (
                <div className="bg-gray-50 rounded-lg overflow-auto max-h-[80vh] border border-gray-200">
                  <InvoiceTemplate
                    saleOrder={selectedSale}
                    invoiceNumber="PREVIEW"
                    invoiceDate={new Date().toISOString()}
                    customerDetails={{
                      name: customerDetails.customer_name,
                      gstin: customerDetails.customer_gstin,
                      address: customerDetails.customer_address,
                      city: customerDetails.customer_city,
                      state: states.find(s => s.id === customerDetails.customer_state)?.name,
                      pincode: customerDetails.customer_pincode,
                      phone: customerDetails.customer_phone,
                      email: customerDetails.customer_email,
                    }}
                  />
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-xl">
              <button
                onClick={() => currentStep > 1 ? setCurrentStep(currentStep - 1) : closeCreateModal()}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                {currentStep === 1 ? 'Cancel' : 'Back'}
              </button>
              {currentStep < 3 ? (
                <button
                  onClick={() => { if (currentStep === 2 && !validateForm()) return; setCurrentStep(currentStep + 1); }}
                  disabled={currentStep === 1 && !selectedSale}
                  className="flex items-center gap-1.5 px-5 py-2 text-sm font-semibold bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleGenerateInvoice}
                  disabled={creating}
                  className="flex items-center gap-1.5 px-5 py-2 text-sm font-semibold bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {creating ? (
                    <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generating…</>
                  ) : (
                    <><FileText className="w-3.5 h-3.5" /> Generate Invoice</>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── View Invoice Modal ── */}
      {viewingInvoice && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-200 ${viewModalVisible ? 'bg-black/40' : 'bg-black/0'}`}
          onClick={(e) => { if (e.target === e.currentTarget) closeViewModal(); }}
        >
          <div className={`bg-white rounded-xl shadow-2xl w-fullw-[95vw] h-[95vh] max-w-none flex flex-col transition-all duration-200 ${viewModalVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <p className="font-bold text-gray-900 font-mono">{viewingInvoice.invoice_number}</p>
                <p className="text-sm text-gray-500 mt-0.5">{format(new Date(viewingInvoice.invoice_date), 'dd MMMM yyyy')} · {viewingInvoice.customer_name}</p>
              </div>
              <div className="flex items-center gap-2">
                {/* Download PDF */}
                {/* <button
                  onClick={handleDownloadPDF}
                  disabled={downloading}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  {downloading
                    ? <div className="w-3.5 h-3.5 border-2 border-gray-400 border-t-gray-700 rounded-full animate-spin" />
                    : <Download className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">PDF</span>
                </button> */}

                {/* Print */}
                <button
                  onClick={() => handlePrint()}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Print</span>
                </button>

                {/* Copy feedback */}
                {copied && (
                  <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                    <Check className="w-3.5 h-3.5" /> Copied!
                  </span>
                )}

                {/* Share */}
                <div className="relative" ref={shareMenuRef}>
                  <button
                    onClick={() => setShowShareMenu(v => !v)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Share</span>
                  </button>
                  {showShareMenu && (
                    <div className="absolute right-0 top-full mt-1.5 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-50">
                      <button onClick={handleShareWhatsApp} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                        <MessageCircle className="w-4 h-4 text-green-500" /> WhatsApp
                      </button>
                      <button onClick={handleShareEmail} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                        <Mail className="w-4 h-4 text-blue-500" /> Email
                      </button>
                      <button onClick={handleCopyLink} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                        <Copy className="w-4 h-4 text-gray-500" /> Copy Link
                      </button>
                    </div>
                  )}
                </div>

                <button onClick={closeViewModal} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4 bg-gray-50">
              <div ref={invoiceRef}>
                <InvoiceTemplate
                  saleOrder={viewingInvoice.sale_order_data}
                  invoiceNumber={viewingInvoice.invoice_number}
                  invoiceDate={viewingInvoice.invoice_date}
                  customerDetails={{
                    name: viewingInvoice.customer_name,
                    gstin: viewingInvoice.customer_gstin,
                    address: viewingInvoice.customer_address,
                    city: viewingInvoice.customer_city,
                    pincode: viewingInvoice.customer_pincode,
                    phone: viewingInvoice.customer_phone,
                    email: viewingInvoice.customer_email,
                  }}
                />
              </div>
            </div>

            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex justify-end rounded-b-xl">
              <button onClick={closeViewModal}
                className="px-4 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Invoices;
