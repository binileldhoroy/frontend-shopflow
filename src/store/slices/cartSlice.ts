import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { CartItem } from '../../types/sale.types';

interface CartState {
  items: CartItem[];
  customer_id: number | null;
  customer_name: string;
  discount_percentage: number;
  billing_state_id: number | null; // FK to StateMaster
}

const initialState: CartState = {
  items: [],
  customer_id: null,
  customer_name: '',
  discount_percentage: 0,
  billing_state_id: null,
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addItem: (state, action: PayloadAction<CartItem>) => {
      const existingItem = state.items.find(item => item.product_id === action.payload.product_id);
      if (existingItem) {
        existingItem.quantity += action.payload.quantity;
      } else {
        state.items.push(action.payload);
      }
    },
    updateQuantity: (state, action: PayloadAction<{ id: number; quantity: number }>) => {
      const item = state.items.find(item => item.id === action.payload.id);
      if (item && action.payload.quantity > 0) {
        item.quantity = action.payload.quantity;
      }
    },
    removeItem: (state, action: PayloadAction<number>) => {
      state.items = state.items.filter(item => item.id !== action.payload);
    },
    setCustomer: (state, action: PayloadAction<{ id: number | null; name: string }>) => {
      state.customer_id = action.payload.id;
      state.customer_name = action.payload.name;
    },
    setDiscount: (state, action: PayloadAction<number>) => {
      state.discount_percentage = Math.max(0, Math.min(100, action.payload));
    },
    setBillingState: (state, action: PayloadAction<number | null>) => {
      state.billing_state_id = action.payload;
    },
    clearCart: (state) => {
      state.items = [];
      state.customer_id = null;
      state.customer_name = '';
      state.discount_percentage = 0;
    },
  },
});

export const {
  addItem,
  updateQuantity,
  removeItem,
  setCustomer,
  setDiscount,
  setBillingState,
  clearCart,
} = cartSlice.actions;

export default cartSlice.reducer;
