import React, { useEffect, useState, useCallback, useRef } from "react";
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
  Tabs,
  Input,
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
  ThunderboltFilled,
  RobotOutlined,
  FireFilled,
  EyeOutlined,
  ShoppingCartOutlined,
  CheckCircleOutlined,
  AlertOutlined,
  TrophyOutlined,
  ReadOutlined,
  InboxOutlined,
  SendOutlined,
  ClearOutlined,
  DownOutlined,
  UpOutlined,
  DatabaseOutlined,
  CommentOutlined,
} from "@ant-design/icons";
import { Link, useNavigate } from "react-router-dom";
import { getAdminDashboardStats } from "../../api/order.api";
import { getArticles } from "../../api/article.api";
import {
  getAnalyticsOverview,
  getGeminiInsights,
  chatWithAIAdvisor,
} from "../../api/analytics.api";
import type { DashboardStatsResponse, Order, OrderStatus } from "../../types/order";
import type {
  AnalyticsOverviewResponse,
  ChatMessageItem,
  GeminiInsightsResponse,
  HighDropoffProductItem,
  SlowMovingProductItem,
  TopSellingProductItem,
} from "../../types/analytics";

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

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

interface DisplayChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  data_sources_used?: string[];
  source?: "gemini_ai" | "rule_based_fallback";
  created_at: string;
}

