import React, { useState, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../../../hooks/useRedux';
import { setCurrentCompany, fetchCurrentCompany } from '../../../store/slices/companySlice';
import { companyService } from '../../../api/services/company.service';
import { stateService } from '../../../api/services/state.service';
import { Building2, Save, CreditCard, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { CompanyFormData } from '../../../types/company.types';
import { StateMaster } from '../../../types/state.types';

const CompanySettings: React.FC = () => {
  const { currentCompany, loading } = useAppSelector((state) => state.company);
  const dispatch = useAppDispatch();
  const [isSaving, setIsSaving] = useState(false);
  const [states, setStates] = useState<StateMaster[]>([]);

  const [formData, setFormData] = useState<CompanyFormData>({
    company_name: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    pincode: '',
    gstin: '',
    pan: '',
    phone: '',
    email: '',
    website: '',
    bank_name: '',
    account_number: '',
    ifsc_code: '',
    branch: '',
    upi_id: '',
    invoice_prefix: 'INV',
    terms_and_conditions: '',
    authorized_signatory_name: '',
    logo: undefined,
  });

  useEffect(() => {
    dispatch(fetchCurrentCompany());
    fetchStates();
  }, [dispatch]);

  const fetchStates = async () => {
    try {
      const data = await stateService.getAll();
      setStates(data);
    } catch (error) {
      console.error('Error fetching states:', error);
      toast.error('Failed to load states');
    }
  };

  useEffect(() => {
    if (currentCompany) {
      setFormData({
        company_name: currentCompany.company_name || '',
        address_line1: currentCompany.address_line1 || '',
        address_line2: currentCompany.address_line2 || '',
        city: currentCompany.city || '',
        state: currentCompany.state ? String(currentCompany.state) : '',
        pincode: currentCompany.pincode || '',
        gstin: currentCompany.gstin || '',
        pan: currentCompany.pan || '',
        phone: currentCompany.phone || '',
        email: currentCompany.email || '',
        website: currentCompany.website || '',
        bank_name: currentCompany.bank_name || '',
        account_number: currentCompany.account_number || '',
        ifsc_code: currentCompany.ifsc_code || '',
        branch: currentCompany.branch || '',
        upi_id: currentCompany.upi_id || '',
        invoice_prefix: currentCompany.invoice_prefix || 'INV',
        terms_and_conditions: currentCompany.terms_and_conditions || '',
        authorized_signatory_name: currentCompany.authorized_signatory_name || '',
        logo: undefined, // Don't prefill file inputs
      });
    }
  }, [currentCompany]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      let result;
      if (currentCompany) {
        // ID is needed for update, but updateCurrent doesn't take ID if it uses /current endpoint
        // create service method might be safer if updateCurrent is available
        result = await companyService.updateCurrent(formData);
        toast.success('Company settings updated successfully');
      } else {
        result = await companyService.create(formData);
        toast.success('Company settings created successfully');
      }
      dispatch(setCurrentCompany(result));
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error(error.response?.data?.message || error.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading && !currentCompany) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl animate-in fade-in duration-500">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Company Information */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary-50 rounded-lg">
                <Building2 className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Company Information</h2>
                <p className="text-sm text-gray-500">Basic details about your business</p>
              </div>
            </div>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Company Name *</label>
              <input type="text" name="company_name" value={formData.company_name} onChange={handleChange} className="input-field w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all" required />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Address Line 1 *</label>
              <input type="text" name="address_line1" value={formData.address_line1} onChange={handleChange} className="input-field w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all" required />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Address Line 2</label>
              <input type="text" name="address_line2" value={formData.address_line2} onChange={handleChange} className="input-field w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">City *</label>
              <input type="text" name="city" value={formData.city} onChange={handleChange} className="input-field w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">State *</label>
              <select
                name="state"
                value={formData.state}
                onChange={(e) => handleChange(e as any)}
                className="input-field w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all bg-white"
                required
              >
                <option value="">Select State</option>
                {states.map((state) => (
                  <option key={state.id} value={state.id}>
                    {state.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Pincode *</label>
              <input type="text" name="pincode" value={formData.pincode} onChange={handleChange} className="input-field w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">GSTIN</label>
              <input type="text" name="gstin" value={formData.gstin} onChange={handleChange} className="input-field w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all bg-white" maxLength={15} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">PAN</label>
              <input type="text" name="pan" value={formData.pan} onChange={handleChange} className="input-field w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all" maxLength={10} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone *</label>
              <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="input-field w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} className="input-field w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
              <input type="url" name="website" value={formData.website} onChange={handleChange} className="input-field w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all" />
            </div>
          </div>
        </div>

        {/* Bank Details */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-50 rounded-lg">
                <CreditCard className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Bank Details</h2>
                <p className="text-sm text-gray-500">For invoices and payments</p>
              </div>
            </div>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Bank Name</label>
              <input type="text" name="bank_name" value={formData.bank_name} onChange={handleChange} className="input-field w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Account Number</label>
              <input type="text" name="account_number" value={formData.account_number} onChange={handleChange} className="input-field w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">IFSC Code</label>
              <input type="text" name="ifsc_code" value={formData.ifsc_code} onChange={handleChange} className="input-field w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Branch</label>
              <input type="text" name="branch" value={formData.branch} onChange={handleChange} className="input-field w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">UPI ID</label>
              <input type="text" name="upi_id" value={formData.upi_id} onChange={handleChange} className="input-field w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all" placeholder="e.g. yourname@upi" />
            </div>
          </div>
        </div>

        {/* Invoice Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-50 rounded-lg">
                <FileText className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Invoice Settings</h2>
                <p className="text-sm text-gray-500">Configure your invoice appearance</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Invoice Prefix</label>
              <input type="text" name="invoice_prefix" value={formData.invoice_prefix} onChange={handleChange} className="input-field w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all" maxLength={10} />
              <p className="text-xs text-gray-500 mt-1">Format: {formData.invoice_prefix}-YYYY-NNN</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Authorized Signatory Name</label>
              <input type="text" name="authorized_signatory_name" value={formData.authorized_signatory_name} onChange={handleChange} className="input-field w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Terms & Conditions</label>
              <textarea name="terms_and_conditions" value={formData.terms_and_conditions} onChange={handleChange} className="input-field w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all" rows={4} />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-6">
          <button type="submit" disabled={isSaving} className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-100 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
            <Save className="w-5 h-5" />
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CompanySettings;
