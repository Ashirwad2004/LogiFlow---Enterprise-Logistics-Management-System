import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../core/api';
import { ArrowLeft, Package, MapPin, Truck, CheckCircle, Clock, User, ShieldAlert, FileText, Send, Check, Loader2, AlertCircle } from 'lucide-react';

const ShipmentDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [shipment, setShipment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Fleet and Allocation state
  const [drivers, setDrivers] = useState<any[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [allocationLoading, setAllocationLoading] = useState(false);
  const [allocationError, setAllocationError] = useState('');
  const [statusLoading, setStatusLoading] = useState(false);

  // Delivery simulation state
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [qrCodeData, setQrCodeData] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Signature Pad state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const fetchShipmentAndDrivers = async () => {
    try {
      const shipResp = await api.get(`/shipments/${id}`);
      setShipment(shipResp.data);
      if (shipResp.data?.driver_id) {
        setSelectedDriverId(shipResp.data.driver_id);
      }

      // Fetch drivers list for assignment
      const driversResp = await api.get('/fleet/drivers');
      setDrivers(driversResp.data);
    } catch (error) {
      console.error('Failed to fetch details', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShipmentAndDrivers();
  }, [id]);

  useEffect(() => {
    if (showDeliveryModal && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
      }
    }
  }, [showDeliveryModal]);

  const handleAssignDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    setAllocationLoading(true);
    setAllocationError('');
    try {
      const response = await api.put(`/shipments/${id}`, {
        driver_id: selectedDriverId || null
      });
      setShipment(response.data);
    } catch (error: any) {
      console.error('Failed to allocate driver', error);
      setAllocationError(error.response?.data?.detail || 'Failed to assign driver.');
    } finally {
      setAllocationLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string, extraData = {}) => {
    setStatusLoading(true);
    setErrorMessage('');
    try {
      const response = await api.put(`/shipments/${id}`, {
        status: newStatus,
        ...extraData
      });
      setShipment(response.data);
      setShowDeliveryModal(false);
    } catch (error: any) {
      console.error('Failed to update status', error);
      const detail = error.response?.data?.detail || 'Failed to update status. Verify inputs.';
      setErrorMessage(detail);
    } finally {
      setStatusLoading(false);
    }
  };

  const submitDelivery = () => {
    const canvas = canvasRef.current;
    const signatureUrl = canvas ? canvas.toDataURL('image/png') : 'http://example.com/sig.png';
    
    handleUpdateStatus('delivered', {
      proof_of_delivery_url: signatureUrl,
      qr_code_data: qrCodeData,
      actual_delivery: new Date().toISOString()
    });
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading details...</div>;
  }

  if (!shipment) {
    return <div className="p-8 text-center text-red-500">Shipment not found.</div>;
  }

  const getStatusColor = (status: string) => {
    switch(status.toLowerCase()) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-250';
      case 'in_transit': return 'bg-blue-100 text-blue-800 border-blue-250';
      case 'delivered': return 'bg-green-100 text-green-800 border-green-250';
      default: return 'bg-slate-100 text-slate-800 border-slate-250';
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/shipments" className="p-2 hover:bg-slate-100 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Shipment {shipment.tracking_number}</h1>
          <p className="text-sm text-slate-500 mt-1">Created on {new Date(shipment.created_at).toLocaleDateString()}</p>
        </div>
        <div className="ml-auto">
          <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${getStatusColor(shipment.status)}`}>
            {shipment.status.replace('_', ' ').toUpperCase()}
          </span>
        </div>
      </div>

      {/* Info Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Customer Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-800 flex items-center mb-4">
              <User className="w-5 h-5 mr-2 text-blue-500" /> Customer
            </h2>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Client Name</p>
                <p className="text-slate-900 mt-1 font-semibold text-sm">{shipment.customer_name || 'N/A'}</p>
              </div>
              <div className="pt-3 border-t border-slate-100">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Customer ID</p>
                <p className="text-slate-500 mt-1 text-[10px] font-mono break-all">{shipment.customer_id}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Destination Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-800 flex items-center mb-4">
              <MapPin className="w-5 h-5 mr-2 text-blue-500" /> Destination
            </h2>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Pickup</p>
                <p className="text-slate-900 mt-1 text-sm">{shipment.pickup_address}</p>
              </div>
              <div className="pt-3 border-t border-slate-100">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Delivery</p>
                <p className="text-slate-900 mt-1 text-sm">{shipment.delivery_address}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Logistics Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-800 flex items-center mb-4">
              <Truck className="w-5 h-5 mr-2 text-blue-500" /> Logistics
            </h2>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Driver Assignment</p>
                <p className="text-slate-900 mt-1 text-sm font-semibold">
                  {shipment.driver_name ? shipment.driver_name : "Pending Assignment"}
                </p>
              </div>
              <div className="pt-3 border-t border-slate-100">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Estimated Delivery</p>
                <p className="text-slate-900 mt-1 text-sm flex items-center">
                  <Clock className="w-4 h-4 mr-1 text-slate-400" />
                  {shipment.estimated_delivery ? new Date(shipment.estimated_delivery).toLocaleString() : 'Not scheduled'}
                </p>
              </div>
              {shipment.qr_code_data && (
                <div className="pt-3 border-t border-slate-100 flex flex-col items-center">
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider self-start mb-2">Package QR Barcode</p>
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(shipment.qr_code_data)}`}
                      alt="Shipment QR Code"
                      className="w-24 h-24"
                    />
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 mt-1">{shipment.qr_code_data}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Control Center Panel */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">Operations Control Center</h2>
          <p className="text-xs text-slate-500">Allocate fleet resources and manage shipment tracking milestones.</p>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 divide-y md:divide-y-0 md:divide-x divide-slate-100">
          {/* Dispatcher Driver Allocation Panel */}
          <div className="space-y-4 pr-0 md:pr-6">
            <h3 className="text-sm font-bold text-slate-700 flex items-center">
              <User className="w-4.5 h-4.5 mr-2 text-slate-400" /> Dispatcher Panel (Driver Allocation)
            </h3>
            {shipment.status === 'delivered' ? (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-lg p-4 flex items-center">
                <Check className="w-5 h-5 mr-2" />
                <span>Cargo delivered successfully. Assignment is now locked.</span>
              </div>
            ) : (
              <form onSubmit={handleAssignDriver} className="space-y-3">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Available Drivers</label>
                <div className="flex gap-3">
                  <select
                    value={selectedDriverId}
                    onChange={(e) => setSelectedDriverId(e.target.value)}
                    className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">-- Select Driver --</option>
                    {drivers.map((drv) => (
                      <option key={drv.id} value={drv.id}>
                        {drv.full_name || `Driver ID: ${drv.id.substring(0, 8)}`} ({drv.status})
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    disabled={allocationLoading}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg transition-colors inline-flex items-center whitespace-nowrap disabled:opacity-70"
                  >
                    {allocationLoading && <Loader2 className="animate-spin -ml-1 mr-1.5 h-4 w-4" />}
                    Assign
                  </button>
                </div>
                {allocationError && (
                  <p className="text-xs text-rose-600 mt-2 flex items-center">
                    <AlertCircle className="w-3.5 h-3.5 mr-1" />
                    {allocationError}
                  </p>
                )}
              </form>
            )}
          </div>

          {/* Driver Workflow Status Updates Panel */}
          <div className="space-y-4 pt-6 md:pt-0 pl-0 md:pl-6 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-700 flex items-center mb-3">
                <Truck className="w-4.5 h-4.5 mr-2 text-slate-400" /> Driver Actions (Simulation)
              </h3>
              
              {!shipment.driver_id ? (
                <div className="bg-yellow-50 border border-yellow-250 text-yellow-800 text-sm rounded-lg p-4 flex items-start">
                  <ShieldAlert className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Please allocate a driver first to enable transit and delivery actions.</span>
                </div>
              ) : shipment.status === 'pending' ? (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500">The cargo is currently in the warehouse. Mark as departed once transit begins.</p>
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus('in_transit')}
                    disabled={statusLoading}
                    className="w-full inline-flex justify-center items-center py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg transition-colors"
                  >
                    {statusLoading ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : <Truck className="mr-2 h-5 w-5" />}
                    Start Transit (Depart Warehouse)
                  </button>
                </div>
              ) : shipment.status === 'in_transit' ? (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500">Cargo is in transit. Perform QR barcode check and sign to complete delivery.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setQrCodeData('');
                      setErrorMessage('');
                      setShowDeliveryModal(true);
                    }}
                    className="w-full inline-flex justify-center items-center py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-lg transition-colors animate-pulse"
                  >
                    <CheckCircle className="mr-2 h-5 w-5" />
                    Deliver & Upload POD (QR Scan)
                  </button>
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-150 rounded-lg p-4 space-y-3 text-emerald-800 text-sm">
                  <div className="flex items-center font-semibold">
                    <CheckCircle className="h-5 w-5 text-emerald-500 mr-2" />
                    <span>Shipment Completed</span>
                  </div>
                  <div className="text-xs text-emerald-600">
                    Proof of Delivery signature and QR checks are verified. GST Billing invoice was automatically generated.
                  </div>
                  {shipment.proof_of_delivery_url && (shipment.proof_of_delivery_url.startsWith('data:image') || shipment.proof_of_delivery_url.startsWith('http')) && (
                    <div className="pt-2">
                      <p className="text-2xs font-semibold text-slate-500 uppercase">Captured POD Signature</p>
                      <img src={shipment.proof_of_delivery_url} alt="POD Signature" className="h-16 border border-slate-200 rounded mt-1 bg-white" />
                    </div>
                  )}
                  <Link
                    to="/billing"
                    className="inline-flex items-center text-xs font-bold text-emerald-700 hover:text-emerald-900 transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5 mr-1" /> View Invoice
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Cargo Items Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-base font-semibold text-slate-800 flex items-center mb-4">
          <Package className="w-5 h-5 mr-2 text-blue-500" /> Cargo Package Items
        </h2>
        {shipment.items && shipment.items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Quantity</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Weight (KG)</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Dimensions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200 text-sm text-slate-700">
                {shipment.items.map((item: any) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-900">{item.description}</td>
                    <td className="px-4 py-3">{item.quantity}</td>
                    <td className="px-4 py-3">{item.weight_kg ? `${item.weight_kg} kg` : 'N/A'}</td>
                    <td className="px-4 py-3">{item.dimensions || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-slate-500 text-center py-6">No cargo items registered for this shipment.</p>
        )}
      </div>

      {/* Driver Simulation Modal */}
      {showDeliveryModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-scale-in">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-slate-900">Cargo Delivery Check</h3>
              <button 
                type="button"
                onClick={() => setShowDeliveryModal(false)}
                className="text-slate-400 hover:text-slate-650 text-xl font-bold transition-all cursor-pointer"
              >
                &times;
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
                Simulating driver verification checks (QR scan of package + signature capture).
              </div>

              {errorMessage && (
                <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-xs text-rose-800 flex items-start">
                  <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5 text-rose-600" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Scanned QR Code Data</label>
                  <button
                    type="button"
                    onClick={() => setQrCodeData(shipment.qr_code_data || '')}
                    className="text-2xs font-extrabold text-blue-600 hover:underline hover:text-blue-800"
                  >
                    [Simulate Barcode Scan]
                  </button>
                </div>
                <input
                  type="text"
                  required
                  placeholder="Enter or scan package QR Code..."
                  value={qrCodeData}
                  onChange={(e) => setQrCodeData(e.target.value)}
                  className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 font-mono"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Proof of Delivery Signature</label>
                  <button
                    type="button"
                    onClick={clearCanvas}
                    className="text-2xs font-extrabold text-slate-500 hover:underline hover:text-slate-800"
                  >
                    Clear
                  </button>
                </div>
                <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                  <canvas
                    ref={canvasRef}
                    width={350}
                    height={120}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    className="w-full h-[120px] cursor-crosshair block bg-white"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Use your cursor to sign inside the canvas box.</p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowDeliveryModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitDelivery}
                  disabled={statusLoading || !qrCodeData}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors inline-flex items-center disabled:opacity-50"
                >
                  {statusLoading && <Loader2 className="animate-spin -ml-1 mr-1.5 h-4 w-4" />}
                  Confirm Delivery
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShipmentDetails;
