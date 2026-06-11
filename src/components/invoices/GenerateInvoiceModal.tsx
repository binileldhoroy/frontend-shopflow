import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAppDispatch } from '@hooks/useRedux';
import { addNotification } from '@store/slices/uiSlice';
import {
  X, FileText, Search, User, ChevronLeft, ChevronRight,
  CheckCircle2, Printer, Download, MessageCircle, Mail, Copy, Check,
} from 'lucide-react';
import PhoneInput from '../common/PhoneInput/PhoneInput';
import { format } from 'date-fns';
import html2pdf from 'html2pdf.js';
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
  const dispatch = useAppDispatch();
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

  // Generated invoice state — when set, switches to in-place invoice view
  const [generatedInvoice, setGeneratedInvoice] = useState<{
    id: number;
    invoice_number: string;
    invoice_date: string;
  } | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [sharingWhatsApp, setSharingWhatsApp] = useState(false);
  const [copied, setCopied] = useState(false);

  const invoiceRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  // Keep the backdrop container anchored to the visual viewport so the modal
  // stays above the software keyboard on Android Chrome.
  useEffect(() => {
    const update = () => {
      const vv = window.visualViewport;
      if (!backdropRef.current) return;
      const top = vv?.offsetTop ?? 0;
      const h = vv?.height ?? window.innerHeight;
      backdropRef.current.style.top = `${top}px`;
      backdropRef.current.style.height = `${h}px`;
    };
    update();
    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener('resize', update);
      vv.addEventListener('scroll', update);
    } else {
      window.addEventListener('resize', update);
    }
    return () => {
      if (vv) {
        vv.removeEventListener('resize', update);
        vv.removeEventListener('scroll', update);
      } else {
        window.removeEventListener('resize', update);
      }
    };
  }, []);

  const buildInitialCustomerDetails = (): Partial<TaxInvoiceCreate> => {
    if (!initialSale) {
      return {
        customer_name: '', customer_gstin: '', customer_address: '',
        customer_city: '', customer_state: undefined, customer_pincode: '',
        customer_country_code: '91', customer_phone: '', customer_email: '',
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
          customer_country_code: c.country_code || '91',
          customer_phone: c.phone || '',
          customer_email: c.email || '',
        };
      }
    }
    return {
      customer_name: initialSale.customer_name || '',
      customer_gstin: '', customer_address: '', customer_city: '',
      customer_state: undefined, customer_pincode: '', customer_country_code: '91', customer_phone: '', customer_email: '',
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
    // If the invoice was generated, notify the parent to clean up POS state
    // (do this before closing so the parent can reset sessions etc.)
    if (generatedInvoice) onSuccess?.();
    setVisible(false);
    setTimeout(onClose, 200);
  }, [onClose, onSuccess, generatedInvoice]);

  const handleSelectSale = (sale: SaleOrder) => {
    setSelectedSale(sale);
    setCustomerDetails({
      customer_name: sale.customer_name || '',
      customer_gstin: '', customer_address: '', customer_city: '',
      customer_state: undefined, customer_pincode: '', customer_country_code: '91', customer_phone: '', customer_email: '',
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
        customer_country_code: (customer as any).country_code || '91',
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
    if (customerDetails.customer_phone) {
      const digits = customerDetails.customer_phone.replace(/\D/g, '');
      if (digits.length > 0 && digits.length < 7) newErrors.customer_phone = 'Invalid phone number';
    }
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
      invoiceData.customer_country_code = customerDetails.customer_country_code || '91';
      if (customerDetails.customer_phone?.trim()) invoiceData.customer_phone = customerDetails.customer_phone.trim();
      if (customerDetails.customer_email?.trim()) invoiceData.customer_email = customerDetails.customer_email.trim();
      if (customerDetails.customer_state) invoiceData.customer_state = Number(customerDetails.customer_state);
      const created = await invoiceService.createInvoice(invoiceData);
      // Show invoice in-place — onSuccess is deferred until the user closes
      setGeneratedInvoice({
        id: created.id,
        invoice_number: created.invoice_number,
        invoice_date: created.invoice_date || new Date().toISOString(),
      });
    } catch (error: any) {
      const msg =
        error?.response?.data?.error ||
        error?.response?.data?.sale_order_id?.[0] ||
        'Failed to create invoice. Please try again.';
      dispatch(addNotification({ message: msg, type: 'error' }));
    } finally {
      setCreating(false);
    }
  };

  // Memoised customer details for the generated invoice view.
  // Using an inline object literal would create a new reference on every render,
  // causing InvoiceTemplate to restart its measuring phase each time (e.g. when
  // the async `states` list loads), which makes the template unavailable for
  // capture right when the user presses Print.
  const generatedCustomerDetails = useMemo(() => ({
    name: customerDetails.customer_name,
    gstin: customerDetails.customer_gstin,
    address: customerDetails.customer_address,
    city: customerDetails.customer_city,
    state: states.find(s => s.id === customerDetails.customer_state)?.name,
    pincode: customerDetails.customer_pincode,
    country_code: customerDetails.customer_country_code || '91',
    phone: customerDetails.customer_phone,
    email: customerDetails.customer_email,
  }), [customerDetails, states]);

  // ── Invoice actions (available after generation) ────────────────────────────

  // Waits for InvoiceTemplate to finish its measuring phase before we capture
  // the DOM. Without this, clicking Print immediately after invoice generation
  // (or after any parent re-render that resets measuring) would capture the
  // hidden measuring div instead of the rendered invoice pages.
  const waitForTemplate = useCallback((): Promise<void> => {
    return new Promise<void>(resolve => {
      if (!invoiceRef.current) { resolve(); return; }
      if (invoiceRef.current.querySelector('.invoice-outer-wrapper')) { resolve(); return; }
      const observer = new MutationObserver(() => {
        if (invoiceRef.current?.querySelector('.invoice-outer-wrapper')) {
          observer.disconnect();
          resolve();
        }
      });
      observer.observe(invoiceRef.current, { childList: true, subtree: true });
      setTimeout(() => { observer.disconnect(); resolve(); }, 3000);
    });
  }, []);

  /**
   * Print — opens the invoice in a new browser tab as a self-contained HTML
   * document, then auto-triggers the system print dialog.
   *
   * Using window.open instead of useReactToPrint because:
   *  • useReactToPrint injects an iframe into the current page and calls
   *    window.print() which on Android Chrome disturbs React Router's history
   *    stack, sending the user to the mobile POS page after dismissing the dialog.
   *  • Tailwind's global CSS leaks into the useReactToPrint iframe and clobbers
   *    the invoice layout, producing a blank or broken print.
   *  • The new-tab approach is a completely isolated context — our invoice HTML
   *    is the only content, with zero risk of interference.
   */
  const handlePrint = async () => {
    if (!invoiceRef.current || !generatedInvoice) return;

    await waitForTemplate();

    // Pull out InvoiceTemplate's embedded <style> (defines @page, .invoice-page, etc.)
    const styleContent = invoiceRef.current.querySelector('style')?.textContent ?? '';
    const outerWrapper = invoiceRef.current.querySelector('.invoice-outer-wrapper');
    if (!outerWrapper) return;

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Invoice ${generatedInvoice.invoice_number}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { margin: 0; padding: 0; background: white; }
    ${styleContent}
  </style>
</head>
<body>${outerWrapper.outerHTML}</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (win) {
      win.onload = () => {
        win.focus();
        win.print();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      };
    }
  };

  /**
   * PDF Download — clones the fully-rendered invoice DOM into an off-screen,
   * width-constrained container outside the modal's scroll area, then captures
   * it with html2canvas at 3× scale using lossless PNG.
   *
   * Why clone to off-screen instead of capturing the live element:
   *  • The live element lives inside `overflow-auto min-h-0 flex-1`, so
   *    html2canvas sees only the visible scrolled portion, not the full page.
   *  • The off-screen container at width:210mm lets html2canvas render the
   *    entire invoice at exactly A4 width with no clipping.
   *  • PNG (lossless) + scale 3 ≈ 290 DPI — sharp, professional output.
   */
  const handleDownloadPDF = async () => {
    if (!invoiceRef.current || !generatedInvoice) return;
    setDownloading(true);

    await waitForTemplate();

    // Clone the already-rendered (post-measuring) invoice DOM
    const offScreen = document.createElement('div');
    offScreen.style.cssText =
      'position:fixed;left:-9999px;top:0;width:210mm;background:white;z-index:-9999;';
    offScreen.appendChild(invoiceRef.current.cloneNode(true));
    document.body.appendChild(offScreen);

    // Zero the screen-only inter-page gap so pages are exactly 297mm each
    const tempStyle = document.createElement('style');
    tempStyle.textContent = '.invoice-page + .invoice-page { margin-top: 0 !important; }';
    document.head.appendChild(tempStyle);

    // Give the browser one tick to lay out the cloned element
    await new Promise<void>(r => setTimeout(r, 80));

    const element = offScreen.querySelector<HTMLElement>('.invoice-outer-wrapper') ?? offScreen;

    const opt = {
      margin: 0,
      filename: `Invoice_${generatedInvoice.invoice_number}.pdf`,
      image: { type: 'png' as const },   // lossless — no JPEG compression blur
      html2canvas: {
        scale: 3,                          // ~290 DPI effective — print-quality sharpness
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        allowTaint: false,
      },
      jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const },
      pagebreak: { mode: 'css', before: '.invoice-page:not(:first-child)' },
    };

    try {
      await html2pdf().set(opt).from(element).save();
    } finally {
      document.body.removeChild(offScreen);
      document.head.removeChild(tempStyle);
      setDownloading(false);
    }
  };

  const invoicePageUrl = generatedInvoice
    ? `${window.location.origin}/invoices/${generatedInvoice.id}`
    : '';

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(invoicePageUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareWhatsApp = async () => {
    if (!invoiceRef.current || !generatedInvoice) return;

    const phone = customerDetails.customer_phone
      ? `${customerDetails.customer_country_code || '91'}${customerDetails.customer_phone}`
      : '';
    const waUrl = phone ? `https://wa.me/${phone}` : 'https://web.whatsapp.com/';

    // On mobile the Web Share API handles file sharing natively — do NOT pre-open
    // WhatsApp, otherwise the app opens with no PDF and the share sheet appears
    // separately, confusing the user.
    // On desktop there is no share API, so we open WhatsApp now (synchronously,
    // inside the user-gesture handler) to bypass popup blockers.
    const isMobileShareSupported = typeof navigator.share === 'function' && typeof navigator.canShare === 'function';
    if (!isMobileShareSupported) window.open(waUrl, '_blank');

    setSharingWhatsApp(true);

    await waitForTemplate();

    const offScreen = document.createElement('div');
    offScreen.style.cssText =
      'position:fixed;left:-9999px;top:0;width:210mm;background:white;z-index:-9999;';
    offScreen.appendChild(invoiceRef.current.cloneNode(true));
    document.body.appendChild(offScreen);

    const tempStyle = document.createElement('style');
    tempStyle.textContent = '.invoice-page + .invoice-page { margin-top: 0 !important; }';
    document.head.appendChild(tempStyle);

    await new Promise<void>(r => setTimeout(r, 80));

    const element = offScreen.querySelector<HTMLElement>('.invoice-outer-wrapper') ?? offScreen;
    const filename = `Invoice_${generatedInvoice.invoice_number}.pdf`;

    const opt = {
      margin: 0,
      filename,
      image: { type: 'png' as const },
      html2canvas: {
        scale: 3,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        allowTaint: false,
      },
      jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const },
      pagebreak: { mode: 'css', before: '.invoice-page:not(:first-child)' },
    };

    try {
      // .toPdf().get('pdf') is the reliable way to obtain the jsPDF instance from html2pdf.js
      const jsPDFInstance: any = await html2pdf().set(opt).from(element).toPdf().get('pdf');
      const pdfBlob: Blob = jsPDFInstance.output('blob');
      const pdfFile = new File([pdfBlob], filename, { type: 'application/pdf' });

      if (isMobileShareSupported && navigator.canShare({ files: [pdfFile] })) {
        // Mobile: native share sheet — user picks WhatsApp and the PDF lands as attachment
        await navigator.share({
          files: [pdfFile],
          title: `Invoice ${generatedInvoice.invoice_number}`,
        });
      } else {
        // Desktop (or rare mobile that can't share files):
        // WhatsApp tab is already open; download the PDF so the user can attach it.
        const blobUrl = URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(blobUrl);
        // If we're on a mobile that couldn't share files, also open WhatsApp now
        if (isMobileShareSupported) window.open(waUrl, '_blank');
      }
    } catch (err) {
      dispatch(addNotification({ message: 'Failed to generate PDF for sharing. Please try again.', type: 'error' }));
    } finally {
      document.body.removeChild(offScreen);
      document.head.removeChild(tempStyle);
      setSharingWhatsApp(false);
    }
  };

  const handleShareEmail = () => {
    const subject = encodeURIComponent(`Invoice ${generatedInvoice?.invoice_number}`);
    const body = encodeURIComponent(
      `Please find your invoice details below.\n\nInvoice: ${generatedInvoice?.invoice_number}\nView online: ${invoicePageUrl}`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  // ── Wizard nav ──────────────────────────────────────────────────────────────

  const backLabel =
    currentStep === 1 || (currentStep === 2 && !!initialSale) ? 'Cancel' : 'Back';

  const handleBack = () => {
    if (currentStep === 1 || (currentStep === 2 && !!initialSale)) {
      handleClose();
    } else {
      setCurrentStep(currentStep - 1);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div
      ref={backdropRef}
      className={`fixed inset-x-0 z-[60] flex items-center justify-center p-4 transition-colors duration-200 ${
        visible ? 'bg-black/40' : 'bg-black/0'
      }`}
      style={{ top: 0, height: '100vh' }}
      onClick={e => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className={`bg-white rounded-xl shadow-2xl w-full max-w-4xl flex flex-col transition-all duration-200 ${
          visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
        style={{ maxHeight: 'calc(var(--viewport-height, 100vh) - 32px)' }}
      >
        {/* ── Header ── */}
        {generatedInvoice ? (
          /* Success header */
          <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">Invoice Generated</h2>
                <p className="text-xs text-gray-500 font-mono mt-0.5">
                  {generatedInvoice.invoice_number}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        ) : (
          /* Wizard header */
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
        )}

        {/* ── Body ── */}
        {generatedInvoice ? (
          /* Generated invoice preview */
          <div className="flex-1 overflow-auto min-h-0 bg-gray-100">
            <div ref={invoiceRef}>
              <InvoiceTemplate
                saleOrder={selectedSale!}
                invoiceNumber={generatedInvoice.invoice_number}
                invoiceDate={generatedInvoice.invoice_date}
                invoiceUrl={invoicePageUrl}
                customerDetails={generatedCustomerDetails}
              />
            </div>
          </div>
        ) : (
          /* Wizard steps */
          <div className="flex-1 overflow-auto min-h-0 p-6">
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
                  {/* Phone field — rendered separately to use PhoneInput */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                    <PhoneInput
                      phone={customerDetails.customer_phone || ''}
                      countryCode={customerDetails.customer_country_code ?? '91'}
                      onPhoneChange={(v) => handleDetailChange('customer_phone', v)}
                      onCountryCodeChange={(v) => handleDetailChange('customer_country_code', v)}
                      hasError={!!errors.customer_phone}
                    />
                    {errors.customer_phone && (
                      <p className="text-xs text-red-500 mt-1">{errors.customer_phone}</p>
                    )}
                  </div>

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
              <div className="bg-gray-50 rounded-lg overflow-auto border border-gray-200">
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
                    country_code: customerDetails.customer_country_code || '91',
                    phone: customerDetails.customer_phone,
                    email: customerDetails.customer_email,
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* ── Footer ── */}
        {generatedInvoice ? (
          /* Action bar for generated invoice */
          <div className="shrink-0 flex items-center justify-between gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-xl flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Print */}
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Printer className="w-4 h-4" />
                Print
              </button>

              {/* Download PDF */}
              <button
                onClick={handleDownloadPDF}
                disabled={downloading}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                {downloading ? (
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                Download PDF
              </button>

              {/* Share via WhatsApp */}
              <button
                onClick={handleShareWhatsApp}
                disabled={sharingWhatsApp}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                {sharingWhatsApp ? (
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-green-500 rounded-full animate-spin" />
                ) : (
                  <MessageCircle className="w-4 h-4 text-green-500" />
                )}
                WhatsApp
              </button>

              {/* Share via Email */}
              <button
                onClick={handleShareEmail}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Mail className="w-4 h-4 text-blue-500" />
                Email
              </button>

              {/* Copy Link */}
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
            </div>

            {/* Done */}
            <button
              onClick={handleClose}
              className="px-5 py-2 text-sm font-semibold bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          /* Wizard navigation footer */
          <div className="shrink-0 flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-xl">
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
        )}
      </div>
    </div>
  );
};

export default GenerateInvoiceModal;
