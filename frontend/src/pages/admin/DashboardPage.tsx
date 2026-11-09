import React, { useEffect, useState, useCallback } from "react";
import {
  Card,
  Col,
  Row,
  Statistic,
  Typography,
  Button,
  Space,
  Spin,
  Table,
  Tag,
  Progress,
  Radio,
  InputNumber,
  Tabs,
  Image,
  Tooltip,
  Alert,
  message,
} from "antd";
import {
  ShoppingOutlined,
  AppstoreOutlined,
  OrderedListOutlined,
  UserOutlined,
  ArrowRightOutlined,
  ReloadOutlined,
  ShopOutlined,
  EyeOutlined,
  RiseOutlined,
  WarningOutlined,
  FireOutlined,
  TrophyOutlined,
  EditOutlined,
  LinkOutlined,
} from "@ant-design/icons";
import { Link } from "react-router-dom";
import {
  getCategories,
  getProducts,
  getBehaviorAnalytics,
  syncProductViews,
} from "../../api/catalog.api";
import { getAdminOrders } from "../../api/order.api";
import type {
  BehaviorAnalyticsSummaryResponse,
  ProductAnalyticsItem,
} from "../../types/catalog";

const { Title, Text, Paragraph } = Typography;

const FALLBACK_IMAGE =
  "data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2060%2060%22%20preserveAspectRatio%3D%22none%22%3E%3Crect%20width%3D%2260%22%20height%3D%2260%22%20fill%3D%22%23EEEEEE%22%3E%3C%2Frect%3E%3Ctext%20x%3D%2214%22%20y%3D%2234%22%20fill%3D%22%23AAAAAA%22%20font-size%3D%2210pt%22%20font-family%3D%22Arial%22%3ENo%20Img%3C%2Ftext%3E%3C%2Fsvg%3E";

const formatVND = (num: number): string => {
  return `${Number(num || 0).toLocaleString("vi-VN")} ₫`;
};

