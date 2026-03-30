import axiosInstance from '../axios';
import { API_ENDPOINTS } from '../endpoints';

export interface CategoryFormData {
  name: string;
  description?: string;
  is_active?: boolean;
}

export interface Category {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
  product_count?: number;
  created_at: string;
  updated_at: string;
}

export const categoryService = {
  // Get all categories (optional server-side search)
  getAll: async (params?: { search?: string }): Promise<Category[]> => {
    const response = await axiosInstance.get<Category[]>(API_ENDPOINTS.CATEGORIES.LIST, { params });
    return response.data;
  },

  // Get category by ID
  getById: async (id: number): Promise<Category> => {
    const response = await axiosInstance.get<Category>(API_ENDPOINTS.CATEGORIES.DETAIL(id));
    return response.data;
  },

  // Create category
  create: async (data: CategoryFormData): Promise<Category> => {
    const response = await axiosInstance.post<Category>(API_ENDPOINTS.CATEGORIES.LIST, data);
    return response.data;
  },

  // Update category
  update: async (id: number, data: Partial<CategoryFormData>): Promise<Category> => {
    const response = await axiosInstance.put<Category>(API_ENDPOINTS.CATEGORIES.DETAIL(id), data);
    return response.data;
  },

  // Delete category
  delete: async (id: number): Promise<void> => {
    await axiosInstance.delete(API_ENDPOINTS.CATEGORIES.DETAIL(id));
  },
};
