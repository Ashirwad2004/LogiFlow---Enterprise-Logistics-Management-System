import React, { useState, useEffect } from 'react';
import api from '../../core/api';
import { Truck, Plus, Loader2, Gauge, ShieldAlert, CheckCircle2, ChevronDown, ChevronUp, Calendar, Wrench, DollarSign, PlusCircle } from 'lucide-react';

interface MaintenanceLog {
  id: string;
  description: string;
  cost: number;
  performed_at: string;
  next_due: string | null;
  created_at: string;
}

interface Vehicle {
  id: string;
  registration_number: string;
  model: string;
  type: string;
  capacity_kg: number;
  status: string;
  insurance_expiry: string | null;
  maintenance_logs: MaintenanceLog[];
}

const VehiclesList: React.FC = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedVehicleId, setExpandedVehicleId] = useState<string | null>(null);

  // Onboard Vehicle form state
  const [showAddModal, setShowAddModal] = useState(false);
  const [regNum, setRegNum] = useState('');
  const [model, setModel] = useState('');
  const [type, setType] = useState('box_truck');
  const [capacity, setCapacity] = useState('5000');
  const [insuranceExpiry, setInsuranceExpiry] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Log Maintenance form state
  const [logDesc, setLogDesc] = useState('');
  const [logCost, setLogCost] = useState('');
  const [logPerformedAt, setLogPerformedAt] = useState('');
  const [logNextDue, setLogNextDue] = useState('');
  const [logVehicleStatus, setLogVehicleStatus] = useState('maintenance');
  const [logSubmitting, setLogSubmitting] = useState(false);
  const [logError, setLogError] = useState('');

  const fetchVehicles = async () => {
    try {
      const response = await api.get('/fleet/vehicles');
      setVehicles(response.data);
    } catch (error) {
      console.error('Failed to fetch vehicles', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccessMsg('');
    try {
      const response = await api.post('/fleet/vehicles', {
        registration_number: regNum,
        model,
        type,
        capacity_kg: parseFloat(capacity),
        insurance_expiry: insuranceExpiry || null,
        status: 'active'
      });
      setVehicles(prev => [...prev, { ...response.data, maintenance_logs: [] }]);
      setSuccessMsg('Vehicle registered successfully!');
      setTimeout(() => {
        setShowAddModal(false);
        setSuccessMsg('');
        setRegNum('');
        setModel('');
        setInsuranceExpiry('');
        setCapacity('5000');
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to register vehicle.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogMaintenance = async (vehicleId: string) => {
    if (!logDesc || !logCost || !logPerformedAt) {
      setLogError('Please fill in description, cost, and performed date.');
      return;
    }

    setLogSubmitting(true);
    setLogError('');
    try {
      const response = await api.post(`/fleet/vehicles/${vehicleId}/maintenance`, {
        description: logDesc,
        cost: parseFloat(logCost),
        performed_at: logPerformedAt,
        next_due: logNextDue || null,
        vehicle_status: logVehicleStatus
      });

      // Update vehicle in local state
      setVehicles(prev => prev.map(v => {
        if (v.id === vehicleId) {
          return {
            ...v,
            status: logVehicleStatus,
            maintenance_logs: [response.data, ...(v.maintenance_logs || [])]
          };
        }
        return v;
      }));

      // Reset form
      setLogDesc('');
      setLogCost('');
      setLogPerformedAt('');
      setLogNextDue('');
      setLogVehicleStatus('maintenance');
    } catch (err: any) {
      setLogError(err.response?.data?.detail || 'Failed to record maintenance.');
    } finally {
      setLogSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'maintenance': return 'bg-yellow-100 text-yellow-800 border-yellow-250';
      case 'inactive': return 'bg-slate-100 text-slate-800 border-slate-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getInsuranceBadge = (expiryStr: string | null) => {
    if (!expiryStr) return <span className="px-2 py-0.5 rounded text-2xs font-extrabold bg-slate-100 text-slate-600 border border-slate-200">NO INSURANCE</span>;
    const expiryDate = new Date(expiryStr);
    const today = new Date();
    const diffTime = expiryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return (
        <span className="px-2 py-0.5 rounded text-2xs font-extrabold bg-rose-100 text-rose-800 border border-rose-200" title={`Expired on ${expiryDate.toLocaleDateString()}`}>
          EXPIRED
        </span>
      );
    } else if (diffDays <= 30) {
      return (
        <span className="px-2 py-0.5 rounded text-2xs font-extrabold bg-amber-100 text-amber-800 border border-amber-250" title={`Expiring on ${expiryDate.toLocaleDateString()} (${diffDays} days left)`}>
          EXPIRING SOON
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-2xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200" title={`Active until ${expiryDate.toLocaleDateString()}`}>
        ACTIVE
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Vehicles Fleet</h1>
          <p className="text-sm text-slate-500 mt-1">Manage company logistics vehicles, active fleet capacity, and maintenance statuses.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg shadow-sm transition-colors cursor-pointer"
        >
          <Plus className="w-5 h-5 mr-1.5" />
          Add Vehicle
        </button>
      </div>

      <div className="bg-white shadow-sm border border-slate-200 rounded-xl overflow-hidden animate-fade-in">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 font-semibold text-slate-500 uppercase tracking-wider text-xs border-b border-slate-200">
              <tr>
                <th scope="col" className="px-6 py-3.5 text-left">Registration #</th>
                <th scope="col" className="px-6 py-3.5 text-left">Model & Classification</th>
                <th scope="col" className="px-6 py-3.5 text-left">Weight Capacity</th>
                <th scope="col" className="px-6 py-3.5 text-left">Insurance Expiry</th>
                <th scope="col" className="px-6 py-3.5 text-left">Status</th>
                <th scope="col" className="relative px-6 py-3.5"><span className="sr-only">Expand</span></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-500">
                    <div className="flex justify-center items-center space-x-2">
                      <Loader2 className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      <span>Loading fleet data...</span>
                    </div>
                  </td>
                </tr>
              ) : vehicles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center py-6">
                      <Truck className="w-12 h-12 text-slate-300 mb-3" />
                      <p className="font-semibold text-slate-800">No vehicles registered.</p>
                      <p className="text-xs text-slate-400 mt-1">Onboard trucks and vans to allocate driver assignments.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                vehicles.map(vehicle => {
                  const isExpanded = expandedVehicleId === vehicle.id;
                  return (
                    <React.Fragment key={vehicle.id}>
                      <tr 
                        onClick={() => setExpandedVehicleId(isExpanded ? null : vehicle.id)}
                        className={`hover:bg-slate-50/50 transition-colors cursor-pointer ${isExpanded ? 'bg-slate-50/30 font-medium' : ''}`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap font-mono font-bold text-slate-900">
                          {vehicle.registration_number}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-semibold text-slate-850">{vehicle.model}</div>
                          <div className="text-xs text-slate-450 mt-0.5 capitalize">{vehicle.type.replace('_', ' ')}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-slate-900 font-medium">
                            <Gauge className="w-4 h-4 text-slate-400 mr-1.5" />
                            {vehicle.capacity_kg.toLocaleString()} kg
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            {getInsuranceBadge(vehicle.insurance_expiry)}
                            {vehicle.insurance_expiry && (
                              <span className="text-xs text-slate-500 font-mono">
                                {new Date(vehicle.insurance_expiry).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${getStatusColor(vehicle.status)}`}>
                            {vehicle.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button type="button" className="p-1 hover:bg-slate-100 rounded-md text-slate-400">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-slate-50/50">
                          <td colSpan={6} className="px-6 py-6 border-t border-slate-150">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                              {/* Maintenance Log List */}
                              <div className="lg:col-span-2 space-y-4">
                                <h4 className="text-sm font-bold text-slate-800 flex items-center mb-3">
                                  <Wrench className="w-4 h-4 mr-2 text-slate-400" />
                                  Maintenance History Log
                                </h4>
                                
                                {vehicle.maintenance_logs && vehicle.maintenance_logs.length > 0 ? (
                                  <div className="relative border-l border-slate-200 pl-4 ml-2 space-y-5 max-h-72 overflow-y-auto pr-2">
                                    {vehicle.maintenance_logs.map((log) => (
                                      <div key={log.id} className="relative">
                                        <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 bg-blue-500 rounded-full border-2 border-white ring-2 ring-blue-100"></div>
                                        <div className="flex justify-between items-start">
                                          <div>
                                            <p className="text-xs font-bold text-slate-800">{log.description}</p>
                                            <p className="text-2xs text-slate-500 mt-0.5 flex items-center">
                                              <Calendar className="w-3 h-3 mr-1" />
                                              Performed on {new Date(log.performed_at).toLocaleDateString()}
                                              {log.next_due && ` | Next Due: ${new Date(log.next_due).toLocaleDateString()}`}
                                            </p>
                                          </div>
                                          <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                                            ${log.cost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-xs text-slate-400 italic py-4">No maintenance actions logged for this vehicle.</p>
                                )}
                              </div>

                              {/* Add Log Form */}
                              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-4 h-fit">
                                <h4 className="text-xs font-bold text-slate-800 flex items-center uppercase tracking-wider">
                                  <PlusCircle className="w-4.5 h-4.5 mr-1.5 text-blue-600" />
                                  Log Maintenance Event
                                </h4>
                                
                                {logError && <p className="text-[11px] text-red-650">{logError}</p>}
                                
                                <div className="space-y-3">
                                  <div>
                                    <label className="block text-[10px] font-semibold text-slate-500 uppercase">Service Description</label>
                                    <input
                                      type="text"
                                      placeholder="e.g. Engine Tune-up, Oil Change"
                                      value={logDesc}
                                      onChange={(e) => setLogDesc(e.target.value)}
                                      className="mt-1 block w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-blue-500"
                                    />
                                  </div>

                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <label className="block text-[10px] font-semibold text-slate-500 uppercase">Cost (USD)</label>
                                      <input
                                        type="number"
                                        placeholder="0.00"
                                        value={logCost}
                                        onChange={(e) => setLogCost(e.target.value)}
                                        className="mt-1 block w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-blue-500"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[10px] font-semibold text-slate-500 uppercase">Performed Date</label>
                                      <input
                                        type="date"
                                        value={logPerformedAt}
                                        onChange={(e) => setLogPerformedAt(e.target.value)}
                                        className="mt-1 block w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none"
                                      />
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <label className="block text-[10px] font-semibold text-slate-500 uppercase">Next Service Due</label>
                                      <input
                                        type="date"
                                        value={logNextDue}
                                        onChange={(e) => setLogNextDue(e.target.value)}
                                        className="mt-1 block w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[10px] font-semibold text-slate-500 uppercase">Vehicle Status</label>
                                      <select
                                        value={logVehicleStatus}
                                        onChange={(e) => setLogVehicleStatus(e.target.value)}
                                        className="mt-1 block w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none"
                                      >
                                        <option value="active">Active</option>
                                        <option value="maintenance">Maintenance</option>
                                        <option value="inactive">Inactive</option>
                                      </select>
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => handleLogMaintenance(vehicle.id)}
                                    disabled={logSubmitting}
                                    className="w-full inline-flex justify-center items-center py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                                  >
                                    {logSubmitting && <Loader2 className="animate-spin -ml-1 mr-1.5 h-3.5 w-3.5" />}
                                    Log Event
                                  </button>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Vehicle Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-scale-in">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800 flex items-center">
                <Truck className="w-5 h-5 mr-2 text-blue-500" /> Onboard Logistics Vehicle
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-650 text-xl font-bold cursor-pointer transition-all"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="bg-rose-50 border border-rose-200 text-rose-650 text-xs rounded-lg p-3 flex items-center">
                  <ShieldAlert className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {successMsg && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-750 text-xs rounded-lg p-3 flex items-center">
                  <CheckCircle2 className="w-4 h-4 mr-2 flex-shrink-0 animate-bounce" />
                  <span>{successMsg}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Registration Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MH-12-PQ-9999"
                  value={regNum}
                  onChange={(e) => setRegNum(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Vehicle Model</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mahindra Blazo / Tata Ultra"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Classification Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-blue-500"
                  >
                    <option value="box_truck">Box Truck</option>
                    <option value="flatbed">Flatbed Truck</option>
                    <option value="refrigerated">Refrigerated</option>
                    <option value="van">Cargo Van</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Max Capacity (KG)</label>
                  <input
                    type="number"
                    required
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Insurance Expiry Date</label>
                <input
                  type="date"
                  value={insuranceExpiry}
                  onChange={(e) => setInsuranceExpiry(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-blue-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors inline-flex items-center cursor-pointer"
                >
                  {submitting && <Loader2 className="animate-spin -ml-1 mr-1.5 h-4 w-4" />}
                  Register Vehicle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VehiclesList;