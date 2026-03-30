import React from 'react';
import { X, Printer } from 'lucide-react';

interface InvoicePreviewProps {
  sale: any;
  onClose: () => void;
}

const InvoicePreview: React.FC<InvoicePreviewProps> = ({ sale, onClose }) => {
  const handlePrint = () => {
    window.print();
  };
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header - Hidden on print */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 print:hidden">
          <h2 className="text-lg font-bold text-gray-900">Invoice Preview</h2>
          <div className="flex gap-2">
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
                          {gstRate > 0 ? `₹${cgst.toFixed(2)}` : '—'}
                          {gstRate > 0 && <div className="text-[9px] text-gray-400">@{gstRate / 2}%</div>}
                        </td>
                        <td className="text-right py-1.5 px-1 ">
                          {gstRate > 0 ? `₹${sgst.toFixed(2)}` : '—'}
                          {gstRate > 0 && <div className="text-[9px] text-gray-400">@{gstRate / 2}%</div>}
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

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #thermal-receipt, #thermal-receipt * {
            visibility: visible;
          }
          #thermal-receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm;
            font-size: 12px;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default InvoicePreview;
