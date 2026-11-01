import React, { useState } from "react";
import { Layout, Menu, Typography, theme, Button, Space, Tag, Avatar } from "antd";
import {
  ShoppingOutlined,
  AppstoreOutlined,
  OrderedListOutlined,
  DashboardOutlined,
  UserOutlined,
  LogoutOutlined,
  ShopOutlined,
} from "@ant-design/icons";
import { Outlet, useNavigate, useLocation, Link } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";

const { Header, Content, Sider } = Layout;
const { Title, Text } = Typography;

const AdminLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();

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
      key: "/admin/users",
      icon: <UserOutlined />,
      label: "Người dùng",
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
      key: "/admin/orders",
      icon: <OrderedListOutlined />,
      label: "Đơn hàng",
    },
  ];

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={(value) => setCollapsed(value)}
        theme="dark"
        width={220}
      >
        <div
          style={{
            height: 64,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontWeight: "bold",
            fontSize: collapsed ? "14px" : "18px",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          {collapsed ? "ECO" : "E-COM ADMIN"}
        </div>
        <Menu
          theme="dark"
          selectedKeys={[location.pathname]}
          mode="inline"
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>

      <Layout>
        <Header
          style={{
            padding: "0 24px",
            background: colorBgContainer,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 1px 4px rgba(0,21,41,0.08)",
          }}
        >
          <Title level={4} style={{ margin: 0 }}>
            Quản trị hệ thống
          </Title>

          <Space size="large" align="center">
            <Link to="/" style={{ display: "flex", alignItems: "center", gap: 6, color: "#666" }}>
              <ShopOutlined /> Xem cửa hàng
            </Link>

            {user && (
              <Space size="middle" align="center">
                <Avatar
                  src={user.avatar_url}
                  icon={!user.avatar_url && <UserOutlined />}
                  style={{ backgroundColor: "#1677ff" }}
                />
                <div>
                  <Text strong>{user.full_name}</Text>
                  <Tag
                    color={user.role === "ADMIN" ? "magenta" : "blue"}
                    style={{ marginLeft: 8 }}
                  >
                    {user.role}
                  </Tag>
                </div>
                <Button
                  icon={<LogoutOutlined />}
                  onClick={handleLogout}
                  danger
                  type="text"
                >
                  Đăng xuất
                </Button>
              </Space>
            )}
          </Space>
        </Header>

        <Content style={{ margin: "24px 16px 0" }}>
          <div
            style={{
              padding: 24,
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
