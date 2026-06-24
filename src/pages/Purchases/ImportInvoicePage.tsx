import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { purchaseService } from '../../api/services/purchase.service';
import { productService } from '../../api/services/product.service';
import { supplierService } from '../../api/services/supplier.service';
import { ParsedInvoice, ParsedInvoiceItem, PurchaseOrderCreate, PurchaseStatus, PurchaseOrder } from '../../types/purchase.types';
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
  Search,
  X,
  Link2,
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
  updateStock: boolean;
  newProduct: {
    name: string;
    category: number | '';
    brand: number | '';
    unit: string;
    sku: string;
    hsn_code: string;
    cost_price: number | '';
    selling_price: number | '';
    gst_rate: number | '';
    taxIncluded: boolean;
    stock_quantity: number | '';
    reorder_level: number | '';
    barcode: string;
    attributes: { name: string; value: string }[];
  };
}

// cost_price/selling_price entered above can be quoted either GST-inclusive or
// GST-exclusive. When excluded, the GST % must be added on top before the
// amount is persisted as the product's cost/selling price.
function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

function getEffectiveProductPrices(np: ReviewItem['newProduct']): { cost: number; selling: number } {
  const gst = Number(np.gst_rate) || 0;
  const cost = Number(np.cost_price) || 0;
  const selling = Number(np.selling_price) || 0;
  if (np.taxIncluded) return { cost, selling };
  return { cost: round2(cost * (1 + gst / 100)), selling: round2(selling * (1 + gst / 100)) };
}

interface CategoryOption { id: number; name: string; }
interface BrandOption   { id: number; name: string; }

const ACCEPTED = 'image/jpeg,image/png,image/webp,application/pdf';

const VALID_UNITS = ['piece', 'kg', 'gram', 'liter', 'ml', 'meter', 'feet', 'roll', 'dozen', 'pack', 'box'] as const;

const UNIT_MAP: Record<string, string> = {
  pcs: 'piece', pce: 'piece', nos: 'piece', no: 'piece', unit: 'piece', units: 'piece', each: 'piece',
  kilogram: 'kg', kilograms: 'kg', kgs: 'kg',
  grams: 'gram', gm: 'gram', gms: 'gram',
  litre: 'liter', litres: 'liter', liters: 'liter', l: 'liter',
  milliliter: 'ml', millilitre: 'ml', millilitres: 'ml',
  metres: 'meter', mtr: 'meter', m: 'meter', cm: 'meter', centimeter: 'meter',
  ft: 'feet', foot: 'feet',
  rolls: 'roll',
  dozens: 'dozen', dz: 'dozen',
  packs: 'pack', packet: 'pack', packets: 'pack',
  boxes: 'box', bottle: 'box', bottles: 'box',
};

function mapUnit(raw: string): string {
  const u = raw.toLowerCase().trim();
  if ((VALID_UNITS as readonly string[]).includes(u)) return u;
  return UNIT_MAP[u] ?? 'piece';
}

function autoSku(name: string): string {
  const prefix = name.trim().split(/\s+/).slice(0, 3)
    .map(w => w.replace(/[^a-zA-Z0-9]/g, '')[0]?.toUpperCase() ?? '')
    .join('');
  return `${prefix || 'PRD'}-${String(Date.now()).slice(-4)}`;
}

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
    updateStock: true,
    newProduct: {
      name: item.name,
      category: '',
      brand: '',
      unit: mapUnit(item.unit || 'piece'),
      sku: autoSku(item.name),
      hsn_code: item.hsn_code || '',
      cost_price: item.unit_price || '',
      selling_price: item.unit_price || '',
      gst_rate: item.tax_rate || '',
      taxIncluded: false,
      stock_quantity: item.quantity || '',
      reorder_level: '',
      barcode: '',
      attributes: [],
    },
  }));
}

interface NewProductErrors {
  name?: string;
  category?: string;
  sku?: string;
  cost_price?: string;
  selling_price?: string;
  stock_quantity?: string;
  reorder_level?: string;
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
  const [itemErrors, setItemErrors]           = useState<Record<number, NewProductErrors>>({});

  // Order options
  const [orderStatus, setOrderStatus]       = useState<PurchaseStatus>('received');
  const [paymentStatus, setPaymentStatus]   = useState<PurchaseOrder['payment_status']>('paid');
  const [paymentMethod, setPaymentMethod]   = useState<PurchaseOrder['payment_method']>('cash');

  // Creating state
  const [creatingLog, setCreatingLog]         = useState<string[]>([]);
  const [createdOrderNumber, setCreatedOrderNumber] = useState('');
  const [_createdOrderId, setCreatedOrderId]   = useState<number | null>(null);
  const [createError, setCreateError]         = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState<{ orderNumber: string; date: string } | null>(null);

  // Link-to-existing search state
  const [linkingItemIdx, setLinkingItemIdx]   = useState<number | null>(null);
  const [linkSearchQuery, setLinkSearchQuery] = useState('');
  const [linkSearchResults, setLinkSearchResults] = useState<{ id: number; name: string; sku: string; cost_price: number }[]>([]);
  const [linkSearchLoading, setLinkSearchLoading] = useState(false);

