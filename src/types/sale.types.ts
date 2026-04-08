// Sale Types

export type SaleOrderStatus =
  | 'draft'
  | 'completed'
  | 'cancelled'
  | 'refunded'
  | 'voided'
  | 'corrected';

export interface POSAuditLog {
  id: number;
  user: number | null;
  user_name: string;
  action:
    | 'bill_created'
    | 'bill_completed'
    | 'bill_voided'
    | 'bill_corrected'
    | 'bill_cloned'
    | 'payment_added'
    | 'payment_reversed'
    | 'ledger_adjusted';
  action_display: string;
  sale_order: number | null;
  order_number: string;
  payment: number | null;
  payment_number: string;
  reason: string;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  timestamp: string;
}

export interface SaleItem {
  id: number;
  product: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  gst_rate: number;
  hsn_code?: string;
  line_total: number;
  gst_amount: number;
  total_with_gst: number;
}

export interface SaleOrder {
  id: number;
  order_number: string;
  customer: number | null;
  customer_name: string;
  sale_date: string;
  status: SaleOrderStatus;
  is_advance_invoice: boolean;
  advance_status: 'draft' | 'sent' | 'payment_pending' | 'payment_received' | 'product_released' | null;
  payment_method: string;
  payment_status: string;
  subtotal: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  gst_amount: number;
  discount_amount: number;
  discount_percentage: number;
  total_amount: number;
  round_off: number;
  billing_state: string;
  place_of_supply: string;
  notes: string | null;
  items: SaleItem[];
  cashier: number | null;
  cashier_name: string;

  // Void fields
  voided_reason: string | null;
  voided_by: number | null;
  voided_at: string | null;

  // Correction link
  corrects_order: number | null;

  // Guard flag
  is_final: boolean;

  created_at: string;
  updated_at: string;
}

export interface SaleFormData {
  customer?: number;
  payment_method: string;
  payment_status: string;
  billing_state: string;
  place_of_supply: string;
  discount_percentage: number;
  items: {
    product: number;
    quantity: number;
    unit_price: number;
    gst_rate: number;
    hsn_code?: string;
  }[];
}

// Cart Item (for local state)
export interface CartItem {
  id: number; // Local ID for cart management
  product_id: number;
  name: string;
  sku: string;
  unit_price: number;
  selling_price: number;
  quantity: number;
  gst_rate: number;
  hsn_code?: string;
  tax_included: boolean;
  stock_quantity?: number;
}
