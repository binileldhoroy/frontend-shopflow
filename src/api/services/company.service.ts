import axiosInstance from '../axios';
import { API_ENDPOINTS } from '../endpoints';
import { Company, CompanyFormData } from '../../types/company.types';

export const companyService = {
  // Get all companies (super user only)
  getAll: async (): Promise<Company[]> => {
    const response = await axiosInstance.get<Company[]>(API_ENDPOINTS.COMPANY.LIST);
    console.log(response.data);
    return response.data;
  },

  // Get company by ID
  getById: async (id: number): Promise<Company> => {
    const response = await axiosInstance.get<Company>(API_ENDPOINTS.COMPANY.DETAIL(id));
    return response.data;
  },

  // Get current user's company
  getCurrent: async (): Promise<Company> => {
    const response = await axiosInstance.get<Company>(API_ENDPOINTS.COMPANY.CURRENT);
    return response.data;
  },

  // Create company (super user only)
  create: async (data: CompanyFormData): Promise<Company> => {
    const response = await axiosInstance.post<Company>(API_ENDPOINTS.COMPANY.LIST, data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Update company (super user only)
  update: async (id: number, data: Partial<CompanyFormData>): Promise<Company> => {
    const response = await axiosInstance.put<Company>(`${API_ENDPOINTS.COMPANY.DETAIL(id)}`, data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Update current company
  updateCurrent: async (data: Partial<CompanyFormData>): Promise<Company> => {
    const response = await axiosInstance.put<Company>(
      API_ENDPOINTS.COMPANY.CURRENT,
      data
    );
    return response.data;
  },

  // Deactivate company (super user only)
  deactivate: async (id: number): Promise<void> => {
    await axiosInstance.delete(API_ENDPOINTS.COMPANY.DETAIL(id));
  },
};
