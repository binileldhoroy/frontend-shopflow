import React, { useState, useRef, useEffect } from 'react';
import Modal from '../common/Modal/Modal';
import { PurchaseOrder } from '../../types/purchase.types';
import { Printer, CheckCircle2, ChevronDown, Loader2, RotateCcw } from 'lucide-react';
import { purchaseService } from '../../api/services/purchase.service';
import PurchaseReturnModal from './PurchaseReturnModal';

interface PurchaseDetailModalProps {
  show: boolean;
  onHide: () => void;
  purchase: PurchaseOrder | null;
  onPaymentUpdated?: (updated: PurchaseOrder) => void;
  onReturnProcessed?: () => void;
}

const STATUS_STEPS = [
  { key: 'draft',               label: 'Draft' },
  { key: 'ordered',             label: 'Ordered' },
  { key: 'partially_received',  label: 'Partial' },
  { key: 'received',            label: 'Received' },
];

const STATUS_BADGE: Record<string, string> = {
  received:           'badge-success',
  ordered:            'badge-info',
  partially_received: 'badge-warning',
  cancelled:          'badge-danger',
  draft:              'badge-secondary',
};

const PAYMENT_OPTIONS: { value: 'paid' | 'pending' | 'partial'; label: string; cls: string }[] = [
  { value: 'paid',    label: 'Paid',    cls: 'badge-success' },
  { value: 'partial', label: 'Partial', cls: 'badge-info' },
  { value: 'pending', label: 'Pending', cls: 'badge-warning' },
];

function formatINR(v: number | string) {
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(n);
}

function fmt(date?: string | null) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

