import React, { useState, useEffect, useCallback } from 'react';
import { inventoryService } from '@api/services/inventory.service';
import { StockItem, StockMovement, StockAdjustmentFormData } from '../../types/inventory.types';
import StockAdjustmentModal from '@components/features/inventory/StockAdjustmentModal';
import { useAppDispatch } from '@hooks/useRedux';
import { addNotification } from '@store/slices/uiSlice';
import { Package, AlertTriangle, TrendingUp, TrendingDown, Plus, Inbox, Search } from 'lucide-react';

const Inventory: React.FC = () => {
  const dispatch = useAppDispatch();

  const [stock, setStock] = useState<StockItem[]>([]);
  const [lowStockItems, setLowStockItems] = useState<StockItem[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMovements, setShowMovements] = useState(false);
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
            <button className={`tab-btn ${!showMovements ? 'active' : ''}`} onClick={() => setShowMovements(false)}>
              Stock Levels
            </button>
            <button className={`tab-btn ${showMovements ? 'active' : ''}`} onClick={() => setShowMovements(true)}>
              Movements
            </button>
          </div>
        </div>
      </div>

      {/* Search Bar - Only show for Stock Levels view */}
      {!showMovements && (
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
      {lowStockItems.length > 0 && (
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

      {showMovements ? (
        /* Stock Movements Table */
        <div className="section-card flex flex-col" style={{ height: 'calc(100vh - 220px)', minHeight: '400px' }}>
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
                      <th className="th-right">Quantity</th>
                      <th className="hidden md:table-cell">Reference</th>
                      <th className="hidden lg:table-cell">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.map((movement) => (
                      <tr key={movement.id}>
                        <td className="text-gray-500 whitespace-nowrap">{new Date(movement.created_at).toLocaleDateString()}</td>
                        <td className="font-semibold text-gray-900">{movement.product_name}</td>
                        <td>
                          <span className={`badge ${getMovementBadgeClass(movement.movement_type)} inline-flex items-center gap-1`}>
                            {getMovementIcon(movement.movement_type)}
                            {getMovementLabel(movement.movement_type)}
                          </span>
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
      ) : (
        /* Stock Levels Table */
        <div className="section-card flex flex-col" style={{ height: 'calc(100vh - 320px)', minHeight: '400px' }}>
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

export default Inventory;
