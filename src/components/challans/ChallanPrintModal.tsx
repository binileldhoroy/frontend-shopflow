import React from 'react';
import Modal from '../common/Modal/Modal';
import { Printer, X } from 'lucide-react';
import { useAppSelector } from '../../hooks/useRedux';

interface ChallanPrintModalProps {
  show: boolean;
  onHide: () => void;
  challan: any;
}

function fmt(date: string) {
  return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

const STATUS_COLOR: Record<string, string> = {
  draft: '#f59e0b', dispatched: '#3b82f6', delivered: '#10b981',
};

/* ─── Self-contained print HTML (no Tailwind dependency) ─── */
function generateChallanHTML(c: any, company: any) {
  const statusColor = STATUS_COLOR[c.status] || '#6b7280';

  const itemRows = c.items.map((item: any, idx: number) => `
    <tr style="background:${idx % 2 === 1 ? '#f9fafb' : '#fff'}">
      <td style="padding:9px 12px;border-bottom:1px solid #f3f4f6;color:#9ca3af;font-size:12px">${idx + 1}</td>
      <td style="padding:9px 12px;border-bottom:1px solid #f3f4f6;font-weight:600;color:#111827">${item.product_name}</td>
      <td style="padding:9px 12px;border-bottom:1px solid #f3f4f6;text-align:right">${Number(item.quantity)}</td>
      <td style="padding:9px 12px;border-bottom:1px solid #f3f4f6;color:#6b7280">${item.unit || '—'}</td>
      <td style="padding:9px 12px;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:12px">${item.notes || '—'}</td>
    </tr>`).join('');

  const companyAddr = [
    company?.address_line1,
    company?.address_line2,
    [company?.city, company?.state, company?.pincode].filter(Boolean).join(', '),
  ].filter(Boolean).join('<br>');

  const notesBlock = c.notes ? `
    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:14px;margin-bottom:14px">
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#92400e;font-weight:700;margin-bottom:5px">Notes</div>
      <div style="font-size:12px;color:#78350f;line-height:1.6">${c.notes}</div>
    </div>` : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Delivery Challan ${c.challan_number}</title>
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
    <div style="font-size:32px;font-weight:900;color:#2563eb;letter-spacing:3px">DELIVERY CHALLAN</div>
    <div style="font-size:13px;color:#6b7280;margin-top:4px">#${c.challan_number}</div>
    <div style="display:inline-block;margin-top:8px;padding:3px 12px;border-radius:20px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#fff;background:${statusColor}">${c.status}</div>
  </div>
</div>

<!-- Dispatch Info -->
<div style="display:flex;gap:20px;margin-bottom:24px">
  <div style="flex:1;background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:16px">
    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;margin-bottom:8px">Deliver To</div>
    <div style="font-size:15px;font-weight:700;color:#111827">${c.customer_name || '—'}</div>
  </div>
  <div style="width:260px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:16px">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div>
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;margin-bottom:3px">Date</div>
        <div style="font-size:13px;font-weight:600;color:#111827">${fmt(c.date)}</div>
      </div>
      ${c.vehicle_no ? `<div>
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;margin-bottom:3px">Vehicle No.</div>
        <div style="font-size:13px;font-weight:600;color:#111827">${c.vehicle_no}</div>
      </div>` : ''}
      ${c.driver_name ? `<div style="grid-column:1/-1">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;margin-bottom:3px">Driver</div>
        <div style="font-size:13px;font-weight:600;color:#111827">${c.driver_name}</div>
      </div>` : ''}
    </div>
  </div>
</div>

<!-- Items Table -->
<table width="100%" style="margin-bottom:24px;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden">
  <thead>
    <tr style="background:#2563eb;color:#fff">
      <th style="padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;width:32px">#</th>
      <th style="padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">Product / Description</th>
      <th style="padding:10px 12px;text-align:right;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;width:60px">Qty</th>
      <th style="padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;width:70px">Unit</th>
      <th style="padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">Notes</th>
    </tr>
  </thead>
  <tbody>${itemRows}</tbody>
</table>

${notesBlock}

<!-- Signature Row -->
<div style="display:flex;gap:40px;margin-top:40px">
  <div style="flex:1;border-top:1px solid #e5e7eb;padding-top:8px">
    <div style="font-size:11px;color:#9ca3af;text-align:center">Prepared By</div>
  </div>
  <div style="flex:1;border-top:1px solid #e5e7eb;padding-top:8px">
    <div style="font-size:11px;color:#9ca3af;text-align:center">Receiver's Signature</div>
  </div>
</div>

<!-- Footer -->
<div style="text-align:center;font-size:11px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:14px;margin-top:30px">
  This is a computer-generated delivery challan.
  ${company?.company_name ? `<br><strong style="color:#6b7280">${company.company_name}</strong>` : ''}
</div>

</body>
</html>`;
}

/* ─── Modal component ─── */
const ChallanPrintModal: React.FC<ChallanPrintModalProps> = ({ show, onHide, challan }) => {
  const { currentCompany } = useAppSelector((state) => state.company);

  if (!challan) return null;

  const company = currentCompany;
  const statusColor = STATUS_COLOR[challan.status] || '#6b7280';

  const handlePrint = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(generateChallanHTML(challan, company));
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 400);
  };

  return (
    <Modal
      show={show}
      onHide={onHide}
      title={`Delivery Challan — ${challan.challan_number}`}
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
              <h1 className="text-2xl font-black tracking-widest text-blue-600">DELIVERY CHALLAN</h1>
              <div className="text-xs text-gray-400 mt-1">#{challan.challan_number}</div>
              <div className="inline-block mt-2 px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider text-white" style={{ background: statusColor }}>
                {challan.status}
              </div>
            </div>
          </div>

          {/* Dispatch info */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Deliver To</div>
              <div className="font-bold text-gray-900 text-base">{challan.customer_name || '—'}</div>
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Date</div>
                <div className="font-semibold text-gray-800 mt-0.5">{fmt(challan.date)}</div>
              </div>
              {challan.vehicle_no && (
                <div>
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Vehicle No.</div>
                  <div className="font-semibold text-gray-800 mt-0.5">{challan.vehicle_no}</div>
                </div>
              )}
              {challan.driver_name && (
                <div className="col-span-2">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Driver</div>
                  <div className="font-semibold text-gray-800 mt-0.5">{challan.driver_name}</div>
                </div>
              )}
            </div>
          </div>

          {/* Items table */}
          <div className="border border-gray-200 rounded-xl overflow-hidden mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-blue-600 text-white">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide w-8">#</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Product / Description</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide w-16">Qty</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide w-20">Unit</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Notes</th>
                </tr>
              </thead>
              <tbody>
                {challan.items.map((item: any, idx: number) => (
                  <tr key={idx} className={`border-b border-gray-100 last:border-b-0 ${idx % 2 === 1 ? 'bg-gray-50/60' : ''}`}>
                    <td className="px-4 py-2.5 text-xs text-gray-400">{idx + 1}</td>
                    <td className="px-4 py-2.5 font-semibold text-gray-800">{item.product_name}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{Number(item.quantity)}</td>
                    <td className="px-4 py-2.5 text-gray-500">{item.unit || '—'}</td>
                    <td className="px-4 py-2.5 text-gray-400 text-xs">{item.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Notes */}
          {challan.notes && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-5">
              <div className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-1.5">Notes</div>
              <p className="text-xs text-amber-900 leading-relaxed">{challan.notes}</p>
            </div>
          )}

          {/* Signature placeholders */}
          <div className="grid grid-cols-2 gap-10 mt-10">
            <div className="border-t border-gray-200 pt-2 text-center">
              <span className="text-xs text-gray-400">Prepared By</span>
            </div>
            <div className="border-t border-gray-200 pt-2 text-center">
              <span className="text-xs text-gray-400">Receiver's Signature</span>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-xs text-gray-400 border-t border-gray-100 pt-4 mt-8">
            This is a computer-generated delivery challan.
            {company?.company_name && <span className="block mt-1 font-medium text-gray-500">{company.company_name}</span>}
          </div>

        </div>
      </div>
    </Modal>
  );
};

export default ChallanPrintModal;
