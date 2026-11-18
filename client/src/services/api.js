const BASE_URL = '/api';

export async function fetchApi(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  try {
    const response = await fetch(url, { ...options, headers });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }
    return data;
  } catch (error) {
    console.error(`[API Error] ${endpoint}:`, error);
    throw error;
  }
}

export const api = {
  getHealth: () => fetchApi('/health'),

  // Products
  getProducts: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchApi(`/products${query ? '?' + query : ''}`);
  },
  getProduct: (id) => fetchApi(`/products/${id}`),
  createProduct: (data) => fetchApi('/products', { method: 'POST', body: JSON.stringify(data) }),
  updateProduct: (id, data) => fetchApi(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProduct: (id) => fetchApi(`/products/${id}`, { method: 'DELETE' }),

  // Barcodes & Scanners
  lookupBarcode: (barcode, source = 'MANUAL') =>
    fetchApi(`/barcodes/lookup?barcode=${encodeURIComponent(barcode)}&source=${encodeURIComponent(source)}`),
  getScannerLogs: (limit = 25) => fetchApi(`/barcodes/logs?limit=${limit}`),
  assignBarcode: (data) => fetchApi('/barcodes/assign', { method: 'POST', body: JSON.stringify(data) }),
  deleteBarcode: (barcode) => fetchApi(`/barcodes/${encodeURIComponent(barcode)}`, { method: 'DELETE' }),
  sendScan: (barcode, source = 'PHONE_USB') =>
    fetchApi('/scanner/scan', { method: 'POST', body: JSON.stringify({ barcode, input_source: source }) }),

  // Categories
  getCategories: () => fetchApi('/categories'),
  getCategoryProducts: (id) => fetchApi(`/categories/${id}/products`),
  createCategory: (data) => fetchApi('/categories', { method: 'POST', body: JSON.stringify(data) }),
  updateCategory: (id, data) => fetchApi(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCategory: (id) => fetchApi(`/categories/${id}`, { method: 'DELETE' }),

  // Units
  getUnits: () => fetchApi('/units'),
  createUnit: (data) => fetchApi('/units', { method: 'POST', body: JSON.stringify(data) }),
  updateUnit: (id, data) => fetchApi(`/units/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Sales & POS & Previous Bills
  createSale: (saleData) => fetchApi('/sales', { method: 'POST', body: JSON.stringify(saleData) }),
  getSales: (params = {}) => {
    if (typeof params === 'number') {
      return fetchApi(`/sales?limit=${params}`);
    }
    const cleanParams = {};
    Object.keys(params).forEach(k => {
      if (params[k] !== undefined && params[k] !== null && params[k] !== '') {
        cleanParams[k] = params[k];
      }
    });
    const query = new URLSearchParams(cleanParams).toString();
    return fetchApi(`/sales${query ? '?' + query : ''}`);
  },
  getSale: (id) => fetchApi(`/sales/${id}`),
  saveReceiptImage: (id, pngDataUrl) =>
    fetchApi(`/sales/${id}/receipt-image`, { method: 'POST', body: JSON.stringify({ pngDataUrl }) }),
  getReceiptImageUrl: (invoiceNo, format = 'svg') =>
    `/api/sales/bills/${encodeURIComponent(invoiceNo)}/image?format=${format}`,

  // Suppliers & Purchases
  getSuppliers: () => fetchApi('/suppliers'),
  createSupplier: (data) => fetchApi('/suppliers', { method: 'POST', body: JSON.stringify(data) }),
  updateSupplier: (id, data) => fetchApi(`/suppliers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSupplier: (id) => fetchApi(`/suppliers/${id}`, { method: 'DELETE' }),
  getPurchases: () => fetchApi('/purchases'),
  createPurchase: (data) => fetchApi('/purchases', { method: 'POST', body: JSON.stringify(data) }),

  // Customers & Khata
  getCustomers: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchApi(`/customers${query ? '?' + query : ''}`);
  },
  createCustomer: (data) => fetchApi('/customers', { method: 'POST', body: JSON.stringify(data) }),
  updateCustomer: (id, data) => fetchApi(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCustomer: (id) => fetchApi(`/customers/${id}`, { method: 'DELETE' }),
  createCustomerPayment: (data) => fetchApi('/customers/payments', { method: 'POST', body: JSON.stringify(data) }),

  // Expenses
  getExpenseCategories: () => fetchApi('/expenses/categories'),
  getExpenses: () => fetchApi('/expenses'),
  createExpense: (data) => fetchApi('/expenses', { method: 'POST', body: JSON.stringify(data) }),

  // Reports & Settings
  getReportsSummary: () => fetchApi('/reports/summary'),
  getSettings: () => fetchApi('/settings'),
  updateSettings: (data) => fetchApi('/settings', { method: 'POST', body: JSON.stringify(data) }),

  // Users & Permissions
  getUsers: () => fetchApi('/users'),
  getUser: (id) => fetchApi(`/users/${id}`),
  createUser: (data) => fetchApi('/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id, data) => fetchApi(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUser: (id) => fetchApi(`/users/${id}`, { method: 'DELETE' }),

  // Returns & Damaged/Expired Stock
  getSalesReturns: () => fetchApi('/returns/sales'),
  createSalesReturn: (data) => fetchApi('/returns/sales', { method: 'POST', body: JSON.stringify(data) }),
  getPurchaseReturns: () => fetchApi('/returns/purchases'),
  createPurchaseReturn: (data) => fetchApi('/returns/purchases', { method: 'POST', body: JSON.stringify(data) }),
  getDamagedAndExpiredStock: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchApi(`/returns/damaged-expired${query ? '?' + query : ''}`);
  },
  quarantineDamagedStock: (data) => fetchApi('/returns/quarantine-damaged', { method: 'POST', body: JSON.stringify(data) }),

  // Customer Feedback
  getFeedbacks: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchApi(`/feedbacks${query ? '?' + query : ''}`);
  },
  createFeedback: (data) => fetchApi('/feedbacks', { method: 'POST', body: JSON.stringify(data) }),
  getFeedbackStats: () => fetchApi('/feedbacks/stats')
};
