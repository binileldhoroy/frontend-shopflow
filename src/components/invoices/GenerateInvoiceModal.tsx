import React, { useState, useEffect, useCallback } from 'react';
import { X, FileText, Search, User, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { invoiceService } from '../../api/services/invoice.service';
import { saleService } from '../../api/services/sale.service';
import { customerService } from '../../api/services/customer.service';
import { stateService } from '../../api/services/state.service';
import { TaxInvoiceCreate } from '../../types/invoice.types';
import { SaleOrder } from '../../types/sale.types';
import { Customer } from '../../types/customer.types';
import { StateMaster } from '../../types/state.types';
import InvoiceTemplate from './InvoiceTemplate';

interface GenerateInvoiceModalProps {
  onClose: () => void;
  /** Pre-selected sale from POS/QuickSale. When provided, skips step 1. */
  initialSale?: any | null;
  onSuccess?: () => void;
}

const stepLabels = ['Select Sale', 'Customer Details', 'Preview'];

const GenerateInvoiceModal: React.FC<GenerateInvoiceModalProps> = ({
  onClose,
  initialSale,
  onSuccess,
}) => {
  const navigate = useNavigate();

  const [visible, setVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(initialSale ? 2 : 1);
  const [selectedSale, setSelectedSale] = useState<SaleOrder | null>(
    initialSale ? (initialSale as SaleOrder) : null
  );
  const [states, setStates] = useState<StateMaster[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchingCustomers, setSearchingCustomers] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<number | null>(null);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Sale list for step 1 (only when no initialSale)
  const [sales, setSales] = useState<SaleOrder[]>([]);
  const [saleSearchQuery, setSaleSearchQuery] = useState('');
  const [salePage, setSalePage] = useState(1);
  const [saleTotalPages, setSaleTotalPages] = useState(1);
  const [loadingSales, setLoadingSales] = useState(false);

  const buildInitialCustomerDetails = (): Partial<TaxInvoiceCreate> => {
    if (!initialSale) {
      return {
        customer_name: '', customer_gstin: '', customer_address: '',
        customer_city: '', customer_state: undefined, customer_pincode: '',
        customer_phone: '', customer_email: '',
      };
    }
    if (initialSale.customer && typeof initialSale.customer === 'object') {
      const c = initialSale.customer;
      if (c.name && c.name !== 'Walk-in Customer') {
        return {
          customer_name: c.name || '',
          customer_gstin: c.gstin || '',
          customer_address: c.billing_address_line1 || c.address_line1 || '',
          customer_city: c.billing_city || c.city || '',
          customer_state: c.billing_state || c.state || undefined,
          customer_pincode: c.billing_pincode || c.pincode || '',
          customer_phone: c.phone || '',
          customer_email: c.email || '',
        };
      }
    }
    return {
      customer_name: initialSale.customer_name || '',
      customer_gstin: '', customer_address: '', customer_city: '',
      customer_state: undefined, customer_pincode: '', customer_phone: '', customer_email: '',
    };
  };

  const [customerDetails, setCustomerDetails] = useState<Partial<TaxInvoiceCreate>>(
    buildInitialCustomerDetails
  );

  // Animate in + fetch states
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    stateService.getAll().then(setStates).catch(console.error);
  }, []);

  // Fetch sales for step 1 (only when no initialSale)
  useEffect(() => {
    if (initialSale || currentStep !== 1) return;
    const search = async () => {
      try {
        setLoadingSales(true);
        const data = saleSearchQuery
          ? await saleService.search(saleSearchQuery, salePage, 10, { hasInvoice: false })
          : await saleService.getAll(salePage, 10, { hasInvoice: false });
        setSales(data.results);
        setSaleTotalPages(Math.ceil(data.count / 10));
      } catch (e) {
        console.error('Error fetching sales:', e);
      } finally {
        setLoadingSales(false);
      }
    };
    const id = setTimeout(search, 300);
    return () => clearTimeout(id);
  }, [saleSearchQuery, salePage, currentStep, initialSale]);

  // Customer search (step 2)
  useEffect(() => {
    if (!showCustomerDropdown || customerSearchQuery.length < 2) {
      setCustomers([]);
      return;
    }
    const search = async () => {
      setSearchingCustomers(true);
      try {
        const data = await customerService.search(customerSearchQuery);
        setCustomers(data.results || data);
      } catch (e) {
        console.error('Error searching customers:', e);
      } finally {
        setSearchingCustomers(false);
      }
    };
    const id = setTimeout(search, 300);
    return () => clearTimeout(id);
  }, [customerSearchQuery, showCustomerDropdown]);

  const handleClose = useCallback(() => {
    setVisible(false);
    setTimeout(onClose, 200);
  }, [onClose]);

  const handleSelectSale = (sale: SaleOrder) => {
    setSelectedSale(sale);
    setCustomerDetails({
      customer_name: sale.customer_name || '',
      customer_gstin: '', customer_address: '', customer_city: '',
      customer_state: undefined, customer_pincode: '', customer_phone: '', customer_email: '',
    });
    setCurrentStep(2);
  };

  const handleCustomerSelect = (customerId: number) => {
    const customer = customers.find(c => c.id === customerId);
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

  const handleDetailChange = (field: keyof TaxInvoiceCreate, value: any) => {
    setCustomerDetails(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!customerDetails.customer_name?.trim()) newErrors.customer_name = 'Customer name is required';
    if (customerDetails.customer_pincode && !/^\d{6}$/.test(customerDetails.customer_pincode))
      newErrors.customer_pincode = 'Pincode must be 6 digits';
    if (customerDetails.customer_phone && !/^\+?[\d\s-]{10,15}$/.test(customerDetails.customer_phone))
      newErrors.customer_phone = 'Invalid phone number';
    if (customerDetails.customer_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerDetails.customer_email))
      newErrors.customer_email = 'Invalid email address';
    if (customerDetails.customer_gstin && !customerDetails.customer_state)
      newErrors.customer_state = 'State is required when GSTIN is provided';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleGenerateInvoice = async () => {
    if (!selectedSale || !validateForm()) return;
    try {
      setCreating(true);
      const invoiceData: TaxInvoiceCreate = { sale_order_id: selectedSale.id };
      if (customerDetails.customer_name?.trim()) invoiceData.customer_name = customerDetails.customer_name.trim();
      if (customerDetails.customer_gstin?.trim()) invoiceData.customer_gstin = customerDetails.customer_gstin.trim();
      if (customerDetails.customer_address?.trim()) invoiceData.customer_address = customerDetails.customer_address.trim();
      if (customerDetails.customer_city?.trim()) invoiceData.customer_city = customerDetails.customer_city.trim();
      if (customerDetails.customer_pincode?.trim()) invoiceData.customer_pincode = customerDetails.customer_pincode.trim();
      if (customerDetails.customer_phone?.trim()) invoiceData.customer_phone = customerDetails.customer_phone.trim();
      if (customerDetails.customer_email?.trim()) invoiceData.customer_email = customerDetails.customer_email.trim();
      if (customerDetails.customer_state) invoiceData.customer_state = Number(customerDetails.customer_state);
      const created = await invoiceService.createInvoice(invoiceData);
      handleClose();
      onSuccess?.();
      navigate(`/invoices/${created.id}`);
    } catch (error: any) {
      const msg =
        error?.response?.data?.error ||
        error?.response?.data?.sale_order_id?.[0] ||
        'Failed to create invoice. Please try again.';
      alert(msg);
    } finally {
      setCreating(false);
    }
  };

  const backLabel =
    currentStep === 1 || (currentStep === 2 && !!initialSale) ? 'Cancel' : 'Back';

  const handleBack = () => {
    if (currentStep === 1 || (currentStep === 2 && !!initialSale)) {
      handleClose();
    } else {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-[60] flex items-center justify-center p-4 transition-all duration-200 ${
        visible ? 'bg-black/40' : 'bg-black/0'
      }`}
      onClick={e => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className={`bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[95vh] flex flex-col transition-all duration-200 ${
          visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">Generate Invoice</h2>
            <div className="flex items-center gap-2 mt-2">
              {stepLabels.map((label, i) => {
                const step = i + 1;
                const done = currentStep > step;
                const active = currentStep === step;
                return (
                  <React.Fragment key={step}>
                    <div className="flex items-center gap-1.5">
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${
                          done || active ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-400'
                        }`}
                      >
                        {done ? '✓' : step}
                      </div>
                      <span
                        className={`text-xs font-medium transition-colors ${
                          active ? 'text-gray-900' : 'text-gray-400'
                        }`}
                      >
                        {label}
                      </span>
                    </div>
                    {i < stepLabels.length - 1 && (
                      <div
                        className={`h-px w-6 transition-colors ${
                          currentStep > step ? 'bg-gray-900' : 'bg-gray-200'
                        }`}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-6">
          {/* Step 1 — sale selection (only when no initialSale) */}
          {currentStep === 1 && !initialSale && (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by order number or customer…"
                  value={saleSearchQuery}
                  onChange={e => {
                    setSaleSearchQuery(e.target.value);
                    setSalePage(1);
                  }}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-gray-400 transition-all"
                />
              </div>

              {loadingSales ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin mb-2" />
                  <span className="text-xs">Loading…</span>
                </div>
              ) : sales.length === 0 ? (
                <div className="text-center py-10 text-sm text-gray-400">
                  {saleSearchQuery
                    ? `No sales matching "${saleSearchQuery}"`
                    : 'All sales already have invoices'}
                </div>
              ) : (
                <>
                  <div className="space-y-1.5 max-h-[60vh] overflow-y-auto pr-1">
                    {sales.map(sale => (
                      <button
                        key={sale.id}
                        onClick={() => handleSelectSale(sale)}
                        className="w-full flex items-center justify-between p-3.5 border border-gray-200 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-all text-left group"
                      >
                        <div>
                          <p className="font-semibold text-sm text-gray-800 font-mono">
                            {sale.order_number}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {sale.customer_name || 'Walk-in'} ·{' '}
                            {format(new Date(sale.sale_date), 'dd MMM yyyy')}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-700">
                            ₹{Math.round(sale.total_amount).toLocaleString()}
                          </span>
                          <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-600 transition-colors" />
                        </div>
                      </button>
                    ))}
                  </div>
                  {saleTotalPages > 1 && (
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs text-gray-500">
                      <span>
                        Page {salePage} of {saleTotalPages}
                      </span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setSalePage(p => Math.max(1, p - 1))}
                          disabled={salePage === 1}
                          className="px-2.5 py-1 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40 transition-colors"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setSalePage(p => Math.min(saleTotalPages, p + 1))}
                          disabled={salePage === saleTotalPages}
                          className="px-2.5 py-1 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40 transition-colors"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Step 2 — customer details */}
          {currentStep === 2 && selectedSale && (
            <div className="space-y-4">
              {/* Sale summary pill */}
              <div className="flex items-center gap-3 px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm">
                <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                <span className="font-mono font-semibold text-gray-700">
                  {selectedSale.order_number}
                </span>
                <span className="text-gray-400">·</span>
                <span className="font-semibold text-gray-700">
                  ₹{Math.round(selectedSale.total_amount).toLocaleString()}
                </span>
              </div>

              {/* Customer lookup */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Load from existing customer{' '}
                  <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowCustomerDropdown(!showCustomerDropdown)}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm border border-gray-200 rounded-lg hover:border-gray-400 transition-colors bg-white text-left"
                  >
                    <div className="flex items-center gap-2 text-gray-500">
                      <User className="w-4 h-4" />
                      <span className={selectedCustomer ? 'text-gray-900 font-medium' : ''}>
                        {selectedCustomer
                          ? customers.find(c => c.id === selectedCustomer)?.name
                          : 'Select a customer…'}
                      </span>
                    </div>
                    <ChevronRight
                      className={`w-4 h-4 text-gray-400 transition-transform ${
                        showCustomerDropdown ? 'rotate-90' : ''
                      }`}
                    />
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
                            onChange={e => setCustomerSearchQuery(e.target.value)}
                            onClick={e => e.stopPropagation()}
                            className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-gray-400"
                            autoFocus
                          />
                        </div>
                      </div>
                      <div className="max-h-52 overflow-y-auto">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCustomer(null);
                            setShowCustomerDropdown(false);
                            setCustomerSearchQuery('');
                          }}
                          className="w-full text-left px-3 py-2 text-xs text-gray-400 hover:bg-gray-50 border-b border-gray-50 italic"
                        >
                          Enter manually
                        </button>
                        {searchingCustomers ? (
                          <div className="py-6 text-center text-xs text-gray-400">
                            <div className="w-4 h-4 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin mx-auto mb-1" />
                            Searching…
                          </div>
                        ) : customerSearchQuery.length < 2 ? (
                          <div className="py-6 text-center text-xs text-gray-400">
                            Type at least 2 characters
                          </div>
                        ) : customers.length === 0 ? (
                          <div className="py-6 text-center text-xs text-gray-400">
                            No customers found
                          </div>
                        ) : (
                          customers
                            .filter(c => !c.is_guest)
                            .map(customer => (
                              <button
                                key={customer.id}
                                type="button"
                                onClick={() => {
                                  handleCustomerSelect(customer.id);
                                  setShowCustomerDropdown(false);
                                  setCustomerSearchQuery('');
                                }}
                                className={`w-full text-left px-3 py-2.5 hover:bg-gray-50 transition-colors ${
                                  selectedCustomer === customer.id ? 'bg-gray-50' : ''
                                }`}
                              >
                                <div className="text-sm font-medium text-gray-800">
                                  {customer.name}
                                </div>
                                {customer.phone && (
                                  <div className="text-xs text-gray-400">{customer.phone}</div>
                                )}
                              </button>
                            ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Form fields */}
              <div className="border-t border-gray-100 pt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                {(
                  [
                    {
                      label: 'Customer Name',
                      field: 'customer_name',
                      required: true,
                      placeholder: 'Full name',
                    },
                    { label: 'GSTIN', field: 'customer_gstin', placeholder: '22AAAAA0000A1Z5' },
                    {
                      label: 'Phone',
                      field: 'customer_phone',
                      placeholder: '+91 9876543210',
                      type: 'tel',
                    },
                    {
                      label: 'Email',
                      field: 'customer_email',
                      placeholder: 'customer@example.com',
                      type: 'email',
                    },
                    { label: 'City', field: 'customer_city', placeholder: 'City' },
                    {
                      label: 'Pincode',
                      field: 'customer_pincode',
                      placeholder: '123456',
                      maxLength: 6,
                    },
                  ] as Array<{
                    label: string;
                    field: string;
                    required?: boolean;
                    placeholder: string;
                    type?: string;
                    maxLength?: number;
                  }>
                ).map(({ label, field, required, placeholder, type, maxLength }) => (
                  <div key={field}>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      {label}
                      {required && <span className="text-red-500 ml-0.5">*</span>}
                    </label>
                    <input
                      type={type || 'text'}
                      placeholder={placeholder}
                      maxLength={maxLength}
                      value={(customerDetails as any)[field] || ''}
                      onChange={e =>
                        handleDetailChange(field as keyof TaxInvoiceCreate, e.target.value)
                      }
                      className={`w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent transition-all ${
                        errors[field] ? 'border-red-300 bg-red-50' : 'border-gray-200'
                      }`}
                    />
                    {errors[field] && (
                      <p className="text-xs text-red-500 mt-1">{errors[field]}</p>
                    )}
                  </div>
                ))}

                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Address</label>
                  <input
                    type="text"
                    placeholder="Street address"
                    value={customerDetails.customer_address || ''}
                    onChange={e => handleDetailChange('customer_address', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    State {errors.customer_state && <span className="text-red-500">*</span>}
                  </label>
                  <select
                    value={customerDetails.customer_state || ''}
                    onChange={e =>
                      handleDetailChange(
                        'customer_state',
                        e.target.value ? parseInt(e.target.value) : (undefined as any)
                      )
                    }
                    className={`w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent transition-all ${
                      errors.customer_state ? 'border-red-300 bg-red-50' : 'border-gray-200'
                    }`}
                  >
                    <option value="">Select state</option>
                    {states.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  {errors.customer_state && (
                    <p className="text-xs text-red-500 mt-1">{errors.customer_state}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 3 — preview */}
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
            onClick={handleBack}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            {backLabel}
          </button>

          {currentStep < 3 ? (
            <button
              onClick={() => {
                if (currentStep === 2 && !validateForm()) return;
                setCurrentStep(currentStep + 1);
              }}
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
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <FileText className="w-3.5 h-3.5" /> Generate Invoice
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default GenerateInvoiceModal;
