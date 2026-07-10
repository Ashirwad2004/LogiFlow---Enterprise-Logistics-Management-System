import React, { useState, useEffect } from 'react';
import api from '../../core/api';
import { 
  Package, 
  Plus, 
  Trash2, 
  Loader2, 
  Layers, 
  Coins, 
  Scale, 
  MapPin, 
  ShieldAlert,
  Search,
  X
} from 'lucide-react';

interface Product {
  id: string;
  product_number: string;
  name: string;
  description: string | null;
  price: number;
  weight_kg: number;
  dimensions: string | null;
  quantity: int;
  warehouse_id: string | null;
  section_id: string | null;
  rack_id: string | null;
  warehouse_name?: string;
  section_name?: string;
  rack_code?: string;
}

interface Warehouse {
  id: string;
  name: string;
  address: string;
}

interface Rack {
  id: string;
  code: string;
}

interface Section {
  id: string;
  name: string;
  racks: Rack[];
}

const ProductsStore: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Data for Selectors
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [racks, setRacks] = useState<Rack[]>([]);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Add Product Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState({
    product_number: '',
    name: '',
    description: '',
    price: '',
    weight_kg: '',
    dimensions: '',
    quantity: '10',
    warehouse_id: '',
    section_id: '',
    rack_id: ''
  });

  const fetchProducts = async () => {
    try {
      const response = await api.get('/products/');
      setProducts(response.data);
    } catch (err) {
      console.error('Failed to load products', err);
      setError('Could not retrieve store products inventory.');
    } finally {
      setLoading(false);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const response = await api.get('/warehouses');
      setWarehouses(response.data);
    } catch (err) {
      console.error('Failed to fetch warehouses', err);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchWarehouses();
  }, []);

  // Fetch sections & racks when warehouse selection changes
  const handleWarehouseChange = async (whId: string) => {
    setFormData(prev => ({ ...prev, warehouse_id: whId, section_id: '', rack_id: '' }));
    setSections([]);
    setRacks([]);
    if (!whId) return;

    try {
      const response = await api.get(`/warehouses/${whId}/sections`);
      setSections(response.data);
    } catch (err) {
      console.error('Failed to fetch warehouse sections', err);
    }
  };

  // Update racks list when section selection changes
  const handleSectionChange = (secId: string) => {
    setFormData(prev => ({ ...prev, section_id: secId, rack_id: '' }));
    setRacks([]);
    if (!secId) return;

    const selectedSec = sections.find(s => s.id === secId);
    if (selectedSec) {
      setRacks(selectedSec.racks || []);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');

    // Payload conversions
    const payload = {
      product_number: formData.product_number,
      name: formData.name,
      description: formData.description || null,
      price: parseFloat(formData.price) || 0.0,
      weight_kg: parseFloat(formData.weight_kg) || 0.0,
      dimensions: formData.dimensions || null,
      quantity: parseInt(formData.quantity) || 0,
      warehouse_id: formData.warehouse_id || null,
      section_id: formData.section_id || null,
      rack_id: formData.rack_id || null
    };

    try {
      const response = await api.post('/products/', payload);
      setProducts(prev => [response.data, ...prev]);
      setShowAddModal(false);
      
      // Reset form
      setFormData({
        product_number: '',
        name: '',
        description: '',
        price: '',
        weight_kg: '',
        dimensions: '',
        quantity: '10',
        warehouse_id: '',
        section_id: '',
        rack_id: ''
      });
      setSections([]);
      setRacks([]);
    } catch (err: any) {
      setFormError(err.response?.data?.detail || 'Failed to add product to inventory');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this product from store inventory?')) return;
    
    try {
      await api.delete(`/products/${id}`);
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      console.error('Failed to delete product', err);
      alert('Failed to delete product.');
    }
  };

  // Filtered products list
  const filteredProducts = products.filter(p => {
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.product_number.toLowerCase().includes(q) ||
      (p.warehouse_name && p.warehouse_name.toLowerCase().includes(q)) ||
      (p.rack_code && p.rack_code.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Package className="w-7 h-7 text-blue-600" /> Store Inventory Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Pre-register products, manage quantities, and assign them to specific warehouse racks.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add Product to Rack
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-250 text-red-800 text-sm rounded-xl p-4 flex items-start gap-2.5">
          <ShieldAlert className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap gap-4 items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by SKU, product name, warehouse, or rack..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
          />
        </div>
        
        <div className="text-xs text-slate-500 font-medium">
          Showing {filteredProducts.length} of {products.length} registered products
        </div>
      </div>

      {/* Main Table */}
      {loading ? (
        <div className="py-24 text-center text-slate-500 flex flex-col justify-center items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="text-sm font-semibold">Loading store products...</span>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-16 text-center space-y-4 shadow-3xs">
          <div className="w-16 h-16 bg-slate-50 text-slate-400 border border-slate-100 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <Package className="w-8 h-8" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">No products found</h3>
            <p className="text-slate-500 text-xs mt-1 max-w-sm mx-auto">
              Add products to your store inventory and assign them to specific warehouse racks to get started.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider text-xs">
                <tr>
                  <th className="px-6 py-4">SKU / Number</th>
                  <th className="px-6 py-4">Product Name</th>
                  <th className="px-6 py-4">Stock Qty</th>
                  <th className="px-6 py-4">Billing Value</th>
                  <th className="px-6 py-4">Weight</th>
                  <th className="px-6 py-4">Warehouse Location</th>
                  <th className="px-6 py-4">Rack ID</th>
                  <th className="px-6 py-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-250 text-slate-800">
                {filteredProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-xs text-blue-700">
                      {p.product_number}
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold">{p.name}</p>
                        {p.description && <p className="text-3xs text-slate-400 mt-0.5 truncate max-w-xs">{p.description}</p>}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-semibold">
                      <span className={`px-2 py-0.5 rounded text-xs ${p.quantity <= 5 ? 'bg-rose-50 text-rose-600 font-extrabold border border-rose-100' : 'bg-slate-100 text-slate-700'}`}>
                        {p.quantity} units
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-800">
                      <span className="flex items-center gap-1">
                        <Coins className="w-3.5 h-3.5 text-amber-500" /> ₹{p.price.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs">
                      <span className="flex items-center gap-1">
                        <Scale className="w-3.5 h-3.5 text-slate-400" /> {p.weight_kg.toFixed(2)} kg
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {p.warehouse_name ? (
                        <div className="flex items-center gap-1.5 text-xs">
                          <MapPin className="w-3.5 h-3.5 text-red-400" />
                          <div>
                            <p className="font-semibold text-slate-750">{p.warehouse_name}</p>
                            {p.section_name && <p className="text-3xs text-slate-400 -mt-0.5">{p.section_name}</p>}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-xs">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {p.rack_code ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-3xs font-extrabold bg-blue-50 text-blue-700 border border-blue-150">
                          <Layers className="w-2.5 h-2.5" /> Rack {p.rack_code}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-xs">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleDeleteProduct(p.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete Product"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-y-auto max-h-[90vh] animate-scale-in">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-600" /> Add Product to Rack
              </h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="p-1 border border-transparent rounded-lg hover:bg-slate-200 text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-6 space-y-5">
              {formError && (
                <div className="bg-rose-50 border border-rose-250 text-rose-800 text-xs rounded-lg p-3 flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-550 uppercase tracking-wider mb-1">SKU / Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. PRD-102"
                    value={formData.product_number}
                    onChange={(e) => setFormData({ ...formData, product_number: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-550 uppercase tracking-wider mb-1">Product Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Electronics Box"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-550 uppercase tracking-wider mb-1">Description</label>
                <textarea
                  placeholder="Optional product details..."
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-550 uppercase tracking-wider mb-1">Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="Price"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-550 uppercase tracking-wider mb-1">Weight (KG) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="Weight"
                    value={formData.weight_kg}
                    onChange={(e) => setFormData({ ...formData, weight_kg: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-550 uppercase tracking-wider mb-1">Qty *</label>
                  <input
                    type="number"
                    required
                    placeholder="Qty"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-550 uppercase tracking-wider mb-1">Dimensions</label>
                <input
                  type="text"
                  placeholder="e.g. 30x20x15 cm (optional)"
                  value={formData.dimensions}
                  onChange={(e) => setFormData({ ...formData, dimensions: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="border-t border-slate-100 pt-4 space-y-4">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Placement Location</h4>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Warehouse *</label>
                    <select
                      required
                      value={formData.warehouse_id}
                      onChange={(e) => handleWarehouseChange(e.target.value)}
                      className="w-full px-2 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">Select...</option>
                      {warehouses.map(wh => (
                        <option key={wh.id} value={wh.id}>{wh.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Section *</label>
                    <select
                      required
                      disabled={!formData.warehouse_id}
                      value={formData.section_id}
                      onChange={(e) => handleSectionChange(e.target.value)}
                      className="w-full px-2 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                    >
                      <option value="">Select...</option>
                      {sections.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Rack *</label>
                    <select
                      required
                      disabled={!formData.section_id}
                      value={formData.rack_id}
                      onChange={(e) => setFormData({ ...formData, rack_id: e.target.value })}
                      className="w-full px-2 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                    >
                      <option value="">Select...</option>
                      {racks.map(r => (
                        <option key={r.id} value={r.id}>Rack {r.code}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 font-semibold text-sm rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-sm rounded-lg shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Register Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductsStore;
