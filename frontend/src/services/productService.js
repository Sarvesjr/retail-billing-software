import { api } from './api';

export const productService = {
  // Fetch products with search, category filter, active flag, and sort options
  getAll: async (params = {}) => {
    const res = await api.get('/products', params);
    return res.data;
  },

  getById: async (id) => {
    const res = await api.get(`/products/${id}`);
    return res.data;
  },

  search: async (query) => {
    const res = await api.get('/products/search', { q: query });
    return res.data;
  },

  getCategories: async () => {
    const res = await api.get('/products/categories');
    return res.data;
  },

  create: async (productData) => {
    const res = await api.post('/products', productData);
    return res.data;
  },

  update: async (id, productData) => {
    const res = await api.put(`/products/${id}`, productData);
    return res.data;
  },

  updateStock: async (id, stockQuantity) => {
    const res = await api.patch(`/products/${id}/stock`, { stockQuantity: Number(stockQuantity) });
    return res.data;
  },

  updateStatus: async (id, active) => {
    const res = await api.patch(`/products/${id}/status`, { active: Boolean(active) });
    return res.data;
  },
};
