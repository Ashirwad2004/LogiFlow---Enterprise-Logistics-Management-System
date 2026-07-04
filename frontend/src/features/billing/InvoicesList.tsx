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
  BarChart3,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Coins
} from 'lucide-react';

interface Invoice {
  id: string;
  invoice_number: string;
  total_amount: number;
  outstanding_balance: number;
  status: string;
  issued_at: string;
  shipment_id: string;
}

interface UnbilledShipment {
  id: string;
  tracking_number: string;
  pickup_address: string;
  delivery_address: string;
  actual_delivery: string | null;
  customer_name: string;
  items_count: number;
  total_weight: number;
}

const InvoicesList: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ledger' | 'reports'>('ledger');
  
  // Unbilled shipments
  const [unbilledShipments, setUnbilledShipments] = useState<UnbilledShipment[]>([]);
  const [loadingUnbilled, setLoadingUnbilled] = useState(false);
  const [generatingInvoiceId, setGeneratingInvoiceId] = useState('');
  
  // Custom Payment modal states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('credit_card');
  const [paymentReference, setPaymentReference] = useState('');
  const [recordingPayment, setRecordingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  
  // Invoice detail modal state (PDF view)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [invoiceShipment, setInvoiceShipment] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [company, setCompany] = useState<any>(null);
  
  const currencySymbol = company?.currency === 'INR' ? '₹' : '$';

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

  const fetchUnbilledShipments = async () => {
    setLoadingUnbilled(true);
    try {
      const response = await api.get('/billing/invoices/unbilled-shipments');
      setUnbilledShipments(response.data);
    } catch (err) {
      console.error('Failed to fetch unbilled shipments', err);
    } finally {
      setLoadingUnbilled(false);
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
    fetchUnbilledShipments();
  }, []);

  useEffect(() => {
    if (activeTab === 'reports') {
      fetchReports();
    }
  }, [activeTab, startDate, endDate]);

  const handleGenerateInvoice = async (shipmentId: string) => {
    setGeneratingInvoiceId(shipmentId);
    try {
      await api.post(`/billing/invoices/generate/${shipmentId}`);
      await fetchInvoices();
      await fetchUnbilledShipments();
      if (activeTab === 'reports') {
        await fetchReports();
      }
    } catch (err) {
      console.error('Failed to generate invoice', err);
    } finally {
      setGeneratingInvoiceId('');
    }
  };

  const openPaymentModal = (invoice: Invoice) => {
    setPaymentInvoice(invoice);
    setPaymentAmount(invoice.outstanding_balance.toFixed(2));
    setPaymentMethod('credit_card');
    setPaymentReference('');
    setPaymentError('');
    setShowPaymentModal(true);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentInvoice) return;
    
    const amountVal = parseFloat(paymentAmount);
    if (isNaN(amountVal) || amountVal <= 0) {
      setPaymentError('Payment amount must be greater than zero.');
      return;
    }
    
    if (amountVal > paymentInvoice.outstanding_balance) {
      setPaymentError(`Payment amount cannot exceed outstanding balance (${currencySymbol}${paymentInvoice.outstanding_balance.toFixed(2)}).`);
      return;
    }

    setRecordingPayment(true);
    setPaymentError('');
    try {
      await api.post('/billing/payments', {
        invoice_id: paymentInvoice.id,
        amount: amountVal,
        payment_method: paymentMethod,
        transaction_reference: paymentReference || null,
        status: 'completed'
      });
      
      setShowPaymentModal(false);
      setPaymentInvoice(null);
      setPaymentAmount('');
      
      // Re-fetch list
      await fetchInvoices();
      await fetchUnbilledShipments();
      if (activeTab === 'reports') {
        await fetchReports();
      }
    } catch (error: any) {
      console.error('Payment registration failed', error);
      setPaymentError(error.response?.data?.detail || 'Failed to record payment transaction.');
    } finally {
      setRecordingPayment(false);
    }
  };

  const handleViewDetails = async (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setLoadingDetails(true);
    setInvoiceShipment(null);
    setPaymentHistory([]);
    setLoadingHistory(true);
    try {
      const response = await api.get(`/shipments/${invoice.shipment_id}`);
      setInvoiceShipment(response.data);
      
      const payResponse = await api.get(`/billing/payments/${invoice.id}`);
      setPaymentHistory(payResponse.data);
    } catch (error) {
      console.error('Failed to fetch linked shipment', error);
    } finally {
      setLoadingDetails(false);
      setLoadingHistory(false);
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
      case 'paid': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'partially_paid': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'unpaid': return 'bg-amber-100 text-amber-800 border-amber-250';
      case 'overdue': return 'bg-rose-100 text-rose-800 border-rose-250';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getMethodLabel = (method: string) => {
    switch (method) {
      case 'credit_card': return 'Credit Card';
      case 'bank_transfer': return 'Bank Transfer';
      case 'cash': return 'Cash';
      case 'upi': return 'UPI / QR Code';
      default: return method.toUpperCase();
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
        /* Tab 1: Invoice Table & Unbilled Shipments */
        <div className="space-y-6 print:hidden">
          {/* Unbilled Action Items */}
          {unbilledShipments.length > 0 && (
            <div className="bg-amber-50/50 border border-amber-250 rounded-xl p-5 shadow-2xs space-y-4">
              <div className="flex items-center space-x-2">
                <Coins className="w-5 h-5 text-amber-600 animate-pulse animate-bounce" />
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Unbilled Shipments ({unbilledShipments.length})</h3>
              </div>
              <p className="text-xs text-slate-600 -mt-2">The following shipments have been successfully delivered but have not been invoiced yet.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {unbilledShipments.map((s) => (
                  <div key={s.id} className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col justify-between space-y-3 shadow-3xs hover:border-amber-300 transition-colors">
                    <div>
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-slate-900 text-sm font-mono">{s.tracking_number}</span>
                        <span className="text-2xs font-extrabold text-slate-450 bg-slate-100 py-0.5 px-1.5 rounded">{s.total_weight} kg</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1.5 font-semibold">Client: {s.customer_name}</p>
                      <p className="text-2xs text-slate-400 mt-1 truncate">Route: {s.pickup_address.split(',')[0]} &rarr; {s.delivery_address.split(',')[0]}</p>
                      {s.actual_delivery && (
                        <p className="text-2xs text-slate-450 mt-1 flex items-center font-medium">
                          <Check className="w-3 h-3 text-emerald-500 mr-1" /> Delivered: {new Date(s.actual_delivery).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleGenerateInvoice(s.id)}
                      disabled={generatingInvoiceId === s.id}
                      className="w-full text-center py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-md shadow-3xs transition-colors cursor-pointer flex items-center justify-center"
                    >
                      {generatingInvoiceId === s.id ? (
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      ) : (
                        <Receipt className="w-3.5 h-3.5 mr-1.5" />
                      )}
                      Draft & Issue Invoice
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Invoices List Table */}
          <div className="bg-white shadow-sm border border-slate-200 rounded-xl overflow-hidden animate-fade-in">
            <div className="px-5 py-4 border-b border-slate-150 flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Invoice Ledger Log</h3>
              {loadingUnbilled && <Loader2 className="w-4 h-4 animate-spin text-blue-600" />}
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 font-semibold text-slate-500 uppercase tracking-wider text-xs border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3.5 text-left">Invoice #</th>
                    <th className="px-6 py-3.5 text-left">Billed Amount</th>
                    <th className="px-6 py-3.5 text-left">Outstanding Due</th>
                    <th className="px-6 py-3.5 text-left">Date Issued</th>
                    <th className="px-6 py-3.5 text-left">Status</th>
                    <th className="relative px-6 py-3.5"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200 text-slate-700">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-slate-500">
                        <div className="flex justify-center items-center space-x-2">
                          <Loader2 className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                          <span>Loading invoices...</span>
                        </div>
                      </td>
                    </tr>
                  ) : invoices.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                        <div className="flex flex-col items-center py-6">
                          <Receipt className="w-12 h-12 text-slate-300 mb-3" />
                          <p className="font-semibold text-slate-850">No invoices generated yet.</p>
                          <p className="text-xs text-slate-400 mt-1">Delivered shipments will appear here when billed.</p>
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
                          <div className="text-xs text-slate-450 mt-1 font-mono">Shipment: {invoice.shipment_id.substring(0,8)}...</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-bold text-slate-850">{currencySymbol}{invoice.total_amount.toFixed(2)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`font-extrabold ${invoice.outstanding_balance > 0 ? 'text-slate-800' : 'text-slate-400'}`}>
                            {currencySymbol}{invoice.outstanding_balance.toFixed(2)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-slate-500 font-medium">
                          {new Date(invoice.issued_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${getStatusColor(invoice.status)}`}>
                            {invoice.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right font-medium space-x-4">
                          {invoice.outstanding_balance > 0 ? (
                            <button 
                              onClick={() => openPaymentModal(invoice)}
                              className="text-blue-650 hover:text-blue-900 inline-flex items-center cursor-pointer font-bold"
                            >
                              <CreditCard className="w-4 h-4 mr-1" />
                              Pay
                            </button>
                          ) : (
                            <span className="text-emerald-600 inline-flex items-center text-xs font-semibold">
                              <Check className="w-4 h-4 mr-0.5" /> Fully Paid
                            </span>
                          )}
                          
                          <button 
                            onClick={() => handleViewDetails(invoice)}
                            className="text-slate-650 hover:text-slate-900 inline-flex items-center cursor-pointer"
                          >
                            <Download className="w-4 h-4 mr-1" />
                            Details
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Tab 2: Financial Reports */
        <div className="space-y-6 animate-fade-in print:hidden">
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
                className="text-xs text-rose-650 hover:underline cursor-pointer"
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
                    <span className="block text-2xs font-extrabold text-slate-405 uppercase">Gross Revenue</span>
                    <span className="text-xl font-bold text-slate-900 mt-1 block">
                      {currencySymbol}{reportsData.gross_revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Accounts Receivable */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex items-center space-x-4">
                  <div className="p-3 bg-amber-50 rounded-lg text-amber-600">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="block text-2xs font-extrabold text-slate-405 uppercase">Receivables</span>
                    <span className="text-xl font-bold text-slate-900 mt-1 block">
                      {currencySymbol}{reportsData.pending_receivables.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* GST Tax Collected */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex items-center space-x-4">
                  <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
                    <DollarSign className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="block text-2xs font-extrabold text-slate-405 uppercase">Tax Liabilities (GST)</span>
                    <span className="text-xl font-bold text-slate-900 mt-1 block">
                      {currencySymbol}{reportsData.tax_collected.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Discounts given */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex items-center space-x-4">
                  <div className="p-3 bg-slate-50 rounded-lg text-slate-500">
                    <Receipt className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="block text-2xs font-extrabold text-slate-405 uppercase">Discounts Given</span>
                    <span className="text-xl font-bold text-slate-900 mt-1 block">
                      {currencySymbol}{reportsData.discounts_given.toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
                              Rev: {currencySymbol}{t.revenue.toFixed(0)}<br/>Tax: {currencySymbol}{t.tax.toFixed(0)}
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
                    <div className="h-64 flex items-center justify-center text-slate-405 italic text-xs">
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
                              <td className="font-mono font-bold text-slate-900">{currencySymbol}{t.tax.toFixed(2)}</td>
                            </tr>
                          ))
                        ) : (
                          <tr className="py-4 text-center text-slate-400 italic block animate-pulse">
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
            <p className="text-center text-slate-405 italic py-10">No report metrics loaded.</p>
          )}
        </div>
      )}

      {/* Record Payment Modal */}
      {showPaymentModal && paymentInvoice && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in print:hidden">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-scale-in">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-800 flex items-center">
                <CreditCard className="w-5 h-5 mr-2 text-blue-655" /> Record Invoice Payment
              </h3>
              <button 
                type="button" 
                onClick={() => { setShowPaymentModal(false); setPaymentInvoice(null); }}
                className="p-1 border border-transparent rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-650 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="p-6 space-y-4">
              {paymentError && (
                <div className="bg-rose-50 border border-rose-250 text-rose-800 text-xs rounded-lg p-3 flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{paymentError}</span>
                </div>
              )}

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1">
                <p className="text-slate-500">Invoice Number: <span className="font-mono font-bold text-slate-850">{paymentInvoice.invoice_number}</span></p>
                <p className="text-slate-505">Total Billable: <span className="font-bold text-slate-850">{currencySymbol}{paymentInvoice.total_amount.toFixed(2)}</span></p>
                <p className="text-slate-505">Outstanding Balance: <span className="font-bold text-blue-600">{currencySymbol}{paymentInvoice.outstanding_balance.toFixed(2)}</span></p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Payment Amount ({currencySymbol})</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={paymentInvoice.outstanding_balance}
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="mt-1 block w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="mt-1 block w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-blue-500"
                >
                  <option value="credit_card">Credit/Debit Card</option>
                  <option value="bank_transfer">Direct Bank Transfer</option>
                  <option value="upi">UPI / GPay / PhonePe</option>
                  <option value="cash">Petty Cash</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Transaction Reference ID (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. TXN-1902830198"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  className="mt-1 block w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-blue-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => { setShowPaymentModal(false); setPaymentInvoice(null); }}
                  className="px-4 py-2 border border-slate-350 hover:bg-slate-100 rounded-lg text-xs font-bold text-slate-650 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={recordingPayment}
                  className="px-4 py-2 bg-blue-650 hover:bg-blue-750 text-white rounded-lg text-xs font-bold transition-colors inline-flex items-center disabled:opacity-50 cursor-pointer"
                >
                  {recordingPayment && <Loader2 className="animate-spin -ml-1 mr-1.5 h-3.5 w-3.5" />}
                  Submit Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice Detail Modal (PDF simulation) */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in print:bg-white print:p-0 print:static print:h-auto">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-y-auto max-h-[90vh] animate-scale-in print:shadow-none print:border-none print:max-w-none print:max-h-none">
            {/* Modal Controls */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center print:hidden">
              <h3 className="text-lg font-bold text-slate-800 flex items-center">
                <Receipt className="w-5 h-5 mr-2 text-slate-500" /> GST Invoice Receipt
              </h3>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => handleDownloadPDF(selectedInvoice.id, selectedInvoice.invoice_number)}
                  className="px-3.5 py-2 bg-blue-650 hover:bg-blue-750 text-white font-semibold text-sm rounded-lg shadow-sm transition-colors inline-flex items-center cursor-pointer"
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
                        {selectedInvoice.status.replace('_', ' ')}
                      </span>
                      <p className="text-xs text-slate-500 mt-2">Issued on: {new Date(selectedInvoice.issued_at).toLocaleDateString()}</p>
                    </div>
                  </div>

                  {/* Addresses */}
                  <div className="grid grid-cols-2 gap-8 border-t border-slate-100 pt-6">
                    <div>
                      <h4 className="text-xs font-bold text-slate-405 uppercase tracking-wider mb-2">Billed By</h4>
                      <p className="text-sm font-bold text-slate-800">{company?.legal_name || company?.name || 'LogiFlow Enterprise'}</p>
                      <p className="text-xs text-slate-600 mt-1 whitespace-pre-line">{company?.address || '100 Logistics Tech Way\nMumbai, Maharashtra - 400001'}</p>
                      {company?.gst_number && <p className="text-xs text-slate-600 mt-1 font-semibold">GSTIN: {company.gst_number}</p>}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-405 uppercase tracking-wider mb-2">Billed To</h4>
                      <p className="text-sm font-bold text-slate-800">{invoiceShipment?.customer_name || 'Acme Customer'}</p>
                      <p className="text-xs text-slate-600 mt-1 truncate">{invoiceShipment?.pickup_address || 'Pickup Warehouse'}</p>
                      <p className="text-xs text-slate-650 font-semibold mt-1">Shipment Ref: #{selectedInvoice.shipment_id.substring(0,8)}</p>
                    </div>
                  </div>

                  {/* Details list */}
                  <div className="border-t border-slate-100 pt-6">
                    <h4 className="text-xs font-bold text-slate-405 uppercase tracking-wider mb-4">Shipment Details</h4>
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
                            <p className="font-semibold text-slate-800 font-mono">Standard Freight Cargo Delivery</p>
                            <p className="text-xs text-slate-500 mt-1 max-w-sm truncate">Pickup: {invoiceShipment?.pickup_address}</p>
                            <p className="text-xs text-slate-500 max-w-sm truncate">Delivery: {invoiceShipment?.delivery_address}</p>
                          </td>
                          <td className="py-4 text-right font-mono text-xs">{invoiceShipment?.tracking_number}</td>
                          <td className="py-4 text-right font-bold text-slate-800">{currencySymbol}{subtotal.toFixed(2)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Calculations summary & Payment history log */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                    {/* Payments History log */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-slate-405 uppercase tracking-wider flex items-center">
                        <Coins className="w-4 h-4 mr-1 text-slate-505" /> Recorded Transactions
                      </h4>
                      {loadingHistory ? (
                        <div className="flex items-center space-x-1.5 text-xs text-slate-400 py-3">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Loading receipts...</span>
                        </div>
                      ) : paymentHistory.length === 0 ? (
                        <div className="text-xs text-slate-400 italic py-4 bg-slate-50/50 rounded-lg text-center border border-slate-100">
                          No payments registered for this invoice ledger.
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                          {paymentHistory.map((p) => (
                            <div key={p.id} className="bg-slate-50 border border-slate-150 rounded-lg p-2.5 text-2xs flex justify-between items-center hover:bg-slate-100/70 transition-colors">
                              <div>
                                <p className="font-bold text-slate-700">{getMethodLabel(p.payment_method)}</p>
                                {p.transaction_reference && (
                                  <p className="text-slate-450 mt-0.5 font-mono font-semibold">Ref: {p.transaction_reference}</p>
                                )}
                                {p.paid_at && (
                                  <p className="text-slate-450 mt-0.5">{new Date(p.paid_at).toLocaleString()}</p>
                                )}
                              </div>
                              <div className="text-right">
                                <span className="font-extrabold text-slate-900 block text-xs">{currencySymbol}{p.amount.toFixed(2)}</span>
                                <span className={`text-[9px] font-extrabold px-1 rounded uppercase ${p.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>{p.status}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Cost summary table */}
                    <div className="space-y-2.5 text-sm ml-auto w-full max-w-xs">
                      <div className="flex justify-between text-slate-650">
                        <span>Subtotal:</span>
                        <span>{currencySymbol}{subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-slate-655">
                        <span>GST ({taxRateFloat}%):</span>
                        <span>{currencySymbol}{taxAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-base font-bold text-slate-900 border-t border-slate-100 pt-2.5">
                        <span>Total Amount:</span>
                        <span>{currencySymbol}{selectedInvoice.total_amount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm font-bold text-blue-650 bg-blue-50/50 p-2 rounded-lg border border-blue-100">
                        <span>Outstanding Due:</span>
                        <span>{currencySymbol}{selectedInvoice.outstanding_balance.toFixed(2)}</span>
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
