import React, { useState, useEffect, useCallback } from 'react';
import { productService, categoryService } from '@api/services/product.service';
import { Product, Category, ProductFormData } from '../../types/product.types';
import ProductFormModal from '@components/features/products/ProductFormModal';
import DeleteConfirmModal from '@components/common/DeleteConfirmModal/DeleteConfirmModal';
import { useAppDispatch } from '@hooks/useRedux';
import { addNotification } from '@store/slices/uiSlice';
import { Package, Plus, Search, Edit2, Trash2, Inbox, AlertTriangle } from 'lucide-react';

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

        // Handle file separately
        if (key === "image" && value instanceof File) {
          formData.append("image", value);
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="w-8 h-8" />
            Products
          </h1>
          <p className="text-gray-600 mt-1">Manage your product inventory</p>
        </div>
        <button className="btn btn-primary" onClick={handleAddProduct}>
          <Plus className="w-5 h-5 inline mr-2" />
          Add Product
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              className="input-field pl-10"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="md:col-span-3">
          <select
            className="input-field"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <select
            className="input-field"
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
          >
            <option value="">All Stock</option>
            <option value="in">In Stock</option>
            <option value="low">Low Stock</option>
            <option value="out">Out of Stock</option>
          </select>
        </div>
        <div className="md:col-span-3 flex items-center justify-end">
          <span className="text-gray-600">
            {products.length} product{products.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Products Table */}
      <div className="card flex flex-col min-h-0 overflow-hidden" style={{ height: 'calc(100vh - 320px)' }}>
        {loading ? (
          <div className="flex justify-center items-center py-20 flex-1">
            <div className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12 flex-1">
            <Inbox className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No products found</p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-x-auto overflow-y-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">SKU</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Name</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Category</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">HSN Code</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Unit</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">Cost Price</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">Selling Price</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">GST Rate</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-700">Stock</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-700">Status</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product: Product) => (
                  <tr key={product.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-900">
                      <strong>{product.sku}</strong>
                      {product.barcode && (
                        <div className="text-gray-500 text-xs font-normal">{product.barcode}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-600">{product.name}</td>
                    <td className="py-3 px-4">
                      <span className="badge badge-secondary">
                        {getCategoryName(product.category)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{product.hsn_code || '-'}</td>
                    <td className="py-3 px-4">
                      <span className="text-gray-600 capitalize">{product.unit || 'piece'}</span>
                    </td>
                    <td className="py-3 px-4 text-right text-gray-600">₹{parseFloat(String(product.cost_price || 0)).toFixed(2)}</td>
                    <td className="py-3 px-4 text-right font-medium text-gray-900">
                      ₹{parseFloat(String(product.selling_price || 0)).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="badge badge-info">{product.gst_rate || 0}%</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`badge ${
                        product.stock_quantity === 0 ? 'badge-danger' :
                        product.stock_quantity <= product.reorder_level ? 'badge-warning' :
                        'badge-success'
                      }`}>
                        {product.stock_quantity} units
                      </span>
                      {product.stock_quantity <= product.reorder_level && product.stock_quantity > 0 && (
                        <div className="text-warning-600 text-xs mt-1 flex items-center gap-1 justify-center font-medium">
                          <AlertTriangle className="w-3 h-3" />
                          Low stock
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`badge ${product.is_active ? 'badge-success' : 'badge-secondary'}`}>
                        {product.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                          onClick={() => handleEditProduct(product)}
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          className="p-2 text-danger-600 hover:bg-danger-50 rounded-lg transition-colors"
                          onClick={() => handleDeleteProduct(product)}
                          title="Delete"
                        >
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
            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 mt-4 border-t border-gray-200 shrink-0">
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
    </div>
  );
};

export default Products;
