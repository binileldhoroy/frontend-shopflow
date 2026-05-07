import React, { useState, useEffect } from 'react';
import Modal from '../../common/Modal/Modal';
import { Company, CompanyFeatures } from '../../../types/company.types';
import { StateMaster } from '../../../types/state.types';
import { stateService } from '../../../api/services/state.service';
import { useAuth } from '../../../hooks/useAuth';

interface CompanyFormModalProps {
  show: boolean;
  onHide: () => void;
  onSubmit: (data: FormData) => void;
  company: Company | null;
  loading?: boolean;
}

const DEFAULT_FEATURES: CompanyFeatures = {
  sales_enabled: true,
  inventory_enabled: true,
  purchases_enabled: true,
  finance_enabled: true,
  advance_invoice_enabled: true,
  shopbot_enabled: true,
  reports_enabled: true,
  max_users: 1,
};

const FEATURE_LABELS: { key: keyof Omit<CompanyFeatures, 'max_users'>; label: string; description: string }[] = [
  { key: 'sales_enabled', label: 'Sales Suite', description: 'POS, Quick Sale, Sales, Daily Balances' },
  { key: 'inventory_enabled', label: 'Inventory Suite', description: 'Products, Categories, Inventory' },
  { key: 'purchases_enabled', label: 'Purchases Suite', description: 'Purchases, Suppliers' },
  { key: 'finance_enabled', label: 'Finance Suite', description: 'Invoices, Payments' },
  { key: 'advance_invoice_enabled', label: 'Advance Invoices', description: 'Advance invoice management' },
  { key: 'shopbot_enabled', label: 'ShopBot', description: 'AI chat assistant' },
  { key: 'reports_enabled', label: 'Reports', description: 'Sales and inventory reports' },
];

const CompanyFormModal: React.FC<CompanyFormModalProps> = ({
  show,
  onHide,
  onSubmit,
  company,
  loading = false,
}) => {
  const { isSuperUser } = useAuth();
  const [features, setFeatures] = useState<CompanyFeatures>(DEFAULT_FEATURES);
  const [maxUsersInput, setMaxUsersInput] = useState(String(DEFAULT_FEATURES.max_users));
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
      const f = company.features ? { ...DEFAULT_FEATURES, ...company.features } : DEFAULT_FEATURES;
      setFeatures(f);
      setMaxUsersInput(String(f.max_users));
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
      setFeatures(DEFAULT_FEATURES);
      setMaxUsersInput(String(DEFAULT_FEATURES.max_users));
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

    // Append features as nested JSON (super admin only)
    if (isSuperUser) {
      data.append('features', JSON.stringify(features));
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

        {/* Features Section — super admin only */}
        {isSuperUser && (
          <div className="border-t pt-4 mt-4">
            <h4 className="font-semibold text-gray-900 mb-1">Features</h4>
            <p className="text-xs text-gray-500 mb-3">Enable or disable feature groups for this company.</p>
            <div className="space-y-2">
              {FEATURE_LABELS.map(({ key, label, description }) => (
                <label key={key} className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
                  <div>
                    <span className="text-sm font-medium text-gray-800">{label}</span>
                    <span className="block text-xs text-gray-400">{description}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={features[key] as boolean}
                    onChange={(e) => setFeatures(prev => ({ ...prev, [key]: e.target.checked }))}
                    className="w-4 h-4 text-primary-600 rounded"
                  />
                </label>
              ))}
              <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200">
                <div>
                  <span className="text-sm font-medium text-gray-800">Max Users</span>
                  <span className="block text-xs text-gray-400">Total users allowed (including admin)</span>
                </div>
                <input
                  type="number"
                  min={1}
                  value={maxUsersInput}
                  onChange={(e) => {
                    setMaxUsersInput(e.target.value);
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val) && val >= 1) {
                      setFeatures(prev => ({ ...prev, max_users: val }));
                    }
                  }}
                  onBlur={() => {
                    const val = parseInt(maxUsersInput, 10);
                    const clamped = isNaN(val) || val < 1 ? 1 : val;
                    setMaxUsersInput(String(clamped));
                    setFeatures(prev => ({ ...prev, max_users: clamped }));
                  }}
                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                  className="input-field w-20 text-center"
                />
              </div>
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
};

export default CompanyFormModal;
