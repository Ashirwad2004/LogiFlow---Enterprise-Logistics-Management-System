import React, { useState, useEffect } from 'react';
import api from '../../core/api';
import { 
  Receipt, 
  CreditCard, 
  Download, 
  Loader2, 
  Printer, 
  Check, 
  X, 
  TrendingUp, 
  DollarSign, 
  Calendar, 
  FileText, 
  Clock,
  BarChart3
} from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState<'ledger' | 'reports'>('ledger');
  
  // Payment states
  const [payingInvoiceId, setPayingInvoiceId] = useState('');
  
  // Invoice detail modal state (PDF view)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [invoiceShipment, setInvoiceShipment] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const [company, setCompany] = useState<any>(null);

  // Reports state
  const [reportsData, setReportsData] = useState<any>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loadingReports, setLoadingReports] = useState(false);

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

  const fetchProfileAndCompany = async () => {
    try {
      const response = await api.get('/auth/me');
      setCompany(response.data.company);
    } catch (error) {
      console.error('Failed to fetch user company details', error);
    }
  };

  const fetchReports = async () => {
    setLoadingReports(true);
    try {
      const params: any = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      const response = await api.get('/billing/reports', { params });
      setReportsData(response.data);
    } catch (err) {
      console.error('Failed to fetch billing reports', err);
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
    fetchProfileAndCompany();
  }, []);

  useEffect(() => {
    if (activeTab === 'reports') {
      fetchReports();
    }
  }, [activeTab, startDate, endDate]);

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
      if (activeTab === 'reports') {
        await fetchReports();
      }
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

  const handleDownloadPDF = async (invoiceId: string, invoiceNumber: string) => {
    try {
      const response = await api.get(`/billing/invoices/${invoiceId}/pdf`, {
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice-${invoiceNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download invoice PDF', error);
    }
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
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Billing & Accounts</h1>
          <p className="text-sm text-slate-500 mt-1">Manage billing ledger invoices, GST collections, and revenue dashboards.</p>
        </div>

        {/* Tab switcher */}
        <div className="bg-slate-105 p-1 rounded-lg border border-slate-200 flex">
          <button
            onClick={() => setActiveTab('ledger')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center ${activeTab === 'ledger' ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-800 border border-transparent'}`}
          >
            <FileText className="w-3.5 h-3.5 mr-1.5" />
            Invoice Ledger
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center ${activeTab === 'reports' ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-800 border border-transparent'}`}
          >
            <BarChart3 className="w-3.5 h-3.5 mr-1.5" />
            Tax & Revenue Reports
          </button>
        </div>
      </div>

      {activeTab === 'ledger' ? (
        /* Tab 1: Invoice Table */
        <div className="bg-white shadow-sm border border-slate-200 rounded-xl overflow-hidden print:hidden animate-fade-in">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 font-semibold text-slate-500 uppercase tracking-wider text-xs border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5 text-left">Invoice #</th>
                  <th className="px-6 py-3.5 text-left">Amount</th>
                  <th className="px-6 py-3.5 text-left">Date Issued</th>
                  <th className="px-6 py-3.5 text-left">Status</th>
                  <th className="relative px-6 py-3.5"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200 text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-slate-500">
                      <div className="flex justify-center items-center space-x-2">
                        <Loader2 className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        <span>Loading invoices...</span>
                      </div>
                    </td>
                  </tr>
                ) : invoices.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center py-6">
                        <Receipt className="w-12 h-12 text-slate-350 mb-3" />
                        <p className="font-semibold text-slate-800">No invoices generated yet.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  invoices.map(invoice => (
                    <tr key={invoice.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center font-bold text-slate-900">
                          <Receipt className="mr-2 h-4 w-4 text-slate-400" />
                          {invoice.invoice_number}
                        </div>
                        <div className="text-xs text-slate-450 mt-1">Shipment: {invoice.shipment_id.substring(0,8)}...</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-900">${invoice.total_amount.toFixed(2)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-500">
                        {new Date(invoice.issued_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${getStatusColor(invoice.status)}`}>
                          {invoice.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right font-medium space-x-4">
                        {invoice.status.toLowerCase() === 'unpaid' ? (
                          <button 
                            onClick={() => handlePay(invoice.id, invoice.total_amount)}
                            disabled={payingInvoiceId === invoice.id}
                            className="text-blue-600 hover:text-blue-900 inline-flex items-center disabled:opacity-50 cursor-pointer"
                          >
                            {payingInvoiceId === invoice.id ? (
                              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                            ) : (
                              <CreditCard className="w-4 h-4 mr-1" />
                            )}
                            Pay
                          </button>
                        ) : (
                          <span className="text-emerald-600 inline-flex items-center text-xs font-semibold">
                            <Check className="w-4 h-4 mr-0.5" /> Paid
                          </span>
                        )}
                        
                        <button 
                          onClick={() => handleViewDetails(invoice)}
                          className="text-slate-650 hover:text-slate-900 inline-flex items-center cursor-pointer"
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
      ) : (
        /* Tab 2: Financial Reports */
        <div className="space-y-6 animate-fade-in">
          {/* Date Filter Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap gap-4 items-center">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-2">Filter Reports:</span>
            
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            
            <span className="text-slate-400 text-xs">to</span>
            
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {(startDate || endDate) && (
              <button
                onClick={() => { setStartDate(''); setEndDate(''); }}
                className="text-xs text-rose-600 hover:underline cursor-pointer"
              >
                Clear Dates
              </button>
            )}
          </div>

          {loadingReports ? (
            <div className="p-16 text-center text-slate-500 flex justify-center items-center space-x-2 bg-white rounded-xl border border-slate-200">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <span>Calculating tax ledger reports...</span>
            </div>
          ) : reportsData ? (
            <div className="space-y-6">
              {/* Stat Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Gross Revenue */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex items-center space-x-4">
                  <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="block text-2xs font-extrabold text-slate-400 uppercase">Gross Revenue</span>
                    <span className="text-xl font-bold text-slate-900 mt-1 block">
                      ${reportsData.gross_revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Accounts Receivable */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex items-center space-x-4">
                  <div className="p-3 bg-amber-50 rounded-lg text-amber-600">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="block text-2xs font-extrabold text-slate-400 uppercase">Receivables</span>
                    <span className="text-xl font-bold text-slate-900 mt-1 block">
                      ${reportsData.pending_receivables.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* GST Tax Collected */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex items-center space-x-4">
                  <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
                    <DollarSign className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="block text-2xs font-extrabold text-slate-400 uppercase">Tax Liabilities (GST)</span>
                    <span className="text-xl font-bold text-slate-900 mt-1 block">
                      ${reportsData.tax_collected.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Discounts given */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex items-center space-x-4">
                  <div className="p-3 bg-slate-50 rounded-lg text-slate-500">
                    <Receipt className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="block text-2xs font-extrabold text-slate-400 uppercase">Discounts Given</span>
                    <span className="text-xl font-bold text-slate-900 mt-1 block">
                      ${reportsData.discounts_given.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Monthly Collections Chart & Table */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* SVG Revenue Chart */}
                <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Monthly Collections Chart</h4>
                  
                  {reportsData.monthly_trend && reportsData.monthly_trend.length > 0 ? (
                    <div className="h-64 flex items-end justify-around border-b border-l border-slate-200 pb-4 pt-6 pl-2">
                      {reportsData.monthly_trend.map((t: any, i: number) => {
                        const maxRev = Math.max(...reportsData.monthly_trend.map((m: any) => m.revenue), 1000);
                        const pct = (t.revenue / maxRev) * 80;
                        return (
                          <div key={i} className="flex flex-col items-center w-16 group relative">
                            {/* Bar Tooltip */}
                            <div className="absolute -top-10 scale-0 group-hover:scale-100 transition-transform bg-slate-900 text-white text-[10px] py-1 px-2 rounded shadow-xs z-20 text-center font-mono font-bold whitespace-nowrap">
                              Rev: ${t.revenue.toFixed(0)}<br/>Tax: ${t.tax.toFixed(0)}
                            </div>
                            {/* Revenue Bar */}
                            <div 
                              style={{ height: `${Math.max(pct, 5)}%` }} 
                              className="w-8 bg-blue-600 hover:bg-blue-700 rounded-t transition-all shadow-xs" 
                            />
                            <span className="text-[10px] font-bold text-slate-500 mt-2 font-mono whitespace-nowrap">{t.month}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-slate-400 italic text-xs">
                      No monthly collections history found for date filters.
                    </div>
                  )}
                </div>

                {/* Tax Ledger table */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Tax Liabilities Ledger</h4>
                  
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-xs text-left">
                      <thead>
                        <tr className="border-b border-slate-150 text-slate-500 font-bold uppercase pb-1 flex justify-between">
                          <th className="pb-2">Month</th>
                          <th className="pb-2 text-right">Tax (GST)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 block max-h-56 overflow-y-auto w-full">
                        {reportsData.monthly_trend && reportsData.monthly_trend.length > 0 ? (
                          reportsData.monthly_trend.map((t: any, i: number) => (
                            <tr key={i} className="py-2.5 flex justify-between items-center hover:bg-slate-50/50">
                              <td className="font-semibold text-slate-700">{t.month}</td>
                              <td className="font-mono font-bold text-slate-900">${t.tax.toFixed(2)}</td>
                            </tr>
                          ))
                        ) : (
                          <tr className="py-4 text-center text-slate-400 italic block">
                            <td>No tax history log.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-center text-slate-400 italic py-10">No report metrics loaded.</p>
          )}
        </div>
      )}

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
                  onClick={() => handleDownloadPDF(selectedInvoice.id, selectedInvoice.invoice_number)}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg shadow-sm transition-colors inline-flex items-center cursor-pointer"
                >
                  <Download className="w-4 h-4 mr-1.5" />
                  Download PDF
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-3.5 py-2 border border-slate-350 hover:bg-slate-100 text-slate-700 font-semibold text-sm rounded-lg transition-colors inline-flex items-center cursor-pointer"
                >
                  <Printer className="w-4 h-4 mr-1.5" />
                  Print Page
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
            ) : (() => {
              const taxRateFloat = company?.tax_rate ? parseFloat(company.tax_rate) : 18.0;
              const subtotal = selectedInvoice.total_amount / (1 + (taxRateFloat / 100));
              const taxAmount = selectedInvoice.total_amount - subtotal;
              
              return (
                <div className="p-8 space-y-8 font-sans">
                  {/* Header branding */}
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-2xl font-black text-blue-600 tracking-tight">
                        {company?.name || 'LogiFlow'}
                      </h2>
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
                      <p className="text-sm font-bold text-slate-800">{company?.legal_name || company?.name || 'LogiFlow Enterprise'}</p>
                      <p className="text-xs text-slate-600 mt-1 whitespace-pre-line">{company?.address || '100 Logistics Tech Way\nMumbai, Maharashtra - 400001'}</p>
                      {company?.gst_number && <p className="text-xs text-slate-600 mt-1 font-semibold">GSTIN: {company.gst_number}</p>}
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
                          <td className="py-4 text-right font-medium">${subtotal.toFixed(2)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Calculations summary */}
                  <div className="flex justify-end pt-4">
                    <div className="w-64 space-y-2.5 text-sm">
                      <div className="flex justify-between text-slate-600">
                        <span>Subtotal:</span>
                        <span>${subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>GST ({taxRateFloat}%):</span>
                        <span>${taxAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-base font-bold text-slate-900 border-t border-slate-100 pt-2.5">
                        <span>Total Amount:</span>
                        <span>${selectedInvoice.total_amount.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Receipt footer */}
                  <div className="border-t border-slate-100 pt-6 text-center text-xs text-slate-400">
                    <p>Thank you for choosing {company?.name || 'LogiFlow'}. For any questions, contact {company?.support_email || 'support@logiflow.com'}.</p>
                    <p className="mt-1 font-semibold text-slate-500">This is a computer-generated tax invoice receipt.</p>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoicesList;
