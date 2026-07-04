import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './core/AuthContext';
import DashboardLayout from './components/layout/DashboardLayout';

const LoginPage = lazy(() => import('./features/auth/LoginPage'));
const RegisterPage = lazy(() => import('./features/auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./features/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./features/auth/ResetPasswordPage'));
const Dashboard = lazy(() => import('./features/dashboard/Dashboard'));
const ShipmentList = lazy(() => import('./features/shipments/ShipmentList'));
const CreateShipment = lazy(() => import('./features/shipments/CreateShipment'));
const ShipmentDetails = lazy(() => import('./features/shipments/ShipmentDetails'));
const LiveTracking = lazy(() => import('./features/tracking/LiveTracking'));
const DriversList = lazy(() => import('./features/fleet/DriversList'));
const VehiclesList = lazy(() => import('./features/fleet/VehiclesList'));
const InvoicesList = lazy(() => import('./features/billing/InvoicesList'));
const WarehousesList = lazy(() => import('./features/warehouses/WarehousesList'));
const SettingsPage = lazy(() => import('./features/settings/SettingsPage'));
const PublicTrack = lazy(() => import('./features/tracking/PublicTrack'));
const AuditLogs = lazy(() => import('./features/audit/AuditLogs'));
const SaaSManagement = lazy(() => import('./features/saas/SaaSManagement'));
const CustomersList = lazy(() => import('./features/customers/CustomersList'));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50">
    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
  </div>
);

const ProtectedRoute = () => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <Outlet />;
};

const AppRoutes = () => {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<PublicTrack />} />
        <Route path="/track/:trackingNumber" element={<PublicTrack />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/shipments" element={<ShipmentList />} />
            <Route path="/shipments/new" element={<CreateShipment />} />
            <Route path="/shipments/:id" element={<ShipmentDetails />} />
            <Route path="/tracking" element={<LiveTracking />} />
            <Route path="/fleet" element={<DriversList />} />
            <Route path="/vehicles" element={<VehiclesList />} />
            <Route path="/warehouses" element={<WarehousesList />} />
            <Route path="/billing" element={<InvoicesList />} />
            <Route path="/customers" element={<CustomersList />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/audit-logs" element={<AuditLogs />} />
            <Route path="/saas" element={<SaaSManagement />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
};

export default App;
