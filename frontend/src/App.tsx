import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LayoutDashboard, Truck, Package, LogOut } from 'lucide-react';

function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-100">
      <aside className="w-64 bg-white shadow-md relative">
        <div className="p-4 bg-brand-600 text-white flex items-center space-x-2">
          <Truck className="h-6 w-6" />
          <span className="text-xl font-bold">LogiFlow</span>
        </div>
        <nav className="p-4 space-y-2">
          <a href="#" className="flex items-center space-x-2 p-2 rounded hover:bg-gray-100 text-brand-600 bg-brand-50 font-medium">
            <LayoutDashboard className="h-5 w-5" />
            <span>Dashboard</span>
          </a>
          <a href="#" className="flex items-center space-x-2 p-2 rounded hover:bg-gray-100 text-gray-700">
            <Package className="h-5 w-5" />
            <span>Shipments</span>
          </a>
        </nav>
        <div className="absolute bottom-0 w-full p-4 border-t">
          <button className="flex items-center space-x-2 text-gray-600 hover:text-red-600 w-full p-2 rounded hover:bg-gray-100 transition-colors">
            <LogOut className="h-5 w-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-8">
        {children}
      </main>
    </div>
  );
}

function Dashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Overview</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500">Active Shipments</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">24</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500">Available Vehicles</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">12</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500">Pending Deliveries</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">8</p>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 mt-8 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <h2 className="font-semibold text-gray-800">Recent Shipments</h2>
          <button className="text-sm text-brand-600 hover:text-brand-700 font-medium">View all</button>
        </div>
        <div className="p-12 text-center text-gray-500">
          <Package className="h-12 w-12 mx-auto text-gray-300 mb-3" />
          <p>No shipments data loaded yet.</p>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardShell><Dashboard /></DashboardShell>} />
      </Routes>
    </BrowserRouter>
  );
}
