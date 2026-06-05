import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '@hooks/useRedux';
import { addNotification } from '@store/slices/uiSlice';
import { productService } from '@api/services/product.service';
import { categoryService } from '@api/services/category.service';
import { brandService } from '@api/services/brand.service';
import { Category as ServiceCategory } from '@api/services/category.service';
import { Brand } from '../../types/product.types';
import { ArrowLeft, Package, Plus, Trash2, List, X, CheckCircle, AlertTriangle, ChevronDown } from 'lucide-react';
import DeleteConfirmModal from '@components/common/DeleteConfirmModal/DeleteConfirmModal';

const DRAFT_KEY = 'shopflow_bulk_add_draft';

const UNITS = ['piece','kg','gram','liter','ml','meter','feet','roll','dozen','pack','box'];
const GST_RATES = ['0','5','12','18','28'];

interface BulkRow {
  id: string;
  name: string;
  category_name: string;
  category_id: number | null;
  brand_name: string;
  brand_id: number | null;
  sku: string;
  skuManuallyEdited: boolean;
  hsn_code: string;
  unit: string;
  cost_price: string;
  selling_price: string;
  gst_rate: string;
  stock_quantity: string;
  reorder_level: string;
  barcode: string;
  attributes: string;
}

interface ImportResult {
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{ row: number; error: string }>;
}

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

function makeSuffix() {
  return String(1000 + (Date.now() % 9000));
}

function makeEmptyRow(): BulkRow {
  return {
    id: makeId(),
    name: '', category_name: '', category_id: null,
    brand_name: '', brand_id: null,
    sku: '', skuManuallyEdited: false,
    hsn_code: '', unit: 'piece',
    cost_price: '', selling_price: '', gst_rate: '18',
    stock_quantity: '', reorder_level: '', barcode: '', attributes: '',
  };
}

