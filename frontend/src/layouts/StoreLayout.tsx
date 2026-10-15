import React from "react";
import { Layout, Button, Badge, Space, Typography, theme } from "antd";
import { ShoppingCartOutlined, ShopOutlined } from "@ant-design/icons";
import { Outlet, Link } from "react-router-dom";

const { Header, Content, Footer } = Layout;
const { Title } = Typography;

const StoreLayout: React.FC = () => {
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

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
            Home
          </Link>
          <Link to="/admin" style={{ color: "#666", fontSize: "14px" }}>
            Admin Portal
          </Link>
          <Badge count={0} showZero>
            <Button
              type="primary"
              shape="round"
              icon={<ShoppingCartOutlined />}
              onClick={() => alert("Cart feature will be available in future phases.")}
            >
              Giỏ hàng
            </Button>
          </Badge>
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
