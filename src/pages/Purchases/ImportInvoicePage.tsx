import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { purchaseService } from '../../api/services/purchase.service';
import { productService } from '../../api/services/product.service';
import { supplierService } from '../../api/services/supplier.service';
import { ParsedInvoice, ParsedInvoiceItem, PurchaseOrderCreate } from '../../types/purchase.types';
import { useAppDispatch } from '../../hooks/useRedux';
import { addNotification } from '../../store/slices/uiSlice';
import axiosInstance from '../../api/axios';
import { API_ENDPOINTS } from '../../api/endpoints';
import {
  ArrowLeft,
  UploadCloud,
  FileText,
  ImageIcon,
  Trash2,
  Plus,
  AlertCircle,
  CheckCircle2,
  Loader2,
  CheckCircle,
  ChevronRight,
  FileSearch,
  ScanLine,
  ListChecks,
  PackagePlus,
  ShoppingCart,
  Zap,
} from 'lucide-react';

type Step = 'upload' | 'parsing' | 'review' | 'creating' | 'done';

interface ReviewItem {
  invoiceName: string;
  quantity: number;
  unit: string;
  unit_price: number;
  tax_rate: number;
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
interface BrandOption   { id: number; name: string; }

const ACCEPTED = 'image/jpeg,image/png,image/webp,application/pdf';

function formatINR(v: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(v);
}

function buildReviewItems(items: ParsedInvoiceItem[]): ReviewItem[] {
  return items.map(item => ({
    invoiceName: item.name,
    quantity: item.quantity || 1,
    unit: item.unit || '',
    unit_price: item.unit_price || 0,
    tax_rate: item.tax_rate || 0,
    matchedProductId: item.matches?.[0]?.id ?? null,
    matchedProductName: item.matches?.[0]?.name ?? '',
    matches: item.matches ?? [],
    createNew: !item.matches?.length,
    newProduct: { name: item.name, category: '', brand: '', unit: item.unit || 'piece', sku: '' },
  }));
}

const STEPS = [
  { key: 'upload',  label: 'Upload' },
  { key: 'review',  label: 'Review & Edit' },
  { key: 'done',    label: 'Confirm' },
];

const ImportInvoicePage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [parseError, setParseError] = useState('');
  const [parsedData, setParsedData] = useState<ParsedInvoice | null>(null);

  // Review state
  const [supplierName, setSupplierName]   = useState('');
  const [invoiceDate, setInvoiceDate]     = useState('');
  const [supplierId, setSupplierId]       = useState<number | ''>('');
  const [reviewItems, setReviewItems]     = useState<ReviewItem[]>([]);
  const [categories, setCategories]       = useState<CategoryOption[]>([]);
  const [brands, setBrands]               = useState<BrandOption[]>([]);
  const [suppliers, setSuppliers]         = useState<{ id: number; name: string }[]>([]);

  const [fromCache, setFromCache] = useState(false);

  // Creating state
  const [creatingLog, setCreatingLog]         = useState<string[]>([]);
  const [createdOrderNumber, setCreatedOrderNumber] = useState('');
  const [_createdOrderId, setCreatedOrderId]   = useState<number | null>(null);
  const [createError, setCreateError]         = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load reference data once
  useEffect(() => {
    supplierService.getAllSuppliers().then(s => setSuppliers(s)).catch(() => {});
    axiosInstance.get(API_ENDPOINTS.PRODUCTS.CATEGORIES).then(r => {
      const d = r.data; setCategories(Array.isArray(d) ? d : (d.results ?? []));
    }).catch(() => {});
    axiosInstance.get(API_ENDPOINTS.PRODUCTS.BRANDS).then(r => {
      const d = r.data; setBrands(Array.isArray(d) ? d : (d.results ?? []));
    }).catch(() => {});
  }, []);

