import api from '../axios';

export const quotationService = {
  getAll: async (params?: any) => {
    const r = await api.get('/api/quotations/', { params });
    return r.data;
  },
  getById: async (id: number) => {
    const r = await api.get(`/api/quotations/${id}/`);
    return r.data;
  },
  create: async (data: any) => {
    const r = await api.post('/api/quotations/', data);
    return r.data;
  },
  update: async (id: number, data: any) => {
    const r = await api.put(`/api/quotations/${id}/`, data);
    return r.data;
  },
  delete: async (id: number) => {
    await api.delete(`/api/quotations/${id}/`);
  },
  convert: async (id: number) => {
    const r = await api.post(`/api/quotations/${id}/convert/`);
    return r.data;
  },
  updateStatus: async (id: number, status: string) => {
    const r = await api.put(`/api/quotations/${id}/`, { status });
    return r.data;
  },
};
