export interface CompanyFeatures {
  sales_enabled: boolean;
  inventory_enabled: boolean;
  purchases_enabled: boolean;
  finance_enabled: boolean;
  advance_invoice_enabled: boolean;
  shopbot_enabled: boolean;
  reports_enabled: boolean;
  max_users: number;
}

// Company interface
export interface Company {
  id: number;
  company_name: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: number; // State ID (ForeignKey)
  state_name?: string; // State name from serializer
  pincode: string;
  gstin?: string;
  pan?: string;
  phone: string;
  email: string;
  website?: string;
  logo?: string;
  bank_name?: string;
  account_number?: string;
  ifsc_code?: string;
  branch?: string;
  upi_id?: string;
  invoice_prefix?: string;
  terms_and_conditions?: string;
  authorized_signatory_name?: string;
  is_active: boolean;
  created_by: number;
  created_by_username?: string;
  admin_username?: string;
  features?: CompanyFeatures;

  created_at: string;
  updated_at: string;
}

// Company create/update payload
export interface CompanyFormData {
  company_name: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  pincode: string;
  gstin?: string;
  pan?: string;
  phone: string;
  email: string;
  website?: string;
  logo?: File | string;
  bank_name?: string;
  account_number?: string;
  ifsc_code?: string;
  branch?: string;
  upi_id?: string;
  invoice_prefix?: string;
  terms_and_conditions?: string;
  authorized_signatory_name?: string;
  is_active?: boolean;
}
