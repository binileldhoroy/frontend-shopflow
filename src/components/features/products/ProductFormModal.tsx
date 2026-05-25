import React, { useState, useEffect, useRef } from 'react';
import Modal from '../../common/Modal/Modal';
import { Product, ProductFormData, ProductAttribute, Brand } from '../../../types/product.types';
import ProductPriceTiers from './ProductPriceTiers';
import { Tag, X, Plus, Trash2 } from 'lucide-react';
import { categoryService, Category as ServiceCategory } from '../../../api/services/category.service';
import { brandService } from '../../../api/services/brand.service';
import { priceTierService, PriceTier } from '../../../api/services/priceTier.service';

interface ProductFormModalProps {
  show: boolean;
  onHide: () => void;
  onSubmit: (data: ProductFormData) => void;
  product: Product | null;
  loading?: boolean;
}

const ProductFormModal: React.FC<ProductFormModalProps> = ({
  show,
  onHide,
  onSubmit,
  product,
  loading = false,
}) => {
  const [catInput, setCatInput] = useState('');
  const [catOptions, setCatOptions] = useState<ServiceCategory[]>([]);
  const [showCatDrop, setShowCatDrop] = useState(false);
  const catRef = useRef<HTMLDivElement>(null);

  const [brandInput, setBrandInput] = useState('');
  const [brandOptions, setBrandOptions] = useState<Brand[]>([]);
  const [showBrandDrop, setShowBrandDrop] = useState(false);
  const brandRef = useRef<HTMLDivElement>(null);

  const [attributes, setAttributes] = useState<ProductAttribute[]>([]);
  const [skuManuallyEdited, setSkuManuallyEdited] = useState(false);
  const skuSuffixRef = useRef<string>('');

  const [availableTiers, setAvailableTiers] = useState<PriceTier[]>([]);
  const [pendingTierRules, setPendingTierRules] = useState<Array<{ tier: number; tier_name: string; type: 'percentage' | 'fixed'; value: number }>>([]);
  const [newPendingTier, setNewPendingTier] = useState<number | ''>('');
  const [newPendingType, setNewPendingType] = useState<'percentage' | 'fixed'>('percentage');
  const [newPendingValue, setNewPendingValue] = useState('');

  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    sku: '',
    barcode: '',
    category: 0,
    brand: null,
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
        brand: product.brand ?? null,
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
      setAttributes(product.attributes ? [...product.attributes] : []);
    } else {
      setFormData({
        name: '',
        sku: '',
        barcode: '',
        category: 0,
        brand: null,
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
      setAttributes([]);
      setSkuManuallyEdited(false);
      skuSuffixRef.current = '';
    }
    setPendingTierRules([]);
    setNewPendingTier('');
    setNewPendingValue('');
    setNewPendingType('percentage');
  }, [product, show]);

  // Load available price tiers when adding a new product
  useEffect(() => {
    if (!product && show) {
      priceTierService.getAllTiers()
        .then(tiers => setAvailableTiers(tiers.filter(t => t.is_active)))
        .catch(() => {});
    }
  }, [product, show]);

  // Auto-generate SKU from product name for new products
  useEffect(() => {
    if (!product && !skuManuallyEdited && formData.name) {
      if (!skuSuffixRef.current) {
        skuSuffixRef.current = String(1000 + (Date.now() % 9000));
      }
      const prefix = formData.name.replace(/[^A-Z0-9]/gi, '').slice(0, 3).toUpperCase() || 'SKU';
      setFormData(prev => ({ ...prev, sku: `${prefix}-${skuSuffixRef.current}` }));
    }
  }, [formData.name, product, skuManuallyEdited]);

  // When editing, pre-fill category name
  useEffect(() => {
    if (product?.category) {
      categoryService.getById(Number(product.category)).then(cat => setCatInput(cat.name)).catch(() => {});
    } else {
      setCatInput('');
    }
  }, [product, show]);

  // Pre-fill brand name when editing
  useEffect(() => {
    if (product?.brand) {
      brandService.getById(Number(product.brand)).then(b => setBrandInput(b.name)).catch(() => {});
    } else {
      setBrandInput('');
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

  // Search brands via API with debounce
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const results = await brandService.getAll({ search: brandInput });
        setBrandOptions(results);
      } catch {}
    }, 300);
    return () => clearTimeout(timer);
  }, [brandInput]);

  // Click outside to close dropdowns
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (catRef.current && !catRef.current.contains(e.target as Node)) setShowCatDrop(false);
      if (brandRef.current && !brandRef.current.contains(e.target as Node)) setShowBrandDrop(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const addAttribute = () => setAttributes(prev => [...prev, { name: '', value: '' }]);

  const updateAttribute = (index: number, field: 'name' | 'value', val: string) => {
    setAttributes(prev => prev.map((a, i) => i === index ? { ...a, [field]: val } : a));
  };

  const removeAttribute = (index: number) => {
    setAttributes(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddPendingTierRule = () => {
    if (!newPendingTier || !newPendingValue) return;
    const tier = availableTiers.find(t => t.id === Number(newPendingTier));
    if (!tier) return;
    setPendingTierRules(prev => [...prev, {
      tier: tier.id,
      tier_name: tier.name,
      type: newPendingType,
      value: Number(newPendingValue),
    }]);
    setNewPendingTier('');
    setNewPendingValue('');
    setNewPendingType('percentage');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const submitData = {
      ...formData,
      cost_price: formData.cost_price === '' ? 0 : Number(formData.cost_price),
      selling_price: formData.selling_price === '' ? 0 : Number(formData.selling_price),
      gst_rate: formData.gst_rate === '' ? 0 : Number(formData.gst_rate),
      stock_quantity: formData.stock_quantity === '' ? 0 : Number(formData.stock_quantity),
      reorder_level: formData.reorder_level === '' ? 0 : Number(formData.reorder_level),
      attributes: attributes.filter(a => a.name.trim()),
      priceTierRules: pendingTierRules,
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

          {/* Brand */}
          <div>
            <label className="label">Brand</label>
            <div className="relative" ref={brandRef}>
              <input
                type="text"
                placeholder="Search brand…"
                value={brandInput}
                onChange={e => { setBrandInput(e.target.value); setShowBrandDrop(true); setFormData(prev => ({ ...prev, brand: null })); }}
                onFocus={() => setShowBrandDrop(true)}
                className="input-field pr-7"
              />
              {brandInput && (
                <button type="button" onClick={() => { setBrandInput(''); setFormData(prev => ({ ...prev, brand: null })); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              {showBrandDrop && brandOptions.length > 0 && (
                <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                  {brandOptions.map(b => (
                    <div
                      key={b.id}
                      className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 ${formData.brand === b.id ? 'bg-green-50 text-green-700 font-medium' : 'text-gray-700'}`}
                      onMouseDown={() => { setFormData(prev => ({ ...prev, brand: b.id })); setBrandInput(b.name); setShowBrandDrop(false); }}
                    >
                      {b.name}
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
              onChange={e => { setSkuManuallyEdited(true); handleChange(e); }}
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
              <option value="meter">Meter</option>
              <option value="feet">Feet</option>
              <option value="roll">Roll</option>
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

        {/* Attributes Section */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800 text-sm">
              Specifications / Attributes
              <span className="text-gray-400 font-normal ml-2 text-xs">(e.g. Size MM, Pressure Class, Volume)</span>
            </h3>
            <button type="button" onClick={addAttribute} className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium">
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
          </div>
          {attributes.length === 0 ? (
            <p className="text-xs text-gray-400 italic">No attributes added. Click Add to define specs like size or material.</p>
          ) : (
            <div className="space-y-2">
              {attributes.map((attr, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Name (e.g. Size (MM))"
                    value={attr.name}
                    onChange={e => updateAttribute(idx, 'name', e.target.value)}
                    className="input-field flex-1 text-sm py-1.5"
                  />
                  <input
                    type="text"
                    placeholder="Value (e.g. 25)"
                    value={attr.value}
                    onChange={e => updateAttribute(idx, 'value', e.target.value)}
                    className="input-field flex-1 text-sm py-1.5"
                  />
                  <button type="button" onClick={() => removeAttribute(idx)} className="text-red-400 hover:text-red-600 shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Price Tiers Section */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mt-4">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2 mb-2">
            <Tag className="w-4 h-4" />
            Price Tier Customization
          </h3>
          {product && product.id ? (
            <ProductPriceTiers productId={product.id} />
          ) : (
            <>
              <p className="text-sm text-gray-500 mb-3">
                Define specific pricing for customer groups. Rules override the tier's default percentage.
              </p>
              <div className="flex flex-wrap gap-2 items-end mb-3 p-3 bg-white rounded border border-gray-200 shadow-sm">
                <div className="flex-1 min-w-[140px]">
                  <label className="text-xs font-medium text-gray-700 mb-1 block">Tier Group</label>
                  <select
                    className="input-field py-1 text-sm"
                    value={newPendingTier}
                    onChange={e => setNewPendingTier(Number(e.target.value))}
                  >
                    <option value="">Select Tier</option>
                    {availableTiers.filter(t => !pendingTierRules.some(r => r.tier === t.id)).map(t => (
                      <option key={t.id} value={t.id}>{t.name} (Default: {t.default_percentage}%)</option>
                    ))}
                  </select>
                </div>
                <div className="w-[120px]">
                  <label className="text-xs font-medium text-gray-700 mb-1 block">Type</label>
                  <select
                    className="input-field py-1 text-sm"
                    value={newPendingType}
                    onChange={e => setNewPendingType(e.target.value as 'percentage' | 'fixed')}
                  >
                    <option value="percentage">Percentage (+/-)</option>
                    <option value="fixed">Fixed Price (₹)</option>
                  </select>
                </div>
                <div className="w-[100px]">
                  <label className="text-xs font-medium text-gray-700 mb-1 block">Value</label>
                  <input
                    type="number"
                    className="input-field py-1 text-sm"
                    placeholder={newPendingType === 'percentage' ? '5.0' : '500'}
                    value={newPendingValue}
                    onChange={e => setNewPendingValue(e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddPendingTierRule}
                  disabled={!newPendingTier || !newPendingValue}
                  className="btn btn-primary py-1 px-3 h-[34px]"
                >
                  <Plus className="w-4 h-4 mr-1" /> Add
                </button>
              </div>
              {pendingTierRules.length === 0 ? (
                <div className="text-center py-3 text-gray-400 text-sm">
                  No custom rules. Default tier percentages will apply.
                </div>
              ) : (
                <div className="bg-white border rounded overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-600 font-medium border-b">
                      <tr>
                        <th className="p-2 pl-3">Tier Name</th>
                        <th className="p-2">Rule</th>
                        <th className="p-2 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {pendingTierRules.map((rule, i) => (
                        <tr key={i}>
                          <td className="p-2 pl-3 font-medium">{rule.tier_name}</td>
                          <td className="p-2">
                            {rule.type === 'fixed' ? (
                              <span className="text-primary-600 font-bold">₹{rule.value}</span>
                            ) : (
                              <span className={Number(rule.value) >= 0 ? 'text-success-600' : 'text-danger-600'}>
                                {Number(rule.value) > 0 ? '+' : ''}{rule.value}%
                              </span>
                            )}
                          </td>
                          <td className="p-2 text-right">
                            <button
                              type="button"
                              onClick={() => setPendingTierRules(prev => prev.filter((_, idx) => idx !== i))}
                              className="text-gray-400 hover:text-danger-500 p-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </form>
    </Modal>
  );
};

export default ProductFormModal;
