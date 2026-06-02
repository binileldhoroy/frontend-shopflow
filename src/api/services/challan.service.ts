import api from '../axios';

export const challanService = {
  getAll: async (params?: any) => {
    const r = await api.get('/api/sales/challans/', { params });
    return r.data;
  },
  getById: async (id: number) => {
    const r = await api.get(`/api/sales/challans/${id}/`);
    return r.data;
  },
  create: async (data: any) => {
    const r = await api.post('/api/sales/challans/', data);
    return r.data;
  },
  update: async (id: number, data: any) => {
    const r = await api.put(`/api/sales/challans/${id}/`, data);
    return r.data;
  },
  delete: async (id: number) => {
    await api.delete(`/api/sales/challans/${id}/`);
  },
  dispatch: async (id: number) => {
    const r = await api.post(`/api/sales/challans/${id}/dispatch/`);
    return r.data;
  },
  deliver: async (id: number) => {
    const r = await api.post(`/api/sales/challans/${id}/deliver/`);
    return r.data;
  },
};
