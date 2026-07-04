import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Search, 
  Truck, 
  MapPin, 
  Package, 
  Calendar, 
  Printer, 
  Loader2, 
  X, 
  Receipt, 
  AlertCircle,
  Clock,
  ArrowRight,
  ShieldCheck,
  Building,
  CheckCircle2,
  Download
} from 'lucide-react';

const API_BASE_URL = 'http://127.0.0.1:8000/api/v1';

interface TrackingData {
  id: string;
  tracking_number: string;
  customer_name: string;
  status: string;
  pickup_address: string;
  delivery_address: string;
  estimated_delivery: string | null;
  actual_delivery: string | null;
  proof_of_delivery_url: string | null;
  items: Array<{
    description: string;
    quantity: number;
    weight_kg: number;
    dimensions: string | null;
  }>;
  tracking_history: Array<{
    latitude: number;
    longitude: number;
    speed_kmh: number;
    status_update: string;
    timestamp: string;
  }>;
  invoice: {
    id: string;
    invoice_number: string;
    subtotal: number;
    tax_amount: number;
    total_amount: number;
    status: string;
    issued_at: string;
    company: {
      name: string;
      legal_name: string | null;
      address: string | null;
      gst_number: string | null;
      support_email: string | null;
      tax_rate: number;
    };
  } | null;
}