const renderInlineFormatting = (text: string): React.ReactNode => {
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
      return (
        <strong key={index} style={{ color: "#ffffff", fontWeight: 700 }}>
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
      return (
        <code
          key={index}
          style={{
            background: "rgba(255, 255, 255, 0.12)",
            color: "#f87171",
            padding: "2px 6px",
            borderRadius: 4,
            fontSize: "0.9em",
            fontFamily: "monospace",
          }}
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
};

const renderChatMarkdown = (content: string): React.ReactNode => {
  if (!content) return null;
  const lines = content.split("\n");
  const nodes: React.ReactNode[] = [];
  let currentList: string[] = [];

  const flushList = (keyPrefix: number) => {
    if (currentList.length > 0) {
      nodes.push(
        <ul
          key={`ul_${keyPrefix}`}
          style={{ margin: "6px 0 10px", paddingLeft: 20, color: "#e2e8f0" }}
        >
          {currentList.map((item, idx) => (
            <li key={idx} style={{ marginBottom: 4, lineHeight: 1.6 }}>
              {renderInlineFormatting(item)}
            </li>
          ))}
        </ul>
      );
      currentList = [];
    }
  };

  lines.forEach((line, lineIdx) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList(lineIdx);
      return;
    }

    if (trimmed.startsWith("### ")) {
      flushList(lineIdx);
      nodes.push(
        <div
          key={`h3_${lineIdx}`}
          style={{
            fontWeight: 700,
            fontSize: 14,
            color: "#38bdf8",
            marginTop: lineIdx === 0 ? 0 : 10,
            marginBottom: 6,
          }}
        >
          {trimmed.replace(/^###\s+/, "")}
        </div>
      );
      return;
    }

    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      currentList.push(trimmed.slice(2));
      return;
    }

    if (trimmed.startsWith("> ")) {
      flushList(lineIdx);
      nodes.push(
        <div
          key={`quote_${lineIdx}`}
          style={{
            padding: "8px 14px",
            background: "rgba(203, 28, 34, 0.12)",
            borderLeft: "3px solid #ff4d4f",
            borderRadius: 6,
            margin: "8px 0",
            fontSize: 13,
            color: "#cbd5e1",
            fontStyle: "italic",
          }}
        >
          {renderInlineFormatting(trimmed.replace(/^>\s+/, ""))}
        </div>
      );
      return;
    }

    flushList(lineIdx);
    nodes.push(
      <p
        key={`p_${lineIdx}`}
        style={{ margin: "4px 0", lineHeight: 1.65, color: "#e2e8f0" }}
      >
        {renderInlineFormatting(trimmed)}
      </p>
    );
  });

  flushList(lines.length);
  return nodes;
};

const initialWelcomeMessage: DisplayChatMessage = {
  id: "welcome_0",
  role: "assistant",
  content:
    "### 👋 Chào bạn, tôi là Gemini Store Copilot!\n\nTôi đã được kết nối trực tiếp với **cơ sở dữ liệu MySQL** của XìMiStore. Tôi nắm rõ toàn bộ tình hình **doanh thu thực nhận**, **tồn kho 50 sản phẩm**, **tỷ lệ bỏ giỏ** và **danh sách hàng tồn đọng** theo thời gian thực.\n\nBạn có thể bấm vào các câu hỏi gợi ý nhanh bên dưới hoặc gõ bất kỳ câu hỏi nào để cùng phân tích!",
  data_sources_used: ["products", "orders", "user_events"],
  source: "gemini_ai",
  created_at: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
};

const defaultPrompts = [
  "🔥 Top sản phẩm bán chạy nào có nguy cơ đứt hàng?",
  "📦 Những mặt hàng nào đang tồn đọng vốn lớn nhất cần xả kho?",
  "⚠️ Tại sao các mẫu flagship có lượt xem cao nhưng ít đơn chốt?",
  "💰 Doanh thu thực nhận và tổng giá trị đơn hợp lệ là bao nhiêu?",
];

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [days, setDays] = useState<number>(14);
  const [stats, setStats] = useState<DashboardStatsResponse | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsOverviewResponse | null>(null);
  const [insights, setInsights] = useState<GeminiInsightsResponse | null>(null);
  const [totalArticles, setTotalArticles] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [aiLoading, setAiLoading] = useState<boolean>(false);

  // Copilot Interactive Chat State
  const [chatMessages, setChatMessages] = useState<DisplayChatMessage[]>([initialWelcomeMessage]);
  const [inputQuestion, setInputQuestion] = useState<string>("");
  const [chatLoading, setChatLoading] = useState<boolean>(false);
  const [showBriefing, setShowBriefing] = useState<boolean>(true);
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>(defaultPrompts);

  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Requirement 3: Internal Scroll Container only without page jump
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages, chatLoading]);

  const handleSendMessage = async (textOverride?: string) => {
    const textToSend = (textOverride || inputQuestion).trim();
    if (!textToSend || chatLoading) return;

    const userMsg: DisplayChatMessage = {
      id: `user_${Date.now()}`,
      role: "user",
      content: textToSend,
      created_at: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
    };

    const newHistory = [...chatMessages, userMsg];
    setChatMessages(newHistory);
    setInputQuestion("");
    setChatLoading(true);

    try {
      const historyPayload: ChatMessageItem[] = newHistory
        .slice(-6)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await chatWithAIAdvisor({
        question: textToSend,
        days,
        history: historyPayload,
      });

      const aiMsg: DisplayChatMessage = {
        id: `ai_${Date.now()}`,
        role: "assistant",
        content: res.answer,
        data_sources_used: res.data_sources_used,
        source: res.source,
        created_at: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
      };

      setChatMessages((prev) => [...prev, aiMsg]);
      if (res.suggested_followups && res.suggested_followups.length > 0) {
        setSuggestedPrompts(res.suggested_followups);
      }
    } catch (err) {
      console.error("Lỗi gửi tin nhắn cho Copilot:", err);
      const errorMsg: DisplayChatMessage = {
        id: `err_${Date.now()}`,
        role: "assistant",
        content:
          "⚠️ **Không thể kết nối với dịch vụ AI Copilot vào lúc này.** Xin vui lòng thử lại sau vài giây hoặc kiểm tra kết nối mạng.",
        source: "rule_based_fallback",
        created_at: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
      };
      setChatMessages((prev) => [...prev, errorMsg]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleResetChat = () => {
    setChatMessages([initialWelcomeMessage]);
    setSuggestedPrompts(defaultPrompts);
  };

  const fetchStats = useCallback(async (selectedDays: number) => {
    setLoading(true);
    try {
      const [data, articlesRes, analyticsRes] = await Promise.all([
        getAdminDashboardStats(selectedDays),
        getArticles({ page_size: 1, include_unpublished: true }).catch(() => null),
        getAnalyticsOverview(selectedDays).catch(() => null),
      ]);
      setStats(data);
      if (articlesRes) {
        setTotalArticles(articlesRes.total);
      }
      if (analyticsRes) {
        setAnalytics(analyticsRes);
      }
    } catch (err) {
      console.error("Lỗi nạp thống kê dashboard:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleFetchAiInsights = async () => {
    setAiLoading(true);
    try {
      const data = await getGeminiInsights(days);
      setInsights(data);
    } catch (err) {
      console.error("Lỗi nạp Gemini AI Insights:", err);
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    fetchStats(days);
    // Tự động nạp AI insights một lần theo số ngày
    getGeminiInsights(days)
      .then((res) => setInsights(res))
      .catch(() => null);
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

  // Funnel shortcuts
  const funnel = analytics?.funnel;

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

  // Top Selling Products columns
  const topSellingColumns: ColumnsType<TopSellingProductItem> = [
    {
      title: "Hạng",
      key: "rank",
      width: 70,
      align: "center",
      render: (_, __, index) => {
        const rank = index + 1;
        let color = "#6b7280";
        let bg = "#f3f4f6";
        if (rank === 1) {
          color = "#b45309";
          bg = "#fef3c7";
        } else if (rank === 2) {
          color = "#475569";
          bg = "#e2e8f0";
        } else if (rank === 3) {
          color = "#9a3412";
          bg = "#ffedd5";
        }
        return (
          <span
            style={{
              display: "inline-block",
              width: 26,
              height: 26,
              lineHeight: "26px",
              borderRadius: "50%",
              fontWeight: 700,
              fontSize: 12,
              textAlign: "center",
              color,
              background: bg,
            }}
          >
            {rank}
          </span>
        );
      },
    },
    {
      title: "Sản phẩm",
      key: "product",
      render: (_, r) => (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img
            src={
              r.thumbnail_url ||
              "https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=120"
            }
            alt={r.product_name}
            style={{
              width: 50,
              height: 38,
              objectFit: "cover",
              borderRadius: 6,
              border: "1px solid #e5e7eb",
              flexShrink: 0,
            }}
          />
          <div style={{ minWidth: 0 }}>
            <Text
              strong
              style={{ fontSize: 13, display: "block" }}
              ellipsis={{ tooltip: r.product_name }}
            >
              {r.product_name}
            </Text>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {r.category_name} • <span style={{ fontWeight: 600 }}>{r.brand}</span> • SKU: {r.sku}
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: "Giá bán",
      dataIndex: "price",
      key: "price",
      width: 120,
      render: (val: number, r) => (
        <span style={{ fontWeight: 700, color: "#cb1c22", fontSize: 13 }}>
          {formatPrice(r.sale_price || val)}
        </span>
      ),
    },
    {
      title: "Đã bán",
      dataIndex: "units_sold",
      key: "units_sold",
      width: 100,
      align: "center",
      render: (val: number) => (
        <Tag color="blue" style={{ fontWeight: 700, fontSize: 12, padding: "2px 8px" }}>
          {val} chiếc
        </Tag>
      ),
    },
    {
      title: "Số đơn",
      dataIndex: "order_count",
      key: "order_count",
      width: 90,
      align: "center",
      render: (val: number) => (
        <span style={{ fontWeight: 600, color: "#374151" }}>{val} đơn</span>
      ),
    },
    {
      title: "Doanh thu mang lại",
      dataIndex: "gross_revenue",
      key: "gross_revenue",
      width: 150,
      render: (val: number) => (
        <span style={{ fontWeight: 700, color: "#16a34a", fontSize: 13 }}>
          {formatPrice(val)}
        </span>
      ),
    },
    {
      title: "Tồn kho",
      dataIndex: "current_stock",
      key: "current_stock",
      width: 140,
      render: (val: number) => {
        if (val <= 5) {
          return (
            <Tag color="error" style={{ fontWeight: 600 }}>
              <AlertOutlined /> Còn {val} (Sắp hết)
            </Tag>
          );
        }
        return (
          <Tag color="default" style={{ fontWeight: 600 }}>
            Còn {val} chiếc
          </Tag>
        );
      },
    },
  ];

  // Slow-Moving & Dead Stock Products columns
  const slowMovingColumns: ColumnsType<SlowMovingProductItem> = [
    {
      title: "Sản phẩm",
      key: "product",
      render: (_, r) => (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img
            src={
              r.thumbnail_url ||
              "https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=120"
            }
            alt={r.product_name}
            style={{
              width: 50,
              height: 38,
              objectFit: "cover",
              borderRadius: 6,
              border: "1px solid #e5e7eb",
              flexShrink: 0,
            }}
          />
          <div style={{ minWidth: 0 }}>
            <Text
              strong
              style={{ fontSize: 13, display: "block" }}
              ellipsis={{ tooltip: r.product_name }}
            >
              {r.product_name}
            </Text>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {r.category_name} • <span style={{ fontWeight: 600 }}>{r.brand}</span> • SKU: {r.sku}
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: "Đơn giá",
      dataIndex: "price",
      key: "price",
      width: 120,
      render: (val: number, r) => (
        <span style={{ fontWeight: 600, fontSize: 12, color: "#4b5563" }}>
          {formatPrice(r.sale_price || val)}
        </span>
      ),
    },
    {
      title: "Số lượng tồn",
      dataIndex: "current_stock",
      key: "current_stock",
      width: 110,
      align: "center",
      render: (val: number) => (
        <span style={{ fontWeight: 700, color: "#111827" }}>{val} chiếc</span>
      ),
    },
    {
      title: "Vốn tồn đọng",
      dataIndex: "inventory_value",
      key: "inventory_value",
      width: 140,
      render: (val: number) => (
        <span style={{ fontWeight: 700, color: "#dc2626", fontSize: 13 }}>
          {formatPrice(val)}
        </span>
      ),
    },
    {
      title: "Thời gian đọng kho",
      dataIndex: "days_in_stock",
      key: "days_in_stock",
      width: 140,
      align: "center",
      render: (val: number) => (
        <Tag color={val >= 30 ? "volcano" : "orange"} style={{ fontWeight: 700 }}>
          {val} ngày
        </Tag>
      ),
    },
    {
      title: "Tương tác kỳ",
      key: "activity",
      width: 130,
      align: "center",
      render: (_, r) => (
        <Text style={{ fontSize: 12, color: "#4b5563" }}>
          {r.views_period} xem • <strong style={{ color: r.units_sold_period > 0 ? "#16a34a" : "#ef4444" }}>{r.units_sold_period} bán</strong>
        </Text>
      ),
    },
    {
      title: "Tình trạng",
      dataIndex: "aging_status",
      key: "aging_status",
      width: 140,
      render: (st: string) => {
        if (st === "DEAD_STOCK") {
          return (
            <Tag color="red" style={{ fontWeight: 700 }}>
              DEAD STOCK
            </Tag>
          );
        }
        return (
          <Tag color="orange" style={{ fontWeight: 600 }}>
            CHẬM BÁN
          </Tag>
        );
      },
    },
  ];

  // High Drop-off Products columns
  const dropoffColumns: ColumnsType<HighDropoffProductItem> = [
    {
      title: "Sản phẩm",
      key: "product",
      render: (_, r) => (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img
            src={
              r.thumbnail_url ||
              "https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=120"
            }
            alt={r.product_name}
            style={{
              width: 52,
              height: 38,
              objectFit: "cover",
              borderRadius: 6,
              border: "1px solid #e5e7eb",
              flexShrink: 0,
            }}
          />
          <div style={{ minWidth: 0 }}>
            <Text
              strong
              style={{ fontSize: 13, display: "block" }}
              ellipsis={{ tooltip: r.product_name }}
            >
              {r.product_name}
            </Text>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {r.category_name} • <span style={{ fontWeight: 600 }}>{r.brand}</span>
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: "Giá bán",
      dataIndex: "price",
      key: "price",
      width: 120,
      render: (val: number, r) => (
        <span style={{ fontWeight: 700, color: "#cb1c22", fontSize: 13 }}>
          {formatPrice(r.sale_price || val)}
        </span>
      ),
    },
    {
      title: "Lượt xem",
      dataIndex: "views",
      key: "views",
      width: 90,
      align: "center",
      render: (val: number) => (
        <Tag color="blue" style={{ fontWeight: 600 }}>
          {val}
        </Tag>
      ),
    },
    {
      title: "Thêm giỏ",
      dataIndex: "cart_adds",
      key: "cart_adds",
      width: 90,
      align: "center",
      render: (val: number) => (
        <Tag color="purple" style={{ fontWeight: 600 }}>
          {val}
        </Tag>
      ),
    },
    {
      title: "Đã bán",
      dataIndex: "units_sold",
      key: "units_sold",
      width: 80,
      align: "center",
      render: (val: number) => (
        <Tag color={val > 0 ? "success" : "default"} style={{ fontWeight: 600 }}>
          {val}
        </Tag>
      ),
    },
    {
      title: "Tỷ lệ bỏ lỡ (Drop-off)",
      key: "dropoff_rate",
      width: 170,
      render: (_, r) => (
        <div style={{ width: 140 }}>
          <Progress
            percent={r.dropoff_rate_pct}
            size="small"
            status={r.dropoff_rate_pct >= 75 ? "exception" : "normal"}
            strokeColor={r.dropoff_rate_pct >= 75 ? "#ef4444" : "#f59e0b"}
          />
        </div>
      ),
    },
    {
      title: "Đánh giá tình trạng",
      dataIndex: "status_flag",
      key: "status_flag",
      width: 150,
      render: (st: string) => {
        if (st === "HIGH_DROPOFF") {
          return (
            <Tag color="error" style={{ fontWeight: 600 }}>
              <AlertOutlined /> Cần kích cầu ngay
            </Tag>
          );
        }
        if (st === "CONSIDERING") {
          return (
            <Tag color="warning" style={{ fontWeight: 600 }}>
              Khách đang phân vân
            </Tag>
          );
        }
        return (
          <Tag color="success" style={{ fontWeight: 600 }}>
            Chuyển đổi tốt
          </Tag>
        );
      },
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
          marginBottom: 20,
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
            Theo dõi tổng doanh thu, phễu hành vi người dùng và trợ lý chiến lược AI Gemini
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
              <Text type="secondary" style={{ fontSize: 13, fontWeight: 500 }}>
                Doanh thu thực nhận (Đã giao)
              </Text>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#cb1c22", margin: "6px 0 4px" }}>
                {formatPrice(stats?.total_revenue || 0)}
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
              <Text type="secondary" style={{ fontSize: 13, fontWeight: 500 }}>
                Tổng số đơn hàng
              </Text>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#111827", margin: "6px 0 4px" }}>
                {totalOrders} <span style={{ fontSize: 14, fontWeight: 500, color: "#6b7280" }}>đơn</span>
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
              <Text type="secondary" style={{ fontSize: 13, fontWeight: 500 }}>
                Đơn hàng cần xử lý
              </Text>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#2563eb", margin: "6px 0 4px" }}>
                {inFlightCount} <span style={{ fontSize: 14, fontWeight: 500, color: "#6b7280" }}>đơn</span>
              </div>
              <div style={{ marginTop: 8, fontSize: 12 }}>
                <Link to="/admin/orders" style={{ color: "#2563eb", fontWeight: 600 }}>
                  Chuyển tới Quản lý Đơn hàng <ArrowRightOutlined />
                </Link>
              </div>
            </Card>
          </Col>

          {/* Card 4: Tổng kho & Bài viết */}
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
              <Text type="secondary" style={{ fontSize: 13, fontWeight: 500 }}>
                Quy mô kho hàng & Người dùng
              </Text>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#111827", margin: "6px 0 4px" }}>
                {stats?.total_products || 0}{" "}
                <span style={{ fontSize: 14, fontWeight: 500, color: "#6b7280" }}>sản phẩm</span>
              </div>
              <div style={{ marginTop: 8, fontSize: 12, color: "#6b7280" }}>
                <strong>{stats?.total_categories || 0}</strong> danh mục •{" "}
                <strong>{stats?.total_users || 0}</strong> tài khoản •{" "}
                <Link to="/admin/articles" style={{ color: "#cb1c22", fontWeight: 600 }}>
                  <strong>{totalArticles}</strong> bài viết
                </Link>
              </div>
            </Card>
          </Col>
        </Row>

        {/* 3. CONVERSION FUNNEL STRIP (PHỄU CHUYỂN ĐỔI KHÁCH HÀNG) */}
        <Card
          bordered={false}
          style={{
            marginTop: 20,
            borderRadius: 12,
            border: "1px solid #e5e7eb",
            boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
          }}
          bodyStyle={{ padding: "20px 24px" }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <div>
              <span style={{ fontWeight: 700, fontSize: 15, color: "#111827" }}>
                Phễu Chuyển Đổi Khách Hàng (Conversion Funnel)
              </span>
              <span style={{ fontSize: 13, color: "#6b7280", marginLeft: 8 }}>
                (Dữ liệu {days} ngày gần nhất • Ghi nhận {analytics?.total_events_recorded || 0} lượt tương tác)
              </span>
            </div>
            <Tag color="volcano" style={{ fontWeight: 700, fontSize: 12, padding: "2px 10px" }}>
              Tỷ lệ chuyển đổi tổng thể: {funnel?.overall_conversion_pct || 0}%
            </Tag>
          </div>

          <Row gutter={[16, 16]} align="middle">
            {/* Step 1: Views */}
            <Col xs={24} md={7}>
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: 10,
                  padding: "16px 20px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#2563eb", marginBottom: 6 }}>
                  <EyeOutlined style={{ fontSize: 18 }} />
                  <span style={{ fontWeight: 700, fontSize: 14 }}>1. Lượt xem sản phẩm</span>
                </div>
                <div style={{ fontSize: 26, fontWeight: 800, color: "#0f172a" }}>
                  {(funnel?.total_views || 0).toLocaleString("vi-VN")}{" "}
                  <span style={{ fontSize: 13, fontWeight: 500, color: "#64748b" }}>lượt</span>
                </div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                  100% người xem tiếp cận
                </div>
              </div>
            </Col>

            {/* Transition 1 -> 2 */}
            <Col xs={24} md={1} style={{ textAlign: "center" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#16a34a" }}>
                  {funnel?.view_to_cart_pct || 0}%
                </span>
                <ArrowRightOutlined style={{ color: "#94a3b8", fontSize: 16 }} />
              </div>
            </Col>

            {/* Step 2: Add to Cart */}
            <Col xs={24} md={7}>
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: 10,
                  padding: "16px 20px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#7c3aed", marginBottom: 6 }}>
                  <ShoppingCartOutlined style={{ fontSize: 18 }} />
                  <span style={{ fontWeight: 700, fontSize: 14 }}>2. Lượt thêm vào giỏ</span>
                </div>
                <div style={{ fontSize: 26, fontWeight: 800, color: "#0f172a" }}>
                  {(funnel?.total_cart_adds || 0).toLocaleString("vi-VN")}{" "}
                  <span style={{ fontSize: 13, fontWeight: 500, color: "#64748b" }}>lần</span>
                </div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                  Tỷ lệ bỏ giỏ: <strong>{Math.max(0, 100 - (funnel?.cart_to_order_pct || 0)).toFixed(1)}%</strong>
                </div>
              </div>
            </Col>

            {/* Transition 2 -> 3 */}
            <Col xs={24} md={1} style={{ textAlign: "center" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#16a34a" }}>
                  {funnel?.cart_to_order_pct || 0}%
                </span>
                <ArrowRightOutlined style={{ color: "#94a3b8", fontSize: 16 }} />
              </div>
            </Col>

            {/* Step 3: Orders Completed */}
            <Col xs={24} md={8}>
              <div
                style={{
                  background: "linear-gradient(135deg, #fef2f2 0%, #fff1f2 100%)",
                  border: "1px solid #fecdd3",
                  borderRadius: 10,
                  padding: "16px 20px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#cb1c22", marginBottom: 6 }}>
                  <CheckCircleOutlined style={{ fontSize: 18 }} />
                  <span style={{ fontWeight: 700, fontSize: 14 }}>3. Đơn hàng hoàn tất</span>
                </div>
                <div style={{ fontSize: 26, fontWeight: 800, color: "#cb1c22" }}>
                  {(funnel?.total_orders || 0).toLocaleString("vi-VN")}{" "}
                  <span style={{ fontSize: 13, fontWeight: 500, color: "#991b1b" }}>đơn chốt</span>
                </div>
                <div style={{ fontSize: 12, color: "#b91c1c", marginTop: 4 }}>
                  Chuyển đổi từ thêm giỏ sang chốt: <strong>{funnel?.cart_to_order_pct || 0}%</strong>
                </div>
              </div>
            </Col>
          </Row>
        </Card>

        {/* 4. GEMINI STORE COPILOT INTERACTIVE WORKSPACE */}
        <Card
          bordered={false}
          style={{
            marginTop: 20,
            borderRadius: 14,
            background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
            color: "#ffffff",
            border: "1px solid #334155",
            boxShadow: "0 6px 20px rgba(0,0,0,0.12)",
          }}
          bodyStyle={{ padding: "24px 28px" }}
        >
          {/* Header Bar */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 18,
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 10,
                  background: "rgba(203, 28, 34, 0.25)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#ff6b6b",
                  fontSize: 22,
                }}
              >
                <RobotOutlined />
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 18, fontWeight: 800, color: "#ffffff" }}>
                    Gemini Store Copilot
                  </span>
                  {insights?.source === "gemini_ai" ? (
                    <Tag color="cyan" style={{ fontWeight: 700, borderRadius: 6 }}>
                      <ThunderboltFilled /> Gemini 2.5 Flash
                    </Tag>
                  ) : (
                    <Tag
                      color="default"
                      style={{
                        fontWeight: 600,
                        borderRadius: 6,
                        background: "rgba(255,255,255,0.15)",
                        color: "#e2e8f0",
                      }}
                    >
                      Phân tích Dự phòng Heuristic
                    </Tag>
                  )}
                </div>
                <span style={{ fontSize: 12, color: "#94a3b8" }}>
                  Trợ lý đối chiếu dữ liệu MySQL theo thời gian thực • Phân tích {days} ngày gần nhất
                </span>
              </div>
            </div>

            <Space>
              <Button
                type="text"
                onClick={() => setShowBriefing(!showBriefing)}
                icon={showBriefing ? <UpOutlined /> : <DownOutlined />}
                style={{ color: "#94a3b8", fontSize: 13 }}
              >
                {showBriefing ? "Thu gọn tóm tắt" : "Xem tóm tắt điều hành"}
              </Button>
              <Button
                type="primary"
                danger
                icon={<ThunderboltFilled />}
                loading={aiLoading}
                onClick={handleFetchAiInsights}
                style={{
                  borderRadius: 8,
                  fontWeight: 600,
                  height: 36,
                  boxShadow: "0 2px 8px rgba(203, 28, 34, 0.4)",
                }}
              >
                Làm mới tóm tắt
              </Button>
            </Space>
          </div>

          {/* Part 1: Initial Executive Briefing (Collapsible) */}
          {showBriefing && (
            <div style={{ marginBottom: 22 }}>
              <Row gutter={[16, 16]}>
                {/* Card 1: Executive Summary */}
                <Col xs={24} md={12}>
                  <div
                    style={{
                      background: "rgba(255, 255, 255, 0.04)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      borderRadius: 10,
                      padding: "16px 18px",
                      height: "100%",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        color: "#38bdf8",
                        marginBottom: 8,
                      }}
                    >
                      <TrophyOutlined style={{ fontSize: 15 }} />
                      <span style={{ fontWeight: 700, fontSize: 14 }}>Tóm Tắt Điều Hành</span>
                    </div>
                    <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: "#cbd5e1" }}>
                      {insights?.executive_summary || "Đang tổng hợp dữ liệu..."}
                    </p>
                  </div>
                </Col>

                {/* Card 2: Drop-off Analysis */}
                <Col xs={24} md={12}>
                  <div
                    style={{
                      background: "rgba(255, 255, 255, 0.04)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      borderRadius: 10,
                      padding: "16px 18px",
                      height: "100%",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        color: "#f87171",
                        marginBottom: 8,
                      }}
                    >
                      <AlertOutlined style={{ fontSize: 15 }} />
                      <span style={{ fontWeight: 700, fontSize: 14 }}>
                        Phân Tích Điểm Nghẽn Bỏ Giỏ
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: "#cbd5e1" }}>
                      {insights?.dropoff_analysis || "Đang tổng hợp dữ liệu..."}
                    </p>
                  </div>
                </Col>

                {/* Card 3: Trend Insights */}
                <Col xs={24} md={12}>
                  <div
                    style={{
                      background: "rgba(255, 255, 255, 0.04)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      borderRadius: 10,
                      padding: "16px 18px",
                      height: "100%",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        color: "#a78bfa",
                        marginBottom: 8,
                      }}
                    >
                      <FireFilled style={{ fontSize: 15 }} />
                      <span style={{ fontWeight: 700, fontSize: 14 }}>
                        Xu Hướng Thị Hiếu Khách Hàng
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: "#cbd5e1" }}>
                      {insights?.trend_insights || "Đang tổng hợp dữ liệu..."}
                    </p>
                  </div>
                </Col>

                {/* Card 4: Actionable Recommendations */}
                <Col xs={24} md={12}>
                  <div
                    style={{
                      background: "rgba(255, 255, 255, 0.04)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      borderRadius: 10,
                      padding: "16px 18px",
                      height: "100%",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        color: "#4ade80",
                        marginBottom: 8,
                      }}
                    >
                      <CheckCircleOutlined style={{ fontSize: 15 }} />
                      <span style={{ fontWeight: 700, fontSize: 14 }}>
                        Đề Xuất Hành Động Chiến Lược
                      </span>
                    </div>
                    <ul
                      style={{
                        margin: 0,
                        paddingLeft: 18,
                        fontSize: 13,
                        lineHeight: 1.6,
                        color: "#cbd5e1",
                      }}
                    >
                      {insights?.actionable_recommendations.map((rec, idx) => (
                        <li key={idx} style={{ marginBottom: 4 }}>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                </Col>
              </Row>
            </div>
          )}

          {/* Part 2: Interactive Multi-turn Chat Workspace */}
          <div
            style={{
              background: "rgba(15, 23, 42, 0.6)",
              borderRadius: 12,
              border: "1px solid rgba(255, 255, 255, 0.09)",
              padding: "16px 18px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <CommentOutlined style={{ color: "#38bdf8", fontSize: 16 }} />
                <span style={{ fontWeight: 700, fontSize: 14, color: "#f8fafc" }}>
                  Hỏi Đáp Trực Tiếp Với Dữ Liệu Cửa Hàng
                </span>
                <Tag color="blue" style={{ fontSize: 11, borderRadius: 4 }}>
                  Multi-turn Context
                </Tag>
              </div>

              <Tooltip title="Xóa lịch sử hội thoại hiện tại">
                <Button
                  size="small"
                  type="text"
                  icon={<ClearOutlined />}
                  onClick={handleResetChat}
                  style={{ color: "#94a3b8", fontSize: 12 }}
                >
                  Xóa hội thoại
                </Button>
              </Tooltip>
            </div>

            {/* Suggested Prompt Chips */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                marginBottom: 14,
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>
                Gợi ý phân tích:
              </span>
              {suggestedPrompts.map((promptText, idx) => (
                <Tag
                  key={idx}
                  onClick={() => handleSendMessage(promptText)}
                  style={{
                    cursor: chatLoading ? "not-allowed" : "pointer",
                    background: "rgba(255, 255, 255, 0.06)",
                    border: "1px solid rgba(255, 255, 255, 0.14)",
                    color: "#f1f5f9",
                    padding: "4px 10px",
                    borderRadius: 16,
                    fontSize: 12,
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#cb1c22";
                    e.currentTarget.style.color = "#ff7875";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.14)";
                    e.currentTarget.style.color = "#f1f5f9";
                  }}
                >
                  {promptText}
                </Tag>
              ))}
            </div>

            {/* Requirement 3: Internal Scroll Container for Messages */}
            <div
              ref={chatContainerRef}
              style={{
                maxHeight: 440,
                overflowY: "auto",
                padding: "16px 18px",
                background: "rgba(0, 0, 0, 0.22)",
                borderRadius: 10,
                border: "1px solid rgba(255, 255, 255, 0.08)",
                marginBottom: 14,
              }}
            >
              {chatMessages.map((msg) => {
                if (msg.role === "user") {
                  return (
                    <div
                      key={msg.id}
                      style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        marginBottom: 14,
                      }}
                    >
                      <div
                        style={{
                          maxWidth: "80%",
                          background: "#cb1c22",
                          color: "#ffffff",
                          padding: "10px 16px",
                          borderRadius: "14px 14px 2px 14px",
                          boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
                        }}
                      >
                        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5 }}>
                          {msg.content}
                        </p>
                        <div
                          style={{
                            fontSize: 10,
                            color: "rgba(255,255,255,0.7)",
                            textAlign: "right",
                            marginTop: 4,
                          }}
                        >
                          {msg.created_at}
                        </div>
                      </div>
                    </div>
                  );
                }

                // Assistant Message Bubble
                return (
                  <div
                    key={msg.id}
                    style={{
                      display: "flex",
                      gap: 12,
                      alignItems: "flex-start",
                      marginBottom: 16,
                    }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: "rgba(203, 28, 34, 0.25)",
                        color: "#ff7875",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        fontSize: 16,
                      }}
                    >
                      <RobotOutlined />
                    </div>

                    <div
                      style={{
                        maxWidth: "88%",
                        background: "rgba(255, 255, 255, 0.05)",
                        border: "1px solid rgba(255, 255, 255, 0.08)",
                        borderRadius: "14px 14px 14px 2px",
                        padding: "14px 18px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 8,
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontWeight: 700, fontSize: 12, color: "#38bdf8" }}>
                            Gemini Copilot
                          </span>
                          {msg.data_sources_used && msg.data_sources_used.length > 0 && (
                            <span style={{ display: "inline-flex", gap: 4 }}>
                              {msg.data_sources_used.map((src, sIdx) => (
                                <Tag
                                  key={sIdx}
                                  color="default"
                                  style={{
                                    fontSize: 10,
                                    margin: 0,
                                    padding: "0 5px",
                                    background: "rgba(255,255,255,0.08)",
                                    color: "#94a3b8",
                                    border: "none",
                                  }}
                                >
                                  <DatabaseOutlined style={{ marginRight: 3 }} />
                                  {src}
                                </Tag>
                              ))}
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: 11, color: "#64748b" }}>
                          {msg.created_at}
                        </span>
                      </div>

                      <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                        {renderChatMarkdown(msg.content)}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Chat Loading Typing Indicator */}
              {chatLoading && (
                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    alignItems: "center",
                    padding: "8px 12px",
                    color: "#94a3b8",
                    fontSize: 12,
                  }}
                >
                  <Spin size="small" />
                  <span>Gemini Copilot đang truy xuất & đối chiếu dữ liệu cửa hàng từ MySQL...</span>
                </div>
              )}
            </div>

            {/* Chat Input Bar */}
            <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
              <TextArea
                rows={1}
                autoSize={{ minRows: 1, maxRows: 3 }}
                value={inputQuestion}
                onChange={(e) => setInputQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Hỏi Gemini về doanh thu, tồn kho, sản phẩm cụ thể, khách bỏ giỏ... (Enter để gửi)"
                style={{
                  background: "rgba(0, 0, 0, 0.3)",
                  border: "1px solid rgba(255, 255, 255, 0.16)",
                  color: "#f8fafc",
                  borderRadius: 8,
                  fontSize: 13,
                  resize: "none",
                }}
              />
              <Button
                type="primary"
                danger
                icon={<SendOutlined />}
                loading={chatLoading}
                onClick={() => handleSendMessage()}
                style={{
                  height: 38,
                  borderRadius: 8,
                  fontWeight: 600,
                  boxShadow: "0 2px 8px rgba(203, 28, 34, 0.4)",
                }}
              >
                Gửi
              </Button>
            </div>
          </div>
        </Card>

        {/* 5. PRODUCT PERFORMANCE & INVENTORY TABS */}
        <Card
          bordered={false}
          style={{
            marginTop: 20,
            borderRadius: 12,
            boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
            border: "1px solid #e5e7eb",
          }}
          bodyStyle={{ padding: "16px 20px 20px" }}
        >
          <Tabs
            defaultActiveKey="best_sellers"
            items={[
              {
                key: "best_sellers",
                label: (
                  <span style={{ fontWeight: 600, fontSize: 14 }}>
                    <FireFilled style={{ color: "#cb1c22", marginRight: 6 }} />
                    Bán Chạy Nhất ({analytics?.top_selling_products?.length || 0})
                  </span>
                ),
                children: (
                  <div>
                    <div
                      style={{
                        marginBottom: 14,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <Text strong style={{ fontSize: 14, color: "#111827" }}>
                          Top Sản Phẩm Dẫn Đầu Doanh Số Trong Kỳ
                        </Text>
                        <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
                          Theo dõi số lượng bán, doanh thu và tồn kho để chủ động nhập hàng kịp thời
                        </Text>
                      </div>
                      <Tag color="volcano" style={{ fontWeight: 600 }}>
                        Top 10 bán chạy nhất
                      </Tag>
                    </div>
                    <Table
                      columns={topSellingColumns}
                      dataSource={analytics?.top_selling_products || []}
                      rowKey="product_id"
                      pagination={false}
                      size="middle"
                      scroll={{ x: 880 }}
                    />
                  </div>
                ),
              },
              {
                key: "dropoff",
                label: (
                  <span style={{ fontWeight: 600, fontSize: 14 }}>
                    <AlertOutlined style={{ color: "#ea580c", marginRight: 6 }} />
                    Tỷ Lệ Bỏ Giỏ Cao ({analytics?.high_dropoff_products?.length || 0})
                  </span>
                ),
                children: (
                  <div>
                    <div
                      style={{
                        marginBottom: 14,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <Text strong style={{ fontSize: 14, color: "#111827" }}>
                          Sản Phẩm Quan Tâm Cao Nhưng Tỷ Lệ Bỏ Giỏ Lớn
                        </Text>
                        <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
                          Khách xem nhiều, thêm giỏ nhưng chưa hoàn tất thanh toán. Cần tung voucher hoặc kích cầu ngay
                        </Text>
                      </div>
                      <Tag color="red" style={{ fontWeight: 600 }}>
                        Top 10 mặt hàng cần kích cầu
                      </Tag>
                    </div>
                    <Table
                      columns={dropoffColumns}
                      dataSource={analytics?.high_dropoff_products || []}
                      rowKey="product_id"
                      pagination={false}
                      size="middle"
                      scroll={{ x: 800 }}
                    />
                  </div>
                ),
              },
              {
                key: "slow_moving",
                label: (
                  <span style={{ fontWeight: 600, fontSize: 14 }}>
                    <InboxOutlined style={{ color: "#64748b", marginRight: 6 }} />
                    Tồn Kho Đọng Vốn ({analytics?.slow_moving_products?.length || 0})
                  </span>
                ),
                children: (
                  <div>
                    <div
                      style={{
                        marginBottom: 14,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <Text strong style={{ fontSize: 14, color: "#111827" }}>
                          Sản Phẩm Tồn Kho Lâu Ngày / Chậm Luân Chuyển
                        </Text>
                        <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
                          Sản phẩm nhiều ngày không phát sinh đơn. Cần triển khai Flash Sale hoặc bán kèm combo để giải phóng dòng tiền
                        </Text>
                      </div>
                      <Tag color="orange" style={{ fontWeight: 600 }}>
                        Top 10 mặt hàng giam vốn
                      </Tag>
                    </div>
                    <Table
                      columns={slowMovingColumns}
                      dataSource={analytics?.slow_moving_products || []}
                      rowKey="product_id"
                      pagination={false}
                      size="middle"
                      scroll={{ x: 920 }}
                    />
                  </div>
                ),
              },
            ]}
          />
        </Card>

        {/* 6. CATEGORY & BRAND INTEREST + TOP SEARCH KEYWORDS */}
        <Row gutter={[16, 16]} style={{ marginTop: 20 }}>
          {/* CỘT TRÁI: DANH MỤC & THƯƠNG HIỆU */}
          <Col xs={24} lg={14}>
            <Card
              title={
                <span style={{ fontWeight: 700, fontSize: 15 }}>
                  Mức Độ Quan Tâm Theo Danh Mục & Thương Hiệu
                </span>
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
              <Text strong style={{ fontSize: 13, color: "#374151", display: "block", marginBottom: 12 }}>
                1. Theo Danh Mục Sản Phẩm:
              </Text>
              {(analytics?.category_interest || []).map((cat) => (
                <div key={cat.category_id} style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, color: "#111827" }}>{cat.category_name}</span>
                    <span style={{ color: "#6b7280" }}>
                      {cat.total_interactions} tương tác ({cat.percentage}%)
                    </span>
                  </div>
                  <Progress percent={cat.percentage} showInfo={false} strokeColor="#cb1c22" size="small" />
                </div>
              ))}

              <Text strong style={{ fontSize: 13, color: "#374151", display: "block", margin: "20px 0 12px" }}>
                2. Theo Thương Hiệu Phần Cứng:
              </Text>
              {(analytics?.brand_interest || []).map((b) => (
                <div key={b.brand} style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, color: "#111827" }}>{b.brand}</span>
                    <span style={{ color: "#6b7280" }}>
                      {b.total_interactions} tương tác ({b.percentage}%)
                    </span>
                  </div>
                  <Progress percent={b.percentage} showInfo={false} strokeColor="#2563eb" size="small" />
                </div>
              ))}
            </Card>
          </Col>

          {/* CỘT PHẢI: TOP TỪ KHÓA TÌM KIẾM */}
          <Col xs={24} lg={10}>
            <Card
              title={
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>
                    Top Từ Khóa Tìm Kiếm Hot
                  </span>
                  <Tag color="blue" style={{ fontWeight: 600 }}>
                    Nhu cầu thực tế
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
              bodyStyle={{ padding: "16px 20px" }}
            >
              {(analytics?.top_search_keywords || []).length === 0 ? (
                <Text type="secondary" style={{ fontSize: 13 }}>
                  Chưa có dữ liệu tìm kiếm trong kỳ.
                </Text>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {(analytics?.top_search_keywords || []).map((kw, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 14px",
                        background: idx < 3 ? "rgba(203, 28, 34, 0.04)" : "#f9fafb",
                        borderRadius: 8,
                        border: idx < 3 ? "1px solid rgba(203, 28, 34, 0.15)" : "1px solid #f3f4f6",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: "50%",
                            background: idx === 0 ? "#cb1c22" : (idx === 1 ? "#ea580c" : (idx === 2 ? "#ca8a04" : "#e5e7eb")),
                            color: idx < 3 ? "#ffffff" : "#4b5563",
                            fontSize: 12,
                            fontWeight: 700,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {idx + 1}
                        </span>
                        <span style={{ fontWeight: idx < 3 ? 700 : 500, fontSize: 13, color: "#111827" }}>
                          {kw.keyword}
                        </span>
                      </div>
                      <Tag color={idx < 3 ? "red" : "default"} style={{ fontWeight: 600, margin: 0 }}>
                        {kw.search_count} tra cứu
                      </Tag>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </Col>
        </Row>

        {/* 7. ROW 2: BIỂU ĐỒ DOANH THU & PHÂN BỔ TRẠNG THÁI ĐƠN */}
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
              <div
                style={{
                  height: 240,
                  display: "flex",
                  alignItems: "flex-end",
                  gap: 8,
                  paddingBottom: 24,
                  borderBottom: "1px solid #f3f4f6",
                  position: "relative",
                }}
              >
                {dailyStats.map((item, index) => {
                  const barHeightPct = Math.max(
                    (item.revenue / maxRevenue) * 100,
                    item.revenue > 0 ? 8 : 2
                  );
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
                            <div>{item.date}</div>
                            <div>Doanh thu: {formatPrice(item.revenue)}</div>
                            <div>Số đơn: {item.order_count}</div>
                          </div>
                        }
                      >
                        <div
                          style={{
                            width: "100%",
                            maxWidth: 36,
                            height: `${barHeightPct}%`,
                            background: item.revenue > 0 ? "linear-gradient(180deg, #cb1c22 0%, #991b1b 100%)" : "#e5e7eb",
                            borderRadius: "4px 4px 0 0",
                            transition: "all 0.3s ease",
                            cursor: "pointer",
                          }}
                        />
                      </Tooltip>
                      <span
                        style={{
                          position: "absolute",
                          bottom: -22,
                          fontSize: 10,
                          color: "#9ca3af",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.date.slice(5)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>
          </Col>

          {/* CỘT PHẢI: PHÂN BỔ TRẠNG THÁI ĐƠN */}
          <Col xs={24} lg={8}>
            <Card
              title={
                <span style={{ fontWeight: 700, fontSize: 15 }}>
                  Tỷ lệ Xử lý Đơn hàng
                </span>
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
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                  <span style={{ color: "#16a34a", fontWeight: 600 }}>Giao thành công</span>
                  <strong>{deliveredCount} đơn</strong>
                </div>
                <Progress percent={successRate} strokeColor="#16a34a" size="small" />
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                  <span style={{ color: "#2563eb", fontWeight: 600 }}>Đang xử lý / Vận chuyển</span>
                  <strong>{inFlightCount} đơn</strong>
                </div>
                <Progress
                  percent={totalOrders > 0 ? Math.round((inFlightCount / totalOrders) * 100) : 0}
                  strokeColor="#2563eb"
                  size="small"
                />
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                  <span style={{ color: "#ef4444", fontWeight: 600 }}>Đã hủy</span>
                  <strong>{cancelledCount} đơn</strong>
                </div>
                <Progress
                  percent={totalOrders > 0 ? Math.round((cancelledCount / totalOrders) * 100) : 0}
                  strokeColor="#ef4444"
                  size="small"
                />
              </div>
            </Card>
          </Col>
        </Row>

        {/* 8. ROW 3: ĐƠN HÀNG GẦN ĐÂY & ĐIỀU HƯỚNG NHANH */}
        <Row gutter={[16, 16]} style={{ marginTop: 20 }}>
          {/* CỘT TRÁI: DANH SÁCH ĐƠN HÀNG MỚI NHẤT */}
          <Col xs={24} lg={16}>
            <Card
              title={
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>Đơn hàng gần đây</span>
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
              bodyStyle={{ padding: "8px 16px 16px" }}
            >
              <Table
                columns={orderColumns}
                dataSource={stats?.recent_orders || []}
                rowKey="id"
                pagination={false}
                size="middle"
                scroll={{ x: 600 }}
              />
            </Card>
          </Col>

          {/* CỘT PHẢI: ĐIỀU HƯỚNG QUẢN TRỊ NHANH */}
          <Col xs={24} lg={8}>
            <Card
              title={<span style={{ fontWeight: 700, fontSize: 15 }}>Điều hướng Quản trị Nhanh</span>}
              bordered={false}
              style={{
                borderRadius: 12,
                boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
                border: "1px solid #e5e7eb",
                height: "100%",
              }}
              bodyStyle={{ padding: "20px 24px" }}
            >
              <Row gutter={[12, 12]}>
                <Col span={12}>
                  <Button
                    block
                    size="large"
                    icon={<OrderedListOutlined style={{ color: "#cb1c22" }} />}
                    onClick={() => navigate("/admin/orders")}
                    style={{ height: 48, borderRadius: 8, fontWeight: 600 }}
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
                    style={{ height: 48, borderRadius: 8, fontWeight: 600 }}
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
                    style={{ height: 48, borderRadius: 8, fontWeight: 600 }}
                  >
                    Danh mục
                  </Button>
                </Col>
                <Col span={12}>
                  <Button
                    block
                    size="large"
                    icon={<ReadOutlined style={{ color: "#cb1c22" }} />}
                    onClick={() => navigate("/admin/articles")}
                    style={{ height: 48, borderRadius: 8, fontWeight: 600 }}
                  >
                    Bài viết
                  </Button>
                </Col>
                <Col span={24}>
                  <Button
                    block
                    size="large"
                    icon={<UserOutlined style={{ color: "#cb1c22" }} />}
                    onClick={() => navigate("/admin/users")}
                    style={{ height: 48, borderRadius: 8, fontWeight: 600 }}
                  >
                    Quản lý Người dùng
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
                  Hệ thống theo dõi hành vi người dùng và trợ lý AI Gemini cập nhật liên tục theo thời gian thực.
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
