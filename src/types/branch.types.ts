export interface Branch {
  id: number;
  company: number;
  name: string;
  address_line1: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
  is_active: boolean;
  user_count: number;
  created_at: string;
}

export interface BranchFormData {
  name: string;
  address_line1?: string;
  city?: string;
  state?: string;
  pincode?: string;
  phone?: string;
  email?: string;
  is_active?: boolean;
}
