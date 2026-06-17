import axiosInstance from '../axios';
import { API_ENDPOINTS } from '../endpoints';

export interface CustomerFormData {
  name: string;
  email?: string;
  country_code?: string;
  phone?: string;
  address_line1?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gstin?: string;
  is_guest?: boolean;
}

export const customerService = {
  // Get all customers
  getAll: async (params?: any): Promise<any> => {
    if (!params) {
      const response = await axiosInstance.get(`${API_ENDPOINTS.CUSTOMERS.LIST}?page_size=1000`);
      if (response.data && response.data.results) return response.data.results;
      return response.data;
    }
    const response = await axiosInstance.get(API_ENDPOINTS.CUSTOMERS.LIST, { params });
    return response.data;
  },

  // Search customers by query
  search: async (query: string, pageSize: number = 20): Promise<any> => {
    const response = await axiosInstance.get(`${API_ENDPOINTS.CUSTOMERS.LIST}?search=${encodeURIComponent(query)}&page_size=${pageSize}`);
    return response.data;
  },

  // Get customer by ID
  getById: async (id: number): Promise<any> => {
    const response = await axiosInstance.get(API_ENDPOINTS.CUSTOMERS.DETAIL(id));
    return response.data;
  },

  // Create customer
  create: async (data: CustomerFormData): Promise<any> => {
    const response = await axiosInstance.post(API_ENDPOINTS.CUSTOMERS.LIST, data);
    return response.data;
  },

  // Update customer
  update: async (id: number, data: Partial<CustomerFormData>): Promise<any> => {
    const response = await axiosInstance.put(API_ENDPOINTS.CUSTOMERS.DETAIL(id), data);
    return response.data;
  },

  // Delete customer
  delete: async (id: number): Promise<void> => {
    await axiosInstance.delete(API_ENDPOINTS.CUSTOMERS.DETAIL(id));
  },

  // Get customer ledger entries
  getLedger: async (id: number): Promise<any> => {
    const response = await axiosInstance.get(API_ENDPOINTS.CUSTOMERS.LEDGER(id));
    return response.data;
  },

  // Settle customer credit
  settleCredit: async (id: number, data: { amount: number, payment_method: string, notes?: string }): Promise<any> => {
    const response = await axiosInstance.post(API_ENDPOINTS.CUSTOMERS.SETTLE_CREDIT(id), data);
    return response.data;
  },

  // Top up customer wallet
  walletTopUp: async (id: number, data: { amount: number, payment_method: string, notes?: string }): Promise<any> => {
    const response = await axiosInstance.post(API_ENDPOINTS.CUSTOMERS.WALLET_TOPUP(id), data);
    return response.data;
  },

  // Shipping addresses
  getShippingAddresses: async (customerId: number): Promise<any[]> => {
    const response = await axiosInstance.get(API_ENDPOINTS.CUSTOMERS.SHIPPING_ADDRESSES(customerId));
    return response.data;
  },

  createShippingAddress: async (customerId: number, data: any): Promise<any> => {
    const response = await axiosInstance.post(API_ENDPOINTS.CUSTOMERS.SHIPPING_ADDRESSES(customerId), data);
    return response.data;
  },

  updateShippingAddress: async (customerId: number, addrId: number, data: any): Promise<any> => {
    const response = await axiosInstance.put(API_ENDPOINTS.CUSTOMERS.SHIPPING_ADDRESS_DETAIL(customerId, addrId), data);
    return response.data;
  },

  deleteShippingAddress: async (customerId: number, addrId: number): Promise<void> => {
    await axiosInstance.delete(API_ENDPOINTS.CUSTOMERS.SHIPPING_ADDRESS_DETAIL(customerId, addrId));
  },
};
