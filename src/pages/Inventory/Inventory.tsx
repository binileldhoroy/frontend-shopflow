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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="w-8 h-8" />
            Inventory Management
          </h1>
          <p className="text-gray-600 mt-1">Monitor stock levels and movements</p>
        </div>
        <button
          onClick={() => setShowMovements(!showMovements)}
          className="btn btn-secondary"
        >
          {showMovements ? 'Show Stock Levels' : 'Show Movements'}
        </button>
      </div>

      {/* Search Bar - Only show for Stock Levels view */}
      {!showMovements && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            className="input-field pl-10"
            placeholder="Search products by name or SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
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
        <div className="card flex flex-col min-h-0 overflow-hidden" style={{ height: 'calc(100vh - 200px)' }}>
          <h3 className="text-lg font-semibold mb-4 shrink-0">Stock Movements</h3>
          {loading ? (
            <div className="flex justify-center items-center py-20 flex-1">
              <div className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : movements.length === 0 ? (
            <div className="text-center py-12 flex-1">
              <Inbox className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No stock movements recorded</p>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-x-auto overflow-y-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Date</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Product</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Type</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-700">Quantity</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Reference</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                  {movements.map((movement) => (
                    <tr key={movement.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-gray-600">
                        {new Date(movement.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 font-medium text-gray-900">
                        {movement.product_name}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`badge ${getMovementBadgeClass(movement.movement_type)} flex items-center gap-1 w-fit`}>
                          {getMovementIcon(movement.movement_type)}
                          {getMovementLabel(movement.movement_type)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-medium">
                        {getQuantityDisplay(movement)}
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {movement.reference_number || '-'}
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {movement.notes || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination for Movements */}
            {totalCount > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-4 pt-4 mt-4 border-t border-gray-200 shrink-0 mx-4 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Show</span>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="input-field py-1 px-2 text-sm w-20"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <span className="text-sm text-gray-600 whitespace-nowrap">
                    entries (Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, totalCount)} of {totalCount})
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>

                  {getPageNumbers().map((page, index) => (
                    <button
                      key={index}
                      onClick={() => typeof page === 'number' && handlePageChange(page)}
                      disabled={page === '...'}
                      className={`px-3 py-1 text-sm border rounded ${
                        page === currentPage
                          ? 'bg-primary-600 text-white border-primary-600'
                          : page === '...'
                          ? 'border-transparent cursor-default'
                          : 'border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
          )}
        </div>
      ) : (
        /* Stock Levels Table */
        <div className="card flex flex-col min-h-0 overflow-hidden" style={{ height: 'calc(100vh - 320px)' }}>
          <h3 className="text-lg font-semibold mb-4 shrink-0">Stock Levels</h3>
          {loading ? (
            <div className="flex justify-center items-center py-20 flex-1">
              <div className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : stock.length === 0 ? (
            <div className="text-center py-12 flex-1">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No stock records found</p>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-x-auto overflow-y-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Product</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-700">Current Stock</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-700">Reorder Level</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-700">Status</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-700">Actions</th>
                    </tr>
                  </thead>
                <tbody>
                  {stock.map((item) => (
                    <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium text-gray-900">
                        {item.product_name}
                        <div className="text-sm text-gray-500 font-normal">{item.sku}</div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={`font-medium ${
                          item.is_out_of_stock ? 'text-danger-600' :
                          item.is_low_stock ? 'text-warning-600' :
                          'text-gray-900'
                        }`}>
                          {item.quantity}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-gray-600">
                        {item.reorder_level}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {item.is_out_of_stock ? (
                          <span className="badge badge-danger">Out of Stock</span>
                        ) : item.is_low_stock ? (
                          <span className="badge badge-warning">Low Stock</span>
                        ) : (
                          <span className="badge badge-success">In Stock</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end">
                          <button
                            onClick={() => {
                              setSelectedProduct(item);
                              setShowAdjustmentModal(true);
                            }}
                            className="btn btn-primary btn-sm flex items-center gap-1"
                          >
                            <Plus className="w-4 h-4" />
                            Adjust
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination for Stock Levels */}
            {totalCount > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-4 pt-4 mt-4 border-t border-gray-200 shrink-0 mx-4 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Show</span>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="input-field py-1 px-2 text-sm w-20"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <span className="text-sm text-gray-600 whitespace-nowrap">
                    entries (Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, totalCount)} of {totalCount})
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>

                  {getPageNumbers().map((page, index) => (
                    <button
                      key={index}
                      onClick={() => typeof page === 'number' && handlePageChange(page)}
                      disabled={page === '...'}
                      className={`px-3 py-1 text-sm border rounded ${
                        page === currentPage
                          ? 'bg-primary-600 text-white border-primary-600'
                          : page === '...'
                          ? 'border-transparent cursor-default'
                          : 'border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
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
