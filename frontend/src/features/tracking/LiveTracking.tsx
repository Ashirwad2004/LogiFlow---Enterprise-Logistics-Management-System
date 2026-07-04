import React, { useState, useEffect, useRef } from 'react';
import api from '../../core/api';
import { MapPin, Navigation, Send, Loader2, Play, Square, Info } from 'lucide-react';

interface Shipment {
  id: string;
  tracking_number: string;
  status: string;
  pickup_address: string;
  delivery_address: string;
  customer_name?: string;
  driver_name?: string;
}

interface TrackingPoint {
  id: string;
  latitude: number;
  longitude: number;
  speed_kmh: number;
  timestamp: string;
}

const LiveTracking: React.FC = () => {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [selectedShipmentId, setSelectedShipmentId] = useState('');
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  
  // Coordinate history
  const [history, setHistory] = useState<TrackingPoint[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Simulation controls state
  const [simLat, setSimLat] = useState('19.08956');
  const [simLng, setSimLng] = useState('72.86561');
  const [simSpeed, setSimSpeed] = useState('45');
  const [pushing, setPushing] = useState(false);
  const [autoSimActive, setAutoSimActive] = useState(false);

  // Leaflet loading state
  const [leafletLoaded, setLeafletLoaded] = useState(false);

  // Leaflet map refs
  const mapRef = useRef<any>(null);
  const pathLineRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const autoSimIntervalRef = useRef<any>(null);

  // 1. Inject Leaflet CDN links dynamically
  useEffect(() => {
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    if (!(window as any).L) {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.async = true;
      script.onload = () => setLeafletLoaded(true);
      document.body.appendChild(script);
    } else {
      setLeafletLoaded(true);
    }

    // Cleanup interval on unmount
    return () => {
      if (autoSimIntervalRef.current) clearInterval(autoSimIntervalRef.current);
    };
  }, []);

  // 2. Fetch shipments on mount
  useEffect(() => {
    const fetchShipments = async () => {
      try {
        const response = await api.get('/shipments');
        // Filter or display all active/in_transit ones first, fallback to all
        setShipments(response.data.items || []);
      } catch (error) {
        console.error('Failed to fetch shipments', error);
      }
    };
    fetchShipments();
  }, []);

  // 3. Initialize Leaflet Map
  useEffect(() => {
    if (!leafletLoaded) return;
    if (mapRef.current) return; // Avoid double init

    const L = (window as any).L;
    // Default map centered on Mumbai
    const map = L.map('live-map').setView([19.0760, 72.8777], 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    mapRef.current = map;
  }, [leafletLoaded]);

  // 4. Fetch tracking history when shipment selection changes
  const fetchTrackingHistory = async (shipmentId: string) => {
    if (!shipmentId) {
      setHistory([]);
      return;
    }
    setLoadingHistory(true);
    try {
      const response = await api.get(`/tracking/${shipmentId}`);
      setHistory(response.data);
      
      // If there's history, set the next simulation point slightly ahead of the last point
      if (response.data.length > 0) {
        const lastPt = response.data[response.data.length - 1];
        setSimLat((lastPt.latitude + (Math.random() - 0.2) * 0.005).toFixed(6));
        setSimLng((lastPt.longitude + (Math.random() - 0.2) * 0.005).toFixed(6));
      } else {
        // Set default near Mumbai Airport
        setSimLat((19.08956 + (Math.random() - 0.5) * 0.02).toFixed(6));
        setSimLng((72.86561 + (Math.random() - 0.5) * 0.02).toFixed(6));
      }
    } catch (error) {
      console.error('Failed to fetch tracking history', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (selectedShipmentId) {
      const selected = shipments.find(s => s.id === selectedShipmentId) || null;
      setSelectedShipment(selected);
      fetchTrackingHistory(selectedShipmentId);
    } else {
      setSelectedShipment(null);
      setHistory([]);
    }
  }, [selectedShipmentId, shipments]);

  // 5. WebSocket stream for updates
  useEffect(() => {
    if (!selectedShipmentId) return;
    
    const baseURL = api.defaults.baseURL || 'http://127.0.0.1:8000/api/v1';
    const wsBase = baseURL.replace(/^http/, 'ws');
    const wsUrl = `${wsBase}/tracking/ws/${selectedShipmentId}`;
    const socket = new WebSocket(wsUrl);
    
    socket.onmessage = (event) => {
      try {
        const pt = JSON.parse(event.data);
        setHistory(prev => {
          const isDuplicate = prev.some(
            h => Math.abs(h.latitude - pt.latitude) < 0.000001 && 
                 Math.abs(h.longitude - pt.longitude) < 0.000001
          );
          if (isDuplicate) return prev;
          return [
            ...prev,
            {
              id: Math.random().toString(),
              latitude: pt.latitude,
              longitude: pt.longitude,
              speed_kmh: pt.speed_kmh,
              timestamp: pt.timestamp
            }
          ];
        });
      } catch (err) {
        console.error('Failed to parse websocket coordinates', err);
      }
    };
    
    return () => {
      socket.close();
    };
  }, [selectedShipmentId]);

  // 6. Draw path and markers on Map
  useEffect(() => {
    if (!mapRef.current) return;
    const L = (window as any).L;

    // Clear old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    if (pathLineRef.current) {
      pathLineRef.current.remove();
      pathLineRef.current = null;
    }

    if (history.length === 0) {
      // Map reset to default Mumbai if no tracking points
      mapRef.current.setView([19.0760, 72.8777], 11);
      return;
    }

    const latlngs = history.map(pt => [pt.latitude, pt.longitude]);
    
    // Draw polyline route
    const polyline = L.polyline(latlngs, { color: '#2563eb', weight: 5, opacity: 0.85 }).addTo(mapRef.current);
    pathLineRef.current = polyline;

    // Start point marker
    const startPt = history[0];
    const startMarker = L.circleMarker([startPt.latitude, startPt.longitude], {
      radius: 8,
      fillColor: '#10b981',
      color: '#ffffff',
      weight: 2,
      fillOpacity: 1
    }).addTo(mapRef.current).bindPopup('<b>Pickup Dispatch Point</b>');
    markersRef.current.push(startMarker);

    // Current location marker (truck/arrow style indicator)
    const currentPt = history[history.length - 1];
    const currentMarker = L.marker([currentPt.latitude, currentPt.longitude]).addTo(mapRef.current)
      .bindPopup(`
        <div class="text-xs p-1">
          <p class="font-bold text-slate-800">Milestone Location</p>
          <p class="text-slate-500 mt-1">Speed: <b>${currentPt.speed_kmh} km/h</b></p>
          <p class="text-slate-400 mt-0.5">${new Date(currentPt.timestamp).toLocaleTimeString()}</p>
        </div>
      `)
      .openPopup();
    markersRef.current.push(currentMarker);

    // Zoom fit bounds
    mapRef.current.fitBounds(polyline.getBounds(), { padding: [50, 50] });
  }, [history]);

  // 7. Manual GPS Push
  const handlePushCoordinate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedShipmentId) return;

    setPushing(true);
    try {
      await api.post('/tracking/coordinates', {
        shipment_id: selectedShipmentId,
        latitude: parseFloat(simLat),
        longitude: parseFloat(simLng),
        speed_kmh: parseFloat(simSpeed)
      });
      
      // Instantly refresh history
      await fetchTrackingHistory(selectedShipmentId);
    } catch (error) {
      console.error('Failed to push coordinate', error);
    } finally {
      setPushing(false);
    }
  };

  // 8. Auto Transit Simulation
  const toggleAutoSimulation = () => {
    if (autoSimActive) {
      if (autoSimIntervalRef.current) clearInterval(autoSimIntervalRef.current);
      setAutoSimActive(false);
    } else {
      setAutoSimActive(true);
      // Run once immediately
      runSimulationStep();
      // Then trigger every 3s
      autoSimIntervalRef.current = setInterval(() => {
        runSimulationStep();
      }, 3000);
    }
  };

  const runSimulationStep = async () => {
    // Generate next mock coordinate moving northeast slightly
    setSimLat(prev => {
      const nextLat = parseFloat(prev) + 0.002 + (Math.random() - 0.3) * 0.0005;
      setSimLng(prevLng => {
        const nextLng = parseFloat(prevLng) + 0.0035 + (Math.random() - 0.3) * 0.0005;
        
        // Push the update API call
        api.post('/tracking/coordinates', {
          shipment_id: selectedShipmentId,
          latitude: nextLat,
          longitude: nextLng,
          speed_kmh: parseFloat(simSpeed)
        }).then(() => {
          // Trigger history reload
          fetchTrackingHistory(selectedShipmentId);
        });

        return nextLng.toFixed(6);
      });
      return nextLat.toFixed(6);
    });
  };

  // Stop simulation if selected shipment changes
  useEffect(() => {
    if (autoSimActive) {
      if (autoSimIntervalRef.current) clearInterval(autoSimIntervalRef.current);
      setAutoSimActive(false);
    }
  }, [selectedShipmentId]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Real-Time GPS Tracking</h1>
        <p className="text-sm text-slate-500 mt-1">Monitor shipments in transit and simulate live coordinate telemetry.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Shipment selector & controls */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Select Shipment</h3>
            
            <div>
              <select
                value={selectedShipmentId}
                onChange={(e) => setSelectedShipmentId(e.target.value)}
                className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">-- Active Shipments --</option>
                {shipments.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.tracking_number} ({s.status.replace('_', ' ').toUpperCase()})
                  </option>
                ))}
              </select>
            </div>

            {selectedShipment && (
              <div className="bg-slate-50 rounded-lg p-4 space-y-3 text-sm text-slate-700">
                <div className="flex items-center text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  <Info className="w-4 h-4 mr-1 text-slate-500" /> Details
                </div>
                <div>
                  <span className="text-xs text-slate-400">Client:</span>
                  <p className="font-semibold text-slate-800">{selectedShipment.customer_name || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-xs text-slate-400">Driver Assigned:</span>
                  <p className="font-semibold text-slate-800">{selectedShipment.driver_name || 'Unassigned'}</p>
                </div>
                <div>
                  <span className="text-xs text-slate-400">Pickup:</span>
                  <p className="text-slate-600 truncate">{selectedShipment.pickup_address}</p>
                </div>
                <div>
                  <span className="text-xs text-slate-400">Dropoff:</span>
                  <p className="text-slate-600 truncate">{selectedShipment.delivery_address}</p>
                </div>
              </div>
            )}
          </div>

          {selectedShipment && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Coordinates Simulator</h3>
              
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={toggleAutoSimulation}
                  className={`w-full py-2 px-3 text-xs font-bold rounded-lg text-white transition-colors flex items-center justify-center gap-1 ${
                    autoSimActive 
                      ? 'bg-red-600 hover:bg-red-700' 
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  {autoSimActive ? (
                    <>
                      <Square className="w-3.5 h-3.5" /> Stop Simulation
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" /> Auto Drive Simulation
                    </>
                  )}
                </button>
              </div>

              <form onSubmit={handlePushCoordinate} className="space-y-4 pt-2 border-t border-slate-100">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Lat</label>
                    <input
                      type="number"
                      step="0.000001"
                      required
                      value={simLat}
                      onChange={(e) => setSimLat(e.target.value)}
                      className="mt-1 block w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Lng</label>
                    <input
                      type="number"
                      step="0.000001"
                      required
                      value={simLng}
                      onChange={(e) => setSimLng(e.target.value)}
                      className="mt-1 block w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Speed (km/h)</label>
                  <input
                    type="number"
                    required
                    value={simSpeed}
                    onChange={(e) => setSimSpeed(e.target.value)}
                    className="mt-1 block w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={pushing || autoSimActive}
                  className="w-full inline-flex justify-center items-center py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg transition-colors disabled:opacity-50"
                >
                  {pushing ? (
                    <>
                      <Loader2 className="animate-spin -ml-1 mr-1.5 h-3.5 w-3.5" /> Pushing...
                    </>
                  ) : (
                    <>
                      <Send className="-ml-1 mr-1.5 h-3.5 w-3.5" /> Push Telemetry Step
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Right Column: Live Map view */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-base font-bold text-slate-800">Map Interface</h3>
                <p className="text-xs text-slate-500">Route path history plotted via Leaflet OpenStreetMap.</p>
              </div>
              {loadingHistory && (
                <div className="flex items-center space-x-1.5 text-xs text-slate-500">
                  <Loader2 className="animate-spin h-3.5 w-3.5 text-blue-600" />
                  <span>Loading history...</span>
                </div>
              )}
            </div>
            
            {/* Real map container element */}
            <div className="relative">
              {!leafletLoaded && (
                <div className="absolute inset-0 bg-slate-100 flex items-center justify-center z-10">
                  <div className="text-center text-slate-500 flex flex-col items-center">
                    <Loader2 className="animate-spin h-8 w-8 text-blue-600 mb-2" />
                    <span>Loading maps library...</span>
                  </div>
                </div>
              )}
              
              <div 
                id="live-map" 
                className="h-[500px] w-full"
                style={{ zIndex: 0 }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveTracking;
