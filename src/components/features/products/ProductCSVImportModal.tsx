import React, { useState, useRef, useCallback } from 'react';
import Modal from '@components/common/Modal/Modal';
import { productService } from '@api/services/product.service';
import {
  Upload,
  Download,
  FileText,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  X,
  AlertTriangle,
} from 'lucide-react';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface PreviewRow {
  row: number;
  status: 'new' | 'exists' | 'error';
  name: string;
  sku: string;
  category: string;
  unit: string;
  cost_price: string;
  selling_price: string;
  gst_rate: string;
  stock_quantity: string;
  error: string | null;
}

interface PreviewResult {
  total: number;
  valid: number;
  new: number;
  exists: number;
  errors: number;
  rows: PreviewRow[];
}

interface ImportResult {
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{ row: number; error: string }>;
}

type Step = 'upload' | 'preview' | 'done';

interface Props {
  show: boolean;
  onHide: () => void;
  onImported: () => void;
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────
const ProductCSVImportModal: React.FC<Props> = ({ show, onHide, onImported }) => {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingImport, setLoadingImport] = useState(false);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [updateExisting, setUpdateExisting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep('upload');
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    setUpdateExisting(true);
  };

  const handleClose = () => {
    reset();
    onHide();
  };

  // ── File selection ──────────────────────────
  const handleFile = useCallback(async (selected: File) => {
    if (!selected.name.toLowerCase().endsWith('.csv')) {
      setError('Please select a .csv file.');
      return;
    }
    setFile(selected);
    setError(null);
    setLoadingPreview(true);
    try {
      const data = await productService.previewCSV(selected);
      setPreview(data);
      setStep('preview');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to parse CSV. Please check the file format.');
    } finally {
      setLoadingPreview(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  // ── Import ──────────────────────────────────
  const handleImport = async () => {
    if (!file) return;
    setLoadingImport(true);
    setError(null);
    try {
      const data = await productService.importCSV(file, updateExisting);
      setResult(data);
      setStep('done');
      onImported();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Import failed. Please try again.');
    } finally {
      setLoadingImport(false);
    }
  };

  // ── Template download ───────────────────────
  const handleDownloadTemplate = async () => {
    setLoadingTemplate(true);
    try {
      await productService.downloadCSVTemplate();
    } catch {
      setError('Failed to download template.');
    } finally {
      setLoadingTemplate(false);
    }
  };

  // ─────────────────────────────────────────────
  // Render helpers
  // ─────────────────────────────────────────────
  const statusBadge = (status: PreviewRow['status']) => {
    if (status === 'new')
      return <span className="badge badge-success text-xs">New</span>;
    if (status === 'exists')
      return <span className="badge badge-warning text-xs">Update</span>;
    return <span className="badge badge-danger text-xs">Error</span>;
  };

  const validCount = preview ? preview.new + (updateExisting ? preview.exists : 0) : 0;

  // ─────────────────────────────────────────────
  // Steps
  // ─────────────────────────────────────────────
  const renderUpload = () => (
    <div className="space-y-5">
      {/* Dropzone */}
      <div
        className={`relative border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
          dragOver
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
        }`}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleInputChange}
        />
        {loadingPreview ? (
          <div className="flex flex-col items-center gap-3 text-blue-500">
            <RefreshCw className="w-10 h-10 animate-spin" />
            <p className="font-medium">Parsing CSV…</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 text-gray-400">
            <Upload className="w-10 h-10" />
            <div>
              <p className="font-semibold text-gray-700">Drop your CSV file here</p>
              <p className="text-sm mt-0.5">or click to browse</p>
            </div>
            <p className="text-xs text-gray-400">Only .csv files are supported</p>
          </div>
        )}
      </div>

      {/* Download template */}
      <div className="flex items-center justify-between rounded-lg bg-gray-50 border border-gray-200 px-4 py-3">
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <FileText className="w-4 h-4 text-gray-400 shrink-0" />
          <span>Need a template? Download the sample CSV to get started.</span>
        </div>
        <button
          type="button"
          className="btn btn-secondary text-xs shrink-0 ml-3"
          onClick={handleDownloadTemplate}
          disabled={loadingTemplate}
        >
          {loadingTemplate ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin inline mr-1" />
          ) : (
            <Download className="w-3.5 h-3.5 inline mr-1" />
          )}
          Download Template
        </button>
      </div>

      {/* Columns reference */}
      <div className="text-xs text-gray-500 space-y-1">
        <p className="font-medium text-gray-600">Required columns:</p>
        <p className="font-mono bg-gray-50 rounded p-2 border border-gray-200 leading-relaxed">
          name, sku, category, unit, cost_price, selling_price
        </p>
        <p className="font-medium text-gray-600 pt-1">Optional columns:</p>
        <p className="font-mono bg-gray-50 rounded p-2 border border-gray-200 leading-relaxed">
          gst_rate, hsn_code, tax_included, barcode, description,
          is_active, stock_quantity, reorder_level, location
        </p>
      </div>
    </div>
  );

  const renderPreview = () => {
    if (!preview) return null;

    return (
      <div className="space-y-4">
        {/* File + re-upload */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <FileText className="w-4 h-4 text-blue-500" />
            <span className="font-medium">{file?.name}</span>
          </div>
          <button
            type="button"
            className="text-xs text-blue-600 hover:underline flex items-center gap-1"
            onClick={() => { reset(); }}
          >
            <X className="w-3 h-3" /> Change file
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Total rows', value: preview.total, color: 'text-gray-700' },
            { label: 'New products', value: preview.new, color: 'text-green-600' },
            { label: 'Will update', value: preview.exists, color: 'text-amber-600' },
            { label: 'Errors', value: preview.errors, color: 'text-red-600' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
              <div className={`text-xl font-bold ${color}`}>{value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {/* Update existing toggle */}
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <div
            className={`relative w-9 h-5 rounded-full transition-colors ${
              updateExisting ? 'bg-blue-500' : 'bg-gray-300'
            }`}
            onClick={() => setUpdateExisting(!updateExisting)}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                updateExisting ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </div>
          <span className="text-sm text-gray-700">
            Update existing products that match by SKU
          </span>
        </label>

        {/* Preview table */}
        <div className="rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-auto max-h-64">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600 border-b border-gray-200">Row</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600 border-b border-gray-200">Status</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600 border-b border-gray-200">SKU</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600 border-b border-gray-200">Name</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600 border-b border-gray-200">Category</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600 border-b border-gray-200">Unit</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-600 border-b border-gray-200">Cost</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-600 border-b border-gray-200">Price</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-600 border-b border-gray-200">Stock</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600 border-b border-gray-200">Issue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {preview.rows.map((row) => (
                  <tr
                    key={row.row}
                    className={
                      row.status === 'error'
                        ? 'bg-red-50'
                        : row.status === 'exists'
                        ? 'bg-amber-50'
                        : 'bg-white'
                    }
                  >
                    <td className="px-3 py-1.5 text-gray-400">{row.row}</td>
                    <td className="px-3 py-1.5">{statusBadge(row.status)}</td>
                    <td className="px-3 py-1.5 font-mono text-gray-700">{row.sku || '—'}</td>
                    <td className="px-3 py-1.5 text-gray-800 max-w-[160px] truncate">{row.name || '—'}</td>
                    <td className="px-3 py-1.5 text-gray-500">{row.category || '—'}</td>
                    <td className="px-3 py-1.5 text-gray-500 capitalize">{row.unit || '—'}</td>
                    <td className="px-3 py-1.5 text-right text-gray-600">
                      {row.cost_price ? `₹${parseFloat(row.cost_price).toFixed(2)}` : '—'}
                    </td>
                    <td className="px-3 py-1.5 text-right font-medium text-gray-800">
                      {row.selling_price ? `₹${parseFloat(row.selling_price).toFixed(2)}` : '—'}
                    </td>
                    <td className="px-3 py-1.5 text-right text-gray-600">
                      {row.stock_quantity || '0'}
                    </td>
                    <td className="px-3 py-1.5 text-red-500 max-w-[180px] truncate" title={row.error || ''}>
                      {row.error ? (
                        <span className="flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 shrink-0" />
                          {row.error}
                        </span>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {preview.errors > 0 && (
          <p className="text-xs text-amber-600 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            {preview.errors} row{preview.errors !== 1 ? 's' : ''} with errors will be skipped during import.
          </p>
        )}
      </div>
    );
  };

  const renderDone = () => {
    if (!result) return null;
    const hasErrors = result.errors.length > 0;
    return (
      <div className="space-y-5 text-center">
        <div className="flex justify-center">
          {hasErrors ? (
            <AlertCircle className="w-14 h-14 text-amber-400" />
          ) : (
            <CheckCircle className="w-14 h-14 text-green-500" />
          )}
        </div>
        <div>
          <p className="text-lg font-semibold text-gray-800">
            {hasErrors ? 'Import completed with some issues' : 'Import successful!'}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Your product catalogue has been updated.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-600">{result.created}</div>
            <div className="text-xs text-green-700 mt-0.5">Created</div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="text-2xl font-bold text-amber-600">{result.updated}</div>
            <div className="text-xs text-amber-700 mt-0.5">Updated</div>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="text-2xl font-bold text-gray-500">{result.skipped}</div>
            <div className="text-xs text-gray-500 mt-0.5">Skipped</div>
          </div>
        </div>
        {hasErrors && (
          <div className="text-left rounded-lg border border-red-200 bg-red-50 p-3 space-y-1 max-h-36 overflow-auto">
            <p className="text-xs font-semibold text-red-700 mb-2">Failed rows:</p>
            {result.errors.map((e, i) => (
              <p key={i} className="text-xs text-red-600">
                Row {e.row}: {e.error}
              </p>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ─────────────────────────────────────────────
  // Footer buttons per step
  // ─────────────────────────────────────────────
  const renderFooter = () => {
    if (step === 'upload') {
      return (
        <button type="button" className="btn btn-secondary" onClick={handleClose}>
          Cancel
        </button>
      );
    }
    if (step === 'preview') {
      return (
        <>
          <button type="button" className="btn btn-secondary" onClick={handleClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleImport}
            disabled={loadingImport || validCount === 0}
          >
            {loadingImport ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin inline mr-1.5" />
                Importing…
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 inline mr-1.5" />
                Import {validCount} Product{validCount !== 1 ? 's' : ''}
              </>
            )}
          </button>
        </>
      );
    }
    // done
    return (
      <>
        <button type="button" className="btn btn-secondary" onClick={() => { reset(); }}>
          Import Another
        </button>
        <button type="button" className="btn btn-primary" onClick={handleClose}>
          Done
        </button>
      </>
    );
  };

  const titles: Record<Step, string> = {
    upload: 'Import Products from CSV',
    preview: 'Preview Import',
    done: 'Import Complete',
  };

  return (
    <Modal
      show={show}
      onHide={handleClose}
      title={titles[step]}
      size="xl"
      footer={renderFooter()}
    >
      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
          <button className="ml-auto" onClick={() => setError(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {step === 'upload' && renderUpload()}
      {step === 'preview' && renderPreview()}
      {step === 'done' && renderDone()}
    </Modal>
  );
};

export default ProductCSVImportModal;
