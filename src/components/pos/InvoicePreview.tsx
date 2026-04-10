import React from 'react';
import { X, Printer, FileText } from 'lucide-react';

interface InvoicePreviewProps {
  sale: any;
  onClose: () => void;
  onGenerateInvoice?: () => void;
}

const InvoicePreview: React.FC<InvoicePreviewProps> = ({ sale, onClose, onGenerateInvoice }) => {
  const handlePrint = () => {
    const isInterstate = Number(sale.igst_amount) > 0;

    // Build tax breakdown
    const taxBreakdown: Record<number, { taxableAmount: number; cgst: number; sgst: number; igst: number }> = {};
    let exemptedAmount = 0;
    let totalGST = 0;
    (sale.items || []).forEach((item: any) => {
      const qty = Number(item.quantity) || 0;
      const unitPrice = Number(item.unit_price) || 0;
      const lineTotal = qty * unitPrice;
      const rate = Number(item.gst_rate) || 0;
      if (rate === 0) {
        exemptedAmount += lineTotal;
      } else {
        if (!taxBreakdown[rate]) taxBreakdown[rate] = { taxableAmount: 0, cgst: 0, sgst: 0, igst: 0 };
        const taxAmt = (lineTotal * rate) / 100;
        taxBreakdown[rate].taxableAmount += lineTotal;
        if (isInterstate) taxBreakdown[rate].igst += taxAmt;
        else { taxBreakdown[rate].cgst += taxAmt / 2; taxBreakdown[rate].sgst += taxAmt / 2; }
        totalGST += taxAmt;
      }
    });

    const itemRows = (sale.items || []).map((item: any) => {
      const qty = Number(item.quantity) || 0;
      const unitPrice = parseFloat(item.unit_price) || 0;
      const taxableValue = qty * unitPrice;
      const gstRate = parseFloat(item.gst_rate) || 0;
      const totalTax = (taxableValue * gstRate) / 100;
      const cgst = isInterstate ? 0 : totalTax / 2;
      const sgst = isInterstate ? 0 : totalTax / 2;
      const lineTotal = taxableValue + totalTax;
      return `
        <tr>
          <td style="padding:5px 4px;border-bottom:1px solid #e5e7eb;">
            <div style="font-weight:600">${item.product_name || item.product}</div>
            <div style="font-size:9px;color:#6b7280">HSN: ${item.hsn_code || '—'} | GST ${gstRate}%</div>
          </td>
          <td style="text-align:center;padding:5px 4px;border-bottom:1px solid #e5e7eb;">${qty}</td>
          <td style="text-align:right;padding:5px 4px;border-bottom:1px solid #e5e7eb;">₹${unitPrice.toFixed(2)}</td>
          <td style="text-align:right;padding:5px 4px;border-bottom:1px solid #e5e7eb;">₹${taxableValue.toFixed(2)}</td>
          <td style="text-align:right;padding:5px 4px;border-bottom:1px solid #e5e7eb;">
            ${gstRate > 0 ? `₹${cgst.toFixed(2)}<div style="font-size:9px;color:#9ca3af">@${gstRate / 2}%</div>` : '—'}
          </td>
          <td style="text-align:right;padding:5px 4px;border-bottom:1px solid #e5e7eb;">
            ${gstRate > 0 ? `₹${sgst.toFixed(2)}<div style="font-size:9px;color:#9ca3af">@${gstRate / 2}%</div>` : '—'}
          </td>
          <td style="text-align:right;padding:5px 4px;border-bottom:1px solid #e5e7eb;font-weight:700;">₹${lineTotal.toFixed(2)}</td>
        </tr>`;
    }).join('');

    const taxRows = Object.entries(taxBreakdown)
      .sort(([a], [b]) => Number(b) - Number(a))
      .map(([rate, b]) => `
        <tr><td colspan="2" style="border-top:1px dashed #d1d5db;padding:3px 0;font-weight:600">Taxable (${rate}%)</td><td style="text-align:right;border-top:1px dashed #d1d5db;font-weight:600">₹${b.taxableAmount.toFixed(2)}</td></tr>
        ${isInterstate
          ? `<tr><td colspan="2" style="padding:2px 0 2px 12px;font-size:10px;color:#4b5563">IGST @${rate}%</td><td style="text-align:right;font-size:10px;color:#4b5563">₹${b.igst.toFixed(2)}</td></tr>`
          : `<tr><td colspan="2" style="padding:2px 0 2px 12px;font-size:10px;color:#4b5563">CGST @${Number(rate)/2}%</td><td style="text-align:right;font-size:10px;color:#4b5563">₹${b.cgst.toFixed(2)}</td></tr>
             <tr><td colspan="2" style="padding:2px 0 2px 12px;font-size:10px;color:#4b5563">SGST @${Number(rate)/2}%</td><td style="text-align:right;font-size:10px;color:#4b5563">₹${b.sgst.toFixed(2)}</td></tr>`
        }`).join('');

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Invoice #${sale.order_number}</title>
  <style>
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Courier New', monospace; font-size: 11px; color: #111; padding: 15mm; }
    h1 { font-size: 18px; font-weight: 700; margin-bottom: 4px; }
    .center { text-align: center; }
    .divider { border-top: 2px dashed #9ca3af; margin: 10px 0; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #f3f4f6; padding: 6px 4px; font-weight: 700; border-bottom: 2px solid #d1d5db; }
    .summary-table td { padding: 3px 0; }
    .total-row td { border-top: 2px solid #374151; padding-top: 6px; font-size: 14px; font-weight: 700; }
    .footer { text-align: center; margin-top: 16px; padding-top: 10px; border-top: 2px dashed #9ca3af; font-size: 10px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="center" style="padding-bottom:10px;border-bottom:2px dashed #9ca3af;margin-bottom:10px">
    <h1>${sale.company?.company_name || 'COMPANY NAME'}</h1>
    <div>${sale.company?.address_line1 || ''}</div>
    <div>${[sale.company?.city, sale.company?.state].filter(Boolean).join(', ')}</div>
    ${sale.company?.phone ? `<div>Ph: ${sale.company.phone}</div>` : ''}
    ${sale.company?.gstin ? `<div>GSTIN: ${sale.company.gstin}</div>` : ''}
  </div>

  <table class="summary-table" style="margin-bottom:10px">
    <tr><td style="width:40%">Invoice:</td><td style="text-align:right;font-weight:700">#${sale.order_number}</td></tr>
    <tr><td>Date:</td><td style="text-align:right">${new Date(sale.created_at).toLocaleString()}</td></tr>
    <tr><td>Customer:</td><td style="text-align:right">${sale.customer?.name || 'Walk-in Customer'}</td></tr>
    ${sale.customer?.phone ? `<tr><td>Phone:</td><td style="text-align:right">${sale.customer.phone}</td></tr>` : ''}
    <tr><td>Payment:</td><td style="text-align:right;text-transform:uppercase">${sale.payment_method}</td></tr>
  </table>

  <div class="divider"></div>

  <table style="margin-bottom:10px">
    <thead>
      <tr>
        <th style="text-align:left">Item / HSN</th>
        <th style="text-align:center">Qty</th>
        <th style="text-align:right">Rate</th>
        <th style="text-align:right">Taxable</th>
        <th style="text-align:right">CGST</th>
        <th style="text-align:right">SGST</th>
        <th style="text-align:right">Amount</th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>

  <div class="divider"></div>

  <table class="summary-table">
    <tr><td colspan="2">Subtotal:</td><td style="text-align:right">₹${parseFloat(sale.subtotal || 0).toFixed(2)}</td></tr>
    ${taxRows}
    ${exemptedAmount > 0 ? `<tr><td colspan="2" style="border-top:1px dashed #d1d5db;padding-top:4px">Exempted (0%)</td><td style="text-align:right;border-top:1px dashed #d1d5db;padding-top:4px">₹${exemptedAmount.toFixed(2)}</td></tr>` : ''}
    <tr><td colspan="2" style="border-top:1px solid #9ca3af;padding-top:4px;font-weight:600">Total GST:</td><td style="text-align:right;border-top:1px solid #9ca3af;padding-top:4px;font-weight:600">₹${totalGST.toFixed(2)}</td></tr>
    ${Number(sale.discount_amount) > 0 ? `<tr><td colspan="2" style="color:#16a34a">Discount:</td><td style="text-align:right;color:#16a34a">-₹${parseFloat(sale.discount_amount).toFixed(2)}</td></tr>` : ''}
    ${sale.round_off && sale.round_off !== 0 ? `<tr><td colspan="2">Round Off:</td><td style="text-align:right">${Number(sale.round_off) > 0 ? '+' : ''}₹${parseFloat(sale.round_off).toFixed(2)}</td></tr>` : ''}
    <tr class="total-row"><td colspan="2">TOTAL:</td><td style="text-align:right">₹${parseFloat(sale.total_amount || 0).toFixed(2)}</td></tr>
  </table>

  <div class="footer">
    <p style="font-weight:700;font-size:12px;margin-bottom:4px">Thank You! Visit Again</p>
    ${sale.company?.terms_and_conditions ? `<p>${sale.company.terms_and_conditions}</p>` : ''}
    <p>Powered by ShopFlow POS</p>
  </div>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const blobUrl = URL.createObjectURL(blob);

    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:none;visibility:hidden;';
    document.body.appendChild(iframe);

    iframe.onload = () => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
        if (document.body.contains(iframe)) document.body.removeChild(iframe);
      }, 1000);
    };

    iframe.src = blobUrl;
  };
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header - Hidden on print */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 print:hidden">
          <h2 className="text-lg font-bold text-gray-900">Invoice Preview</h2>
          <div className="flex gap-2">
            {onGenerateInvoice && (
              <button
                onClick={onGenerateInvoice}
                className="btn btn-secondary flex items-center gap-2 text-sm"
              >
                <FileText className="w-4 h-4" />
                Generate Invoice
              </button>
            )}
            <button onClick={handlePrint} className="btn btn-primary flex items-center gap-2 text-sm">
              <Printer className="w-4 h-4" />
              Print
            </button>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Thermal Receipt Content */}
        <div className="p-4 font-mono text-sm" id="thermal-receipt">
          {/* Company Header */}
          <div className="text-center border-b-2 border-dashed border-gray-400 pb-3 mb-3">
            <h1 className="text-lg font-bold">{sale.company?.company_name || 'COMPANY NAME'}</h1>
            <p className="text-xs mt-1">{sale.company?.address_line1}</p>
            <p className="text-xs">{sale.company?.city}, {sale.company?.state}</p>
            <p className="text-xs">Ph: {sale.company?.phone}</p>
            <p className="text-xs">GSTIN: {sale.company?.gstin}</p>
          </div>

          {/* Invoice Details */}
          <div className="text-xs space-y-1 mb-3">
            <div className="flex justify-between">
              <span>Invoice:</span>
              <span className="font-bold">#{sale.order_number}</span>
            </div>
            <div className="flex justify-between">
              <span>Date:</span>
              <span>{new Date(sale.created_at).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Customer:</span>
              <span>{sale.customer?.name || 'Guest'}</span>
            </div>
            {sale.customer?.phone && (
              <div className="flex justify-between">
                <span>Phone:</span>
                <span>{sale.customer.phone}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Payment:</span>
              <span className="uppercase">{sale.payment_method}</span>
            </div>
          </div>

          {/* Items */}
          <div className="border-t-2 border-dashed border-gray-400 pt-2 mb-2">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b-2 border-gray-300 bg-gray-50">
                  <th className="text-left py-1.5 px-1">Item / HSN</th>
                  <th className="text-center py-1.5 px-1">Qty</th>
                  <th className="text-right py-1.5 px-1">Rate</th>
                  <th className="text-right py-1.5 px-1">Taxable</th>
                  <th className="text-right py-1.5 px-1">CGST</th>
                  <th className="text-right py-1.5 px-1">SGST</th>
                  <th className="text-right py-1.5 px-1">Amt</th>
                </tr>
              </thead>
              <tbody>
                {sale.items?.map((item: any, index: number) => {
                  const qty = Number(item.quantity) || 0;
                  const unitPrice = parseFloat(item.unit_price) || 0;
                  const taxableValue = qty * unitPrice;
                  const gstRate = parseFloat(item.gst_rate) || 0;
                  const isInterstate = Number(sale.igst_amount) > 0;
                  const totalTax = (taxableValue * gstRate) / 100;
                  const cgst = isInterstate ? 0 : totalTax / 2;
                  const sgst = isInterstate ? 0 : totalTax / 2;
                  const lineTotal = taxableValue + totalTax;
                  return (
                    <React.Fragment key={index}>
                      <tr className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-1.5 px-1">
                          <div className="font-medium">{item.product_name || item.product}</div>
                          <div className="text-[10px] text-gray-400">HSN: {item.hsn_code || '—'} | GST {gstRate}%</div>
                        </td>
                        <td className="text-center py-1.5 px-1">{qty}</td>
                        <td className="text-right py-1.5 px-1">₹{unitPrice.toFixed(2)}</td>
                        <td className="text-right py-1.5 px-1">₹{taxableValue.toFixed(2)}</td>
                        <td className="text-right py-1.5 px-1">
                          {gstRate > 0 ? `₹${cgst.toFixed(2)}` : '0.00'}
                          {gstRate > 0 ? <div className="text-[9px] text-gray-400">@{gstRate / 2}%</div> : <div className="text-[9px] text-gray-400">@{gstRate}%</div>}
                        </td>
                        <td className="text-right py-1.5 px-1 ">
                          {gstRate > 0 ? `₹${sgst.toFixed(2)}` : '0.00'}
                          {gstRate > 0 ? <div className="text-[9px] text-gray-400">@{gstRate / 2}%</div> : <div className="text-[9px] text-gray-400">@{gstRate}%</div>}
                        </td>
                        <td className="text-right py-1.5 px-1 font-bold">₹{lineTotal.toFixed(2)}</td>
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>


          <div className="border-t-2 border-dashed border-gray-400 pt-2 space-y-1 text-xs">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>₹{parseFloat(sale.subtotal || 0).toFixed(2)}</span>
            </div>

            {(() => {
              // Calculate Invoice Breakdown on the fly for preview
              const taxBreakdown: Record<number, { taxableAmount: number; cgst: number; sgst: number; igst: number }> = {};
              let exemptedAmount = 0;
              let totalGST = 0;

              // Helper to check if interstate (simple heuristic or data based)
              // Assuming intra-state for receipt unless explicit data available,
              // or deriving from existing fields.
              // Existing code used sale.igst_amount > 0 to detect.
              const isInterstate = Number(sale.igst_amount) > 0;

              if (sale.items) {
                sale.items.forEach((item: any) => {
                   const qty = Number(item.quantity) || 0;
                   const unitPrice = Number(item.unit_price) || 0;
                   const lineTotal = qty * unitPrice; // Taxable Value
                   const rate = Number(item.gst_rate) || 0;

                   if (rate === 0) {
                     exemptedAmount += lineTotal;
                   } else {
                     if (!taxBreakdown[rate]) taxBreakdown[rate] = { taxableAmount: 0, cgst: 0, sgst: 0, igst: 0 };

                     const taxAmt = (lineTotal * rate) / 100;
                     taxBreakdown[rate].taxableAmount += lineTotal;

                     if (isInterstate) {
                        taxBreakdown[rate].igst += taxAmt;
                     } else {
                        taxBreakdown[rate].cgst += taxAmt / 2;
                        taxBreakdown[rate].sgst += taxAmt / 2;
                     }
                     totalGST += taxAmt;
                   }
                });
              }

              return (
                <>
                  {Object.entries(taxBreakdown).sort(([a], [b]) => Number(b) - Number(a)).map(([rate, breakdown]) => (
                    <div key={rate} className="border-t border-dashed border-gray-300 py-1">
                      <div className="flex justify-between font-medium">
                        <span>Taxable ({rate}%)</span>
                        <span>₹{breakdown.taxableAmount.toFixed(2)}</span>
                      </div>
                      {isInterstate ? (
                        <div className="flex justify-between text-[10px] pl-2 text-gray-600">
                           <span>IGST @{rate}%</span>
                           <span>₹{breakdown.igst.toFixed(2)}</span>
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-between text-[10px] pl-2 text-gray-600">
                             <span>CGST @{Number(rate)/2}%</span>
                             <span>₹{breakdown.cgst.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-[10px] pl-2 text-gray-600">
                             <span>SGST @{Number(rate)/2}%</span>
                             <span>₹{breakdown.sgst.toFixed(2)}</span>
                          </div>
                        </>
                      )}
                    </div>
                  ))}

                  {exemptedAmount > 0 && (
                    <div className="flex justify-between border-t border-dashed border-gray-300 py-1">
                      <span>Exempted (0%)</span>
                      <span>₹{exemptedAmount.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="flex justify-between font-semibold border-t border-gray-400 pt-1">
                    <span>Total GST:</span>
                    <span>₹{totalGST.toFixed(2)}</span>
                  </div>
                </>
              );
            })()}

            {sale.discount_amount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount ({sale.discount_percentage}%):</span>
                <span>-₹{parseFloat(sale.discount_amount).toFixed(2)}</span>
              </div>
            )}

            {sale.round_off !== 0 && (
              <div className="flex justify-between">
                <span>Round Off:</span>
                <span>{sale.round_off > 0 ? '+' : ''}₹{parseFloat(sale.round_off).toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between text-base font-bold pt-1 border-t border-gray-400">
              <span>TOTAL:</span>
              <span>₹{parseFloat(sale.total_amount || 0).toFixed(2)}</span>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t-2 border-dashed border-gray-400 mt-3 pt-3 text-center text-xs">
            <p className="font-bold mb-1">Thank You! Visit Again</p>
            {sale.company?.terms_and_conditions && (
              <p className="text-xs text-gray-600 mt-2">{sale.company.terms_and_conditions}</p>
            )}
            <p className="text-xs text-gray-500 mt-2">
              Powered by ShopFlow POS
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};

export default InvoicePreview;
