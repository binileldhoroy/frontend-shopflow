import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal/Modal';
import PhoneInput from '../common/PhoneInput/PhoneInput';
import { Supplier, SupplierFormData } from '../../types/supplier.types';

interface SupplierFormModalProps {
  show: boolean;
  onHide: () => void;
  onSubmit: (data: SupplierFormData) => void;
  supplier: Supplier | null;
  loading?: boolean;
}

type FieldErrors = Partial<Record<'name' | 'phone' | 'address_line1' | 'city' | 'state' | 'pincode', string>>;

const SupplierFormModal: React.FC<SupplierFormModalProps> = ({
  show,
  onHide,
  onSubmit,
  supplier,
  loading = false,
}) => {
  const [formData, setFormData] = useState<SupplierFormData>({
    name: '',
    contact_person: '',
    email: '',
    country_code: '91',
    phone: '',
    alternate_country_code: '91',
    alternate_phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    pincode: '',
    gstin: '',
    payment_terms: '',
    is_active: true,
    notes: '',
  });
  const [errors, setErrors] = useState<FieldErrors>({});

  useEffect(() => {
    setErrors({});
    if (supplier) {
      setFormData({
        name: supplier.name,
        contact_person: supplier.contact_person || '',
        email: supplier.email || '',
        country_code: supplier.country_code || '91',
        phone: supplier.phone,
        alternate_country_code: supplier.alternate_country_code || '91',
        alternate_phone: supplier.alternate_phone || '',
        address_line1: supplier.address_line1,
        address_line2: supplier.address_line2 || '',
        city: supplier.city,
        state: supplier.state,
        pincode: supplier.pincode,
        gstin: supplier.gstin || '',
        payment_terms: supplier.payment_terms || '',
        is_active: supplier.is_active,
        notes: supplier.notes || '',
      });
    } else {
      setFormData({
        name: '',
        contact_person: '',
        email: '',
        country_code: '91',
        phone: '',
        alternate_country_code: '91',
        alternate_phone: '',
        address_line1: '',
        address_line2: '',
        city: '',
        state: '',
        pincode: '',
        gstin: '',
        payment_terms: '',
        is_active: true,
        notes: '',
      });
    }
  }, [supplier, show]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
    if (errors[name as keyof FieldErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const e: FieldErrors = {};
    if (!formData.name.trim()) e.name = 'Company name is required';
    if (!formData.phone.trim()) e.phone = 'Phone number is required';
    else if (formData.phone.length < 7) e.phone = 'Enter a valid phone number';
    if (!formData.address_line1.trim()) e.address_line1 = 'Address is required';
    if (!formData.city.trim()) e.city = 'City is required';
    if (!formData.state.trim()) e.state = 'State is required';
    if (!formData.pincode.trim()) e.pincode = 'Pincode is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    onSubmit(formData);
  };

  return (
    <Modal
      show={show}
      onHide={onHide}
      title={supplier ? 'Edit Supplier' : 'Add Supplier'}
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
            {loading ? 'Saving...' : 'Save Supplier'}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Company Name *</label>
            <input
              type="text"
              name="name"
              className={`input-field ${errors.name ? 'border-red-500' : ''}`}
              value={formData.name}
              onChange={handleChange}
            />
            {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
          </div>
          <div>
            <label className="label">Contact Person</label>
            <input
              type="text"
              name="contact_person"
              className="input-field"
              value={formData.contact_person}
              onChange={handleChange}
            />
          </div>
          <div>
            <label className="label">Phone *</label>
            <PhoneInput
              phone={formData.phone}
              countryCode={formData.country_code ?? '91'}
              onPhoneChange={(v) => { setFormData(prev => ({ ...prev, phone: v })); if (errors.phone) setErrors(prev => ({ ...prev, phone: undefined })); }}
              onCountryCodeChange={(v) => setFormData(prev => ({ ...prev, country_code: v }))}
              hasError={!!errors.phone}
            />
            {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone}</p>}
          </div>
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              name="email"
              className="input-field"
              value={formData.email}
              onChange={handleChange}
            />
          </div>
        </div>

        {/* Address */}
        <div>
          <h4 className="font-semibold text-gray-700 mb-2">Address</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="label">Address Line 1 *</label>
              <input
                type="text"
                name="address_line1"
                className={`input-field ${errors.address_line1 ? 'border-red-500' : ''}`}
                value={formData.address_line1}
                onChange={handleChange}
              />
              {errors.address_line1 && <p className="mt-1 text-xs text-red-500">{errors.address_line1}</p>}
            </div>
            <div className="md:col-span-2">
              <label className="label">Address Line 2</label>
              <input
                type="text"
                name="address_line2"
                className="input-field"
                value={formData.address_line2}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="label">City *</label>
              <input
                type="text"
                name="city"
                className={`input-field ${errors.city ? 'border-red-500' : ''}`}
                value={formData.city}
                onChange={handleChange}
              />
              {errors.city && <p className="mt-1 text-xs text-red-500">{errors.city}</p>}
            </div>
            <div>
              <label className="label">State *</label>
              <input
                type="text"
                name="state"
                className={`input-field ${errors.state ? 'border-red-500' : ''}`}
                value={formData.state}
                onChange={handleChange}
              />
              {errors.state && <p className="mt-1 text-xs text-red-500">{errors.state}</p>}
            </div>
            <div>
              <label className="label">Pincode *</label>
              <input
                type="text"
                name="pincode"
                className={`input-field ${errors.pincode ? 'border-red-500' : ''}`}
                value={formData.pincode}
                onChange={handleChange}
              />
              {errors.pincode && <p className="mt-1 text-xs text-red-500">{errors.pincode}</p>}
            </div>
          </div>
        </div>

        {/* Business Details */}
        <div>
          <h4 className="font-semibold text-gray-700 mb-2">Business Details</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">GSTIN</label>
              <input
                type="text"
                name="gstin"
                className="input-field"
                value={formData.gstin}
                onChange={handleChange}
                placeholder="GST Identification Number"
              />
            </div>
            <div>
              <label className="label">Payment Terms</label>
              <input
                type="text"
                name="payment_terms"
                className="input-field"
                value={formData.payment_terms}
                onChange={handleChange}
                placeholder="e.g. Net 30"
              />
            </div>
          </div>
        </div>

        {/* Notes & Status */}
        <div>
          <label className="label">Notes</label>
          <textarea
            className="input-field"
            name="notes"
            rows={2}
            value={formData.notes}
            onChange={handleChange}
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
            Active Supplier
          </label>
        </div>
      </form>
    </Modal>
  );
};

export default SupplierFormModal;
