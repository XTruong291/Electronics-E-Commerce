import React, { useEffect, useState, useCallback } from "react";
import {
  Card,
  Typography,
  Tag,
  Space,
  List,
  Avatar,
  Divider,
  Pagination,
  Spin,
  Empty,
  Button,
  Popconfirm,
  message,
} from "antd";
import {
  ShoppingOutlined,
  CalendarOutlined,
  EnvironmentOutlined,
  CreditCardOutlined,
  ReloadOutlined,
  ShopOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";
import { Link } from "react-router-dom";
import { getMyOrders, cancelMyOrder } from "../../api/order.api";
import type { Order, OrderStatus } from "../../types/order";

const { Title, Text } = Typography;

const formatPrice = (val: number): string => {
  return `${Number(val || 0).toLocaleString("vi-VN")} ₫`;
};

const getStatusTag = (status: OrderStatus) => {
  switch (status) {
    case "PENDING":
      return <Tag color="gold">Chờ xử lý</Tag>;
    case "CONFIRMED":
      return <Tag color="blue">Đã xác nhận</Tag>;
    case "SHIPPING":
      return <Tag color="cyan">Đang giao hàng</Tag>;
    case "DELIVERED":
      return <Tag color="success">Đã giao thành công</Tag>;
    case "CANCELLED":
      return <Tag color="error">Đã hủy</Tag>;
    default:
      return <Tag>{status}</Tag>;
  }
};

const MyOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getMyOrders(page, pageSize);
      setOrders(res.items);
      setTotal(res.total);
    } catch (err) {
      console.error("Lỗi tải đơn hàng cá nhân:", err);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  const handleCancelOrder = async (orderId: number) => {
    setCancellingId(orderId);
    try {
      const updated = await cancelMyOrder(orderId);
      message.success("Đã hủy đơn hàng thành công! Số lượng sản phẩm đã được hoàn lại kho.");
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: updated.status } : o))
      );
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { detail?: string } } };
      message.error(
        errorObj.response?.data?.detail || "Không thể hủy đơn hàng. Vui lòng thử lại!"
      );
    } finally {
      setCancellingId(null);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "24px 16px 64px" }}>
      <div
        style={{
          marginBottom: 24,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Đơn hàng của tôi
          </Title>
          <Text type="secondary">Lịch sử và tiến độ các đơn hàng bạn đã đặt</Text>
        </div>
        <Button icon={<ReloadOutlined />} onClick={fetchOrders} loading={loading}>
          Làm mới
        </Button>
      </div>

      <Spin spinning={loading} tip="Đang tải danh sách đơn hàng...">
        {orders.length === 0 && !loading ? (
          <Card style={{ textAlign: "center", padding: "48px 0", borderRadius: 12 }}>
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="Bạn chưa có đơn hàng nào."
            >
              <Link to="/">
                <Button type="primary" icon={<ShopOutlined />} style={{ background: "#cb1c22", borderColor: "#cb1c22" }}>
                  Khám phá và Mua sắm ngay
                </Button>
              </Link>
            </Empty>
          </Card>
        ) : (
          <Space orientation="vertical" size={16} style={{ width: "100%" }}>
            {orders.map((order) => (
              <Card
                key={order.id}
                style={{
                  borderRadius: 12,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                  border: "1px solid #f0f0f0",
                }}
                title={
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: 8,
                    }}
                  >
                    <Space>
                      <ShoppingOutlined style={{ color: "#1677ff" }} />
                      <Text strong>Đơn hàng #{order.id}</Text>
                      <Text type="secondary" style={{ fontSize: 13 }}>
                        <CalendarOutlined style={{ marginRight: 4 }} />
                        {new Date(order.created_at).toLocaleString("vi-VN")}
                      </Text>
                    </Space>
                    <Space align="center" size={10}>
                      {getStatusTag(order.status)}
                      {order.status === "PENDING" && (
                        <Popconfirm
                          title="Hủy đơn hàng"
                          description="Bạn có chắc chắn muốn hủy đơn hàng này không? Sản phẩm sẽ được hoàn lại kho."
                          okText="Đồng ý hủy"
                          cancelText="Không"
                          okButtonProps={{ danger: true, loading: cancellingId === order.id }}
                          onConfirm={() => handleCancelOrder(order.id)}
                        >
                          <Button danger size="small" icon={<CloseCircleOutlined />} style={{ borderRadius: 6 }}>
                            Hủy đơn
                          </Button>
                        </Popconfirm>
                      )}
                    </Space>
                  </div>
                }
              >
                {/* Danh sách Order Items snapshot */}
                <List
                  itemLayout="horizontal"
                  dataSource={order.items}
                  renderItem={(item) => (
                    <List.Item style={{ padding: "12px 0" }}>
                      <List.Item.Meta
                        avatar={
                          <Avatar
                            shape="square"
                            size={56}
                            src={
                              item.product_image ||
                              "https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=100"
                            }
                          />
                        }
                        title={<Text strong>{item.product_name}</Text>}
                        description={
                          <Text type="secondary">
                            Đơn giá: {formatPrice(item.unit_price)} × {item.quantity}
                          </Text>
                        }
                      />
                      <div style={{ fontWeight: 600, fontSize: 14 }}>
                        {formatPrice(item.unit_price * item.quantity)}
                      </div>
                    </List.Item>
                  )}
                />

                <Divider style={{ margin: "12px 0" }} />

                {/* Thông tin giao hàng tóm tắt & Tổng thanh toán */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-end",
                    flexWrap: "wrap",
                    gap: 16,
                  }}
                >
                  <div style={{ maxWidth: 600 }}>
                    <Text type="secondary" style={{ fontSize: 13, display: "block" }}>
                      <EnvironmentOutlined style={{ marginRight: 6 }} />
                      Người nhận: <strong>{order.recipient_name}</strong> - {order.recipient_phone}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 13, display: "block" }}>
                      Địa chỉ: {order.shipping_address}
                    </Text>
                    {order.note && (
                      <Text type="secondary" style={{ fontSize: 13, display: "block", fontStyle: "italic" }}>
                        Ghi chú: {order.note}
                      </Text>
                    )}
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div style={{ marginBottom: 4 }}>
                      <Tag color="default">
                        <CreditCardOutlined style={{ marginRight: 4 }} />
                        {order.payment_method === "COD" ? "Thanh toán COD" : order.payment_method}
                      </Tag>
                    </div>
                    <div>
                      <Text type="secondary" style={{ marginRight: 8 }}>
                        Tổng tiền:
                      </Text>
                      <span style={{ fontSize: 18, fontWeight: 700, color: "#d9363e" }}>
                        {formatPrice(order.total_amount)}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </Space>
        )}
      </Spin>

      {total > 0 && (
        <div style={{ textAlign: "center", marginTop: 32 }}>
          <Pagination
            current={page}
            pageSize={pageSize}
            total={total}
            onChange={(p, ps) => {
              setPage(p);
              setPageSize(ps);
            }}
          />
        </div>
      )}
    </div>
  );
};

export default MyOrdersPage;
