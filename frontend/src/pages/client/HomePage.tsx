import React, { useEffect, useState } from "react";
import {
  Card,
  Alert,
  Tag,
  Button,
  Typography,
  Space,
  Descriptions,
  Spin,
} from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  DatabaseOutlined,
  ApiOutlined,
  ArrowRightOutlined,
} from "@ant-design/icons";
import { Link } from "react-router-dom";
import axiosClient from "../../api/axiosClient";

const { Title, Paragraph, Text } = Typography;

interface HealthResponse {
  status: string;
  db: string;
}

const HomePage: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [healthData, setHealthData] = useState<HealthResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<string | null>(null);

  const fetchHealthStatus = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await axiosClient.get<any, HealthResponse>("/health");
      setHealthData(data);
      setLastChecked(new Date().toLocaleTimeString());
    } catch (err: any) {
      console.error("Health check error:", err);
      setErrorMsg(
        err?.response?.data?.message ||
          err?.message ||
          "Could not connect to Backend server or Database."
      );
      setHealthData(null);
      setLastChecked(new Date().toLocaleTimeString());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthStatus();
  }, []);

  const isConnected = healthData?.status === "ok" && healthData?.db === "connected";

  return (
    <div>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <Title level={2} style={{ marginBottom: 8 }}>
          🛒 E-Commerce Web Application
        </Title>
        <Paragraph type="secondary" style={{ fontSize: "16px" }}>
          Phase 1: Project Scaffolding, Docker DB & Health Check Connection
        </Paragraph>
      </div>

      <Card
        title={
          <Space>
            <ApiOutlined style={{ color: "#1677ff" }} />
            <span>Hệ Thống Kiểm Tra Kết Nối (System Health Check)</span>
          </Space>
        }
        extra={
          <Button
            type="primary"
            icon={<SyncOutlined spin={loading} />}
            onClick={fetchHealthStatus}
            loading={loading}
          >
            Kiểm tra lại
          </Button>
        }
        style={{ marginBottom: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
      >
        {loading ? (
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <Spin size="large" />
            <div style={{ marginTop: 16 }}>
              <Text type="secondary">Đang kết nối tới Backend và Database...</Text>
            </div>
          </div>
        ) : errorMsg ? (
          <Alert
            message="Kết nối thất bại"
            description={
              <div>
                <p>{errorMsg}</p>
                <Text type="secondary">
                  Vui lòng đảm bảo Backend FastAPI đang chạy tại <code>http://127.0.0.1:8000</code> và container MySQL 8.0 đã được bật qua <code>docker-compose</code>.
                </Text>
              </div>
            }
            type="error"
            showIcon
            icon={<CloseCircleOutlined />}
          />
        ) : isConnected ? (
          <div>
            <Alert
              message="Hệ thống hoạt động hoàn hảo"
              description="Kết nối từ Frontend (Vite) đến Backend (FastAPI) và Database (MySQL 8.0) thành công 100%!"
              type="success"
              showIcon
              icon={<CheckCircleOutlined />}
              style={{ marginBottom: 24 }}
            />

            <Descriptions bordered column={{ xxl: 3, xl: 3, lg: 3, md: 1, sm: 1, xs: 1 }}>
              <Descriptions.Item label="Backend Status">
                <Tag color="success" icon={<CheckCircleOutlined />}>
                  {healthData?.status.toUpperCase()}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="MySQL Database">
                <Tag color="success" icon={<DatabaseOutlined />}>
                  {healthData?.db.toUpperCase()} (Port 3307)
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Thời gian kiểm tra">
                <Text type="secondary">{lastChecked}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Endpoint">
                <code>GET /api/v1/health</code>
              </Descriptions.Item>
              <Descriptions.Item label="Raw Response" span={2}>
                <code>{JSON.stringify(healthData)}</code>
              </Descriptions.Item>
            </Descriptions>
          </div>
        ) : null}
      </Card>

      <Card title="Khám phá Quản trị viên (Admin Portal)" style={{ marginTop: 24 }}>
        <Paragraph>
          Khung layout Admin với Sidebar Ant Design (Products, Categories, Orders) đã sẵn sàng để tích hợp ở các Phase tiếp theo.
        </Paragraph>
        <Link to="/admin">
          <Button type="default" icon={<ArrowRightOutlined />}>
            Đi tới trang Quản trị (Admin Dashboard)
          </Button>
        </Link>
      </Card>
    </div>
  );
};

export default HomePage;