  // Category / brand inline search per item
  const [catSearch, setCatSearch]   = useState<Record<number, string>>({});
  const [brandSearch, setBrandSearch] = useState<Record<number, string>>({});
  const [catOpen, setCatOpen]   = useState<Record<number, boolean>>({});
  const [brandOpen, setBrandOpen] = useState<Record<number, boolean>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const linkSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const checkDuplicateInvoice = useCallback(async (invoiceNumber: string) => {
    if (!invoiceNumber?.trim()) return;
    setDuplicateWarning(null);
    try {
      const res = await axiosInstance.get(API_ENDPOINTS.PURCHASES.LIST, { params: { search: invoiceNumber } });
      const data = res.data;
      const orders: PurchaseOrder[] = Array.isArray(data) ? data : (data.results ?? []);
      const match = orders.find(o => o.notes && o.notes.includes(invoiceNumber));
      if (match) {
        setDuplicateWarning({ orderNumber: match.order_number, date: match.order_date });
      }
    } catch { /* ignore */ }
  }, []);

  const searchProducts = useCallback((query: string) => {
    if (linkSearchTimer.current) clearTimeout(linkSearchTimer.current);
    if (!query.trim()) { setLinkSearchResults([]); setLinkSearchLoading(false); return; }
    setLinkSearchLoading(true);
    linkSearchTimer.current = setTimeout(async () => {
      try {
        const res = await axiosInstance.get('/api/products/', { params: { search: query, limit: 12 } });
        const data = res.data;
        const items: any[] = Array.isArray(data) ? data : (data.results ?? []);
        setLinkSearchResults(items.map(p => ({ id: p.id, name: p.name, sku: p.sku || '', cost_price: p.cost_price || 0 })));
      } catch { setLinkSearchResults([]); }
      finally { setLinkSearchLoading(false); }
    }, 280);
  }, []);

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
      setDuplicateWarning(null);
      if (data.invoice_number) checkDuplicateInvoice(data.invoice_number);
      setStep('review');
    } catch (err: any) {
      setParseError(err?.response?.data?.error || err?.message || 'Document parsing failed');
      setStep('upload');
    }
  };

  const updateItem = (idx: number, patch: Partial<ReviewItem>) => {
    setReviewItems(prev => prev.map((item, i) => i === idx ? { ...item, ...patch } : item));
    if ('createNew' in patch && !patch.createNew) {
      setItemErrors(prev => { const n = { ...prev }; delete n[idx]; return n; });
    }
  };

  const updateNewProduct = (idx: number, patch: Partial<ReviewItem['newProduct']>) => {
    setReviewItems(prev => prev.map((item, i) =>
      i === idx ? { ...item, newProduct: { ...item.newProduct, ...patch } } : item));
    setItemErrors(prev => {
      if (!prev[idx]) return prev;
      const errs = { ...prev[idx] };
      (Object.keys(patch) as (keyof NewProductErrors)[]).forEach(k => delete errs[k]);
      const n = { ...prev };
      if (Object.keys(errs).length) n[idx] = errs; else delete n[idx];
      return n;
    });
  };

  const handleCreateOrder = async () => {
    if (!supplierId) return;

    // Validate new product fields before any API call
    const errors: Record<number, NewProductErrors> = {};
    reviewItems.forEach((ri, idx) => {
      if (!ri.createNew) return;
      const errs: NewProductErrors = {};
      if (!ri.newProduct.name.trim()) errs.name = 'Required';
      if (!ri.newProduct.category) errs.category = 'Required';
      if (!ri.newProduct.sku.trim()) errs.sku = 'Required';
      if (ri.newProduct.cost_price === '' || ri.newProduct.cost_price === undefined) errs.cost_price = 'Required';
      if (ri.newProduct.selling_price === '' || ri.newProduct.selling_price === undefined) errs.selling_price = 'Required';
      if (ri.newProduct.stock_quantity === '' || ri.newProduct.stock_quantity === undefined) errs.stock_quantity = 'Required';
      if (ri.newProduct.reorder_level === '' || ri.newProduct.reorder_level === undefined) errs.reorder_level = 'Required';
      if (Object.keys(errs).length) errors[idx] = errs;
    });
    if (Object.keys(errors).length) {
      setItemErrors(errors);
      return;
    }

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
          if (ri.newProduct.hsn_code) fd.append('hsn_code', ri.newProduct.hsn_code);
          if (ri.newProduct.barcode) fd.append('barcode', ri.newProduct.barcode);
          const { cost: effectiveCost, selling: effectiveSelling } = getEffectiveProductPrices(ri.newProduct);
          fd.append('cost_price', String(effectiveCost || 0));
          fd.append('selling_price', String(effectiveSelling || 0));
          fd.append('gst_rate', String(ri.newProduct.gst_rate || 0));
          fd.append('stock_quantity', String(ri.newProduct.stock_quantity || 0));
          fd.append('reorder_level', String(ri.newProduct.reorder_level || 0));
          if (ri.newProduct.attributes.length) {
            fd.append('attributes', JSON.stringify(ri.newProduct.attributes));
          }
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
        status: orderStatus,
        payment_status: paymentStatus,
        payment_method: paymentMethod,
        notes: parsedData?.invoice_number ? `Invoice: ${parsedData.invoice_number}` : '',
        items: finalItems,
      });

      // If marked as received, trigger the receive endpoint so backend updates stock
      if (orderStatus === 'received') {
        log('Updating stock…');
        const hasExistingItemsToUpdate = reviewItems.some(ri => !ri.createNew && ri.matchedProductId && ri.updateStock);
        if (hasExistingItemsToUpdate) {
          await purchaseService.receivePurchase(order.id, undefined, true, null);
        }
      }

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
            <p className="hidden sm:block">Upload a supplier invoice or delivery note to auto-fill a purchase order</p>
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
        <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0 overflow-y-auto lg:overflow-hidden py-2">

          {/* Left — upload zone */}
          <div className="flex-1 flex flex-col gap-4 lg:overflow-y-auto">
            {step === 'parsing' ? (
              <div className="min-h-[280px] flex flex-col items-center justify-center gap-5 section-card">
                <div className="w-16 h-16 rounded-full bg-primary-50 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-gray-700 text-lg">Analyzing document with AI…</p>
                  <p className="text-sm text-gray-400 mt-1">Extracting items, quantities, prices and supplier info</p>
                </div>
                <div className="flex flex-wrap justify-center gap-4 sm:gap-6 text-xs text-gray-400 mt-2">
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
                  className={`flex-1 min-h-[200px] sm:min-h-[280px] border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all duration-200
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
                    <div className="flex flex-col items-center gap-4 py-6 px-4 sm:px-8 w-full">
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${file.type === 'application/pdf' ? 'bg-red-100' : 'bg-blue-100'}`}>
                        {file.type === 'application/pdf'
                          ? <FileText className="w-8 h-8 text-red-500" />
                          : <ImageIcon className="w-8 h-8 text-blue-500" />}
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-gray-800 text-base break-all">{file.name}</div>
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
                    <div className="flex flex-col items-center gap-3 py-8 sm:py-10 px-4 sm:px-8">
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${dragOver ? 'bg-primary-100' : 'bg-gray-100'}`}>
                        <UploadCloud className={`w-8 h-8 transition-colors ${dragOver ? 'text-primary-500' : 'text-gray-400'}`} />
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-gray-700 text-base">Drop your invoice here</p>
                        <p className="text-sm text-gray-400 mt-0.5">or <span className="text-primary-600">click to browse files</span></p>
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
          <div className="w-full lg:w-80 shrink-0 flex flex-col gap-4 lg:overflow-y-auto">

            {/* How it works */}
            <div className="section-card !p-5 space-y-4">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">How it works</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
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
                ].map((s, i) => (
                  <div key={i} className="flex gap-3">
                    <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                      {s.icon}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-700">{s.title}</div>
                      <div className="text-xs text-gray-400 mt-0.5 leading-relaxed">{s.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* What gets extracted */}
            <div className="section-card !p-5 space-y-3">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">What gets extracted</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
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
        <div className="flex-1 flex flex-col lg:flex-row gap-6 px-0 min-h-0 overflow-y-auto lg:overflow-hidden">

          {/* Left sidebar */}
          <div className="w-full lg:w-72 shrink-0 flex flex-col py-2 lg:h-full min-h-0">

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pb-2 min-h-0">

              {/* Error / warning banners */}
              {createError && (
                <div className="flex items-start gap-2 px-3 py-2 bg-red-50 rounded-xl border border-red-100 text-red-700 text-xs">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" /><span>{createError}</span>
                </div>
              )}

              {duplicateWarning && (
                <div className="flex items-start gap-2 px-2.5 py-2 bg-orange-50 rounded-xl border border-orange-300 text-orange-800 text-xs">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-orange-500" />
                  <div>
                    <p className="font-semibold">Possible duplicate</p>
                    <p className="mt-0.5">Already imported as <span className="font-mono font-bold">{duplicateWarning.orderNumber}</span> ({duplicateWarning.date}). Proceed only if intentional.</p>
                  </div>
                </div>
              )}

              {Object.keys(itemErrors).length > 0 && (
                <div className="flex items-start gap-2 px-2.5 py-2 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-xs">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>
                    {Object.keys(itemErrors).length === 1
                      ? `Item #${Number(Object.keys(itemErrors)[0]) + 1} has missing required fields.`
                      : `${Object.keys(itemErrors).length} items have missing required fields.`
                    } Fill in highlighted fields.
                  </span>
                </div>
              )}

              {/* Combined Document Info + Order Options card */}
              <div className="section-card !p-3 space-y-2.5">

                {/* ── Document Info ── */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Document Info</span>
                  {fromCache && (
                    <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                      <Zap className="w-3 h-3" /> Cached
                    </span>
                  )}
                </div>

                {/* Supplier */}
                <div>
                  <label className="label text-xs">Supplier *</label>
                  <select
                    className={`input-field text-sm ${!supplierId ? 'border-amber-400 ring-1 ring-amber-300' : ''}`}
                    value={supplierId}
                    onChange={e => setSupplierId(e.target.value ? Number(e.target.value) : '')}
                  >
                    <option value="">Select supplier…</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <div className="flex items-center justify-between mt-0.5 flex-wrap gap-x-2">
                    {supplierName && <p className="text-xs text-gray-400">Detected: <em className="text-gray-600">{supplierName}</em></p>}
                    {!supplierId && <p className="text-xs text-amber-600 font-medium">Required</p>}
                  </div>
                </div>

                {/* Invoice Date + Doc Type row */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="label text-xs">Invoice Date</label>
                    <input type="date" className="input-field text-sm" value={invoiceDate}
                      onChange={e => setInvoiceDate(e.target.value)} />
                  </div>
                  <div>
                    <div className="label text-xs mb-1">Type</div>
                    <span className={`badge text-xs ${parsedData?.document_type === 'invoice' ? 'badge-info' : parsedData?.document_type === 'delivery_note' ? 'badge-success' : 'badge-secondary'} capitalize`}>
                      {parsedData?.document_type?.replace('_', ' ') || 'Unknown'}
                    </span>
                  </div>
                </div>

                {/* Invoice number */}
                {parsedData?.invoice_number && (
                  <div>
                    <div className="label text-xs mb-0.5">Invoice #</div>
                    <p className="text-xs text-gray-700 font-mono break-all bg-gray-50 rounded px-2 py-1">{parsedData.invoice_number}</p>
                  </div>
                )}

                <div className="border-t border-gray-100 pt-2.5 space-y-2.5">
                  {/* ── Order Options ── */}
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Order Options</span>

                  {/* Order Status */}
                  <div>
                    <label className="label text-xs">Order Status</label>
                    <select className="input-field text-sm" value={orderStatus} onChange={e => setOrderStatus(e.target.value as PurchaseStatus)}>
                      <option value="received">Received — goods in hand</option>
                      <option value="ordered">Ordered — awaiting delivery</option>
                      <option value="partially_received">Partially Received</option>
                      <option value="draft">Draft</option>
                    </select>
                    {orderStatus === 'received' && (
                      <p className="text-xs text-emerald-700 mt-0.5">Stock updated for matched items with "Update stock" on.</p>
                    )}
                  </div>

                  {/* Payment Status + Method in a 2-col grid */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="label text-xs">Payment</label>
                      <select className="input-field text-sm" value={paymentStatus} onChange={e => setPaymentStatus(e.target.value as PurchaseOrder['payment_status'])}>
                        <option value="paid">Fully Paid</option>
                        <option value="partial">Partial</option>
                        <option value="pending">Pending</option>
                      </select>
                    </div>
                    <div>
                      <label className="label text-xs">Method</label>
                      <select className="input-field text-sm" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as PurchaseOrder['payment_method'])}>
                        <option value="other">Other</option>
                        <option value="cash">Cash</option>
                        <option value="upi">UPI</option>
                        <option value="card">Card</option>
                        <option value="net_banking">Net Banking</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Totals card */}
              <div className="section-card !p-3 overflow-hidden">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Order Summary</div>
                <div className="flex justify-between text-sm py-1.5 border-b border-gray-100">
                  <span className="text-gray-500">Items</span>
                  <span className="font-medium">{reviewItems.length}</span>
                </div>
                <div className="flex justify-between text-sm py-1.5 border-b border-gray-100">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="font-medium tabular-nums">{formatINR(totals.sub)}</span>
                </div>
                <div className="flex justify-between text-sm py-1.5 border-b border-gray-100">
                  <span className="text-gray-500">Tax</span>
                  <span className="font-medium tabular-nums">{formatINR(totals.tax)}</span>
                </div>
                <div className="flex justify-between py-2 bg-primary-50 -mx-3 px-3 mt-1">
                  <span className="font-bold text-primary-800 text-sm">Grand Total</span>
                  <span className="font-bold text-primary-800 tabular-nums text-sm">{formatINR(grandTotal)}</span>
                </div>
              </div>

            </div>

            {/* Sticky action buttons — always visible */}
            <div className="pt-2.5 space-y-2 border-t border-gray-100 shrink-0 bg-white">
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

          {/* Main content — items */}
          <div className="flex-1 lg:overflow-y-auto py-2 pr-1">
            <div className="space-y-4">

              {/* Header */}
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-700 text-sm sm:text-base">
                  Line Items
                  <span className="hidden sm:inline ml-2 text-xs font-normal text-gray-400">(all fields are editable — correct any AI mistakes)</span>
                </h2>
                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm flex items-center gap-1.5"
                  onClick={() => setReviewItems(prev => [...prev, {
                    invoiceName: '', quantity: 1, unit: '', unit_price: 0, tax_rate: 0,
                    matchedProductId: null, matchedProductName: '', matches: [],
                    createNew: false, updateStock: true,
                    newProduct: {
                      name: '', category: '', brand: '', unit: 'piece', sku: '',
                      hsn_code: '', cost_price: '', selling_price: '', gst_rate: '', taxIncluded: false,
                      stock_quantity: '', reorder_level: '', barcode: '', attributes: [],
                    },
                  }])}
                >
                  <Plus className="w-4 h-4" /> Add Row
                </button>
              </div>

              {/* Items — card layout, responsive */}
              <div className="space-y-3">
                {reviewItems.map((ri, idx) => {
                  const lineTotal = ri.quantity * ri.unit_price * (1 + ri.tax_rate / 100);
                  return (
                    <div key={idx} className={`section-card !p-0 overflow-hidden ${
                      itemErrors[idx] ? 'ring-2 ring-red-300' : ri.createNew ? 'ring-2 ring-primary-200' : ''
                    }`}>

                      {/* Card header: row number + error badge + delete */}
                      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-gray-50/60">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-gray-400">Item #{idx + 1}</span>
                          {itemErrors[idx] && (
                            <span className="flex items-center gap-1 text-xs font-medium text-red-600">
                              <AlertCircle className="w-3 h-3" /> Fix required fields
                            </span>
                          )}
                        </div>
                        {reviewItems.length > 1 && (
                          <button type="button"
                            className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                            onClick={() => setReviewItems(prev => prev.filter((_, i) => i !== idx))}>
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="p-3 space-y-3">
                        {/* Invoice name + Product match */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <div className="text-xs text-gray-400 mb-1 font-medium uppercase tracking-wide">Invoice Item</div>
                            <input
                              type="text"
                              className="input-field text-sm w-full"
                              value={ri.invoiceName}
                              placeholder="Item name from invoice"
                              onChange={e => updateItem(idx, { invoiceName: e.target.value })}
                            />
                          </div>

                          <div>
                            <div className="text-xs text-gray-400 mb-1 font-medium uppercase tracking-wide">Match to Product</div>
                            {!ri.createNew ? (
                              <div className="space-y-1.5">
                                {/* AI matches dropdown */}
                                {ri.matches.length > 0 && (
                                  <select
                                    className="input-field text-sm w-full"
                                    value={ri.matchedProductId ?? ''}
                                    onChange={e => {
                                      const id = e.target.value ? Number(e.target.value) : null;
                                      const match = ri.matches.find(m => m.id === id);
                                      updateItem(idx, { matchedProductId: id, matchedProductName: match?.name || '', unit_price: match?.cost_price || ri.unit_price });
                                    }}
                                  >
                                    <option value="">— no match —</option>
                                    {ri.matches.map(m => (
                                      <option key={m.id} value={m.id}>{m.name}{m.sku ? ` (${m.sku})` : ''}</option>
                                    ))}
                                  </select>
                                )}
                                {/* Inline product search */}
                                {linkingItemIdx === idx ? (
                                  <div className="space-y-1">
                                    <div className="relative">
                                      
                                      <input
                                        autoFocus
                                        type="text"
                                        className="input-field text-sm pr-6"
                                        placeholder="Search all products…"
                                        value={linkSearchQuery}
                                        onChange={e => { setLinkSearchQuery(e.target.value); searchProducts(e.target.value); }}
                                      />
                                      <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        onClick={() => { setLinkingItemIdx(null); setLinkSearchQuery(''); setLinkSearchResults([]); }}>
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                    {linkSearchLoading && <p className="text-xs text-gray-400 px-1">Searching…</p>}
                                    {!linkSearchLoading && linkSearchQuery && linkSearchResults.length === 0 && (
                                      <p className="text-xs text-gray-400 px-1">No products found</p>
                                    )}
                                    {linkSearchResults.length > 0 && (
                                      <div className="border border-gray-200 rounded-lg max-h-36 overflow-y-auto divide-y divide-gray-100 bg-white shadow-sm">
                                        {linkSearchResults.map(p => (
                                          <button key={p.id} type="button"
                                            className="w-full text-left px-2.5 py-1.5 hover:bg-primary-50 transition-colors"
                                            onClick={() => {
                                              updateItem(idx, {
                                                createNew: false,
                                                matchedProductId: p.id,
                                                matchedProductName: p.name,
                                                matches: [...ri.matches.filter(m => m.id !== p.id), p],
                                                unit_price: p.cost_price || ri.unit_price,
                                              });
                                              setLinkingItemIdx(null); setLinkSearchQuery(''); setLinkSearchResults([]);
                                            }}>
                                            <div className="text-xs font-medium text-gray-800">{p.name}</div>
                                            {p.sku && <div className="text-xs text-gray-400 font-mono">{p.sku}</div>}
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-between">
                                    {ri.matchedProductId
                                      ? <span className="flex items-center gap-1 text-xs text-emerald-600"><CheckCircle2 className="w-3 h-3" /> Matched</span>
                                      : <span className="flex items-center gap-1 text-xs text-amber-600"><AlertCircle className="w-3 h-3" /> No match</span>
                                    }
                                    <div className="flex items-center gap-2">
                                      <button type="button"
                                        className="flex items-center gap-1 text-xs text-primary-600 hover:underline"
                                        onClick={() => { setLinkingItemIdx(idx); setLinkSearchQuery(''); setLinkSearchResults([]); }}>
                                        <Search className="w-3 h-3" /> Search
                                      </button>
                                      <button type="button" className="text-xs text-gray-500 hover:underline"
                                        onClick={() => updateItem(idx, { createNew: true })}>
                                        + New
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-1 text-xs font-semibold text-primary-700 bg-primary-50 rounded-lg px-2 py-1">
                                  <Plus className="w-3 h-3" /> Creating new product
                                </div>
                                {/* Link to existing search */}
                                {linkingItemIdx === idx ? (
                                  <div className="space-y-1">
                                    <div className="relative">
                                      
                                      <input
                                        autoFocus
                                        type="text"
                                        className="input-field text-sm pr-6"
                                        placeholder="Search existing products…"
                                        value={linkSearchQuery}
                                        onChange={e => { setLinkSearchQuery(e.target.value); searchProducts(e.target.value); }}
                                      />
                                      <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        onClick={() => { setLinkingItemIdx(null); setLinkSearchQuery(''); setLinkSearchResults([]); }}>
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                    {linkSearchLoading && <p className="text-xs text-gray-400 px-1">Searching…</p>}
                                    {!linkSearchLoading && linkSearchQuery && linkSearchResults.length === 0 && (
                                      <p className="text-xs text-gray-400 px-1">No products found</p>
                                    )}
                                    {linkSearchResults.length > 0 && (
                                      <div className="border border-gray-200 rounded-lg max-h-36 overflow-y-auto divide-y divide-gray-100 bg-white shadow-sm">
                                        {linkSearchResults.map(p => (
                                          <button key={p.id} type="button"
                                            className="w-full text-left px-2.5 py-1.5 hover:bg-primary-50 transition-colors"
                                            onClick={() => {
                                              updateItem(idx, {
                                                createNew: false,
                                                matchedProductId: p.id,
                                                matchedProductName: p.name,
                                                matches: [p],
                                                unit_price: p.cost_price || ri.unit_price,
                                              });
                                              setLinkingItemIdx(null); setLinkSearchQuery(''); setLinkSearchResults([]);
                                            }}>
                                            <div className="text-xs font-medium text-gray-800">{p.name}</div>
                                            {p.sku && <div className="text-xs text-gray-400 font-mono">{p.sku}</div>}
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <button type="button"
                                      className="flex items-center gap-1 text-xs text-primary-600 hover:underline"
                                      onClick={() => { setLinkingItemIdx(idx); setLinkSearchQuery(''); setLinkSearchResults([]); }}>
                                      <Link2 className="w-3 h-3" /> Link to existing
                                    </button>
                                    {ri.matches.length > 0 && (
                                      <button type="button" className="text-xs text-gray-500 hover:underline"
                                        onClick={() => updateItem(idx, { createNew: false, matchedProductId: ri.matches[0].id, matchedProductName: ri.matches[0].name })}>
                                        Use AI match
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Qty + Unit Price + Tax + Total */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div>
                            <div className="text-xs text-gray-400 mb-1 font-medium uppercase tracking-wide">Qty</div>
                            <input type="number" className="input-field text-sm w-full"
                              value={ri.quantity || ''}
                              min="0.01" step="0.01"
                              onFocus={e => e.target.select()}
                              onChange={e => updateItem(idx, { quantity: parseFloat(e.target.value) || 0 })}
                              onBlur={e => { if (!e.target.value || parseFloat(e.target.value) <= 0) updateItem(idx, { quantity: 1 }); }} />
                          </div>
                          <div>
                            <div className="text-xs text-gray-400 mb-1 font-medium uppercase tracking-wide">Unit Price</div>
                            <input type="number" className="input-field text-sm w-full"
                              value={ri.unit_price || ''}
                              min="0" step="0.01"
                              onFocus={e => e.target.select()}
                              onChange={e => updateItem(idx, { unit_price: parseFloat(e.target.value) || 0 })} />
                          </div>
                          <div>
                            <div className="text-xs text-gray-400 mb-1 font-medium uppercase tracking-wide">Tax %</div>
                            <input type="number" className="input-field text-sm w-full"
                              value={ri.tax_rate === 0 ? '0' : ri.tax_rate || ''}
                              min="0" step="0.01"
                              onFocus={e => e.target.select()}
                              onChange={e => updateItem(idx, { tax_rate: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })} />
                          </div>
                          <div>
                            <div className="text-xs text-gray-400 mb-1 font-medium uppercase tracking-wide">Total</div>
                            <div className="font-semibold text-gray-800 text-sm tabular-nums pt-2">{formatINR(lineTotal)}</div>
                          </div>
                        </div>
                      </div>

                      {/* New product sub-form */}
                      {ri.createNew && (() => {
                        const errs = itemErrors[idx];
                        return (
                          <div className="px-4 py-4 bg-primary-50/60 border-t border-primary-100">
                            <div className="text-xs font-semibold text-primary-700 uppercase tracking-wide mb-3">New Product Details</div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">

                              {/* Row 1: Product Name | Category | Brand */}
                              <div>
                                <label className="label text-xs">Product Name *</label>
                                <input
                                  type="text"
                                  className={`input-field text-sm ${errs?.name ? 'border-red-400 ring-1 ring-red-300' : ''}`}
                                  value={ri.newProduct.name}
                                  onChange={e => updateNewProduct(idx, { name: e.target.value })}
                                />
                                {errs?.name && <p className="text-xs text-red-600 mt-0.5">{errs.name}</p>}
                              </div>

                              <div className="relative">
                                <label className="label text-xs">Category *</label>
                                <div className="relative">
                                  
                                  <input
                                    type="text"
                                    className={`input-field text-sm ${errs?.category ? 'border-red-400 ring-1 ring-red-300' : ''}`}
                                    placeholder={categories.find(c => c.id === ri.newProduct.category)?.name || 'Search category…'}
                                    value={catSearch[idx] ?? ''}
                                    onFocus={() => { setCatSearch(p => ({ ...p, [idx]: catSearch[idx] ?? '' })); setCatOpen(p => ({ ...p, [idx]: true })); }}
                                    onBlur={() => setTimeout(() => setCatOpen(p => ({ ...p, [idx]: false })), 150)}
                                    onChange={e => { setCatSearch(p => ({ ...p, [idx]: e.target.value })); setCatOpen(p => ({ ...p, [idx]: true })); }}
                                  />
                                  {ri.newProduct.category && !catOpen[idx] && (
                                    <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-red-400"
                                      onMouseDown={e => { e.preventDefault(); updateNewProduct(idx, { category: '' }); setCatSearch(p => { const n = { ...p }; delete n[idx]; return n; }); }}>
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                                {catOpen[idx] && (
                                  <div className="absolute z-20 top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg max-h-44 overflow-y-auto mt-0.5">
                                    {categories
                                      .filter(c => !(catSearch[idx] || '').trim() || c.name.toLowerCase().includes((catSearch[idx] || '').toLowerCase()))
                                      .map(c => (
                                        <button key={c.id} type="button"
                                          className={`w-full text-left px-3 py-2 text-sm hover:bg-primary-50 transition-colors ${ri.newProduct.category === c.id ? 'bg-primary-50 font-medium text-primary-700' : 'text-gray-700'}`}
                                          onMouseDown={e => {
                                            e.preventDefault();
                                            updateNewProduct(idx, { category: c.id });
                                            setCatSearch(p => { const n = { ...p }; delete n[idx]; return n; });
                                            setCatOpen(p => ({ ...p, [idx]: false }));
                                          }}>
                                          {c.name}
                                        </button>
                                      ))}
                                    {categories.filter(c => !(catSearch[idx] || '').trim() || c.name.toLowerCase().includes((catSearch[idx] || '').toLowerCase())).length === 0 && (
                                      <div className="px-3 py-2 text-xs text-gray-400">No categories found</div>
                                    )}
                                  </div>
                                )}
                                {errs?.category && <p className="text-xs text-red-600 mt-0.5">{errs.category}</p>}
                              </div>

                              <div className="relative">
                                <label className="label text-xs">Brand</label>
                                <div className="relative">
                                  
                                  <input
                                    type="text"
                                    className="input-field text-sm"
                                    placeholder={brands.find(b => b.id === ri.newProduct.brand)?.name || 'Search brand…'}
                                    value={brandSearch[idx] ?? ''}
                                    onFocus={() => { setBrandSearch(p => ({ ...p, [idx]: brandSearch[idx] ?? '' })); setBrandOpen(p => ({ ...p, [idx]: true })); }}
                                    onBlur={() => setTimeout(() => setBrandOpen(p => ({ ...p, [idx]: false })), 150)}
                                    onChange={e => { setBrandSearch(p => ({ ...p, [idx]: e.target.value })); setBrandOpen(p => ({ ...p, [idx]: true })); }}
                                  />
                                  {ri.newProduct.brand && !brandOpen[idx] && (
                                    <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-red-400"
                                      onMouseDown={e => { e.preventDefault(); updateNewProduct(idx, { brand: '' }); setBrandSearch(p => { const n = { ...p }; delete n[idx]; return n; }); }}>
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                                {brandOpen[idx] && (
                                  <div className="absolute z-20 top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg max-h-44 overflow-y-auto mt-0.5">
                                    {brands
                                      .filter(b => !(brandSearch[idx] || '').trim() || b.name.toLowerCase().includes((brandSearch[idx] || '').toLowerCase()))
                                      .map(b => (
                                        <button key={b.id} type="button"
                                          className={`w-full text-left px-3 py-2 text-sm hover:bg-primary-50 transition-colors ${ri.newProduct.brand === b.id ? 'bg-primary-50 font-medium text-primary-700' : 'text-gray-700'}`}
                                          onMouseDown={e => {
                                            e.preventDefault();
                                            updateNewProduct(idx, { brand: b.id });
                                            setBrandSearch(p => { const n = { ...p }; delete n[idx]; return n; });
                                            setBrandOpen(p => ({ ...p, [idx]: false }));
                                          }}>
                                          {b.name}
                                        </button>
                                      ))}
                                    {brands.filter(b => !(brandSearch[idx] || '').trim() || b.name.toLowerCase().includes((brandSearch[idx] || '').toLowerCase())).length === 0 && (
                                      <div className="px-3 py-2 text-xs text-gray-400">No brands found</div>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Row 2: SKU | HSN | Unit */}
                              <div>
                                <label className="label text-xs">SKU *</label>
                                <input
                                  type="text"
                                  className={`input-field text-sm ${errs?.sku ? 'border-red-400 ring-1 ring-red-300' : ''}`}
                                  value={ri.newProduct.sku}
                                  placeholder="e.g. ABC-1001"
                                  onChange={e => updateNewProduct(idx, { sku: e.target.value })}
                                />
                                {errs?.sku && <p className="text-xs text-red-600 mt-0.5">{errs.sku}</p>}
                              </div>

                              <div>
                                <label className="label text-xs">HSN</label>
                                <input
                                  type="text"
                                  className="input-field text-sm"
                                  value={ri.newProduct.hsn_code}
                                  placeholder="e.g. 6910"
                                  onChange={e => updateNewProduct(idx, { hsn_code: e.target.value })}
                                />
                              </div>

                              <div>
                                <label className="label text-xs">Unit</label>
                                <select className="input-field text-sm" value={ri.newProduct.unit}
                                  onChange={e => updateNewProduct(idx, { unit: e.target.value })}>
                                  {VALID_UNITS.map(u => (
                                    <option key={u} value={u}>{u.charAt(0).toUpperCase() + u.slice(1)}</option>
                                  ))}
                                </select>
                              </div>

                              {/* Row 3: Cost ₹ | Price ₹ | GST % */}
                              {(() => {
                                const { cost: effectiveCost, selling: effectiveSelling } = getEffectiveProductPrices(ri.newProduct);
                                const showPreview = !ri.newProduct.taxIncluded && Number(ri.newProduct.gst_rate) > 0;
                                return (
                                  <>
                                    <div>
                                      <label className="label text-xs">Cost ₹ *</label>
                                      <input
                                        type="number"
                                        className={`input-field text-sm ${errs?.cost_price ? 'border-red-400 ring-1 ring-red-300' : ''}`}
                                        value={ri.newProduct.cost_price}
                                        min="0" step="0.01"
                                        onChange={e => updateNewProduct(idx, { cost_price: e.target.value !== '' ? parseFloat(e.target.value) : '' })}
                                      />
                                      {errs?.cost_price && <p className="text-xs text-red-600 mt-0.5">{errs.cost_price}</p>}
                                      {showPreview && (
                                        <p className="text-xs text-primary-600 mt-0.5">→ {formatINR(effectiveCost)} incl. GST (stored)</p>
                                      )}
                                    </div>

                                    <div>
                                      <label className="label text-xs">Price ₹ *</label>
                                      <input
                                        type="number"
                                        className={`input-field text-sm ${errs?.selling_price ? 'border-red-400 ring-1 ring-red-300' : ''}`}
                                        value={ri.newProduct.selling_price}
                                        min="0" step="0.01"
                                        onChange={e => updateNewProduct(idx, { selling_price: e.target.value !== '' ? parseFloat(e.target.value) : '' })}
                                      />
                                      {errs?.selling_price && <p className="text-xs text-red-600 mt-0.5">{errs.selling_price}</p>}
                                      {showPreview && (
                                        <p className="text-xs text-primary-600 mt-0.5">→ {formatINR(effectiveSelling)} incl. GST (stored)</p>
                                      )}
                                    </div>

                                    <div>
                                      <label className="label text-xs">GST %</label>
                                      <input
                                        type="number"
                                        className="input-field text-sm"
                                        value={ri.newProduct.gst_rate}
                                        min="0" step="0.01"
                                        onChange={e => updateNewProduct(idx, { gst_rate: e.target.value !== '' ? parseFloat(e.target.value) : '' })}
                                      />
                                      <label className="flex items-center gap-1.5 mt-1.5 cursor-pointer select-none w-fit">
                                        <input
                                          type="checkbox"
                                          className="w-3.5 h-3.5 rounded accent-primary-600"
                                          checked={ri.newProduct.taxIncluded}
                                          onChange={e => updateNewProduct(idx, { taxIncluded: e.target.checked })}
                                        />
                                        <span className="text-xs font-medium text-gray-500">Cost/Price above already includes GST</span>
                                      </label>
                                    </div>
                                  </>
                                );
                              })()}

                              {/* Row 4: Stock | Reorder | Barcode */}
                              <div>
                                <label className="label text-xs">Stock *</label>
                                <input
                                  type="number"
                                  className={`input-field text-sm ${errs?.stock_quantity ? 'border-red-400 ring-1 ring-red-300' : ''}`}
                                  value={ri.newProduct.stock_quantity}
                                  min="0" step="1"
                                  onChange={e => updateNewProduct(idx, { stock_quantity: e.target.value !== '' ? parseFloat(e.target.value) : '' })}
                                />
                                {errs?.stock_quantity && <p className="text-xs text-red-600 mt-0.5">{errs.stock_quantity}</p>}
                              </div>

                              <div>
                                <label className="label text-xs">Reorder *</label>
                                <input
                                  type="number"
                                  className={`input-field text-sm ${errs?.reorder_level ? 'border-red-400 ring-1 ring-red-300' : ''}`}
                                  value={ri.newProduct.reorder_level}
                                  min="0" step="1"
                                  onChange={e => updateNewProduct(idx, { reorder_level: e.target.value !== '' ? parseFloat(e.target.value) : '' })}
                                />
                                {errs?.reorder_level && <p className="text-xs text-red-600 mt-0.5">{errs.reorder_level}</p>}
                              </div>

                              <div>
                                <label className="label text-xs">Barcode</label>
                                <input
                                  type="text"
                                  className="input-field text-sm"
                                  value={ri.newProduct.barcode}
                                  placeholder="Scan or enter barcode"
                                  onChange={e => updateNewProduct(idx, { barcode: e.target.value })}
                                />
                              </div>

                            </div>

                            {/* Attributes */}
                            <div className="mt-3">
                              <div className="flex items-center justify-between mb-2">
                                <label className="label text-xs mb-0">Attributes</label>
                                <button
                                  type="button"
                                  className="text-xs text-primary-600 hover:underline flex items-center gap-1"
                                  onClick={() => updateNewProduct(idx, { attributes: [...ri.newProduct.attributes, { name: '', value: '' }] })}
                                >
                                  <Plus className="w-3 h-3" /> Add
                                </button>
                              </div>
                              {ri.newProduct.attributes.length === 0 && (
                                <p className="text-xs text-gray-400 italic">No attributes — click Add to specify size, colour, etc.</p>
                              )}
                              <div className="space-y-2">
                                {ri.newProduct.attributes.map((attr, ai) => (
                                  <div key={ai} className="flex gap-2 items-center">
                                    <input
                                      type="text"
                                      className="input-field text-sm flex-1"
                                      placeholder="Name (e.g. Size)"
                                      value={attr.name}
                                      onChange={e => {
                                        const updated = ri.newProduct.attributes.map((a, i) => i === ai ? { ...a, name: e.target.value } : a);
                                        updateNewProduct(idx, { attributes: updated });
                                      }}
                                    />
                                    <input
                                      type="text"
                                      className="input-field text-sm flex-1"
                                      placeholder="Value (e.g. 6x6)"
                                      value={attr.value}
                                      onChange={e => {
                                        const updated = ri.newProduct.attributes.map((a, i) => i === ai ? { ...a, value: e.target.value } : a);
                                        updateNewProduct(idx, { attributes: updated });
                                      }}
                                    />
                                    <button
                                      type="button"
                                      className="p-1.5 rounded text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors shrink-0"
                                      onClick={() => updateNewProduct(idx, { attributes: ri.newProduct.attributes.filter((_, i) => i !== ai) })}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Existing product details (read-only) */}
                      {!ri.createNew && ri.matchedProductId && (() => {
                        const match = ri.matches.find(m => m.id === ri.matchedProductId);
                        if (!match) return null;
                        return (
                          <div className="px-4 py-3 bg-emerald-50/60 border-t border-emerald-100">
                            <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-2">Matched Product Details</div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5 text-xs">
                              <div>
                                <span className="text-gray-400">Name</span>
                                <p className="font-medium text-gray-700 truncate">{match.name}</p>
                              </div>
                              <div>
                                <span className="text-gray-400">SKU</span>
                                <p className="font-medium text-gray-700 font-mono">{match.sku || '—'}</p>
                              </div>
                              <div>
                                <span className="text-gray-400">Cost Price</span>
                                <p className="font-medium text-gray-700">{match.cost_price != null ? formatINR(match.cost_price) : '—'}</p>
                              </div>
                            </div>
                            <label className="flex items-center gap-2 mt-2.5 cursor-pointer select-none w-fit">
                              <input
                                type="checkbox"
                                className="w-3.5 h-3.5 rounded accent-emerald-600"
                                checked={ri.updateStock}
                                onChange={e => updateItem(idx, { updateStock: e.target.checked })}
                              />
                              <span className={`text-xs font-medium ${ri.updateStock ? 'text-emerald-700' : 'text-gray-400'}`}>
                                Update stock when order is received
                              </span>
                            </label>
                          </div>
                        );
                      })()}
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
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="flex flex-col items-center gap-5 text-center max-w-sm w-full">
            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-emerald-500" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-800">Purchase Order Created!</p>
              <p className="text-gray-500 mt-2">
                Order <span className="font-semibold text-primary-700">{createdOrderNumber}</span> has been successfully created from the imported document.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
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
