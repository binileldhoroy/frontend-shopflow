import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'react-qr-code';
import {
  Banknote, Smartphone, CreditCard, BookOpenCheck,
  Wallet, Building2, CheckCircle2, AlertTriangle, X,
} from 'lucide-react';

interface CartItem {
  id: number;
  product_id: number;
  name: string;
  sku: string;
  unit_price: number;
  selling_price: number;
  quantity: number;
  gst_rate: number;
  tax_included: boolean;
}

interface Totals {
  grandTotal: number;
  subtotal: number;
  totalGst: number;
  discount: number;
  roundOff: number;
}

interface Props {
  method: string;
  cartItems: CartItem[];
  totals: Totals;
  customerName?: string;
  walletBalance?: number;
  upiId?: string;
  companyName?: string;
  onConfirm: () => void;
  onClose: () => void;
}

// ─── Per-method config ────────────────────────────────────────────────────────

const METHOD_CONFIG: Record<string, {
  label: string;
  icon: React.ReactNode;
  headerColor: string;
  confirmLabel: string;
  confirmColor: string;
}> = {
  cash: {
    label: 'Cash Payment',
    icon: <Banknote className="w-5 h-5" />,
    headerColor: 'bg-green-600',
    confirmLabel: 'Confirm Sale',
    confirmColor: 'bg-green-600 hover:bg-green-700 active:bg-green-800',
  },
  upi: {
    label: 'UPI Payment',
    icon: <Smartphone className="w-5 h-5" />,
    headerColor: 'bg-indigo-600',
    confirmLabel: 'Payment Received',
    confirmColor: 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800',
  },
  card: {
    label: 'Card Payment',
    icon: <CreditCard className="w-5 h-5" />,
    headerColor: 'bg-slate-700',
    confirmLabel: 'Payment Done',
    confirmColor: 'bg-slate-700 hover:bg-slate-800 active:bg-slate-900',
  },
  credit: {
    label: 'Credit Sale',
    icon: <BookOpenCheck className="w-5 h-5" />,
    headerColor: 'bg-orange-500',
    confirmLabel: 'Confirm Credit',
    confirmColor: 'bg-orange-500 hover:bg-orange-600 active:bg-orange-700',
  },
  wallet: {
    label: 'Wallet Payment',
    icon: <Wallet className="w-5 h-5" />,
    headerColor: 'bg-purple-600',
    confirmLabel: 'Confirm Wallet Payment',
    confirmColor: 'bg-purple-600 hover:bg-purple-700 active:bg-purple-800',
  },
  net_banking: {
    label: 'Net Banking',
    icon: <Building2 className="w-5 h-5" />,
    headerColor: 'bg-gray-600',
    confirmLabel: 'Confirm Payment',
    confirmColor: 'bg-gray-600 hover:bg-gray-700 active:bg-gray-800',
  },
};

const DEFAULT_CONFIG = METHOD_CONFIG['card'];

// ─── Component ────────────────────────────────────────────────────────────────

