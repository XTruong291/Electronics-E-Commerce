import React, { useEffect, useState } from "react";
import { Spin, Alert, Card, Button } from "antd";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "../../store/useAuthStore";
import axiosClient from "../../api/axiosClient";
import type { User } from "../../types/auth";

const SSOCallbackPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const setAccessToken = useAuthStore((state) => state.setAccessToken);

  useEffect(() => {
    const error = searchParams.get("error");
    const accessToken = searchParams.get("access_token");
    const redirect = searchParams.get("redirect") || "/";

    if (error) {
      setErrorMsg(decodeURIComponent(error));
      return;
    }

    if (accessToken) {
      setAccessToken(accessToken);
      // Fetch authenticated user profile using newly received token
      axiosClient
        .get("/auth/me")
        .then((res: unknown) => {
          const user = res as User;
          login(user, accessToken);
          navigate(redirect, { replace: true });
        })
        .catch((err) => {
          console.error("Failed to load user profile on SSO callback:", err);
          setErrorMsg("Không thể xác thực thông tin người dùng từ SSO.");
        });
      return;
    }

    // Fallback: try hydrating session via cookie
    useAuthStore
      .getState()
      .hydrate()
      .then(() => {
        if (useAuthStore.getState().user) {
          navigate(redirect, { replace: true });
        } else {
          setErrorMsg("Không tìm thấy thông tin đăng nhập từ SSO.");
        }
      })
      .catch(() => {
        setErrorMsg("Xác thực SSO thất bại.");
      });
  }, [searchParams, navigate, login, setAccessToken]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f0f2f5",
        padding: 24,
      }}
    >
      <Card
        style={{
          width: "100%",
          maxWidth: 420,
          borderRadius: 16,
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
          textAlign: "center",
          padding: "24px 12px",
        }}
      >
        {errorMsg ? (
          <div>
            <Alert
              message="Đăng nhập SSO không thành công"
              description={errorMsg}
              type="error"
              showIcon
              style={{ marginBottom: 24, textAlign: "left" }}
            />
            <Button type="primary" onClick={() => navigate("/login")}>
              Quay lại trang Đăng nhập
            </Button>
          </div>
        ) : (
          <div style={{ padding: "32px 0" }}>
            <Spin size="large" />
            <div style={{ marginTop: 20, color: "#666", fontSize: 15 }}>
              Đang xác thực tài khoản SSO của bạn, vui lòng đợi trong giây lát...
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default SSOCallbackPage;
