import axiosInstance from '../axios';
import { API_ENDPOINTS } from '../endpoints';
import { Payment, PaymentSearchParams } from '../../types/payment.types';

export const paymentService = {
  getAll: async (params?: PaymentSearchParams): Promise<any> => {
    const response = await axiosInstance.get(API_ENDPOINTS.PAYMENTS.LIST, { params });
    return response.data;
  },

  getById: async (id: number): Promise<Payment> => {
    const response = await axiosInstance.get<Payment>(API_ENDPOINTS.PAYMENTS.DETAIL(id));
    return response.data;
  },

  create: async (data: any): Promise<Payment> => {
    const response = await axiosInstance.post(API_ENDPOINTS.PAYMENTS.LIST, data);
    return response.data;
  },
};
