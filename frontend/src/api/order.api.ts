import axiosClient from "./axiosClient";
import type {
  Order,
  OrderCreatePayload,
  OrderFilterParams,
  OrderListResponse,
  OrderStatus,
} from "../types/order";

export const createOrder = async (
  payload: OrderCreatePayload
): Promise<Order> => {
  return (await axiosClient.post(
    "/orders",
    payload
  )) as unknown as Order;
};

export const getMyOrders = async (
  page: number = 1,
  pageSize: number = 20
): Promise<OrderListResponse> => {
  return (await axiosClient.get("/orders/me", {
    params: { page, page_size: pageSize },
  })) as unknown as OrderListResponse;
};

export const getOrderDetail = async (
  orderId: number
): Promise<Order> => {
  return (await axiosClient.get(
    `/orders/${orderId}`
  )) as unknown as Order;
};

export const cancelMyOrder = async (orderId: number): Promise<Order> => {
  return (await axiosClient.post(
    `/orders/${orderId}/cancel`
  )) as unknown as Order;
};

export const getAdminOrders = async (
  params?: OrderFilterParams
): Promise<OrderListResponse> => {
  return (await axiosClient.get("/admin/orders", {
    params,
  })) as unknown as OrderListResponse;
};

export const updateOrderStatus = async (
  orderId: number,
  status: OrderStatus
): Promise<Order> => {
  return (await axiosClient.patch(`/admin/orders/${orderId}/status`, {
    status,
  })) as unknown as Order;
};

