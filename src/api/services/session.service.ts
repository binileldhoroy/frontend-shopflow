import axiosInstance from '../axios';
import { API_ENDPOINTS } from '../endpoints';
import { PaginatedResponse } from './sale.service';

export interface RegisterSession {
  id: number;
  user_name: string;
  user: number;
  company: number | null;
  status: 'open' | 'closed';
  opening_balance: string;
  opened_at: string;
  closing_balance: string | null;
  closed_at: string | null;
  total_sales: string;
  total_cash: string;
  total_upi: string;
  total_card: string;
  total_credit: string;
  total_other: string;
  difference: string | null;
}

export const sessionService = {
  // Get all past sessions
  getAll: async (page: number = 1, pageSize: number = 20): Promise<PaginatedResponse<RegisterSession>> => {
    const response = await axiosInstance.get<PaginatedResponse<RegisterSession>>(
      `${API_ENDPOINTS.SESSIONS.LIST}?page=${page}&page_size=${pageSize}`
    );
    return response.data;
  },

  // Get current active session
  getCurrent: async (): Promise<RegisterSession> => {
    const response = await axiosInstance.get<RegisterSession>(API_ENDPOINTS.SESSIONS.CURRENT);
    return response.data;
  },

  // Get user's previously closed session
  getPreviousClosed: async (): Promise<RegisterSession> => {
    const response = await axiosInstance.get<RegisterSession>(API_ENDPOINTS.SESSIONS.PREVIOUS_CLOSED);
    return response.data;
  },

  // Open a new session
  openSession: async (opening_balance: number): Promise<RegisterSession> => {
    const response = await axiosInstance.post<RegisterSession>(
      API_ENDPOINTS.SESSIONS.OPEN,
      { opening_balance: opening_balance.toString() }
    );
    return response.data;
  },

  // Close active session
  closeSession: async (id: number, closing_balance: number): Promise<RegisterSession> => {
    const response = await axiosInstance.post<RegisterSession>(
      API_ENDPOINTS.SESSIONS.CLOSE(id),
      { closing_balance: closing_balance.toString() }
    );
    return response.data;
  }
};
