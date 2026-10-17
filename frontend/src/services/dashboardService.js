import { api } from './api';

export const dashboardService = {
  getSummary: async () => {
    const res = await api.get('/dashboard/summary');
    return res.data;
  },

  getLowStock: async (limit = 10) => {
    const res = await api.get('/dashboard/low-stock', { limit });
    return res.data;
  },

  getStoreInfo: async () => {
    const res = await api.get('/dashboard/store-info');
    return res.data;
  },
};
