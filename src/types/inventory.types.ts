// Inventory Types

export interface StockItem {
  id: number;
  product: number;
  product_name: string;
  sku: string;
  quantity: number;
  reorder_level: number;
  is_low_stock: boolean;
  is_out_of_stock: boolean;
  unit_price: number;
  total_value: number;
  last_updated: string;
  product_attributes?: Array<{ name: string; value: string }>;
}

export interface StockMovement {
  id: number;
  product: number;
  product_name: string;
  movement_type: 'purchase' | 'sale' | 'adjustment' | 'return' | 'damage';
  quantity: number;
  reference_number?: string;
  notes?: string;
  created_by?: number;
  created_at: string;
  updated_at: string;
  product_attributes?: Array<{ name: string; value: string }>;
}

export interface StockAdjustmentFormData {
  product: number;
  movement_type: 'purchase' | 'sale' | 'adjustment' | 'return' | 'damage';
  quantity: number;
  reference_number?: string;
  notes?: string;
}

export interface InventoryStats {
  total_products: number;
  low_stock_count: number;
  out_of_stock_count: number;
  total_value: number;
}

export interface StockMovementFilters {
  product?: number;
  movement_type?: string;
  start_date?: string;
  end_date?: string;
}
