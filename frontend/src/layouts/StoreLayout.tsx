import React from "react";
import { Layout, Button, Badge, Space, Typography, theme, Dropdown, Avatar } from "antd";
import type { MenuProps } from "antd";
import {
  ShoppingCartOutlined,
  ShopOutlined,
  UserOutlined,
  LogoutOutlined,
  DashboardOutlined,
} from "@ant-design/icons";
import { Outlet, Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";

const { Header, Content, Footer } = Layout;
const { Title, Text } = Typography;

const StoreLayout: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const {
    token: { colorBgContainer, borderRadiusLG },
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

          {(user?.role === "ADMIN" || user?.role === "STAFF") && (
            <Link to="/admin" style={{ color: "#1677ff", fontWeight: 500, display: "flex", alignItems: "center", gap: 4 }}>
              <DashboardOutlined /> Admin Portal
            </Link>
          )}

          <Badge count={0} showZero>
            <Button
              shape="round"
              icon={<ShoppingCartOutlined />}
              onClick={() => alert("Cart feature will be available in future phases.")}
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
                <Text strong style={{ maxWidth: 120, textOverflow: "ellipsis", overflow: "hidden" }}>
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

      <Content style={{ padding: "32px 48px", flex: 1, maxWidth: 1200, margin: "0 auto", width: "100%" }}>
        <div
          style={{
            background: colorBgContainer,
            padding: 32,
            borderRadius: borderRadiusLG,
            minHeight: "70vh",
            boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
          }}
        >
          <Outlet />
        </div>
      </Content>

      <Footer style={{ textAlign: "center", color: "#888" }}>
        E-Commerce Storefront ©{new Date().getFullYear()} - Built with React, Vite & Ant Design
      </Footer>
    </Layout>
  );
};

export default StoreLayout;
