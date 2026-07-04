import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LandingPage from './components/LandingPage';
import LoginPage from './components/shared/LoginPage';
// Admin
import AdminLayout from './components/layouts/AdminLayout';
import AdminDashboard from './components/admin/AdminDashboard';
import AdminTenants from './components/admin/AdminTenants';
import AdminLicenses from './components/admin/AdminLicenses';
import AdminPlans from './components/admin/AdminPlans';
import AdminModules from './components/admin/AdminModules';
import AdminResellers from './components/admin/AdminResellers';
import AdminApiKeys from './components/admin/AdminApiKeys';
import AdminWebhooks from './components/admin/AdminWebhooks';
import AdminUsers from './components/admin/AdminUsers';
import AdminLogs from './components/admin/AdminLogs';
import AdminSupport from './components/admin/AdminSupport';
import AdminSettings from './components/admin/AdminSettings';
// SaaS
import SaaSLayout from './components/layouts/SaaSLayout';
import SaaSDashboard from './components/saas/SaaSDashboard';
import SaaSProducts from './components/saas/SaaSProducts';
import SaaSServices from './components/saas/SaaSServices';
import SaaSRealEstate from './components/saas/SaaSRealEstate';
import SaaSVehicles from './components/saas/SaaSVehicles';
import SaaSClients from './components/saas/SaaSClients';
import SaaSSuppliers from './components/saas/SaaSSuppliers';
import SaaSInventory from './components/saas/SaaSInventory';
import StockEntries from './components/saas/StockEntries';
import StockExits from './components/saas/StockExits';
import { StockAdjustments, StockTransfers } from './components/saas/StockOther';
import SaaSSales from './components/saas/SaaSSales';
import SaaSFinancial from './components/saas/SaaSFinancial';
import Receivables from './components/saas/Receivables';
import Payables from './components/saas/Payables';
import { Transactions, Commissions, Quotes, Orders } from './components/saas/FinancialExtra';
import SaaSFiscal from './components/saas/SaaSFiscal';
import { NFePage, NFCePage, FiscalReports, AdminAlerts } from './components/saas/FiscalPages';
import SaaSReports from './components/saas/SaaSReports';
import SaaSUsers from './components/saas/SaaSUsers';
import SaaSPermissions from './components/saas/SaaSPermissions';
import SaaSPdvSettings from './components/saas/SaaSPdvSettings';
import SaaSSettings from './components/saas/SaaSSettings';
import SaaSSupport from './components/saas/SaaSSupport';
// PDV
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
          <Route path="modules" element={<AdminModules />} />
          <Route path="module-editor" element={<AdminModules />} />
          <Route path="resellers" element={<AdminResellers />} />
          <Route path="api-keys" element={<AdminApiKeys />} />
          <Route path="webhooks" element={<AdminWebhooks />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="logs" element={<AdminLogs />} />
          <Route path="alerts" element={<AdminAlerts />} />
          <Route path="reports" element={<AdminDashboard />} />
          <Route path="support" element={<AdminSupport />} />
          <Route path="settings" element={<AdminSettings />} />
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
          {/* Vendas */}
          <Route index element={<SaaSDashboard />} />
          <Route path="sales" element={<SaaSSales />} />
          <Route path="quotes" element={<Quotes />} />
          <Route path="orders" element={<Orders />} />
          {/* Cadastros */}
          <Route path="products" element={<SaaSProducts />} />
          <Route path="services" element={<SaaSServices />} />
          <Route path="real-estate" element={<SaaSRealEstate />} />
          <Route path="vehicles" element={<SaaSVehicles />} />
          <Route path="clients" element={<SaaSClients />} />
          <Route path="suppliers" element={<SaaSSuppliers />} />
          {/* Estoque */}
          <Route path="inventory" element={<SaaSInventory />} />
          <Route path="stock-entries" element={<StockEntries />} />
          <Route path="stock-exits" element={<StockExits />} />
          <Route path="stock-adjustments" element={<StockAdjustments />} />
          <Route path="stock-transfers" element={<StockTransfers />} />
          {/* Financeiro */}
          <Route path="financial" element={<SaaSFinancial />} />
          <Route path="receivables" element={<Receivables />} />
          <Route path="payables" element={<Payables />} />
          <Route path="cashflow" element={<SaaSFinancial />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="commissions" element={<Commissions />} />
          {/* Fiscal */}
          <Route path="fiscal" element={<SaaSFiscal />} />
          <Route path="nfe" element={<NFePage />} />
          <Route path="nfce" element={<NFCePage />} />
          <Route path="fiscal-reports" element={<FiscalReports />} />
          {/* Gestão */}
          <Route path="reports" element={<SaaSReports />} />
          <Route path="users" element={<SaaSUsers />} />
          <Route path="permissions" element={<SaaSPermissions />} />
          <Route path="pdv-settings" element={<SaaSPdvSettings />} />
          <Route path="settings" element={<SaaSSettings />} />
          <Route path="support" element={<SaaSSupport />} />
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
