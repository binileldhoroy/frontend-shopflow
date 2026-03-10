// Sale Types
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
  status: string;
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
  items: SaleItem[];
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
