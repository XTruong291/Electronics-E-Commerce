import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Spin, Result, Button } from "antd";
import { useAuthStore } from "../store/useAuthStore";
import type { UserRole } from "../types/auth";

interface ProtectedRouteProps {
  roles?: UserRole[];
  children?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ roles, children }) => {
  const { user, isHydrated, isLoading } = useAuthStore();
  const location = useLocation();

  if (!isHydrated || isLoading) {
    return (
      <div
        style={{
          minHeight: "60vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Spin size="large" tip="Đang tải dữ liệu xác thực..." />
      </div>
    );
  }

  if (!user) {
    const redirectPath = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${redirectPath}`} replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return (
      <div style={{ padding: "60px 24px" }}>
        <Result
          status="403"
          title="403 - Quyền truy cập bị từ chối"
          subTitle="Bạn không có quyền truy cập vào trang này. Vui lòng liên hệ quản trị viên."
          extra={
            <Button type="primary" onClick={() => (window.location.href = "/")}>
              Về trang chủ
            </Button>
          }
        />
      </div>
    );
  }

  return children ? <>{children}</> : null;
};

export default ProtectedRoute;
