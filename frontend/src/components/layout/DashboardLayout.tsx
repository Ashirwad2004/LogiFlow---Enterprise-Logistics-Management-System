import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../core/AuthContext';
import { 
  PackageSearch, 
  LayoutDashboard, 
  Truck, 
  MapPin, 
  LogOut,
  Building,
  User,
  Settings,
  Users,
  Receipt
} from 'lucide-react';

const DashboardLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Shipments', path: '/shipments', icon: Truck },
    { name: 'Live Tracking', path: '/tracking', icon: MapPin },
    { name: 'Fleet', path: '/fleet', icon: Users },
    { name: 'Warehouses', path: '/warehouses', icon: Building },
    { name: 'Billing', path: '/billing', icon: Receipt },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-slate-200 flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-slate-200">
          <PackageSearch className="w-6 h-6 text-blue-600 mr-2" />
          <span className="font-bold text-xl text-slate-900 tracking-tight">LogiFlow</span>
        </div>
        
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
              {user?.company.name.charAt(0) || 'C'}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-slate-900 truncate">
                {user?.company.name}
              </p>
              <p className="text-xs text-slate-500 truncate capitalize">
                {user?.role}
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-3">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
              return (
                <li key={item.name}>
                  <Link
                    to={item.path}
                    className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <item.icon className={`mr-3 flex-shrink-0 h-5 w-5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-4 border-t border-slate-200">
          <button
            onClick={logout}
            className="flex items-center w-full px-3 py-2.5 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 transition-colors"
          >
            <LogOut className="mr-3 h-5 w-5 text-red-500" />
            Sign out
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-end px-8 shadow-sm">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-slate-700">
              Welcome, {user?.full_name}
            </span>
            <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center">
              <User className="h-4 w-4 text-slate-600" />
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
