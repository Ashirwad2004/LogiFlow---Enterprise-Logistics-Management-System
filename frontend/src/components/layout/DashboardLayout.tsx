import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../core/AuthContext';
import api from '../../core/api';
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
  Receipt,
  Bell,
  ShieldAlert,
  Globe,
  Briefcase
} from 'lucide-react';

const DashboardLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/notifications');
      setNotifications(response.data);
      setUnreadCount(response.data.filter((n: any) => !n.is_read).length);
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000); // 10s polling
    return () => clearInterval(interval);
  }, []);

  const handleMarkRead = async (id: string) => {
    try {
      await api.put(`/notifications/${id}/read`);
      fetchNotifications();
    } catch (err) {
      console.error("Failed to mark read", err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      fetchNotifications();
    } catch (err) {
      console.error("Failed to mark all read", err);
    }
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['Company Admin', 'Super Admin', 'Dispatcher', 'Driver', 'Warehouse Mgr', 'Accountant', 'Customer'] },
    { name: 'Shipments', path: '/shipments', icon: Truck, roles: ['Company Admin', 'Super Admin', 'Dispatcher', 'Driver', 'Customer'] },
    { name: 'Live Tracking', path: '/tracking', icon: MapPin, roles: ['Company Admin', 'Super Admin', 'Dispatcher', 'Driver', 'Customer'] },
    { name: 'Customers', path: '/customers', icon: Briefcase, roles: ['Company Admin', 'Super Admin', 'Dispatcher'] },
    { name: 'Drivers', path: '/fleet', icon: Users, roles: ['Company Admin', 'Super Admin', 'Dispatcher'] },
    { name: 'Vehicles', path: '/vehicles', icon: Truck, roles: ['Company Admin', 'Super Admin', 'Dispatcher'] },
    { name: 'Warehouses', path: '/warehouses', icon: Building, roles: ['Company Admin', 'Super Admin', 'Warehouse Mgr', 'Dispatcher'] },
    { name: 'Billing', path: '/billing', icon: Receipt, roles: ['Company Admin', 'Super Admin', 'Accountant', 'Customer'] },
    { name: 'Audit Logs', path: '/audit-logs', icon: ShieldAlert, roles: ['Company Admin', 'Super Admin'] },
    { name: 'SaaS Portal', path: '/saas', icon: Globe, roles: ['Super Admin'] },
    { name: 'Settings', path: '/settings', icon: Settings, roles: ['Company Admin', 'Super Admin', 'Dispatcher', 'Driver', 'Warehouse Mgr', 'Accountant', 'Customer'] },
  ];

  const visibleNavItems = navItems.filter(item => {
    const userRole = user?.role || '';
    return item.roles.includes(userRole);
  });

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
            {visibleNavItems.map((item) => {
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
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">{user?.company.name} Hub</span>
          </div>

          <div className="flex items-center space-x-6">
            {/* Notification Bell Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-slate-400 hover:text-slate-650 hover:bg-slate-100 rounded-full transition-all cursor-pointer"
              >
                <Bell className="h-6 w-6" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-3xs font-extrabold leading-none text-red-100 bg-rose-600 rounded-full transform translate-x-0.5 -translate-y-0.5">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-3 w-80 bg-white border border-slate-200 rounded-xl shadow-lg py-2 z-50 animate-fade-in">
                  <div className="px-4 py-2 border-b border-slate-100 flex justify-between items-center">
                    <span className="font-bold text-xs text-slate-800 uppercase tracking-wider">Recent Activity</span>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center text-xs text-slate-400">
                        No recent updates.
                      </div>
                    ) : (
                      notifications.slice(0, 10).map((n) => (
                        <div
                          key={n.id}
                          onClick={() => {
                            handleMarkRead(n.id);
                            setShowNotifications(false);
                          }}
                          className={`px-4 py-3 hover:bg-slate-50 cursor-pointer border-b border-slate-50 flex flex-col transition-colors ${
                            !n.is_read ? 'bg-blue-50/20' : ''
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <span className={`text-xs font-bold ${!n.is_read ? 'text-slate-900' : 'text-slate-700'}`}>
                              {n.title}
                            </span>
                            <span className="text-3xs text-slate-400 font-medium">
                              {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1 leading-normal">
                            {n.message}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-3">
              <span className="text-sm font-medium text-slate-700">
                {user?.full_name}
              </span>
              <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center">
                <User className="h-4 w-4 text-slate-650" />
              </div>
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
