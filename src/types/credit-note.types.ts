export interface CreditNoteItem {
  id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  gst_rate: number;
  line_total: number;
  total_with_gst?: number;
}

export interface CreditNote {
  id: number;
  credit_note_number: string;
  original_sale: number;
  original_order_number: string;
  original_sale_date: string;
  customer: number | null;
  customer_name: string | null;
  reason: string;
  subtotal: string;
  gst_amount: string;
  total_amount: string;
  created_by: number | null;
  created_by_name: string | null;
  created_at: string;
  items: CreditNoteItem[];
}

export interface ProductBatch {
  id: number;
  product: number;
  product_name: string;
  batch_number: string;
  manufacture_date: string | null;
  expiry_date: string | null;
  quantity: number;
  is_expired: boolean;
  days_to_expiry: number | null;
  expiry_status: 'ok' | 'expiring_soon' | 'expired' | 'no_expiry';
  is_active: boolean;
  created_by: number | null;
  created_by_name: string | null;
  created_at: string;
}

export interface ProductBatchFormData {
  product: number;
  batch_number: string;
  manufacture_date?: string;
  expiry_date?: string;
  quantity: number;
}
