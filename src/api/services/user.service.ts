import axiosInstance from '../axios';
import { API_ENDPOINTS } from '../endpoints';
import { User } from '../../types/auth.types';

export interface UserCreateData {
  username: string;
  email: string;
  password: string;
  password_confirm: string;
  first_name: string;
  last_name: string;
  role: string;
  company?: number | null;
  phone?: string;
  branch?: number | null;
}

export interface UserUpdateData {
  email?: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  company?: number | null;
  phone?: string;
  is_active?: boolean;
  branch?: number | null;
}

export const userService = {
  // Get all users
  getAll: async (): Promise<User[]> => {
    const response = await axiosInstance.get<User[]>(API_ENDPOINTS.USERS.LIST);
    return response.data;
  },

  // Get user by ID
  getById: async (id: number): Promise<User> => {
    const response = await axiosInstance.get<User>(API_ENDPOINTS.USERS.DETAIL(id));
    return response.data;
  },

  // Create user
  create: async (data: UserCreateData): Promise<User> => {
    const response = await axiosInstance.post<User>(API_ENDPOINTS.USERS.LIST, data);
    return response.data;
  },

  // Update user
  update: async (id: number, data: UserUpdateData): Promise<User> => {
    const response = await axiosInstance.put<User>(
      API_ENDPOINTS.USERS.DETAIL(id),
      data
    );
    return response.data;
  },

  // Delete user
  delete: async (id: number): Promise<void> => {
    await axiosInstance.delete(API_ENDPOINTS.USERS.DETAIL(id));
  },
};
