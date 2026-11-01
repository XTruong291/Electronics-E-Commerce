import React, { useState, useEffect } from "react";
import {
  Layout,
  Button,
  Badge,
  Space,
  Typography,
  Dropdown,
  Avatar,
  Drawer,
  List,
  Image,
  Empty,
  Input,
  message,
} from "antd";
import type { MenuProps } from "antd";
import {
  ShoppingCartOutlined,
  UserOutlined,
  LogoutOutlined,
  DashboardOutlined,
  OrderedListOutlined,
  DeleteOutlined,
  PlusOutlined,
  MinusOutlined,
  ArrowRightOutlined,
  SearchOutlined,
  PhoneOutlined,
  ThunderboltFilled,
  LaptopOutlined,
  MobileOutlined,
  DesktopOutlined,
  CustomerServiceOutlined,
  SafetyCertificateOutlined,
  CarOutlined,
  SyncOutlined,
  AppstoreOutlined,
} from "@ant-design/icons";
import { Outlet, Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { useCartStore } from "../store/useCartStore";
import { getCategories } from "../api/catalog.api";
import type { Category } from "../types/catalog";

const { Header, Content, Footer } = Layout;
const { Title, Text } = Typography;

const formatPrice = (val: number): string => {
  return `${Number(val || 0).toLocaleString("vi-VN")} ₫`;
};

const StoreLayout: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [cartOpen, setCartOpen] = useState(false);
  const [headerSearch, setHeaderSearch] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);

  const currentCategorySlug = searchParams.get("category");
  const currentSearch = searchParams.get("search") || "";

  useEffect(() => {
    setHeaderSearch(currentSearch);
  }, [currentSearch]);

  useEffect(() => {
    const fetchCats = async () => {
      try {
        const list = await getCategories(false);
        setCategories(list);
      } catch (err) {
        console.error("Lỗi nạp danh mục:", err);
      }
    };
    fetchCats();
  }, []);

  // Cart store hooks
  const cartItems = useCartStore((state) => state.items);
  const removeItem = useCartStore((state) => state.removeItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const totalItems = useCartStore((state) => state.getTotalItems)();
  const totalPrice = useCartStore((state) => state.getTotalPrice)();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const handleSearchSubmit = () => {
    const trimmed = headerSearch.trim();
    if (trimmed) {
      navigate(`/?search=${encodeURIComponent(trimmed)}`);
    } else {
      navigate("/");
    }
  };

  const getCategoryIcon = (slug: string) => {
    const s = slug.toLowerCase();
    if (s.includes("laptop")) return <LaptopOutlined />;
    if (s.includes("thoai") || s.includes("phone")) return <MobileOutlined />;
    if (s.includes("man") || s.includes("screen") || s.includes("monitor")) return <DesktopOutlined />;
    if (s.includes("phu-kien") || s.includes("accessory")) return <CustomerServiceOutlined />;
    return <ThunderboltFilled />;
  };

  const displayCats = categories.length > 0 ? categories : [
    { id: 1, name: "Laptop", slug: "laptop" } as Category,
    { id: 2, name: "Điện thoại", slug: "dien-thoai" } as Category,
    { id: 3, name: "Màn hình", slug: "man-hinh" } as Category,
    { id: 4, name: "Phụ kiện", slug: "phu-kien" } as Category,
  ];

  const userMenuItems: MenuProps["items"] = [
    {
      key: "name",
      label: (
        <div style={{ padding: "4px 0" }}>
          <Text strong>{user?.full_name}</Text>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {user?.email} ({user?.role})
            </Text>
          </div>
        </div>
      ),
      disabled: true,
    },
    { type: "divider" },
    {
      key: "profile",
      icon: <UserOutlined />,
      label: <Link to="/profile">Hồ sơ cá nhân</Link>,
    },
    {
      key: "orders",
      icon: <OrderedListOutlined />,
      label: <Link to="/orders">Đơn hàng của tôi</Link>,
    },
    ...(user?.role === "ADMIN" || user?.role === "STAFF"
      ? [
          {
            key: "admin",
            icon: <DashboardOutlined />,
            label: <Link to="/admin">Admin Dashboard</Link>,
          },
        ]
      : []),
    { type: "divider" },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "Đăng xuất",
      danger: true,
      onClick: handleLogout,
    },
  ];

  return (
    <Layout style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#f4f5f7" }}>
      {/* 1. TOP STICKY HEADER (FPT SHOP TECH RED #cb1c22) */}
      <Header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 1000,
          width: "100%",
          height: 64,
          lineHeight: "normal",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "#cb1c22",
          padding: "0 20px",
          boxShadow: "0 2px 10px rgba(0, 0, 0, 0.12)",
        }}
      >
        <div
          style={{
            maxWidth: 1240,
            width: "100%",
            height: "100%",
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            lineHeight: "normal",
          }}
        >
          {/* Brand Logo */}
          <Link
            to="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              textDecoration: "none",
              color: "#fff",
              flexShrink: 0,
              height: 40,
              lineHeight: 1,
            }}
          >
            <div
              style={{
                background: "#fff",
                borderRadius: "50%",
                width: 36,
                height: 36,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              }}
            >
              <ThunderboltFilled style={{ fontSize: 20, color: "#cb1c22" }} />
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                lineHeight: 1,
              }}
            >
              <span
                style={{
                  fontSize: 20,
                  fontWeight: 800,
                  letterSpacing: -0.5,
                  color: "#fff",
                  display: "block",
                  lineHeight: 1.1,
                  margin: 0,
                  padding: 0,
                }}
              >
                TECHSTORE
              </span>
              <span
                className="header-subtext"
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.85)",
                  letterSpacing: 1.2,
                  textTransform: "uppercase",
                  display: "block",
                  lineHeight: 1,
                  marginTop: 3,
                  margin: 0,
                  padding: 0,
                }}
              >
                High-End Devices
              </span>
            </div>
          </Link>

          {/* Prominent Search Bar */}
          <div style={{ flex: 1, maxWidth: 500, margin: "0 12px" }}>
            <Input
              placeholder="Bạn cần tìm laptop, điện thoại, phụ kiện gì?..."
              allowClear
              value={headerSearch}
              onChange={(e) => setHeaderSearch(e.target.value)}
              onPressEnter={handleSearchSubmit}
              suffix={
                <Button
                  type="text"
                  shape="circle"
                  icon={<SearchOutlined style={{ color: "#cb1c22" }} />}
                  onClick={handleSearchSubmit}
                />
              }
              style={{
                borderRadius: 20,
                height: 38,
                background: "#ffffff",
                border: "none",
                boxShadow: "0 2px 4px rgba(0,0,0,0.08)",
                fontSize: 13,
              }}
            />
          </div>

          {/* Right utility items */}
          <Space size={16} align="center" style={{ flexShrink: 0 }}>
            {/* Hotline */}
            <div
              className="header-hotline"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                color: "#fff",
                fontSize: 13,
                cursor: "pointer",
              }}
              onClick={() => window.open("tel:18006601")}
            >
              <PhoneOutlined style={{ fontSize: 16 }} />
              <div style={{ lineHeight: "14px" }}>
                <span style={{ fontSize: 11, opacity: 0.85, display: "block" }}>Hotline 24/7</span>
                <strong style={{ fontSize: 13 }}>1800 6601</strong>
              </div>
            </div>

            {/* Shopping Cart Pill Button */}
            <div
              onClick={() => setCartOpen(true)}
              style={{
                background: "rgba(255,255,255,0.18)",
                border: "1px solid rgba(255,255,255,0.25)",
                borderRadius: 20,
                padding: "6px 14px",
                display: "flex",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
                color: "#fff",
                transition: "all 0.2s ease",
              }}
            >
              <Badge count={totalItems} overflowCount={99} size="small" color="#fff" style={{ color: "#cb1c22", fontWeight: 700 }}>
                <ShoppingCartOutlined style={{ fontSize: 18, color: "#fff" }} />
              </Badge>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Giỏ hàng</span>
            </div>

            {/* User Account / Auth Buttons */}
            {user ? (
              <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" arrow>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    cursor: "pointer",
                    padding: "4px 8px",
                    borderRadius: 16,
                    background: "rgba(255,255,255,0.1)",
                  }}
                >
                  <Avatar
                    src={user.avatar_url}
                    icon={!user.avatar_url && <UserOutlined />}
                    style={{ backgroundColor: "#ffffff", color: "#cb1c22" }}
                  />
                  <Text
                    style={{
                      color: "#fff",
                      fontWeight: 600,
                      maxWidth: 110,
                      textOverflow: "ellipsis",
                      overflow: "hidden",
                      whiteSpace: "nowrap",
                      fontSize: 13,
                    }}
                  >
                    {user.full_name}
                  </Text>
                </div>
              </Dropdown>
            ) : (
              <Space size={8}>
                <Link to="/login">
                  <Button
                    type="text"
                    style={{
                      color: "#fff",
                      fontWeight: 600,
                      fontSize: 13,
                      border: "1px solid rgba(255,255,255,0.3)",
                      borderRadius: 18,
                    }}
                  >
                    Đăng nhập
                  </Button>
                </Link>
                <Link to="/register">
                  <Button
                    style={{
                      background: "#fff",
                      color: "#cb1c22",
                      fontWeight: 600,
                      fontSize: 13,
                      borderRadius: 18,
                      border: "none",
                    }}
                  >
                    Đăng ký
                  </Button>
                </Link>
              </Space>
            )}
          </Space>
        </div>
      </Header>

      {/* 2. QUICK CATEGORY SUB-BAR (CLEAN WHITE #ffffff) */}
      <div
        style={{
          background: "#ffffff",
          borderBottom: "1px solid #e5e7eb",
          boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
        }}
      >
        <div
          style={{
            maxWidth: 1240,
            margin: "0 auto",
            padding: "0 16px",
            height: 42,
            display: "flex",
            alignItems: "center",
            gap: 12,
            overflowX: "auto",
          }}
        >
          {/* 1. All Products */}
          <Link
            to="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 13,
              textDecoration: "none",
              whiteSpace: "nowrap",
              transition: "all 0.2s ease",
              padding: "4px 12px",
              borderRadius: 16,
              background: !currentCategorySlug ? "rgba(203, 28, 34, 0.08)" : "transparent",
              color: !currentCategorySlug ? "#cb1c22" : "#4b5563",
              fontWeight: !currentCategorySlug ? 700 : 500,
              border: !currentCategorySlug ? "1px solid rgba(203, 28, 34, 0.2)" : "1px solid transparent",
            }}
          >
            <AppstoreOutlined style={{ fontSize: 14 }} />
            <span>Tất cả sản phẩm</span>
          </Link>

          {/* 2. Dynamic Categories */}
          {displayCats.map((cat) => {
            const isActive = currentCategorySlug === cat.slug;
            return (
              <Link
                key={cat.id || cat.slug}
                to={`/?category=${cat.slug}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 13,
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                  transition: "all 0.2s ease",
                  padding: "4px 12px",
                  borderRadius: 16,
                  background: isActive ? "rgba(203, 28, 34, 0.08)" : "transparent",
                  color: isActive ? "#cb1c22" : "#4b5563",
                  fontWeight: isActive ? 700 : 500,
                  border: isActive ? "1px solid rgba(203, 28, 34, 0.2)" : "1px solid transparent",
                }}
              >
                <span style={{ fontSize: 14 }}>{getCategoryIcon(cat.slug)}</span>
                <span>{cat.name}</span>
              </Link>
            );
          })}

          {(user?.role === "ADMIN" || user?.role === "STAFF") && (
            <Link
              to="/admin"
              style={{
                marginLeft: "auto",
                display: "flex",
                alignItems: "center",
                gap: 6,
                color: "#cb1c22",
                fontSize: 13,
                fontWeight: 600,
                textDecoration: "none",
                whiteSpace: "nowrap",
              }}
            >
              <DashboardOutlined /> Quản trị Admin
            </Link>
          )}
        </div>
      </div>

      {/* 3. CENTERED MAIN STOREFRONT CONTAINER (MAX-WIDTH 1240PX) */}
      <Content
        style={{
          maxWidth: 1240,
          margin: "0 auto",
          padding: "16px 16px 48px",
          width: "100%",
          flex: 1,
        }}
      >
        <Outlet />
      </Content>

      {/* 4. PROFESSIONAL TECH STORE FOOTER */}
      <Footer
        style={{
          background: "#ffffff",
          borderTop: "1px solid #e5e7eb",
          padding: "36px 16px 20px",
          color: "#4b5563",
        }}
      >
        <div style={{ maxWidth: 1240, margin: "0 auto" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 28,
              marginBottom: 32,
            }}
          >
            {/* Col 1 */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <ThunderboltFilled style={{ fontSize: 22, color: "#cb1c22" }} />
                <span style={{ fontSize: 18, fontWeight: 800, color: "#111827" }}>TECHSTORE</span>
              </div>
              <p style={{ fontSize: 13, lineHeight: 1.6, color: "#6b7280", margin: 0 }}>
                Hệ thống phân phối thiết bị công nghệ, laptop gaming, điện thoại và phụ kiện chính hãng 100% tại Việt Nam.
              </p>
              <div style={{ marginTop: 12, fontSize: 13 }}>
                <Text strong style={{ color: "#111827" }}>Tổng đài hỗ trợ:</Text>
                <div style={{ color: "#cb1c22", fontWeight: 700, fontSize: 16 }}>1800 6601</div>
              </div>
            </div>

            {/* Col 2 */}
            <div>
              <Title level={5} style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: "#111827" }}>
                Chính Sách & Hỗ Trợ
              </Title>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: 13, lineHeight: 2 }}>
                <li>Bảo hành chính hãng 24 tháng</li>
                <li>Chính sách đổi trả trong 30 ngày</li>
                <li>Giao hàng hỏa tốc trong 2 giờ</li>
                <li>Chính sách bảo mật thanh toán</li>
              </ul>
            </div>

            {/* Col 3 */}
            <div>
              <Title level={5} style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: "#111827" }}>
                Cam Kết Bán Hàng
              </Title>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <SafetyCertificateOutlined style={{ color: "#52c41a" }} /> 100% Hàng chính hãng nguyên seal
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <CarOutlined style={{ color: "#1677ff" }} /> Miễn phí giao hàng toàn quốc
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <SyncOutlined style={{ color: "#faad14" }} /> Lỗi 1 đổi 1 tận nơi nhanh chóng
                </span>
              </div>
            </div>

            {/* Col 4 */}
            <div>
              <Title level={5} style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: "#111827" }}>
                Thanh Toán An Toàn
              </Title>
              <p style={{ fontSize: 13, lineHeight: 1.6, color: "#6b7280" }}>
                Hỗ trợ thanh toán khi nhận hàng (COD), Chuyển khoản VietQR, Thẻ ATM/Visa/MasterCard và trả góp 0% lãi suất.
              </p>
            </div>
          </div>

          <div
            style={{
              borderTop: "1px solid #f3f4f6",
              paddingTop: 16,
              textAlign: "center",
              fontSize: 12,
              color: "#9ca3af",
            }}
          >
            © {new Date().getFullYear()} TECHSTORE. Bản quyền thuộc về hệ thống Thương mại điện tử Bán lẻ Công nghệ.
          </div>
        </div>
      </Footer>

      {/* 5. POLISHED CART DRAWER */}
      <Drawer
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <ShoppingCartOutlined style={{ color: "#cb1c22", fontSize: 20 }} />
            <span style={{ fontWeight: 700, fontSize: 16 }}>Giỏ hàng của bạn</span>
            <Badge count={totalItems} overflowCount={99} style={{ backgroundColor: "#cb1c22" }} />
          </div>
        }
        placement="right"
        width={420}
        onClose={() => setCartOpen(false)}
        open={cartOpen}
        footer={
          cartItems.length > 0 && (
            <div style={{ padding: "8px 0" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <Text type="secondary" style={{ fontSize: 14 }}>Tạm tính:</Text>
                <Text strong style={{ fontSize: 15 }}>{formatPrice(totalPrice)}</Text>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <Text type="secondary" style={{ fontSize: 14 }}>Vận chuyển:</Text>
                <Text strong style={{ color: "#52c41a", fontSize: 14 }}>Miễn phí</Text>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  marginBottom: 16,
                  paddingTop: 8,
                  borderTop: "1px dashed #e5e7eb",
                }}
              >
                <Text strong style={{ fontSize: 16 }}>Tổng thanh toán:</Text>
                <span
                  style={{
                    color: "#d70018",
                    fontSize: 20,
                    fontWeight: 800,
                  }}
                >
                  {formatPrice(totalPrice)}
                </span>
              </div>

              <Button
                type="primary"
                size="large"
                block
                icon={<ArrowRightOutlined />}
                onClick={() => {
                  setCartOpen(false);
                  if (!user) {
                    message.warning("Vui lòng đăng nhập để tiến hành đặt hàng");
                    navigate("/login?redirect=%2Fcheckout", { state: { from: "/checkout" } });
                  } else {
                    navigate("/checkout");
                  }
                }}
                style={{
                  height: 48,
                  fontSize: 16,
                  fontWeight: 700,
                  borderRadius: 8,
                  background: "#cb1c22",
                  borderColor: "#cb1c22",
                }}
              >
                Tiến hành Đặt hàng
              </Button>
            </div>
          )
        }
      >
        {cartItems.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Giỏ hàng của bạn đang trống"
          >
            <Button
              type="primary"
              onClick={() => setCartOpen(false)}
              style={{ background: "#cb1c22", borderColor: "#cb1c22" }}
            >
              Khám phá sản phẩm ngay
            </Button>
          </Empty>
        ) : (
          <List
            itemLayout="horizontal"
            dataSource={cartItems}
            renderItem={(item) => {
              const effectivePrice =
                item.product.sale_price !== null &&
                item.product.sale_price !== undefined &&
                item.product.sale_price > 0
                  ? item.product.sale_price
                  : item.product.price;

              return (
                <List.Item
                  key={item.product.id}
                  style={{ padding: "12px 0", borderBottom: "1px solid #f3f4f6" }}
                  actions={[
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => removeItem(item.product.id)}
                      title="Xóa khỏi giỏ"
                    />,
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      <div
                        style={{
                          width: 60,
                          height: 60,
                          borderRadius: 8,
                          border: "1px solid #e5e7eb",
                          padding: 4,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: "#fff",
                        }}
                      >
                        <Image
                          src={item.product.thumbnail_url || ""}
                          fallback="https://placehold.co/60x60?text=No+Img"
                          style={{ maxHeight: 52, maxWidth: 52, objectFit: "contain" }}
                          preview={false}
                        />
                      </div>
                    }
                    title={
                      <Link
                        to={`/products/${item.product.slug}`}
                        onClick={() => setCartOpen(false)}
                        style={{ color: "#1f2937", fontSize: 13, fontWeight: 600, lineHeight: 1.3 }}
                      >
                        {item.product.name}
                      </Link>
                    }
                    description={
                      <div>
                        <div style={{ color: "#d70018", fontWeight: 700, fontSize: 14, marginTop: 4 }}>
                          {formatPrice(effectivePrice)}
                        </div>
                        <div style={{ marginTop: 8 }}>
                          <Space size="small">
                            <Button
                              size="small"
                              icon={<MinusOutlined />}
                              onClick={() =>
                                updateQuantity(item.product.id, item.quantity - 1)
                              }
                            />
                            <Text strong style={{ minWidth: 24, textAlign: "center", display: "inline-block" }}>
                              {item.quantity}
                            </Text>
                            <Button
                              size="small"
                              icon={<PlusOutlined />}
                              onClick={() =>
                                updateQuantity(item.product.id, item.quantity + 1)
                              }
                              disabled={item.quantity >= item.product.stock}
                            />
                          </Space>
                        </div>
                      </div>
                    }
                  />
                </List.Item>
              );
            }}
          />
        )}
      </Drawer>
    </Layout>
  );
};

export default StoreLayout;
