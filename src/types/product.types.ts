export interface Category {
  id: number;
  name: string;
  description?: string;
  parent?: number | null;
  parent_name?: string | null;
  company: number;
  created_at: string;
  updated_at: string;
}

export interface Brand {
  id: number;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface ProductAttribute {
  id?: number;
  name: string;
  value: string;
}

export interface Product {
  id: number;
  name: string;
  description?: string;
  sku: string;
  barcode?: string;
  category: number;
  category_name?: string;
  brand?: number | null;
  brand_name?: string | null;
  unit_price: number;
  selling_price: number;
  cost_price?: number;
  stock_quantity: number;
  reorder_level: number;
  // GST fields
  gst_rate: number;
  hsn_code?: string;
  tax_included: boolean;
  base_price: number;
  // Additional backend fields
  unit?: string;
  tax_amount?: number;
  price_with_gst?: number;
  qr_code?: string;
  barcode_image?: string;
  image?: string;
  // Flexible attributes (e.g. Size MM, Pressure Class)
  attributes?: ProductAttribute[];
  // Meta
  company: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductFormData {
  name: string;
  description?: string;
  sku: string;
  barcode?: string;
  category: number;
  brand?: number | null;
  hsn_code?: string;
  unit?: string;
  cost_price?: number | string;
  unit_price?: number | string;
  selling_price?: number | string;
  gst_rate?: number | string;
  tax_included?: boolean;
  stock_quantity: number | string;
  reorder_level: number | string;
  image?: File | null | string;
  is_active?: boolean;
  attributes?: ProductAttribute[];
}

export interface CategoryFormData {
  name: string;
  description?: string;
  parent?: number | null;
}
