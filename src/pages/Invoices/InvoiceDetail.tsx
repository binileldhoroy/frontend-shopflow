import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { ArrowLeft, Download, Printer, Share2, Mail, Copy, Check, MessageCircle, X } from 'lucide-react';
import { format } from 'date-fns';
import html2pdf from 'html2pdf.js';
import { invoiceService } from '../../api/services/invoice.service';
import { TaxInvoice } from '../../types/invoice.types';
import InvoiceTemplate from '../../components/invoices/InvoiceTemplate';

const InvoiceDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [invoice, setInvoice] = useState<TaxInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

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

  const handlePrint = useReactToPrint({
    contentRef: invoiceRef,
    documentTitle: `Invoice_${invoice?.invoice_number || id}`,
  });

  const handleDownloadPDF = async () => {
    if (!invoiceRef.current || !invoice) return;
    setDownloading(true);
    const opt = {
      margin: [8, 8, 8, 8] as [number, number, number, number],
      filename: `Invoice_${invoice.invoice_number}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
      jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const },
      pagebreak: { mode: ['css', 'legacy'], before: '.invoice-page:not(:first-child)' },
    };
    try {
      await html2pdf().set(opt).from(invoiceRef.current).save();
    } finally {
      setDownloading(false);
    }
  };

  const shareUrl = window.location.href;
  const shareText = invoice
    ? `Invoice ${invoice.invoice_number} — ${invoice.customer_name} — ₹${invoice.sale_order_data?.total_amount ?? ''}`
    : 'Invoice';

  const handleShareWhatsApp = () => {
    const msg = encodeURIComponent(`${shareText}\n${shareUrl}`);
    window.open(`https://wa.me/?text=${msg}`, '_blank');
    setShowShareMenu(false);
  };

  const handleShareEmail = () => {
    const subject = encodeURIComponent(`Invoice ${invoice?.invoice_number}`);
    const body = encodeURIComponent(`${shareText}\n\nView invoice: ${shareUrl}`);
    window.open(`mailto:?subject=${subject}&body=${body}`);
    setShowShareMenu(false);
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setShowShareMenu(false);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-700 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !invoice) {
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
      <div className="flex items-center justify-between">
        {/* Left: Back + title */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/invoices')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500"
            title="Back to Invoices"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 font-mono">{invoice.invoice_number}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {format(new Date(invoice.invoice_date), 'dd MMM yyyy')} · {invoice.customer_name}
            </p>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
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

          {/* Copy link feedback */}
          {copied && (
            <span className="flex items-center gap-1 text-xs text-green-600 font-medium px-2">
              <Check className="w-3.5 h-3.5" /> Copied!
            </span>
          )}

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
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <MessageCircle className="w-4 h-4 text-green-500" />
                  WhatsApp
                </button>
                <button
                  onClick={handleShareEmail}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Mail className="w-4 h-4 text-blue-500" />
                  Email
                </button>
                <button
                  onClick={handleCopyLink}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Copy className="w-4 h-4 text-gray-500" />
                  Copy Link
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Invoice preview ── */}
      <div className="bg-gray-100 rounded-xl p-4 overflow-auto">
        <div ref={invoiceRef}>
          <InvoiceTemplate
            saleOrder={invoice.sale_order_data}
            invoiceNumber={invoice.invoice_number}
            invoiceDate={invoice.invoice_date}
            invoiceUrl={shareUrl}
            customerDetails={{
              name: invoice.customer_name,
              gstin: invoice.customer_gstin,
              address: invoice.customer_address,
              city: invoice.customer_city,
              pincode: invoice.customer_pincode,
              phone: invoice.customer_phone,
              email: invoice.customer_email,
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default InvoiceDetail;
