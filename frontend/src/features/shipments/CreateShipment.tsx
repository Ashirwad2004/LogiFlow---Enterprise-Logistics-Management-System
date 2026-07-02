import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../core/api';
import { ArrowLeft, Loader2, Save } from 'lucide-react';

const CreateShipment: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Customers List and Loading States
  const [customers, setCustomers] = useState<any[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);

  // Quick Add Customer States
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddLoading, setQuickAddLoading] = useState(false);
  const [quickAddError, setQuickAddError] = useState('');
  const [quickAddData, setQuickAddData] = useState({
    name: '',
    email: '',
    phone: '',
    billing_address: '',
    shipping_address: '',
  });

  const [formData, setFormData] = useState({
    customer_id: '',
    pickup_address: '',
    delivery_address: '',
    estimated_delivery: '',
  });

  const [item, setItem] = useState({
    description: '',
    quantity: 1,
    weight_kg: '',
  });

  // Fetch Customers on Mount
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const response = await api.get('/customers/');
        setCustomers(response.data);
        if (response.data.length > 0) {
          setFormData(prev => ({ ...prev, customer_id: response.data[0].id }));
        }
      } catch (err) {
        console.error('Failed to load customers', err);
      } finally {
        setLoadingCustomers(false);
      }
    };
    fetchCustomers();
  }, []);

  const handleQuickAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setQuickAddLoading(true);
    setQuickAddError('');

    try {
      const response = await api.post('/customers/', quickAddData);
      setCustomers(prev => [...prev, response.data]);
      setFormData(prev => ({ ...prev, customer_id: response.data.id }));
      setShowQuickAdd(false);
      setQuickAddData({
        name: '',
        email: '',
        phone: '',
        billing_address: '',
        shipping_address: '',
      });
    } catch (err: any) {
      setQuickAddError(err.response?.data?.detail || 'Failed to add customer');
    } finally {
      setQuickAddLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customer_id) {
      setError('Please select or add a customer.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        ...formData,
        estimated_delivery: formData.estimated_delivery ? new Date(formData.estimated_delivery).toISOString() : null,
        items: [
          {
            description: item.description,
            quantity: Number(item.quantity),
            weight_kg: Number(item.weight_kg) || 0
          }
        ]
      };

      await api.post('/shipments/', payload);
      navigate('/shipments');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create shipment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center space-x-4">
        <button 
          onClick={() => navigate('/shipments')}
          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Create New Shipment</h1>
          <p className="text-sm text-slate-500 mt-1">Fill in the details to book a new cargo delivery.</p>
        </div>
      </div>

      <div className="bg-white shadow-sm border border-slate-200 rounded-xl overflow-hidden animate-fade-in">
        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg p-4 flex items-center">
              <span className="font-medium">{error}</span>
            </div>
          )}

          <div className="space-y-4">
            <h3 className="text-lg font-medium text-slate-900 border-b border-slate-100 pb-2">Routing Details</h3>
            
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <div className="flex justify-between items-center mb-1">
                  <label htmlFor="customer_id" className="block text-sm font-medium text-slate-700">Customer</label>
                  <button
                    type="button"
                    onClick={() => setShowQuickAdd(true)}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-500 transition-colors"
                  >
                    + Quick-Add Customer
                  </button>
                </div>
                <div>
                  {loadingCustomers ? (
                    <div className="text-sm text-slate-500 py-2.5 pl-2 border border-dashed border-slate-200 rounded-lg">Loading customers...</div>
                  ) : customers.length === 0 ? (
                    <div className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3 flex justify-between items-center">
                      <span>No customers registered yet. Please add a customer first.</span>
                      <button
                        type="button"
                        onClick={() => setShowQuickAdd(true)}
                        className="px-3 py-1.5 bg-amber-600 text-white font-semibold rounded-lg text-xs hover:bg-amber-700 transition-colors"
                      >
                        Add Customer
                      </button>
                    </div>
                  ) : (
                    <select
                      id="customer_id"
                      required
                      value={formData.customer_id}
                      onChange={(e) => setFormData({...formData, customer_id: e.target.value})}
                      className="block w-full px-3 py-2.5 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white transition-colors"
                    >
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="pickup_address" className="block text-sm font-medium text-slate-700">Pickup Address</label>
                <div className="mt-1">
                  <input
                    type="text"
                    id="pickup_address"
                    required
                    value={formData.pickup_address}
                    onChange={(e) => setFormData({...formData, pickup_address: e.target.value})}
                    className="appearance-none block w-full px-3 py-2.5 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                    placeholder="123 Pickup St, Warehouse Area"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="delivery_address" className="block text-sm font-medium text-slate-700">Delivery Address</label>
                <div className="mt-1">
                  <input
                    type="text"
                    id="delivery_address"
                    required
                    value={formData.delivery_address}
                    onChange={(e) => setFormData({...formData, delivery_address: e.target.value})}
                    className="appearance-none block w-full px-3 py-2.5 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                    placeholder="456 Destination Ave, City Center"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="estimated_delivery" className="block text-sm font-medium text-slate-700">Est. Delivery Date</label>
                <div className="mt-1">
                  <input
                    type="datetime-local"
                    id="estimated_delivery"
                    value={formData.estimated_delivery}
                    onChange={(e) => setFormData({...formData, estimated_delivery: e.target.value})}
                    className="appearance-none block w-full px-3 py-2.5 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium text-slate-900 border-b border-slate-100 pb-2">Package Information</h3>
            
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              <div className="sm:col-span-3">
                <label htmlFor="description" className="block text-sm font-medium text-slate-700">Item Description</label>
                <div className="mt-1">
                  <input
                    type="text"
                    id="description"
                    required
                    value={item.description}
                    onChange={(e) => setItem({...item, description: e.target.value})}
                    className="appearance-none block w-full px-3 py-2.5 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                    placeholder="e.g. Office Supplies"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="quantity" className="block text-sm font-medium text-slate-700">Quantity</label>
                <div className="mt-1">
                  <input
                    type="number"
                    id="quantity"
                    min="1"
                    required
                    value={item.quantity}
                    onChange={(e) => setItem({...item, quantity: Number(e.target.value)})}
                    className="appearance-none block w-full px-3 py-2.5 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="weight_kg" className="block text-sm font-medium text-slate-700">Weight (KG)</label>
                <div className="mt-1">
                  <input
                    type="number"
                    step="0.1"
                    id="weight_kg"
                    value={item.weight_kg}
                    onChange={(e) => setItem({...item, weight_kg: e.target.value})}
                    className="appearance-none block w-full px-3 py-2.5 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                    placeholder="0.0"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-5 border-t border-slate-100 flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => navigate('/shipments')}
              className="bg-white py-2.5 px-4 border border-slate-300 rounded-lg shadow-sm text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || customers.length === 0}
              className="inline-flex justify-center py-2.5 px-6 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-70"
            >
              {loading ? (
                <><Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" /> Saving...</>
              ) : (
                <><Save className="-ml-1 mr-2 h-5 w-5" /> Save Shipment</>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Quick-Add Customer Modal */}
      {showQuickAdd && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-scale-in">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-slate-900">Quick-Add Customer</h3>
              <button 
                type="button"
                onClick={() => setShowQuickAdd(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleQuickAddCustomer} className="p-6 space-y-4">
              {quickAddError && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg p-3">
                  {quickAddError}
                </div>
              )}
              
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Full Name</label>
                <input
                  type="text"
                  required
                  value={quickAddData.name}
                  onChange={(e) => setQuickAddData({...quickAddData, name: e.target.value})}
                  className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Apex Corp / Jane Smith"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</label>
                <input
                  type="email"
                  required
                  value={quickAddData.email}
                  onChange={(e) => setQuickAddData({...quickAddData, email: e.target.value})}
                  className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="contact@apex.com"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Phone (Optional)</label>
                <input
                  type="text"
                  value={quickAddData.phone}
                  onChange={(e) => setQuickAddData({...quickAddData, phone: e.target.value})}
                  className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="+1-555-0199"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Billing Address</label>
                <input
                  type="text"
                  required
                  value={quickAddData.billing_address}
                  onChange={(e) => setQuickAddData({...quickAddData, billing_address: e.target.value, shipping_address: quickAddData.shipping_address || e.target.value})}
                  className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="123 Financial Row, Suite 100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Shipping Address</label>
                <input
                  type="text"
                  required
                  value={quickAddData.shipping_address}
                  onChange={(e) => setQuickAddData({...quickAddData, shipping_address: e.target.value})}
                  className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="456 Delivery Lane, Dock B"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowQuickAdd(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={quickAddLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors inline-flex items-center"
                >
                  {quickAddLoading && <Loader2 className="animate-spin -ml-1 mr-1.5 h-4 w-4" />}
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateShipment;
