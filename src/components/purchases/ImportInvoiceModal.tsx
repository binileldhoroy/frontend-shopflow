import React, { useState, useRef, useCallback, useEffect } from 'react';
import Modal from '../common/Modal/Modal';
import { purchaseService } from '../../api/services/purchase.service';
import { productService } from '../../api/services/product.service';
import { ParsedInvoice, ParsedInvoiceItem, PurchaseOrderCreate } from '../../types/purchase.types';
import {
  UploadCloud,
  FileText,
  ImageIcon,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Plus,
  Trash2,
  ArrowLeft,
  Loader2,
  CheckCircle,
} from 'lucide-react';
import axiosInstance from '../../api/axios';
import { API_ENDPOINTS } from '../../api/endpoints';

interface ImportInvoiceModalProps {
  show: boolean;
  onHide: () => void;
  onComplete: (orderId: number, orderNumber: string) => void;
  suppliers: { id: number; name: string }[];
}

type Step = 'upload' | 'parsing' | 'review' | 'creating' | 'done';

interface ReviewItem {
  invoiceName: string;
  quantity: number;
  unit: string;
  unit_price: number;
  tax_rate: number;
  taxIncluded: boolean;
  matchedProductId: number | null;
  matchedProductName: string;
  matches: { id: number; name: string; sku: string; cost_price: number }[];
  createNew: boolean;
  newProduct: {
    name: string;
    category: number | '';
    brand: number | '';
    unit: string;
    sku: string;
  };
}

interface CategoryOption { id: number; name: string; }
interface BrandOption { id: number; name: string; }

const ACCEPTED = 'image/jpeg,image/png,image/webp,application/pdf';

const STEPS = [
  { key: 'upload',   label: 'Upload' },
  { key: 'review',   label: 'Review' },
  { key: 'creating', label: 'Confirm' },
];

function formatINR(v: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(v);
}

// unit_price on the invoice can be quoted either tax-inclusive or tax-exclusive.
// basePrice = tax-exclusive rate, finalPrice = the actual landed (tax-inclusive) price.
function getEffectivePrices(ri: ReviewItem): { basePrice: number; finalPrice: number } {
  if (ri.taxIncluded) {
    const basePrice = ri.tax_rate > 0 ? ri.unit_price / (1 + ri.tax_rate / 100) : ri.unit_price;
    return { basePrice, finalPrice: ri.unit_price };
  }
  return { basePrice: ri.unit_price, finalPrice: ri.unit_price * (1 + ri.tax_rate / 100) };
}

function buildReviewItems(items: ParsedInvoiceItem[]): ReviewItem[] {
  return items.map((item) => ({
    invoiceName: item.name,
    quantity: item.quantity || 1,
    unit: item.unit || '',
    unit_price: item.unit_price || 0,
    tax_rate: item.tax_rate || 0,
    taxIncluded: false,
    matchedProductId: item.matches?.[0]?.id ?? null,
    matchedProductName: item.matches?.[0]?.name ?? '',
    matches: item.matches ?? [],
    createNew: !item.matches?.length,
    newProduct: {
      name: item.name,
      category: '',
      brand: '',
      unit: item.unit || 'piece',
      sku: '',
    },
  }));
}

