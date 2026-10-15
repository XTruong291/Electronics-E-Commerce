import React from "react";
import { Card, Col, Row, Statistic, Typography, Button } from "antd";
import {
  ShoppingOutlined,
  AppstoreOutlined,
  OrderedListOutlined,
  ArrowLeftOutlined,
} from "@ant-design/icons";
import { Link } from "react-router-dom";

const { Title, Paragraph } = Typography;

const DashboardPage: React.FC = () => {
  return (
    <div>
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Admin Dashboard
          </Title>
          <Paragraph type="secondary" style={{ margin: 0 }}>
            Khung giao diện quản trị Admin với Ant Design Navigation Layout
          </Paragraph>
        </div>
        <Link to="/">
          <Button icon={<ArrowLeftOutlined />}>Về Cửa hàng (Client Store)</Button>
        </Link>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Card bordered={false} hoverable>
            <Statistic
              title="Products"
              value={0}
              prefix={<ShoppingOutlined style={{ color: "#1677ff" }} />}
              suffix="(Phase 2)"
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card bordered={false} hoverable>
            <Statistic
              title="Categories"
              value={0}
              prefix={<AppstoreOutlined style={{ color: "#52c41a" }} />}
              suffix="(Phase 2)"
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card bordered={false} hoverable>
            <Statistic
              title="Orders"
              value={0}
              prefix={<OrderedListOutlined style={{ color: "#faad14" }} />}
              suffix="(Phase 4)"
            />
          </Card>
        </Col>
      </Row>

      <Card title="Ghi chú Phase 1" style={{ marginTop: 24 }}>
        <Paragraph>
          Khung AdminLayout đã được hoàn thiện với Sidebar có thể thu phóng, Header chứa thông tin điều hướng, và vùng Content sẵn sàng tiếp nhận các module Products, Categories, Orders theo đúng quy tắc cấu trúc thư mục của <code>AGENT.md</code>.
        </Paragraph>
      </Card>
    </div>
  );
};

export default DashboardPage;