function csvEscape(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

function buildCSV(rows: BulkRow[]): string {
  const headers = ['name','sku','category','brand','hsn_code','unit','cost_price','selling_price','gst_rate','stock_quantity','reorder_level','barcode','attributes'];
  const lines = rows.map(r => [
    r.name, r.sku, r.category_name, r.brand_name,
    r.hsn_code, r.unit,
    r.cost_price || '0', r.selling_price || '0', r.gst_rate || '0',
    r.stock_quantity || '0', r.reorder_level || '0', r.barcode, r.attributes,
  ].map(csvEscape).join(','));
  return [headers.join(','), ...lines].join('\n');
}

// ── Per-row autocomplete cell ──────────────────────────────────────────────

interface AutocellProps {
  value: string;
  placeholder: string;
  options: Array<{ id: number; name: string }>;
  onInputChange: (val: string) => void;
  onSelect: (id: number, name: string) => void;
  onClear: () => void;
  selectedId: number | null;
  hasError?: boolean;
}

const Autocell: React.FC<AutocellProps> = ({ value, placeholder, options, onInputChange, onSelect, onClear, selectedId, hasError }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref} style={{ minWidth: 140 }}>
      <div className="flex items-center">
        <input
          type="text"
          value={value}
          placeholder={placeholder}
          className={`w-full text-xs px-2 py-1.5 border rounded focus:outline-none focus:ring-1 focus:ring-primary-500 ${hasError ? 'border-red-400 bg-red-50' : 'border-gray-200'}`}
          onChange={e => { onInputChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
        />
        {value ? (
          <button type="button" onClick={() => { onClear(); setOpen(false); }} className="absolute right-1.5 text-gray-400 hover:text-gray-600">
            <X className="w-3 h-3" />
          </button>
        ) : (
          <ChevronDown className="absolute right-1.5 w-3 h-3 text-gray-400 pointer-events-none" />
        )}
      </div>
      {open && options.length > 0 && (
        <div className="absolute top-full left-0 mt-0.5 w-full min-w-[180px] bg-white border border-gray-200 rounded shadow-lg z-50 max-h-40 overflow-y-auto">
          {options.map(opt => (
            <div
              key={opt.id}
              className={`px-3 py-1.5 text-xs cursor-pointer hover:bg-gray-50 ${selectedId === opt.id ? 'bg-green-50 text-green-700 font-medium' : 'text-gray-700'}`}
              onMouseDown={() => { onSelect(opt.id, opt.name); setOpen(false); }}
            >
              {opt.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Per-row component ──────────────────────────────────────────────────────

interface BulkRowProps {
  row: BulkRow;
  index: number;
  errors: Set<string>;
  onUpdate: (id: string, patch: Partial<BulkRow>) => void;
  onDelete: (id: string) => void;
}

const BulkProductRow: React.FC<BulkRowProps> = ({ row, index, errors, onUpdate, onDelete }) => {
  const [catOptions, setCatOptions] = useState<ServiceCategory[]>([]);
  const [brandOptions, setBrandOptions] = useState<Brand[]>([]);
  const skuSuffix = useRef(makeSuffix());

  // Category search
  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        const r = await categoryService.getAll({ search: row.category_name });
        setCatOptions(r);
      } catch {}
    }, 300);
    return () => clearTimeout(t);
  }, [row.category_name]);

  // Brand search
  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        const r = await brandService.getAll({ search: row.brand_name });
        setBrandOptions(r);
      } catch {}
    }, 300);
    return () => clearTimeout(t);
  }, [row.brand_name]);

  // SKU auto-gen
  useEffect(() => {
    if (!row.skuManuallyEdited && row.name) {
      const prefix = row.name.replace(/[^A-Z0-9]/gi, '').slice(0, 3).toUpperCase() || 'SKU';
      onUpdate(row.id, { sku: `${prefix}-${skuSuffix.current}` });
    }
  }, [row.name]); // eslint-disable-line

  const field = (key: keyof BulkRow) => errors.has(key) ? 'border-red-400 bg-red-50' : 'border-gray-200';

  const cell = 'px-1.5 py-1 align-top';
  const inp = (key: keyof BulkRow, type = 'text', extra?: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input
      type={type}
      value={row[key] as string}
      className={`w-full text-xs px-2 py-1.5 border rounded focus:outline-none focus:ring-1 focus:ring-primary-500 ${field(key)}`}
      onChange={e => onUpdate(row.id, { [key]: e.target.value })}
      {...extra}
    />
  );

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50/50">
      <td className={`${cell} w-8 text-center text-xs text-gray-400 font-mono`}>{index + 1}</td>

      {/* Name */}
      <td className={cell} style={{ minWidth: 200 }}>
        <input
          type="text"
          value={row.name}
          className={`w-full text-xs px-2 py-1.5 border rounded focus:outline-none focus:ring-1 focus:ring-primary-500 ${field('name')}`}
          onChange={e => onUpdate(row.id, { name: e.target.value })}
          placeholder="Product name"
        />
      </td>

      {/* Category */}
      <td className={cell}>
        <Autocell
          value={row.category_name}
          placeholder="Search…"
          options={catOptions}
          selectedId={row.category_id}
          onInputChange={val => onUpdate(row.id, { category_name: val, category_id: null })}
          onSelect={(id, name) => onUpdate(row.id, { category_id: id, category_name: name })}
          onClear={() => onUpdate(row.id, { category_name: '', category_id: null })}
          hasError={errors.has('category_name')}
        />
      </td>

      {/* Brand */}
      <td className={cell}>
        <Autocell
          value={row.brand_name}
          placeholder="Search…"
          options={brandOptions}
          selectedId={row.brand_id}
          onInputChange={val => onUpdate(row.id, { brand_name: val, brand_id: null })}
          onSelect={(id, name) => onUpdate(row.id, { brand_id: id, brand_name: name })}
          onClear={() => onUpdate(row.id, { brand_name: '', brand_id: null })}
        />
      </td>

      {/* SKU */}
      <td className={cell} style={{ minWidth: 120 }}>
        <input
          type="text"
          value={row.sku}
          className={`w-full text-xs px-2 py-1.5 border rounded focus:outline-none focus:ring-1 focus:ring-primary-500 font-mono ${field('sku')}`}
          onChange={e => onUpdate(row.id, { sku: e.target.value, skuManuallyEdited: true })}
          placeholder="SKU"
        />
      </td>

      {/* HSN */}
      <td className={cell} style={{ minWidth: 90 }}>
        {inp('hsn_code', 'text', { placeholder: 'HSN', maxLength: 8 })}
      </td>

      {/* Unit */}
      <td className={cell} style={{ minWidth: 100 }}>
        <select
          value={row.unit}
          className={`w-full text-xs px-2 py-1.5 border rounded focus:outline-none focus:ring-1 focus:ring-primary-500 ${field('unit')}`}
          onChange={e => onUpdate(row.id, { unit: e.target.value })}
        >
          {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
      </td>

      {/* Cost Price */}
      <td className={cell} style={{ minWidth: 90 }}>
        {inp('cost_price', 'number', { placeholder: '0.00', min: '0', step: '0.01' })}
      </td>

      {/* Selling Price */}
      <td className={cell} style={{ minWidth: 90 }}>
        {inp('selling_price', 'number', { placeholder: '0.00', min: '0', step: '0.01' })}
      </td>

      {/* GST */}
      <td className={cell} style={{ minWidth: 70 }}>
        <select
          value={row.gst_rate}
          className="w-full text-xs px-2 py-1.5 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
          onChange={e => onUpdate(row.id, { gst_rate: e.target.value })}
        >
          {GST_RATES.map(g => <option key={g} value={g}>{g}%</option>)}
        </select>
      </td>

      {/* Stock */}
      <td className={cell} style={{ minWidth: 80 }}>
        {inp('stock_quantity', 'number', { placeholder: '0', min: '0' })}
      </td>

      {/* Reorder */}
      <td className={cell} style={{ minWidth: 80 }}>
        {inp('reorder_level', 'number', { placeholder: '0', min: '0' })}
      </td>

      {/* Barcode */}
      <td className={cell} style={{ minWidth: 110 }}>
        {inp('barcode', 'text', { placeholder: 'Barcode' })}
      </td>

      {/* Attributes */}
      <td className={cell} style={{ minWidth: 180 }}>
        <input
          type="text"
          value={row.attributes}
          className="w-full text-xs px-2 py-1.5 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
          placeholder="Size:25;Color:Red"
          title="Format: Name:Value;Name2:Value2"
          onChange={e => onUpdate(row.id, { attributes: e.target.value })}
        />
      </td>

      {/* Delete */}
      <td className={`${cell} w-8 text-center`}>
        <button type="button" onClick={() => onDelete(row.id)} className="text-gray-300 hover:text-red-400 transition-colors p-1">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </td>
    </tr>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────

const BulkAddProducts: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const [rows, setRows] = useState<BulkRow[]>([makeEmptyRow()]);
  const [draftTimestamp, setDraftTimestamp] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<Map<string, Set<string>>>(new Map());
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Load draft on mount — ref guard prevents double-fire in React StrictMode
  const draftLoaded = useRef(false);
  useEffect(() => {
    if (draftLoaded.current) return;
    draftLoaded.current = true;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const { rows: saved, timestamp } = JSON.parse(raw);
        if (Array.isArray(saved) && saved.length > 0) {
          setRows(saved);
          setDraftTimestamp(timestamp);
          dispatch(addNotification({ message: `Draft restored from ${new Date(timestamp).toLocaleDateString()}`, type: 'info' }));
        }
      }
    } catch {}
  }, []); // eslint-disable-line

  // Auto-save draft, debounced — only when at least one row has content
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const hasContent = rows.some(r => r.name.trim());
      if (hasContent) {
        const timestamp = new Date().toISOString();
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ rows, timestamp }));
        setDraftTimestamp(timestamp);
      } else {
        localStorage.removeItem(DRAFT_KEY);
        setDraftTimestamp(null);
      }
    }, 800);
    return () => clearTimeout(saveTimer.current);
  }, [rows]);

  const addRow = () => setRows(prev => [...prev, makeEmptyRow()]);

  const updateRow = useCallback((id: string, patch: Partial<BulkRow>) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));
    // Clear errors for updated fields
    setRowErrors(prev => {
      const next = new Map(prev);
      const errs = next.get(id);
      if (errs) {
        Object.keys(patch).forEach(k => errs.delete(k));
        next.set(id, errs);
      }
      return next;
    });
  }, []);

  const deleteRow = useCallback((id: string) => {
    setRows(prev => {
      const next = prev.filter(r => r.id !== id);
      return next.length === 0 ? [makeEmptyRow()] : next;
    });
  }, []);

  const clearAll = () => {
    localStorage.removeItem(DRAFT_KEY);
    setDraftTimestamp(null);
    setRowErrors(new Map());
    setResult(null);
    setRows([makeEmptyRow()]);
    setShowClearConfirm(false);
  };

  const validate = (): boolean => {
    const errorMap = new Map<string, Set<string>>();
    let valid = true;
    rows.forEach(row => {
      const errs = new Set<string>();
      if (!row.name.trim()) errs.add('name');
      if (!row.category_name.trim()) errs.add('category_name');
      if (!row.sku.trim()) errs.add('sku');
      if (!row.cost_price) errs.add('cost_price');
      if (!row.selling_price) errs.add('selling_price');
      if (!row.stock_quantity) errs.add('stock_quantity');
      if (!row.reorder_level) errs.add('reorder_level');
      if (errs.size > 0) { errorMap.set(row.id, errs); valid = false; }
    });
    setRowErrors(errorMap);
    return valid;
  };

  const handleImport = async () => {
    if (!validate()) {
      dispatch(addNotification({ message: 'Please fill in all required fields (highlighted in red)', type: 'error' }));
      return;
    }
    try {
      setImporting(true);
      setResult(null);
      const csv = buildCSV(rows);
      const file = new File([csv], 'bulk_products.csv', { type: 'text/csv' });
      const res = await productService.importCSV(file, false);
      setResult({
        created: res.created ?? 0,
        updated: res.updated ?? 0,
        skipped: res.skipped ?? 0,
        errors: res.errors ?? [],
      });
      if ((res.created ?? 0) > 0 || (res.updated ?? 0) > 0) {
        localStorage.removeItem(DRAFT_KEY);
        setDraftTimestamp(null);
      }
    } catch (err: any) {
      dispatch(addNotification({ message: err?.response?.data?.detail || err?.message || 'Import failed', type: 'error' }));
    } finally {
      setImporting(false);
    }
  };

  const filledRows = rows.filter(r => r.name.trim()).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <button
            onClick={() => navigate('/products')}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors mr-1"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="page-header-icon">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h1>Bulk Add Products</h1>
            <p>Enter multiple products — saved automatically as draft</p>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2 self-start">
          {draftTimestamp && (
            <span className="text-xs text-gray-400 hidden sm:inline">
              Draft saved {new Date(draftTimestamp).toLocaleTimeString()}
            </span>
          )}
          <button className="btn btn-secondary text-sm" onClick={addRow}>
            <Plus className="w-4 h-4 inline mr-1" />
            Add Row
          </button>
          <button className="btn btn-secondary text-sm text-danger-600 hover:text-danger-700" onClick={() => setShowClearConfirm(true)}>
            Clear All
          </button>
          <button
            className="btn btn-primary text-sm"
            onClick={handleImport}
            disabled={importing || filledRows === 0}
          >
            <List className="w-4 h-4 inline mr-1.5" />
            {importing ? 'Importing…' : `Import ${filledRows > 0 ? filledRows : ''} Product${filledRows !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>

      {/* Import Result */}
      {result && (
        <div className={`section-card p-4 border-l-4 ${result.errors.length === 0 ? 'border-success-500' : 'border-warning-500'}`}>
          <div className="flex items-start gap-3">
            {result.errors.length === 0
              ? <CheckCircle className="w-5 h-5 text-success-500 shrink-0 mt-0.5" />
              : <AlertTriangle className="w-5 h-5 text-warning-500 shrink-0 mt-0.5" />}
            <div className="flex-1">
              <div className="flex flex-wrap gap-4 text-sm font-medium mb-2">
                <span className="text-success-700">✓ Created: {result.created}</span>
                {result.updated > 0 && <span className="text-primary-700">↻ Updated: {result.updated}</span>}
                {result.skipped > 0 && <span className="text-gray-500">⊘ Skipped: {result.skipped}</span>}
                {result.errors.length > 0 && <span className="text-danger-600">✗ Errors: {result.errors.length}</span>}
              </div>
              {result.errors.length > 0 && (
                <ul className="text-xs text-danger-600 space-y-0.5 mt-1">
                  {result.errors.map((e, i) => (
                    <li key={i}>Row {e.row}: {e.error}</li>
                  ))}
                </ul>
              )}
            </div>
            <button className="btn btn-primary text-sm shrink-0" onClick={() => navigate('/products')}>
              Done → Products
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="section-card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse" style={{ minWidth: 1300 }}>
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 font-medium">
                <th className="px-1.5 py-2 w-8 text-center">#</th>
                <th className="px-1.5 py-2 text-left">Product Name <span className="text-red-400">*</span></th>
                <th className="px-1.5 py-2 text-left">Category <span className="text-red-400">*</span></th>
                <th className="px-1.5 py-2 text-left">Brand</th>
                <th className="px-1.5 py-2 text-left">SKU <span className="text-red-400">*</span></th>
                <th className="px-1.5 py-2 text-left">HSN</th>
                <th className="px-1.5 py-2 text-left">Unit</th>
                <th className="px-1.5 py-2 text-left">Cost ₹ <span className="text-red-400">*</span></th>
                <th className="px-1.5 py-2 text-left">Price ₹ <span className="text-red-400">*</span></th>
                <th className="px-1.5 py-2 text-left">GST</th>
                <th className="px-1.5 py-2 text-left">Stock <span className="text-red-400">*</span></th>
                <th className="px-1.5 py-2 text-left">Reorder <span className="text-red-400">*</span></th>
                <th className="px-1.5 py-2 text-left">Barcode</th>
                <th className="px-1.5 py-2 text-left">Attributes</th>
                <th className="px-1.5 py-2 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <BulkProductRow
                  key={row.id}
                  row={row}
                  index={i}
                  errors={rowErrors.get(row.id) ?? new Set()}
                  onUpdate={updateRow}
                  onDelete={deleteRow}
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* Add row footer */}
        <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50/50">
          <button
            type="button"
            onClick={addRow}
            className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            <Plus className="w-4 h-4" />
            Add another row
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-400 text-center pb-2">
        Fields marked <span className="text-red-400">*</span> are required. Draft is saved automatically every time you make a change.
        {' '}Attributes format: <code className="bg-gray-100 px-1 rounded">Size:25;Color:Red</code>
      </p>

      <DeleteConfirmModal
        show={showClearConfirm}
        title="Clear All Rows"
        message="This will remove all rows and discard your saved draft. You won't be able to recover this data."
        onConfirm={clearAll}
        onHide={() => setShowClearConfirm(false)}
      />
    </div>
  );
};

export default BulkAddProducts;
