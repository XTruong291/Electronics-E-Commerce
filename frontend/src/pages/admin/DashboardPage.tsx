import React, { useEffect, useState, useCallback } from "react";
import {
  Card,
  Col,
  Row,
  Typography,
  Button,
  Space,
  Spin,
  Tag,
  Segmented,
  Progress,
  Table,
  Tooltip,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  ShoppingOutlined,
  AppstoreOutlined,
  OrderedListOutlined,
  UserOutlined,
  ArrowRightOutlined,
  ReloadOutlined,
  ShopOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import { Link, useNavigate } from "react-router-dom";
import { getAdminDashboardStats } from "../../api/order.api";
import type { DashboardStatsResponse, Order, OrderStatus } from "../../types/order";

const { Title, Text, Paragraph } = Typography;

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
      return <Tag color="cyan">Đang giao</Tag>;
    case "DELIVERED":
      return <Tag color="success">Đã giao</Tag>;
    case "CANCELLED":
      return <Tag color="error">Đã hủy</Tag>;
    default:
      return <Tag>{status}</Tag>;
  }
};

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [days, setDays] = useState<number>(7);
  const [stats, setStats] = useState<DashboardStatsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchStats = useCallback(async (selectedDays: number) => {
    setLoading(true);
    try {
      const data = await getAdminDashboardStats(selectedDays);
      setStats(data);
    } catch (err) {
      console.error("Lỗi nạp thống kê dashboard:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats(days);
  }, [days, fetchStats]);

  // Derived metrics
  const totalOrders = stats?.total_orders || 0;
  const deliveredCount = stats?.orders_by_status.DELIVERED || 0;
  const inFlightCount =
    (stats?.orders_by_status.PENDING || 0) +
    (stats?.orders_by_status.CONFIRMED || 0) +
    (stats?.orders_by_status.SHIPPING || 0);
  const cancelledCount = stats?.orders_by_status.CANCELLED || 0;

  const successRate = totalOrders > 0 ? Math.round((deliveredCount / totalOrders) * 100) : 0;

  // Recent orders table columns
  const orderColumns: ColumnsType<Order> = [
    {
      title: "Mã đơn",
      dataIndex: "id",
      key: "id",
      width: 90,
      render: (id: number) => <Text strong>#{id}</Text>,
    },
    {
      title: "Khách hàng",
      key: "customer",
      render: (_, record) => (
        <div>
          <Text strong style={{ fontSize: 13, display: "block" }}>
            {record.recipient_name}
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.recipient_phone}
          </Text>
        </div>
      ),
    },
    {
      title: "Thời gian",
      dataIndex: "created_at",
      key: "created_at",
      width: 140,
      render: (val: string) => (
        <span style={{ fontSize: 12 }}>{new Date(val).toLocaleString("vi-VN")}</span>
      ),
    },
    {
      title: "Tổng tiền",
      dataIndex: "total_amount",
      key: "total_amount",
      width: 130,
      render: (val: number) => (
        <span style={{ fontWeight: 700, color: "#cb1c22" }}>{formatPrice(val)}</span>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (st: OrderStatus) => getStatusTag(st),
    },
  ];

  // Daily stats max revenue for scaling chart bars
  const dailyStats = stats?.daily_stats || [];
  const maxRevenue = Math.max(...dailyStats.map((d) => d.revenue), 1);

  return (
    <div>
      {/* 1. HEADER & CONTROLS */}
      <div
        style={{
          marginBottom: 24,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          <Title level={3} style={{ margin: "0 0 4px 0", color: "#111827" }}>
            Bảng điều khiển Quản trị — XìMiStore
          </Title>
          <Paragraph type="secondary" style={{ margin: 0 }}>
            Theo dõi tổng doanh thu, tiến độ đơn hàng và các chỉ số hoạt động kinh doanh
          </Paragraph>
        </div>
        <Space size={12} wrap>
          <Segmented
            value={days}
            onChange={(val) => setDays(Number(val))}
            options={[
              { label: "7 ngày qua", value: 7 },
              { label: "14 ngày qua", value: 14 },
              { label: "30 ngày qua", value: 30 },
            ]}
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={() => fetchStats(days)}
            loading={loading}
          >
            Làm mới
          </Button>
          <Link to="/">
            <Button icon={<ShopOutlined />}>Xem Cửa hàng</Button>
          </Link>
        </Space>
      </div>

      <Spin spinning={loading} tip="Đang tải dữ liệu báo cáo...">
        {/* 2. TOP 4 METRIC CARDS */}
        <Row gutter={[16, 16]}>
          {/* Card 1: Doanh thu thực nhận */}
          <Col xs={24} sm={12} lg={6}>
            <Card
              bordered={false}
              hoverable
              style={{
                borderRadius: 12,
                boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
                border: "1px solid #e5e7eb",
                height: "100%",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <Text type="secondary" style={{ fontSize: 13, fontWeight: 500 }}>
                    Doanh thu thực nhận (Đã giao)
                  </Text>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "#cb1c22", margin: "6px 0 4px" }}>
                    {formatPrice(stats?.total_revenue || 0)}
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 8, fontSize: 12, color: "#6b7280" }}>
                Đang xử lý / vận chuyển:{" "}
                <strong style={{ color: "#2563eb" }}>
                  {formatPrice(stats?.pending_revenue || 0)}
                </strong>
              </div>
            </Card>
          </Col>

          {/* Card 2: Tổng đơn hàng & Tỷ lệ thành công */}
          <Col xs={24} sm={12} lg={6}>
            <Card
              bordered={false}
              hoverable
              style={{
                borderRadius: 12,
                boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
                border: "1px solid #e5e7eb",
                height: "100%",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <Text type="secondary" style={{ fontSize: 13, fontWeight: 500 }}>
                    Tổng số đơn hàng
                  </Text>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "#111827", margin: "6px 0 4px" }}>
                    {totalOrders} <span style={{ fontSize: 14, fontWeight: 500, color: "#6b7280" }}>đơn</span>
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 8, fontSize: 12, color: "#6b7280" }}>
                Giao thành công: <strong style={{ color: "#16a34a" }}>{deliveredCount} đơn</strong> ({successRate}%)
              </div>
            </Card>
          </Col>

          {/* Card 3: Đơn đang xử lý */}
          <Col xs={24} sm={12} lg={6}>
            <Card
              bordered={false}
              hoverable
              style={{
                borderRadius: 12,
                boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
                border: "1px solid #e5e7eb",
                height: "100%",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <Text type="secondary" style={{ fontSize: 13, fontWeight: 500 }}>
                    Đơn hàng cần xử lý
                  </Text>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "#2563eb", margin: "6px 0 4px" }}>
                    {inFlightCount} <span style={{ fontSize: 14, fontWeight: 500, color: "#6b7280" }}>đơn</span>
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 8, fontSize: 12 }}>
                <Link to="/admin/orders" style={{ color: "#2563eb", fontWeight: 600 }}>
                  Chuyển tới Quản lý Đơn hàng <ArrowRightOutlined />
                </Link>
              </div>
            </Card>
          </Col>

          {/* Card 4: Tổng kho & Danh mục */}
          <Col xs={24} sm={12} lg={6}>
            <Card
              bordered={false}
              hoverable
              style={{
                borderRadius: 12,
                boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
                border: "1px solid #e5e7eb",
                height: "100%",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <Text type="secondary" style={{ fontSize: 13, fontWeight: 500 }}>
                    Quy mô kho hàng & Người dùng
                  </Text>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "#111827", margin: "6px 0 4px" }}>
                    {stats?.total_products || 0}{" "}
                    <span style={{ fontSize: 14, fontWeight: 500, color: "#6b7280" }}>sản phẩm</span>
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 8, fontSize: 12, color: "#6b7280" }}>
                <strong>{stats?.total_categories || 0}</strong> danh mục •{" "}
                <strong>{stats?.total_users || 0}</strong> tài khoản
              </div>
            </Card>
          </Col>
        </Row>

        {/* 3. ROW 2: BIỂU ĐỒ DOANH THU & PHÂN BỔ TRẠNG THÁI ĐƠN */}
        <Row gutter={[16, 16]} style={{ marginTop: 20 }}>
          {/* CỘT TRÁI: BIỂU ĐỒ DOANH THU THEO NGÀY */}
          <Col xs={24} lg={16}>
            <Card
              title={
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>
                    Xu hướng Doanh thu & Đơn hàng ({days} ngày qua)
                  </span>
                  <Tag color="red" style={{ fontWeight: 600 }}>
                    Doanh thu phát sinh (không tính đơn hủy)
                  </Tag>
                </div>
              }
              bordered={false}
              style={{
                borderRadius: 12,
                boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
                border: "1px solid #e5e7eb",
                height: "100%",
              }}
              bodyStyle={{ padding: "20px 24px" }}
            >
              <div style={{ height: 240, display: "flex", alignItems: "flex-end", gap: 8, paddingBottom: 24, borderBottom: "1px solid #f3f4f6", position: "relative" }}>
                {dailyStats.map((item, index) => {
                  const barHeightPct = Math.max((item.revenue / maxRevenue) * 100, item.revenue > 0 ? 8 : 2);
                  return (
                    <div
                      key={index}
                      style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        height: "100%",
                        justifyContent: "flex-end",
                        position: "relative",
                      }}
                    >
                      <Tooltip
                        title={
                          <div>
                            <div><strong>Ngày: {item.date}</strong></div>
                            <div>Doanh thu: {formatPrice(item.revenue)}</div>
                            <div>Số đơn: {item.order_count} đơn</div>
                          </div>
                        }
                      >
                        <div
                          style={{
                            width: "75%",
                            maxWidth: 36,
                            height: `${barHeightPct}%`,
                            background: item.revenue > 0 ? "linear-gradient(180deg, #cb1c22 0%, #a8151a 100%)" : "#e5e7eb",
                            borderRadius: "6px 6px 2px 2px",
                            cursor: "pointer",
                            transition: "all 0.25s ease",
                            position: "relative",
                          }}
                        >
                          {item.order_count > 0 && (
                            <span
                              style={{
                                position: "absolute",
                                top: -20,
                                left: "50%",
                                transform: "translateX(-50%)",
                                fontSize: 11,
                                fontWeight: 700,
                                color: "#cb1c22",
                              }}
                            >
                              {item.order_count}
                            </span>
                          )}
                        </div>
                      </Tooltip>
                      <span
                        style={{
                          position: "absolute",
                          bottom: -22,
                          fontSize: 11,
                          color: "#6b7280",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.date}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24, fontSize: 12, color: "#6b7280" }}>
                <span>Đơn vị: VNĐ (Cột màu đỏ thể hiện Doanh thu, số trên đỉnh là số đơn)</span>
                <span>Tự động cập nhật theo múi giờ hệ thống</span>
              </div>
            </Card>
          </Col>

          {/* CỘT PHẢI: PHÂN BỔ TRẠNG THÁI ĐƠN HÀNG */}
          <Col xs={24} lg={8}>
            <Card
              title={<span style={{ fontWeight: 700, fontSize: 15 }}>Trạng thái đơn hàng</span>}
              bordered={false}
              style={{
                borderRadius: 12,
                boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
                border: "1px solid #e5e7eb",
                height: "100%",
              }}
              bodyStyle={{ padding: "20px 24px" }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>
                      <CheckCircleOutlined style={{ color: "#16a34a", marginRight: 6 }} />
                      Đã giao hàng (DELIVERED)
                    </span>
                    <strong style={{ color: "#16a34a" }}>{deliveredCount} đơn</strong>
                  </div>
                  <Progress
                    percent={totalOrders > 0 ? Math.round((deliveredCount / totalOrders) * 100) : 0}
                    strokeColor="#16a34a"
                    size="small"
                  />
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>
                      <SyncOutlined style={{ color: "#0891b2", marginRight: 6 }} />
                      Đang giao hàng (SHIPPING)
                    </span>
                    <strong style={{ color: "#0891b2" }}>
                      {stats?.orders_by_status.SHIPPING || 0} đơn
                    </strong>
                  </div>
                  <Progress
                    percent={
                      totalOrders > 0
                        ? Math.round(((stats?.orders_by_status.SHIPPING || 0) / totalOrders) * 100)
                        : 0
                    }
                    strokeColor="#0891b2"
                    size="small"
                  />
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>
                      <ClockCircleOutlined style={{ color: "#2563eb", marginRight: 6 }} />
                      Đã xác nhận (CONFIRMED)
                    </span>
                    <strong style={{ color: "#2563eb" }}>
                      {stats?.orders_by_status.CONFIRMED || 0} đơn
                    </strong>
                  </div>
                  <Progress
                    percent={
                      totalOrders > 0
                        ? Math.round(((stats?.orders_by_status.CONFIRMED || 0) / totalOrders) * 100)
                        : 0
                    }
                    strokeColor="#2563eb"
                    size="small"
                  />
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>
                      <ClockCircleOutlined style={{ color: "#d97706", marginRight: 6 }} />
                      Chờ xử lý (PENDING)
                    </span>
                    <strong style={{ color: "#d97706" }}>
                      {stats?.orders_by_status.PENDING || 0} đơn
                    </strong>
                  </div>
                  <Progress
                    percent={
                      totalOrders > 0
                        ? Math.round(((stats?.orders_by_status.PENDING || 0) / totalOrders) * 100)
                        : 0
                    }
                    strokeColor="#d97706"
                    size="small"
                  />
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>
                      <Text type="secondary">Đã hủy đơn (CANCELLED)</Text>
                    </span>
                    <strong style={{ color: "#dc2626" }}>{cancelledCount} đơn</strong>
                  </div>
                  <Progress
                    percent={totalOrders > 0 ? Math.round((cancelledCount / totalOrders) * 100) : 0}
                    strokeColor="#dc2626"
                    size="small"
                  />
                </div>
              </div>
            </Card>
          </Col>
        </Row>

        {/* 4. ROW 3: ĐƠN HÀNG MỚI NHẤT & LỐI TẮT */}
        <Row gutter={[16, 16]} style={{ marginTop: 20 }}>
          {/* CỘT TRÁI: BẢNG 5 ĐƠN HÀNG MỚI NHẤT */}
          <Col xs={24} lg={16}>
            <Card
              title={
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>Đơn hàng mới nhất</span>
                  <Link to="/admin/orders">
                    <Button type="link" size="small" style={{ color: "#cb1c22", fontWeight: 600 }}>
                      Xem tất cả <ArrowRightOutlined />
                    </Button>
                  </Link>
                </div>
              }
              bordered={false}
              style={{
                borderRadius: 12,
                boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
                border: "1px solid #e5e7eb",
              }}
              bodyStyle={{ padding: 0 }}
            >
              <Table<Order>
                columns={orderColumns}
                dataSource={stats?.recent_orders || []}
                rowKey="id"
                pagination={false}
                size="middle"
              />
            </Card>
          </Col>

          {/* CỘT PHẢI: LỐI TẮT QUẢN LÝ NHANH */}
          <Col xs={24} lg={8}>
            <Card
              title={<span style={{ fontWeight: 700, fontSize: 15 }}>Lối tắt quản lý (Quick Actions)</span>}
              bordered={false}
              style={{
                borderRadius: 12,
                boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
                border: "1px solid #e5e7eb",
                height: "100%",
              }}
              bodyStyle={{ padding: "20px" }}
            >
              <Row gutter={[12, 12]}>
                <Col span={12}>
                  <Button
                    block
                    size="large"
                    icon={<OrderedListOutlined style={{ color: "#cb1c22" }} />}
                    onClick={() => navigate("/admin/orders")}
                    style={{ height: 50, borderRadius: 8, fontWeight: 600 }}
                  >
                    Đơn hàng
                  </Button>
                </Col>
                <Col span={12}>
                  <Button
                    block
                    size="large"
                    icon={<ShoppingOutlined style={{ color: "#cb1c22" }} />}
                    onClick={() => navigate("/admin/products")}
                    style={{ height: 50, borderRadius: 8, fontWeight: 600 }}
                  >
                    Sản phẩm
                  </Button>
                </Col>
                <Col span={12}>
                  <Button
                    block
                    size="large"
                    icon={<AppstoreOutlined style={{ color: "#cb1c22" }} />}
                    onClick={() => navigate("/admin/categories")}
                    style={{ height: 50, borderRadius: 8, fontWeight: 600 }}
                  >
                    Danh mục
                  </Button>
                </Col>
                <Col span={12}>
                  <Button
                    block
                    size="large"
                    icon={<UserOutlined style={{ color: "#cb1c22" }} />}
                    onClick={() => navigate("/admin/users")}
                    style={{ height: 50, borderRadius: 8, fontWeight: 600 }}
                  >
                    Người dùng
                  </Button>
                </Col>
              </Row>

              <div
                style={{
                  marginTop: 20,
                  padding: "14px 16px",
                  borderRadius: 8,
                  background: "#f9fafb",
                  border: "1px solid #f3f4f6",
                }}
              >
                <Text strong style={{ display: "block", color: "#111827", marginBottom: 4 }}>
                  Hệ thống XìMiStore
                </Text>
                <Paragraph style={{ margin: 0, fontSize: 12, color: "#6b7280" }}>
                  Cơ sở dữ liệu MySQL đã đồng bộ dữ liệu thống kê doanh thu tức thời. Mọi đơn hàng cập nhật trạng thái sẽ tự động phản ánh vào bảng chỉ số.
                </Paragraph>
              </div>
            </Card>
          </Col>
        </Row>
      </Spin>
    </div>
  );
};

export default DashboardPage;