  const handleFileSelect = (f: File) => { setFile(f); setParseError(''); };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
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
      setFromCache(data.from_cache ?? false);
      setSupplierName(data.supplier_name || '');
      setInvoiceDate(data.invoice_date || new Date().toISOString().split('T')[0]);
      setReviewItems(buildReviewItems(data.items));
      const matched = suppliers.find(s =>
        s.name.toLowerCase().includes((data.supplier_name || '').toLowerCase()) ||
        (data.supplier_name || '').toLowerCase().includes(s.name.toLowerCase())
      );
      setSupplierId(matched?.id ?? '');
      setStep('review');
    } catch (err: any) {
      setParseError(err?.response?.data?.error || err?.message || 'Document parsing failed');
      setStep('upload');
    }
  };

  const updateItem = (idx: number, patch: Partial<ReviewItem>) =>
    setReviewItems(prev => prev.map((item, i) => i === idx ? { ...item, ...patch } : item));

  const updateNewProduct = (idx: number, patch: Partial<ReviewItem['newProduct']>) =>
    setReviewItems(prev => prev.map((item, i) =>
      i === idx ? { ...item, newProduct: { ...item.newProduct, ...patch } } : item));

  const handleCreateOrder = async () => {
    if (!supplierId) return;
    setStep('creating');
    setCreateError('');
    const log = (msg: string) => setCreatingLog(prev => [...prev, msg]);

    try {
      const finalItems: PurchaseOrderCreate['items'] = [];

      for (let i = 0; i < reviewItems.length; i++) {
        const ri = reviewItems[i];
        if (ri.createNew) {
          log(`Creating product: ${ri.newProduct.name}…`);
          const fd = new FormData();
          fd.append('name', ri.newProduct.name);
          fd.append('unit', ri.newProduct.unit || 'piece');
          if (ri.newProduct.sku) fd.append('sku', ri.newProduct.sku);
          if (ri.newProduct.category) fd.append('category', String(ri.newProduct.category));
          if (ri.newProduct.brand) fd.append('brand', String(ri.newProduct.brand));
          fd.append('cost_price', String(ri.unit_price || 0));
          fd.append('selling_price', String(ri.unit_price || 0));
          const created = await productService.create(fd);
          finalItems.push({ product: created.id, product_name: created.name, quantity: ri.quantity, unit_price: ri.unit_price, tax_rate: ri.tax_rate });
        } else {
          finalItems.push({ product: ri.matchedProductId, product_name: ri.matchedProductName || ri.invoiceName, quantity: ri.quantity, unit_price: ri.unit_price, tax_rate: ri.tax_rate });
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
      dispatch(addNotification({ message: `Purchase order ${order.order_number} created`, type: 'success' }));
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.response?.data?.detail || err?.message || 'Failed';
      setCreateError(msg);
      setStep('review');
    }
  };

  const totals = reviewItems.reduce(
    (acc, item) => { const base = item.quantity * item.unit_price; acc.sub += base; acc.tax += (base * item.tax_rate) / 100; return acc; },
    { sub: 0, tax: 0 }
  );
  const grandTotal = totals.sub + totals.tax;

  const stepIdx = step === 'review' || step === 'creating' ? 1 : step === 'done' ? 2 : 0;

  return (
    <div className="flex flex-col min-h-0 h-full">

      {/* Page header */}
      <div className="page-header border-b border-gray-100 pb-4">
        <div className="page-header-left">
          <button
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors mr-1"
            onClick={() => navigate('/purchases')}
            title="Back to Purchases"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="page-header-icon">
            <FileSearch className="w-5 h-5" />
          </div>
          <div>
            <h1>Import Invoice</h1>
            <p>Upload a supplier invoice or delivery note to auto-fill a purchase order</p>
          </div>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-0 py-4 px-1 max-w-lg mx-auto w-full">
        {STEPS.map((s, idx) => {
          const done = idx < stepIdx;
          const active = idx === stepIdx;
          return (
            <React.Fragment key={s.key}>
              <div className="flex flex-col items-center flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors
                  ${done ? 'bg-emerald-500 text-white' : active ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
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

      {/* ── Step 1: Upload ── */}
      {(step === 'upload' || step === 'parsing') && (
        <div className="flex-1 flex gap-6 min-h-0 overflow-hidden py-2">

          {/* Left — upload zone */}
          <div className="flex-1 flex flex-col gap-4 overflow-y-auto">
            {step === 'parsing' ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-5 section-card">
                <div className="w-16 h-16 rounded-full bg-primary-50 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-gray-700 text-lg">Analyzing document with AI…</p>
                  <p className="text-sm text-gray-400 mt-1">Extracting items, quantities, prices and supplier info</p>
                </div>
                <div className="flex gap-6 text-xs text-gray-400 mt-2">
                  {['Reading document', 'Detecting items', 'Matching products'].map((label, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      {label}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {/* Drop zone */}
                <div
                  className={`flex-1 min-h-[280px] border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all duration-200
                    ${dragOver
                      ? 'border-primary-400 bg-primary-50 scale-[1.01]'
                      : file
                        ? 'border-emerald-300 bg-emerald-50/40'
                        : 'border-gray-200 hover:border-primary-300 bg-white hover:bg-primary-50'
                    }`}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => !file && fileInputRef.current?.click()}
                >
                  {file ? (
                    /* File selected state */
                    <div className="flex flex-col items-center gap-4 py-6 px-8 w-full">
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${file.type === 'application/pdf' ? 'bg-red-100' : 'bg-blue-100'}`}>
                        {file.type === 'application/pdf'
                          ? <FileText className="w-8 h-8 text-red-500" />
                          : <ImageIcon className="w-8 h-8 text-blue-500" />}
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-gray-800 text-base">{file.name}</div>
                        <div className="text-sm text-gray-400 mt-0.5">{(file.size / 1024).toFixed(0)} KB · {file.type.split('/')[1].toUpperCase()}</div>
                      </div>
                      <div className="flex items-center gap-2 text-emerald-600 text-sm font-medium">
                        <CheckCircle2 className="w-4 h-4" /> Ready to analyze
                      </div>
                      <button
                        className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1 transition-colors"
                        onClick={(e) => { e.stopPropagation(); setFile(null); }}
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remove file
                      </button>
                    </div>
                  ) : (
                    /* Empty state */
                    <div className="flex flex-col items-center gap-3 py-10 px-8">
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${dragOver ? 'bg-primary-100' : 'bg-gray-100'}`}>
                        <UploadCloud className={`w-8 h-8 transition-colors ${dragOver ? 'text-primary-500' : 'text-gray-400'}`} />
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-gray-700 text-base">Drop your invoice here</p>
                        <p className="text-sm text-gray-400 mt-0.5">or <span className="text-primary-600 ">click to browse files</span></p>
                      </div>
                      <div className="flex gap-2 mt-2 flex-wrap justify-center">
                        {['JPEG', 'PNG', 'WEBP', 'PDF'].map(fmt => (
                          <span key={fmt} className="text-xs font-medium text-gray-400 bg-gray-100 rounded-full px-2.5 py-0.5">{fmt}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  <input ref={fileInputRef} type="file" accept={ACCEPTED} className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])} />
                </div>

                {parseError && (
                  <div className="flex items-start gap-2 px-4 py-3 bg-red-50 rounded-xl border border-red-100 text-red-700 text-sm">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{parseError}</span>
                  </div>
                )}

                <button
                  className="btn btn-primary flex items-center justify-center gap-2 w-full py-3 text-base"
                  onClick={handleAnalyze}
                  disabled={!file}
                >
                  <ScanLine className="w-5 h-5" />
                  Analyze Document
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}
          </div>

          {/* Right — how it works panel */}
          <div className="w-80 shrink-0 flex flex-col gap-4 overflow-y-auto">

            {/* How it works */}
            <div className="section-card !p-5 space-y-4">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">How it works</div>
              <div className="space-y-4">
                {[
                  {
                    icon: <UploadCloud className="w-5 h-5 text-primary-500" />,
                    bg: 'bg-primary-50',
                    title: 'Upload your document',
                    desc: 'Take a photo or scan of your supplier invoice or delivery note.',
                  },
                  {
                    icon: <ScanLine className="w-5 h-5 text-violet-500" />,
                    bg: 'bg-violet-50',
                    title: 'AI reads the document',
                    desc: 'Our AI extracts items, quantities, prices, tax rates, and supplier info automatically.',
                  },
                  {
                    icon: <ListChecks className="w-5 h-5 text-amber-500" />,
                    bg: 'bg-amber-50',
                    title: 'Review & correct',
                    desc: 'Every field is editable. Fix any mistakes the AI makes before confirming.',
                  },
                  {
                    icon: <ShoppingCart className="w-5 h-5 text-emerald-500" />,
                    bg: 'bg-emerald-50',
                    title: 'Create purchase order',
                    desc: 'Approve to instantly create the purchase order with all items filled in.',
                  },
                ].map((step, i) => (
                  <div key={i} className="flex gap-3">
                    <div className={`w-9 h-9 rounded-xl ${step.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                      {step.icon}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-700">{step.title}</div>
                      <div className="text-xs text-gray-400 mt-0.5 leading-relaxed">{step.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* What gets extracted */}
            <div className="section-card !p-5 space-y-3">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">What gets extracted</div>
              <div className="space-y-2">
                {[
                  'Supplier / vendor name',
                  'Invoice date & number',
                  'Product names & descriptions',
                  'Quantities and units',
                  'Unit prices',
                  'Tax rates (GST %)',
                  'Subtotal and grand total',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            {/* New products tip */}
            <div className="section-card !p-5 bg-primary-50 border-primary-100 space-y-2">
              <div className="flex items-center gap-2">
                <PackagePlus className="w-4 h-4 text-primary-600" />
                <span className="text-xs font-semibold text-primary-700 uppercase tracking-wide">New Products</span>
              </div>
              <p className="text-xs text-primary-700 leading-relaxed">
                If an item isn't in your catalog yet, you can create it on the spot during review — just pick a category and brand.
              </p>
            </div>

          </div>
        </div>
      )}

      {/* ── Step 2: Review ── */}
      {step === 'review' && (
        <div className="flex-1 flex gap-6 px-0 min-h-0 overflow-hidden">

          {/* Left sidebar — sticky document info + actions */}
          <div className="w-72 shrink-0 flex flex-col gap-4 overflow-y-auto py-2 pr-0 pl-1">

            {createError && (
              <div className="flex items-start gap-2 px-3 py-2.5 bg-red-50 rounded-xl border border-red-100 text-red-700 text-xs">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" /><span>{createError}</span>
              </div>
            )}

            {/* Document card */}
            <div className="section-card !p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Document Info</div>
                {fromCache && (
                  <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                    <Zap className="w-3 h-3" /> Cached
                  </span>
                )}
              </div>

              <div>
                <label className="label">Supplier *</label>
                <select
                  className={`input-field ${!supplierId ? 'border-amber-400 ring-1 ring-amber-300' : ''}`}
                  value={supplierId}
                  onChange={e => setSupplierId(e.target.value ? Number(e.target.value) : '')}
                >
                  <option value="">Select supplier…</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                {supplierName && (
                  <p className="text-xs text-gray-400 mt-0.5">Detected: <em className="text-gray-600">{supplierName}</em></p>
                )}
                {!supplierId && (
                  <p className="text-xs text-amber-600 mt-1 font-medium">Required to create order</p>
                )}
              </div>

              <div>
                <label className="label">Invoice Date</label>
                <input type="date" className="input-field" value={invoiceDate}
                  onChange={e => setInvoiceDate(e.target.value)} />
              </div>

              <div>
                <div className="label mb-1">Document Type</div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`badge ${parsedData?.document_type === 'invoice' ? 'badge-info' : parsedData?.document_type === 'delivery_note' ? 'badge-success' : 'badge-secondary'} capitalize`}>
                    {parsedData?.document_type?.replace('_', ' ') || 'Unknown'}
                  </span>
                  {parsedData?.invoice_number && (
                    <span className="text-xs text-gray-500 font-mono">#{parsedData.invoice_number}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Totals card */}
            <div className="section-card !p-4 space-y-0 overflow-hidden">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Order Summary</div>
              <div className="flex justify-between text-sm py-2 border-b border-gray-100">
                <span className="text-gray-500">Items</span>
                <span className="font-medium">{reviewItems.length}</span>
              </div>
              <div className="flex justify-between text-sm py-2 border-b border-gray-100">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-medium tabular-nums">{formatINR(totals.sub)}</span>
              </div>
              <div className="flex justify-between text-sm py-2 border-b border-gray-100">
                <span className="text-gray-500">Tax</span>
                <span className="font-medium tabular-nums">{formatINR(totals.tax)}</span>
              </div>
              <div className="flex justify-between py-3 bg-primary-50 -mx-4 px-4 mt-1">
                <span className="font-bold text-primary-800">Grand Total</span>
                <span className="font-bold text-primary-800 tabular-nums">{formatINR(grandTotal)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <button
                className="btn btn-primary w-full flex items-center justify-center gap-2"
                onClick={handleCreateOrder}
                disabled={!supplierId || reviewItems.length === 0}
              >
                Create Purchase Order <ChevronRight className="w-4 h-4" />
              </button>
              <button
                className="btn btn-outline-secondary w-full flex items-center justify-center gap-1.5"
                onClick={() => setStep('upload')}
              >
                <ArrowLeft className="w-4 h-4" /> Upload Different File
              </button>
            </div>
          </div>

          {/* Main content — items table */}
          <div className="flex-1 overflow-y-auto py-2 pr-1">
            <div className="space-y-4">

              {/* Table header */}
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-700">
                  Line Items
                  <span className="ml-2 text-xs font-normal text-gray-400">(all fields are editable — correct any AI mistakes)</span>
                </h2>
                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm flex items-center gap-1.5"
                  onClick={() => setReviewItems(prev => [...prev, {
                    invoiceName: '', quantity: 1, unit: '', unit_price: 0, tax_rate: 0,
                    matchedProductId: null, matchedProductName: '', matches: [],
                    createNew: false,
                    newProduct: { name: '', category: '', brand: '', unit: 'piece', sku: '' },
                  }])}
                >
                  <Plus className="w-4 h-4" /> Add Row
                </button>
              </div>

              {/* Items */}
              <div className="space-y-2">
                {reviewItems.map((ri, idx) => {
                  const lineTotal = ri.quantity * ri.unit_price * (1 + ri.tax_rate / 100);
                  return (
                    <div key={idx} className={`section-card !p-0 overflow-hidden ${ri.createNew ? 'ring-2 ring-primary-200' : ''}`}>

                      {/* Main row */}
                      <div className="grid grid-cols-[2rem_1fr_1.6fr_5rem_7rem_5rem_6rem_2rem] gap-0 items-center border-b border-gray-100">

                        {/* Row number */}
                        <div className="text-center py-3 text-xs text-gray-400 font-semibold">{idx + 1}</div>

                        {/* Invoice item name */}
                        <div className="px-3 py-2 border-r border-gray-100">
                          <div className="text-xs text-gray-400 mb-1 font-medium uppercase tracking-wide">Invoice Item</div>
                          <input
                            type="text"
                            className="input-field text-sm w-full"
                            value={ri.invoiceName}
                            placeholder="Item name from invoice"
                            onChange={e => updateItem(idx, { invoiceName: e.target.value })}
                          />
                        </div>

                        {/* Product match */}
                        <div className="px-3 py-2 border-r border-gray-100">
                          <div className="text-xs text-gray-400 mb-1 font-medium uppercase tracking-wide">Match to Product</div>
                          {!ri.createNew ? (
                            <div className="space-y-1.5">
                              <select
                                className="input-field text-sm w-full"
                                value={ri.matchedProductId ?? ''}
                                onChange={e => {
                                  const id = e.target.value ? Number(e.target.value) : null;
                                  const match = ri.matches.find(m => m.id === id);
                                  updateItem(idx, { matchedProductId: id, matchedProductName: match?.name || '', unit_price: match?.cost_price || ri.unit_price });
                                }}
                              >
                                <option value="">— search / no match —</option>
                                {ri.matches.map(m => (
                                  <option key={m.id} value={m.id}>{m.name}{m.sku ? ` (${m.sku})` : ''}</option>
                                ))}
                              </select>
                              <div className="flex items-center justify-between">
                                {ri.matchedProductId
                                  ? <span className="flex items-center gap-1 text-xs text-emerald-600"><CheckCircle2 className="w-3 h-3" /> Matched</span>
                                  : <span className="flex items-center gap-1 text-xs text-amber-600"><AlertCircle className="w-3 h-3" /> No match</span>
                                }
                                <button type="button" className="text-xs text-primary-600 hover:underline"
                                  onClick={() => updateItem(idx, { createNew: true })}>
                                  + Create new
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-1 text-xs font-semibold text-primary-700 bg-primary-50 rounded-lg px-2 py-1">
                                <Plus className="w-3 h-3" /> Creating new product
                              </div>
                              {ri.matches.length > 0 && (
                                <button type="button" className="text-xs text-gray-500 hover:underline"
                                  onClick={() => updateItem(idx, { createNew: false, matchedProductId: ri.matches[0].id, matchedProductName: ri.matches[0].name })}>
                                  Use existing instead
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Qty */}
                        <div className="px-3 py-2 border-r border-gray-100">
                          <div className="text-xs text-gray-400 mb-1 font-medium uppercase tracking-wide">Qty</div>
                          <input type="number" className="input-field text-sm w-full" value={ri.quantity}
                            min="0.01" step="0.01"
                            onChange={e => updateItem(idx, { quantity: parseFloat(e.target.value) || 0 })} />
                        </div>

                        {/* Unit price */}
                        <div className="px-3 py-2 border-r border-gray-100">
                          <div className="text-xs text-gray-400 mb-1 font-medium uppercase tracking-wide">Unit Price</div>
                          <input type="number" className="input-field text-sm w-full" value={ri.unit_price}
                            min="0" step="0.01"
                            onChange={e => updateItem(idx, { unit_price: parseFloat(e.target.value) || 0 })} />
                        </div>

                        {/* Tax */}
                        <div className="px-3 py-2 border-r border-gray-100">
                          <div className="text-xs text-gray-400 mb-1 font-medium uppercase tracking-wide">Tax %</div>
                          <input type="number" className="input-field text-sm w-full" value={ri.tax_rate}
                            min="0" step="0.01"
                            onChange={e => updateItem(idx, { tax_rate: parseFloat(e.target.value) || 0 })} />
                        </div>

                        {/* Total */}
                        <div className="px-3 py-2 border-r border-gray-100 text-right">
                          <div className="text-xs text-gray-400 mb-1 font-medium uppercase tracking-wide">Total</div>
                          <div className="font-semibold text-gray-800 text-sm tabular-nums">{formatINR(lineTotal)}</div>
                        </div>

                        {/* Delete */}
                        <div className="flex items-center justify-center">
                          {reviewItems.length > 1 && (
                            <button type="button"
                              className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                              onClick={() => setReviewItems(prev => prev.filter((_, i) => i !== idx))}>
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* New product sub-form */}
                      {ri.createNew && (
                        <div className="px-6 py-4 bg-primary-50/60">
                          <div className="text-xs font-semibold text-primary-700 uppercase tracking-wide mb-3">New Product Details</div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                              <label className="label text-xs">Product Name *</label>
                              <input type="text" className="input-field text-sm" value={ri.newProduct.name}
                                onChange={e => updateNewProduct(idx, { name: e.target.value })} />
                            </div>
                            <div>
                              <label className="label text-xs">Category</label>
                              <select className="input-field text-sm" value={ri.newProduct.category}
                                onChange={e => updateNewProduct(idx, { category: e.target.value ? Number(e.target.value) : '' })}>
                                <option value="">Select category</option>
                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="label text-xs">Brand</label>
                              <select className="input-field text-sm" value={ri.newProduct.brand}
                                onChange={e => updateNewProduct(idx, { brand: e.target.value ? Number(e.target.value) : '' })}>
                                <option value="">Select brand (optional)</option>
                                {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="label text-xs">Unit</label>
                              <select className="input-field text-sm" value={ri.newProduct.unit}
                                onChange={e => updateNewProduct(idx, { unit: e.target.value })}>
                                {['piece', 'kg', 'gram', 'liter', 'ml', 'meter', 'cm', 'box', 'dozen', 'pack', 'bottle'].map(u => (
                                  <option key={u} value={u}>{u}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ── Step 3: Creating ── */}
      {step === 'creating' && (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-center">
            <Loader2 className="w-12 h-12 text-primary-500 animate-spin" />
            <div className="space-y-1">
              {creatingLog.map((msg, i) => (
                <p key={i} className="text-sm text-gray-600">{msg}</p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Step 4: Done ── */}
      {step === 'done' && (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-5 text-center max-w-sm">
            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-emerald-500" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-800">Purchase Order Created!</p>
              <p className="text-gray-500 mt-2">
                Order <span className="font-semibold text-primary-700">{createdOrderNumber}</span> has been successfully created from the imported document.
              </p>
            </div>
            <div className="flex gap-3">
              <button className="btn btn-outline-secondary" onClick={() => navigate('/purchases')}>
                Back to Purchases
              </button>
              <button
                className="btn btn-primary"
                onClick={() => navigate('/purchases')}
              >
                View Order
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ImportInvoicePage;
