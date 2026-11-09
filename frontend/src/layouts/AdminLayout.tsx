import React, { useState } from "react";
import { Layout, Menu, Typography, theme, Button, Space, Tag, Avatar, Drawer } from "antd";
import {
  ShoppingOutlined,
  AppstoreOutlined,
  OrderedListOutlined,
  DashboardOutlined,
  UserOutlined,
  LogoutOutlined,
  ShopOutlined,
  ThunderboltFilled,
  ReadOutlined,
  MenuOutlined,
} from "@ant-design/icons";
import { Outlet, useNavigate, useLocation, Link } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { useResponsive } from "../hooks/useResponsive";

const { Header, Content, Sider } = Layout;
const { Title, Text } = Typography;

const AdminLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { isTabletOrMobile, isMobile } = useResponsive();

  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const menuItems = [
    {
      key: "/admin",
      icon: <DashboardOutlined />,
      label: "Dashboard",
    },
    {
      key: "/admin/orders",
      icon: <OrderedListOutlined />,
      label: "Đơn hàng",
    },
    {
      key: "/admin/products",
      icon: <ShoppingOutlined />,
      label: "Sản phẩm",
    },
    {
      key: "/admin/categories",
      icon: <AppstoreOutlined />,
      label: "Danh mục",
    },
    {
      key: "/admin/articles",
      icon: <ReadOutlined />,
      label: "Bài viết công nghệ",
    },
    {
      key: "/admin/users",
      icon: <UserOutlined />,
      label: "Người dùng",
    },
  ];

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const handleMenuClick = (key: string) => {
    navigate(key);
    if (isTabletOrMobile) {
      setMobileDrawerOpen(false);
    }
  };

  return (
    <Layout style={{ minHeight: "100vh" }}>
      {/* 1. DESKTOP SIDER (Visible on screens >= 992px) */}
      {!isTabletOrMobile && (
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={(value) => setCollapsed(value)}
          theme="dark"
          width={230}
          style={{
            background: "#111827",
          }}
        >
          <div
            style={{
              height: 64,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              color: "#fff",
              fontWeight: "bold",
              fontSize: collapsed ? "14px" : "17px",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <ThunderboltFilled style={{ color: "#cb1c22", fontSize: 20 }} />
            {!collapsed && <span>XìMiStore Admin</span>}
          </div>
          <Menu
            theme="dark"
            selectedKeys={[location.pathname]}
            mode="inline"
            items={menuItems}
            onClick={({ key }) => handleMenuClick(key)}
            style={{
              background: "#111827",
              marginTop: 8,
            }}
          />
        </Sider>
      )}

      {/* 2. MOBILE / TABLET DRAWER SIDER (< 992px) */}
      {isTabletOrMobile && (
        <Drawer
          placement="left"
          open={mobileDrawerOpen}
          onClose={() => setMobileDrawerOpen(false)}
          width={260}
          bodyStyle={{ padding: 0, background: "#111827", display: "flex", flexDirection: "column" }}
          headerStyle={{ background: "#0f172a", borderBottom: "1px solid rgba(255,255,255,0.08)" }}
          title={
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#fff" }}>
              <ThunderboltFilled style={{ color: "#cb1c22", fontSize: 20 }} />
              <span style={{ fontWeight: 800, fontSize: 16 }}>XìMiStore Admin</span>
            </div>
          }
        >
          <Menu
            theme="dark"
            selectedKeys={[location.pathname]}
            mode="inline"
            items={menuItems}
            onClick={({ key }) => handleMenuClick(key)}
            style={{
              background: "#111827",
              marginTop: 8,
              flex: 1,
            }}
          />

          <div
            style={{
              padding: "16px",
              borderTop: "1px solid rgba(255,255,255,0.08)",
              background: "#0f172a",
            }}
          >
            <div style={{ marginBottom: 12 }}>
              <Link
                to="/"
                onClick={() => setMobileDrawerOpen(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  color: "#e2e8f0",
                  fontWeight: 600,
                  fontSize: 14,
                }}
              >
                <ShopOutlined style={{ color: "#cb1c22" }} /> Xem cửa hàng
              </Link>
            </div>

            {user && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                  <Avatar
                    src={user.avatar_url}
                    icon={!user.avatar_url && <UserOutlined />}
                    style={{ backgroundColor: "#cb1c22", flexShrink: 0 }}
                  />
                  <div style={{ minWidth: 0 }}>
                    <Text
                      style={{
                        color: "#fff",
                        fontWeight: 600,
                        fontSize: 13,
                        display: "block",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {user.full_name}
                    </Text>
                    <Tag color="magenta" style={{ margin: 0, fontSize: 10, lineHeight: "16px" }}>
                      {user.role}
                    </Tag>
                  </div>
                </div>
                <Button
                  icon={<LogoutOutlined />}
                  onClick={handleLogout}
                  danger
                  type="text"
                  size="small"
                />
              </div>
            )}
          </div>
        </Drawer>
      )}

      <Layout>
        {/* 3. HEADER */}
        <Header
          style={{
            padding: isMobile ? "0 12px" : "0 24px",
            background: colorBgContainer,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 1px 4px rgba(0,21,41,0.06)",
            position: "sticky",
            top: 0,
            zIndex: 900,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {isTabletOrMobile && (
              <Button
                type="text"
                icon={<MenuOutlined style={{ fontSize: 18, color: "#111827" }} />}
                onClick={() => setMobileDrawerOpen(true)}
                style={{
                  width: 38,
                  height: 38,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              />
            )}
            <Title
              level={isMobile ? 5 : 4}
              style={{
                margin: 0,
                color: "#111827",
                whiteSpace: "nowrap",
                fontSize: isMobile ? 15 : 18,
              }}
            >
              {isMobile ? "Admin Dashboard" : "Quản trị hệ thống XìMiStore"}
            </Title>
          </div>

          <Space size={isMobile ? "small" : "large"} align="center">
            {!isMobile && (
              <Link
                to="/"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  color: "#4b5563",
                  fontWeight: 500,
                  fontSize: 14,
                }}
              >
                <ShopOutlined style={{ color: "#cb1c22" }} /> Xem cửa hàng
              </Link>
            )}

            {user && (
              <Space size={isMobile ? 8 : "middle"} align="center">
                <Avatar
                  src={user.avatar_url}
                  icon={!user.avatar_url && <UserOutlined />}
                  style={{ backgroundColor: "#cb1c22" }}
                />
                {!isMobile && (
                  <div>
                    <Text strong>{user.full_name}</Text>
                    <Tag
                      color={user.role === "ADMIN" ? "magenta" : "blue"}
                      style={{ marginLeft: 8 }}
                    >
                      {user.role}
                    </Tag>
                  </div>
                )}
                <Button
                  icon={<LogoutOutlined />}
                  onClick={handleLogout}
                  danger
                  type="text"
                  title="Đăng xuất"
                >
                  {!isMobile && "Đăng xuất"}
                </Button>
              </Space>
            )}
          </Space>
        </Header>

        {/* 4. CONTENT */}
        <Content style={{ margin: isMobile ? "12px 8px 0" : "24px 16px 0" }}>
          <div
            style={{
              padding: isMobile ? 12 : 24,
              minHeight: 360,
              background: colorBgContainer,
              borderRadius: borderRadiusLG,
            }}
          >
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default AdminLayout;
