import React, { useState, useEffect, useCallback } from 'react';
import { productService, categoryService } from '@api/services/product.service';
import { Product, Category, ProductFormData } from '../../types/product.types';
import ProductFormModal from '@components/features/products/ProductFormModal';
import ProductCSVImportModal from '@components/features/products/ProductCSVImportModal';
import DeleteConfirmModal from '@components/common/DeleteConfirmModal/DeleteConfirmModal';
import { useAppDispatch } from '@hooks/useRedux';
import { addNotification } from '@store/slices/uiSlice';
import { Package, Plus, Search, Edit2, Trash2, Inbox, AlertTriangle, Upload } from 'lucide-react';

const Products: React.FC = () => {
  const dispatch = useAppDispatch();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [stockFilter, setStockFilter] = useState('');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Modal states
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      // Build query params for API search
      const params: any = {
        page: currentPage,
        page_size: pageSize
      };
      if (searchTerm) params.search = searchTerm;
      if (categoryFilter) params.category = categoryFilter;

      const [productsResponse, categoriesData] = await Promise.all([
        productService.getAll(params),
        categoryService.getAll(),
      ]);
      // Handle paginated response - extract results array
      const productsData = productsResponse.results || productsResponse;
      const count = productsResponse.count || (Array.isArray(productsData) ? productsData.length : 0);

      setTotalCount(count);
      setTotalPages(Math.ceil(count / pageSize));

      let filteredData = Array.isArray(productsData) ? productsData : [];

      // Apply stock filter on frontend (since backend doesn't have this filter)
      if (stockFilter) {
        filteredData = filteredData.filter(product => {
          if (stockFilter === 'low') return product.stock_quantity <= product.reorder_level && product.stock_quantity > 0;
          if (stockFilter === 'out') return product.stock_quantity === 0;
          if (stockFilter === 'in') return product.stock_quantity > 0;
          return true;
        });
      }

      setProducts(filteredData);
      setCategories(categoriesData);
    } catch (error: any) {
      dispatch(addNotification({
        message: error.response?.data?.message || 'Failed to load data',
        type: 'error',
      }));
    } finally {
      setLoading(false);
    }
  }, [searchTerm, categoryFilter, stockFilter, currentPage, pageSize, dispatch]);

  // Debounced search effect - also handles initial load
  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 300); // 300ms debounce (reduced from 500ms for faster response)

    return () => clearTimeout(timer);
  }, [searchTerm, categoryFilter, stockFilter, currentPage, pageSize, loadData]);

  // Reset to page 1 when filters or page size change
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [searchTerm, categoryFilter, stockFilter, pageSize]);

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


  const handleAddProduct = () => {
    setSelectedProduct(null);
    setShowFormModal(true);
  };

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setShowFormModal(true);
  };

  const handleDeleteProduct = (product: Product) => {
    setSelectedProduct(product);
    setShowDeleteModal(true);
  };

  const handleFormSubmit = async (data: ProductFormData) => {
    try {
      setFormLoading(true);

      const formData = new FormData();

      Object.keys(data).forEach((key) => {
        const value = (data as any)[key];

        // Handle image separately - only append if it's a new File upload
        if (key === "image") {
          if (value instanceof File) {
            formData.append("image", value);
          }
          // Skip if it's an existing URL string - backend keeps the current image
        } else if (value !== null && value !== undefined) {
          formData.append(key, value);
        }
      });

      if (selectedProduct) {
        await productService.update(selectedProduct.id, formData);
        dispatch(addNotification({
          message: 'Product updated successfully',
          type: 'success',
        }));
      } else {
        await productService.create(formData);
        dispatch(addNotification({
          message: 'Product created successfully',
          type: 'success',
        }));
      }

      setShowFormModal(false);
      loadData();
    } catch (error: any) {
      dispatch(addNotification({
        message: error.response?.data?.message || 'Operation failed',
        type: 'error',
      }));
    } finally {
      setFormLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedProduct) return;

    try {
      setFormLoading(true);
      await productService.delete(selectedProduct.id);
      dispatch(addNotification({
        message: 'Product deleted successfully',
        type: 'success',
      }));
      setShowDeleteModal(false);
      loadData();
    } catch (error: any) {
      dispatch(addNotification({
        message: error.response?.data?.message || 'Failed to delete product',
        type: 'error',
      }));
    } finally {
      setFormLoading(false);
    }
  };

  const getCategoryName = (categoryId: number) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.name || 'Unknown';
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
            <h1>Products</h1>
            <p>Manage your product inventory</p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start">
          <button className="btn btn-secondary" onClick={() => setShowImportModal(true)}>
            <Upload className="w-4 h-4 inline mr-1.5" />
            Import CSV
          </button>
          <button className="btn btn-primary" onClick={handleAddProduct}>
            <Plus className="w-4 h-4 inline mr-1.5" />
            Add Product
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <div className="search-wrap flex-1 min-w-[180px]">
          <Search className="search-icon" />
          <input
            type="text"
            className="input-field"
            placeholder="Search products…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          className="input-field w-auto min-w-[150px]"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="">All Categories</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
        <select
          className="input-field w-auto min-w-[130px]"
          value={stockFilter}
          onChange={(e) => setStockFilter(e.target.value)}
        >
          <option value="">All Stock</option>
          <option value="in">In Stock</option>
          <option value="low">Low Stock</option>
          <option value="out">Out of Stock</option>
        </select>
        <span className="text-sm text-gray-500 ml-auto whitespace-nowrap hidden sm:inline">
          {totalCount} product{totalCount !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Products Table */}
      <div className="section-card flex flex-col" style={{ height: 'calc(100vh - 280px)', minHeight: '400px' }}>
        {loading ? (
          <div className="loading-center flex-1">
            <div className="spinner" />
            <span className="text-sm text-gray-500">Loading products…</span>
          </div>
        ) : products.length === 0 ? (
          <div className="empty-state flex-1">
            <div className="empty-state-icon">
              <Inbox className="w-6 h-6" />
            </div>
            <p className="text-gray-700 font-medium">No products found</p>
            <p className="text-sm text-gray-400 mt-1">Try adjusting your filters or add a new product</p>
          </div>
        ) : (
          <>
            <div className="flex-1 table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Name</th>
                    <th>Category</th>
                    <th className="hidden md:table-cell">HSN</th>
                    <th className="hidden lg:table-cell">Unit</th>
                    <th className="th-right hidden lg:table-cell">Cost</th>
                    <th className="th-right">Price</th>
                    <th className="th-right hidden md:table-cell">GST</th>
                    <th className="th-center">Stock</th>
                    <th className="th-center hidden sm:table-cell">Status</th>
                    <th className="th-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product: Product) => (
                    <tr key={product.id}>
                      <td>
                        <span className="font-semibold text-gray-900 text-xs">{product.sku}</span>
                        {product.barcode && (
                          <div className="text-gray-400 text-xs mt-0.5">{product.barcode}</div>
                        )}
                      </td>
                      <td className="font-medium text-gray-800">{product.name}</td>
                      <td>
                        <span className="badge badge-primary">{getCategoryName(product.category)}</span>
                      </td>
                      <td className="text-gray-500 hidden md:table-cell">{product.hsn_code || '—'}</td>
                      <td className="text-gray-500 capitalize hidden lg:table-cell">{product.unit || 'piece'}</td>
                      <td className="td-right text-gray-500 hidden lg:table-cell">₹{parseFloat(String(product.cost_price || 0)).toFixed(2)}</td>
                      <td className="td-right font-semibold text-gray-900">₹{parseFloat(String(product.selling_price || 0)).toFixed(2)}</td>
                      <td className="td-right hidden md:table-cell">
                        <span className="badge badge-info">{product.gst_rate || 0}%</span>
                      </td>
                      <td className="td-center">
                        <span className={`badge ${
                          product.stock_quantity === 0 ? 'badge-danger' :
                          product.stock_quantity <= product.reorder_level ? 'badge-warning' :
                          'badge-success'
                        }`}>
                          {product.stock_quantity}
                        </span>
                        {product.stock_quantity <= product.reorder_level && product.stock_quantity > 0 && (
                          <div className="text-warning-600 text-xs mt-0.5 flex items-center gap-0.5 justify-center">
                            <AlertTriangle className="w-3 h-3" />
                            Low
                          </div>
                        )}
                      </td>
                      <td className="td-center hidden sm:table-cell">
                        <span className={`badge ${product.is_active ? 'badge-success' : 'badge-warning'}`}>
                          {product.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-1">
                          <button className="action-btn action-btn-primary" onClick={() => handleEditProduct(product)} title="Edit">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button className="action-btn action-btn-danger" onClick={() => handleDeleteProduct(product)} title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalCount > 0 && (
              <div className="pagination-bar px-4 pb-3 shrink-0">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span>Show</span>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="input-field py-1 px-2 text-xs w-16"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <span className="hidden sm:inline whitespace-nowrap">
                    {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, totalCount)} of {totalCount}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="pag-btn">‹</button>
                  {getPageNumbers().map((page, i) => (
                    <button
                      key={i}
                      onClick={() => typeof page === 'number' && handlePageChange(page)}
                      disabled={page === '...'}
                      className={`pag-btn ${page === currentPage ? 'active' : ''} ${page === '...' ? 'dots' : ''}`}
                    >
                      {page}
                    </button>
                  ))}
                  <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="pag-btn">›</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      <ProductFormModal
        show={showFormModal}
        onHide={() => setShowFormModal(false)}
        onSubmit={handleFormSubmit}
        product={selectedProduct}
        categories={categories}
        loading={formLoading}
      />

      <DeleteConfirmModal
        show={showDeleteModal}
        onHide={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Product"
        message={`Are you sure you want to delete "${selectedProduct?.name}"? This action cannot be undone.`}
        loading={formLoading}
      />

      <ProductCSVImportModal
        show={showImportModal}
        onHide={() => setShowImportModal(false)}
        onImported={() => {
          dispatch(addNotification({ message: 'Products imported successfully', type: 'success' }));
          loadData();
        }}
      />
    </div>
  );
};

export default Products;
