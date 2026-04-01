import React, { useState, useEffect } from 'react';
import { useAppDispatch } from '@hooks/useRedux';
import { categoryService } from '@api/services/category.service';
import { addNotification } from '@store/slices/uiSlice';
import { Plus, Search, Edit2, Trash2, Tag, Package } from 'lucide-react';
import CategoryFormModal from '@components/features/categories/CategoryFormModal';
import DeleteConfirmModal from '@components/common/DeleteConfirmModal/DeleteConfirmModal';

interface Category {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
  product_count?: number;
  created_at: string;
  updated_at: string;
}

const Categories: React.FC = () => {
  const dispatch = useAppDispatch();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const data = await categoryService.getAll();
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
      dispatch(addNotification({
        message: 'Failed to fetch categories',
        type: 'error',
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = async (data: any) => {
    try {
      setFormLoading(true);

      if (selectedCategory) {
        // Update
        await categoryService.update(selectedCategory.id, data);
        dispatch(addNotification({
          message: 'Category updated successfully',
          type: 'success',
        }));
      } else {
        // Create
        await categoryService.create(data);
        dispatch(addNotification({
          message: 'Category created successfully',
          type: 'success',
        }));
      }

      setShowFormModal(false);
      setSelectedCategory(null);
      fetchCategories();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message
        || error.response?.data?.error
        || error.message
        || 'Operation failed';

      dispatch(addNotification({
        message: errorMessage,
        type: 'error',
      }));
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = (category: Category) => {
    setSelectedCategory(category);
    setShowFormModal(true);
  };

  const handleDelete = (category: Category) => {
    setSelectedCategory(category);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedCategory) return;

    try {
      await categoryService.delete(selectedCategory.id);
      dispatch(addNotification({
        message: 'Category deleted successfully',
        type: 'success',
      }));
      setShowDeleteModal(false);
      setSelectedCategory(null);
      fetchCategories();
    } catch (error: any) {
      dispatch(addNotification({
        message: error.response?.data?.message || 'Failed to delete category',
        type: 'error',
      }));
    }
  };

  const handleAddNew = () => {
    setSelectedCategory(null);
    setShowFormModal(true);
  };

  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    category.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-header-icon">
            <Tag className="w-5 h-5" />
          </div>
          <div>
            <h1>Categories</h1>
            <p>Manage product categories</p>
          </div>
        </div>
        <button onClick={handleAddNew} className="btn btn-primary self-start">
          <Plus className="w-4 h-4 inline mr-1.5" />
          Add Category
        </button>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <div className="search-wrap flex-1 max-w-md">
          <Search className="search-icon" />
          <input
            type="text"
            placeholder="Search categories…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field"
          />
        </div>
        <span className="text-sm text-gray-500 ml-auto">
          {filteredCategories.length} {filteredCategories.length === 1 ? 'category' : 'categories'}
        </span>
      </div>

      {/* Categories Grid */}
      {loading ? (
        <div className="loading-center py-20">
          <div className="spinner" />
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="empty-state py-20">
          <div className="empty-state-icon"><Tag className="w-6 h-6" /></div>
          <p className="text-gray-700 font-medium">
            {searchTerm ? 'No categories found' : 'No categories yet'}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {searchTerm ? 'Try adjusting your search terms' : 'Get started by creating your first category'}
          </p>
          {!searchTerm && (
            <button onClick={handleAddNew} className="btn btn-primary mt-4">
              <Plus className="w-4 h-4 inline mr-1.5" />Add Category
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCategories.map((category) => (
            <div key={category.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Tag className="w-5 h-5 text-primary-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{category.name}</h3>
                  <span className={`badge ${category.is_active ? 'badge-success' : 'badge-secondary'} mt-1`}>
                    {category.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              {category.description && (
                <p className="text-sm text-gray-500 mb-3 line-clamp-2">{category.description}</p>
              )}

              <div className="flex items-center gap-1.5 text-sm text-gray-400 mb-4">
                <Package className="w-4 h-4" />
                <span>{category.product_count || 0} products</span>
              </div>

              <div className="flex gap-2 pt-3 border-t border-gray-100">
                <button
                  onClick={() => handleEdit(category)}
                  className="btn btn-outline-primary flex-1 text-sm"
                >
                  <Edit2 className="w-4 h-4 inline mr-1" />Edit
                </button>
                <button
                  onClick={() => handleDelete(category)}
                  className="action-btn action-btn-danger"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showFormModal && (
        <CategoryFormModal
          category={selectedCategory}
          onSubmit={handleFormSubmit}
          onClose={() => {
            setShowFormModal(false);
            setSelectedCategory(null);
          }}
          loading={formLoading}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedCategory && (
        <DeleteConfirmModal
          show={showDeleteModal}
          title="Delete Category"
          message={`Are you sure you want to delete "${selectedCategory.name}"? This action cannot be undone.`}
          onConfirm={handleConfirmDelete}
          onHide={() => {
            setShowDeleteModal(false);
            setSelectedCategory(null);
          }}
        />
      )}
    </div>
  );
};

export default Categories;
