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

  create: async (data: ProductFormData | FormData): Promise<Product> => {
    const response = await axiosInstance.post<Product>(
      API_ENDPOINTS.PRODUCTS.LIST,
      data,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  },

  update: async (id: number, data: Partial<ProductFormData> | FormData): Promise<Product> => {
    console.log("Product update data:", data);
    const response = await axiosInstance.put<Product>(
      API_ENDPOINTS.PRODUCTS.DETAIL(id),
      data,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await axiosInstance.delete(API_ENDPOINTS.PRODUCTS.DETAIL(id));
  },

  previewCSV: async (file: File): Promise<any> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await axiosInstance.post(
      `${API_ENDPOINTS.PRODUCTS.IMPORT_CSV}?preview=true`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data;
  },

  importCSV: async (file: File, updateExisting: boolean): Promise<any> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('update_existing', updateExisting ? 'true' : 'false');
    const response = await axiosInstance.post(
      `${API_ENDPOINTS.PRODUCTS.IMPORT_CSV}?preview=false`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data;
  },

  downloadCSVTemplate: async (): Promise<void> => {
    const response = await axiosInstance.get(API_ENDPOINTS.PRODUCTS.IMPORT_CSV, {
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'products_template.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
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
