import React, { useState } from 'react';
import Modal from '../../common/Modal/Modal';
import { StockItem, StockAdjustmentFormData, StockReasonCode } from '../../../types/inventory.types';

const REASON_CODE_OPTIONS: { value: StockReasonCode; label: string }[] = [
  { value: 'damage', label: 'Damage' },
  { value: 'theft', label: 'Theft / Loss' },
  { value: 'internal_use', label: 'Internal Use' },
  { value: 'opening_stock', label: 'Opening Stock Entry' },
  { value: 'correction', label: 'Stock Count Correction' },
  { value: 'expiry', label: 'Expired Goods' },
  { value: 'return_supplier', label: 'Return to Supplier' },
];

interface StockAdjustmentModalProps {
  show: boolean;
  onHide: () => void;
  onSubmit: (data: StockAdjustmentFormData) => void;
  product: StockItem | null;
  loading?: boolean;
}

const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = ({
  show,
  onHide,
  onSubmit,
  product,
  loading = false,
}) => {
  const [formData, setFormData] = useState<StockAdjustmentFormData>({
    product: product?.product || 0,
    movement_type: 'purchase',
    quantity: '' as any,
    reason_code: undefined,
    reference_number: '',
    notes: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'quantity' ? (value === '' ? '' : Number(value)) : value || undefined,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      product: product?.product || 0,
      quantity: String(formData.quantity) === '' ? 0 : Number(formData.quantity),
    });
  };

  const isAdjustment = formData.movement_type === 'adjustment';

  if (!product) return null;

  return (
    <Modal
      show={show}
      onHide={onHide}
      title="Adjust Stock"
      size="md"
      footer={
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onHide}
            className="btn btn-secondary"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="stock-adjustment-form"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? 'Adjusting...' : 'Adjust Stock'}
          </button>
        </div>
      }
    >
      <form id="stock-adjustment-form" onSubmit={handleSubmit} className="space-y-4">
        {/* Product Name (Read-only) */}
        <div>
          <label className="label">Product</label>
          <input
            type="text"
            className="input-field bg-gray-50"
            value={product.product_name}
            disabled
          />
        </div>

        {/* Current Stock Display */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Current Stock:</span>
            <span className={`text-lg font-bold ${
              product.is_out_of_stock ? 'text-danger-600' :
              product.is_low_stock ? 'text-warning-600' :
              'text-success-600'
            }`}>
              {product.quantity} units
            </span>
          </div>
          <div className="flex justify-between items-center mt-2">
            <span className="text-sm text-gray-600">Reorder Level:</span>
            <span className="text-sm font-medium text-gray-900">{product.reorder_level} units</span>
          </div>
        </div>

        {/* Movement Type */}
        <div>
          <label className="label">Movement Type *</label>
          <select
            name="movement_type"
            className="input-field"
            value={formData.movement_type}
            onChange={handleChange}
            required
          >
            <option value="purchase">Purchase (Stock In)</option>
            <option value="sale">Sale (Stock Out)</option>
            <option value="adjustment">Adjustment</option>
            <option value="return">Return</option>
            <option value="damage">Damage/Loss</option>
          </select>
        </div>

        {/* Reason Code — required only for Adjustment */}
        {isAdjustment && (
          <div>
            <label className="label">Reason *</label>
            <select
              name="reason_code"
              className="input-field"
              value={formData.reason_code || ''}
              onChange={handleChange}
              required={isAdjustment}
            >
              <option value="">Select a reason...</option>
              {REASON_CODE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        )}

        {/* Quantity */}
        <div>
          <label className="label">Quantity *</label>
          <input
            type="number"
            name="quantity"
            className="input-field"
            value={formData.quantity}
            onChange={handleChange}
            min="1"
            placeholder="Enter quantity"
            required
          />
        </div>

        {/* Reference Number */}
        <div>
          <label className="label">Reference Number</label>
          <input
            type="text"
            name="reference_number"
            className="input-field"
            value={formData.reference_number}
            onChange={handleChange}
            placeholder="e.g., PO-123, INV-456"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="label">Notes</label>
          <textarea
            name="notes"
            className="input-field"
            rows={3}
            value={formData.notes}
            onChange={handleChange}
            placeholder="Additional details..."
          />
        </div>
      </form>
    </Modal>
  );
};

export default StockAdjustmentModal;
