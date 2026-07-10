import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../core/api';
import { Plus, Search, Truck, MapPin, Package, Calendar } from 'lucide-react';

interface Shipment {
  id: string;
  tracking_number: string;
  status: string;
  created_at: string;
  delivery_address: string;
  customer_name?: string;
  items: any[];
  invoice_status?: string;
}

const ShipmentList: React.FC = () => {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchShipments = async () => {
    try {
      setLoading(true);
      const response = await api.get('/shipments', {
        params: { search: search || undefined }
      });
      setShipments(response.data.items);
    } catch (error) {
      console.error('Failed to fetch shipments', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchShipments();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [search]);

  const getStatusColor = (status: string) => {
    switch(status.toLowerCase()) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'in_transit': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'delivered': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getBillingStatusColor = (status: string) => {
    switch(status.toLowerCase()) {
      case 'paid': return 'bg-green-100 text-green-800 border-green-200';
      case 'partially_paid': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'unpaid': return 'bg-amber-100 text-amber-800 border-amber-250';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Shipments</h1>
          <p className="text-sm text-slate-500 mt-1">Manage and track your active deliveries.</p>
        </div>
        <Link
          to="/shipments/new"
          className="inline-flex items-center px-4 py-2.5 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          <Plus className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
          New Shipment
        </Link>
      </div>

      <div className="bg-white shadow-sm border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50">
          <div className="relative max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg leading-5 bg-white placeholder-slate-500 focus:outline-none focus:placeholder-slate-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
              placeholder="Search by tracking number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Tracking Number
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Customer
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Billing
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Destination
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Created
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {loading ? (
                <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-slate-500">
                      <div className="flex justify-center items-center space-x-2">
                        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        <span>Loading shipments...</span>
                      </div>
                    </td>
                  </tr>
                ) : shipments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-slate-500">
                      <div className="flex flex-col items-center">
                        <Package className="w-10 h-10 text-slate-300 mb-3" />
                        <p>No shipments found.</p>
                      </div>
                    </td>
                </tr>
              ) : (
                shipments.map((shipment) => (
                  <tr key={shipment.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Truck className="flex-shrink-0 h-5 w-5 text-slate-400 mr-3" />
                        <div className="text-sm font-medium text-slate-900">
                          {shipment.tracking_number}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-medium">
                      {shipment.customer_name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${getStatusColor(shipment.status)}`}>
                      {shipment.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {shipment.invoice_status ? (
                      <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${getBillingStatusColor(shipment.invoice_status)}`}>
                        {shipment.invoice_status.replace('_', ' ').toUpperCase()}
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border bg-slate-100 text-slate-800 border-slate-200">
                        PENDING
                      </span>
                    )}
                  </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-slate-500">
                        <MapPin className="flex-shrink-0 mr-1.5 h-4 w-4 text-slate-400" />
                        <span className="truncate max-w-xs">{shipment.delivery_address}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                       <div className="flex items-center">
                        <Calendar className="flex-shrink-0 mr-1.5 h-4 w-4 text-slate-400" />
                        {new Date(shipment.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link to={`/shipments/${shipment.id}`} className="text-blue-600 hover:text-blue-900 transition-colors">
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ShipmentList;
