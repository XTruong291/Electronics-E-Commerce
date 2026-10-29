export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  is_active: boolean;
  created_at: string;
  product_count?: number;
}

export interface CategoryCreatePayload {
  name: string;
  slug?: string;
  description?: string;
  is_active?: boolean;
}

export interface CategoryUpdatePayload {
  name?: string;
  slug?: string;
  description?: string;
  is_active?: boolean;
}

export interface Product {
  id: number;
  category_id: number;
  name: string;
  slug: string;
  sku: string;
  brand: string;
  price: number;
  sale_price?: number | null;
  stock: number;
  thumbnail_url?: string | null;
  images: string[];
  specifications: Record<string, string | number | boolean>;
  description?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  category?: Category | null;
}

export interface ProductCreatePayload {
  category_id: number;
  name: string;
  slug?: string;
  sku: string;
  brand: string;
  price: number;
  sale_price?: number | null;
  stock?: number;
  thumbnail_url?: string | null;
  images?: string[];
  specifications?: Record<string, string | number | boolean>;
  description?: string | null;
  is_active?: boolean;
}

export interface ProductUpdatePayload {
  category_id?: number;
  name?: string;
  slug?: string;
  sku?: string;
  brand?: string;
  price?: number;
  sale_price?: number | null;
  stock?: number;
  thumbnail_url?: string | null;
  images?: string[];
  specifications?: Record<string, string | number | boolean>;
  description?: string | null;
  is_active?: boolean;
}

export interface ProductListResponse {
  items: Product[];
  total: number;
  page: number;
  page_size: number;
}

export interface ProductFilterParams {
  search?: string;
  category_id?: number;
  brand?: string;
  min_price?: number;
  max_price?: number;
  sort_by?: string;
  include_inactive?: boolean;
  is_active?: boolean;
  page?: number;
  page_size?: number;
}

export interface UploadImageResponse {
  url: string;
}

export interface CommonMessageResponse {
  message: string;
}

