import axiosInstance from '../axios';
import { API_ENDPOINTS } from '../endpoints';
import {
  TaxInvoice,
  TaxInvoiceCreate,
  InvoiceFilters,
} from '../../types/invoice.types';

// Paginated response type
interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export const invoiceService = {
  // Get all invoices with optional filters
  getInvoices: async (filters?: InvoiceFilters): Promise<PaginatedResponse<TaxInvoice>> => {
    const response = await axiosInstance.get<PaginatedResponse<TaxInvoice>>(
      API_ENDPOINTS.SALES.INVOICES,
      { params: filters }
    );
    return response.data;
  },

  // Get single invoice by ID
  getInvoiceById: async (id: number): Promise<TaxInvoice> => {
    const response = await axiosInstance.get<TaxInvoice>(
      API_ENDPOINTS.SALES.INVOICE_DETAIL(id)
    );
    return response.data;
  },

  // Create invoice from sale order
  createInvoice: async (data: TaxInvoiceCreate): Promise<TaxInvoice> => {
    const response = await axiosInstance.post<TaxInvoice>(
      API_ENDPOINTS.SALES.INVOICES,
      data
    );
    return response.data;
  },

  // Cancel invoice
  cancelInvoice: async (
    id: number,
    cancellation_reason?: string
  ): Promise<{ message: string }> => {
    const response = await axiosInstance.delete<{ message: string }>(
      API_ENDPOINTS.SALES.INVOICE_DETAIL(id),
      { data: { cancellation_reason } }
    );
    return response.data;
  },
};

// E-Invoice
export const eInvoiceService = {
  generate: async (invoiceId: number) => {
    const r = await axiosInstance.post('/api/sales/einvoice/generate/', { invoice_id: invoiceId });
    return r.data;
  },
  cancel: async (invoiceId: number, reason: string) => {
    const r = await axiosInstance.post('/api/sales/einvoice/cancel/', { invoice_id: invoiceId, reason });
    return r.data;
  },
};

export const eWayBillService = {
  generate: async (data: {
    sale_order_id: number;
    transporter_id?: string;
    transporter_name?: string;
    vehicle_no?: string;
    transport_mode?: string;
    distance?: number;
  }) => {
    const r = await axiosInstance.post('/api/sales/ewaybill/generate/', data);
    return r.data;
  },
  cancel: async (ewbId: number, reason: string) => {
    const r = await axiosInstance.post(`/api/sales/ewaybill/${ewbId}/cancel/`, { reason });
    return r.data;
  },
};
