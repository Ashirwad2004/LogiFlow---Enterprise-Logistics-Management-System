import React, { useState, useEffect } from 'react';
import api from '../../core/api';
import { 
  Building, 
  MapPin, 
  Layers, 
  Package, 
  Plus, 
  Loader2, 
  Gauge, 
  ShieldCheck, 
  Check, 
  Box, 
  Trash2, 
  ArrowUpRight, 
  PlusCircle 
} from 'lucide-react';

interface Warehouse {
  id: string;
  name: string;
  address: string;
  capacity_volume: number;
}

interface RackItem {
  id: string;
  description: string;
  quantity: number;
  weight_kg: number;
  dimensions: string | null;
  shipment_id: string;
}

interface Rack {
  id: string;
  section_id: string;
  code: string;
  capacity_weight_kg: number;
  status: string;
  items: RackItem[];
  current_weight_kg: number;
  fill_percentage: number;
}

interface Section {
  id: string;
  warehouse_id: string;
  name: string;
  type: string;
  racks: Rack[];
}

interface UnassignedItem {
  id: string;
  description: string;
  quantity: number;
  weight_kg: number;
  dimensions: string | null;
  shipment_id: string;
  tracking_number: string;
}

const WarehousesList: React.FC = () => {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);

  // Sections, Racks, and Unassigned Cargo items
  const [sections, setSections] = useState<Section[]>([]);
  const [loadingSections, setLoadingSections] = useState(false);
  const [unassignedItems, setUnassignedItems] = useState<UnassignedItem[]>([]);
  const [loadingUnassigned, setLoadingUnassigned] = useState(false);

  // Selected Rack details state
  const [selectedRackId, setSelectedRackId] = useState<string | null>(null);
  const [selectedRack, setSelectedRack] = useState<Rack | null>(null);

  // New warehouse form state
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [capacityVolume, setCapacityVolume] = useState('5000');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Add Section form state
  const [showAddSectionModal, setShowAddSectionModal] = useState(false);
  const [sectionName, setSectionName] = useState('');
  const [sectionType, setSectionType] = useState('Dry Goods');
  const [submittingSection, setSubmittingSection] = useState(false);
  const [sectionError, setSectionError] = useState('');

  // Add Rack form state
  const [showAddRackModal, setShowAddRackModal] = useState(false);
  const [targetSectionId, setTargetSectionId] = useState('');
  const [rackCode, setRackCode] = useState('');
  const [rackCapacity, setRackCapacity] = useState('1000');
  const [submittingRack, setSubmittingRack] = useState(false);
  const [rackError, setRackError] = useState('');

  // Assign Cargo form state
  const [selectedItemId, setSelectedItemId] = useState('');
  const [assigningItem, setAssigningItem] = useState(false);
  const [assignError, setAssignError] = useState('');

  const fetchWarehouses = async () => {
    try {
      const response = await api.get('/warehouses');
      setWarehouses(response.data);
      if (response.data.length > 0) {
        setSelectedWarehouseId(response.data[0].id);
      }
    } catch (err) {
      console.error('Failed to load warehouses', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSections = async (whId: string) => {
    setLoadingSections(true);
    try {
      const response = await api.get(`/warehouses/${whId}/sections`);
      setSections(response.data);
      
      // If a rack was selected, refresh its details from the fresh sections list
      if (selectedRackId) {
        let found = false;
        for (const sec of response.data) {
          const r = sec.racks.find((rk: Rack) => rk.id === selectedRackId);
          if (r) {
            setSelectedRack(r);
            found = true;
            break;
          }
        }
        if (!found) {
          setSelectedRack(null);
          setSelectedRackId(null);
        }
      }
    } catch (err) {
      console.error('Failed to load warehouse sections', err);
    } finally {
      setLoadingSections(false);
    }
  };

  const fetchUnassignedItems = async (whId: string) => {
    setLoadingUnassigned(true);
    try {
      const response = await api.get(`/warehouses/${whId}/unassigned-items`);
      setUnassignedItems(response.data);
      if (response.data.length > 0) {
        setSelectedItemId(response.data[0].id);
      } else {
        setSelectedItemId('');
      }
    } catch (err) {
      console.error('Failed to load unassigned items', err);
    } finally {
      setLoadingUnassigned(false);
    }
  };

  useEffect(() => {
    fetchWarehouses();
  }, []);

  useEffect(() => {
    if (selectedWarehouseId) {
      const wh = warehouses.find(w => w.id === selectedWarehouseId) || null;
      setSelectedWarehouse(wh);
      setSelectedRackId(null);
      setSelectedRack(null);
      fetchSections(selectedWarehouseId);
      fetchUnassignedItems(selectedWarehouseId);
    } else {
      setSelectedWarehouse(null);
      setSelectedRackId(null);
      setSelectedRack(null);
      setSections([]);
      setUnassignedItems([]);
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

  const handleAddSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWarehouseId) return;
    setSubmittingSection(true);
    setSectionError('');
    try {
      await api.post(`/warehouses/${selectedWarehouseId}/sections`, {
        name: sectionName,
        type: sectionType
      });
      setShowAddSectionModal(false);
      setSectionName('');
      setSectionType('Dry Goods');
      await fetchSections(selectedWarehouseId);
    } catch (err: any) {
      setSectionError(err.response?.data?.detail || 'Failed to create section.');
    } finally {
      setSubmittingSection(false);
    }
  };

  const handleAddRack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetSectionId) return;
    setSubmittingRack(true);
    setRackError('');
    try {
      await api.post(`/warehouses/sections/${targetSectionId}/racks`, {
        code: rackCode,
        capacity_weight_kg: parseFloat(rackCapacity),
        status: 'active'
      });
      setShowAddRackModal(false);
      setRackCode('');
      setRackCapacity('1000');
      await fetchSections(selectedWarehouseId);
    } catch (err: any) {
      setRackError(err.response?.data?.detail || 'Failed to create rack.');
    } finally {
      setSubmittingRack(false);
    }
  };

  const handleAssignItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRackId || !selectedItemId) return;
    setAssigningItem(true);
    setAssignError('');
    try {
      await api.post(`/warehouses/racks/${selectedRackId}/assign-item`, {
        item_id: selectedItemId
      });
      setAssignError('');
      await fetchSections(selectedWarehouseId);
      await fetchUnassignedItems(selectedWarehouseId);
    } catch (err: any) {
      setAssignError(err.response?.data?.detail || 'Failed to assign cargo item.');
    } finally {
      setAssigningItem(false);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    if (!selectedRackId) return;
    if (!window.confirm('Are you sure you want to deallocate this cargo from this rack?')) return;
    try {
      await api.post(`/warehouses/racks/${selectedRackId}/remove-item`, {
        item_id: itemId
      });
      await fetchSections(selectedWarehouseId);
      await fetchUnassignedItems(selectedWarehouseId);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to remove cargo item.');
    }
  };

  const handleRackClick = (rack: Rack) => {
    setSelectedRackId(rack.id);
    setSelectedRack(rack);
    setAssignError('');
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
          Add Warehouse Branch
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
                
                <div className="flex items-center space-x-3 bg-slate-50 px-4 py-3 rounded-lg border border-slate-100">
                  <Gauge className="w-8 h-8 text-blue-500" />
                  <div>
                    <p className="text-xs text-slate-500">Storage Zones</p>
                    <p className="text-sm font-bold text-slate-800">{sections.length} Active Zones</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 bg-slate-50 px-4 py-3 rounded-lg border border-slate-100">
                  <ShieldCheck className="w-8 h-8 text-emerald-500" />
                  <div>
                    <p className="text-xs text-slate-500">Branch Status</p>
                    <p className="text-sm font-bold text-slate-800">Operational <span className="text-xs text-emerald-500 font-semibold">(Active)</span></p>
                  </div>
                </div>
              </div>

              {/* Visual storage grid map */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-base font-bold text-slate-800">Branch Layout Grid Map</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Click on any Storage Rack cell to view localized package listings.</p>
                  </div>
                  <button
                    onClick={() => setShowAddSectionModal(true)}
                    className="inline-flex items-center px-3 py-1.5 bg-slate-100 hover:bg-slate-250 text-slate-800 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Zone
                  </button>
                </div>

                {loadingSections ? (
                  <div className="p-8 text-center text-slate-500 flex justify-center items-center space-x-2">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                    <span>Loading layout map...</span>
                  </div>
                ) : sections.length === 0 ? (
                  <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center text-slate-500">
                    <Layers className="w-8 h-8 mx-auto mb-2 text-slate-350" />
                    <p className="text-sm">No storage zones configured for this site.</p>
                    <button
                      onClick={() => setShowAddSectionModal(true)}
                      className="mt-3 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold px-3 py-1.5 rounded-md"
                    >
                      Configure First Zone
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {sections.map(zone => {
                      // Calculate average zone fill rate
                      const avgFill = zone.racks.length > 0 
                        ? Math.round(zone.racks.reduce((acc, r) => acc + r.fill_percentage, 0) / zone.racks.length)
                        : 0;

                      return (
                        <div key={zone.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/30 space-y-4 shadow-2xs">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-bold text-sm text-slate-800">{zone.name}</h4>
                              <p className="text-[10px] text-slate-500 font-semibold mt-0.5">{zone.type}</p>
                            </div>
                            <span className="text-xs font-bold text-slate-700">{avgFill}% avg fill</span>
                          </div>

                          {/* Racks grid inside zone */}
                          <div className="grid grid-cols-3 gap-2">
                            {zone.racks.map(rack => {
                              const isSelected = selectedRackId === rack.id;
                              return (
                                <button
                                  key={rack.id}
                                  type="button"
                                  onClick={() => handleRackClick(rack)}
                                  className={`p-2.5 rounded-lg border text-center transition-all cursor-pointer ${
                                    isSelected
                                      ? 'ring-2 ring-blue-500 bg-white shadow-xs border-blue-500'
                                      : rack.status === 'locked'
                                      ? 'bg-red-50 border-red-200 text-red-700 opacity-60'
                                      : rack.fill_percentage >= 95
                                      ? 'bg-slate-100 border-slate-350 text-slate-800'
                                      : 'bg-white border-slate-200 hover:bg-slate-50/50 text-slate-800 hover:shadow-2xs'
                                  }`}
                                >
                                  <p className="text-xs font-extrabold tracking-tight">{rack.code}</p>
                                  <div className="mt-1.5 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full ${
                                        rack.fill_percentage >= 90 ? 'bg-red-500' : rack.fill_percentage >= 50 ? 'bg-amber-500' : 'bg-green-500'
                                      }`} 
                                      style={{ width: `${rack.fill_percentage}%` }}
                                    ></div>
                                  </div>
                                  <span className="text-[9px] text-slate-500 mt-1 block font-medium">{rack.fill_percentage}%</span>
                                </button>
                              );
                            })}
                            
                            {/* Quick Add Rack button */}
                            <button
                              type="button"
                              onClick={() => {
                                setTargetSectionId(zone.id);
                                setShowAddRackModal(true);
                              }}
                              className="p-2.5 rounded-lg border border-dashed border-slate-300 hover:border-slate-450 hover:bg-slate-100 flex flex-col items-center justify-center text-slate-400 hover:text-slate-650 transition-colors cursor-pointer"
                              title="Add Rack to this Zone"
                            >
                              <PlusCircle className="w-5 h-5" />
                              <span className="text-[8px] font-semibold mt-1">Add Rack</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Grid: Unassigned Cargo & Selected Rack inventory side-by-side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Selected Rack Panel */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold text-slate-700 flex items-center">
                    <Layers className="w-4.5 h-4.5 mr-2 text-blue-500" /> 
                    {selectedRack ? `Rack ${selectedRack.code} Storage Inventory` : 'Select a Rack to View Inventory'}
                  </h3>
                  
                  {selectedRack ? (
                    <div className="space-y-4">
                      {selectedRack.items.length > 0 ? (
                        <div className="overflow-x-auto max-h-60 overflow-y-auto">
                          <table className="min-w-full divide-y divide-slate-200 text-sm">
                            <thead className="bg-slate-50">
                              <tr>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Tracking</th>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</th>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Qty/Weight</th>
                                <th className="relative px-3 py-2"><span className="sr-only">Actions</span></th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-100 text-slate-700">
                              {selectedRack.items.map((pkg) => (
                                <tr key={pkg.id} className="hover:bg-slate-50/50">
                                  <td className="px-3 py-2 font-mono font-bold text-xs text-blue-600">{pkg.shipment_id.substring(0, 8)}...</td>
                                  <td className="px-3 py-2 font-semibold text-slate-800 text-xs">{pkg.description}</td>
                                  <td className="px-3 py-2 text-xs">{pkg.quantity}x ({pkg.weight_kg} kg)</td>
                                  <td className="px-3 py-2 text-right">
                                    <button
                                      onClick={() => handleRemoveItem(pkg.id)}
                                      className="p-1 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                                      title="Remove cargo from rack"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 text-center py-6">No cargo packages currently allocated to Rack {selectedRack.code}. Available for stocking.</p>
                      )}

                      {/* Quick Assign Form */}
                      {unassignedItems.length > 0 ? (
                        <form onSubmit={handleAssignItem} className="border-t border-slate-100 pt-4 space-y-3">
                          <h4 className="text-xs font-bold text-slate-700">Allocate Incoming Cargo to this Rack</h4>
                          {assignError && <p className="text-[11px] text-red-600">{assignError}</p>}
                          
                          <div className="flex gap-2">
                            <select
                              value={selectedItemId}
                              onChange={(e) => setSelectedItemId(e.target.value)}
                              className="flex-1 px-3 py-1.5 border border-slate-350 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                              {unassignedItems.map(item => (
                                <option key={item.id} value={item.id}>
                                  {item.tracking_number} - {item.description} ({item.weight_kg * item.quantity} kg)
                                </option>
                              ))}
                            </select>
                            <button
                              type="submit"
                              disabled={assigningItem || !selectedItemId}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg transition-colors inline-flex items-center"
                            >
                              {assigningItem ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Allocate'}
                            </button>
                          </div>
                        </form>
                      ) : (
                        <p className="text-[11px] text-slate-450 border-t border-slate-100 pt-3">No unassigned incoming packages at this branch to allocate.</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 text-center py-8">Select any rack in the layout grid above to inspect stored cargo or allocate new inventory packages.</p>
                  )}
                </div>

                {/* Unassigned Incoming Cargo Panel */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold text-slate-700 flex items-center">
                    <Box className="w-4.5 h-4.5 mr-2 text-orange-500" />
                    Unassigned Cargo at Branch
                  </h3>
                  
                  {loadingUnassigned ? (
                    <div className="text-center py-8 text-slate-400 flex items-center justify-center gap-1.5">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                      <span className="text-xs">Loading cargo...</span>
                    </div>
                  ) : unassignedItems.length > 0 ? (
                    <div className="overflow-x-auto max-h-80 overflow-y-auto">
                      <table className="min-w-full divide-y divide-slate-200 text-sm">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Tracking #</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Weight</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100 text-slate-700">
                          {unassignedItems.map(item => (
                            <tr key={item.id} className="hover:bg-slate-50/50">
                              <td className="px-3 py-2 font-mono font-bold text-xs text-slate-900">{item.tracking_number}</td>
                              <td className="px-3 py-2 font-semibold text-slate-800 text-xs">{item.description}</td>
                              <td className="px-3 py-2 text-slate-500 text-xs">{item.weight_kg * item.quantity} kg</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="border border-dashed border-slate-200 rounded-xl p-8 text-center text-slate-400">
                      <Package className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      <p className="text-xs">All packages residing at this branch have been allocated to storage racks.</p>
                    </div>
                  )}
                </div>
              </div>
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
                className="text-slate-400 hover:text-slate-655 text-xl cursor-pointer"
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
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors inline-flex items-center cursor-pointer"
                >
                  {submitting && <Loader2 className="animate-spin -ml-1 mr-1.5 h-4 w-4" />}
                  Register Site
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Zone (Section) Modal */}
      {showAddSectionModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-scale-in">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-800 flex items-center">
                <Layers className="w-5 h-5 mr-2 text-blue-500" /> Configure Storage Zone
              </h3>
              <button
                type="button"
                onClick={() => setShowAddSectionModal(false)}
                className="text-slate-400 hover:text-slate-655 text-xl cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleAddSection} className="p-6 space-y-4">
              {sectionError && (
                <div className="bg-red-50 border border-red-200 text-red-650 text-xs rounded-lg p-3">
                  {sectionError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Zone / Section Name</label>
                <input
                  type="text"
                  required
                  value={sectionName}
                  onChange={(e) => setSectionName(e.target.value)}
                  placeholder="e.g. Zone D - Dangerous Goods"
                  className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Storage Classification</label>
                <select
                  value={sectionType}
                  onChange={(e) => setSectionType(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="Dry Goods">Dry Goods / Pallets</option>
                  <option value="Cold Storage">Cold Storage / Frozen</option>
                  <option value="Hazardous">Hazardous / Chemical</option>
                  <option value="High-Priority">High-Priority / Fast-Moving</option>
                </select>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddSectionModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingSection}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors inline-flex items-center cursor-pointer"
                >
                  {submittingSection && <Loader2 className="animate-spin -ml-1 mr-1.5 h-4 w-4" />}
                  Create Zone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Rack Modal */}
      {showAddRackModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-scale-in">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-800 flex items-center">
                <Layers className="w-5 h-5 mr-2 text-blue-500" /> Create Storage Rack
              </h3>
              <button
                type="button"
                onClick={() => setShowAddRackModal(false)}
                className="text-slate-400 hover:text-slate-655 text-xl cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleAddRack} className="p-6 space-y-4">
              {rackError && (
                <div className="bg-red-50 border border-red-200 text-red-650 text-xs rounded-lg p-3">
                  {rackError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Rack Code / Identifier</label>
                <input
                  type="text"
                  required
                  value={rackCode}
                  onChange={(e) => setRackCode(e.target.value)}
                  placeholder="e.g. D1, D2"
                  className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Weight Capacity (kg)</label>
                <input
                  type="number"
                  required
                  value={rackCapacity}
                  onChange={(e) => setRackCapacity(e.target.value)}
                  placeholder="e.g. 1000"
                  className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddRackModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRack}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors inline-flex items-center cursor-pointer"
                >
                  {submittingRack && <Loader2 className="animate-spin -ml-1 mr-1.5 h-4 w-4" />}
                  Create Rack
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
