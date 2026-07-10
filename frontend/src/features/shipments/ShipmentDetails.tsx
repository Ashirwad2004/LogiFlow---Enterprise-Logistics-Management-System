import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../core/api';
import { ArrowLeft, Package, MapPin, Truck, CheckCircle, Clock, User, ShieldAlert, FileText, Send, Check, Loader2, AlertCircle } from 'lucide-react';

const ShipmentDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [shipment, setShipment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState<any>(null);
  
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
  const [activeTab, setActiveTab] = useState<'qr' | 'pin'>('qr');
  const [pinValues, setPinValues] = useState<string[]>(Array(6).fill(''));
  const pinRefs = useRef<HTMLInputElement[]>([]);

  const handlePinChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d+$/.test(value)) return;
    
    const newValues = [...pinValues];
    newValues[index] = value;
    setPinValues(newValues);
    
    const expectedPin = shipment?.qr_code_data ? shipment.qr_code_data.split('-').slice(-1)[0] : '';
    const pinLength = expectedPin.length || 6;
    
    // Auto advance focus
    if (value && index < pinLength - 1) {
      pinRefs.current[index + 1]?.focus();
    }
    
    // Set the overall code data
    setQrCodeData(newValues.slice(0, pinLength).join(''));
  };

  const handlePinKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pinValues[index] && index > 0) {
      const newValues = [...pinValues];
      newValues[index - 1] = '';
      setPinValues(newValues);
      setQrCodeData(newValues.join(''));
      pinRefs.current[index - 1]?.focus();
    }
  };

  const simulatePinEntry = () => {
    const expectedPin = shipment.qr_code_data ? shipment.qr_code_data.split('-').slice(-1)[0] : '';
    if (expectedPin) {
      const pinChars = expectedPin.split('');
      setPinValues(pinChars);
      setQrCodeData(expectedPin);
      setTimeout(() => pinRefs.current[pinChars.length - 1]?.focus(), 50);
    }
  };

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

      // Fetch associated invoice details
      try {
        const invoicesResp = await api.get('/billing/invoices');
        const matchingInvoice = invoicesResp.data.find((inv: any) => inv.shipment_id === id);
        if (matchingInvoice) {
          setInvoice(matchingInvoice);
        }
      } catch (err) {
        console.error('Failed to load invoice for shipment details', err);
      }
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

  const getBillingStatusColor = (status: string) => {
    switch(status.toLowerCase()) {
      case 'paid': return 'bg-green-100 text-green-800 border-green-250';
      case 'partially_paid': return 'bg-blue-100 text-blue-800 border-blue-250';
      case 'unpaid': return 'bg-amber-100 text-amber-800 border-amber-250';
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
        <div className="ml-auto flex items-center gap-3">
          {shipment.invoice_status ? (
            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getBillingStatusColor(shipment.invoice_status)}`}>
              BILLING: {shipment.invoice_status.replace('_', ' ').toUpperCase()}
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full text-xs font-bold border bg-slate-100 text-slate-800 border-slate-200">
              BILLING: PENDING
            </span>
          )}
          
          <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(shipment.status)}`}>
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
                <div className="pt-3 border-t border-slate-100 flex flex-col">
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-2">Secure Handover Info</p>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-150 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold">
                      <ShieldAlert className="w-4 h-4 text-amber-500 flex-shrink-0" />
                      <span>Verification QR code is with customer.</span>
                    </div>
                    <div className="flex justify-between items-center bg-white border border-slate-100 rounded px-2.5 py-1 text-[10px] font-mono text-slate-500">
                      <span>Code: {shipment.qr_code_data}</span>
                      <span className="text-[9px] bg-slate-100 text-slate-600 px-1 py-0.5 rounded font-sans font-bold">INFO ONLY</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Billing & Financials Card */}
        {invoice && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between md:col-span-3">
            <div>
              <h2 className="text-base font-semibold text-slate-800 flex items-center mb-4">
                <FileText className="w-5 h-5 mr-2 text-blue-500" /> Billing & Payment Ledger
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Invoice Number</p>
                  <p className="text-slate-905 mt-1 font-mono font-bold text-sm">{invoice.invoice_number}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Billing Status</p>
                  <span className={`px-2.5 py-0.5 inline-flex text-[10px] leading-5 font-bold rounded-full border mt-1 uppercase ${getBillingStatusColor(invoice.status)}`}>
                    {invoice.status.replace('_', ' ')}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Total Amount</p>
                  <p className="text-slate-905 mt-1 font-extrabold text-sm">₹{parseFloat(invoice.total_amount).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Outstanding Balance</p>
                  <p className={`mt-1 font-black text-sm ${parseFloat(invoice.outstanding_balance) > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    ₹{parseFloat(invoice.outstanding_balance).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
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
                      setActiveTab('qr');
                      setPinValues(Array(6).fill(''));
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
          <style>{`
            @keyframes scanLaser {
              0% { top: 8%; }
              50% { top: 90%; }
              100% { top: 8%; }
            }
            .animate-scan-laser {
              position: absolute;
              animation: scanLaser 2.2s infinite ease-in-out;
            }
          `}</style>
          
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-scale-in">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-slate-900">Secure Delivery Verification</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Verification code check & digital signature capture</p>
              </div>
              <button 
                type="button"
                onClick={() => setShowDeliveryModal(false)}
                className="text-slate-400 hover:text-slate-650 text-xl font-bold transition-all cursor-pointer"
              >
                &times;
              </button>
            </div>
            
            <div className="p-6 space-y-5">
              {errorMessage && (
                <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-xs text-rose-800 flex items-start">
                  <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5 text-rose-600" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Verification Method Tabs */}
              <div>
                <div className="flex border-b border-slate-100 mb-4">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('qr');
                      setQrCodeData('');
                      setPinValues(Array(6).fill(''));
                    }}
                    className={`flex-1 pb-2 text-center text-xs font-bold transition-colors ${
                      activeTab === 'qr'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    Method 1: Scan QR Code
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('pin');
                      setQrCodeData('');
                      setPinValues(Array(6).fill(''));
                    }}
                    className={`flex-1 pb-2 text-center text-xs font-bold transition-colors ${
                      activeTab === 'pin'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    Method 2: Handover PIN
                  </button>
                </div>

                {/* Tab content 1: QR Barcode scan */}
                {activeTab === 'qr' && (
                  <div className="space-y-4">
                    {/* Simulated Camera Viewport */}
                    <div className="relative bg-slate-950 rounded-lg overflow-hidden h-40 flex flex-col justify-center items-center text-slate-400 font-mono text-[10px] border border-slate-800 select-none">
                      {/* Laser Line */}
                      <div className="animate-scan-laser bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.85)] h-[2.5px] left-3 right-3 rounded-full" />
                      
                      {/* Outer boundary lines */}
                      <div className="absolute top-4 left-4 w-5 h-5 border-t-2 border-l-2 border-blue-500 rounded-tl-xs" />
                      <div className="absolute top-4 right-4 w-5 h-5 border-t-2 border-r-2 border-blue-500 rounded-tr-xs" />
                      <div className="absolute bottom-4 left-4 w-5 h-5 border-b-2 border-l-2 border-blue-500 rounded-bl-xs" />
                      <div className="absolute bottom-4 right-4 w-5 h-5 border-b-2 border-r-2 border-blue-500 rounded-br-xs" />
                      
                      {qrCodeData ? (
                        <div className="z-10 flex flex-col items-center bg-slate-900/90 border border-slate-700 px-4 py-2 rounded-lg text-emerald-400 text-center space-y-1">
                          <CheckCircle className="w-6 h-6 text-emerald-400" />
                          <span className="font-bold text-[11px] tracking-wide">QR Barcode Read Success!</span>
                          <span className="text-[9px] text-slate-400 font-mono truncate max-w-[200px]">{qrCodeData}</span>
                        </div>
                      ) : (
                        <div className="z-10 text-center space-y-1">
                          <p className="font-bold tracking-wider text-slate-200">SCANNER INTERFACE READY</p>
                          <p className="text-[9px] text-slate-500">Position verification QR code inside frame</p>
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-2xs font-bold text-slate-500 uppercase tracking-wider">Scanned QR Code Data</label>
                        <button
                          type="button"
                          onClick={() => setQrCodeData(shipment.qr_code_data || '')}
                          className="text-2xs font-extrabold text-blue-600 hover:underline hover:text-blue-800 cursor-pointer"
                        >
                          [Simulate QR Scan]
                        </button>
                      </div>
                      <input
                        type="text"
                        required
                        placeholder="Enter or scan package QR Code..."
                        value={qrCodeData}
                        onChange={(e) => setQrCodeData(e.target.value)}
                        className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-blue-500 focus:border-blue-500 font-mono text-slate-700 bg-white"
                      />
                    </div>
                  </div>
                )}

                {/* Tab content 2: OTP Pin Entry */}
                {activeTab === 'pin' && (
                  <div className="space-y-4">
                    <p className="text-xs text-slate-500 text-center font-medium">
                      Type the 6-digit backup handover PIN visible on the customer's tracking screen.
                    </p>
                    
                    <div className="flex justify-center gap-2 py-2">
                      {pinValues.slice(0, shipment.qr_code_data ? shipment.qr_code_data.split('-').slice(-1)[0].length : 6).map((digit, idx) => (
                        <input
                          key={idx}
                          ref={el => { pinRefs.current[idx] = el as HTMLInputElement; }}
                          type="text"
                          pattern="\d*"
                          maxLength={1}
                          value={digit}
                          onChange={e => handlePinChange(idx, e.target.value)}
                          onKeyDown={e => handlePinKeyDown(idx, e)}
                          className="w-10 h-12 border border-slate-300 rounded-lg text-center font-mono font-bold text-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-2xs"
                        />
                      ))}
                    </div>

                    <div className="text-center">
                      <button
                        type="button"
                        onClick={simulatePinEntry}
                        className="text-2xs font-extrabold text-blue-600 hover:underline hover:text-blue-800 cursor-pointer"
                      >
                        [Simulate PIN Entry]
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Signature capture pad section */}
              <div className="border-t border-slate-100 pt-4">
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-2xs font-bold text-slate-500 uppercase tracking-wider">Proof of Delivery Signature</label>
                  <button
                    type="button"
                    onClick={clearCanvas}
                    className="text-2xs font-extrabold text-slate-500 hover:underline hover:text-slate-800 cursor-pointer"
                  >
                    Clear Canvas
                  </button>
                </div>
                <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                  <canvas
                    ref={canvasRef}
                    width={350}
                    height={110}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    className="w-full h-[110px] cursor-crosshair block bg-white"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Ask the customer to sign inside the canvas box with their finger/stylus or mouse cursor.</p>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-slate-100 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowDeliveryModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors animate-fade-in"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitDelivery}
                  disabled={statusLoading || !qrCodeData || qrCodeData.length < 4}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors inline-flex items-center cursor-pointer"
                >
                  {statusLoading && <Loader2 className="animate-spin -ml-1 mr-1.5 h-3.5 w-3.5" />}
                  Confirm Handover Delivery
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
