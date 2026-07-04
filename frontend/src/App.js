import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LandingPage from './components/LandingPage';
import LoginPage from './components/shared/LoginPage';
import AdminLayout from './components/layouts/AdminLayout';
import AdminDashboard from './components/admin/AdminDashboard';
import AdminTenants from './components/admin/AdminTenants';
import AdminLicenses from './components/admin/AdminLicenses';
import AdminPlans from './components/admin/AdminPlans';
import AdminUsers from './components/admin/AdminUsers';
import AdminLogs from './components/admin/AdminLogs';
import SaaSLayout from './components/layouts/SaaSLayout';
import SaaSDashboard from './components/saas/SaaSDashboard';
import SaaSProducts from './components/saas/SaaSProducts';
import SaaSClients from './components/saas/SaaSClients';
import SaaSSuppliers from './components/saas/SaaSSuppliers';
import SaaSSales from './components/saas/SaaSSales';
import SaaSFinancial from './components/saas/SaaSFinancial';
import SaaSFiscal from './components/saas/SaaSFiscal';
import SaaSUsers from './components/saas/SaaSUsers';
import SaaSSettings from './components/saas/SaaSSettings';
import PDVApp from './components/pdv/PDVApp';

function ProtectedRoute({ children, requiredRoles, redirectTo = '/' }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
      <div className="animate-spin h-8 w-8 border-3 border-slate-200 border-t-brand-blue rounded-full" />
    </div>
  );
  if (!user) return <Navigate to={redirectTo} replace />;
  if (requiredRoles && !requiredRoles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function AdminRoutes() {
  return (
    <ProtectedRoute requiredRoles={['super_admin']} redirectTo="/admin/login">
      <AdminLayout>
        <Routes>
          <Route index element={<AdminDashboard />} />
          <Route path="tenants" element={<AdminTenants />} />
          <Route path="licenses" element={<AdminLicenses />} />
          <Route path="plans" element={<AdminPlans />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="logs" element={<AdminLogs />} />
        </Routes>
      </AdminLayout>
    </ProtectedRoute>
  );
}

function SaaSRoutes() {
  return (
    <ProtectedRoute requiredRoles={['admin', 'manager', 'seller', 'cashier']} redirectTo="/app/login">
      <SaaSLayout>
        <Routes>
          <Route index element={<SaaSDashboard />} />
          <Route path="products" element={<SaaSProducts />} />
          <Route path="clients" element={<SaaSClients />} />
          <Route path="suppliers" element={<SaaSSuppliers />} />
          <Route path="sales" element={<SaaSSales />} />
          <Route path="financial" element={<SaaSFinancial />} />
          <Route path="fiscal" element={<SaaSFiscal />} />
          <Route path="users" element={<SaaSUsers />} />
          <Route path="settings" element={<SaaSSettings />} />
        </Routes>
      </SaaSLayout>
    </ProtectedRoute>
  );
}

function PDVRoutes() {
  return (
    <ProtectedRoute requiredRoles={['admin', 'manager', 'seller', 'cashier']} redirectTo="/pdv/login">
      <PDVApp />
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/admin/login" element={<LoginPage appType="admin" redirectTo="/admin" />} />
          <Route path="/app/login" element={<LoginPage appType="saas" redirectTo="/app" />} />
          <Route path="/pdv/login" element={<LoginPage appType="pdv" redirectTo="/pdv" />} />
          <Route path="/admin/*" element={<AdminRoutes />} />
          <Route path="/app/*" element={<SaaSRoutes />} />
          <Route path="/pdv/*" element={<PDVRoutes />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
