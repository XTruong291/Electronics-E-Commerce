import React, { useState } from "react";
import { Form, Input, Button, Card, Typography, Divider, Alert, Space } from "antd";
import {
  LockOutlined,
  MailOutlined,
  GoogleOutlined,
  GithubOutlined,
  ShoppingOutlined,
} from "@ant-design/icons";
import { Link, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import axiosClient from "../../api/axiosClient";
import { useAuthStore } from "../../store/useAuthStore";
import type { AuthResponse } from "../../types/auth";

const { Title, Text } = Typography;

const LoginPage: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  const location = useLocation();
  const redirectUrl =
    searchParams.get("redirect") ||
    (location.state as { from?: string } | null)?.from ||
    "/";

  const onFinish = async (values: { email: string; password: string }) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = (await axiosClient.post(
        "/auth/login",
        values
      )) as unknown as AuthResponse;
      login(data.user, data.access_token);
      navigate(redirectUrl, { replace: true });
    } catch (err: unknown) {
      const anyErr = err as { response?: { data?: { detail?: string } }; message?: string };
      setErrorMsg(
        anyErr.response?.data?.detail || "Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSSOLogin = (provider: "google" | "github") => {
    const apiBase = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api/v1";
    const target = encodeURIComponent(redirectUrl);
    window.location.href = `${apiBase}/auth/sso/${provider}/authorize?redirect=${target}`;
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #f0f4f8 0%, #d9e2ec 100%)",
        padding: "24px 16px",
      }}
    >
      <Card
        style={{
          width: "100%",
          maxWidth: 420,
          borderRadius: 16,
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.08)",
          border: "1px solid rgba(0, 0, 0, 0.06)",
        }}
        styles={{ body: { padding: "36px 32px" } }}
      >
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div
            style={{
              width: 52,
              height: 52,
              background: "#1677ff",
              color: "#fff",
              borderRadius: "50%",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 26,
              marginBottom: 12,
            }}
          >
            <ShoppingOutlined />
          </div>
          <Title level={3} style={{ margin: "0 0 6px 0", fontWeight: 700 }}>
            Đăng nhập tài khoản
          </Title>
          <Text type="secondary" style={{ fontSize: 14 }}>
            Chào mừng bạn quay lại với E-Commerce
          </Text>
        </div>

        {errorMsg && (
          <Alert
            message={errorMsg}
            type="error"
            showIcon
            closable
            onClose={() => setErrorMsg(null)}
            style={{ marginBottom: 20 }}
          />
        )}

        <Form
          form={form}
          name="loginForm"
          layout="vertical"
          onFinish={onFinish}
          requiredMark={false}
          size="large"
        >
          <Form.Item
            name="email"
            rules={[
              { required: true, message: "Vui lòng nhập địa chỉ email" },
              { type: "email", message: "Định dạng email không hợp lệ" },
            ]}
          >
            <Input
              prefix={<MailOutlined style={{ color: "#8c8c8c" }} />}
              placeholder="name@example.com"
              autoComplete="email"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: "Vui lòng nhập mật khẩu" }]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: "#8c8c8c" }} />}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 16 }}>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loading}
              style={{
                height: 44,
                borderRadius: 8,
                fontWeight: 600,
                fontSize: 15,
              }}
            >
              Đăng nhập
            </Button>
          </Form.Item>
        </Form>

        <Divider plain style={{ margin: "20px 0", color: "#8c8c8c", fontSize: 13 }}>
          Hoặc tiếp tục với
        </Divider>

        <Space orientation="vertical" style={{ width: "100%" }} size="middle">
          <Button
            block
            size="large"
            icon={<GoogleOutlined style={{ color: "#ea4335" }} />}
            onClick={() => handleSSOLogin("google")}
            style={{
              height: 44,
              borderRadius: 8,
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            Google
          </Button>

          <Button
            block
            size="large"
            icon={<GithubOutlined style={{ color: "#24292e" }} />}
            onClick={() => handleSSOLogin("github")}
            style={{
              height: 44,
              borderRadius: 8,
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            GitHub
          </Button>
        </Space>

        <div style={{ textAlign: "center", marginTop: 24 }}>
          <Text type="secondary" style={{ fontSize: 14 }}>
            Chưa có tài khoản?{" "}
            <Link to="/register" style={{ fontWeight: 600, color: "#1677ff" }}>
              Đăng ký ngay
            </Link>
          </Text>
        </div>
      </Card>
    </div>
  );
};

export default LoginPage;
