import axiosInstance from '../axios';
import { API_ENDPOINTS } from '../endpoints';
import { Brand } from '../../types/product.types';

export interface BrandFormData {
  name: string;
  is_active?: boolean;
}

export const brandService = {
  getAll: async (params?: { search?: string }): Promise<Brand[]> => {
    const response = await axiosInstance.get<Brand[]>(API_ENDPOINTS.PRODUCTS.BRANDS, { params });
    return response.data;
  },

  getById: async (id: number): Promise<Brand> => {
    const response = await axiosInstance.get<Brand>(API_ENDPOINTS.PRODUCTS.BRAND_DETAIL(id));
    return response.data;
  },

  create: async (data: BrandFormData): Promise<Brand> => {
    const response = await axiosInstance.post<Brand>(API_ENDPOINTS.PRODUCTS.BRANDS, data);
    return response.data;
  },

  update: async (id: number, data: Partial<BrandFormData>): Promise<Brand> => {
    const response = await axiosInstance.put<Brand>(API_ENDPOINTS.PRODUCTS.BRAND_DETAIL(id), data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await axiosInstance.delete(API_ENDPOINTS.PRODUCTS.BRAND_DETAIL(id));
  },
};
