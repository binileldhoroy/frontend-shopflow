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

  getGSTR4: async (params: { period?: string; start_date?: string; end_date?: string; branch_id?: number | null }) => {
    const response = await api.get('/api/documents/gstr4/', { params });
    return response.data;
  },

  getGSTR9: async (params: { fy?: string; branch_id?: number | null }) => {
    const response = await api.get('/api/documents/gstr9/', { params });
    return response.data;
  },

  getGSTR3B: async (params: { period?: string; start_date?: string; end_date?: string; branch_id?: number | null }) => {
    const response = await api.get('/api/documents/gstr3b/', { params });
    return response.data;
  },

  downloadGSTRJson: async (params: { type: 'gstr1' | 'gstr3b'; period?: string; start_date?: string; end_date?: string }) => {
    const response = await api.get('/api/documents/gstr-json/', { params, responseType: 'blob' });
    return response;
  },

  getAgingReport: async (params: { type: 'receivables' | 'payables'; as_of_date?: string; branch_id?: number | null }) => {
    const response = await api.get('/api/documents/aging/', { params });
    return response.data;
  },

  getStockValuation: async (params: { branch_id?: number | null }) => {
    const response = await api.get('/api/documents/stock-valuation/', { params });
    return response.data;
  },

  getCashFlow: async (params: { start_date?: string; end_date?: string; branch_id?: number | null }) => {
    const response = await api.get('/api/documents/cash-flow/', { params });
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
