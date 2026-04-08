import React, { useState, useEffect, useRef } from 'react';
import Modal from '../../common/Modal/Modal';
import { Product, Category, ProductFormData } from '../../../types/product.types';
import ProductPriceTiers from './ProductPriceTiers';
import { Tag, X } from 'lucide-react';
import { categoryService } from '../../../api/services/category.service';

interface ProductFormModalProps {
  show: boolean;
  onHide: () => void;
  onSubmit: (data: ProductFormData) => void;
  product: Product | null;
  categories: Category[];
  loading?: boolean;
}

const ProductFormModal: React.FC<ProductFormModalProps> = ({
  show,
  onHide,
  onSubmit,
  product,
  categories,
  loading = false,
}) => {
  const [catInput, setCatInput] = useState('');
  const [catOptions, setCatOptions] = useState<Category[]>([]);
  const [showCatDrop, setShowCatDrop] = useState(false);
  const catRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    sku: '',
    barcode: '',
    category: 0,
    hsn_code: '',
    unit: 'piece',
    cost_price: '' as any,
    selling_price: '' as any,
    gst_rate: '18',
    tax_included: false,
    stock_quantity: '' as any,
    reorder_level: '' as any,
    description: '',
    image: null,
    is_active: true,
  });

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        sku: product.sku || '',
        barcode: product.barcode || '',
        category: product.category || 0,
        hsn_code: product.hsn_code || '',
        unit: product.unit || 'piece',
        cost_price: product.cost_price || 0,
        selling_price: product.selling_price || 0,
        gst_rate: Number(product.gst_rate) || 0,
        tax_included: product.tax_included || false,
        stock_quantity: product.stock_quantity || 0,
        reorder_level: product.reorder_level || 0,
        description: product.description || '',
        image: product.image || null,
        is_active: product.is_active ?? true,
      });
    } else {
      setFormData({
        name: '',
        sku: '',
        barcode: '',
        category: 0,
        hsn_code: '',
        unit: 'piece',
        cost_price: '' as any,
        selling_price: '' as any,
        gst_rate: '18',
        tax_included: false,
        stock_quantity: '' as any,
        reorder_level: '' as any,
        description: '',
        image: null,
        is_active: true,
      });
    }
  }, [product, show]);

  // When editing, pre-fill category name
  useEffect(() => {
    if (product?.category) {
      categoryService.getById(Number(product.category)).then(cat => setCatInput(cat.name)).catch(() => {});
    } else {
      setCatInput('');
    }
  }, [product, show]);

  // Search categories via API with debounce
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const results = await categoryService.getAll({ search: catInput });
        setCatOptions(results);
      } catch {}
    }, 300);
    return () => clearTimeout(timer);
  }, [catInput]);

  // Click outside to close dropdown
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (catRef.current && !catRef.current.contains(e.target as Node)) {
        setShowCatDrop(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Convert empty strings to 0 for number fields before submitting
    const submitData = {
      ...formData,
      cost_price: formData.cost_price === '' ? 0 : Number(formData.cost_price),
      selling_price: formData.selling_price === '' ? 0 : Number(formData.selling_price),
      gst_rate: formData.gst_rate === '' ? 0 : Number(formData.gst_rate),
      stock_quantity: formData.stock_quantity === '' ? 0 : Number(formData.stock_quantity),
      reorder_level: formData.reorder_level === '' ? 0 : Number(formData.reorder_level),
    };

    onSubmit(submitData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox'
        ? (e.target as HTMLInputElement).checked
        : type === 'number'
        ? value === '' ? '' : parseFloat(value)
        : value,
    }));
  };

  return (
    <Modal
      show={show}
      onHide={onHide}
      title={product ? 'Edit Product' : 'Add Product'}
      size="lg"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onHide} disabled={loading}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save'}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Row 1: Product Name | Category */}
          <div>
            <label className="label">Product Name *</label>
            <input
              type="text"
              name="name"
              className="input-field"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <label className="label">Category *</label>
            <div className="relative" ref={catRef}>
              <input
                type="text"
                placeholder="Search category…"
                value={catInput}
                onChange={e => { setCatInput(e.target.value); setShowCatDrop(true); setFormData(prev => ({ ...prev, category: 0 })); }}
                onFocus={() => setShowCatDrop(true)}
                className="input-field pr-7"
                required={!formData.category}
              />
              {catInput && (
                <button type="button" onClick={() => { setCatInput(''); setFormData(prev => ({ ...prev, category: 0 })); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              {showCatDrop && catOptions.length > 0 && (
                <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                  {catOptions.map(cat => (
                    <div
                      key={cat.id}
                      className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 ${formData.category === cat.id ? 'bg-green-50 text-green-700 font-medium' : 'text-gray-700'}`}
                      onMouseDown={() => { setFormData(prev => ({ ...prev, category: cat.id })); setCatInput(cat.name); setShowCatDrop(false); }}
                    >
                      {cat.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Row 2: SKU | Barcode */}
          <div>
            <label className="label">SKU *</label>
            <input
              type="text"
              name="sku"
              className="input-field"
              value={formData.sku}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <label className="label">Barcode</label>
            <input
              type="text"
              name="barcode"
              className="input-field"
              value={formData.barcode}
              onChange={handleChange}
            />
          </div>

          {/* Row 2.5: HSN Code | Unit */}
          <div>
            <label className="label">HSN Code</label>
            <input
              type="text"
              name="hsn_code"
              className="input-field"
              value={formData.hsn_code}
              onChange={handleChange}
              placeholder="Enter HSN code"
              maxLength={8}
            />
          </div>
          <div>
            <label className="label">Unit *</label>
            <select
              name="unit"
              className="input-field"
              value={formData.unit}
              onChange={handleChange}
              required
            >
              <option value="piece">Piece</option>
              <option value="kg">Kilogram</option>
              <option value="gram">Gram</option>
              <option value="liter">Liter</option>
              <option value="ml">Milliliter</option>
              <option value="dozen">Dozen</option>
              <option value="pack">Pack</option>
              <option value="box">Box</option>
            </select>
          </div>

          {/* Row 3: Cost Price | Selling Price */}
          <div>
            <label className="label">Cost Price *</label>
            <input
              type="number"
              name="cost_price"
              className="input-field"
              value={formData.cost_price}
              onChange={handleChange}
              placeholder="Enter cost price"
              step="0.01"
              min="0"
              required
            />
          </div>
          <div>
            <label className="label">Selling Price *</label>
            <input
              type="number"
              name="selling_price"
              className="input-field"
              value={formData.selling_price}
              onChange={handleChange}
              placeholder="Enter selling price"
              step="0.01"
              min="0"
              required
            />
          </div>

          {/* Row 4: GST Rate | Stock Quantity */}
          <div>
            <label className="label">GST Rate (%) *</label>
            <select
              name="gst_rate"
              className="input-field"
              value={formData.gst_rate}
              onChange={handleChange}
              required
            >
              <option value="0">0%</option>
              <option value="5">5%</option>
              <option value="12">12%</option>
              <option value="18">18%</option>
              <option value="28">28%</option>
            </select>
          </div>
          <div>
            <label className="label">Stock Quantity *</label>
            <input
              type="number"
              name="stock_quantity"
              className="input-field"
              value={formData.stock_quantity}
              onChange={handleChange}
              placeholder="Enter stock quantity"
              min="0"
              required
            />
          </div>
          <div>
            <label className="label">Reorder Level *</label>
            <input
              type="number"
              name="reorder_level"
              className="input-field"
              value={formData.reorder_level}
              onChange={handleChange}
              placeholder="Enter reorder level"
              min="0"
              required
            />
          </div>
        </div>

        <div>
          <label className="label">Description</label>
          <textarea
            name="description"
            className="input-field"
            rows={3}
            value={formData.description}
            onChange={handleChange}
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            name="tax_included"
            id="tax_included"
            checked={formData.tax_included}
            onChange={handleChange}
            className="w-4 h-4 text-primary-600 rounded"
          />
          <label htmlFor="tax_included" className="text-sm text-gray-700">
            Tax Included in Price
          </label>
        </div>

        <div>
          <label className="label">Product Image</label>
          {/* Image Preview Area */}
          {formData.image && (
            <div style={{ marginBottom: '10px' }}>
              <img
                // Check if it's a File object (new upload) or a string (existing URL)
                src={typeof formData.image === 'string' ? formData.image : URL.createObjectURL(formData.image)}
                alt="Product Preview"
                style={{ width: '120px', height: '120px', objectFit: 'cover', borderRadius: '4px' }}
              />
            </div>
          )}

          <input
            type="file"
            name="image"
            className="input-field"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0] || null;
              setFormData(prev => ({ ...prev, image: file }));
            }}
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            name="is_active"
            id="is_active"
            checked={formData.is_active}
            onChange={handleChange}
            className="w-4 h-4 text-primary-600 rounded"
          />
          <label htmlFor="is_active" className="text-sm text-gray-700">
            Active
          </label>
        </div>

        {/* Price Tiers Section (Only shown for existing products) */}
        {/* Price Tiers Section */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mt-4">
             <h3 className="font-semibold text-gray-800 flex items-center gap-2 mb-2">
                 <Tag className="w-4 h-4" />
                 Price Tier Customization
             </h3>

             {product && product.id ? (
                 <ProductPriceTiers productId={product.id} />
             ) : (
                 <p className="text-sm text-gray-500 italic">
                     Please save the product first to configure specific price tier rules.
                 </p>
             )}
        </div>
      </form>
    </Modal>
  );
};

export default ProductFormModal;
