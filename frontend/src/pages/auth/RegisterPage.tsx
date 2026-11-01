import React, { useState } from "react";
import { Form, Input, Button, Card, Typography, Alert, Divider, Space } from "antd";
import {
  LockOutlined,
  MailOutlined,
  UserOutlined,
  PhoneOutlined,
  GoogleOutlined,
  GithubOutlined,
  UserAddOutlined,
} from "@ant-design/icons";
import { Link, useNavigate } from "react-router-dom";
import axiosClient from "../../api/axiosClient";
import { useAuthStore } from "../../store/useAuthStore";
import type { AuthResponse } from "../../types/auth";

const { Title, Text } = Typography;

const RegisterPage: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  const onFinish = async (values: {
    full_name: string;
    email: string;
    phone?: string;
    password: string;
  }) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = (await axiosClient.post(
        "/auth/register",
        {
          full_name: values.full_name,
          email: values.email,
          phone: values.phone || null,
          password: values.password,
        }
      )) as unknown as AuthResponse;
      login(data.user, data.access_token);
      navigate("/", { replace: true });
    } catch (err: unknown) {
      const anyErr = err as { response?: { data?: { detail?: string } }; message?: string };
      setErrorMsg(
        anyErr.response?.data?.detail || "Đăng ký thất bại. Vui lòng thử lại sau."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSSORegister = (provider: "google" | "github") => {
    const apiBase = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api/v1";
    window.location.href = `${apiBase}/auth/sso/${provider}/authorize?redirect=/`;
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f4f5f7",
        padding: "32px 16px",
      }}
    >
      <Card
        style={{
          width: "100%",
          maxWidth: 460,
          borderRadius: 16,
          boxShadow: "0 8px 24px rgba(0, 0, 0, 0.06)",
          border: "1px solid #e5e7eb",
        }}
        styles={{ body: { padding: "36px 32px" } }}
      >
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div
            style={{
              width: 52,
              height: 52,
              background: "#cb1c22",
              color: "#fff",
              borderRadius: "50%",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 26,
              marginBottom: 12,
              boxShadow: "0 4px 12px rgba(203, 28, 34, 0.25)",
            }}
          >
            <UserAddOutlined />
          </div>
          <Title level={3} style={{ margin: "0 0 6px 0", fontWeight: 700, color: "#111827" }}>
            Tạo tài khoản mới
          </Title>
          <Text type="secondary" style={{ fontSize: 14 }}>
            Đăng ký để trải nghiệm mua sắm tại XìMiStore
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
          name="registerForm"
          layout="vertical"
          onFinish={onFinish}
          requiredMark={false}
          size="large"
        >
          <Form.Item
            name="full_name"
            rules={[{ required: true, message: "Vui lòng nhập họ và tên" }]}
          >
            <Input
              prefix={<UserOutlined style={{ color: "#8c8c8c" }} />}
              placeholder="Họ và tên của bạn"
            />
          </Form.Item>

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
            />
          </Form.Item>

          <Form.Item name="phone">
            <Input
              prefix={<PhoneOutlined style={{ color: "#8c8c8c" }} />}
              placeholder="Số điện thoại (tùy chọn)"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              { required: true, message: "Vui lòng nhập mật khẩu" },
              { min: 8, message: "Mật khẩu phải có ít nhất 8 ký tự" },
              {
                pattern: /(?=.*[A-Z])(?=.*[a-z])(?=.*\d)/,
                message: "Mật khẩu phải chứa ít nhất 1 chữ hoa, 1 chữ thường và 1 chữ số",
              },
            ]}
            hasFeedback
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: "#8c8c8c" }} />}
              placeholder="Mật khẩu bảo mật (ít nhất 8 ký tự)"
            />
          </Form.Item>

          <Form.Item
            name="confirm"
            dependencies={["password"]}
            hasFeedback
            rules={[
              { required: true, message: "Vui lòng xác nhận mật khẩu" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("password") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error("Mật khẩu xác nhận không khớp!"));
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: "#8c8c8c" }} />}
              placeholder="Nhập lại mật khẩu"
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
                background: "#cb1c22",
                borderColor: "#cb1c22",
              }}
            >
              Đăng ký tài khoản
            </Button>
          </Form.Item>
        </Form>

        <Divider plain style={{ margin: "20px 0", color: "#8c8c8c", fontSize: 13 }}>
          Hoặc đăng ký nhanh với
        </Divider>

        <Space direction="vertical" style={{ width: "100%" }} size="middle">
          <Button
            block
            size="large"
            icon={<GoogleOutlined style={{ color: "#ea4335" }} />}
            onClick={() => handleSSORegister("google")}
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
            onClick={() => handleSSORegister("github")}
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
            Đã có tài khoản?{" "}
            <Link to="/login" style={{ fontWeight: 600, color: "#cb1c22" }}>
              Đăng nhập ngay
            </Link>
          </Text>
        </div>
      </Card>
    </div>
  );
};

export default RegisterPage;
