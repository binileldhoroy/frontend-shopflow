import api from '../axios';

export const documentService = {
  getProfitLoss: async (params: { start_date: string; end_date: string; branch_id?: number | null }) => {
    const response = await api.get('/api/documents/profit-loss/', { params });
    return response.data;
  },

  getBalanceSheet: async (params: { date: string; branch_id?: number | null }) => {
    const response = await api.get('/api/documents/balance-sheet/', { params });
    return response.data;
  },

  getGSTRReport: async (params: { start_date: string; end_date: string; type: string; branch_id?: number | null }) => {
    const response = await api.get('/api/documents/gstr/', { params });
    return response.data;
  },

  getAccountStatement: async (params: { start_date: string; end_date: string; type: string; id: string; branch_id?: number | null }) => {
    const response = await api.get('/api/documents/account-statement/', { params });
    return response.data;
  },

  getTallyExport: async (params: { start_date: string; end_date: string }) => {
    const response = await api.get('/api/documents/tally-export/', {
      params,
      responseType: 'blob',
    });
    return response.data;
  },

  getReconciliation: async (params: { date?: string; start_date?: string; end_date?: string; branch_id?: number | null }) => {
    const response = await api.get('/api/documents/reconciliation/', { params });
    return response.data;
  },

  getProductProfit: async (params: { start_date?: string; end_date?: string; group_by?: 'product' | 'category'; branch_id?: number | null }) => {
    const response = await api.get('/api/documents/product-profit/', { params });
    return response.data;
  },

  exportData: async (type: 'sales' | 'inventory' | 'customers', params: Record<string, string | undefined>) => {
    const response = await api.get(`/api/documents/export/${type}/`, {
      params,
      responseType: 'blob',
    });
    return response;
  },
};
