export type PurchaseStatus = 'draft' | 'ordered' | 'partially_received' | 'received' | 'cancelled';

export interface PurchaseItem {
  id?: number;
  product: number | null;
  product_name: string;
  quantity: number;
  unit?: string;
  received_quantity?: number;
  pending_quantity?: number;
  unit_price: number;
  tax_rate: number;
  total_price?: number;
  tax_amount?: number;
  total_with_tax?: number;
}

export interface PurchaseOrder {
  id: number;
  order_number: string;
  order_date: string;
  expected_delivery_date?: string | null;
  received_date?: string | null;
  supplier: number;
  supplier_name?: string;
  status: PurchaseStatus;
  payment_status: 'paid' | 'pending' | 'partial';
  payment_method: 'cash' | 'card' | 'upi' | 'net_banking' | 'other';
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  pending_quantity?: number;
  notes?: string;
  items: PurchaseItem[];
  created_by?: number;
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrderCreate {
  supplier: number;
  order_date: string;
  expected_delivery_date?: string;
  status: PurchaseStatus;
  payment_status: 'paid' | 'pending' | 'partial';
  payment_method: 'cash' | 'card' | 'upi' | 'net_banking' | 'other';
  notes?: string;
  items: {
    product: number | null;
    product_name: string;
    quantity: number;
    unit_price: number;
    tax_rate: number;
  }[];
}

export interface ParsedInvoiceProductMatch {
  id: number;
  name: string;
  sku: string;
  cost_price: number;
}

export interface ParsedInvoiceItem {
  name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  tax_rate: number;
  total: number;
  hsn_code?: string;
  matches: ParsedInvoiceProductMatch[];
}

export interface ParsedInvoice {
  document_type: 'invoice' | 'delivery_note' | 'other';
  supplier_name: string | null;
  invoice_number: string | null;
  invoice_date: string | null;
  items: ParsedInvoiceItem[];
  subtotal: number;
  tax_total: number;
  grand_total: number;
  from_cache?: boolean;
}
