import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ConfigProvider } from "antd";
import StoreLayout from "./layouts/StoreLayout";
import AdminLayout from "./layouts/AdminLayout";
import HomePage from "./pages/client/HomePage";
import ProductDetailPage from "./pages/client/ProductDetailPage";
import CheckoutPage from "./pages/client/CheckoutPage";
import MyOrdersPage from "./pages/client/MyOrdersPage";
import ProfilePage from "./pages/client/ProfilePage";
import DashboardPage from "./pages/admin/DashboardPage";
import UsersPage from "./pages/admin/UsersPage";
import ProductsPage from "./pages/admin/ProductsPage";
import CategoriesPage from "./pages/admin/CategoriesPage";
import OrdersPage from "./pages/admin/OrdersPage";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import SSOCallbackPage from "./pages/auth/SSOCallbackPage";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAuthStore } from "./store/useAuthStore";

const App: React.FC = () => {
  useEffect(() => {
    // Hydrate user session silently via HttpOnly cookie on page load
    useAuthStore.getState().hydrate();
  }, []);

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#cb1c22",
          colorBgLayout: "#f4f5f7",
          borderRadius: 8,
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
          colorLink: "#cb1c22",
          colorLinkHover: "#b01217",
        },
        components: {
          Button: {
            controlHeightLG: 46,
            fontWeight: 600,
          },
          Card: {
            colorBgContainer: "#ffffff",
          },
        },
      }}
    >
      <BrowserRouter>
        <Routes>
          {/* Auth routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/auth/sso/callback" element={<SSOCallbackPage />} />

          {/* Client Storefront Routes */}
          <Route path="/" element={<StoreLayout />}>
            <Route index element={<HomePage />} />
            <Route path="products/:slug" element={<ProductDetailPage />} />
            <Route
              path="checkout"
              element={
                <ProtectedRoute>
                  <CheckoutPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="orders"
              element={
                <ProtectedRoute>
                  <MyOrdersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Admin Dashboard Routes - Guarded: STAFF and ADMIN only */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={["STAFF", "ADMIN"]}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="products" element={<ProductsPage />} />
            <Route path="categories" element={<CategoriesPage />} />
            <Route path="orders" element={<OrdersPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
};

export default App;
