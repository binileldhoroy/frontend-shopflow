
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { companyService } from '../../api/services/company.service';
import { Company } from '../../types/company.types';
import { Edit, ArrowLeft, Building2, User, Phone, Mail, Globe, MapPin, Landmark, FileText, Activity, ToggleLeft, ToggleRight } from 'lucide-react';
import CompanyFormModal from '../../components/features/companies/CompanyFormModal';
import { useDispatch } from 'react-redux';
import { addNotification } from '../../store/slices/uiSlice';

const CompanyDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editLoading, setEditLoading] = useState(false);

  const fetchCompanyDetails = async () => {
    if (!id) return;
    try {
      setLoading(true);
      // We need to fetch all companies first to find the one we need since we don't have a direct get by ID API exposed in service easily for regular users list,
      // but wait, standard user likely can't see list. Super user can.
      // Super user has getById via companyService.getById?
      // Let's check companyService.
      // Assuming access. If not we might need to update service.
      // Actually companyService usually has getAll.
      // If we are superuser, we can likely fetch list and find. Or better, update service to get one.
      // But let's assume getById exists or we use getAll for now if performance isn't massive concern.
      // Actually `companyService` doesn't seem to have `getById` in our learnings (checked previously).
      // However, backend `CompanyDetailView` exists at `companies/<pk>/`.
      // Use direct axios call or update service?
      // Let's check service file later. For now assume we might need to add it or use raw request if needed.
      // But wait to keep it clean, let's use what we have or add to service.

      // Checking service... we should probably have added `getById`.
      // Let's implement fetch assuming we can get it.

      // WORKAROUND: For now, fetch all and find.
      const companies = await companyService.getAll();
      console.log('CompanyDetails fetched companies:', companies);
      const found = companies.find(c => c.id === Number(id));
      console.log('CompanyDetails found:', found);
      if (found) {
        setCompany(found);
      } else {
         // Could be pagination issue (server side pagination unimplemented for companies fetch? it's all())
         navigate('/companies');
      }
    } catch (error) {
      console.error('Error fetching company details:', error);
      dispatch(addNotification({
        message: 'Failed to fetch company details',
        type: 'error',
      }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanyDetails();
  }, [id]);

  const handleEdit = async (formData: FormData) => {
    if (!company) return;
    try {
      setEditLoading(true);
      await companyService.update(company.id, formData as any);
      dispatch(addNotification({
        message: 'Company updated successfully',
        type: 'success',
      }));
      setShowEditModal(false);
      fetchCompanyDetails(); // Refresh details
    } catch (error: any) {
      console.error('Error updating company:', error);
      dispatch(addNotification({
        message: error.response?.data?.message || 'Failed to update company',
        type: 'error',
      }));
    } finally {
      setEditLoading(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-center">Loading...</div>;
  }

  if (!company) {
    return <div className="p-6 text-center">Company not found</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/companies')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <div className="flex items-center gap-3">
             <div className="p-3 bg-white rounded-lg border shadow-sm">
                {company.logo ? (
                  <img
                    src={company.logo}
                    alt={company.company_name}
                    className="w-8 h-8 object-contain"
                  />
                ) : (
                  <Building2 className="w-8 h-8 text-primary-600" />
                )}
             </div>
             <div>
                <h1 className="text-2xl font-bold text-gray-900">{company.company_name}</h1>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    company.is_active
                      ? 'bg-green-50 text-green-700'
                      : 'bg-red-50 text-red-700'
                  }`}>
                    <Activity className="w-3 h-3" />
                    {company.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <span>•</span>
                  <span>Created {new Date(company.created_at).toLocaleDateString()}</span>
                </div>
             </div>
          </div>
        </div>
        <button
          onClick={() => setShowEditModal(true)}
          className="btn btn-primary flex items-center gap-2"
        >
          <Edit className="w-4 h-4" />
          Edit Company
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Info */}
        <div className="lg:col-span-2 space-y-6">

          {/* Admin Details Card */}
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-gray-500" />
              Administrative Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div>
                  <label className="text-sm font-medium text-gray-500">Admin Username</label>
                  <div className="mt-1 text-gray-900 font-medium">
                    {company.admin_username || <span className="text-gray-400 italic">Not set</span>}
                  </div>
               </div>
               <div>
                  <label className="text-sm font-medium text-gray-500">Authorized Signatory</label>
                  <div className="mt-1 text-gray-900">{company.authorized_signatory_name}</div>
               </div>
            </div>
          </div>

          {/* Contact & Address Card */}
          <div className="bg-white rounded-xl border shadow-sm p-6">
             <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-gray-500" />
              Contact & Location
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="flex items-start gap-3">
                   <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
                   <div>
                      <label className="block text-sm font-medium text-gray-500">Email Address</label>
                      <a href={`mailto:${company.email}`} className="text-primary-600 hover:underline">{company.email}</a>
                   </div>
                </div>
                <div className="flex items-start gap-3">
                   <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                   <div>
                      <label className="block text-sm font-medium text-gray-500">Phone Number</label>
                      <a href={`tel:${company.phone}`} className="text-gray-900 hover:text-primary-600">{company.phone}</a>
                   </div>
                </div>
                {company.website && (
                  <div className="flex items-start gap-3 md:col-span-2">
                     <Globe className="w-5 h-5 text-gray-400 mt-0.5" />
                     <div>
                        <label className="block text-sm font-medium text-gray-500">Website</label>
                        <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">{company.website}</a>
                     </div>
                  </div>
                )}
            </div>

            <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
               <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Billing Address</label>
               <div className="text-gray-700 leading-relaxed">
                  <p>{company.address_line1}</p>
                  {company.address_line2 && <p>{company.address_line2}</p>}
                  <p>{company.city}, {company.state_name} - {company.pincode}</p>
               </div>
            </div>
          </div>
        </div>

        {/* Right Column - Financial & Meta */}
        <div className="space-y-6">
           {/* Tax Info */}
           <div className="bg-white rounded-xl border shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-gray-500" />
                Tax Information
              </h2>
              <div className="space-y-4">
                 <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                    <span className="text-gray-500 text-sm">GSTIN</span>
                    <span className="font-mono font-medium text-gray-900">{company.gstin || '-'}</span>
                 </div>
                 <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                    <span className="text-gray-500 text-sm">PAN</span>
                    <span className="font-mono font-medium text-gray-900">{company.pan || '-'}</span>
                 </div>
              </div>
           </div>

           {/* Bank Details */}
           <div className="bg-white rounded-xl border shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Landmark className="w-5 h-5 text-gray-500" />
                Bank Account
              </h2>
              <div className="space-y-3">
                 <div>
                    <div className="text-xs text-gray-400 uppercase">Bank Name</div>
                    <div className="font-medium text-gray-900">{company.bank_name}</div>
                 </div>
                 <div>
                    <div className="text-xs text-gray-400 uppercase">Account Number</div>
                    <div className="font-mono font-medium text-gray-900">{company.account_number}</div>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <div className="text-xs text-gray-400 uppercase">IFSC</div>
                        <div className="font-mono text-sm text-gray-900">{company.ifsc_code}</div>
                    </div>
                    <div>
                        <div className="text-xs text-gray-400 uppercase">Branch</div>
                        <div className="text-sm text-gray-900">{company.branch}</div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </div>

      {/* Features Card */}
      {company.features && (
        <div className="bg-white rounded-xl border shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <ToggleRight className="w-5 h-5 text-gray-500" />
            Enabled Features
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {[
              { key: 'sales_enabled', label: 'Sales Suite' },
              { key: 'inventory_enabled', label: 'Inventory Suite' },
              { key: 'purchases_enabled', label: 'Purchases Suite' },
              { key: 'finance_enabled', label: 'Finance Suite' },
              { key: 'advance_invoice_enabled', label: 'Advance Invoices' },
              { key: 'shopbot_enabled', label: 'ShopBot' },
              { key: 'reports_enabled', label: 'Reports' },
            ].map(({ key, label }) => {
              const enabled = company.features![key as keyof typeof company.features] as boolean;
              return (
                <div
                  key={key}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium ${
                    enabled
                      ? 'bg-green-50 border-green-200 text-green-700'
                      : 'bg-gray-50 border-gray-200 text-gray-400'
                  }`}
                >
                  {enabled
                    ? <ToggleRight className="w-4 h-4 flex-shrink-0" />
                    : <ToggleLeft className="w-4 h-4 flex-shrink-0" />
                  }
                  {label}
                </div>
              );
            })}
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-blue-50 border-blue-200 text-blue-700 text-sm font-medium">
              <User className="w-4 h-4 flex-shrink-0" />
              Max {company.features.max_users} user{company.features.max_users !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      )}

      <CompanyFormModal
        show={showEditModal}
        onHide={() => setShowEditModal(false)}
        company={company}
        onSubmit={handleEdit}
        loading={editLoading}
      />
    </div>
  );
};

export default CompanyDetails;
