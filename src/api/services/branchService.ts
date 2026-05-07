import axiosInstance from '../axios';
import { API_ENDPOINTS } from '../endpoints';
import { Branch, BranchFormData } from '../../types/branch.types';

export const branchService = {
  getAll: async (): Promise<Branch[]> => {
    const response = await axiosInstance.get(API_ENDPOINTS.BRANCHES.LIST);
    return response.data;
  },

  getById: async (id: number): Promise<Branch> => {
    const response = await axiosInstance.get(API_ENDPOINTS.BRANCHES.DETAIL(id));
    return response.data;
  },

  create: async (data: BranchFormData): Promise<Branch> => {
    const response = await axiosInstance.post(API_ENDPOINTS.BRANCHES.LIST, data);
    return response.data;
  },

  update: async (id: number, data: Partial<BranchFormData>): Promise<Branch> => {
    const response = await axiosInstance.put(API_ENDPOINTS.BRANCHES.DETAIL(id), data);
    return response.data;
  },

  deactivate: async (id: number): Promise<void> => {
    await axiosInstance.delete(API_ENDPOINTS.BRANCHES.DETAIL(id));
  },

  activate: async (id: number): Promise<Branch> => {
    const response = await axiosInstance.patch(API_ENDPOINTS.BRANCHES.DETAIL(id), { is_active: true });
    return response.data;
  },
};
