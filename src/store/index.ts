import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import companyReducer from './slices/companySlice';
import uiReducer from './slices/uiSlice';
import cartReducer from './slices/cartSlice';
import sessionReducer from './slices/sessionSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    company: companyReducer,
    ui: uiReducer,
    cart: cartReducer,
    session: sessionReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: ['auth/login/fulfilled'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
