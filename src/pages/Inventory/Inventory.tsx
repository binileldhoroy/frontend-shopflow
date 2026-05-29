import React, { useState, useEffect, useCallback } from 'react';
import { inventoryService } from '@api/services/inventory.service';
import { documentService } from '@api/services/document.service';
import { StockItem, StockMovement, StockAdjustmentFormData } from '../../types/inventory.types';
import type { ProductBatch, ProductBatchFormData } from '../../types/credit-note.types';
import StockAdjustmentModal from '@components/features/inventory/StockAdjustmentModal';
import { useAppDispatch } from '@hooks/useRedux';
import { addNotification } from '@store/slices/uiSlice';
import { Package, AlertTriangle, TrendingUp, TrendingDown, Plus, Inbox, Search, FileSpreadsheet, CalendarClock } from 'lucide-react';
import api from '@api/axios';
import { API_ENDPOINTS } from '@api/endpoints';

const Inventory: React.FC = () => {
  const dispatch = useAppDispatch();

  const [stock, setStock] = useState<StockItem[]>([]);
  const [lowStockItems, setLowStockItems] = useState<StockItem[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMovements, setShowMovements] = useState(false);
  const [showBatches, setShowBatches] = useState(false);
  const [batches, setBatches] = useState<ProductBatch[]>([]);
  const [batchLoading, setBatchLoading] = useState(false);
  const [showBatchForm, setShowBatchForm] = useState(false);
  const [batchForm, setBatchForm] = useState<ProductBatchFormData>({ product: 0, batch_number: '', quantity: 0 });
  const [batchSaving, setBatchSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Modal states
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<StockItem | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  const loadLowStockAlerts = useCallback(async () => {
    try {
      const data = await inventoryService.getLowStockAlerts();
      setLowStockItems(data || []);
    } catch (error) {
      console.error('Failed to load low stock alerts', error);
    }
  }, []);

  useEffect(() => {
    loadLowStockAlerts();
  }, [loadLowStockAlerts]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const params: any = {
        page: currentPage,
        page_size: pageSize
      };

      if (showMovements) {
        const data = await inventoryService.getStockMovements(params);
        const results = data.results || data;
        const count = data.count || (Array.isArray(results) ? results.length : 0);

        setMovements(Array.isArray(results) ? results : []);
        setTotalCount(count);
        setTotalPages(Math.ceil(count / pageSize));
      } else {
        if (searchTerm) params.search = searchTerm;
        const data = await inventoryService.getStock(params);
        const results = data.results || data;
        const count = data.count || (Array.isArray(results) ? results.length : 0);

        setStock(Array.isArray(results) ? results : []);
        setTotalCount(count);
        setTotalPages(Math.ceil(count / pageSize));
      }
    } catch (error: any) {
      dispatch(addNotification({
        message: error.response?.data?.message || 'Failed to load data',
        type: 'error',
      }));
    } finally {
      setLoading(false);
    }
  }, [searchTerm, showMovements, currentPage, pageSize, dispatch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 300);
    return () => clearTimeout(timer);
  }, [loadData]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, showMovements, pageSize]);

  const [allStockForBatch, setAllStockForBatch] = useState<StockItem[]>([]);

  const loadBatches = useCallback(async () => {
    setBatchLoading(true);
    try {
      const [batchRes, stockRes] = await Promise.all([
        api.get(API_ENDPOINTS.INVENTORY.BATCHES),
        inventoryService.getStock({ page: 1, page_size: 1000 }),
      ]);
      setBatches(batchRes.data);
      const items = stockRes.results ?? stockRes;
      setAllStockForBatch(Array.isArray(items) ? items : []);
    } catch { /* ignore */ }
    finally { setBatchLoading(false); }
  }, []);

  useEffect(() => {
    if (showBatches) loadBatches();
  }, [showBatches, loadBatches]);

  const handleSaveBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setBatchSaving(true);
    try {
      await api.post(API_ENDPOINTS.INVENTORY.BATCHES, batchForm);
      dispatch(addNotification({ message: 'Batch added successfully', type: 'success' }));
      setShowBatchForm(false);
      setBatchForm({ product: 0, batch_number: '', quantity: 0 });
      loadBatches();
    } catch (err: any) {
      dispatch(addNotification({ message: err?.response?.data?.batch_number?.[0] || 'Failed to save batch', type: 'error' }));
    } finally {
      setBatchSaving(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  };

  const handleAdjustment = async (data: StockAdjustmentFormData) => {
    try {
      setFormLoading(true);
      await inventoryService.createStockMovement(data);
      dispatch(addNotification({
        message: 'Stock adjusted successfully',
        type: 'success',
      }));
      setShowAdjustmentModal(false);
      setSelectedProduct(null);
      loadData();
    } catch (error: any) {
      dispatch(addNotification({
        message: error.response?.data?.message || 'Failed to adjust stock',
        type: 'error',
      }));
    } finally {
      setFormLoading(false);
    }
  };

  const getMovementBadgeClass = (type: string) => {
    if (type === 'purchase' || type === 'return') return 'badge-success';
    return 'badge-danger';
  };

  const getMovementIcon = (type: string) => {
    if (type === 'purchase' || type === 'return') return <TrendingUp className="w-3 h-3" />;
    return <TrendingDown className="w-3 h-3" />;
  };

  const getMovementLabel = (type: string) => {
    const labels: Record<string, string> = {
      purchase: 'Purchase',
      sale: 'Sale',
      adjustment: 'Adjustment',
      return: 'Return',
      damage: 'Damage',
    };
    return labels[type] || type;
  };

  const getQuantityDisplay = (movement: StockMovement) => {
    const prefix = (movement.movement_type === 'purchase' || movement.movement_type === 'return') ? '+' : '-';
    return `${prefix}${movement.quantity}`;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-header-icon">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h1>Inventory</h1>
            <p>Monitor stock levels and movements</p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start">
          <div className="tab-nav">
            <button className={`tab-btn ${!showMovements && !showBatches ? 'active' : ''}`} onClick={() => { setShowMovements(false); setShowBatches(false); }}>
              Stock Levels
            </button>
            <button className={`tab-btn ${showMovements ? 'active' : ''}`} onClick={() => { setShowMovements(true); setShowBatches(false); }}>
              Movements
            </button>
            <button className={`tab-btn ${showBatches ? 'active' : ''}`} onClick={() => { setShowBatches(true); setShowMovements(false); }}>
              <CalendarClock className="w-3.5 h-3.5 inline mr-1" />Batches
            </button>
          </div>
          <ExportDropdown
            onExport={async (fmt) => {
              try {
                const resp = await documentService.exportData('inventory', { format: fmt });
                const url = window.URL.createObjectURL(new Blob([resp.data]));
                const a = document.createElement('a');
                a.href = url;
                a.download = `inventory_export.${fmt === 'excel' ? 'xlsx' : 'csv'}`;
                document.body.appendChild(a); a.click(); document.body.removeChild(a);
              } catch { dispatch(addNotification({ message: 'Export failed', type: 'error' })); }
            }}
          />
        </div>
      </div>

      {/* Search Bar - Only show for Stock Levels view */}
      {!showMovements && !showBatches && (
        <div className="filter-bar">
          <div className="search-wrap flex-1 max-w-md">
            <Search className="search-icon" />
            <input
              type="text"
              className="input-field"
              placeholder="Search products by name or SKU…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Low Stock Alerts */}
      {!showBatches && lowStockItems.length > 0 && (
        <div className="card bg-warning-50 border border-warning-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-warning-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-warning-900">Low Stock Alert</h3>
              <p className="text-sm text-warning-700 mt-1">
                {lowStockItems.length} product(s) are running low on stock
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {lowStockItems.slice(0, 5).map((item) => (
                  <span key={item.id} className="text-xs bg-warning-100 text-warning-800 px-2 py-1 rounded">
                    {item.product_name} ({item.quantity} left)
                  </span>
                ))}
                {lowStockItems.length > 5 && (
                  <span className="text-xs text-warning-700">
                    +{lowStockItems.length - 5} more
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {!showBatches && showMovements ? (
        /* Stock Movements Table */
        <div className="section-card flex flex-col" style={{ height: 'calc(var(--viewport-height) - 220px)', minHeight: '400px' }}>
          {loading ? (
            <div className="loading-center flex-1"><div className="spinner" /></div>
          ) : movements.length === 0 ? (
            <div className="empty-state flex-1">
              <div className="empty-state-icon"><Inbox className="w-6 h-6" /></div>
              <p className="text-gray-700 font-medium">No stock movements recorded</p>
            </div>
          ) : (
            <>
              <div className="flex-1 table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Product</th>
                      <th>Type</th>
                      <th className="hidden sm:table-cell">Reason</th>
                      <th className="th-right">Quantity</th>
                      <th className="hidden md:table-cell">Reference</th>
                      <th className="hidden lg:table-cell">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.map((movement) => (
                      <tr key={movement.id}>
                        <td className="text-gray-500 whitespace-nowrap">{new Date(movement.created_at).toLocaleDateString()}</td>
                        <td className="font-semibold text-gray-900">
                          {movement.product_name}
                          {movement.product_attributes && movement.product_attributes.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-0.5">
                              {movement.product_attributes.map((a, i) => (
                                <span key={i} className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-normal">
                                  {a.name}: {a.value}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td>
                          <span className={`badge ${getMovementBadgeClass(movement.movement_type)} inline-flex items-center gap-1`}>
                            {getMovementIcon(movement.movement_type)}
                            {getMovementLabel(movement.movement_type)}
                          </span>
                        </td>
                        <td className="hidden sm:table-cell text-gray-500 text-sm">
                          {movement.reason_code_display || (movement.reason_code ? movement.reason_code.replace(/_/g, ' ') : '—')}
                        </td>
                        <td className="td-right font-semibold">{getQuantityDisplay(movement)}</td>
                        <td className="text-gray-500 hidden md:table-cell">{movement.reference_number || '—'}</td>
                        <td className="text-gray-500 hidden lg:table-cell">{movement.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            {/* Pagination for Movements */}
            {totalCount > 0 && (
              <div className="pagination-bar shrink-0 mx-4 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Show</span>
                  <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="input-field py-1 px-2 text-sm w-20">
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <span className="text-sm text-gray-500 whitespace-nowrap">
                    entries ({(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, totalCount)} of {totalCount})
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="pag-btn">‹</button>
                  {getPageNumbers().map((page, index) => (
                    <button key={index} onClick={() => typeof page === 'number' && handlePageChange(page)} disabled={page === '...'} className={`pag-btn ${page === currentPage ? 'active' : ''} ${page === '...' ? 'dots' : ''}`}>{page}</button>
                  ))}
                  <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="pag-btn">›</button>
                </div>
              </div>
            )}
          </>
          )}
        </div>
      ) : !showBatches ? (
        /* Stock Levels Table */
        <div className="section-card flex flex-col" style={{ height: 'calc(var(--viewport-height) - 320px)', minHeight: '400px' }}>
          {loading ? (
            <div className="loading-center flex-1"><div className="spinner" /></div>
          ) : stock.length === 0 ? (
            <div className="empty-state flex-1">
              <div className="empty-state-icon"><Package className="w-6 h-6" /></div>
              <p className="text-gray-700 font-medium">No stock records found</p>
            </div>
          ) : (
            <>
              <div className="flex-1 table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th className="th-right">Current Stock</th>
                      <th className="th-right hidden sm:table-cell">Reorder Level</th>
                      <th className="th-center">Status</th>
                      <th className="th-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stock.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <span className="font-semibold text-gray-900">{item.product_name}</span>
                          <div className="text-xs text-gray-400">{item.sku}</div>
                          {item.product_attributes && item.product_attributes.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-0.5">
                              {item.product_attributes.map((a, i) => (
                                <span key={i} className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                                  {a.name}: {a.value}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="td-right">
                          <span className={`font-semibold ${
                            item.is_out_of_stock ? 'text-danger-600' :
                            item.is_low_stock ? 'text-warning-600' :
                            'text-gray-900'
                          }`}>
                            {item.quantity}
                          </span>
                        </td>
                        <td className="td-right text-gray-500 hidden sm:table-cell">{item.reorder_level}</td>
                        <td className="td-center">
                          {item.is_out_of_stock ? (
                            <span className="badge badge-danger">Out of Stock</span>
                          ) : item.is_low_stock ? (
                            <span className="badge badge-warning">Low Stock</span>
                          ) : (
                            <span className="badge badge-success">In Stock</span>
                          )}
                        </td>
                        <td className="td-right">
                          <button
                            onClick={() => { setSelectedProduct(item); setShowAdjustmentModal(true); }}
                            className="action-btn action-btn-primary"
                            title="Adjust Stock"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination for Stock Levels */}
              {totalCount > 0 && (
                <div className="pagination-bar shrink-0 mx-4 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Show</span>
                    <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="input-field py-1 px-2 text-sm w-20">
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                    <span className="text-sm text-gray-500 whitespace-nowrap">
                      entries ({(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, totalCount)} of {totalCount})
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="pag-btn">‹</button>
                    {getPageNumbers().map((page, index) => (
                      <button key={index} onClick={() => typeof page === 'number' && handlePageChange(page)} disabled={page === '...'} className={`pag-btn ${page === currentPage ? 'active' : ''} ${page === '...' ? 'dots' : ''}`}>{page}</button>
                    ))}
                    <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="pag-btn">›</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      ) : null}

      {/* ── BATCHES TAB ─────────────────────────────────────────────────────── */}
      {showBatches && (
        <div className="section-card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-primary-600" /> Product Batches & Expiry
            </h3>
            <button onClick={() => setShowBatchForm(v => !v)} className="btn btn-primary text-sm flex items-center gap-1.5">
              <Plus className="w-4 h-4" /> Add Batch
            </button>
          </div>

          {showBatchForm && (
            <form onSubmit={handleSaveBatch} className="border rounded-lg p-4 bg-gray-50 space-y-3 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="label">Product *</label>
                  <select
                    required
                    className="input-field bg-white"
                    value={batchForm.product || ''}
                    onChange={e => setBatchForm(p => ({ ...p, product: Number(e.target.value) }))}
                  >
                    <option value="">Select a product…</option>
                    {allStockForBatch.map(s => (
                      <option key={s.id} value={s.product}>{s.product_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Batch / Lot Number *</label>
                  <input type="text" required className="input-field" value={batchForm.batch_number} onChange={e => setBatchForm(p => ({ ...p, batch_number: e.target.value }))} placeholder="e.g. BATCH-2026-001" />
                </div>
                <div>
                  <label className="label">Quantity *</label>
                  <input type="number" required min="0" step="0.01" className="input-field" value={batchForm.quantity || ''} onChange={e => setBatchForm(p => ({ ...p, quantity: Number(e.target.value) }))} placeholder="0" />
                </div>
                <div>
                  <label className="label">Manufacture Date</label>
                  <input type="date" className="input-field" value={batchForm.manufacture_date || ''} onChange={e => setBatchForm(p => ({ ...p, manufacture_date: e.target.value || undefined }))} />
                </div>
                <div>
                  <label className="label">Expiry Date</label>
                  <input type="date" className="input-field" value={batchForm.expiry_date || ''} onChange={e => setBatchForm(p => ({ ...p, expiry_date: e.target.value || undefined }))} />
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-1">
                <button type="button" className="btn btn-secondary" onClick={() => setShowBatchForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={batchSaving}>{batchSaving ? 'Saving...' : 'Save Batch'}</button>
              </div>
            </form>
          )}

          {batchLoading ? (
            <div className="text-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div></div>
          ) : batches.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <CalendarClock className="w-12 h-12 mx-auto mb-2 text-gray-200" />
              <p>No batches recorded. Add a batch to start tracking expiry dates.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-y border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">Product</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">Batch #</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-700">Qty</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-700">Mfg Date</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-700">Expiry Date</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {batches.map(b => {
                    const statusConfig = {
                      expired:       { cls: 'bg-red-100 text-red-700 border-red-200',     label: 'Expired' },
                      expiring_soon: { cls: 'bg-amber-100 text-amber-700 border-amber-200', label: b.days_to_expiry != null ? `Expires in ${b.days_to_expiry}d` : 'Expiring Soon' },
                      ok:            { cls: 'bg-green-100 text-green-700 border-green-200', label: 'OK' },
                      no_expiry:     { cls: 'bg-gray-100 text-gray-500 border-gray-200',   label: 'No Expiry' },
                    }[b.expiry_status];
                    return (
                      <tr key={b.id} className={b.expiry_status === 'expired' ? 'bg-red-50/40' : b.expiry_status === 'expiring_soon' ? 'bg-amber-50/30' : ''}>
                        <td className="px-4 py-3 font-medium">{b.product_name}</td>
                        <td className="px-4 py-3 font-mono text-gray-600">{b.batch_number}</td>
                        <td className="px-4 py-3 text-right">{b.quantity}</td>
                        <td className="px-4 py-3 text-center text-gray-500">{b.manufacture_date || '—'}</td>
                        <td className="px-4 py-3 text-center text-gray-500">{b.expiry_date || '—'}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${statusConfig.cls}`}>
                            {statusConfig.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Stock Adjustment Modal */}
      <StockAdjustmentModal
        show={showAdjustmentModal}
        onHide={() => {
          setShowAdjustmentModal(false);
          setSelectedProduct(null);
        }}
        onSubmit={handleAdjustment}
        product={selectedProduct}
        loading={formLoading}
      />
    </div>
  );
};

const ExportDropdown = ({ onExport }: { onExport: (fmt: 'csv' | 'excel') => void }) => {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen(v => !v)} className="btn btn-secondary flex items-center gap-1.5 text-sm">
        <FileSpreadsheet className="w-4 h-4" /> Export
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-100 z-10 w-36 py-1">
          <button onClick={() => { onExport('csv'); setOpen(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50">CSV</button>
          <button onClick={() => { onExport('excel'); setOpen(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50">Excel (.xlsx)</button>
        </div>
      )}
    </div>
  );
};

export default Inventory;