const ImportInvoiceModal: React.FC<ImportInvoiceModalProps> = ({
  show,
  onHide,
  onComplete,
  suppliers,
}) => {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [parseError, setParseError] = useState<string>('');
  const [parsedData, setParsedData] = useState<ParsedInvoice | null>(null);

  // Review state
  const [supplierName, setSupplierName] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [supplierId, setSupplierId] = useState<number | ''>('');
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [brands, setBrands] = useState<BrandOption[]>([]);

  // Creating state
  const [creatingStatus, setCreatingStatus] = useState<string[]>([]);
  const [createdOrderNumber, setCreatedOrderNumber] = useState('');
  const [createdOrderId, setCreatedOrderId] = useState<number | null>(null);
  const [createError, setCreateError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset on open/close
  useEffect(() => {
    if (!show) {
      setTimeout(() => {
        setStep('upload');
        setFile(null);
        setParseError('');
        setParsedData(null);
        setReviewItems([]);
        setCreatingStatus([]);
        setCreatedOrderNumber('');
        setCreatedOrderId(null);
        setCreateError('');
      }, 300);
    }
  }, [show]);

  // Load categories & brands once
  useEffect(() => {
    if (!show) return;
    axiosInstance.get(API_ENDPOINTS.PRODUCTS.CATEGORIES).then(r => {
      const data = r.data;
      setCategories(Array.isArray(data) ? data : (data.results ?? []));
    }).catch(() => {});
    axiosInstance.get(API_ENDPOINTS.PRODUCTS.BRANDS).then(r => {
      const data = r.data;
      setBrands(Array.isArray(data) ? data : (data.results ?? []));
    }).catch(() => {});
  }, [show]);

  const handleFileSelect = (selected: File) => {
    setFile(selected);
    setParseError('');
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFileSelect(f);
  }, []);

  const handleAnalyze = async () => {
    if (!file) return;
    setStep('parsing');
    setParseError('');
    try {
      const data = await purchaseService.parseInvoice(file);
      setParsedData(data);
      setSupplierName(data.supplier_name || '');
      setInvoiceDate(data.invoice_date || new Date().toISOString().split('T')[0]);
      setReviewItems(buildReviewItems(data.items));
      // Auto-match supplier
      const matched = suppliers.find(s =>
        s.name.toLowerCase().includes((data.supplier_name || '').toLowerCase())
        || (data.supplier_name || '').toLowerCase().includes(s.name.toLowerCase())
      );
      setSupplierId(matched?.id ?? '');
      setStep('review');
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Document parsing failed';
      setParseError(msg);
      setStep('upload');
    }
  };

  const updateItem = (idx: number, patch: Partial<ReviewItem>) => {
    setReviewItems(prev => prev.map((item, i) => i === idx ? { ...item, ...patch } : item));
  };

  const updateNewProduct = (idx: number, patch: Partial<ReviewItem['newProduct']>) => {
    setReviewItems(prev => prev.map((item, i) =>
      i === idx ? { ...item, newProduct: { ...item.newProduct, ...patch } } : item
    ));
  };

  const handleCreateOrder = async () => {
    if (!supplierId) return;
    setStep('creating');
    setCreateError('');
    const log = (msg: string) => setCreatingStatus(prev => [...prev, msg]);

    try {
      const finalItems: PurchaseOrderCreate['items'] = [];

      for (let i = 0; i < reviewItems.length; i++) {
        const ri = reviewItems[i];
        // unit_price stored on the order is always the final landed (tax-inclusive)
        // price, since the checkbox already accounts for tax either way. tax_rate
        // is sent as 0 so the backend doesn't add tax on top a second time.
        const { finalPrice } = getEffectivePrices(ri);
        if (ri.createNew) {
          log(`Creating product: ${ri.newProduct.name}…`);
          const fd = new FormData();
          fd.append('name', ri.newProduct.name);
          fd.append('unit', ri.newProduct.unit || 'piece');
          if (ri.newProduct.sku) fd.append('sku', ri.newProduct.sku);
          if (ri.newProduct.category) fd.append('category', String(ri.newProduct.category));
          if (ri.newProduct.brand) fd.append('brand', String(ri.newProduct.brand));
          fd.append('cost_price', String(finalPrice || 0));
          fd.append('selling_price', String(finalPrice || 0));
          const created = await productService.create(fd);
          finalItems.push({
            product: created.id,
            product_name: created.name,
            quantity: ri.quantity,
            unit_price: finalPrice,
            tax_rate: 0,
          });
        } else {
          finalItems.push({
            product: ri.matchedProductId,
            product_name: ri.matchedProductName || ri.invoiceName,
            quantity: ri.quantity,
            unit_price: finalPrice,
            tax_rate: 0,
          });
        }
      }

      log('Creating purchase order…');
      const order = await purchaseService.createPurchase({
        supplier: Number(supplierId),
        order_date: invoiceDate || new Date().toISOString().split('T')[0],
        status: 'ordered',
        payment_status: 'pending',
        payment_method: 'other',
        notes: parsedData?.invoice_number ? `Invoice: ${parsedData.invoice_number}` : '',
        items: finalItems,
      });

      setCreatedOrderNumber(order.order_number);
      setCreatedOrderId(order.id);
      log(`Done! Order ${order.order_number} created.`);
      setStep('done');
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.response?.data?.detail || err?.message || 'Failed to create order';
      setCreateError(msg);
      setStep('review');
    }
  };

  const totals = reviewItems.reduce(
    (acc, item) => {
      const { basePrice, finalPrice } = getEffectivePrices(item);
      acc.subtotal += item.quantity * basePrice;
      acc.tax += item.quantity * (finalPrice - basePrice);
      return acc;
    },
    { subtotal: 0, tax: 0 }
  );
  const grandTotal = totals.subtotal + totals.tax;

  const stepIdx = step === 'review' || step === 'creating' || step === 'done' ? 1 : 0;
  const finalStepIdx = step === 'creating' || step === 'done' ? 2 : stepIdx;

  return (
    <Modal
      show={show}
      onHide={onHide}
      title="Import Invoice / Delivery Note"
      size="xl"
      footer={
        step === 'upload' ? (
          <>
            <button className="btn btn-secondary" onClick={onHide}>Cancel</button>
            <button
              className="btn btn-primary flex items-center gap-2"
              onClick={handleAnalyze}
              disabled={!file}
            >
              <Loader2 className="w-4 h-4 hidden" /> Analyze Document
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        ) : step === 'review' ? (
          <>
            <button className="btn btn-outline-secondary flex items-center gap-1.5" onClick={() => setStep('upload')}>
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <button
              className="btn btn-primary flex items-center gap-2"
              onClick={handleCreateOrder}
              disabled={!supplierId}
            >
              Create Purchase Order <ChevronRight className="w-4 h-4" />
            </button>
          </>
        ) : step === 'done' ? (
          <>
            <button className="btn btn-secondary" onClick={onHide}>Close</button>
            <button
              className="btn btn-primary"
              onClick={() => {
                if (createdOrderId) onComplete(createdOrderId, createdOrderNumber);
                onHide();
              }}
            >
              View Order
            </button>
          </>
        ) : null
      }
    >
      {/* Step progress bar */}
      <div className="flex items-center gap-0 mb-6">
        {STEPS.map((s, idx) => {
          const done = idx < finalStepIdx;
          const active = idx === finalStepIdx;
          return (
            <React.Fragment key={s.key}>
              <div className="flex flex-col items-center flex-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors
                  ${done   ? 'bg-emerald-500 text-white' : active ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-400'}`}
                >
                  {done ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                </div>
                <span className={`text-xs mt-1 font-medium ${active ? 'text-primary-700' : done ? 'text-emerald-600' : 'text-gray-400'}`}>
                  {s.label}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 -mt-5 ${done ? 'bg-emerald-400' : 'bg-gray-200'}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Step 1 — Upload */}
      {step === 'upload' && (
        <div className="space-y-4">
          <div
            className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer transition-colors
              ${dragOver ? 'border-primary-400 bg-primary-50' : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <UploadCloud className={`w-12 h-12 mb-3 ${dragOver ? 'text-primary-500' : 'text-gray-300'}`} />
            <p className="font-semibold text-gray-600 mb-1">Drop your invoice here</p>
            <p className="text-sm text-gray-400">or click to browse</p>
            <p className="text-xs text-gray-300 mt-2">Supports: JPEG, PNG, WEBP, PDF</p>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED}
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
            />
          </div>

          {file && (
            <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl border border-gray-200">
              {file.type === 'application/pdf'
                ? <FileText className="w-8 h-8 text-red-400 shrink-0" />
                : <ImageIcon className="w-8 h-8 text-blue-400 shrink-0" />
              }
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-gray-800 truncate">{file.name}</div>
                <div className="text-xs text-gray-400">{(file.size / 1024).toFixed(0)} KB · {file.type}</div>
              </div>
              <button
                className="text-gray-400 hover:text-red-500 p-1"
                onClick={(e) => { e.stopPropagation(); setFile(null); }}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}

          {parseError && (
            <div className="flex items-start gap-2 px-4 py-3 bg-red-50 rounded-xl border border-red-100 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{parseError}</span>
            </div>
          )}
        </div>
      )}

      {/* Step 2 — Parsing */}
      {step === 'parsing' && (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
          <p className="font-semibold text-gray-600">Analyzing document with AI…</p>
          <p className="text-sm text-gray-400">Extracting items, prices, and supplier info</p>
        </div>
      )}

      {/* Step 3 — Review */}
      {step === 'review' && (
        <div className="space-y-5">
          {createError && (
            <div className="flex items-start gap-2 px-4 py-3 bg-red-50 rounded-xl border border-red-100 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /><span>{createError}</span>
            </div>
          )}

          {/* Header fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 border border-gray-100 rounded-xl">
            <div>
              <label className="label">Supplier *</label>
              <select
                className={`input-field ${!supplierId ? 'border-amber-400' : ''}`}
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value ? Number(e.target.value) : '')}
              >
                <option value="">Select supplier…</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              {supplierName && (
                <p className="text-xs text-gray-400 mt-0.5">Detected: <em>{supplierName}</em></p>
              )}
            </div>
            <div>
              <label className="label">Invoice / Delivery Date</label>
              <input
                type="date"
                className="input-field"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Document Type</label>
              <div className="flex items-center gap-2 mt-1">
                <span className={`badge ${parsedData?.document_type === 'invoice' ? 'badge-info' : parsedData?.document_type === 'delivery_note' ? 'badge-success' : 'badge-secondary'} capitalize`}>
                  {parsedData?.document_type?.replace('_', ' ') || 'Unknown'}
                </span>
                {parsedData?.invoice_number && (
                  <span className="text-xs text-gray-500">#{parsedData.invoice_number}</span>
                )}
              </div>
            </div>
          </div>

          {!supplierId && (
            <p className="text-xs text-amber-600 font-medium">Please select a supplier to continue.</p>
          )}

          {/* Items table */}
          <div className="overflow-x-auto border border-gray-200 rounded-xl">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase">
                  <th className="px-3 py-3 w-8 text-center">#</th>
                  <th className="px-3 py-3">Item from Invoice</th>
                  <th className="px-3 py-3 min-w-[160px]">Matched Product</th>
                  <th className="px-3 py-3 w-20">Qty</th>
                  <th className="px-3 py-3 w-24">Unit Price</th>
                  <th className="px-3 py-3 w-16">Tax %</th>
                  <th className="px-3 py-3 w-20 text-center">Tax Incl?</th>
                  <th className="px-3 py-3 w-28 text-right">Price incl. Tax</th>
                  <th className="px-3 py-3 w-28 text-right">Total</th>
                  <th className="px-3 py-3 w-8" />
                </tr>
              </thead>
              <tbody>
                {reviewItems.map((ri, idx) => {
                  const { finalPrice } = getEffectivePrices(ri);
                  const lineTotal = ri.quantity * finalPrice;
                  const priceInclTax = finalPrice;
                  return (
                    <React.Fragment key={idx}>
                      <tr className={`border-b border-gray-100 ${idx % 2 === 1 ? 'bg-gray-50/40' : ''}`}>
                        <td className="px-3 py-2.5 text-center text-xs text-gray-400 font-medium">{idx + 1}</td>

                        {/* Invoice item name (editable) */}
                        <td className="px-3 py-2.5">
                          <input
                            type="text"
                            className="input-field text-sm w-full"
                            value={ri.invoiceName}
                            onChange={(e) => updateItem(idx, { invoiceName: e.target.value })}
                          />
                        </td>

                        {/* Matched product */}
                        <td className="px-3 py-2.5">
                          {!ri.createNew ? (
                            <div className="space-y-1">
                              <select
                                className="input-field text-sm w-full"
                                value={ri.matchedProductId ?? ''}
                                onChange={(e) => {
                                  const id = e.target.value ? Number(e.target.value) : null;
                                  const match = ri.matches.find(m => m.id === id);
                                  updateItem(idx, {
                                    matchedProductId: id,
                                    matchedProductName: match?.name || '',
                                    unit_price: match?.cost_price || ri.unit_price,
                                  });
                                }}
                              >
                                <option value="">— no match —</option>
                                {ri.matches.map(m => (
                                  <option key={m.id} value={m.id}>{m.name}</option>
                                ))}
                              </select>
                              {ri.matchedProductId ? (
                                <div className="flex items-center gap-1 text-xs text-emerald-600">
                                  <CheckCircle2 className="w-3 h-3" /> Matched
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 text-xs text-amber-600">
                                  <AlertCircle className="w-3 h-3" /> No match selected
                                </div>
                              )}
                              <button
                                type="button"
                                className="text-xs text-primary-600 hover:underline"
                                onClick={() => updateItem(idx, { createNew: true })}
                              >
                                + Create new product
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1 text-xs text-primary-600 font-medium">
                                <Plus className="w-3 h-3" /> New product
                              </div>
                              {ri.matches.length > 0 && (
                                <button
                                  type="button"
                                  className="text-xs text-gray-500 hover:underline"
                                  onClick={() => updateItem(idx, {
                                    createNew: false,
                                    matchedProductId: ri.matches[0].id,
                                    matchedProductName: ri.matches[0].name,
                                  })}
                                >
                                  Use existing instead
                                </button>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Qty */}
                        <td className="px-3 py-2.5">
                          <input
                            type="number"
                            className="input-field text-sm !w-16"
                            value={ri.quantity}
                            min="0.01"
                            step="0.01"
                            onChange={(e) => updateItem(idx, { quantity: parseFloat(e.target.value) || 0 })}
                          />
                        </td>

                        {/* Unit Price */}
                        <td className="px-3 py-2.5">
                          <input
                            type="number"
                            className="input-field text-sm"
                            value={ri.unit_price}
                            min="0"
                            step="0.01"
                            onChange={(e) => updateItem(idx, { unit_price: parseFloat(e.target.value) || 0 })}
                          />
                        </td>

                        {/* Tax */}
                        <td className="px-3 py-2.5">
                          <input
                            type="number"
                            className="input-field text-sm"
                            value={ri.tax_rate}
                            min="0"
                            step="0.01"
                            onChange={(e) => updateItem(idx, { tax_rate: parseFloat(e.target.value) || 0 })}
                          />
                        </td>

                        {/* Tax included in unit price? */}
                        <td className="px-3 py-2.5 text-center">
                          <input
                            type="checkbox"
                            className="w-4 h-4"
                            checked={ri.taxIncluded}
                            onChange={(e) => updateItem(idx, { taxIncluded: e.target.checked })}
                            title="Check if the unit price on the invoice already includes tax"
                          />
                        </td>

                        {/* Price incl. Tax (derived; this is the value stored on the order) */}
                        <td className="px-3 py-2.5 text-right text-gray-600 tabular-nums">
                          {formatINR(priceInclTax)}
                        </td>

                        {/* Total */}
                        <td className="px-3 py-2.5 text-right font-semibold text-gray-800 tabular-nums">
                          {formatINR(lineTotal)}
                        </td>

                        {/* Delete */}
                        <td className="px-3 py-2.5 text-center">
                          {reviewItems.length > 1 && (
                            <button
                              type="button"
                              className="p-1 rounded-md text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                              onClick={() => setReviewItems(prev => prev.filter((_, i) => i !== idx))}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>

                      {/* New product inline form */}
                      {ri.createNew && (
                        <tr className="bg-primary-50/40 border-b border-primary-100">
                          <td />
                          <td colSpan={9} className="px-4 py-3">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              <div>
                                <label className="label text-xs">Product Name</label>
                                <input
                                  type="text"
                                  className="input-field text-sm"
                                  value={ri.newProduct.name}
                                  onChange={(e) => updateNewProduct(idx, { name: e.target.value })}
                                />
                              </div>
                              <div>
                                <label className="label text-xs">Category</label>
                                <select
                                  className="input-field text-sm"
                                  value={ri.newProduct.category}
                                  onChange={(e) => updateNewProduct(idx, { category: e.target.value ? Number(e.target.value) : '' })}
                                >
                                  <option value="">Select category</option>
                                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                              </div>
                              <div>
                                <label className="label text-xs">Brand</label>
                                <select
                                  className="input-field text-sm"
                                  value={ri.newProduct.brand}
                                  onChange={(e) => updateNewProduct(idx, { brand: e.target.value ? Number(e.target.value) : '' })}
                                >
                                  <option value="">Select brand (optional)</option>
                                  {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </select>
                              </div>
                              <div>
                                <label className="label text-xs">Unit</label>
                                <select
                                  className="input-field text-sm"
                                  value={ri.newProduct.unit}
                                  onChange={(e) => updateNewProduct(idx, { unit: e.target.value })}
                                >
                                  {['piece', 'kg', 'gram', 'liter', 'ml', 'meter', 'cm', 'box', 'dozen', 'pack', 'bottle'].map(u => (
                                    <option key={u} value={u}>{u}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Add row */}
          <button
            type="button"
            className="btn btn-outline-primary btn-sm flex items-center gap-1.5"
            onClick={() => setReviewItems(prev => [...prev, {
              invoiceName: '',
              quantity: 1,
              unit: '',
              unit_price: 0,
              tax_rate: 0,
              taxIncluded: false,
              matchedProductId: null,
              matchedProductName: '',
              matches: [],
              createNew: false,
              newProduct: { name: '', category: '', brand: '', unit: 'piece', sku: '' },
            }])}
          >
            <Plus className="w-4 h-4" /> Add Row
          </button>

          {/* Summary */}
          <div className="flex justify-end">
            <div className="w-64 border border-gray-200 rounded-xl overflow-hidden text-sm">
              <div className="flex justify-between px-4 py-2.5 border-b border-gray-100">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-medium tabular-nums">{formatINR(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between px-4 py-2.5 border-b border-gray-100">
                <span className="text-gray-500">Tax</span>
                <span className="font-medium tabular-nums">{formatINR(totals.tax)}</span>
              </div>
              <div className="flex justify-between px-4 py-3 bg-primary-50">
                <span className="font-bold text-primary-800">Grand Total</span>
                <span className="font-bold text-primary-800 tabular-nums">{formatINR(grandTotal)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 4 — Creating */}
      {step === 'creating' && (
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
          <div className="space-y-1 text-center">
            {creatingStatus.map((msg, i) => (
              <p key={i} className="text-sm text-gray-600">{msg}</p>
            ))}
          </div>
        </div>
      )}

      {/* Step 5 — Done */}
      {step === 'done' && (
        <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-emerald-500" />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-800">Purchase Order Created!</p>
            <p className="text-gray-500 mt-1">
              Order <span className="font-semibold text-primary-700">{createdOrderNumber}</span> has been created successfully.
            </p>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default ImportInvoiceModal;
