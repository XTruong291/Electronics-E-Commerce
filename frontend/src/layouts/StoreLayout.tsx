import React, { useState } from "react";
import {
  Layout,
  Button,
  Badge,
  Space,
  Typography,
  theme,
  Dropdown,
  Avatar,
  Drawer,
  List,
  Image,
  Empty,
} from "antd";
import type { MenuProps } from "antd";
import {
  ShoppingCartOutlined,
  ShopOutlined,
  UserOutlined,
  LogoutOutlined,
  DashboardOutlined,
  OrderedListOutlined,
  DeleteOutlined,
  PlusOutlined,
  MinusOutlined,
  ArrowRightOutlined,
} from "@ant-design/icons";
import { Outlet, Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { useCartStore } from "../store/useCartStore";

const { Header, Content, Footer } = Layout;
const { Title, Text } = Typography;

const StoreLayout: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [cartOpen, setCartOpen] = useState(false);

  // Cart store hooks
  const cartItems = useCartStore((state) => state.items);
  const removeItem = useCartStore((state) => state.removeItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const totalItems = useCartStore((state) => state.getTotalItems)();
  const totalPrice = useCartStore((state) => state.getTotalPrice)();

  const {
    token: { colorBgContainer },
  } = theme.useToken();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

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
    <Layout style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 1000,
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: colorBgContainer,
          padding: "0 32px",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
        }}
      >
        <Space size="middle" align="center">
          <ShopOutlined style={{ fontSize: "24px", color: "#1677ff" }} />
          <Link to="/" style={{ textDecoration: "none" }}>
            <Title level={3} style={{ margin: 0, color: "#1677ff", cursor: "pointer" }}>
              E-Store
            </Title>
          </Link>
        </Space>

        <Space size="large" align="center">
          <Link to="/" style={{ color: "#333", fontWeight: 500 }}>
            Trang chủ
          </Link>

          {user && (
            <Link to="/orders" style={{ color: "#333", fontWeight: 500 }}>
              Đơn hàng
            </Link>
          )}

          {(user?.role === "ADMIN" || user?.role === "STAFF") && (
            <Link
              to="/admin"
              style={{
                color: "#1677ff",
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <DashboardOutlined /> Admin Portal
            </Link>
          )}

          <Badge count={totalItems} overflowCount={99}>
            <Button
              shape="round"
              icon={<ShoppingCartOutlined />}
              onClick={() => setCartOpen(true)}
            >
              Giỏ hàng
            </Button>
          </Badge>

          {user ? (
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" arrow>
              <Space style={{ cursor: "pointer" }}>
                <Avatar
                  src={user.avatar_url}
                  icon={!user.avatar_url && <UserOutlined />}
                  style={{ backgroundColor: "#1677ff" }}
                />
                <Text
                  strong
                  style={{
                    maxWidth: 120,
                    textOverflow: "ellipsis",
                    overflow: "hidden",
                  }}
                >
                  {user.full_name}
                </Text>
              </Space>
            </Dropdown>
          ) : (
            <Space size="middle">
              <Link to="/login">
                <Button type="default">Đăng nhập</Button>
              </Link>
              <Link to="/register">
                <Button type="primary">Đăng ký</Button>
              </Link>
            </Space>
          )}
        </Space>
      </Header>

      <Content
        style={{
          padding: "24px 32px",
          flex: 1,
          maxWidth: 1280,
          margin: "0 auto",
          width: "100%",
        }}
      >
        <Outlet />
      </Content>

      <Footer style={{ textAlign: "center", color: "#888", background: "transparent" }}>
        E-Commerce Storefront ©{new Date().getFullYear()} - Built with React, Vite & Ant Design
      </Footer>

      {/* Cart Drawer */}
      <Drawer
        title={
          <Space>
            <ShoppingCartOutlined style={{ color: "#1677ff" }} />
            <span>Giỏ hàng của bạn ({totalItems} sản phẩm)</span>
          </Space>
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
                  marginBottom: 16,
                }}
              >
                <Text style={{ fontSize: 15 }}>Tổng tạm tính:</Text>
                <Text
                  style={{
                    color: "#cf1322",
                    fontSize: 18,
                    fontWeight: 700,
                  }}
                >
                  {totalPrice.toLocaleString("vi-VN")} ₫
                </Text>
              </div>

              <Button
                type="primary"
                size="large"
                block
                icon={<ArrowRightOutlined />}
                onClick={() => {
                  setCartOpen(false);
                  navigate("/checkout");
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
            <Button type="primary" onClick={() => setCartOpen(false)}>
              Tiếp tục mua sắm
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
                  actions={[
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => removeItem(item.product.id)}
                    />,
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      <Image
                        width={60}
                        height={60}
                        src={item.product.thumbnail_url || ""}
                        fallback="https://placehold.co/60x60?text=No+Img"
                        style={{ objectFit: "cover", borderRadius: 6 }}
                        preview={false}
                      />
                    }
                    title={
                      <Link
                        to={`/products/${item.product.slug}`}
                        onClick={() => setCartOpen(false)}
                        style={{ color: "#333", fontSize: 13, fontWeight: 600 }}
                      >
                        {item.product.name}
                      </Link>
                    }
                    description={
                      <div>
                        <div style={{ color: "#cf1322", fontWeight: 600, marginTop: 4 }}>
                          {effectivePrice.toLocaleString("vi-VN")} ₫
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
                            <Text strong style={{ minWidth: 20, textAlign: "center" }}>
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
