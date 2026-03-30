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
  customer_state: number; // FK to StateMaster
  customer_pincode?: string;
  customer_phone?: string;
  customer_email?: string;
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
  customer_state?: number; // FK to StateMaster
  customer_pincode?: string;
  customer_phone?: string;
  customer_email?: string;
}

export interface InvoiceFilters {
  start_date?: string;
  end_date?: string;
  month?: string; // Format: YYYY-MM
  search?: string; // searches invoice_number, customer_name, sale_order order_number
  page?: number;
  page_size?: number;
}
