import React, { useState, useEffect } from 'react';
import api from '../../core/api';
import { Building, MapPin, Layers, Package, Plus, Loader2, Gauge, ShieldCheck, Check, Box } from 'lucide-react';

interface Warehouse {
  id: string;
  name: string;
  address: string;
  capacity_volume: number;
}

const WarehousesList: React.FC = () => {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);

  // New warehouse form state
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [capacityVolume, setCapacityVolume] = useState('5000');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Selected Rack details state
  const [selectedRack, setSelectedRack] = useState<string | null>(null);
  const [selectedRackOccupants, setSelectedRackOccupants] = useState<any[]>([]);

  // Mock layout configurations for Zones & Racks
  const zones = [
    { name: 'Zone A', type: 'Fast-Moving / High-Priority', color: 'border-orange-200 bg-orange-50/30 text-orange-700', fill: 82 },
    { name: 'Zone B', type: 'Cold Storage / Batteries', color: 'border-blue-200 bg-blue-50/30 text-blue-700', fill: 45 },
    { name: 'Zone C', type: 'Bulk Dry Goods / Pallets', color: 'border-green-200 bg-green-50/30 text-green-700', fill: 68 }
  ];

  // Helper to generate mock racks with deterministic layouts based on warehouse ID hash
  const getRacksForZone = (zoneName: string) => {
    const letter = zoneName.charAt(5); // 'A', 'B', 'C'
    const racks = [];
    for (let i = 1; i <= 6; i++) {
      const rackId = `${letter}${i}`;
      // Deterministic mock fill percentage based on warehouse/rack indices
      const fillPercentage = Math.floor(Math.sin(i * 37) * 40 + 55);
      const isLocked = i === 5;
      racks.push({
        id: rackId,
        fill: fillPercentage,
        itemsCount: Math.floor(fillPercentage / 8),
        weightKg: Math.floor(fillPercentage * 4.2),
        temperature: letter === 'B' ? '-18°C' : '22°C',
        status: isLocked ? 'locked' : fillPercentage > 85 ? 'full' : 'active'
      });
    }
    return racks;
  };

  const fetchWarehouses = async () => {
    try {
      const response = await api.get('/warehouses');
      setWarehouses(response.data);
      if (response.data.length > 0) {
        setSelectedWarehouseId(response.data[0].id);
      }
    } catch (error) {
      console.error('Failed to load warehouses', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWarehouses();
  }, []);

  useEffect(() => {
    if (selectedWarehouseId) {
      const wh = warehouses.find(w => w.id === selectedWarehouseId) || null;
      setSelectedWarehouse(wh);
      setSelectedRack(null);
    } else {
      setSelectedWarehouse(null);
      setSelectedRack(null);
    }
  }, [selectedWarehouseId, warehouses]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const response = await api.post('/warehouses', {
        name,
        address,
        capacity_volume: parseFloat(capacityVolume)
      });
      setWarehouses(prev => [...prev, response.data]);
      setSelectedWarehouseId(response.data.id);
      setShowAddModal(false);
      setName('');
      setAddress('');
      setCapacityVolume('5000');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create warehouse.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRackClick = (rack: any) => {
    setSelectedRack(rack.id);
    
    // Simulate fetching packages currently allocated to this rack
    const mockPackages = [
      { tracking: 'LF-2026-9812', desc: 'Premium Electronics', qty: 2, weight: '15.6 kg', status: 'In Stock' },
      { tracking: 'LF-2026-0045', desc: 'Industrial Lithium Batteries', qty: 10, weight: '25.0 kg', status: 'Allocated Outbound' },
    ];
    // Filter to only show relevant mock items
    setSelectedRackOccupants(rack.fill > 40 ? mockPackages.slice(0, rack.itemsCount % 2 + 1) : []);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Warehouse Layout & Inventory</h1>
          <p className="text-sm text-slate-500 mt-1">Configure physical branch locations, monitor storage zones, and locate racks.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg shadow-sm transition-colors cursor-pointer"
        >
          <Plus className="w-5 h-5 mr-1.5" />
          Add Warehouse
        </button>
      </div>

      {loading ? (
        <div className="p-16 text-center text-slate-500 flex justify-center items-center space-x-2 bg-white rounded-xl border border-slate-200 shadow-sm">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          <span>Loading warehouses...</span>
        </div>
      ) : warehouses.length === 0 ? (
        <div className="bg-white p-12 rounded-xl border border-slate-200 shadow-sm text-center">
          <Building className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-800">No Warehouses Registered</h3>
          <p className="text-slate-500 text-sm mt-1 max-w-sm mx-auto">Create a physical storage site to begin organizing zones, mapping racks, and storing shipment cargo.</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
          >
            <Plus className="w-5 h-5 mr-1" /> Get Started
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Column: Warehouse Branch selector list */}
          <div className="lg:col-span-1 space-y-4">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Branch List</h3>
            <div className="space-y-3">
              {warehouses.map(wh => {
                const isSelected = wh.id === selectedWarehouseId;
                return (
                  <button
                    key={wh.id}
                    onClick={() => setSelectedWarehouseId(wh.id)}
                    className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50 border-blue-200 shadow-xs'
                        : 'bg-white border-slate-200 hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-slate-800 text-sm truncate max-w-[80%]">{wh.name}</h4>
                      <Building className={`w-4 h-4 ${isSelected ? 'text-blue-500' : 'text-slate-400'}`} />
                    </div>
                    <p className="text-xs text-slate-500 mt-2 truncate flex items-center">
                      <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
                      {wh.address}
                    </p>
                    <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
                      <span>Volume Capacity:</span>
                      <span className="font-semibold text-slate-800">{wh.capacity_volume} m³</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Columns: Interactive Zone Grid Layout mapping */}
          {selectedWarehouse && (
            <div className="lg:col-span-3 space-y-6">
              {/* Warehouse Details card */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">{selectedWarehouse.name}</h3>
                  <p className="text-xs text-slate-500 mt-1 flex items-center">
                    <MapPin className="w-3.5 h-3.5 mr-1" /> {selectedWarehouse.address}
                  </p>
                </div>
                
                <div className="flex items-center space-x-3 bg-slate-55/30 px-4 py-3 rounded-lg border border-slate-100">
                  <Gauge className="w-8 h-8 text-blue-500" />
                  <div>
                    <p className="text-xs text-slate-500">Utilization Rate</p>
                    <p className="text-sm font-bold text-slate-800">65% <span className="text-xs text-slate-400 font-normal">of {selectedWarehouse.capacity_volume} m³</span></p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 bg-slate-55/30 px-4 py-3 rounded-lg border border-slate-100">
                  <ShieldCheck className="w-8 h-8 text-emerald-500" />
                  <div>
                    <p className="text-xs text-slate-500">Branch Health</p>
                    <p className="text-sm font-bold text-slate-800">Optimal <span className="text-xs text-emerald-500 font-semibold">(Clean)</span></p>
                  </div>
                </div>
              </div>

              {/* Visual storage grid map */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
                <div>
                  <h3 className="text-base font-bold text-slate-800">Branch Layout Grid Map</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Click on any Storage Rack cell to view localized package listings.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {zones.map(zone => (
                    <div key={zone.name} className={`p-4 rounded-xl border ${zone.color} space-y-4`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-sm">{zone.name}</h4>
                          <p className="text-[10px] opacity-80 font-medium mt-0.5">{zone.type}</p>
                        </div>
                        <span className="text-xs font-bold">{zone.fill}% filled</span>
                      </div>

                      {/* Racks grid inside zone */}
                      <div className="grid grid-cols-3 gap-2.5">
                        {getRacksForZone(zone.name).map(rack => {
                          const isSelected = selectedRack === rack.id;
                          return (
                            <button
                              key={rack.id}
                              type="button"
                              onClick={() => handleRackClick(rack)}
                              className={`p-2.5 rounded-lg border text-center transition-all cursor-pointer ${
                                isSelected
                                  ? 'ring-2 ring-blue-500 bg-white shadow-md border-blue-500'
                                  : rack.status === 'locked'
                                  ? 'bg-red-50 border-red-200 text-red-700 opacity-60'
                                  : rack.fill > 80
                                  ? 'bg-slate-100 border-slate-300 text-slate-800'
                                  : 'bg-white border-slate-200 hover:bg-slate-50/50 text-slate-800'
                              }`}
                            >
                              <p className="text-xs font-bold tracking-tight">{rack.id}</p>
                              <div className="mt-1.5 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full ${
                                    rack.fill > 80 ? 'bg-red-500' : rack.fill > 50 ? 'bg-amber-500' : 'bg-green-500'
                                  }`} 
                                  style={{ width: `${rack.fill}%` }}
                                ></div>
                              </div>
                              <span className="text-[9px] text-slate-500 mt-1 block font-medium">{rack.fill}%</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Selected Rack storage inventory items details */}
              {selectedRack && (
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4 animate-fade-in">
                  <h3 className="text-sm font-bold text-slate-700 flex items-center">
                    <Layers className="w-4.5 h-4.5 mr-2 text-blue-500" /> Rack {selectedRack} Storage Inventory
                  </h3>
                  
                  {selectedRackOccupants.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-200 text-sm">
                        <thead className="bg-slate-50">
                          <tr>
                            <th scope="col" className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Tracking Number</th>
                            <th scope="col" className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Item Description</th>
                            <th scope="col" className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Quantity</th>
                            <th scope="col" className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Cargo Weight</th>
                            <th scope="col" className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100 text-slate-750">
                          {selectedRackOccupants.map((pkg, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-4 py-3 font-mono font-bold text-xs text-blue-600">{pkg.tracking}</td>
                              <td className="px-4 py-3 font-semibold text-slate-900">{pkg.desc}</td>
                              <td className="px-4 py-3">{pkg.qty}</td>
                              <td className="px-4 py-3 text-slate-500">{pkg.weight}</td>
                              <td className="px-4 py-3">
                                <span className="px-2 py-0.5 inline-flex text-[10px] leading-5 font-semibold rounded-full bg-emerald-100 text-emerald-800">
                                  {pkg.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 text-center py-6">No cargo packages currently sitting in Rack {selectedRack}. Available for incoming stocking.</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Register Warehouse slideover modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-scale-in">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800 flex items-center">
                <Building className="w-5 h-5 mr-2 text-blue-500" /> Register Warehouse Branch
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-650 text-xs rounded-lg p-3">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Warehouse Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Mumbai Logistics Depot"
                  className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Physical Address</label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Plot 15, MIDC Industrial Area"
                  className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Storage Volume Capacity (Cubic Meters - m³)</label>
                <input
                  type="number"
                  required
                  value={capacityVolume}
                  onChange={(e) => setCapacityVolume(e.target.value)}
                  placeholder="e.g. 5000"
                  className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors inline-flex items-center"
                >
                  {submitting && <Loader2 className="animate-spin -ml-1 mr-1.5 h-4 w-4" />}
                  Register Site
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WarehousesList;
