import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal/Modal';
import { PurchaseOrder } from '../../types/purchase.types';
import { purchaseService } from '../../api/services/purchase.service';
import { RotateCcw, AlertCircle, CheckCircle2 } from 'lucide-react';

interface PurchaseReturnModalProps {
  show: boolean;
  onHide: () => void;
  purchase: PurchaseOrder | null;
  onSuccess: (returnNumber: string, debitNoteNumber: string) => void;
}

interface ReturnRow {
  purchase_item_id: number;
  product_name: string;
  received_qty: number;
  unit_price: number;
  tax_rate: number;
  return_qty: string;
}

function formatINR(v: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(v);
}

const PurchaseReturnModal: React.FC<PurchaseReturnModalProps> = ({ show, onHide, purchase, onSuccess }) => {
  const [rows, setRows] = useState<ReturnRow[]>([]);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!purchase || !show) return;
    setRows(
      purchase.items
        .filter(item => item.id !== undefined)
        .map(item => ({
          purchase_item_id: item.id!,
          product_name: item.product_name,
          received_qty: Number(item.received_quantity ?? item.quantity),
          unit_price: Number(item.unit_price),
          tax_rate: Number(item.tax_rate),
          return_qty: '0',
        }))
    );
    setReason('');
    setError('');
  }, [purchase, show]);

  const updateQty = (idx: number, val: string) => {
    setRows(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], return_qty: val };
      return next;
    });
  };

  const returnTotal = rows.reduce((sum, r) => {
    const qty = parseFloat(r.return_qty) || 0;
    return sum + qty * r.unit_price * (1 + r.tax_rate / 100);
  }, 0);

  const handleSubmit = async () => {
    if (!purchase) return;
    const itemsToReturn = rows
      .filter(r => parseFloat(r.return_qty) > 0)
      .map(r => ({ purchase_item_id: r.purchase_item_id, quantity: parseFloat(r.return_qty) }));

    if (itemsToReturn.length === 0) {
      setError('Enter a return quantity for at least one item.');
      return;
    }
    for (const r of rows) {
      const qty = parseFloat(r.return_qty) || 0;
      if (qty > r.received_qty) {
        setError(`Return qty for "${r.product_name}" exceeds received quantity (${r.received_qty}).`);
        return;
      }
    }
    if (!reason.trim()) {
      setError('Reason is required.');
      return;
    }

    setError('');
    setSaving(true);
    try {
      const result = await purchaseService.returnPurchase(purchase.id, {
        items: itemsToReturn,
        reason: reason.trim(),
      });
      onSuccess(result.return_number, result.debit_note_number);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to process return. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!purchase) return null;

  return (
    <Modal
      show={show}
      onHide={onHide}
      title={`Return Items — ${purchase.order_number}`}
      size="lg"
      footer={
        <div className="flex items-center gap-2 w-full justify-between">
          <button className="btn btn-outline-secondary" onClick={onHide} disabled={saving}>Cancel</button>
          <button className="btn btn-danger flex items-center gap-1.5" onClick={handleSubmit} disabled={saving}>
            <RotateCcw className="w-4 h-4" />
            {saving ? 'Processing…' : 'Process Return'}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-500">
          Select items and quantities to return to the supplier. Stock will be reversed and a Debit Note will be auto-generated.
        </p>

        {/* Items table */}
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Product</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Received</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Unit Price</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase w-28">Return Qty</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Credit</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                const qty = parseFloat(row.return_qty) || 0;
                const credit = qty * row.unit_price * (1 + row.tax_rate / 100);
                const hasQty = qty > 0;
                return (
                  <tr key={idx} className={`border-b border-gray-100 last:border-b-0 ${hasQty ? 'bg-amber-50/40' : ''}`}>
                    <td className="px-4 py-2.5 font-medium text-gray-800">{row.product_name}</td>
                    <td className="px-4 py-2.5 text-right text-gray-600 tabular-nums">{row.received_qty}</td>
                    <td className="px-4 py-2.5 text-right text-gray-600 tabular-nums">{formatINR(row.unit_price)}</td>
                    <td className="px-4 py-2.5">
                      <input
                        type="number"
                        min="0"
                        max={row.received_qty}
                        step="1"
                        className="input-field w-full text-right py-1 text-sm"
                        value={row.return_qty}
                        onChange={e => updateQty(idx, e.target.value)}
                      />
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold tabular-nums">
                      {hasQty ? (
                        <span className="text-emerald-700">{formatINR(credit)}</span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {returnTotal > 0 && (
              <tfoot>
                <tr className="bg-primary-50 border-t-2 border-primary-200">
                  <td colSpan={4} className="px-4 py-3 font-bold text-primary-800 text-right">Total Credit (incl. GST)</td>
                  <td className="px-4 py-3 text-right font-bold text-primary-800 tabular-nums">{formatINR(returnTotal)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Reason */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Return *</label>
          <textarea
            className="input-field w-full"
            rows={2}
            placeholder="e.g. Damaged goods, Wrong items received…"
            value={reason}
            onChange={e => setReason(e.target.value)}
          />
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Info */}
        <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>A Debit Note will be automatically generated and stock will be reversed for the returned items.</span>
        </div>
      </div>
    </Modal>
  );
};

export default PurchaseReturnModal;
