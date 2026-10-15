import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import StoreLayout from "./layouts/StoreLayout";
import AdminLayout from "./layouts/AdminLayout";
import HomePage from "./pages/client/HomePage";
import DashboardPage from "./pages/admin/DashboardPage";

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Client Storefront Routes */}
        <Route path="/" element={<StoreLayout />}>
          <Route index element={<HomePage />} />
        </Route>

        {/* Admin Dashboard Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<DashboardPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
