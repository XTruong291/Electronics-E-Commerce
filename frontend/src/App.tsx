import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import StoreLayout from "./layouts/StoreLayout";
import AdminLayout from "./layouts/AdminLayout";
import HomePage from "./pages/client/HomePage";
import ProfilePage from "./pages/client/ProfilePage";
import DashboardPage from "./pages/admin/DashboardPage";
import UsersPage from "./pages/admin/UsersPage";
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
    <BrowserRouter>
      <Routes>
        {/* Auth routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/auth/sso/callback" element={<SSOCallbackPage />} />

        {/* Client Storefront Routes */}
        <Route path="/" element={<StoreLayout />}>
          <Route index element={<HomePage />} />
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
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
