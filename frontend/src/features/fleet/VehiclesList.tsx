import React, { useState, useEffect } from 'react';
import api from '../../core/api';
import { Truck, Plus, Loader2, Gauge, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface Vehicle {
  id: string;
  registration_number: string;
  model: string;
  type: string;
  capacity_kg: number;
  status: string;
}

const VehiclesList: React.FC = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [showAddModal, setShowAddModal] = useState(false);
  const [regNum, setRegNum] = useState('');
  const [model, setModel] = useState('');
  const [type, setType] = useState('box_truck');
  const [capacity, setCapacity] = useState('5000');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

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
        status: 'active'
      });
      setVehicles(prev => [...prev, response.data]);
      setSuccessMsg('Vehicle registered successfully!');
      setTimeout(() => {
        setShowAddModal(false);
        setSuccessMsg('');
        setRegNum('');
        setModel('');
        setCapacity('5000');
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to register vehicle.');
    } finally {
      setSubmitting(false);
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
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Registration #</th>
                <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Model & Classification</th>
                <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Weight Capacity</th>
                <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-slate-500">
                    <div className="flex justify-center items-center space-x-2">
                      <Loader2 className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      <span>Loading fleet data...</span>
                    </div>
                  </td>
                </tr>
              ) : vehicles.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center py-6">
                      <Truck className="w-12 h-12 text-slate-300 mb-3" />
                      <p className="font-semibold text-slate-800">No vehicles registered.</p>
                      <p className="text-xs text-slate-400 mt-1">Onboard trucks and vans to allocate driver assignments.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                vehicles.map(vehicle => (
                  <tr key={vehicle.id} className="hover:bg-slate-50/50 transition-colors">
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
                      <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${getStatusColor(vehicle.status)}`}>
                        {vehicle.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))
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
                className="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer"
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