const DashboardPage: React.FC = () => {
  // Overview Counters
  const [productCount, setProductCount] = useState<number | null>(null);
  const [categoryCount, setCategoryCount] = useState<number | null>(null);
  const [orderCount, setOrderCount] = useState<number | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(false);

  // Analytics Behavior Data
  const [analyticsData, setAnalyticsData] = useState<BehaviorAnalyticsSummaryResponse | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  // Analytics Filters
  const [timeFilter, setTimeFilter] = useState<number | undefined>(undefined); // undefined = all time, 7 = 7 days, 30 = 30 days
  const [minViews, setMinViews] = useState<number>(5);
  const [maxConversionRate, setMaxConversionRate] = useState<number>(10.0);

  const fetchOverview = async () => {
    setLoadingOverview(true);
    try {
      const [catList, prodRes, orderRes] = await Promise.all([
        getCategories(true),
        getProducts({ page_size: 1, include_inactive: true }),
        getAdminOrders({ page_size: 1 }),
      ]);
      setCategoryCount(catList.length);
      setProductCount(prodRes.total);
      setOrderCount(orderRes.total);
    } catch {
      // Ignored
    } finally {
      setLoadingOverview(false);
    }
  };

  const fetchAnalytics = useCallback(async () => {
    setLoadingAnalytics(true);
    try {
      const res = await getBehaviorAnalytics({
        days: timeFilter,
        min_views: minViews,
        max_conversion_rate: maxConversionRate,
        limit: 15,
      });
      setAnalyticsData(res);
    } catch {
      // Ignored
    } finally {
      setLoadingAnalytics(false);
    }
  }, [timeFilter, minViews, maxConversionRate]);

  useEffect(() => {
    fetchOverview();
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const [syncing, setSyncing] = useState(false);

  const handleRefreshAll = async () => {
    setSyncing(true);
    try {
      await syncProductViews();
      message.success("Đã đồng bộ số lượt xem thực tế và làm mới dữ liệu!");
    } catch {
      // Ignored
    } finally {
      setSyncing(false);
      fetchOverview();
      fetchAnalytics();
    }
  };

  // Diagnostic Tag Renderer
  const renderDiagnosticTag = (hint?: string | null) => {
    if (!hint) return <Text type="secondary">—</Text>;
    if (hint.includes("Hết hàng")) {
      return (
        <Tag color="error" icon={<WarningOutlined />}>
          {hint}
        </Tag>
      );
    }
    if (hint.includes("Chưa có giá")) {
      return (
        <Tag color="warning" icon={<RiseOutlined />}>
          {hint}
        </Tag>
      );
    }
    return <Tag color="orange">{hint}</Tag>;
  };

  // Common Table Columns for Analytics Items
  const renderAnalyticsColumns = (showDiagnosis: boolean = false) => {
    const cols = [
      {
        title: "Sản phẩm",
        key: "product",
        width: 280,
        render: (_: unknown, record: ProductAnalyticsItem) => (
          <Space orientation="horizontal" size={12} align="start">
            <Image
              src={record.thumbnail_url || FALLBACK_IMAGE}
              fallback={FALLBACK_IMAGE}
              width={48}
              height={48}
              style={{ objectFit: "cover", borderRadius: 6, border: "1px solid #f0f0f0" }}
            />
            <div>
              <Text strong style={{ fontSize: 13, display: "block", lineHeight: 1.3 }}>
                {record.name}
              </Text>
              <Space orientation="horizontal" size={4} style={{ marginTop: 4 }}>
                <Tag color="geekblue" style={{ fontSize: 10, lineHeight: "16px" }}>
                  SKU: {record.sku}
                </Tag>
                {record.category_name && (
                  <Tag color="purple" style={{ fontSize: 10, lineHeight: "16px" }}>
                    {record.category_name}
                  </Tag>
                )}
              </Space>
            </div>
          </Space>
        ),
      },
      {
        title: "Giá bán",
        key: "price",
        width: 140,
        render: (_: unknown, record: ProductAnalyticsItem) => (
          <div>
            <div style={{ fontWeight: 700, color: "#111827", fontSize: 13 }}>
              {formatVND(record.sale_price ?? record.price)}
            </div>
            {record.sale_price && record.sale_price < record.price && (
              <div style={{ textDecoration: "line-through", color: "#9ca3af", fontSize: 11 }}>
                {formatVND(record.price)}
              </div>
            )}
          </div>
        ),
      },
      {
        title: "Kho",
        dataIndex: "stock",
        key: "stock",
        width: 90,
        render: (stock: number) => {
          if (stock <= 0) return <Tag color="red">Hết</Tag>;
          if (stock <= 5) return <Tag color="orange">{stock} cái</Tag>;
          return <Text>{stock} cái</Text>;
        },
      },
      {
        title: "Lượt xem",
        dataIndex: "view_count",
        key: "view_count",
        width: 110,
        sorter: (a: ProductAnalyticsItem, b: ProductAnalyticsItem) => a.view_count - b.view_count,
        render: (val: number) => (
          <span style={{ fontWeight: 700, color: "#1d4ed8", fontSize: 14 }}>
            <EyeOutlined style={{ marginRight: 4 }} />
            {val.toLocaleString("vi-VN")}
          </span>
        ),
      },
      {
        title: "Lượt mua",
        key: "purchase_stats",
        width: 120,
        render: (_: unknown, record: ProductAnalyticsItem) => (
          <div>
            <div style={{ fontWeight: 600, color: "#15803d", fontSize: 13 }}>
              {record.order_count} đơn hàng
            </div>
            <div style={{ fontSize: 11, color: "#6b7280" }}>
              ({record.units_sold} sản phẩm)
            </div>
          </div>
        ),
      },
      {
        title: "Tỉ lệ chuyển đổi (CR)",
        dataIndex: "conversion_rate",
        key: "conversion_rate",
        width: 170,
        sorter: (a: ProductAnalyticsItem, b: ProductAnalyticsItem) => a.conversion_rate - b.conversion_rate,
        render: (cr: number) => {
          let color = "#10b981"; // green
          if (cr < 5) color = "#ef4444"; // red
          else if (cr < 12) color = "#f59e0b"; // yellow/orange

          return (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                <span style={{ fontWeight: 700, fontSize: 13, color }}>
                  {cr.toFixed(1)}%
                </span>
                <span style={{ fontSize: 11, color: "#8c8c8c" }}>
                  {cr < 5 ? "Rất thấp" : cr < 12 ? "Trung bình" : "Tốt"}
                </span>
              </div>
              <Progress
                percent={Math.min(100, cr)}
                strokeColor={color}
                showInfo={false}
                size="small"
              />
            </div>
          );
        },
      },
    ];

    if (showDiagnosis) {
      cols.push({
        title: "Chẩn đoán & Đề xuất",
        key: "diagnostic_hint",
        width: 170,
        render: (_: unknown, record: ProductAnalyticsItem) =>
          renderDiagnosticTag(record.diagnostic_hint),
      });
    }

    cols.push({
      title: "Thao tác",
      key: "action",
      width: 100,
      render: (_: unknown, record: ProductAnalyticsItem) => (
        <Space size="small">
          <Tooltip title="Xem trang sản phẩm">
            <Link to={`/products/${record.slug}`} target="_blank">
              <Button size="small" icon={<LinkOutlined />} />
            </Link>
          </Tooltip>
          <Tooltip title="Chỉnh sửa sản phẩm trong kho">
            <Link to="/admin/products">
              <Button size="small" type="primary" ghost icon={<EditOutlined />} />
            </Link>
          </Tooltip>
        </Space>
      ),
    });

    return cols;
  };

  const highViewLowPurchaseCount =
    analyticsData?.high_view_low_purchase_items.length ?? 0;

  return (
    <div>
      {/* 1. Header Toolbar */}
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
            Bảng điều khiển Quản trị & Phân tích Hành vi
          </Title>
          <Paragraph type="secondary" style={{ margin: 0 }}>
            Theo dõi tổng quan số liệu, phân tích lượt click xem, tỉ lệ chuyển đổi đơn hàng và tối ưu sản phẩm
          </Paragraph>
        </div>
        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={handleRefreshAll}
            loading={loadingOverview || loadingAnalytics || syncing}
          >
            Làm mới toàn bộ
          </Button>
          <Link to="/">
            <Button icon={<ShopOutlined />}>Xem Cửa hàng</Button>
          </Link>
        </Space>
      </div>

      {/* 2. Primary KPI Cards */}
      <Spin spinning={loadingOverview || loadingAnalytics}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Card bordered={false} hoverable style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
              <Statistic
                title="Tổng lượt click xem (Views)"
                value={analyticsData?.total_views ?? "—"}
                prefix={<EyeOutlined style={{ color: "#1677ff" }} />}
                suffix="lượt"
              />
              <div style={{ marginTop: 8, fontSize: 12, color: "#6b7280" }}>
                Trên {productCount !== null ? productCount : "—"} sản phẩm ({categoryCount !== null ? categoryCount : "—"} nhóm hàng)
              </div>
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <Card bordered={false} hoverable style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
              <Statistic
                title="Tỉ lệ chuyển đổi toàn sàn (CR)"
                value={
                  analyticsData?.overall_conversion_rate !== undefined
                    ? `${analyticsData.overall_conversion_rate}%`
                    : "—"
                }
                prefix={<RiseOutlined style={{ color: "#10b981" }} />}
              />
              <div style={{ marginTop: 8, fontSize: 12, color: "#6b7280" }}>
                Tổng {analyticsData?.total_units_sold ?? "—"} sản phẩm đã bán ra
              </div>
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <Card
              bordered={false}
              hoverable
              style={{
                boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                background: highViewLowPurchaseCount > 0 ? "#fffbf0" : "#ffffff",
                border: highViewLowPurchaseCount > 0 ? "1px solid #ffe58f" : undefined,
              }}
            >
              <Statistic
                title="Xem nhiều nhưng mua ít"
                value={highViewLowPurchaseCount}
                prefix={<WarningOutlined style={{ color: "#faad14" }} />}
                suffix="món cần tối ưu"
                valueStyle={{ color: highViewLowPurchaseCount > 0 ? "#d46b08" : undefined }}
              />
              <div style={{ marginTop: 8, fontSize: 12, color: "#8c8c8c" }}>
                Lượt xem cao nhưng CR &le; {maxConversionRate}%
              </div>
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <Card bordered={false} hoverable style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
              <Statistic
                title="Tổng số đơn hàng"
                value={orderCount !== null ? orderCount : "—"}
                prefix={<OrderedListOutlined style={{ color: "#722ed1" }} />}
                suffix="đơn"
              />
              <div style={{ marginTop: 8 }}>
                <Link to="/admin/orders">
                  <Button type="link" size="small" style={{ padding: 0 }}>
                    Quản lý đơn hàng <ArrowRightOutlined />
                  </Button>
                </Link>
              </div>
            </Card>
          </Col>
        </Row>
      </Spin>

      {/* 3. Phân tích hành vi & Chuyển đổi (Behavior Analytics Card) */}
      <Card
        style={{
          marginTop: 24,
          borderRadius: 12,
          boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
        }}
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <RiseOutlined style={{ color: "#cb1c22", fontSize: 18 }} />
            <span style={{ fontWeight: 700, fontSize: 16 }}>
              Phân tích Hành vi Người dùng & Tỉ lệ Chuyển đổi Sản phẩm
            </span>
          </div>
        }
        extra={
          <Space wrap size="middle">
            {/* Time Filter */}
            <Radio.Group
              size="middle"
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              buttonStyle="solid"
            >
              <Radio.Button value={undefined}>Toàn thời gian</Radio.Button>
              <Radio.Button value={30}>30 ngày qua</Radio.Button>
              <Radio.Button value={7}>7 ngày qua</Radio.Button>
            </Radio.Group>
          </Space>
        }
      >
        {/* Dynamic Filters Bar */}
        <div
          style={{
            background: "#f8fafc",
            padding: "12px 16px",
            borderRadius: 8,
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 16,
            border: "1px solid #e2e8f0",
          }}
        >
          <Space wrap size="middle">
            <span style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>
              Điều kiện lọc nhóm "Xem nhiều - Mua ít":
            </span>

            <Space size={6}>
              <span style={{ fontSize: 13, color: "#64748b" }}>Lượt xem tối thiểu (&ge;):</span>
              <InputNumber<number>
                min={1}
                max={1000}
                value={minViews}
                onChange={(val) => setMinViews(val || 5)}
                style={{ width: 80 }}
              />
            </Space>

            <Space size={6}>
              <span style={{ fontSize: 13, color: "#64748b" }}>Tỉ lệ chuyển đổi tối đa (&le; %):</span>
              <InputNumber<number>
                min={0}
                max={100}
                step={0.5}
                value={maxConversionRate}
                onChange={(val) => setMaxConversionRate(val ?? 10.0)}
                style={{ width: 85 }}
                addonAfter="%"
              />
            </Space>
          </Space>

          <Button
            type="primary"
            size="small"
            onClick={fetchAnalytics}
            loading={loadingAnalytics}
            style={{ background: "#2563eb", borderColor: "#2563eb" }}
          >
            Áp dụng bộ lọc
          </Button>
        </div>

        {/* Analytics Tabs */}
        <Tabs
          defaultActiveKey="high_views_low_purchases"
          type="card"
          items={[
            {
              key: "high_views_low_purchases",
              label: (
                <Space>
                  <WarningOutlined style={{ color: "#d97706" }} />
                  <span>Món Xem nhiều - Mua ít</span>
                  <Tag color="orange" style={{ borderRadius: 10, margin: 0 }}>
                    {highViewLowPurchaseCount}
                  </Tag>
                </Space>
              ),
              children: (
                <div>
                  <Alert
                    type="warning"
                    showIcon
                    style={{ marginBottom: 16, borderRadius: 8 }}
                    message="Những mặt hàng được người dùng quan tâm click xem nhiều nhưng tỉ lệ chốt đơn thấp"
                    description="Các sản phẩm dưới đây có lượng quan tâm cao nhưng tỉ lệ đặt hàng thấp. Đề xuất: Kiểm tra tình trạng tồn kho, cân nhắc bổ sung chính sách giảm giá/khuyến mãi, hoặc cải thiện hình ảnh và bài viết mô tả sản phẩm."
                  />
                  <Table
                    columns={renderAnalyticsColumns(true)}
                    dataSource={analyticsData?.high_view_low_purchase_items || []}
                    rowKey="id"
                    loading={loadingAnalytics}
                    pagination={{ pageSize: 8 }}
                    bordered
                    locale={{
                      emptyText: "Tuyệt vời! Hiện không có sản phẩm nào rơi vào nhóm xem nhiều mua ít theo bộ lọc hiện tại.",
                    }}
                  />
                </div>
              ),
            },
            {
              key: "top_viewed",
              label: (
                <Space>
                  <FireOutlined style={{ color: "#dc2626" }} />
                  <span>Top Xem nhiều nhất</span>
                </Space>
              ),
              children: (
                <Table
                  columns={renderAnalyticsColumns(false)}
                  dataSource={analyticsData?.top_viewed_items || []}
                  rowKey="id"
                  loading={loadingAnalytics}
                  pagination={{ pageSize: 8 }}
                  bordered
                />
              ),
            },
            {
              key: "top_converted",
              label: (
                <Space>
                  <TrophyOutlined style={{ color: "#16a34a" }} />
                  <span>Top Tỉ lệ Chuyển đổi cao</span>
                </Space>
              ),
              children: (
                <Table
                  columns={renderAnalyticsColumns(false)}
                  dataSource={analyticsData?.top_converted_items || []}
                  rowKey="id"
                  loading={loadingAnalytics}
                  pagination={{ pageSize: 8 }}
                  bordered
                />
              ),
            },
          ]}
        />
      </Card>

      {/* 4. Quick Shortcuts & System Status */}
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} md={16}>
          <Card title="Lối tắt quản lý (Quick Shortcuts)" style={{ borderRadius: 8 }}>
            <Row gutter={[16, 16]}>
              <Col xs={12} sm={6}>
                <Link to="/admin/orders">
                  <Button block icon={<OrderedListOutlined />} size="large">
                    Đơn hàng
                  </Button>
                </Link>
              </Col>
              <Col xs={12} sm={6}>
                <Link to="/admin/products">
                  <Button block icon={<ShoppingOutlined />} size="large">
                    Sản phẩm
                  </Button>
                </Link>
              </Col>
              <Col xs={12} sm={6}>
                <Link to="/admin/categories">
                  <Button block icon={<AppstoreOutlined />} size="large">
                    Danh mục
                  </Button>
                </Link>
              </Col>
              <Col xs={12} sm={6}>
                <Link to="/admin/users">
                  <Button block icon={<UserOutlined />} size="large">
                    Người dùng
                  </Button>
                </Link>
              </Col>
            </Row>
          </Card>
        </Col>

        <Col xs={24} md={8}>
          <Card title="Trạng thái hệ thống" style={{ borderRadius: 8 }}>
            <Paragraph style={{ margin: 0, fontSize: 13 }}>
              Hệ thống E-Commerce Catalog & Analytics theo dõi hành vi người dùng (User Views, Orders, Conversion Rate) đã được kích hoạt và đồng bộ theo thời gian thực trên cơ sở dữ liệu MySQL.
            </Paragraph>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DashboardPage;
