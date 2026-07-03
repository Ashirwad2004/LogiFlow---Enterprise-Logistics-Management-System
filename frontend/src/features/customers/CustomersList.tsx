import React, { useState, useEffect } from 'react';
import api from '../../core/api';
import { 
  Users, 
  Search, 
  Plus, 
  Mail, 
  Phone, 
  MapPin, 
  Loader2, 
  Building2,
  PackageSearch
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  billing_address: string;
  shipping_address: string;
  created_at: string;
}

const CustomersList: React.FC = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    billing_address: '',
    shipping_address: '',
  });

  const fetchCustomers = async () => {
    try {
      const response = await api.get('/customers/');
      setCustomers(response.data);
    } catch (err) {
      console.error('Failed to fetch customers', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const response = await api.post('/customers/', formData);
      setCustomers(prev => [...prev, response.data]);
      setShowAddModal(false);
      setFormData({
        name: '',
        email: '',
        phone: '',
        billing_address: '',
        shipping_address: '',
      });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to add customer.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center">
            <Building2 className="w-6 h-6 mr-2 text-blue-600" /> Client Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manage corporate clients, consignees, and shipping customers.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg shadow-sm transition-colors cursor-pointer"
        >
          <Plus className="w-5 h-5 mr-1.5" /> Register Client
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full sm:w-96">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
            />
          </div>
          <div className="text-sm font-semibold text-slate-500">
            Total Clients: {filteredCustomers.length}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-white">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Client Details</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Contact Info</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Default Billing Address</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-150">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex justify-center items-center space-x-2">
                      <Loader2 className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      <span>Loading clients registry...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center">
                      <Users className="w-12 h-12 text-slate-300 mb-3" />
                      <p className="font-semibold text-slate-700">No clients found.</p>
                      <p className="text-xs mt-1">Register a new client to start booking shipments.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map(customer => (
                  <tr key={customer.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold uppercase">
                          {customer.name.substring(0,2)}
                        </div>
                        <div className="ml-4">
                          <div className="font-bold text-slate-900">{customer.name}</div>
                          <div className="text-xs text-slate-500 mt-0.5">Joined: {new Date(customer.created_at).toLocaleDateString()}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-600 space-y-1">
                        <div className="flex items-center">
                          <Mail className="w-3.5 h-3.5 mr-2 text-slate-400" />
                          {customer.email}
                        </div>
                        {customer.phone && (
                          <div className="flex items-center text-xs">
                            <Phone className="w-3.5 h-3.5 mr-2 text-slate-400" />
                            {customer.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-start max-w-xs">
                        <MapPin className="w-4 h-4 mr-2 text-slate-400 flex-shrink-0 mt-0.5" />
                        <span className="text-slate-600 line-clamp-2" title={customer.billing_address}>
                          {customer.billing_address}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-medium">
                      <button 
                        onClick={() => navigate(`/shipments?search=${encodeURIComponent(customer.name)}`)}
                        className="text-blue-600 hover:text-blue-900 inline-flex items-center font-bold px-3 py-1.5 rounded-md hover:bg-blue-50 transition-colors cursor-pointer"
                      >
                        <PackageSearch className="w-4 h-4 mr-1.5" /> View Shipments
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-scale-in">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900">Register New Client</h3>
              <button 
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold leading-none cursor-pointer"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleAddCustomer} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg p-3">
                  {error}
                </div>
              )}
              
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Client / Company Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Acme Corp"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Primary Email</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="contact@acme.com"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Phone (Optional)</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="+1-555-0199"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Billing Address</label>
                <input
                  type="text"
                  required
                  value={formData.billing_address}
                  onChange={(e) => setFormData({...formData, billing_address: e.target.value, shipping_address: formData.shipping_address || e.target.value})}
                  className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="123 Financial Row, Suite 100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Default Shipping Address</label>
                <input
                  type="text"
                  required
                  value={formData.shipping_address}
                  onChange={(e) => setFormData({...formData, shipping_address: e.target.value})}
                  className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="456 Delivery Lane, Dock B"
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
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold transition-colors inline-flex items-center cursor-pointer"
                >
                  {submitting && <Loader2 className="animate-spin -ml-1 mr-1.5 h-4 w-4" />}
                  Register Client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomersList;
