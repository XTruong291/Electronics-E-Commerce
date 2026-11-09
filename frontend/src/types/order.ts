export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "SHIPPING"
  | "DELIVERED"
  | "CANCELLED";

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  product_name: string;
  product_image?: string | null;
  unit_price: number;
  quantity: number;
}

export interface OrderItemCreatePayload {
  product_id: number;
  quantity: number;
}

export interface Order {
  id: number;
  order_id?: number;
  user_id?: number | null;
  recipient_name: string;
  recipient_phone: string;
  shipping_address: string;
  note?: string | null;
  total_amount: number;
  payment_method: string;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
}

export interface OrderCreatePayload {
  recipient_name: string;
  recipient_phone: string;
  shipping_address: string;
  note?: string;
  payment_method?: string;
  items: OrderItemCreatePayload[];
}

export interface OrderStatusUpdatePayload {
  status: OrderStatus;
}

export interface OrderListResponse {
  items: Order[];
  total: number;
  page: number;
  page_size: number;
}

export interface OrderFilterParams {
  status?: OrderStatus;
  search?: string;
  page?: number;
  page_size?: number;
}

export interface DailyRevenueItem {
  date: string;
  revenue: number;
  order_count: number;
}

export interface OrderStatusCount {
  PENDING: number;
  CONFIRMED: number;
  SHIPPING: number;
  DELIVERED: number;
  CANCELLED: number;
}

export interface DashboardStatsResponse {
  total_revenue: number;
  pending_revenue: number;
  total_orders: number;
  orders_by_status: OrderStatusCount;
  daily_stats: DailyRevenueItem[];
  recent_orders: Order[];
  total_products: number;
  total_categories: number;
  total_users: number;
}
