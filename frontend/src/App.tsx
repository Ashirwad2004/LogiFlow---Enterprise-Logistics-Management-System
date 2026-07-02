import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './core/AuthContext';
import LoginPage from './features/auth/LoginPage';
import RegisterPage from './features/auth/RegisterPage';
import ForgotPasswordPage from './features/auth/ForgotPasswordPage';
import ResetPasswordPage from './features/auth/ResetPasswordPage';
import DashboardLayout from './components/layout/DashboardLayout';
import Dashboard from './features/dashboard/Dashboard';
import ShipmentList from './features/shipments/ShipmentList';
import CreateShipment from './features/shipments/CreateShipment';
import ShipmentDetails from './features/shipments/ShipmentDetails';
import LiveTracking from './features/tracking/LiveTracking';
import DriversList from './features/fleet/DriversList';
import VehiclesList from './features/fleet/VehiclesList';
import InvoicesList from './features/billing/InvoicesList';
import WarehousesList from './features/warehouses/WarehousesList';
import SettingsPage from './features/settings/SettingsPage';

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
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
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
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Route>
    </Routes>
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
