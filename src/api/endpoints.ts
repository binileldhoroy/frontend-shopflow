// API endpoint constants
export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: '/api/auth/login/',
    LOGOUT: '/api/auth/logout/',
    REFRESH: '/api/auth/token/refresh/',
    REGISTER: '/api/auth/register/',
    PROFILE: '/api/auth/profile/',
    CHANGE_PASSWORD: '/api/auth/change-password/',
  },

  // Company
  COMPANY: {
    LIST: '/api/settings/companies/',
    DETAIL: (id: number) => `/api/settings/companies/${id}/`,
    CURRENT: '/api/settings/company/',
  },

  // Users
  USERS: {
    LIST: '/api/auth/users/',
    DETAIL: (id: number) => `/api/auth/users/${id}/`,
  },

  // Products
  PRODUCTS: {
    CATEGORIES: '/api/products/categories/',
    CATEGORY_DETAIL: (id: number) => `/api/products/categories/${id}/`,
    LIST: '/api/products/',
    DETAIL: (id: number) => `/api/products/${id}/`,
    PRICE_TIERS: '/api/products/price-tiers/',
    PRICE_TIER_DETAIL: (id: number) => `/api/products/price-tiers/${id}/`,
    TIER_PRICES: '/api/products/tier-prices/',
    TIER_PRICE_DETAIL: (id: number) => `/api/products/tier-prices/${id}/`,
  },

  // Categories (alias for convenience)
  CATEGORIES: {
    LIST: '/api/products/categories/',
    DETAIL: (id: number) => `/api/products/categories/${id}/`,
  },

  // Customers
  CUSTOMERS: {
    LIST: '/api/customers/',
    DETAIL: (id: number) => `/api/customers/${id}/`,
    GUEST: '/api/customers/guest/',
    LEDGER: (id: number) => `/api/customers/${id}/ledger/`,
    SETTLE_CREDIT: (id: number) => `/api/customers/${id}/settle-credit/`,
  },

  // Suppliers
  SUPPLIERS: {
    LIST: '/api/suppliers/',
    DETAIL: (id: number) => `/api/suppliers/${id}/`,
  },

  // Sales
  SALES: {
    LIST: '/api/sales/',
    DETAIL: (id: number) => `/api/sales/${id}/`,
    DAILY_REPORT: '/api/sales/daily-report/',
    TREND: '/api/sales/trend/',
    INVOICES: '/api/sales/invoices/',
    INVOICE_DETAIL: (id: number) => `/api/sales/invoices/${id}/`,
  },

  // Purchases
  PURCHASES: {
    LIST: '/api/purchases/',
    DETAIL: (id: number) => `/api/purchases/${id}/`,
    RECEIVE: (id: number) => `/api/purchases/${id}/receive/`,
  },

  // Inventory
  INVENTORY: {
    STOCK: '/api/inventory/stock/',
    STOCK_DETAIL: (productId: number) => `/api/inventory/stock/${productId}/`,
    MOVEMENTS: '/api/inventory/movements/',
    LOW_STOCK: '/api/inventory/low-stock/',
  },

  // Payments
  PAYMENTS: {
    LIST: '/api/payments/',
    DETAIL: (id: number) => `/api/payments/${id}/`,
  },

  // Documents
  DOCUMENTS: {
    INVOICES: '/api/documents/invoices/',
    INVOICE_DETAIL: (id: number) => `/api/documents/invoices/${id}/`,
    RECEIPTS: '/api/documents/receipts/',
    RECEIPT_DETAIL: (id: number) => `/api/documents/receipts/${id}/`,
  },
} as const;
