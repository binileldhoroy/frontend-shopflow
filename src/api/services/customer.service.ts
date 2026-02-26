import axiosInstance from '../axios';
import { API_ENDPOINTS } from '../endpoints';

export interface CustomerFormData {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: number;
  pincode?: string;
  gstin?: string;
  is_guest?: boolean;
}

export const customerService = {
  // Get all customers
  getAll: async (): Promise<any[]> => {
    const response = await axiosInstance.get(`${API_ENDPOINTS.CUSTOMERS.LIST}?page_size=1000`);
    // Handle paginated response
    if (response.data && response.data.results) {
      return response.data.results;
    }
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
};
