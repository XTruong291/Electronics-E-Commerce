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

