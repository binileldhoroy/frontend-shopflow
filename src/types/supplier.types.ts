export interface Supplier {
  id: number;
  name: string;
  contact_person?: string;
  email?: string;
  country_code?: string;
  phone: string;
  alternate_country_code?: string;
  alternate_phone?: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  gstin?: string;
  payment_terms?: string;
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface SupplierFormData {
  name: string;
  contact_person?: string;
  email?: string;
  country_code?: string;
  phone: string;
  alternate_country_code?: string;
  alternate_phone?: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  pincode: string;
  gstin?: string;
  payment_terms?: string;
  is_active?: boolean;
  notes?: string;
}
