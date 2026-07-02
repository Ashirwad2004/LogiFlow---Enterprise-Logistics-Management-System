import React, { useState, useEffect } from 'react';
import api from '../../core/api';
import { Receipt, CreditCard, ExternalLink, Download, Loader2, Printer, Check, X } from 'lucide-react';

interface Invoice {
  id: string;
  invoice_number: string;
  total_amount: number;
  status: string;
  issued_at: string;
  shipment_id: string;
}

const InvoicesList: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Payment states
  const [payingInvoiceId, setPayingInvoiceId] = useState('');
  
  // Invoice detail modal state (PDF view)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [invoiceShipment, setInvoiceShipment] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const fetchInvoices = async () => {
    try {
      const response = await api.get('/billing/invoices');
      setInvoices(response.data);
    } catch (error) {
      console.error('Failed to fetch invoices', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handlePay = async (invoiceId: string, amount: number) => {
    setPayingInvoiceId(invoiceId);
    try {
      await api.post('/billing/payments', {
        invoice_id: invoiceId,
        amount: amount,
        payment_method: 'credit_card',
        status: 'completed'
      });
      // Re-fetch list
      await fetchInvoices();
    } catch (error) {
      console.error('Payment failed', error);
    } finally {
      setPayingInvoiceId('');
    }
  };

  const handleViewDetails = async (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setLoadingDetails(true);
    setInvoiceShipment(null);
    try {
      const response = await api.get(`/shipments/${invoice.shipment_id}`);
      setInvoiceShipment(response.data);
    } catch (error) {
      console.error('Failed to fetch linked shipment', error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid': return 'bg-green-100 text-green-800 border-green-200';
      case 'unpaid': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'overdue': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Invoices</h1>
          <p className="text-sm text-slate-500 mt-1">Manage billing and view payment statuses.</p>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white shadow-sm border border-slate-200 rounded-xl overflow-hidden print:hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Invoice #</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date Issued</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-500">
                    <div className="flex justify-center items-center space-x-2">
                      <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <span>Loading invoices...</span>
                    </div>
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-500">
                    <div className="flex flex-col items-center">
                      <Receipt className="w-10 h-10 text-slate-300 mb-3" />
                      <p>No invoices generated yet.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                invoices.map(invoice => (
                  <tr key={invoice.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm font-medium text-slate-900">
                        <Receipt className="mr-2 h-4 w-4 text-slate-400" />
                        {invoice.invoice_number}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">Shipment: {invoice.shipment_id.substring(0,8)}...</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-slate-900">${invoice.total_amount.toFixed(2)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {new Date(invoice.issued_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${getStatusColor(invoice.status)}`}>
                        {invoice.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {invoice.status.toLowerCase() === 'unpaid' ? (
                        <button 
                          onClick={() => handlePay(invoice.id, invoice.total_amount)}
                          disabled={payingInvoiceId === invoice.id}
                          className="text-blue-600 hover:text-blue-900 mr-4 inline-flex items-center disabled:opacity-50 cursor-pointer"
                        >
                          {payingInvoiceId === invoice.id ? (
                            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          ) : (
                            <CreditCard className="w-4 h-4 mr-1" />
                          )}
                          Pay
                        </button>
                      ) : (
                        <span className="text-emerald-600 mr-4 inline-flex items-center text-xs font-semibold">
                          <Check className="w-4 h-4 mr-0.5" /> Paid
                        </span>
                      )}
                      
                      <button 
                        onClick={() => handleViewDetails(invoice)}
                        className="text-slate-600 hover:text-slate-900 inline-flex items-center cursor-pointer"
                      >
                        <Download className="w-4 h-4 mr-1" />
                        View PDF
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Detail Modal (PDF simulation) */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in print:bg-white print:p-0 print:static print:h-auto">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-scale-in print:shadow-none print:border-none print:max-w-none">
            {/* Modal Controls */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center print:hidden">
              <h3 className="text-lg font-bold text-slate-800 flex items-center">
                <Receipt className="w-5 h-5 mr-2 text-slate-500" /> GST Invoice Receipt
              </h3>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-3.5 py-2 border border-slate-350 hover:bg-slate-100 text-slate-700 font-semibold text-sm rounded-lg transition-colors inline-flex items-center cursor-pointer"
                >
                  <Printer className="w-4 h-4 mr-1.5" />
                  Print / Save PDF
                </button>
                <button 
                  type="button"
                  onClick={() => setSelectedInvoice(null)}
                  className="p-2 border border-transparent rounded-lg hover:bg-slate-200 text-slate-500 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Invoice Print Layout */}
            {loadingDetails ? (
              <div className="p-16 text-center text-slate-500 flex justify-center items-center space-x-2">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                <span>Generating invoice document...</span>
              </div>
            ) : (
              <div className="p-8 space-y-8 font-sans">
                {/* Header branding */}
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-black text-blue-600 tracking-tight">LogiFlow</h2>
                    <p className="text-xs text-slate-500 mt-1">Enterprise Logistics Solutions</p>
                  </div>
                  <div className="text-right">
                    <span className={`px-2.5 py-1 text-xs font-bold uppercase rounded border ${getStatusColor(selectedInvoice.status)}`}>
                      {selectedInvoice.status}
                    </span>
                    <p className="text-xs text-slate-500 mt-2">Issued on: {new Date(selectedInvoice.issued_at).toLocaleDateString()}</p>
                  </div>
                </div>

                {/* Addresses */}
                <div className="grid grid-cols-2 gap-8 border-t border-slate-100 pt-6">
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Billed By</h4>
                    <p className="text-sm font-bold text-slate-800">LogiFlow Enterprise</p>
                    <p className="text-xs text-slate-600 mt-1">100 Logistics Tech Way</p>
                    <p className="text-xs text-slate-600">Mumbai, Maharashtra - 400001</p>
                    <p className="text-xs text-slate-600 mt-1 font-semibold">GSTIN: 27AAAAA1111A1Z1</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Billed To</h4>
                    <p className="text-sm font-bold text-slate-800">{invoiceShipment?.customer_name || 'Acme Customer'}</p>
                    <p className="text-xs text-slate-600 mt-1">{invoiceShipment?.pickup_address || 'Pickup Warehouse'}</p>
                    <p className="text-xs text-slate-600">Shipment Ref: #{selectedInvoice.shipment_id.substring(0,8)}</p>
                  </div>
                </div>

                {/* Details list */}
                <div className="border-t border-slate-100 pt-6">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Shipment Details</h4>
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-500 pb-2">
                        <th className="text-left font-semibold pb-2">Milestone / Description</th>
                        <th className="text-right font-semibold pb-2">Tracking #</th>
                        <th className="text-right font-semibold pb-2">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-slate-100">
                        <td className="py-4">
                          <p className="font-semibold text-slate-800">Standard Freight Cargo Delivery</p>
                          <p className="text-xs text-slate-500 mt-0.5">Route: {invoiceShipment?.pickup_address} &rarr; {invoiceShipment?.delivery_address}</p>
                        </td>
                        <td className="py-4 text-right font-mono text-xs">{invoiceShipment?.tracking_number}</td>
                        <td className="py-4 text-right font-medium">${(selectedInvoice.total_amount / 1.18).toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Calculations summary */}
                <div className="flex justify-end pt-4">
                  <div className="w-64 space-y-2.5 text-sm">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal:</span>
                      <span>${(selectedInvoice.total_amount / 1.18).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>GST (18%):</span>
                      <span>${(selectedInvoice.total_amount - (selectedInvoice.total_amount / 1.18)).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-base font-bold text-slate-900 border-t border-slate-100 pt-2.5">
                      <span>Total Amount:</span>
                      <span>${selectedInvoice.total_amount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Receipt footer */}
                <div className="border-t border-slate-100 pt-6 text-center text-xs text-slate-400">
                  <p>Thank you for choosing LogiFlow. For any questions, contact accounting@logiflow.com.</p>
                  <p className="mt-1 font-semibold text-slate-500">This is a computer-generated tax invoice receipt.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoicesList;
