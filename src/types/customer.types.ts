// Customer Ledger entry types — keep in sync with backend TransactionType choices
export type LedgerTransactionType =
  | 'credit_sale'
  | 'payment_received'
  | 'refund'
  | 'wallet_top_up'
  | 'wallet_used'
  | 'void_reversal'
  | 'correction_debit';

export interface CustomerLedgerEntry {
  id: number;
  customer: number;
  transaction_type: LedgerTransactionType;
  amount: number;
  balance_after: number;
  reference_sale: number | null;
  reference_payment: number | null;
  created_by: number | null;
  notes: string | null;
  created_at: string;
}

// Customer Types
export interface Customer {
  id: number;
  name: string;
  email?: string;
  phone: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  company: number;
  is_guest: boolean;
  credit_limit?: string;
  outstanding_balance?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomerFormData {
  name: string;
  email?: string;
  phone: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  is_active?: boolean;
}

// Supplier Types
export interface Supplier {
  id: number;
  name: string;
  contact_person?: string;
  email?: string;
  phone: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  company: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SupplierFormData {
  name: string;
  contact_person?: string;
  email?: string;
  phone: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  is_active?: boolean;
}
