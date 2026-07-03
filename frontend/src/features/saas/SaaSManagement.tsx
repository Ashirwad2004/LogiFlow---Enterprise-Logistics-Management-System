import React, { useState, useEffect } from 'react';
import api from '../../core/api';
import { 
  Building, 
  ShieldAlert, 
  Settings, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  Slash,
  User,
  Clock,
  RefreshCw,
  Mail,
  Loader2,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface Company {
  id: string;
  name: string;
  legal_name: string | null;
  gst_number: string | null;
  subscription_status: string;
  support_email: string | null;
  invoice_prefix: string;
  tax_rate: number;
  address: string | null;
  created_at: string | null;
}

interface AuditLog {
  id: string;
  company_name: string;
  user_name: string;
  user_email: string;
  action: string;
  table_name: string;
  record_id: string | null;
  old_values: any;
  new_values: any;
  ip_address: string | null;
  timestamp: string | null;
}

const SaaSManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'companies' | 'audit' | 'settings'>('companies');
  
  // Data State
  const [companies, setCompanies] = useState<Company[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState('');
  
  // Filters
  const [companySearch, setCompanySearch] = useState('');
  const [auditSearch, setAuditSearch] = useState('');
  
  // Accordion state for Audit logs
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Settings mock state
  const [platformName, setPlatformName] = useState('LogiFlow Cloud');
  const [supportEmail, setSupportEmail] = useState('ops@logiflow.io');
  const [trialDays, setTrialDays] = useState('14');
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const response = await api.get('/saas/companies');
      setCompanies(response.data);
    } catch (err) {
      console.error("Failed to load companies", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const response = await api.get('/saas/audit-logs');
      setAuditLogs(response.data);
    } catch (err) {
      console.error("Failed to load global audit logs", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'companies') {
      fetchCompanies();
    } else if (activeTab === 'audit') {
      fetchAuditLogs();
    }
  }, [activeTab]);

  const handleUpdateSubscription = async (companyId: string, status: string) => {
    setUpdatingId(companyId);
    try {
      await api.put(`/saas/companies/${companyId}/subscription`, {
        subscription_status: status
      });
      await fetchCompanies();
    } catch (err) {
      console.error("Failed to update subscription status", err);
      alert("Failed to update subscription status.");
    } finally {
      setUpdatingId('');
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSaving(true);
    setTimeout(() => {
      setSettingsSaving(false);
      alert("SaaS Platform settings updated successfully.");
    }, 800);
  };

  const toggleExpandLog = (id: string) => {
    setExpandedLogId(expandedLogId === id ? null : id);
  };

  // Filter lists
  const filteredCompanies = companies.filter(c => 
    c.name.toLowerCase().includes(companySearch.toLowerCase()) ||
    (c.legal_name && c.legal_name.toLowerCase().includes(companySearch.toLowerCase()))
  );

  const filteredLogs = auditLogs.filter(log => 
    log.action.toLowerCase().includes(auditSearch.toLowerCase()) ||
    log.company_name.toLowerCase().includes(auditSearch.toLowerCase()) ||
    log.user_name.toLowerCase().includes(auditSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">SaaS Platform Administration</h1>
          <p className="text-sm text-slate-500 mt-1">Monitor multi-tenant metrics, subscription status, and platform audit trails.</p>
        </div>
        <button
          onClick={() => {
            if (activeTab === 'companies') fetchCompanies();
            if (activeTab === 'audit') fetchAuditLogs();
          }}
          className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-slate-600 bg-white"
          title="Refresh Data"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('companies')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'companies' 
              ? 'border-blue-600 text-blue-600' 
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Building className="w-4 h-4" />
            Registered Tenants
          </span>
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'audit' 
              ? 'border-blue-600 text-blue-600' 
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4" />
            Global Audit Ledger
          </span>
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'settings' 
              ? 'border-blue-600 text-blue-600' 
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Settings className="w-4 h-4" />
            SaaS Platform Settings
          </span>
        </button>
      </div>

      {/* Tab Panel contents */}
      {activeTab === 'companies' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search tenant company name or legal entity..."
                value={companySearch}
                onChange={(e) => setCompanySearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm bg-slate-50/50 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition-colors"
              />
            </div>
            <div className="text-xs text-slate-400 self-center">
              Total: {filteredCompanies.length} tenants registered
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {loading && companies.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
                <p className="text-sm">Loading tenants...</p>
              </div>
            ) : filteredCompanies.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Company</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Legal Details</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Created On</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Subscription Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100 text-slate-700">
                    {filteredCompanies.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/30">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-900">{c.name}</div>
                          <div className="text-[11px] text-slate-450 font-mono select-all">{c.id}</div>
                        </td>
                        <td className="px-6 py-4 text-xs space-y-0.5">
                          {c.legal_name && <div className="font-semibold text-slate-800">{c.legal_name}</div>}
                          {c.gst_number && <div className="text-slate-500">GST: {c.gst_number}</div>}
                          {c.support_email && (
                            <div className="text-blue-600 flex items-center gap-1 mt-1">
                              <Mail className="w-3 h-3" />
                              {c.support_email}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                            c.subscription_status === 'active'
                              ? 'bg-green-50 text-green-700 border-green-150'
                              : c.subscription_status === 'suspended'
                              ? 'bg-red-50 text-red-700 border-red-150'
                              : 'bg-yellow-50 text-yellow-700 border-yellow-150'
                          }`}>
                            {c.subscription_status.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-500">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {c.created_at ? new Date(c.created_at).toLocaleDateString() : 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="inline-flex gap-1.5">
                            <button
                              onClick={() => handleUpdateSubscription(c.id, 'trial')}
                              disabled={updatingId === c.id || c.subscription_status === 'trial'}
                              className={`px-2.5 py-1 text-xs font-semibold rounded-md border transition-colors ${
                                c.subscription_status === 'trial'
                                  ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                                  : 'bg-white hover:bg-slate-50 text-yellow-700 border-yellow-200 hover:border-yellow-350 cursor-pointer'
                              }`}
                            >
                              Trial
                            </button>
                            <button
                              onClick={() => handleUpdateSubscription(c.id, 'active')}
                              disabled={updatingId === c.id || c.subscription_status === 'active'}
                              className={`px-2.5 py-1 text-xs font-semibold rounded-md border transition-colors ${
                                c.subscription_status === 'active'
                                  ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                                  : 'bg-white hover:bg-slate-50 text-green-700 border-green-200 hover:border-green-350 cursor-pointer'
                              }`}
                            >
                              Activate
                            </button>
                            <button
                              onClick={() => handleUpdateSubscription(c.id, 'suspended')}
                              disabled={updatingId === c.id || c.subscription_status === 'suspended'}
                              className={`px-2.5 py-1 text-xs font-semibold rounded-md border transition-colors ${
                                c.subscription_status === 'suspended'
                                  ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                                  : 'bg-white hover:bg-red-50 text-red-700 border-red-200 hover:border-red-350 cursor-pointer'
                              }`}
                            >
                              Suspend
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400 text-sm">
                No registered tenant companies match your search criteria.
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by action, tenant name, or operator..."
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm bg-slate-50/50 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition-colors"
              />
            </div>
            <div className="text-xs text-slate-400 self-center">
              Displaying last 100 system audit transactions
            </div>
          </div>

          {/* Audit Timeline */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {loading && auditLogs.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
                <p className="text-sm">Loading SaaS ledger...</p>
              </div>
            ) : filteredLogs.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Tenant</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Operator</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Action</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Database Entity</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Timestamp</th>
                      <th className="relative px-6 py-3"><span className="sr-only">Details</span></th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100 text-slate-700">
                    {filteredLogs.map((log) => {
                      const isExpanded = expandedLogId === log.id;
                      return (
                        <React.Fragment key={log.id}>
                          <tr 
                            onClick={() => toggleExpandLog(log.id)}
                            className="hover:bg-slate-50/40 cursor-pointer transition-colors"
                          >
                            <td className="px-6 py-4 font-bold text-slate-800 text-xs">
                              {log.company_name}
                            </td>
                            <td className="px-6 py-4">
                              <div className="font-semibold text-slate-900 text-xs">{log.user_name}</div>
                              <div className="text-[10px] text-slate-450">{log.user_email}</div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-800 text-[10px] font-mono rounded-md">
                                {log.action}
                              </span>
                            </td>
                            <td className="px-6 py-4 font-semibold text-slate-600 text-xs font-mono">
                              {log.table_name}
                            </td>
                            <td className="px-6 py-4 text-xs text-slate-500">
                              {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}
                            </td>
                            <td className="px-6 py-4 text-right">
                              {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-450" /> : <ChevronDown className="w-4 h-4 text-slate-440" />}
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr className="bg-slate-50/50">
                              <td colSpan={6} className="px-8 py-4 border-t border-b border-slate-100">
                                <div className="space-y-3">
                                  <div className="flex justify-between items-center text-xs border-b border-slate-200 pb-2">
                                    <span className="font-bold text-slate-700">IP Address: <span className="font-mono font-normal text-slate-500">{log.ip_address || 'Internal/Local'}</span></span>
                                    <span className="font-bold text-slate-700">Record ID: <span className="font-mono font-normal text-slate-500">{log.record_id || 'N/A'}</span></span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <div className="text-[10px] font-bold text-slate-450 uppercase mb-1">Old State Values</div>
                                      <pre className="bg-white border border-slate-200 rounded-lg p-2.5 text-[10px] font-mono max-h-40 overflow-y-auto whitespace-pre-wrap select-all">
                                        {log.old_values ? JSON.stringify(log.old_values, null, 2) : 'None'}
                                      </pre>
                                    </div>
                                    <div>
                                      <div className="text-[10px] font-bold text-slate-450 uppercase mb-1">New State Values</div>
                                      <pre className="bg-white border border-slate-200 rounded-lg p-2.5 text-[10px] font-mono max-h-40 overflow-y-auto whitespace-pre-wrap select-all">
                                        {log.new_values ? JSON.stringify(log.new_values, null, 2) : 'None'}
                                      </pre>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400 text-sm">
                No system audit records match your filters.
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="max-w-2xl bg-white border border-slate-200 rounded-xl shadow-sm p-6">
          <h3 className="text-base font-bold text-slate-800 flex items-center border-b border-slate-100 pb-3 mb-5">
            <Settings className="w-5 h-5 text-blue-500 mr-2" />
            Global Platform Settings
          </h3>
          
          <form onSubmit={handleSaveSettings} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Platform Brand Name</label>
                <input
                  type="text"
                  required
                  value={platformName}
                  onChange={(e) => setPlatformName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-350 rounded-lg text-sm bg-slate-50/30 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Support Operations Email</label>
                <input
                  type="email"
                  required
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-350 rounded-lg text-sm bg-slate-50/30 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Trial Period (Days)</label>
                <input
                  type="number"
                  required
                  value={trialDays}
                  onChange={(e) => setTrialDays(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-350 rounded-lg text-sm bg-slate-50/30 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">System Mode</label>
                <div className="flex gap-4 mt-2">
                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      checked={!isMaintenance}
                      onChange={() => setIsMaintenance(false)}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    Online / Active
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      checked={isMaintenance}
                      onChange={() => setIsMaintenance(true)}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    Maintenance Mode
                  </label>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4 flex justify-end">
              <button
                type="submit"
                disabled={settingsSaving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
              >
                {settingsSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default SaaSManagement;
