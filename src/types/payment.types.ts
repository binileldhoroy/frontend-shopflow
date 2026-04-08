export type PaymentDirection = 'credit' | 'debit';

export interface Payment {
  id: number;
  payment_number: string;
  amount: string | number;
  payment_mode: 'cash' | 'card' | 'upi' | 'bank_transfer' | 'cheque' | 'other';
  payment_type: 'sale' | 'purchase' | 'expense';
  direction: PaymentDirection;
  payment_date: string;
  notes?: string;
  reference_number?: string;

  // Reversal fields (system-managed, read-only)
  is_reversal: boolean;
  reversal_of: number | null;
  reversal_of_number: string | null;
  reversal_reason: string | null;

  // Relations
  company: number;
  sale_order?: number;
  purchase_order?: number;
  received_by?: number;

  // Read-only fields from serializer
  sale_order_number?: string;
  purchase_order_number?: string;
  received_by_name?: string;
  created_at: string;
}

export interface PaymentSearchParams {
  mode?: string;
  type?: string;
  search?: string; // If implemented in backend
}

export interface PaymentFormData {
  amount: number | string;
  payment_mode: 'cash' | 'card' | 'upi' | 'bank_transfer' | 'cheque' | 'other';
  payment_type: 'sale' | 'purchase';
  reference_number?: string;
  notes?: string;
  sale_order_number_input?: string; // Optional: link to a sale order by order number
}
