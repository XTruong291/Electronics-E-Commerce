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
  view_count?: number;
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
  category_slug?: string;
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

export interface RecordViewResponse {
  message: string;
  product_id: number;
  slug: string;
  view_count: number;
}

export interface ProductAnalyticsItem {
  id: number;
  name: string;
  slug: string;
  sku: string;
  brand: string;
  category_name?: string | null;
  price: number;
  sale_price?: number | null;
  stock: number;
  thumbnail_url?: string | null;
  is_active: boolean;
  view_count: number;
  order_count: number;
  units_sold: number;
  revenue: number;
  conversion_rate: number;
  diagnostic_hint?: string | null;
}

export interface BehaviorAnalyticsSummaryResponse {
  total_products: number;
  total_views: number;
  total_orders_with_items: number;
  total_units_sold: number;
  overall_conversion_rate: number;
  high_view_low_purchase_items: ProductAnalyticsItem[];
  top_viewed_items: ProductAnalyticsItem[];
  top_converted_items: ProductAnalyticsItem[];
}

export interface BehaviorAnalyticsParams {
  days?: number;
  min_views?: number;
  max_conversion_rate?: number;
  limit?: number;
}

