export interface UserEventPayload {
  event_type: "PRODUCT_VIEW" | "ADD_TO_CART" | "REMOVE_FROM_CART" | "SEARCH" | "CATEGORY_VIEW";
  session_id?: string;
  product_id?: number;
  category_id?: number;
  search_query?: string;
  metadata_json?: Record<string, unknown>;
}

export interface ConversionFunnelSummary {
  total_views: number;
  total_cart_adds: number;
  total_orders: number;
  view_to_cart_pct: number;
  cart_to_order_pct: number;
  overall_conversion_pct: number;
}

export interface HighDropoffProductItem {
  product_id: number;
  product_name: string;
  thumbnail_url?: string;
  category_name: string;
  brand: string;
  price: number;
  sale_price?: number;
  views: number;
  cart_adds: number;
  units_sold: number;
  dropoff_rate_pct: number;
  status_flag: "HIGH_DROPOFF" | "CONSIDERING" | "HEALTHY";
}

export interface TopSellingProductItem {
  product_id: number;
  product_name: string;
  sku: string;
  thumbnail_url?: string;
  category_name: string;
  brand: string;
  price: number;
  sale_price?: number;
  units_sold: number;
  order_count: number;
  gross_revenue: number;
  current_stock: number;
}

export interface SlowMovingProductItem {
  product_id: number;
  product_name: string;
  sku: string;
  thumbnail_url?: string;
  category_name: string;
  brand: string;
  price: number;
  sale_price?: number;
  current_stock: number;
  inventory_value: number;
  units_sold_period: number;
  views_period: number;
  days_in_stock: number;
  aging_status: "DEAD_STOCK" | "SLOW_MOVING";
}

export interface CategoryInterestItem {
  category_id: number;
  category_name: string;
  total_interactions: number;
  percentage: number;
}

export interface BrandInterestItem {
  brand: string;
  total_interactions: number;
  percentage: number;
}

export interface SearchKeywordItem {
  keyword: string;
  search_count: number;
}

export interface AnalyticsOverviewResponse {
  days: number;
  funnel: ConversionFunnelSummary;
  high_dropoff_products: HighDropoffProductItem[];
  top_selling_products: TopSellingProductItem[];
  slow_moving_products: SlowMovingProductItem[];
  category_interest: CategoryInterestItem[];
  brand_interest: BrandInterestItem[];
  top_search_keywords: SearchKeywordItem[];
  total_events_recorded: number;
}

export interface GeminiInsightsResponse {
  source: "gemini_ai" | "rule_based_fallback";
  model: string;
  executive_summary: string;
  dropoff_analysis: string;
  trend_insights: string;
  actionable_recommendations: string[];
  generated_at: string;
}

export interface ChatMessageItem {
  role: "user" | "assistant";
  content: string;
}

export interface AdminAIChatRequest {
  question: string;
  days?: number;
  history?: ChatMessageItem[];
}

export interface AdminAIChatResponse {
  answer: string;
  suggested_followups: string[];
  data_sources_used: string[];
  source: "gemini_ai" | "rule_based_fallback";
  generated_at: string;
}
