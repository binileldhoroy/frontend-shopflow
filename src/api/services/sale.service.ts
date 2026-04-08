import axiosInstance from '../axios';
import { API_ENDPOINTS } from '../endpoints';
import type { POSAuditLog } from '../../types/sale.types';

export interface SaleFormData {
  order_number: string;
  customer: number | null;
  payment_method: string;
  payment_status: string;
  billing_state: number | null;
  place_of_supply: number | null;
  discount_percentage: number;
  items: Array<{
    product: number;
    quantity: number;
    unit_price: number;
    gst_rate: number;
    hsn_code: string;
  }>;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export const saleService = {
  // Get all sales with pagination
  // Get all sales with pagination and filters
  getAll: async (page: number = 1, pageSize: number = 10, filters?: { startDate?: string; endDate?: string; paymentMethod?: string; hasInvoice?: boolean; status?: string }): Promise<PaginatedResponse<any>> => {
    let url = `${API_ENDPOINTS.SALES.LIST}?page=${page}&page_size=${pageSize}`;
    if (filters?.startDate) url += `&start_date=${filters.startDate}`;
    if (filters?.endDate) url += `&end_date=${filters.endDate}`;
    if (filters?.paymentMethod) url += `&payment_method=${filters.paymentMethod}`;
    if (filters?.hasInvoice !== undefined) url += `&has_invoice=${filters.hasInvoice}`;
    if (filters?.status) url += `&status=${filters.status}`;

    const response = await axiosInstance.get<PaginatedResponse<any>>(url);
    return response.data;
  },

  // Search sales by query with pagination
  search: async (query: string, page: number = 1, pageSize: number = 10, filters?: { hasInvoice?: boolean }): Promise<PaginatedResponse<any>> => {
    let url = `${API_ENDPOINTS.SALES.LIST}?search=${encodeURIComponent(query)}&page=${page}&page_size=${pageSize}`;
    if (filters?.hasInvoice !== undefined) url += `&has_invoice=${filters.hasInvoice}`;
    const response = await axiosInstance.get<PaginatedResponse<any>>(url);
    return response.data;
  },

  // Get sale by ID
  getById: async (id: number): Promise<any> => {
    const response = await axiosInstance.get(API_ENDPOINTS.SALES.DETAIL(id));
    return response.data;
  },

  // Create sale
  create: async (data: SaleFormData): Promise<any> => {
    const response = await axiosInstance.post(API_ENDPOINTS.SALES.LIST, data);
    return response.data;
  },

  // Update sale
  update: async (id: number, data: Partial<SaleFormData>): Promise<any> => {
    const response = await axiosInstance.put(API_ENDPOINTS.SALES.DETAIL(id), data);
    return response.data;
  },

  // Delete sale
  delete: async (id: number): Promise<void> => {
    await axiosInstance.delete(API_ENDPOINTS.SALES.DETAIL(id));
  },

  // --- Advance Invoices ---

  // Get all advance invoices with pagination
  getAdvanceInvoices: async (page: number = 1, pageSize: number = 10, filters?: { status?: string }): Promise<PaginatedResponse<any>> => {
    let url = `${API_ENDPOINTS.SALES.ADVANCE_INVOICES}?page=${page}&page_size=${pageSize}`;
    if (filters?.status) url += `&advance_status=${filters.status}`;

    const response = await axiosInstance.get<PaginatedResponse<any>>(url);
    return response.data;
  },

  // Get advance invoice by ID
  getAdvanceInvoiceById: async (id: number): Promise<any> => {
    const response = await axiosInstance.get(API_ENDPOINTS.SALES.ADVANCE_INVOICE_DETAIL(id));
    return response.data;
  },

  // Create advance invoice
  createAdvanceInvoice: async (data: SaleFormData): Promise<any> => {
    const response = await axiosInstance.post(API_ENDPOINTS.SALES.ADVANCE_INVOICES, data);
    return response.data;
  },

  // Update advance invoice status
  updateAdvanceInvoiceStatus: async (id: number, status: string, paymentMethod?: string): Promise<any> => {
    const payloads: any = { advance_status: status };
    if (paymentMethod) {
      payloads.payment_method = paymentMethod;
    }
    const response = await axiosInstance.post(API_ENDPOINTS.SALES.ADVANCE_INVOICE_STATUS(id), payloads);
    return response.data;
  },

  // --- POS Error-Handling ---

  // Edit a DRAFT bill's items and discount
  editDraft: async (id: number, payload: {
    items: Array<{
      product?: number | null;
      product_name: string;
      quantity: number;
      unit_price: number;
      gst_rate?: number;
      hsn_code?: string;
    }>;
    discount_percentage?: number;
    notes?: string;
  }): Promise<any> => {
    const response = await axiosInstance.patch(API_ENDPOINTS.SALES.EDIT_DRAFT(id), payload);
    return response.data;
  },

  // Void a COMPLETED bill (Manager/Admin only)
  voidBill: async (id: number, reason: string): Promise<any> => {
    const response = await axiosInstance.post(API_ENDPOINTS.SALES.VOID(id), { reason });
    return response.data;
  },

  // Clone-and-correct a COMPLETED bill (Manager/Admin only)
  correctBill: async (id: number, reason: string): Promise<{ message: string; original_order: string; new_order: any }> => {
    const response = await axiosInstance.post(API_ENDPOINTS.SALES.CORRECT(id), { reason });
    return response.data;
  },

  // Finalize a DRAFT bill → COMPLETED
  completeBill: async (id: number): Promise<any> => {
    const response = await axiosInstance.post(API_ENDPOINTS.SALES.COMPLETE(id), {});
    return response.data;
  },

  // Get audit log for a specific bill (Manager/Admin only)
  getBillAuditLogs: async (id: number): Promise<POSAuditLog[]> => {
    const response = await axiosInstance.get<POSAuditLog[]>(API_ENDPOINTS.SALES.BILL_AUDIT_LOGS(id));
    return response.data;
  },

  // Get all audit logs, optionally filtered (Manager/Admin only)
  getAuditLogs: async (filters?: { order_id?: number; action?: string }): Promise<POSAuditLog[]> => {
    let url = API_ENDPOINTS.SALES.AUDIT_LOGS;
    const params = new URLSearchParams();
    if (filters?.order_id) params.append('order_id', String(filters.order_id));
    if (filters?.action) params.append('action', filters.action);
    if (params.toString()) url += `?${params.toString()}`;
    const response = await axiosInstance.get<POSAuditLog[]>(url);
    return response.data;
  },
};
