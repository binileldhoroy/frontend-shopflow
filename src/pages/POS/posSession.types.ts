// ─── Types ────────────────────────────────────────────────────────────────────

export interface CartItem {
  id: number;
  product_id: number;
  name: string;
  sku: string;
  unit_price: number;
  selling_price: number;
  quantity: number;
  unit?: string;
  gst_rate: number;
  hsn_code: string;
  tax_included: boolean;
  stock_quantity?: number;
  reorder_level?: number;
  original_selling_price: number;
  cost_price: number;
}

export interface CartState {
  items: CartItem[];
  customer_id: number | null;
  billing_state: number | null;
  discount_percentage: number;
  discount_amount: number;
  discount_type: 'percentage' | 'amount';
}

export interface CustomerSession {
  id: string;
  label: string;
  cart: CartState;
  currentCustomerObj: any | null;
  guestName: string;
  guestCountryCode: string;
  guestPhone: string;
}

export const MAX_SESSIONS = 5;

export const createEmptySession = (index: number): CustomerSession => ({
  id: Date.now().toString() + Math.random().toString(36).slice(2),
  label: `Customer ${index}`,
  cart: {
    items: [],
    customer_id: null,
    billing_state: null,
    discount_percentage: 0,
    discount_amount: 0,
    discount_type: 'amount',
  },
  currentCustomerObj: null,
  guestName: '',
  guestCountryCode: '91',
  guestPhone: '',
});
