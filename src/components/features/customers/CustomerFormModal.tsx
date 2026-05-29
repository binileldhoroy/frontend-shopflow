import React, { useState, useEffect } from 'react';
import Modal from '../../common/Modal/Modal';
import PhoneInput from '../../common/PhoneInput/PhoneInput';
import axiosInstance from '@api/axios';

interface CustomerFormModalProps {
  customer?: any;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
}

const CustomerFormModal: React.FC<CustomerFormModalProps> = ({ customer, onClose, onSave }) => {
  const [states, setStates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    country_code: '91',
    phone: '',
    address_line1: '',
    city: '',
    state: '',
    pincode: '',
    gstin: '',
    credit_limit: '',
    is_guest: false,
  });

  useEffect(() => {
    // Fetch states
    const fetchStates = async () => {
      try {
        const response = await axiosInstance.get('/api/settings/states/');
        setStates(response.data);
      } catch (error) {
        console.error('Error fetching states:', error);
      }
    };
    fetchStates();
  }, []);

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name || '',
        email: customer.email || '',
        country_code: customer.country_code || '91',
        phone: customer.phone || '',
        address_line1: customer.address_line1 || '',
        city: customer.city || '',
        state: customer.state || '',
        pincode: customer.pincode || '',
        gstin: customer.gstin || '',
        credit_limit: customer.credit_limit ? String(customer.credit_limit) : '',
        is_guest: customer.is_guest || false,
      });
    }
  }, [customer]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const submitData = {
        ...formData,
        state: formData.state || null,
        credit_limit: formData.credit_limit !== '' ? parseFloat(formData.credit_limit) : null,
      };
      await onSave(submitData);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      show={true}
      onHide={onClose}
      title={customer ? 'Edit Customer' : 'Add Customer'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">
              Name <span className="text-danger-600">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="label">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="input-field"
            />
          </div>

          <div>
            <label className="label">Phone</label>
            <PhoneInput
              phone={formData.phone}
              countryCode={formData.country_code}
              onPhoneChange={(v) => setFormData(prev => ({ ...prev, phone: v }))}
              onCountryCodeChange={(v) => setFormData(prev => ({ ...prev, country_code: v }))}
            />
          </div>

          <div>
            <label className="label">GSTIN</label>
            <input
              type="text"
              name="gstin"
              value={formData.gstin}
              onChange={handleChange}
              className="input-field"
              placeholder="22AAAAA0000A1Z5"
            />
          </div>

          <div className="md:col-span-2">
            <label className="label">Address</label>
            <input
              type="text"
              name="address_line1"
              value={formData.address_line1}
              onChange={handleChange}
              className="input-field"
            />
          </div>

          <div>
            <label className="label">City</label>
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleChange}
              className="input-field"
            />
          </div>

          <div>
            <label className="label">State</label>
            <select
              name="state"
              value={formData.state}
              onChange={handleChange}
              className="input-field"
            >
              <option value="">Select State</option>
              {states.map((state: any) => (
                <option key={state.id} value={state.name}>
                  {state.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Pincode</label>
            <input
              type="text"
              name="pincode"
              value={formData.pincode}
              onChange={handleChange}
              className="input-field"
              maxLength={6}
            />
          </div>

          <div>
            <label className="label">Credit Limit (₹)</label>
            <input
              type="number"
              name="credit_limit"
              value={formData.credit_limit}
              onChange={handleChange}
              className="input-field"
              min="0"
              step="0.01"
              placeholder="Leave blank for no limit"
            />
            <p className="text-xs text-gray-400 mt-1">Maximum credit allowed for buy-now-pay-later purchases</p>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              name="is_guest"
              id="is_guest"
              checked={formData.is_guest}
              onChange={handleChange}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <label htmlFor="is_guest" className="ml-2 text-sm text-gray-700">
              Guest Customer
            </label>
          </div>
        </div>

        <div className="flex gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary flex-1"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary flex-1"
            disabled={loading}
          >
            {loading ? 'Saving...' : customer ? 'Update' : 'Create'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CustomerFormModal;
