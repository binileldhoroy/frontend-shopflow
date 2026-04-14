import React, { useState, useEffect } from 'react';
import Modal from '../../common/Modal/Modal';
import { Company } from '../../../types/company.types';
import { StateMaster } from '../../../types/state.types';
import { stateService } from '../../../api/services/state.service';

interface CompanyFormModalProps {
  show: boolean;
  onHide: () => void;
  onSubmit: (data: FormData) => void;
  company: Company | null;
  loading?: boolean;
}

const CompanyFormModal: React.FC<CompanyFormModalProps> = ({
  show,
  onHide,
  onSubmit,
  company,
  loading = false,
}) => {
  const [formData, setFormData] = useState({
    company_name: '',
    email: '',
    phone: '',
    address: '',
    address_line1: '',
    city: '',
    state: '',
    pincode: '',
    gstin: '',
    pan: '',
    bank_name: '',
    branch: '',
    ifsc_code: '',
    account_number: '',
    authorized_signatory_name: '',
    username: '',
    password: '',
    is_active: true,
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [states, setStates] = useState<StateMaster[]>([]);

  // Fetch states on mount
  useEffect(() => {
    const fetchStates = async () => {
      try {
        const statesData = await stateService.getAll();
        setStates(statesData);
      } catch (error) {
        console.error('Error fetching states:', error);
      }
    };
    fetchStates();
  }, []);

  useEffect(() => {
    if (company) {
      setFormData({
        company_name: company.company_name || '',
        email: company.email || '',
        phone: company.phone || '',
        address: '', // Address not directly on company object anymore, use lines
        address_line1: company.address_line1 || '',
        city: company.city || '',
        state: company.state_name || '', // Use state_name for display
        pincode: company.pincode || '',
        gstin: company.gstin || '',
        pan: company.pan || '',
        bank_name: company.bank_name || '',
        branch: company.branch || '',
        ifsc_code: company.ifsc_code || '',
        account_number: company.account_number || '',
        authorized_signatory_name: company.authorized_signatory_name || '',
        username: company.admin_username || '', // Display existing admin username
        password: '', // Empty password for edit mode (only if changing)
        is_active: company.is_active ?? true,
      });
    } else {
      setFormData({
        company_name: '',
        email: '',
        phone: '',
        address: '',
        address_line1: '',
        city: '',
        state: '',
        pincode: '',
        gstin: '',
        pan: '',
        bank_name: '',
        branch: '',
        ifsc_code: '',
        account_number: '',
        authorized_signatory_name: '',
        username: '',
        password: '',
        is_active: true,
      });
    }
    setLogoFile(null);
  }, [company, show]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = new FormData();

    // Find the state ID from the state name
    const selectedState = states.find(s => s.name === formData.state);

    // Add all fields except username/password and state
    Object.entries(formData).forEach(([key, value]) => {
      // Skip username and password for editing, only include for new companies
      // Include username for all cases (so it can be sent if needed, though backend ignores on edit mostly unless we change it)
      // Actually backend doesn't use username on edit unless creating new user fallback.
      if (key === 'username') data.append(key, value.toString());
      if (key === 'password' && value) data.append(key, value.toString());

      // Skip state here, we'll add it separately with the ID
      if (key === 'state') {
        return;
      }

      data.append(key, value.toString());
    });

    // Add state ID instead of state name
    if (selectedState) {
      data.append('state', selectedState.id.toString());
    }

    // Add logo file if selected
    if (logoFile) {
      data.append('logo', logoFile, logoFile.name);
    }

    // Debug: Log what we're sending
    console.log('Form data being sent:');
    for (let [key, value] of data.entries()) {
      console.log(`${key}:`, value);
    }

    onSubmit(data);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  return (
    <Modal
      show={show}
      onHide={onHide}
      title={company ? 'Edit Company' : 'Add Company'}
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
          <div>
            <label className="label">Company Name *</label>
            <input
              type="text"
              name="company_name"
              className="input-field"
              value={formData.company_name}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <label className="label">Email *</label>
            <input
              type="email"
              name="email"
              className="input-field"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <label className="label">Phone *</label>
            <input
              type="tel"
              name="phone"
              className="input-field"
              value={formData.phone}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <label className="label">GSTIN</label>
            <input
              type="text"
              name="gstin"
              className="input-field"
              value={formData.gstin}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <h4 className="font-semibold text-blue-900 mb-2">Admin User Credentials</h4>
          <p className="text-sm text-blue-700">
            {company ? 'Update password for company administrator' : 'Create login credentials for the company administrator'}
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Username {company ? '(Read Only)' : '*'}</label>
            <input
              type="text"
              name="username"
              className="input-field bg-gray-50"
              value={formData.username}
              onChange={handleChange}
              required={!company || !company.admin_username}
              readOnly={!!company && !!company.admin_username}
              disabled={!!company && !!company.admin_username}
              placeholder={company && !company.admin_username ? "Create admin username" : "Admin username"}
            />
          </div>
          <div>
            <label className="label">{company ? 'New Password' : 'Password *'}</label>
            <input
              type="password"
              name="password"
              className="input-field"
              value={formData.password}
              onChange={handleChange}
              required={!company}
              placeholder={company ? "Leave empty to keep current" : "Admin password"}
              minLength={6}
            />
          </div>
        </div>

        {/* Address Section */}
        <div className="border-t pt-4 mt-4">
          <h4 className="font-semibold text-gray-900 mb-3">Address Information</h4>
          <div className="space-y-4">
            <div>
              <label className="label">Address Line 1 *</label>
              <input
                type="text"
                name="address_line1"
                className="input-field"
                value={formData.address_line1}
                onChange={handleChange}
                required
                placeholder="Street address, building name"
              />
            </div>
            <div>
              <label className="label">Address (Additional)</label>
              <textarea
                name="address"
                className="input-field"
                rows={2}
                value={formData.address}
                onChange={handleChange}
                placeholder="Additional address details"
              />
            </div>
          </div>
        </div>

        {/* Bank Details Section */}
        <div className="border-t pt-4 mt-4">
          <h4 className="font-semibold text-gray-900 mb-3">Bank Details</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Bank Name</label>
              <input
                type="text"
                name="bank_name"
                className="input-field"
                value={formData.bank_name}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="label">Branch</label>
              <input
                type="text"
                name="branch"
                className="input-field"
                value={formData.branch}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="label">IFSC Code</label>
              <input
                type="text"
                name="ifsc_code"
                className="input-field"
                value={formData.ifsc_code}
                onChange={handleChange}
                placeholder="e.g., SBIN0001234"
              />
            </div>
            <div>
              <label className="label">Account Number</label>
              <input
                type="text"
                name="account_number"
                className="input-field"
                value={formData.account_number}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        {/* Other Details */}
        <div className="border-t pt-4 mt-4">
          <h4 className="font-semibold text-gray-900 mb-3">Other Details</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">PAN Number</label>
              <input
                type="text"
                name="pan"
                className="input-field"
                value={formData.pan}
                onChange={handleChange}
                placeholder="e.g., ABCDE1234F"
              />
            </div>
            <div>
              <label className="label">Authorized Signatory Name *</label>
              <input
                type="text"
                name="authorized_signatory_name"
                className="input-field"
                value={formData.authorized_signatory_name}
                onChange={handleChange}
                required
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="label">City *</label>
            <input
              type="text"
              name="city"
              className="input-field"
              value={formData.city}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <label className="label">State *</label>
            <select
              name="state"
              className="input-field"
              value={formData.state}
              onChange={handleChange}
              required
            >
              <option value="">Select State</option>
              {states.map(state => (
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
              className="input-field"
              value={formData.pincode}
              onChange={handleChange}
            />
          </div>
        </div>

        <div>
          <label className="label">Logo</label>
          <input
            type="file"
            accept="image/*"
            className="input-field"
            onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
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
      </form>
    </Modal>
  );
};

export default CompanyFormModal;