const PurchaseDetailModal: React.FC<PurchaseDetailModalProps> = ({
  show,
  onHide,
  purchase: initialPurchase,
  onPaymentUpdated,
  onReturnProcessed,
}) => {
  const [purchase, setPurchase] = useState(initialPurchase);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnSuccess, setReturnSuccess] = useState<{ returnNumber: string; debitNoteNumber: string } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync when prop changes
  useEffect(() => { setPurchase(initialPurchase); }, [initialPurchase]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setPaymentOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!purchase) return null;

  const isCancelled = purchase.status === 'cancelled';
  const currentStepIdx = isCancelled
    ? -1
    : STATUS_STEPS.findIndex((s) => s.key === purchase.status);

  const handlePaymentChange = async (newStatus: 'paid' | 'pending' | 'partial') => {
    if (newStatus === purchase.payment_status) { setPaymentOpen(false); return; }
    setPaymentSaving(true);
    setPaymentOpen(false);
    try {
      const updated = await purchaseService.updatePurchase(purchase.id, {
        payment_status: newStatus,
      } as any);
      setPurchase(updated);
      onPaymentUpdated?.(updated);
    } catch {
      // silently ignore — user can retry
    } finally {
      setPaymentSaving(false);
    }
  };

  const currentPayment = PAYMENT_OPTIONS.find(o => o.value === purchase.payment_status)
    ?? { value: purchase.payment_status, label: purchase.payment_status, cls: 'badge-secondary' };

  const handlePrint = () => window.print();

  return (
    <>
    <Modal
      show={show}
      onHide={onHide}
      title={`Purchase Order: ${purchase.order_number}`}
      size="lg"
      footer={
        <div className="flex items-center gap-2 w-full justify-between">
          <div className="flex items-center gap-2">
            <button
              className="btn btn-outline-secondary flex items-center gap-1.5"
              onClick={handlePrint}
            >
              <Printer className="w-4 h-4" /> Print
            </button>
            {(purchase.status === 'received' || purchase.status === 'partially_received') && (
              <button
                className="btn btn-outline-danger flex items-center gap-1.5"
                onClick={() => { setReturnSuccess(null); setShowReturnModal(true); }}
              >
                <RotateCcw className="w-4 h-4" /> Return Items
              </button>
            )}
          </div>
          <button className="btn btn-secondary" onClick={onHide}>Close</button>
        </div>
      }
    >
      <div className="space-y-6">

        {/* Status Stepper */}
        {!isCancelled ? (
          <div className="flex items-center gap-0">
            {STATUS_STEPS.map((step, idx) => {
              const done = idx < currentStepIdx;
              const active = idx === currentStepIdx;
              return (
                <React.Fragment key={step.key}>
                  <div className="flex flex-col items-center flex-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors
                      ${done    ? 'bg-emerald-500 border-emerald-500 text-white' : ''}
                      ${active  ? 'bg-primary-600 border-primary-600 text-white' : ''}
                      ${!done && !active ? 'bg-white border-gray-200 text-gray-400' : ''}
                    `}>
                      {done ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                    </div>
                    <span className={`text-xs mt-1 font-medium ${active ? 'text-primary-700' : done ? 'text-emerald-600' : 'text-gray-400'}`}>
                      {step.label}
                    </span>
                  </div>
                  {idx < STATUS_STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 -mt-4 ${idx < currentStepIdx ? 'bg-emerald-400' : 'bg-gray-200'}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        ) : (
          <div className="flex justify-center">
            <span className="badge badge-danger text-sm px-4 py-1">Cancelled</span>
          </div>
        )}

        {/* Invoice Header */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
          <div className="space-y-2">
            <div>
              <div className="text-xs text-gray-400 uppercase tracking-wide">Order Number</div>
              <div className="font-bold text-gray-800 text-lg">{purchase.order_number}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400 uppercase tracking-wide">Order Date</div>
              <div className="font-medium text-gray-700">{fmt(purchase.order_date)}</div>
            </div>
            {purchase.expected_delivery_date && (
              <div>
                <div className="text-xs text-gray-400 uppercase tracking-wide">Expected Delivery</div>
                <div className="font-medium text-gray-700">{fmt(purchase.expected_delivery_date)}</div>
              </div>
            )}
            {purchase.received_date && (
              <div>
                <div className="text-xs text-gray-400 uppercase tracking-wide">Received On</div>
                <div className="font-medium text-gray-700">{fmt(purchase.received_date)}</div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div>
              <div className="text-xs text-gray-400 uppercase tracking-wide">Supplier</div>
              <div className="font-bold text-primary-700 text-base">{purchase.supplier_name || `#${purchase.supplier}`}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400 uppercase tracking-wide">Status</div>
              <span className={`badge ${STATUS_BADGE[purchase.status] ?? 'badge-secondary'} capitalize`}>
                {purchase.status.replace('_', ' ')}
              </span>
            </div>
            <div>
              <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Payment</div>
              <div className="flex items-center gap-2 flex-wrap">
                {/* Inline payment status editor */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    className={`badge ${currentPayment.cls} capitalize flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity pr-1.5`}
                    onClick={() => setPaymentOpen(prev => !prev)}
                    title="Click to update payment status"
                    disabled={paymentSaving}
                  >
                    {paymentSaving
                      ? <Loader2 className="w-3 h-3 animate-spin" />
                      : currentPayment.label
                    }
                    {!paymentSaving && <ChevronDown className="w-3 h-3 opacity-60" />}
                  </button>

                  {paymentOpen && (
                    <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-xl shadow-lg min-w-[120px] overflow-hidden">
                      {PAYMENT_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors flex items-center gap-2
                            ${opt.value === purchase.payment_status ? 'font-semibold text-primary-700' : 'text-gray-700'}`}
                          onClick={() => handlePaymentChange(opt.value)}
                        >
                          <span className={`w-2 h-2 rounded-full ${
                            opt.value === 'paid' ? 'bg-green-500' :
                            opt.value === 'partial' ? 'bg-blue-400' : 'bg-amber-400'
                          }`} />
                          {opt.label}
                          {opt.value === purchase.payment_status && (
                            <CheckCircle2 className="w-3.5 h-3.5 ml-auto text-primary-600" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <span className="text-xs text-gray-500 capitalize">{purchase.payment_method?.replace('_', ' ')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="overflow-hidden border border-gray-200 rounded-xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase w-8">#</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Product</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Qty</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Unit Price</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Tax</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Total</th>
              </tr>
            </thead>
            <tbody>
              {purchase.items.map((item, idx) => {
                const lineTotal = (Number(item.quantity) * Number(item.unit_price)) * (1 + Number(item.tax_rate) / 100);
                return (
                  <tr key={idx} className={`border-b border-gray-100 last:border-b-0 ${idx % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                    <td className="px-4 py-2.5 text-xs text-gray-400 font-medium">{idx + 1}</td>
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-gray-800">{item.product_name}</div>
                      {item.unit && <div className="text-xs text-gray-400">{item.unit}</div>}
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-700 tabular-nums">
                      {Number(item.quantity).toLocaleString('en-IN')}
                      {item.unit && <span className="text-xs text-gray-400 ml-1">{item.unit}</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-700 tabular-nums">{formatINR(Number(item.unit_price))}</td>
                    <td className="px-4 py-2.5 text-right text-gray-500">{Number(item.tax_rate)}%</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-gray-800 tabular-nums">{formatINR(lineTotal)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Totals + Notes */}
        <div className="flex flex-col md:flex-row gap-4 items-start justify-between">
          {purchase.notes ? (
            <div className="flex-1 bg-amber-50 border border-amber-100 rounded-lg p-3">
              <div className="text-xs font-semibold text-amber-700 uppercase mb-1">Notes</div>
              <div className="text-sm text-amber-900">{purchase.notes}</div>
            </div>
          ) : <div className="flex-1" />}

          <div className="w-full md:w-64 border border-gray-200 rounded-xl overflow-hidden">
            <div className="flex justify-between px-4 py-2.5 text-sm border-b border-gray-100">
              <span className="text-gray-500">Subtotal</span>
              <span className="font-medium tabular-nums">{formatINR(Number(purchase.subtotal))}</span>
            </div>
            <div className="flex justify-between px-4 py-2.5 text-sm border-b border-gray-100">
              <span className="text-gray-500">Tax</span>
              <span className="font-medium tabular-nums">{formatINR(Number(purchase.tax_amount))}</span>
            </div>
            <div className="flex justify-between px-4 py-3 bg-primary-50">
              <span className="font-bold text-primary-800">Grand Total</span>
              <span className="font-bold text-primary-800 text-base tabular-nums">{formatINR(Number(purchase.total_amount))}</span>
            </div>
          </div>
        </div>

        <div className="text-xs text-gray-400 text-right">
          Created by User #{purchase.created_by} · {new Date(purchase.created_at).toLocaleString('en-IN')}
        </div>

        {/* Return success banner */}
        {returnSuccess && (
          <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <div className="font-semibold text-emerald-800">Return processed successfully</div>
              <div className="text-emerald-700 text-xs mt-0.5">
                Return# <span className="font-mono font-bold">{returnSuccess.returnNumber}</span>
                &nbsp;·&nbsp;Debit Note# <span className="font-mono font-bold">{returnSuccess.debitNoteNumber}</span>
              </div>
            </div>
          </div>
        )}

      </div>
    </Modal>

    <PurchaseReturnModal
      show={showReturnModal}
      onHide={() => setShowReturnModal(false)}
      purchase={purchase}
      onSuccess={(returnNumber, debitNoteNumber) => {
        setShowReturnModal(false);
        setReturnSuccess({ returnNumber, debitNoteNumber });
        onReturnProcessed?.();
      }}
    />
    </>
  );
};

export default PurchaseDetailModal;
