import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Printer, Share2, Mail, MessageCircle, X } from 'lucide-react';
import { format } from 'date-fns';
import html2pdf from 'html2pdf.js';
import { useAppDispatch } from '@hooks/useRedux';
import { addNotification } from '@store/slices/uiSlice';
import { invoiceService } from '../../api/services/invoice.service';
import { TaxInvoice } from '../../types/invoice.types';
import InvoiceTemplate from '../../components/invoices/InvoiceTemplate';

// Memoised wrapper — InvoiceTemplate runs an internal measuring phase on every render.
// Without this, toggling showShareMenu re-renders the parent and triggers the measuring
// phase again, causing a visible flicker in the invoice preview.
const MemoInvoiceTemplate = React.memo(InvoiceTemplate);

const InvoiceDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const [invoice, setInvoice] = useState<TaxInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [sharingWhatsApp, setSharingWhatsApp] = useState(false);

  const invoiceRef = useRef<HTMLDivElement>(null);
  const shareMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id) fetchInvoice();
  }, [id]);

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

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      const data = await invoiceService.getInvoiceById(Number(id));
      setInvoice(data);
    } catch {
      setError('Invoice not found or failed to load.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (!invoiceRef.current || !invoice) return;
    const styleContent = invoiceRef.current.querySelector('style')?.textContent ?? '';
    const outerWrapper = invoiceRef.current.querySelector('.invoice-outer-wrapper');
    const invoiceHTML = outerWrapper ? outerWrapper.outerHTML : invoiceRef.current.innerHTML;
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Invoice ${invoice.invoice_number}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { margin: 0; padding: 0; background: white; }
    ${styleContent}
  </style>
</head>
<body>${invoiceHTML}</body>
</html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (win) {
      win.onload = () => {
        win.focus();
        setTimeout(() => {
          win.print();
          setTimeout(() => URL.revokeObjectURL(url), 2000);
        }, 500);
      };
    }
  };

  const buildPdfOpt = (filename: string) => ({
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
  });

  const cloneToOffScreen = () => {
    const offScreen = document.createElement('div');
    offScreen.style.cssText =
      'position:fixed;left:-9999px;top:0;width:210mm;background:white;z-index:-9999;';
    offScreen.appendChild(invoiceRef.current!.cloneNode(true));
    document.body.appendChild(offScreen);

    const tempStyle = document.createElement('style');
    tempStyle.textContent = '.invoice-page + .invoice-page { margin-top: 0 !important; }';
    document.head.appendChild(tempStyle);

    return { offScreen, tempStyle };
  };

  const handleDownloadPDF = async () => {
    if (!invoiceRef.current || !invoice) return;
    setDownloading(true);

    const { offScreen, tempStyle } = cloneToOffScreen();
    await new Promise<void>(r => setTimeout(r, 80));
    const element = offScreen.querySelector<HTMLElement>('.invoice-outer-wrapper') ?? offScreen;

    try {
      await html2pdf().set(buildPdfOpt(`Invoice_${invoice.invoice_number}.pdf`)).from(element).save();
    } finally {
      document.body.removeChild(offScreen);
      document.head.removeChild(tempStyle);
      setDownloading(false);
    }
  };

  const handleShareWhatsApp = async () => {
    if (!invoiceRef.current || !invoice) return;

    const phone = invoice.customer_phone
      ? `${invoice.customer_country_code || '91'}${invoice.customer_phone}`
      : '';
    // Open the chat only — no pre-filled text/link, just the PDF will be shared
    const waUrl = phone ? `https://wa.me/${phone}` : 'https://web.whatsapp.com/';

    // Open WhatsApp now (user-gesture context) — popup blockers reject window.open after an await
    const waWindow = window.open(waUrl, '_blank');
    setShowShareMenu(false);
    setSharingWhatsApp(true);

    const { offScreen, tempStyle } = cloneToOffScreen();
    await new Promise<void>(r => setTimeout(r, 80));
    const element = offScreen.querySelector<HTMLElement>('.invoice-outer-wrapper') ?? offScreen;
    const filename = `Invoice_${invoice.invoice_number}.pdf`;

    try {
      const jsPDFInstance: any = await html2pdf()
        .set(buildPdfOpt(filename))
        .from(element)
        .toPdf()
        .get('pdf');
      const pdfBlob: Blob = jsPDFInstance.output('blob');
      const pdfFile = new File([pdfBlob], filename, { type: 'application/pdf' });

      if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        waWindow?.close();
        await navigator.share({ files: [pdfFile], title: `Invoice ${invoice.invoice_number}` });
      } else {
        const blobUrl = URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(blobUrl);
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        dispatch(addNotification({ message: 'Failed to generate PDF for sharing.', type: 'error' }));
      }
    } finally {
      document.body.removeChild(offScreen);
      document.head.removeChild(tempStyle);
      setSharingWhatsApp(false);
    }
  };

  const handleShareEmail = () => {
    const subject = encodeURIComponent(`Invoice ${invoice?.invoice_number}`);
    const body = encodeURIComponent(
      `Please find the attached Invoice ${invoice?.invoice_number} for ${invoice?.customer_name}.`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`);
    setShowShareMenu(false);
  };

  // Both saleOrder and customerDetails are memoised so MemoInvoiceTemplate receives
  // stable prop references and never re-renders when unrelated state (showShareMenu,
  // sharingWhatsApp, downloading) changes.
  const saleOrder = useMemo(() => invoice?.sale_order_data, [invoice]);

  const customerDetails = useMemo(() => invoice ? {
    name: invoice.customer_name,
    gstin: invoice.customer_gstin,
    address: invoice.customer_address,
    city: invoice.customer_city,
    pincode: invoice.customer_pincode,
    country_code: invoice.customer_country_code || '91',
    phone: invoice.customer_phone,
    email: invoice.customer_email,
  } : null, [invoice]);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-700 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !invoice || !customerDetails) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-gray-500">{error || 'Invoice not found.'}</p>
        <button
          onClick={() => navigate('/invoices')}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Invoices
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* ── Top action bar ── */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        {/* Left: Back + title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate('/invoices')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 shrink-0"
            title="Back to Invoices"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-gray-900 font-mono truncate">{invoice.invoice_number}</h1>
            <p className="text-sm text-gray-500 mt-0.5 truncate">
              {format(new Date(invoice.invoice_date), 'dd MMM yyyy')} · {invoice.customer_name}
            </p>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {/* Download PDF */}
          <button
            onClick={handleDownloadPDF}
            disabled={downloading}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {downloading ? (
              <div className="w-3.5 h-3.5 border-2 border-gray-400 border-t-gray-700 rounded-full animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">Download PDF</span>
          </button>

          {/* Print */}
          <button
            onClick={() => handlePrint()}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Print</span>
          </button>

          {/* Share */}
          <div className="relative" ref={shareMenuRef}>
            <button
              onClick={() => setShowShareMenu((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Share</span>
            </button>

            {showShareMenu && (
              <div className="absolute right-0 top-full mt-1.5 w-52 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-50">
                <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-100 mb-1">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Share via</span>
                  <button onClick={() => setShowShareMenu(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <button
                  onClick={handleShareWhatsApp}
                  disabled={sharingWhatsApp}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  {sharingWhatsApp ? (
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-green-500 rounded-full animate-spin" />
                  ) : (
                    <MessageCircle className="w-4 h-4 text-green-500" />
                  )}
                  WhatsApp
                </button>
                <button
                  onClick={handleShareEmail}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Mail className="w-4 h-4 text-blue-500" />
                  Email
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Invoice preview ── */}
      <div className="bg-gray-100 rounded-xl p-4 overflow-auto">
        <div ref={invoiceRef}>
          <MemoInvoiceTemplate
            saleOrder={saleOrder!}
            invoiceNumber={invoice.invoice_number}
            invoiceDate={invoice.invoice_date}
            customerDetails={customerDetails}
          />
        </div>
      </div>
    </div>
  );
};

export default InvoiceDetail;
