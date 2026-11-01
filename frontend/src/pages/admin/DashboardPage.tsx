import React, { useEffect, useState } from "react";
import {
  Card,
  Col,
  Row,
  Statistic,
  Typography,
  Button,
  Space,
  Spin,
} from "antd";
import {
  ShoppingOutlined,
  AppstoreOutlined,
  OrderedListOutlined,
  UserOutlined,
  ArrowRightOutlined,
  ReloadOutlined,
  ShopOutlined,
} from "@ant-design/icons";
import { Link } from "react-router-dom";
import { getCategories, getProducts } from "../../api/catalog.api";
import { getAdminOrders } from "../../api/order.api";

const { Title, Paragraph } = Typography;

const DashboardPage: React.FC = () => {
  const [productCount, setProductCount] = useState<number | null>(null);
  const [categoryCount, setCategoryCount] = useState<number | null>(null);
  const [orderCount, setOrderCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchStats = async () => {
    setLoading(true);
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
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div>
      <div
        style={{
          marginBottom: 24,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Bảng điều khiển Quản trị (Admin Dashboard)
          </Title>
          <Paragraph type="secondary" style={{ margin: 0 }}>
            Tổng quan số liệu danh mục, sản phẩm và lối tắt quản lý hệ thống
          </Paragraph>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchStats} loading={loading}>
            Làm mới
          </Button>
          <Link to="/">
            <Button icon={<ShopOutlined />}>Xem Cửa hàng</Button>
          </Link>
        </Space>
      </div>

      <Spin spinning={loading}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={8}>
            <Card bordered={false} hoverable style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
              <Statistic
                title="Tổng số sản phẩm"
                value={productCount !== null ? productCount : "—"}
                prefix={<ShoppingOutlined style={{ color: "#1677ff" }} />}
                suffix="thiết bị"
              />
              <div style={{ marginTop: 12 }}>
                <Link to="/admin/products">
                  <Button type="link" size="small" style={{ padding: 0 }}>
                    Quản lý sản phẩm <ArrowRightOutlined />
                  </Button>
                </Link>
              </div>
            </Card>
          </Col>

          <Col xs={24} sm={12} md={8}>
            <Card bordered={false} hoverable style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
              <Statistic
                title="Tổng số danh mục"
                value={categoryCount !== null ? categoryCount : "—"}
                prefix={<AppstoreOutlined style={{ color: "#52c41a" }} />}
                suffix="nhóm hàng"
              />
              <div style={{ marginTop: 12 }}>
                <Link to="/admin/categories">
                  <Button type="link" size="small" style={{ padding: 0 }}>
                    Quản lý danh mục <ArrowRightOutlined />
                  </Button>
                </Link>
              </div>
            </Card>
          </Col>

          <Col xs={24} sm={12} md={8}>
            <Card bordered={false} hoverable style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
              <Statistic
                title="Tổng số đơn hàng"
                value={orderCount !== null ? orderCount : "—"}
                prefix={<OrderedListOutlined style={{ color: "#faad14" }} />}
                suffix="đơn"
              />
              <div style={{ marginTop: 12 }}>
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
              Hệ thống E-Commerce Catalog (Sản phẩm & Danh mục) đã được kết nối với cơ sở dữ liệu MySQL và dịch vụ lưu trữ hình ảnh Cloudinary.
            </Paragraph>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DashboardPage;
