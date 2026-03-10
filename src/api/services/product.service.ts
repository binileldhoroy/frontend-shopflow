import axiosInstance from '../axios';
import { API_ENDPOINTS } from '../endpoints';
import { Product, ProductFormData, Category, CategoryFormData } from '../../types/product.types';

export const productService = {
  // Products
  getAll: async (params?: any): Promise<any> => {
    const response = await axiosInstance.get(API_ENDPOINTS.PRODUCTS.LIST, { params });
    console.log(response.data);
    return response.data;
  },

  getById: async (id: number): Promise<Product> => {
    const response = await axiosInstance.get<Product>(API_ENDPOINTS.PRODUCTS.DETAIL(id));
    return response.data;
  },

  create: async (data: ProductFormData): Promise<Product> => {
    const response = await axiosInstance.post<Product>(API_ENDPOINTS.PRODUCTS.LIST, data);
    return response.data;
  },

  update: async (id: number, data: Partial<ProductFormData>): Promise<Product> => {
    const response = await axiosInstance.put<Product>(
      API_ENDPOINTS.PRODUCTS.DETAIL(id),
      data
    );
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await axiosInstance.delete(API_ENDPOINTS.PRODUCTS.DETAIL(id));
  },
};

export const categoryService = {
  // Categories
  getAll: async (): Promise<Category[]> => {
    const response = await axiosInstance.get<Category[]>(API_ENDPOINTS.CATEGORIES.LIST);
    return response.data;
  },

  getById: async (id: number): Promise<Category> => {
    const response = await axiosInstance.get<Category>(API_ENDPOINTS.CATEGORIES.DETAIL(id));
    return response.data;
  },

  create: async (data: CategoryFormData): Promise<Category> => {
    const response = await axiosInstance.post<Category>(API_ENDPOINTS.CATEGORIES.LIST, data);
    return response.data;
  },

  update: async (id: number, data: Partial<CategoryFormData>): Promise<Category> => {
    const response = await axiosInstance.put<Category>(
      API_ENDPOINTS.CATEGORIES.DETAIL(id),
      data
    );
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await axiosInstance.delete(API_ENDPOINTS.CATEGORIES.DETAIL(id));
  },
};
