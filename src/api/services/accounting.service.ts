import api from '../axios';

export const accountingService = {
  getAccounts: async (params?: any) => {
    const r = await api.get('/api/accounting/accounts/', { params });
    return r.data;
  },
  createAccount: async (data: any) => {
    const r = await api.post('/api/accounting/accounts/', data);
    return r.data;
  },
  updateAccount: async (id: number, data: any) => {
    const r = await api.put(`/api/accounting/accounts/${id}/`, data);
    return r.data;
  },
  deleteAccount: async (id: number) => {
    await api.delete(`/api/accounting/accounts/${id}/`);
  },
  getJournalEntries: async (params?: any) => {
    const r = await api.get('/api/accounting/journal-entries/', { params });
    return r.data;
  },
  getJournalEntry: async (id: number) => {
    const r = await api.get(`/api/accounting/journal-entries/${id}/`);
    return r.data;
  },
  createJournalEntry: async (data: any) => {
    const r = await api.post('/api/accounting/journal-entries/', data);
    return r.data;
  },
  deleteJournalEntry: async (id: number) => {
    await api.delete(`/api/accounting/journal-entries/${id}/`);
  },
};
