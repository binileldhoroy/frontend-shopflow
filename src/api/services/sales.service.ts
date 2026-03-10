import axiosInstance from '../axios';
import { API_ENDPOINTS } from '../endpoints';
import { SaleOrder, SaleFormData } from '../../types/sale.types';

export const salesService = {
  getAll: async (params?: { start_date?: string; end_date?: string }): Promise<SaleOrder[]> => {
    const response = await axiosInstance.get<SaleOrder[]>(API_ENDPOINTS.SALES.LIST, { params });
    return response.data;
  },

  getById: async (id: number): Promise<SaleOrder> => {
    const response = await axiosInstance.get<SaleOrder>(API_ENDPOINTS.SALES.DETAIL(id));
    return response.data;
  },

  create: async (data: SaleFormData): Promise<SaleOrder> => {
    const response = await axiosInstance.post<SaleOrder>(API_ENDPOINTS.SALES.LIST, data);
    return response.data;
  },

  getDailyReport: async (): Promise<any> => {
    const response = await axiosInstance.get(`${API_ENDPOINTS.SALES.LIST}daily-report/`);
    return response.data;
  },
};
