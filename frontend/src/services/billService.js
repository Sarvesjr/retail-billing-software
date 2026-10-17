import { api } from './api';

export const billService = {
  create: async (billPayload) => {
    const res = await api.post('/bills', billPayload);
    return res.data;
  },

  getAll: async (params = {}) => {
    const res = await api.get('/bills', params);
    return res.data;
  },

  getById: async (id) => {
    const res = await api.get(`/bills/${id}`);
    return res.data;
  },

  getByNumber: async (billNumber) => {
    const res = await api.get(`/bills/number/${encodeURIComponent(billNumber)}`);
    return res.data;
  },

  cancel: async (id) => {
    const res = await api.patch(`/bills/${id}/cancel`);
    return res.data;
  },
};
