import axios from '../axios';
import { API_ENDPOINTS } from '../endpoints';
import { PurchaseOrder, PurchaseOrderCreate } from '../../types/purchase.types';

const getAllPurchases = async (): Promise<PurchaseOrder[]> => {
  const response = await axios.get<PurchaseOrder[]>(API_ENDPOINTS.PURCHASES.LIST);
  return response.data;
};

const getPurchaseById = async (id: number): Promise<PurchaseOrder> => {
  const response = await axios.get<PurchaseOrder>(API_ENDPOINTS.PURCHASES.DETAIL(id));
  return response.data;
};

const createPurchase = async (data: PurchaseOrderCreate): Promise<PurchaseOrder> => {
  const response = await axios.post<PurchaseOrder>(API_ENDPOINTS.PURCHASES.LIST, data);
  return response.data;
};

const updatePurchase = async (id: number, data: Partial<PurchaseOrderCreate>): Promise<PurchaseOrder> => {
  const response = await axios.patch<PurchaseOrder>(API_ENDPOINTS.PURCHASES.DETAIL(id), data);
  return response.data;
};

const deletePurchase = async (id: number): Promise<void> => {
  await axios.delete(API_ENDPOINTS.PURCHASES.DETAIL(id));
};

const receivePurchase = async (
  id: number,
  items?: { id: number; received_quantity: number }[],
  updateStock = true
): Promise<PurchaseOrder> => {
  const response = await axios.post<PurchaseOrder>(
    API_ENDPOINTS.PURCHASES.RECEIVE(id),
    { ...(items ? { items } : {}), update_stock: updateStock }
  );
  return response.data;
};

export const purchaseService = {
  getAllPurchases,
  getPurchaseById,
  createPurchase,
  updatePurchase,
  deletePurchase,
  receivePurchase,
};