const PublicTrack: React.FC = () => {
  const { trackingNumber: routeParam } = useParams<{ trackingNumber?: string }>();
  const navigate = useNavigate();
  
  const [searchQuery, setSearchQuery] = useState(routeParam || '');
  const [trackingData, setTrackingData] = useState<TrackingData | null>(null);
  const currencySymbol = (trackingData?.invoice?.company as any)?.currency === 'INR' ? '₹' : '$';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const polylineRef = useRef<any>(null);

  const fetchTracking = async (num: string) => {
    setLoading(true);
    setError('');
    setTrackingData(null);
    try {
      const response = await axios.get(`${API_BASE_URL}/tracking/public/${num}`);
      setTrackingData(response.data);
    } catch (err: any) {
      console.error('Public tracking failed', err);
      setError(err.response?.data?.detail || 'Shipment tracking number not found.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (routeParam) {
      fetchTracking(routeParam);
    }
  }, [routeParam]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    navigate(`/track/${searchQuery.trim().toUpperCase()}`);
    fetchTracking(searchQuery.trim().toUpperCase());
  };

  useEffect(() => {
    if (!trackingData?.id) return;
    const wsBase = API_BASE_URL.replace(/^http/, 'ws');
    const wsUrl = `${wsBase}/tracking/ws/${trackingData.id}`;
    const socket = new WebSocket(wsUrl);
    
    socket.onmessage = (event) => {
      try {
        const pt = JSON.parse(event.data);
        setTrackingData(prev => {
          if (!prev) return null;
          const isDuplicate = prev.tracking_history.some(
            h => Math.abs(h.latitude - pt.latitude) < 0.000001 && 
                 Math.abs(h.longitude - pt.longitude) < 0.000001
          );
          if (isDuplicate) return prev;
          return {
            ...prev,
            tracking_history: [
              ...prev.tracking_history,
              {
                latitude: pt.latitude,
                longitude: pt.longitude,
                speed_kmh: pt.speed_kmh,
                status_update: 'GPS Live Update',
                timestamp: pt.timestamp
              }
            ]
          };
        });
      } catch (err) {
        console.error('Failed to parse websocket coordinates', err);
      }
    };
    
    return () => {
      socket.close();
    };
  }, [trackingData?.id]);

  // Map initialization and updates
  useEffect(() => {
    if (!trackingData || !mapContainerRef.current) return;
    
    const L = (window as any).L;
    if (!L) {
      console.error('Leaflet not loaded in public page');
      return;
    }

    const history = trackingData.tracking_history;

    // Clear old map artifacts if they exist
    if (mapInstanceRef.current) {
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
      if (polylineRef.current) {
        polylineRef.current.remove();
        polylineRef.current = null;
      }
    } else {
      // Initialize map
      mapInstanceRef.current = L.map(mapContainerRef.current, {
        zoomControl: true,
        scrollWheelZoom: false
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
      }).addTo(mapInstanceRef.current);
    }

    if (history.length === 0) {
      // Mumbai default fallback if no route telemetry exists
      mapInstanceRef.current.setView([19.0760, 72.8777], 12);
      return;
    }

    const latlngs = history.map(pt => [pt.latitude, pt.longitude]);
    
    // Draw transit polyline
    const polyline = L.polyline(latlngs, { color: '#3b82f6', weight: 5, opacity: 0.85 }).addTo(mapInstanceRef.current);
    polylineRef.current = polyline;

    // Dispatch Start Marker
    const startPt = history[0];
    const startMarker = L.circleMarker([startPt.latitude, startPt.longitude], {
      radius: 7,
      fillColor: '#10b981',
      color: '#ffffff',
      weight: 2,
      fillOpacity: 1
    }).addTo(mapInstanceRef.current).bindPopup('<b>Shipment Origin Point</b>');
    markersRef.current.push(startMarker);

    // Current Telemetry Marker
    const currentPt = history[history.length - 1];
    const currentMarker = L.marker([currentPt.latitude, currentPt.longitude]).addTo(mapInstanceRef.current)
      .bindPopup(`
        <div class="text-xs p-1">
          <p class="font-bold text-slate-800">Current Milestone</p>
          <p class="text-slate-500 mt-1">Speed: <b>${currentPt.speed_kmh} km/h</b></p>
          <p class="text-slate-400 mt-0.5">${new Date(currentPt.timestamp).toLocaleTimeString()}</p>
        </div>
      `);
    markersRef.current.push(currentMarker);

    // Fit bounds to polyline
    mapInstanceRef.current.fitBounds(polyline.getBounds(), { padding: [40, 40] });
    
    // Open last status popup
    currentMarker.openPopup();

  }, [trackingData]);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'bg-amber-100 text-amber-800 border-amber-250';
      case 'in_transit': return 'bg-blue-100 text-blue-800 border-blue-250';
      case 'delivered': return 'bg-emerald-100 text-emerald-800 border-emerald-250';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const handlePrintInvoice = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    if (!trackingData || !trackingData.invoice) return;
    const url = `${API_BASE_URL}/billing/invoices/${trackingData.invoice.id}/pdf`;
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans print:bg-white print:min-h-0">
      
      {/* Header bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 px-6 py-4 shadow-2xs flex justify-between items-center print:hidden">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-lg shadow-sm">LF</div>
          <span className="font-extrabold text-slate-900 tracking-tight text-xl">LogiFlow</span>
        </div>
        <button
          onClick={() => navigate('/login')}
          className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          Staff Sign In
        </button>
      </header>

      {/* Hero tracking search section */}
      <section className="bg-slate-900 text-white py-12 px-6 border-b border-slate-850 relative overflow-hidden print:hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-950/30 via-slate-900 to-slate-900 opacity-60 pointer-events-none" />
        <div className="max-w-3xl mx-auto text-center space-y-6 relative z-10">
          <span className="bg-blue-500/15 border border-blue-500/30 text-blue-400 text-xs font-bold uppercase px-3 py-1 rounded-full tracking-wider">
            Public Tracking Portal
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Track Your Cargo Real-Time</h1>
          <p className="text-slate-400 max-w-xl mx-auto text-sm sm:text-base">
            Enter your LogiFlow standard tracking ID (e.g. LFMH-2026-XXXXXX) below to view delivery milestones, live GPS location, and print your invoice.
          </p>

          <form onSubmit={handleSearchSubmit} className="max-w-xl mx-auto flex gap-3 mt-4">
            <div className="relative flex-grow">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Enter Tracking ID..."
                required
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-11 pr-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-500 font-mono tracking-wider font-semibold"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm px-6 py-3 rounded-lg shadow-md transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />}
              Track Shipment
            </button>
          </form>
        </div>
      </section>

      {/* Main content body */}
      <main className="flex-grow max-w-6xl w-full mx-auto p-6 space-y-8 print:p-0 print:m-0">
        
        {/* Error notification */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 text-sm rounded-xl p-4 flex items-start gap-3 shadow-2xs max-w-md mx-auto print:hidden">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-red-900">Shipment Search Failed</h4>
              <p className="mt-0.5 text-xs text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Loading Spinner */}
        {loading && (
          <div className="py-24 text-center text-slate-500 flex flex-col justify-center items-center gap-3 print:hidden">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="text-sm font-semibold">Retrieving real-time telemetry from ledger...</span>
          </div>
        )}

        {/* Tracking Details View */}
        {trackingData && !loading && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 print:block">
            
            {/* Left/Middle Columns: Details, Map, and Cargo */}
            <div className="lg:col-span-2 space-y-8 print:block">
              
              {/* Order Status Cards */}
              <div className="bg-white rounded-xl shadow-2xs border border-slate-200 p-6 space-y-6 print:border-none print:shadow-none print:p-0">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tracking Number</span>
                    <h2 className="text-xl font-bold text-slate-800 font-mono mt-0.5">{trackingData.tracking_number}</h2>
                  </div>
                  <span className={`px-3 py-1 inline-flex text-xs font-bold rounded-full border uppercase tracking-wider ${getStatusColor(trackingData.status)}`}>
                    {trackingData.status.replace('_', ' ')}
                  </span>
                </div>

                {/* Progress Workflow Timeline */}
                <div className="relative py-4 print:hidden">
                  <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-100 -translate-y-1/2 rounded-full" />
                  
                  {/* Active highlight line */}
                  <div 
                    className="absolute top-1/2 left-0 h-1 bg-blue-600 -translate-y-1/2 rounded-full transition-all duration-500" 
                    style={{
                      width: trackingData.status === 'pending' ? '0%' : 
                             trackingData.status === 'in_transit' ? '50%' : '100%'
                    }}
                  />

                  <div className="relative flex justify-between z-10">
                    {/* Step 1: Pending */}
                    <div className="text-center flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border-2 shadow-sm transition-colors ${
                        trackingData.status === 'pending' || trackingData.status === 'in_transit' || trackingData.status === 'delivered'
                          ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 text-slate-400'
                      }`}>
                        1
                      </div>
                      <span className="text-xs font-bold text-slate-800 mt-2">Ordered</span>
                    </div>

                    {/* Step 2: In Transit */}
                    <div className="text-center flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border-2 shadow-sm transition-colors ${
                        trackingData.status === 'in_transit' || trackingData.status === 'delivered'
                          ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 text-slate-400'
                      }`}>
                        2
                      </div>
                      <span className="text-xs font-bold text-slate-800 mt-2 font-semibold">In Transit</span>
                    </div>

                    {/* Step 3: Delivered */}
                    <div className="text-center flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border-2 shadow-sm transition-colors ${
                        trackingData.status === 'delivered'
                          ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-200 text-slate-400'
                      }`}>
                        3
                      </div>
                      <span className="text-xs font-bold text-slate-800 mt-2">Delivered</span>
                    </div>
                  </div>
                </div>

                {/* Core Parameters Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-100 pt-6">
                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 w-9 h-9 flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pickup Location</span>
                        <p className="text-sm font-semibold text-slate-800 mt-0.5">{trackingData.pickup_address}</p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="p-2 rounded-lg bg-blue-50 text-blue-600 w-9 h-9 flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Destination Delivery</span>
                        <p className="text-sm font-semibold text-slate-800 mt-0.5">{trackingData.delivery_address}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6">
                    <div className="flex gap-3">
                      <div className="p-2 rounded-lg bg-slate-50 text-slate-600 w-9 h-9 flex items-center justify-center flex-shrink-0">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estimated Delivery</span>
                        <p className="text-sm font-semibold text-slate-800 mt-0.5">
                          {trackingData.estimated_delivery ? new Date(trackingData.estimated_delivery).toLocaleString() : 'Pending dispatch'}
                        </p>
                      </div>
                    </div>

                    {trackingData.actual_delivery && (
                      <div className="flex gap-3">
                        <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 w-9 h-9 flex items-center justify-center flex-shrink-0">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Actual Delivery</span>
                          <p className="text-sm font-semibold text-emerald-800 mt-0.5">
                            {new Date(trackingData.actual_delivery).toLocaleString()}
                          </p>
                          {trackingData.proof_of_delivery_url && (trackingData.proof_of_delivery_url.startsWith('data:image') || trackingData.proof_of_delivery_url.startsWith('http')) && (
                            <div className="mt-2.5 p-2 bg-slate-50 border border-slate-200 rounded-lg w-fit">
                              <span className="block text-[8px] font-extrabold text-slate-400 uppercase">Captured POD Signature</span>
                              <img src={trackingData.proof_of_delivery_url} alt="POD Signature" className="h-12 mt-1 bg-white border border-slate-100 rounded" />
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Map Container Card */}
              {trackingData.tracking_history.length > 0 && (
                <div className="bg-white rounded-xl shadow-2xs border border-slate-200 overflow-hidden print:hidden">
                  <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800">Live GPS Coordinate Route</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Geographic points logged chronologically by transport vehicles.</p>
                    </div>
                  </div>
                  <div ref={mapContainerRef} className="h-96 w-full z-10" />
                </div>
              )}

              {/* Shipment Packages Table */}
              <div className="bg-white rounded-xl shadow-2xs border border-slate-200 p-6 print:border-none print:shadow-none print:p-0 print:mt-6">
                <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Package className="w-5 h-5 text-blue-500" /> Package Contents Details
                </h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-100 text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-2.5 text-left font-semibold text-slate-500">Item Description</th>
                        <th className="px-4 py-2.5 text-right font-semibold text-slate-500">Qty</th>
                        <th className="px-4 py-2.5 text-right font-semibold text-slate-500">Weight</th>
                        <th className="px-4 py-2.5 text-left font-semibold text-slate-500">Dimensions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150 text-slate-700">
                      {trackingData.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="px-4 py-2.5 font-medium text-slate-900">{item.description}</td>
                          <td className="px-4 py-2.5 text-right font-semibold">{item.quantity}</td>
                          <td className="px-4 py-2.5 text-right">{item.weight_kg ? `${item.weight_kg} kg` : 'N/A'}</td>
                          <td className="px-4 py-2.5">{item.dimensions || 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Right Column: Print Invoice Panel */}
            <div className="lg:col-span-1 print:block">
              {trackingData.invoice ? (
                <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden sticky top-24 print:border-none print:shadow-none print:static print:overflow-visible">
                  
                  {/* Top Bar for Screen */}
                  <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center print:hidden">
                    <span className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <Receipt className="w-4 h-4 text-slate-500" /> GST Tax Invoice
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={handleDownloadPDF}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-md shadow-xs transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <Download className="w-3.5 h-3.5" /> PDF
                      </button>
                      <button
                        onClick={handlePrintInvoice}
                        className="px-3 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-md shadow-xs transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <Printer className="w-3.5 h-3.5" /> Print
                      </button>
                    </div>
                  </div>

                  {/* Print Document Layout */}
                  <div className="p-6 space-y-6 text-slate-800 print:p-0 print:text-black">
                    <div className="flex justify-between items-start">
                      <div>
                        <h2 className="text-xl font-black text-blue-600 tracking-tight print:text-black">
                          {trackingData.invoice.company.name}
                        </h2>
                        <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold print:text-slate-500">Tax Invoice Receipt</span>
                      </div>
                      <div className="text-right text-xs">
                        <span className="px-2 py-0.5 text-[10px] font-bold border border-slate-350 bg-slate-50 rounded uppercase print:border-black">
                          {trackingData.invoice.status}
                        </span>
                        <p className="text-[10px] text-slate-400 mt-2">Date: {new Date(trackingData.invoice.issued_at).toLocaleDateString()}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 text-xs">
                      <div>
                        <h4 className="font-bold text-slate-400 uppercase tracking-wider mb-1">Billed By</h4>
                        <p className="font-bold text-slate-800">{trackingData.invoice.company.legal_name || trackingData.invoice.company.name}</p>
                        <p className="text-slate-500 leading-relaxed whitespace-pre-line mt-0.5">{trackingData.invoice.company.address || 'N/A'}</p>
                        {trackingData.invoice.company.gst_number && (
                          <p className="mt-1 font-semibold text-slate-700">GSTIN: {trackingData.invoice.company.gst_number}</p>
                        )}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-400 uppercase tracking-wider mb-1">Billed To</h4>
                        <p className="font-bold text-slate-800">{trackingData.customer_name}</p>
                        <p className="text-slate-500 mt-0.5">{trackingData.delivery_address}</p>
                        <p className="text-[10px] text-slate-400 mt-2">Ref: #{trackingData.id.substring(0,8)}</p>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-4 text-xs">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-slate-100 text-slate-400 font-bold">
                            <th className="text-left pb-1.5 uppercase">Service Description</th>
                            <th className="text-right pb-1.5 uppercase">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="py-2.5">
                              <p className="font-bold text-slate-800">Standard Freight Delivery</p>
                              <p className="text-[10px] text-slate-500 mt-0.5">Route: {trackingData.pickup_address} &rarr; {trackingData.delivery_address}</p>
                            </td>
                            <td className="text-right font-medium">{currencySymbol}{trackingData.invoice.subtotal.toFixed(2)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div className="flex justify-end border-t border-slate-100 pt-4 text-xs">
                      <div className="w-48 space-y-2">
                        <div className="flex justify-between text-slate-500">
                          <span>Subtotal:</span>
                          <span>{currencySymbol}{trackingData.invoice.subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-slate-500">
                          <span>GST ({trackingData.invoice.company.tax_rate}%):</span>
                          <span>{currencySymbol}{trackingData.invoice.tax_amount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm font-bold text-slate-850 border-t border-slate-100 pt-2 print:text-black">
                          <span>Total Amount:</span>
                          <span>{currencySymbol}{trackingData.invoice.total_amount.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-4 text-center text-[10px] text-slate-400 print:text-slate-500">
                      <p>For billing queries, contact {trackingData.invoice.company.support_email || 'support@logiflow.com'}</p>
                      <p className="font-semibold text-slate-500 mt-1">Thank you for shipping with LogiFlow!</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-2xs border border-slate-200 p-6 space-y-4 sticky top-24 text-center print:hidden">
                  <Clock className="w-10 h-10 text-slate-350 mx-auto" />
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">Invoice Pending Completion</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Tax invoices are automatically generated as soon as the driver uploads proof of delivery and registers the package status as delivered.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Empty State / Welcome Info */}
        {!trackingData && !loading && !error && (
          <div className="max-w-md mx-auto text-center py-20 space-y-4 print:hidden">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-2xs">
              <Truck className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Track Packages Real-Time</h3>
              <p className="text-xs text-slate-500 mt-1.5 max-w-xs mx-auto leading-relaxed">
                LogiFlow pushes GPS milestones directly to our immutable ledger. Enter a valid tracking ID in the search bar above to see route coordinates.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Footer Branding */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-400 mt-12 print:hidden">
        &copy; {new Date().getFullYear()} LogiFlow Logistics Systems. Powered by Advanced Ledger Telemetry.
      </footer>
    </div>
  );
};

export default PublicTrack;
