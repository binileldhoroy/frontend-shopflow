import axiosInstance from '../axios';
import { API_ENDPOINTS } from '../endpoints';
import {
  StockItem,
  StockMovement,
  StockAdjustmentFormData,
} from '../../types/inventory.types';

export const inventoryService = {
  // Get all stock items with optional filters
  getStock: async (params?: any): Promise<any> => {
    const response = await axiosInstance.get(API_ENDPOINTS.INVENTORY.STOCK, { params });
    return response.data;
  },

  // Get stock for a specific product
  getStockByProduct: async (productId: number): Promise<StockItem> => {
    const response = await axiosInstance.get<StockItem>(
      API_ENDPOINTS.INVENTORY.STOCK_DETAIL(productId)
    );
    return response.data;
  },

  // Get stock movements with optional filters
  getStockMovements: async (filters?: any): Promise<any> => {
    const response = await axiosInstance.get(
      API_ENDPOINTS.INVENTORY.MOVEMENTS,
      { params: filters }
    );
    return response.data;
  },

  // Get low stock alerts
  getLowStockAlerts: async (): Promise<StockItem[]> => {
    const response = await axiosInstance.get<StockItem[]>(API_ENDPOINTS.INVENTORY.LOW_STOCK);
    return response.data;
  },

  // Create stock movement (adjustment)
  createStockMovement: async (data: StockAdjustmentFormData): Promise<StockMovement> => {
    const response = await axiosInstance.post<StockMovement>(
      API_ENDPOINTS.INVENTORY.MOVEMENTS,
      data
    );
    return response.data;
  },
};
