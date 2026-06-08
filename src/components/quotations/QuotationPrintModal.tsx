import React from 'react';
import Modal from '../common/Modal/Modal';
import { Printer, X } from 'lucide-react';
import { useAppSelector } from '../../hooks/useRedux';

interface QuotationPrintModalProps {
  show: boolean;
  onHide: () => void;
  quotation: any;
}

function fmt(date: string) {
  return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtINR(v: number | string) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(Number(v));
}

const STATUS_COLOR: Record<string, string> = {
  draft: '#f59e0b', sent: '#3b82f6', accepted: '#10b981',
  expired: '#ef4444', converted: '#6366f1',
};

/* ─── Self-contained print HTML (no Tailwind dependency) ─── */
function generatePrintHTML(q: any, company: any) {
  const isExpired = new Date(q.validity_date) < new Date() && q.status !== 'converted';
  const statusColor = STATUS_COLOR[q.status] || '#6b7280';

  const itemRows = q.items.map((item: any, idx: number) => `
    <tr style="background:${idx % 2 === 1 ? '#f9fafb' : '#fff'}">
      <td style="padding:9px 12px;border-bottom:1px solid #f3f4f6;color:#9ca3af;font-size:12px">${idx + 1}</td>
      <td style="padding:9px 12px;border-bottom:1px solid #f3f4f6;font-weight:600;color:#111827">${item.product_name}</td>
      <td style="padding:9px 12px;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:12px">${item.hsn_code || '—'}</td>
      <td style="padding:9px 12px;border-bottom:1px solid #f3f4f6;text-align:right">${Number(item.quantity)}</td>
      <td style="padding:9px 12px;border-bottom:1px solid #f3f4f6;text-align:right">${fmtINR(item.unit_price)}</td>
      <td style="padding:9px 12px;border-bottom:1px solid #f3f4f6;text-align:right;color:#6b7280">${Number(item.gst_rate)}%</td>
      <td style="padding:9px 12px;border-bottom:1px solid #f3f4f6;text-align:right;font-weight:700">${fmtINR(item.total_with_gst)}</td>
    </tr>`).join('');

  const discountRow = Number(q.discount_amount) > 0 ? `
    <tr>
      <td style="padding:8px 14px;font-size:13px;border-bottom:1px solid #f3f4f6;color:#6b7280">Discount</td>
      <td style="padding:8px 14px;font-size:13px;border-bottom:1px solid #f3f4f6;text-align:right;color:#dc2626">− ${fmtINR(q.discount_amount)}</td>
    </tr>` : '';

  const companyAddr = [
    company?.address_line1,
    company?.address_line2,
    [company?.city, company?.state, company?.pincode].filter(Boolean).join(', '),
  ].filter(Boolean).join('<br>');

  const notesBlock = q.notes ? `
    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:14px;margin-bottom:14px">
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#92400e;font-weight:700;margin-bottom:5px">Notes</div>
      <div style="font-size:12px;color:#78350f;line-height:1.6">${q.notes}</div>
    </div>` : '';

  const termsBlock = q.terms ? `
    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:14px;margin-bottom:14px">
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#1e40af;font-weight:700;margin-bottom:5px">Terms &amp; Conditions</div>
      <div style="font-size:12px;color:#1e3a8a;line-height:1.6">${q.terms}</div>
    </div>` : '';

  const expiredBanner = isExpired ? `
    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:10px 14px;margin-bottom:18px;font-size:12px;color:#dc2626;font-weight:600">
      ⚠ This quotation expired on ${fmt(q.validity_date)}.
    </div>` : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Quotation ${q.quote_number}</title>
  <style>
    @page { margin: 20mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #111827; background: #fff; }
    table { border-collapse: collapse; }
  </style>
</head>
<body>

<!-- Header -->
<div style="display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:20px;border-bottom:2px solid #e5e7eb;margin-bottom:24px">
  <div>
    <div style="font-size:20px;font-weight:800;color:#111827">${company?.company_name || 'Your Company'}</div>
    <div style="font-size:12px;color:#6b7280;margin-top:6px;line-height:1.7">${companyAddr}
      ${company?.gstin ? `<br>GSTIN: <strong>${company.gstin}</strong>` : ''}
      ${company?.phone ? `<br>Ph: ${company.phone}` : ''}
      ${company?.email ? `<br>${company.email}` : ''}
    </div>
  </div>
  <div style="text-align:right">
    <div style="font-size:32px;font-weight:900;color:#059669;letter-spacing:3px">QUOTATION</div>
    <div style="font-size:13px;color:#6b7280;margin-top:4px">#${q.quote_number}</div>
    <div style="display:inline-block;margin-top:8px;padding:3px 12px;border-radius:20px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#fff;background:${statusColor}">${q.status}</div>
  </div>
</div>

${expiredBanner}

<!-- Bill To + Dates -->
<div style="display:flex;gap:20px;margin-bottom:24px">
  <div style="flex:1;background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:16px">
    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;margin-bottom:8px">Bill To</div>
    <div style="font-size:15px;font-weight:700;color:#111827">${q.customer_name || '—'}</div>
    ${q.customer_phone ? `<div style="font-size:12px;color:#6b7280;margin-top:4px">Ph: ${q.customer_phone}</div>` : ''}
  </div>
  <div style="width:220px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:16px">
    <div style="margin-bottom:10px">
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;margin-bottom:3px">Date Issued</div>
      <div style="font-size:13px;font-weight:600;color:#111827">${fmt(q.created_date)}</div>
    </div>
    <div>
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;margin-bottom:3px">Valid Until</div>
      <div style="font-size:13px;font-weight:600;color:${isExpired ? '#dc2626' : '#111827'}">${fmt(q.validity_date)}</div>
    </div>
  </div>
</div>

<!-- Items Table -->
<table width="100%" style="margin-bottom:24px;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden">
  <thead>
    <tr style="background:#059669;color:#fff">
      <th style="padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;width:32px">#</th>
      <th style="padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">Item / Description</th>
      <th style="padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;width:70px">HSN</th>
      <th style="padding:10px 12px;text-align:right;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;width:50px">Qty</th>
      <th style="padding:10px 12px;text-align:right;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;width:100px">Unit Price</th>
      <th style="padding:10px 12px;text-align:right;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;width:55px">GST%</th>
      <th style="padding:10px 12px;text-align:right;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;width:100px">Total</th>
    </tr>
  </thead>
  <tbody>${itemRows}</tbody>
</table>

<!-- Totals -->
<div style="display:flex;justify-content:flex-end;margin-bottom:24px">
  <table style="width:260px;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden">
    <tr>
      <td style="padding:9px 14px;font-size:13px;border-bottom:1px solid #f3f4f6;color:#6b7280">Subtotal</td>
      <td style="padding:9px 14px;font-size:13px;border-bottom:1px solid #f3f4f6;text-align:right">${fmtINR(q.subtotal)}</td>
    </tr>
    <tr>
      <td style="padding:9px 14px;font-size:13px;border-bottom:1px solid #f3f4f6;color:#6b7280">GST</td>
      <td style="padding:9px 14px;font-size:13px;border-bottom:1px solid #f3f4f6;text-align:right">${fmtINR(q.gst_amount)}</td>
    </tr>
    ${discountRow}
    <tr>
      <td style="padding:11px 14px;font-size:14px;font-weight:700;background:#059669;color:#fff">Total Amount</td>
      <td style="padding:11px 14px;font-size:14px;font-weight:700;text-align:right;background:#059669;color:#fff">${fmtINR(q.total_amount)}</td>
    </tr>
  </table>
</div>

${notesBlock}${termsBlock}

<!-- Footer -->
<div style="text-align:center;font-size:11px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:14px;margin-top:8px">
  This is a computer-generated quotation. No signature required.
  ${company?.company_name ? `<br><strong style="color:#6b7280">${company.company_name}</strong>` : ''}
</div>

</body>
</html>`;
}

/* ─── Modal component ─── */
const QuotationPrintModal: React.FC<QuotationPrintModalProps> = ({ show, onHide, quotation }) => {
  const { currentCompany } = useAppSelector((state) => state.company);

  if (!quotation) return null;

  const company = currentCompany;
  const isExpired = new Date(quotation.validity_date) < new Date() && quotation.status !== 'converted';
  const statusColor = STATUS_COLOR[quotation.status] || '#6b7280';

  const handlePrint = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(generatePrintHTML(quotation, company));
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 400);
  };

  return (
    <Modal
      show={show}
      onHide={onHide}
      title={`Quotation — ${quotation.quote_number}`}
      size="xl"
      footer={
        <div className="flex items-center gap-2 w-full justify-between">
          <button className="btn btn-outline-secondary" onClick={onHide}>
            <X className="w-4 h-4 inline mr-1" />Close
          </button>
          <button className="btn btn-primary flex items-center gap-1.5" onClick={handlePrint}>
            <Printer className="w-4 h-4" /> Print / Download
          </button>
        </div>
      }
    >
      {/* ── In-modal preview (Tailwind) ── */}
      <div className="bg-gray-50 rounded-xl p-4 -m-2">
        <div className="bg-white rounded-lg shadow-sm p-8 max-w-3xl mx-auto text-sm text-gray-800">

          {/* Header */}
          <div className="flex justify-between items-start mb-6 pb-5 border-b-2 border-gray-100">
            <div>
              <div className="text-xl font-bold text-gray-900">{company?.company_name || 'Your Company'}</div>
              <div className="text-xs text-gray-500 mt-1.5 space-y-0.5 leading-relaxed">
                {company?.address_line1 && <div>{company.address_line1}{company?.address_line2 ? `, ${company.address_line2}` : ''}</div>}
                {(company?.city || company?.state) && <div>{[company?.city, company?.state, company?.pincode].filter(Boolean).join(', ')}</div>}
                {company?.gstin && <div>GSTIN: <span className="font-semibold">{company.gstin}</span></div>}
                {company?.phone && <div>Ph: {company.phone}</div>}
                {company?.email && <div>{company.email}</div>}
              </div>
            </div>
            <div className="text-right">
              <h1 className="text-3xl font-black tracking-widest text-emerald-600">QUOTATION</h1>
              <div className="text-xs text-gray-400 mt-1">#{quotation.quote_number}</div>
              <div className="inline-block mt-2 px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider text-white" style={{ background: statusColor }}>
                {quotation.status}
              </div>
            </div>
          </div>

          {isExpired && (
            <div className="mb-4 p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-semibold">
              ⚠ This quotation expired on {fmt(quotation.validity_date)}.
            </div>
          )}

          {/* Bill To + Dates */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Bill To</div>
              <div className="font-bold text-gray-900 text-base">{quotation.customer_name || '—'}</div>
              {quotation.customer_phone && <div className="text-xs text-gray-500 mt-1">Ph: {quotation.customer_phone}</div>}
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 space-y-2.5">
              <div>
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Date Issued</div>
                <div className="font-semibold text-gray-800 mt-0.5">{fmt(quotation.created_date)}</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Valid Until</div>
                <div className={`font-semibold mt-0.5 ${isExpired ? 'text-red-600' : 'text-gray-800'}`}>{fmt(quotation.validity_date)}</div>
              </div>
            </div>
          </div>

          {/* Items table */}
          <div className="border border-gray-200 rounded-xl overflow-hidden mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-emerald-600 text-white">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide w-8">#</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Item</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide w-20">HSN</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide w-14">Qty</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide w-28">Unit Price</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide w-16">GST%</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide w-28">Total</th>
                </tr>
              </thead>
              <tbody>
                {quotation.items.map((item: any, idx: number) => (
                  <tr key={idx} className={`border-b border-gray-100 last:border-b-0 ${idx % 2 === 1 ? 'bg-gray-50/60' : ''}`}>
                    <td className="px-4 py-2.5 text-xs text-gray-400">{idx + 1}</td>
                    <td className="px-4 py-2.5 font-semibold text-gray-800">{item.product_name}</td>
                    <td className="px-4 py-2.5 text-gray-400 text-xs">{item.hsn_code || '—'}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{Number(item.quantity)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{fmtINR(item.unit_price)}</td>
                    <td className="px-4 py-2.5 text-right text-gray-500">{Number(item.gst_rate)}%</td>
                    <td className="px-4 py-2.5 text-right font-bold tabular-nums">{fmtINR(item.total_with_gst)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end mb-6">
            <div className="w-64 border border-gray-200 rounded-xl overflow-hidden">
              <div className="flex justify-between px-4 py-2.5 text-sm border-b border-gray-100">
                <span className="text-gray-500">Subtotal</span>
                <span className="tabular-nums">{fmtINR(quotation.subtotal)}</span>
              </div>
              <div className="flex justify-between px-4 py-2.5 text-sm border-b border-gray-100">
                <span className="text-gray-500">GST</span>
                <span className="tabular-nums">{fmtINR(quotation.gst_amount)}</span>
              </div>
              {Number(quotation.discount_amount) > 0 && (
                <div className="flex justify-between px-4 py-2.5 text-sm border-b border-gray-100">
                  <span className="text-gray-500">Discount</span>
                  <span className="text-red-500 tabular-nums">− {fmtINR(quotation.discount_amount)}</span>
                </div>
              )}
              <div className="flex justify-between px-4 py-3 bg-emerald-600 text-white">
                <span className="font-bold">Total Amount</span>
                <span className="font-bold text-base tabular-nums">{fmtINR(quotation.total_amount)}</span>
              </div>
            </div>
          </div>

          {/* Notes & Terms */}
          {(quotation.notes || quotation.terms) && (
            <div className="grid grid-cols-2 gap-4 mb-5">
              {quotation.notes && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                  <div className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-1.5">Notes</div>
                  <p className="text-xs text-amber-900 leading-relaxed">{quotation.notes}</p>
                </div>
              )}
              {quotation.terms && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                  <div className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-1.5">Terms & Conditions</div>
                  <p className="text-xs text-blue-900 leading-relaxed">{quotation.terms}</p>
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="text-center text-xs text-gray-400 border-t border-gray-100 pt-4">
            This is a computer-generated quotation. No signature required.
            {company?.company_name && <span className="block mt-1 font-medium text-gray-500">{company.company_name}</span>}
          </div>

        </div>
      </div>
    </Modal>
  );
};

export default QuotationPrintModal;
