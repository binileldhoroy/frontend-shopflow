// Invoice Types
import { SaleOrder } from './sale.types';

export interface TaxInvoice {
  id: number;
  invoice_number: string;
  sale_order: number;
  sale_order_data: SaleOrder;
  invoice_date: string;
  customer_name: string;
  customer_gstin?: string;
  customer_address: string;
  customer_city?: string;
  customer_state: number;
  customer_pincode?: string;
  customer_country_code?: string;
  customer_phone?: string;
  customer_email?: string;
  shipping_contact_name?: string;
  shipping_address_line1?: string;
  shipping_address_line2?: string;
  shipping_city?: string;
  shipping_state?: number;
  shipping_state_name?: string;
  shipping_pincode?: string;
  shipping_phone?: string;
  is_cancelled: boolean;
  cancellation_reason?: string;
  cancelled_at?: string;
  generated_by?: number;
  generated_by_name?: string;
  created_at: string;
  updated_at: string;
}

export interface TaxInvoiceCreate {
  sale_order_id: number;
  customer_name?: string;
  customer_gstin?: string;
  customer_address?: string;
  customer_city?: string;
  customer_state?: number;
  customer_pincode?: string;
  customer_country_code?: string;
  customer_phone?: string;
  customer_email?: string;
  shipping_address_id?: number;
  shipping_contact_name?: string;
  shipping_address_line1?: string;
  shipping_address_line2?: string;
  shipping_city?: string;
  shipping_state?: number;
  shipping_pincode?: string;
  shipping_phone?: string;
}

export interface CustomerShippingAddress {
  id: number;
  customer: number;
  label: string;
  contact_name: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: number | null;
  state_name: string | null;
  pincode: string;
  phone_country_code: string;
  phone: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface InvoiceFilters {
  start_date?: string;
  end_date?: string;
  month?: string; // Format: YYYY-MM
  search?: string; // searches invoice_number, customer_name, sale_order order_number
  page?: number;
  page_size?: number;
}
