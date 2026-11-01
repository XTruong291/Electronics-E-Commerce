import React, { useEffect, useState, useCallback } from "react";
import {
  Table,
  Card,
  Typography,
  Tag,
  Button,
  Space,
  Input,
  Select,
  Modal,
  Descriptions,
  List,
  Avatar,
  message,
  Popconfirm,
  Alert,
  Divider,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  OrderedListOutlined,
  ReloadOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import { getAdminOrders, updateOrderStatus } from "../../api/order.api";
import type { Order, OrderStatus } from "../../types/order";

const { Title, Text, Paragraph } = Typography;
const { Search } = Input;

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
      return <Tag color="success">Đã giao hàng</Tag>;
    case "CANCELLED":
      return <Tag color="error">Đã hủy</Tag>;
    default:
      return <Tag>{status}</Tag>;
  }
};

const OrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<OrderStatus | undefined>(undefined);
  const [searchKeyword, setSearchKeyword] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Modal detail & update status
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState<boolean>(false);
  const [updatingStatus, setUpdatingStatus] = useState<boolean>(false);
  const [newStatus, setNewStatus] = useState<OrderStatus | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAdminOrders({
        status: statusFilter,
        search: searchKeyword || undefined,
        page,
        page_size: pageSize,
      });
      setOrders(res.items);
      setTotal(res.total);
    } catch (err) {
      console.error("Lỗi tải danh sách đơn hàng:", err);
      message.error("Không thể tải danh sách đơn hàng quản trị.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchKeyword, page, pageSize]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleOpenDetail = (order: Order) => {
    setSelectedOrder(order);
    setNewStatus(order.status);
    setDetailModalOpen(true);
  };

  const handleUpdateStatus = async () => {
    if (!selectedOrder || !newStatus) return;
    if (newStatus === selectedOrder.status) {
      message.info("Trạng thái không thay đổi.");
      setDetailModalOpen(false);
      return;
    }

    setUpdatingStatus(true);
    try {
      const updated = await updateOrderStatus(selectedOrder.id, newStatus);
      message.success(`Đã cập nhật trạng thái đơn #${updated.id} thành "${newStatus}"!`);
      setSelectedOrder(updated);
      setDetailModalOpen(false);
      fetchOrders();
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { detail?: string } } };
      message.error(errorObj.response?.data?.detail || "Không thể cập nhật trạng thái đơn hàng.");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const isTerminalStatus =
    selectedOrder?.status === "DELIVERED" || selectedOrder?.status === "CANCELLED";

  const columns: ColumnsType<Order> = [
    {
      title: "Mã đơn",
      dataIndex: "id",
      key: "id",
      width: 100,
      render: (id: number) => <Text strong>#{id}</Text>,
    },
    {
      title: "Thời gian đặt",
      dataIndex: "created_at",
      key: "created_at",
      width: 160,
      render: (val: string) => (
        <span style={{ fontSize: 13 }}>{new Date(val).toLocaleString("vi-VN")}</span>
      ),
    },
    {
      title: "Khách hàng",
      key: "customer",
      render: (_, record) => (
        <div>
          <Text strong style={{ display: "block" }}>
            {record.recipient_name}
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.recipient_phone}
          </Text>
        </div>
      ),
    },
    {
      title: "Địa chỉ giao hàng",
      dataIndex: "shipping_address",
      key: "shipping_address",
      ellipsis: true,
      render: (addr: string) => <span title={addr}>{addr}</span>,
    },
    {
      title: "Tổng tiền",
      dataIndex: "total_amount",
      key: "total_amount",
      width: 140,
      render: (val: number) => (
        <span style={{ fontWeight: 700, color: "#cb1c22" }}>{formatPrice(val)}</span>
      ),
    },
    {
      title: "Thanh toán",
      dataIndex: "payment_method",
      key: "payment_method",
      width: 120,
      render: (method: string) => <Tag>{method}</Tag>,
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 140,
      render: (status: OrderStatus) => getStatusTag(status),
    },
    {
      title: "Hành động",
      key: "action",
      width: 140,
      render: (_, record) => (
        <Button
          type="primary"
          ghost
          size="small"
          icon={<EyeOutlined />}
          onClick={() => handleOpenDetail(record)}
        >
          Chi tiết
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div
        style={{
          marginBottom: 20,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Quản lý Đơn hàng (Orders Management)
          </Title>
          <Paragraph type="secondary" style={{ margin: 0 }}>
            Theo dõi, xử lý đơn hàng và cập nhật trạng thái vận chuyển cho khách hàng
          </Paragraph>
        </div>
        <Button icon={<ReloadOutlined />} onClick={fetchOrders} loading={loading}>
          Làm mới
        </Button>
      </div>

      {/* FILTER BAR */}
      <Card size="small" style={{ marginBottom: 16, borderRadius: 8 }}>
        <Space wrap size={12}>
          <Search
            placeholder="Tìm theo Mã đơn, Khách hàng, SĐT..."
            allowClear
            style={{ width: 280 }}
            onSearch={(val) => {
              setSearchKeyword(val.trim());
              setPage(1);
            }}
          />
          <Select
            style={{ width: 180 }}
            placeholder="Trạng thái đơn hàng"
            allowClear
            value={statusFilter}
            onChange={(val) => {
              setStatusFilter(val);
              setPage(1);
            }}
            options={[
              { label: "Chờ xử lý (PENDING)", value: "PENDING" },
              { label: "Đã xác nhận (CONFIRMED)", value: "CONFIRMED" },
              { label: "Đang giao (SHIPPING)", value: "SHIPPING" },
              { label: "Đã giao (DELIVERED)", value: "DELIVERED" },
              { label: "Đã hủy (CANCELLED)", value: "CANCELLED" },
            ]}
          />
        </Space>
      </Card>

      {/* TABLE */}
      <Card bodyStyle={{ padding: 0 }} style={{ borderRadius: 8, overflow: "hidden" }}>
        <Table<Order>
          columns={columns}
          dataSource={orders}
          rowKey="id"
          loading={loading}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            pageSizeOptions: ["10", "20", "50"],
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
          }}
        />
      </Card>

      {/* MODAL CHI TIẾT & CẬP NHẬT TRẠNG THÁI */}
      <Modal
        title={
          selectedOrder ? (
            <Space>
              <OrderedListOutlined style={{ color: "#cb1c22" }} />
              <span>Chi tiết Đơn hàng #{selectedOrder.id}</span>
              {getStatusTag(selectedOrder.status)}
            </Space>
          ) : (
            "Chi tiết đơn hàng"
          )
        }
        open={detailModalOpen}
        onCancel={() => setDetailModalOpen(false)}
        width={700}
        footer={[
          <Button key="close" onClick={() => setDetailModalOpen(false)}>
            Đóng
          </Button>,
          !isTerminalStatus && (
            <Popconfirm
              key="update"
              title="Xác nhận cập nhật trạng thái"
              description={
                newStatus === "CANCELLED"
                  ? "Hủy đơn hàng sẽ tự động hoàn trả tồn kho cho tất cả sản phẩm. Bạn có chắc chắn muốn hủy?"
                  : `Bạn có muốn đổi trạng thái đơn sang "${newStatus}"?`
              }
              onConfirm={handleUpdateStatus}
              okText="Đồng ý"
              cancelText="Hủy"
            >
              <Button type="primary" loading={updatingStatus}>
                Lưu trạng thái
              </Button>
            </Popconfirm>
          ),
        ]}
      >
        {selectedOrder && (
          <div>
            {/* THÔNG TIN KHÁCH HÀNG & GIAO NHẬN */}
            <Descriptions bordered size="small" column={2} style={{ marginTop: 12 }}>
              <Descriptions.Item label="Người nhận">
                {selectedOrder.recipient_name}
              </Descriptions.Item>
              <Descriptions.Item label="Số điện thoại">
                {selectedOrder.recipient_phone}
              </Descriptions.Item>
              <Descriptions.Item label="Địa chỉ" span={2}>
                {selectedOrder.shipping_address}
              </Descriptions.Item>
              <Descriptions.Item label="Phương thức">{selectedOrder.payment_method}</Descriptions.Item>
              <Descriptions.Item label="Ngày đặt">
                {new Date(selectedOrder.created_at).toLocaleString("vi-VN")}
              </Descriptions.Item>
              {selectedOrder.note && (
                <Descriptions.Item label="Ghi chú" span={2}>
                  {selectedOrder.note}
                </Descriptions.Item>
              )}
            </Descriptions>

            <Divider style={{ margin: "16px 0" }} />

            {/* DANH SÁCH MẶT HÀNG (SNAPSHOT) */}
            <Text strong style={{ fontSize: 14 }}>
              Danh sách sản phẩm trong đơn ({selectedOrder.items?.length || 0} mục):
            </Text>
            <List
              itemLayout="horizontal"
              dataSource={selectedOrder.items}
              style={{ marginTop: 8 }}
              renderItem={(item) => (
                <List.Item style={{ padding: "8px 0" }}>
                  <List.Item.Meta
                    avatar={
                      <Avatar
                        shape="square"
                        size={48}
                        src={
                          item.product_image ||
                          "https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=100"
                        }
                      />
                    }
                    title={<Text strong>{item.product_name}</Text>}
                    description={`Đơn giá: ${formatPrice(item.unit_price)} × ${item.quantity}`}
                  />
                  <div style={{ fontWeight: 600 }}>
                    {formatPrice(item.unit_price * item.quantity)}
                  </div>
                </List.Item>
              )}
            />

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                alignItems: "baseline",
                gap: 12,
                marginTop: 12,
                padding: "8px 0",
                borderTop: "1px dashed #d9d9d9",
              }}
            >
              <Text strong style={{ fontSize: 15 }}>
                Tổng giá trị đơn:
              </Text>
              <span style={{ fontSize: 20, fontWeight: 700, color: "#cb1c22" }}>
                {formatPrice(selectedOrder.total_amount)}
              </span>
            </div>

            <Divider style={{ margin: "16px 0" }} />

            {/* CẬP NHẬT TRẠNG THÁI */}
            <div style={{ background: "#fafafa", padding: 16, borderRadius: 8 }}>
              <Text strong style={{ display: "block", marginBottom: 8 }}>
                Xử lý trạng thái đơn hàng:
              </Text>
              {isTerminalStatus ? (
                <Alert
                  type="info"
                  showIcon
                  message={`Đơn hàng đã ở trạng thái kết thúc (${selectedOrder.status}) và không thể chỉnh sửa thêm.`}
                />
              ) : (
                <Space direction="vertical" style={{ width: "100%" }} size={10}>
                  <Select<OrderStatus>
                    style={{ width: "100%" }}
                    value={newStatus || selectedOrder.status}
                    onChange={(val) => setNewStatus(val)}
                    options={[
                      { label: "Chờ xử lý (PENDING)", value: "PENDING" },
                      { label: "Đã xác nhận (CONFIRMED)", value: "CONFIRMED" },
                      { label: "Đang giao hàng (SHIPPING)", value: "SHIPPING" },
                      { label: "Đã giao thành công (DELIVERED)", value: "DELIVERED" },
                      { label: "Hủy đơn hàng (CANCELLED)", value: "CANCELLED" },
                    ]}
                  />
                  {newStatus === "CANCELLED" && (
                    <Alert
                      type="warning"
                      showIcon
                      message="Cảnh báo hoàn tồn kho"
                      description="Khi chuyển trạng thái sang CANCELLED, hệ thống sẽ tự động cộng hoàn trả lại số lượng tồn kho cho các sản phẩm trong đơn."
                    />
                  )}
                </Space>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default OrdersPage;
