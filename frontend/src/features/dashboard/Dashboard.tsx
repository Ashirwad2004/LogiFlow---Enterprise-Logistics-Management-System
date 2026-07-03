import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Truck, Receipt, Users, TrendingUp, AlertTriangle, Building, Settings, CheckCircle2, ChevronRight } from 'lucide-react';
import api from '../../core/api';

interface MetricStats {
  active_shipments: number;
  available_drivers: number;
  active_vehicles: number;
  pending_revenue: number;
}

interface AlertItem {
  id: string;
  title: string;
  message: string;
  type: string;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<MetricStats>({
    active_shipments: 0,
    available_drivers: 0,
    active_vehicles: 0,
    pending_revenue: 0.0
  });
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [weeklyVolume, setWeeklyVolume] = useState<any[]>([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await api.get('/analytics/dashboard');
        setMetrics(response.data.metrics);
        setAlerts(response.data.alerts || []);
        setWeeklyVolume(response.data.weekly_volume || []);
        setMonthlyRevenue(response.data.monthly_revenue || []);
      } catch (err) {
        console.error("Failed to fetch dashboard data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  const stats = [
    { name: 'Active Shipments', value: metrics.active_shipments.toString(), icon: Package, change: '+12%', changeType: 'positive', path: '/shipments' },
    { name: 'Available Drivers', value: metrics.available_drivers.toString(), icon: Users, change: 'Optimal', changeType: 'neutral', path: '/fleet' },
    { name: 'Vehicles on Duty', value: metrics.active_vehicles.toString(), icon: Truck, change: 'Active', changeType: 'positive', path: '/vehicles' },
    { name: 'Pending Invoices', value: `$${metrics.pending_revenue.toFixed(2)}`, icon: Receipt, change: 'GST incl.', changeType: 'neutral', path: '/billing' },
  ];

  // Calculate dynamic weekly volume line path coordinates
  const maxWeeklyCount = Math.max(...weeklyVolume.map(v => v.count), 1);
  const weeklyPoints = weeklyVolume.map((v, i) => ({
    x: 40 + i * 53, // Spaced from 40 to 358
    y: 120 - (v.count / maxWeeklyCount) * 80, // Scale it to fit the 40-120 range
    day: v.day,
    count: v.count
  }));

  const linePath = weeklyPoints.reduce((acc, pt, i) => i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`, '');
  const areaPath = weeklyPoints.length > 0 ? `${linePath} L ${weeklyPoints[weeklyPoints.length - 1].x} 120 L ${weeklyPoints[0].x} 120 Z` : '';

  // Monthly revenue helper
  const maxMonthlyRevenue = Math.max(...monthlyRevenue.map(m => m.revenue), 100);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard Overview</h1>
          <p className="text-sm text-slate-500 mt-1">Real-time status updates and fleet analytics.</p>
        </div>
        <div className="text-xs text-slate-400 font-medium">
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((item) => (
          <button
            key={item.name}
            onClick={() => navigate(item.path)}
            className="bg-white overflow-hidden shadow-sm border border-slate-200 rounded-xl p-5 hover:border-blue-500 hover:shadow-md transition-all text-left w-full cursor-pointer animate-fade-in"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{item.name}</p>
                <p className="mt-2 text-3xl font-black text-slate-900 tracking-tight">{item.value}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
                <item.icon className="w-6 h-6" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-xs justify-between">
              <span className={`font-semibold ${
                item.changeType === 'positive' ? 'text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded' :
                item.changeType === 'negative' ? 'text-rose-600 bg-rose-50 px-2 py-0.5 rounded' :
                'text-slate-500 bg-slate-100 px-2 py-0.5 rounded'
              }`}>
                {item.changeType === 'positive' && <TrendingUp className="w-3.5 h-3.5 inline mr-1" />}
                {item.change}
              </span>
              <span className="text-blue-600 font-bold flex items-center hover:underline">
                View Details <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Weekly Shipments SVG Chart */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Weekly Shipment Volume</h3>
            <p className="text-xs text-slate-500 mt-0.5">Total completed deliveries mapped day-over-day.</p>
          </div>
          
          <div className="h-44 w-full relative pt-2">
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-400">Loading weekly telemetry...</div>
            ) : (
              <svg viewBox="0 0 400 150" className="w-full h-full">
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3"/>
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0"/>
                  </linearGradient>
                </defs>
                {/* Gridlines */}
                <line x1="0" y1="30" x2="400" y2="30" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="0" y1="75" x2="400" y2="75" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="0" y1="120" x2="400" y2="120" stroke="#f1f5f9" strokeWidth="1" />
                
                {weeklyPoints.length > 0 && (
                  <>
                    {/* Area filled path */}
                    <path d={areaPath} fill="url(#areaGrad)" />
                    {/* Main Line path */}
                    <path d={linePath} fill="none" stroke="#2563eb" strokeWidth="3.5" strokeLinecap="round" />
                    
                    {/* Dot Highlights & Labels */}
                    {weeklyPoints.map((pt, i) => (
                      <g key={i}>
                        <circle cx={pt.x} cy={pt.y} r="4.5" fill="#2563eb" stroke="#ffffff" strokeWidth="2" />
                        {pt.count > 0 && (
                          <text x={pt.x} y={pt.y - 8} fill="#1e293b" fontSize="8" fontWeight="bold" textAnchor="middle">
                            {pt.count}
                          </text>
                        )}
                        <text x={pt.x} y="140" fill="#94a3b8" fontSize="9" textAnchor="middle">
                          {pt.day}
                        </text>
                      </g>
                    ))}
                  </>
                )}
              </svg>
            )}
          </div>
        </div>

        {/* Monthly Revenue SVG Chart */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Monthly Freight Revenue ($)</h3>
            <p className="text-xs text-slate-500 mt-0.5">Calculated subtotal and GST payouts logged across months.</p>
          </div>
          
          <div className="h-44 w-full relative pt-2">
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-400">Loading revenue metrics...</div>
            ) : (
              <svg viewBox="0 0 400 150" className="w-full h-full">
                {/* Gridlines */}
                <line x1="0" y1="30" x2="400" y2="30" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="0" y1="75" x2="400" y2="75" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="0" y1="120" x2="400" y2="120" stroke="#f1f5f9" strokeWidth="1" />
                
                {monthlyRevenue.map((m, i) => {
                  const width = 35;
                  const height = (m.revenue / maxMonthlyRevenue) * 90; // scale up to 90px max height
                  const x = 40 + i * 90;
                  const y = 120 - height;
                  
                  return (
                    <g key={i}>
                      <rect x={x} y={y} width={width} height={height} rx={4} fill={i === 3 ? "#2563eb" : "#60a5fa"} />
                      <text x={x + 17.5} y={y - 8} fill={i === 3 ? "#2563eb" : "#475569"} fontSize="8" fontWeight="bold" textAnchor="middle">
                        {m.revenue > 0 ? `$${Math.round(m.revenue)}` : '$0'}
                      </text>
                      <text x={x + 17.5} y="140" fill="#94a3b8" fontSize="9" textAnchor="middle">
                        {m.month.substring(0, 3)}
                      </text>
                    </g>
                  );
                })}
              </svg>
            )}
          </div>
        </div>
      </div>

      {/* Alerts & Quick Actions Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Dynamic Alerts */}
        <div className="bg-white shadow-sm border border-slate-200 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-800 mb-4">Recent Security & Audit Logs</h2>
            <div className="space-y-4">
              {loading ? (
                <div className="text-slate-400 text-xs text-center py-6">Loading logs...</div>
              ) : alerts.length === 0 ? (
                <div className="flex p-4 border border-emerald-100 bg-emerald-50/50 rounded-lg text-emerald-800 text-xs items-center">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 mr-2 flex-shrink-0" />
                  <span>All logistics operations and API routes are running healthy. No anomalies detected.</span>
                </div>
              ) : (
                alerts.map((alert) => (
                  <div key={alert.id} className="flex p-4 border border-blue-100 bg-blue-50/30 rounded-lg animate-fade-in">
                    <AlertTriangle className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                    <div className="ml-3">
                      <h3 className="text-sm font-semibold text-blue-900">{alert.title}</h3>
                      <p className="text-xs text-blue-700 mt-1">{alert.message}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions Panel */}
        <div className="bg-white shadow-sm border border-slate-200 rounded-xl p-6">
          <h2 className="text-base font-bold text-slate-800 mb-4">Operations Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => navigate('/shipments/new')}
              className="p-4 border border-slate-200 rounded-xl hover:border-blue-500 hover:bg-blue-50/50 transition-all text-left cursor-pointer"
            >
              <Package className="w-6 h-6 text-blue-600 mb-2" />
              <div className="font-bold text-slate-800 text-sm">New Shipment</div>
              <div className="text-xs text-slate-500 mt-1">Book cargo freight</div>
            </button>
            
            <button
              onClick={() => navigate('/billing')}
              className="p-4 border border-slate-200 rounded-xl hover:border-blue-500 hover:bg-blue-50/50 transition-all text-left cursor-pointer"
            >
              <Receipt className="w-6 h-6 text-blue-600 mb-2" />
              <div className="font-bold text-slate-800 text-sm">Collect Payment</div>
              <div className="text-xs text-slate-500 mt-1">Settle client invoices</div>
            </button>

            <button
              onClick={() => navigate('/fleet')}
              className="p-4 border border-slate-200 rounded-xl hover:border-blue-500 hover:bg-blue-50/50 transition-all text-left cursor-pointer"
            >
              <Users className="w-6 h-6 text-blue-600 mb-2" />
              <div className="font-bold text-slate-800 text-sm">Onboard Driver</div>
              <div className="text-xs text-slate-500 mt-1">Add drivers to fleet</div>
            </button>

            <button
              onClick={() => navigate('/vehicles')}
              className="p-4 border border-slate-200 rounded-xl hover:border-blue-500 hover:bg-blue-50/50 transition-all text-left cursor-pointer"
            >
              <Truck className="w-6 h-6 text-blue-600 mb-2" />
              <div className="font-bold text-slate-800 text-sm">Assign Fleet</div>
              <div className="text-xs text-slate-500 mt-1">Register logistics vehicles</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
