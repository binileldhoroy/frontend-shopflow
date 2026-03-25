import React, { useState, useRef, useEffect } from 'react';
import { FileText, Plus, Eye, X, Printer, ChevronRight, ChevronLeft, Search, User } from 'lucide-react';
import { format } from 'date-fns';
import { useReactToPrint } from 'react-to-print';
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
  const [invoices, setInvoices] = useState<TaxInvoice[]>([]);
  const [sales, setSales] = useState<SaleOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [states, setStates] = useState<StateMaster[]>([]);
  const [searchingCustomers, setSearchingCustomers] = useState(false);
  const [loading, setLoading] = useState(true);

  // Pagination and search
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
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

  // Fetch data on mount and when page/search changes
  useEffect(() => {
    fetchInvoices();
    fetchStates();
  }, [currentPage, searchQuery, pageSize]);


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
          data = await saleService.search(saleSearchQuery, salePage, 10);
        } else {
          data = await saleService.getAll(salePage, 10);
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
        page_size: pageSize
      };
      if (searchQuery) {
        filters.invoice_number = searchQuery;
      }

      const data = await invoiceService.getInvoices(filters);
      setInvoices(data.results);
      setTotalCount(data.count);
      setTotalPages(Math.ceil(data.count / pageSize));
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  // Reset to page 1 when filters or page size change
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [searchQuery, pageSize]);

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
      const salesData = await saleService.getAll(1, 10);
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

  // Filter sales without invoices
  const availableSales = sales.filter(
    (sale) => !invoices.some((inv) => inv.sale_order === sale.id && !inv.is_cancelled)
  );

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

      await invoiceService.createInvoice(invoiceData);
      await fetchInvoices();
      resetModal();
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

  if (loading && currentPage === 1) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading invoices...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Tax Invoices</h1>
          <p className="text-gray-600">Generate and manage GST invoices</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Generate Invoice
        </button>
      </div>

      {/* Search and Filters */}
      <div className="mb-4 flex gap-4">
        <div className="flex-1 relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by invoice number..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="input-field pl-10"
          />
        </div>
      </div>

      {/* Invoices Table */}
      <div className="card flex-1 flex flex-col min-h-0 overflow-hidden">
        {invoices.length === 0 ? (
          <div className="text-center py-12 flex-1">
            <FileText className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 mb-4">
              {searchQuery ? 'No invoices found matching your search' : 'No invoices generated yet'}
            </p>
            {!searchQuery && (
              <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
                Generate First Invoice
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col h-full min-h-0">
            <div className="flex-1 overflow-x-auto overflow-y-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Invoice #</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Date</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Customer</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Sale Order</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700">Amount</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-700">Status</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium text-gray-900">{invoice.invoice_number}</td>
                      <td className="py-3 px-4 text-gray-600">{format(new Date(invoice.invoice_date), 'dd/MM/yyyy')}</td>
                      <td className="py-3 px-4 text-gray-600">{invoice.customer_name}</td>
                      <td className="py-3 px-4 text-gray-600">{invoice.sale_order_data?.order_number}</td>
                      <td className="py-3 px-4 text-right font-medium text-gray-900">
                        ₹{Math.round(invoice.sale_order_data?.total_amount || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {invoice.is_cancelled ? (
                          <span className="badge badge-danger">Cancelled</span>
                        ) : (
                          <span className="badge badge-success">Active</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                            onClick={() => setViewingInvoice(invoice)}
                            title="View Invoice"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalCount > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-4 pt-4 mt-4 border-t border-gray-200 shrink-0">
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
                    entries (Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, totalCount)} of {totalCount})
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
        )}
      </div>

      {/* Create Invoice Modal - Multi-Step */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-xl font-bold">Generate Invoice</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Step {currentStep} of 3: {
                    currentStep === 1 ? 'Select Sale Order' :
                    currentStep === 2 ? 'Customer Details' :
                    'Preview & Generate'
                  }
                </p>
              </div>
              <button onClick={resetModal} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-auto p-6">
              {/* Step 1: Select Sale Order */}
              {currentStep === 1 && (
                <div>
                  <label className="label mb-2">Select Sale Order *</label>

                  {/* Search field for sale orders */}
                  <div className="mb-4 relative">
                    <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by order number or customer name..."
                      value={saleSearchQuery}
                      onChange={(e) => {
                        setSaleSearchQuery(e.target.value);
                        setSalePage(1); // Reset to first page on search
                      }}
                      className="input-field pl-10"
                    />
                  </div>

                  {loadingSales ? (
                    <div className="text-center py-12">
                      <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-gray-500">Loading sales...</p>
                    </div>
                  ) : availableSales.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500">
                        {saleSearchQuery ? 'No sales found matching your search' : 'All sales already have invoices generated'}
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2 max-h-96 overflow-y-auto mb-4">
                        {availableSales.map((sale) => (
                          <div
                            key={sale.id}
                            onClick={() => handleSelectSale(sale.id)}
                            className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 cursor-pointer transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-semibold">{sale.order_number}</p>
                                <p className="text-sm text-gray-600">{sale.customer_name}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {format(new Date(sale.sale_date), 'dd MMM yyyy')}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-bold text-blue-600">
                                  ₹{Math.round(sale.total_amount).toLocaleString()}
                                </p>
                                <ChevronRight className="w-5 h-5 text-gray-400 mt-1 ml-auto" />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Pagination for sales */}
                      {saleTotalPages > 1 && (
                        <div className="flex items-center justify-between pt-4 border-t">
                          <p className="text-sm text-gray-600">
                            Page {salePage} of {saleTotalPages}
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setSalePage((p) => Math.max(1, p - 1))}
                              disabled={salePage === 1}
                              className="btn btn-secondary btn-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setSalePage((p) => Math.min(saleTotalPages, p + 1))}
                              disabled={salePage === saleTotalPages}
                              className="btn btn-secondary btn-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Step 2: Customer Details */}
              {currentStep === 2 && selectedSale && (
                <div className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-lg mb-4">
                    <p className="text-sm font-semibold text-blue-900">Selected Sale Order</p>
                    <p className="text-sm text-blue-700">{selectedSale.order_number} - ₹{Math.round(selectedSale.total_amount).toLocaleString()}</p>
                  </div>

                  {/* Customer Selection with Searchable Dropdown */}
                  <div>
                    <label className="label">Select Existing Customer (Optional)</label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowCustomerDropdown(!showCustomerDropdown)}
                        className="input-field text-left flex items-center justify-between w-full"
                      >
                        <div className="flex items-center gap-2">
                          <User className="w-5 h-5 text-gray-400" />
                          <span className={selectedCustomer ? 'text-gray-900' : 'text-gray-500'}>
                            {selectedCustomer
                              ? customers.find(c => c.id === selectedCustomer)?.name
                              : '-- Select a customer or enter manually --'}
                          </span>
                        </div>
                        <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${showCustomerDropdown ? 'rotate-90' : ''}`} />
                      </button>

                      {/* Dropdown Menu */}
                      {showCustomerDropdown && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-hidden">
                          {/* Search inside dropdown */}
                          <div className="p-2 border-b sticky top-0 bg-white">
                            <div className="relative">
                              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                              <input
                                type="text"
                                placeholder="Search customers..."
                                value={customerSearchQuery}
                                onChange={(e) => setCustomerSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                          </div>

                          {/* Customer List */}
                          <div className="max-h-60 overflow-y-auto">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedCustomer(null);
                                setShowCustomerDropdown(false);
                                setCustomerSearchQuery('');
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm text-gray-500 border-b"
                            >
                              -- Enter manually --
                            </button>

                            {searchingCustomers ? (
                              <div className="px-4 py-8 text-center text-sm text-gray-500">
                                <div className="w-5 h-5 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-2"></div>
                                Searching...
                              </div>
                            ) : customerSearchQuery.length < 2 ? (
                              <div className="px-4 py-8 text-center text-sm text-gray-500">
                                Type at least 2 characters to search
                              </div>
                            ) : customers.length === 0 ? (
                              <div className="px-4 py-8 text-center text-sm text-gray-500">
                                No customers found
                              </div>
                            ) : (
                              customers
                                .filter(c => !c.is_guest)
                                .map((customer) => (
                                  <button
                                    key={customer.id}
                                    type="button"
                                    onClick={() => {
                                      handleCustomerSelect(customer.id);
                                      setShowCustomerDropdown(false);
                                      setCustomerSearchQuery('');
                                    }}
                                    className={`w-full text-left px-4 py-2 hover:bg-blue-50 text-sm ${
                                      selectedCustomer === customer.id ? 'bg-blue-100' : ''
                                    }`}
                                  >
                                    <div className="font-medium">{customer.name}</div>
                                    {customer.phone && (
                                      <div className="text-xs text-gray-500">{customer.phone}</div>
                                    )}
                                  </button>
                                ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="label">Customer Name *</label>
                      <input
                        type="text"
                        className={`input-field ${errors.customer_name ? 'input-error' : ''}`}
                        value={customerDetails.customer_name}
                        onChange={(e) => handleCustomerDetailChange('customer_name', e.target.value)}
                        placeholder="Enter customer name"
                      />
                      {errors.customer_name && (
                        <p className="text-sm text-red-600 mt-1">{errors.customer_name}</p>
                      )}
                    </div>

                    <div>
                      <label className="label">GSTIN (Optional)</label>
                      <input
                        type="text"
                        className="input-field"
                        value={customerDetails.customer_gstin}
                        onChange={(e) => handleCustomerDetailChange('customer_gstin', e.target.value)}
                        placeholder="22AAAAA0000A1Z5"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="label">Address</label>
                      <input
                        type="text"
                        className="input-field"
                        value={customerDetails.customer_address}
                        onChange={(e) => handleCustomerDetailChange('customer_address', e.target.value)}
                        placeholder="Street address"
                      />
                    </div>

                    <div>
                      <label className="label">City</label>
                      <input
                        type="text"
                        className="input-field"
                        value={customerDetails.customer_city}
                        onChange={(e) => handleCustomerDetailChange('customer_city', e.target.value)}
                        placeholder="City"
                      />
                    </div>

                    <div>
                      <label className="label">State</label>
                      <select
                        className={`input-field ${errors.customer_state ? 'input-error' : ''}`}
                        value={customerDetails.customer_state || ''}
                        onChange={(e) => handleCustomerDetailChange('customer_state', e.target.value ? parseInt(e.target.value) : undefined as any)}
                      >
                        <option value="">Select State</option>
                        {states.map(state => (
                          <option key={state.id} value={state.id}>
                            {state.name}
                          </option>
                        ))}
                      </select>
                      {errors.customer_state && (
                        <p className="text-sm text-red-600 mt-1">{errors.customer_state}</p>
                      )}
                    </div>

                    <div>
                      <label className="label">Pincode</label>
                      <input
                        type="text"
                        className={`input-field ${errors.customer_pincode ? 'input-error' : ''}`}
                        value={customerDetails.customer_pincode}
                        onChange={(e) => handleCustomerDetailChange('customer_pincode', e.target.value)}
                        placeholder="123456"
                        maxLength={6}
                      />
                      {errors.customer_pincode && (
                        <p className="text-sm text-red-600 mt-1">{errors.customer_pincode}</p>
                      )}
                    </div>

                    <div>
                      <label className="label">Phone</label>
                      <input
                        type="tel"
                        className={`input-field ${errors.customer_phone ? 'input-error' : ''}`}
                        value={customerDetails.customer_phone}
                        onChange={(e) => handleCustomerDetailChange('customer_phone', e.target.value)}
                        placeholder="+91 1234567890"
                      />
                      {errors.customer_phone && (
                        <p className="text-sm text-red-600 mt-1">{errors.customer_phone}</p>
                      )}
                    </div>

                    <div>
                      <label className="label">Email</label>
                      <input
                        type="email"
                        className={`input-field ${errors.customer_email ? 'input-error' : ''}`}
                        value={customerDetails.customer_email}
                        onChange={(e) => handleCustomerDetailChange('customer_email', e.target.value)}
                        placeholder="customer@example.com"
                      />
                      {errors.customer_email && (
                        <p className="text-sm text-red-600 mt-1">{errors.customer_email}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Preview */}
              {currentStep === 3 && selectedSale && (
                <div>
                  <div className="bg-gray-100 p-4 rounded-lg mb-4 max-h-[500px] overflow-y-auto">
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
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-6 border-t bg-gray-50">
              <button
                onClick={() => currentStep > 1 ? setCurrentStep(currentStep - 1) : resetModal()}
                className="btn btn-secondary flex items-center gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                {currentStep === 1 ? 'Cancel' : 'Back'}
              </button>

              {currentStep < 3 ? (
                <button
                  onClick={() => {
                    if (currentStep === 2 && !validateForm()) return;
                    setCurrentStep(currentStep + 1);
                  }}
                  disabled={currentStep === 1 && !selectedSale}
                  className="btn btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleGenerateInvoice}
                  disabled={creating}
                  className="btn btn-success disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating ? 'Generating...' : 'Generate Invoice'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* View Invoice Modal */}
      {viewingInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-5xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h2 className="text-xl font-bold">{viewingInvoice.invoice_number}</h2>
                <p className="text-sm text-gray-600">
                  {format(new Date(viewingInvoice.invoice_date), 'dd MMMM yyyy')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={handlePrint} className="btn btn-secondary flex items-center gap-2">
                  <Printer className="w-4 h-4" />
                  Print
                </button>
                <button onClick={() => setViewingInvoice(null)} className="text-gray-500 hover:text-gray-700">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4 bg-gray-100">
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

            <div className="p-4 border-t bg-gray-50 flex justify-end">
              <button onClick={() => setViewingInvoice(null)} className="btn btn-secondary">
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