const PaymentConfirmModal: React.FC<Props> = ({
  method,
  cartItems,
  totals,
  customerName,
  walletBalance,
  upiId,
  companyName,
  onConfirm,
  onClose,
}) => {
  const config = METHOD_CONFIG[method] ?? DEFAULT_CONFIG;
  const [tendered, setTendered] = useState('');
  const tenderedRef = useRef<HTMLInputElement>(null);

  const tenderedNum = parseFloat(tendered) || 0;
  const change = tenderedNum - totals.grandTotal;
  const cashReady = method !== 'cash' || tenderedNum >= totals.grandTotal;

  // Auto-focus tendered input for cash
  useEffect(() => {
    if (method === 'cash') {
      setTimeout(() => tenderedRef.current?.focus(), 100);
    }
  }, [method]);

  // UPI QR string
  const upiQrValue = upiId && companyName
    ? `upi://pay?pa=${upiId}&pn=${encodeURIComponent(companyName)}&am=${totals.grandTotal.toFixed(2)}&cu=INR`
    : null;

  const lineTotal = (item: CartItem) => {
    if (item.tax_included) return item.selling_price * item.quantity;
    return (item.unit_price + item.unit_price * (item.gst_rate / 100)) * item.quantity;
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden"
        style={{ maxHeight: 'calc(var(--viewport-height, 100vh) - 48px)' }}
      >
        {/* ── Header ── */}
        <div className={`shrink-0 ${config.headerColor} px-5 pt-5 pb-4 text-white`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-white/20 rounded-lg">{config.icon}</div>
              <div>
                <div className="font-bold text-lg leading-tight">{config.label}</div>
                <div className="text-white/70 text-xs mt-0.5">Review and confirm</div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/20 active:bg-white/30 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto min-h-0">

          {/* Order items */}
          <div className="px-4 pt-4 pb-2">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Order Items</p>
            <div className="space-y-1">
              {cartItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                  <div className="flex-1 min-w-0 pr-3">
                    <div className="text-sm font-medium text-gray-800 truncate">{item.name}</div>
                    <div className="text-[11px] text-gray-400">{item.sku} · qty {item.quantity}</div>
                  </div>
                  <div className="text-sm font-semibold text-gray-700 font-mono shrink-0">
                    ₹{lineTotal(item).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals summary */}
          <div className="mx-4 mb-3 bg-gray-50 rounded-xl p-3 space-y-1.5">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span>
              <span className="font-mono">₹{totals.subtotal.toFixed(2)}</span>
            </div>
            {totals.discount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Discount</span>
                <span className="font-mono">-₹{totals.discount.toFixed(2)}</span>
              </div>
            )}
            {totals.totalGst > 0 && (
              <div className="flex justify-between text-sm text-orange-600">
                <span>GST</span>
                <span className="font-mono">₹{totals.totalGst.toFixed(2)}</span>
              </div>
            )}
            {totals.roundOff !== 0 && (
              <div className="flex justify-between text-sm text-gray-500">
                <span>Round-off</span>
                <span className="font-mono">{totals.roundOff > 0 ? '+' : ''}₹{totals.roundOff.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-1.5 border-t border-gray-200">
              <span className="font-bold text-gray-900">Total</span>
              <span className="font-bold text-xl font-mono text-gray-900">₹{totals.grandTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* ── Method-specific section ── */}

          {/* Cash */}
          {method === 'cash' && (
            <div className="px-4 pb-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Amount Tendered by Customer
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500 font-semibold text-sm pointer-events-none">₹</span>
                  <input
                    ref={tenderedRef}
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={tendered}
                    onChange={(e) => setTendered(e.target.value)}
                    placeholder={totals.grandTotal.toFixed(2)}
                    className="block w-full pl-8 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-green-500 focus:border-green-500 font-mono text-lg shadow-sm outline-none transition-colors"
                  />
                </div>
              </div>

              {tendered !== '' && (
                <div
                  className={`flex items-center justify-between px-4 py-3 rounded-xl border font-semibold ${
                    change >= 0
                      ? 'bg-green-50 border-green-200 text-green-800'
                      : 'bg-red-50 border-red-200 text-red-700'
                  }`}
                >
                  <span className="text-sm">{change >= 0 ? 'Change Due' : 'Insufficient Amount'}</span>
                  <span className="font-mono text-xl">
                    {change >= 0 ? `₹${change.toFixed(2)}` : `-₹${Math.abs(change).toFixed(2)}`}
                  </span>
                </div>
              )}

              {/* Quick cash buttons */}
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  Math.ceil(totals.grandTotal / 10) * 10,
                  Math.ceil(totals.grandTotal / 50) * 50,
                  Math.ceil(totals.grandTotal / 100) * 100,
                  Math.ceil(totals.grandTotal / 500) * 500,
                ]
                  .filter((v, i, arr) => arr.indexOf(v) === i && v >= totals.grandTotal)
                  .slice(0, 4)
                  .map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setTendered(amt.toString())}
                      className="py-1.5 text-xs font-semibold bg-gray-100 hover:bg-green-100 hover:text-green-700 active:bg-green-200 text-gray-600 rounded-lg transition-colors"
                    >
                      ₹{amt}
                    </button>
                  ))}
              </div>
            </div>
          )}

          {/* UPI */}
          {method === 'upi' && (
            <div className="px-4 pb-4">
              {upiQrValue ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="p-3 bg-white border-2 border-indigo-100 rounded-xl shadow-sm">
                    <QRCode value={upiQrValue} size={180} />
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-500 mb-0.5">Scan to pay</div>
                    <div className="font-mono text-sm font-semibold text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg">
                      {upiId}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                    Amount ₹{totals.grandTotal.toFixed(2)} pre-filled in QR
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-semibold text-amber-800">UPI ID not configured</div>
                    <div className="text-xs text-amber-600 mt-0.5">
                      Go to Settings → Company to add your UPI ID for QR code generation.
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Card */}
          {method === 'card' && (
            <div className="px-4 pb-4">
              <div className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <CreditCard className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
                <div className="text-sm text-slate-700">
                  Process the card on your terminal, then click <strong>Payment Done</strong> to complete the sale.
                </div>
              </div>
            </div>
          )}

          {/* Credit */}
          {method === 'credit' && (
            <div className="px-4 pb-4">
              <div className="flex items-start gap-3 p-3 bg-orange-50 border border-orange-200 rounded-xl">
                <BookOpenCheck className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-semibold text-orange-800">
                    {customerName ? `Credit for ${customerName}` : 'Credit Sale'}
                  </div>
                  <div className="text-xs text-orange-600 mt-0.5">
                    ₹{totals.grandTotal.toFixed(2)} will be added to the customer's outstanding credit.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Wallet */}
          {method === 'wallet' && (
            <div className="px-4 pb-4">
              <div className="flex items-start gap-3 p-3 bg-purple-50 border border-purple-200 rounded-xl">
                <Wallet className="w-5 h-5 text-purple-500 shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-semibold text-purple-800">Wallet Deduction</div>
                  <div className="text-xs text-purple-600 mt-0.5">
                    ₹{totals.grandTotal.toFixed(2)} will be deducted from wallet
                    {walletBalance != null ? ` (balance: ₹${walletBalance.toFixed(2)})` : ''}.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Net banking */}
          {method === 'net_banking' && (
            <div className="px-4 pb-4">
              <div className="flex items-start gap-3 p-3 bg-gray-50 border border-gray-200 rounded-xl">
                <Building2 className="w-5 h-5 text-gray-500 shrink-0 mt-0.5" />
                <div className="text-sm text-gray-700">
                  Confirm once the bank transfer of <strong>₹{totals.grandTotal.toFixed(2)}</strong> is initiated.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Pinned footer ── */}
        <div
          className="shrink-0 bg-white border-t border-gray-100 px-4 pt-3"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}
        >
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 text-sm font-semibold rounded-xl text-gray-700 bg-white hover:bg-gray-50 active:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={!cashReady}
              className={`flex-1 px-4 py-3 text-sm font-semibold rounded-xl text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${config.confirmColor}`}
            >
              {config.confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentConfirmModal;
