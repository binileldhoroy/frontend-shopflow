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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Tag className="w-7 h-7 text-primary-600" />
            Categories
          </h1>
          <p className="text-gray-600 mt-1">Manage product categories</p>
        </div>
        <button
          onClick={handleAddNew}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Category
        </button>
      </div>

      {/* Search and Filters */}
      <div className="card">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <div className="text-sm text-gray-600">
            {filteredCategories.length} {filteredCategories.length === 1 ? 'category' : 'categories'}
          </div>
        </div>
      </div>

      {/* Categories Grid */}
      {loading ? (
        <div className="card text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="text-gray-600 mt-4">Loading categories...</p>
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="card text-center py-12">
          <Tag className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {searchTerm ? 'No categories found' : 'No categories yet'}
          </h3>
          <p className="text-gray-600 mb-6">
            {searchTerm
              ? 'Try adjusting your search terms'
              : 'Get started by creating your first category'}
          </p>
          {!searchTerm && (
            <button
              onClick={handleAddNew}
              className="btn btn-primary inline-flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add Category
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCategories.map((category) => (
            <div key={category.id} className="card hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                    <Tag className="w-6 h-6 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{category.name}</h3>
                    <span className={`badge ${category.is_active ? 'badge-success' : 'badge-secondary'} mt-1`}>
                      {category.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>

              {category.description && (
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {category.description}
                </p>
              )}

              <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                <Package className="w-4 h-4" />
                <span>{category.product_count || 0} products</span>
              </div>

              <div className="flex gap-2 pt-4 border-t border-gray-200">
                <button
                  onClick={() => handleEdit(category)}
                  className="btn btn-outline-primary flex-1 flex items-center justify-center gap-2"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(category)}
                  className="btn btn-outline-danger flex items-center justify-center gap-2 px-4"
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
