import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppDispatch } from '@hooks/useRedux';
import { saleService } from '@api/services/sale.service';
import { addNotification } from '@store/slices/uiSlice';
import { ArrowLeft, Printer, QrCode, CheckCircle, Package, Send, Clock, Download } from 'lucide-react';
import { format } from 'date-fns';
import QRCode from 'react-qr-code';
import { companyService } from '../../api/services/company.service';
import { Company } from '../../types/company.types';
import InvoiceTemplate from '../../components/invoices/InvoiceTemplate';
import { useRef } from 'react';
import html2pdf from 'html2pdf.js';

const AdvanceInvoiceDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [sale, setSale] = useState<any>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [downloading, setDownloading] = useState(false);
  const invoiceRef = useRef<HTMLDivElement>(null);
  const paymentBackdropRef = useRef<HTMLDivElement>(null);

  // Keep payment modal anchored to visual viewport above keyboard on Android
  useEffect(() => {
    const update = () => {
      const vv = window.visualViewport;
      if (!paymentBackdropRef.current) return;
      const top = vv?.offsetTop ?? 0;
      const h = vv?.height ?? window.innerHeight;
      paymentBackdropRef.current.style.top = `${top}px`;
      paymentBackdropRef.current.style.height = `${h}px`;
    };
    update();
    const vv = window.visualViewport;
    if (vv) { vv.addEventListener('resize', update); vv.addEventListener('scroll', update); }
    else { window.addEventListener('resize', update); }
    return () => {
      if (vv) { vv.removeEventListener('resize', update); vv.removeEventListener('scroll', update); }
      else { window.removeEventListener('resize', update); }
    };
  }, []);

  useEffect(() => {
    if (id) {
      fetchDetail();
    }
  }, [id]);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const data = await saleService.getAdvanceInvoiceById(Number(id));
      setSale(data);
      // Fetch current company settings to get UPI ID
      const currentCompany = await companyService.getCurrent();
      setCompany(currentCompany);
    } catch (error) {
      console.error('Error fetching advance invoice details:', error);
      dispatch(addNotification({ message: 'Failed to fetch details. The invoice may not exist.', type: 'error' }));
      navigate('/advance-invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string, method?: string) => {
    try {
      setUpdatingStatus(true);
      await saleService.updateAdvanceInvoiceStatus(Number(id), newStatus, method);
      dispatch(addNotification({ message: `Status updated to ${newStatus.replace('_', ' ')}`, type: 'success' }));
      if (newStatus === 'payment_received') setShowPaymentModal(false);
      fetchDetail();
    } catch (error: any) {
      console.error('Error updating status:', error);
      dispatch(addNotification({
        message: error.response?.data?.error || 'Failed to update status',
        type: 'error'
      }));
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handlePrint = () => {
    if (!invoiceRef.current || !sale) return;
    const styleContent = invoiceRef.current.querySelector('style')?.textContent ?? '';
    const outerWrapper = invoiceRef.current.querySelector('.invoice-outer-wrapper');
    const invoiceHTML = outerWrapper ? outerWrapper.outerHTML : invoiceRef.current.innerHTML;
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Advance Invoice ${sale.order_number}</title>
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
        win.print();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      };
    }
  };

  const handleDownloadPDF = async () => {
    if (!invoiceRef.current || !sale) return;
    setDownloading(true);
    const offScreen = document.createElement('div');
    offScreen.style.cssText = 'position:fixed;left:-9999px;top:0;width:210mm;background:white;z-index:-9999;';
    offScreen.appendChild(invoiceRef.current.cloneNode(true));
    document.body.appendChild(offScreen);
    const tempStyle = document.createElement('style');
    tempStyle.textContent = '.invoice-page + .invoice-page { margin-top: 0 !important; }';
    document.head.appendChild(tempStyle);
    await new Promise<void>(r => setTimeout(r, 80));
    const element = offScreen.querySelector<HTMLElement>('.invoice-outer-wrapper') ?? offScreen;
    const opt = {
      margin: 0,
      filename: `Advance_Invoice_${sale.order_number}.pdf`,
      image: { type: 'png' as const },
      html2canvas: { scale: 3, useCORS: true, backgroundColor: '#ffffff', logging: false, allowTaint: false },
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

  const renderQRCode = () => {
    if (!company?.upi_id) {
      return (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
          <QrCode className="w-12 h-12 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600">UPI ID not configured in company settings.</p>
        </div>
      );
    }

    // UPI Intent URL format
    const upiUrl = `upi://pay?pa=${company.upi_id}&pn=${encodeURIComponent(company.company_name)}&am=${sale?.total_amount}&cu=INR&tr=${sale?.order_number}`;

    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6 text-center shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Pay via UPI</h3>
        <div className="bg-white p-4 rounded-xl border border-gray-100 inline-block">
          <QRCode value={upiUrl} size={200} />
        </div>
        <p className="mt-4 text-sm text-gray-600 font-medium">Scan with any UPI app</p>
        <p className="mt-1 text-2xl font-bold text-gray-900">₹{sale?.total_amount}</p>
      </div>
    );
  };

  if (loading || !sale) {
    return (
      <div className="flex items-center justify-center p-12 w-full h-full">
         <div className="text-center">
           <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
           <p className="text-gray-600 mt-4">Loading invoice details...</p>
         </div>
      </div>
    );
  }

  const isCompleted = sale.status === 'completed';
  const advanceStatus = sale.advance_status;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
           <button
             onClick={() => navigate('/advance-invoices')}
             className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500"
             title="Back to Advance Invoices"
           >
             <ArrowLeft className="w-6 h-6" />
           </button>
           <div>
             <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
               Advance Invoice: {sale.order_number}
               <span className={`px-3 py-1 rounded-full text-xs tracking-wider uppercase font-bold ${
                 advanceStatus === 'draft' ? 'bg-gray-100 text-gray-700' :
                 advanceStatus === 'sent' ? 'bg-blue-100 text-blue-700' :
                 advanceStatus === 'payment_pending' ? 'bg-yellow-100 text-yellow-700' :
                 advanceStatus === 'payment_received' ? 'bg-green-100 text-green-700' :
                 'bg-emerald-100 text-emerald-800'
               }`}>
                 {advanceStatus?.replace('_', ' ')}
               </span>
             </h1>
             <p className="text-gray-500 mt-1">Created on: {format(new Date(sale.sale_date), 'MMMM dd, yyyy HH:mm')}</p>
           </div>
        </div>
        <div className="flex items-center gap-3">
           <button onClick={handleDownloadPDF} disabled={downloading} className="btn btn-secondary flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 disabled:opacity-50">
             {downloading ? <div className="w-4 h-4 border-2 border-gray-400 border-t-gray-700 rounded-full animate-spin" /> : <Download className="w-4 h-4" />}
             <span className="hidden sm:inline">Download PDF</span>
           </button>
           <button onClick={handlePrint} className="btn btn-secondary flex items-center gap-2">
             <Printer className="w-4 h-4" />
             <span className="hidden sm:inline">Print</span>
           </button>
        </div>
      </div>

      {/* Action Bar */}
      {(advanceStatus === 'draft' || advanceStatus === 'sent' || advanceStatus === 'payment_pending' || (advanceStatus === 'payment_received' && !isCompleted)) && (
        <div className="card bg-gray-50 border-b border-gray-200 flex flex-wrap gap-3 items-center">
        {advanceStatus === 'draft' && (
          <button onClick={() => handleUpdateStatus('sent')} disabled={updatingStatus} className="btn bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2 shadow-sm">
            <Send className="w-4 h-4" /> Mark as Sent
          </button>
        )}
        {advanceStatus === 'sent' && (
          <button onClick={() => handleUpdateStatus('payment_pending')} disabled={updatingStatus} className="btn bg-yellow-600 text-white hover:bg-yellow-700 flex items-center gap-2 shadow-sm">
            <Clock className="w-4 h-4" /> Wait for Payment
          </button>
        )}
        {(advanceStatus === 'sent' || advanceStatus === 'payment_pending') && (
          <button onClick={() => setShowPaymentModal(true)} disabled={updatingStatus} className="btn bg-green-600 text-white hover:bg-green-700 flex items-center gap-2 shadow-sm">
            <CheckCircle className="w-4 h-4" /> Confirm Payment Received
          </button>
        )}
        {advanceStatus === 'payment_received' && !isCompleted && (
           <button onClick={() => handleUpdateStatus('product_released')} disabled={updatingStatus} className="btn bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-2 shadow-sm">
             <Package className="w-4 h-4" /> Release Product (Deduct Stock)
           </button>
        )}
      </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card shadow-sm border border-gray-100 bg-gray-100 overflow-x-auto p-4 md:p-8">
              <div ref={invoiceRef}>
                <InvoiceTemplate
                   saleOrder={sale}
                   invoiceNumber={sale.order_number}
                   invoiceDate={sale.sale_date}
                   customerDetails={{
                     name: sale.customer_name,
                     gstin: sale.customer_details?.gstin || '',
                     address: sale.customer_details?.address || '',
                     city: sale.customer_details?.city || '',
                     state: sale.customer_details?.state_name || sale.billing_state,
                     pincode: sale.customer_details?.pincode || '',
                     phone: sale.customer_details?.phone || '',
                     email: sale.customer_details?.email || '',
                   }}
                />
              </div>
          </div>
        </div>

        {/* Sidebar info (QR Code, Download) */}
        <div className="space-y-6">
           {['draft', 'sent', 'payment_pending'].includes(advanceStatus) && renderQRCode()}

           <div className="card border border-gray-200 shadow-sm space-y-3 bg-gradient-to-b from-white to-gray-50 p-5">
              <h3 className="text-lg font-semibold text-gray-900 mb-2 border-b border-gray-100 pb-2">Actions</h3>
              <button onClick={handleDownloadPDF} disabled={downloading} className="w-full btn flex items-center justify-center gap-2 py-3 shadow-sm hover:shadow-md transition-all bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 font-medium disabled:opacity-50">
                {downloading ? <div className="w-5 h-5 border-2 border-gray-400 border-t-gray-700 rounded-full animate-spin" /> : <Download className="w-5 h-5" />}
                Download PDF
              </button>
              <button onClick={handlePrint} className="w-full btn btn-primary flex items-center justify-center gap-2 py-3 shadow-md hover:shadow-lg transition-all">
                <Printer className="w-5 h-5" /> Print Invoice
              </button>
           </div>
        </div>

      </div>

      {/* Payment Confirmation Modal */}
      {showPaymentModal && (
        <div
          ref={paymentBackdropRef}
          className="fixed inset-x-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200"
          style={{ top: 0, height: '100vh' }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 animate-in zoom-in-95 duration-200"
            style={{ maxHeight: 'calc(var(--viewport-height, 100vh) - 32px)', overflowY: 'auto' }}
          >
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Confirm Payment</h3>
            <p className="text-gray-500 mb-6 leading-relaxed">
              Please select the payment method used by the customer. This will permanently mark this advance invoice as paid.
            </p>

            <div className="space-y-5 mb-8">
               <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <label className="block text-sm font-medium text-gray-500 mb-1">Amount to Collect</label>
                  <div className="text-3xl font-bold text-primary-600 tabular-nums">₹{sale.total_amount}</div>
               </div>
               <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method <span className="text-red-500">*</span></label>
                  <select
                     value={paymentMethod}
                     onChange={(e) => setPaymentMethod(e.target.value)}
                     className="input-field w-full px-4 py-3 bg-gray-50 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:bg-white transition-colors outline-none cursor-pointer"
                     required
                  >
                     <option value="cash">Cash</option>
                     <option value="card">Card</option>
                     <option value="upi">UPI</option>
                     <option value="net_banking">Net Banking</option>
                  </select>
               </div>
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-gray-100">
               <button onClick={() => setShowPaymentModal(false)} className="btn hover:bg-gray-100 text-gray-600 px-6 font-medium">
                  Cancel
               </button>
               <button
                 onClick={() => handleUpdateStatus('payment_received', paymentMethod)}
                 disabled={updatingStatus}
                 className="btn bg-green-600 text-white hover:bg-green-700 px-6 font-medium shadow-md hover:shadow-lg transition-all flex items-center gap-2"
               >
                 {updatingStatus ? 'Confirming...' : <><CheckCircle className="w-5 h-5"/> Confirm Payment</>}
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvanceInvoiceDetail;
