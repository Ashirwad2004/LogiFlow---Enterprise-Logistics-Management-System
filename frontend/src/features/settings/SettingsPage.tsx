import React, { useState, useEffect } from 'react';
import api from '../../core/api';
import { Settings, ShieldCheck, Database, Calendar, User, Terminal, Loader2, RefreshCw, Layers, Users, UserPlus, ShieldAlert, CheckCircle2, Building, Mail, Briefcase } from 'lucide-react';

interface AuditLog {
  id: string;
  user_id: string;
  user_name: string;
  action: string;
  table_name: string;
  record_id: string;
  old_values: any;
  new_values: any;
  ip_address: string;
  timestamp: string;
}

interface TeamMember {
  id: string;
  email: string;
  full_name: string;
  role_name?: string;
  is_active: boolean;
}

const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'general' | 'team' | 'audit'>('general');
  
  // General settings states
  const [companyName, setCompanyName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [invoicePrefix, setInvoicePrefix] = useState('');
  const [taxRate, setTaxRate] = useState('18');
  const [address, setAddress] = useState('');
  const [updatingSettings, setUpdatingSettings] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Audit Log states
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  // Team states
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [memberName, setMemberName] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [memberPassword, setMemberPassword] = useState('');
  const [memberRole, setMemberRole] = useState('Dispatcher');
  const [submittingMember, setSubmittingMember] = useState(false);
  const [memberError, setMemberError] = useState('');
  const [memberSuccess, setMemberSuccess] = useState('');

  const fetchAuditLogs = async () => {
    setLoadingLogs(true);
    try {
      const response = await api.get('/audit-logs');
      setLogs(response.data);
    } catch (error) {
      console.error('Failed to fetch audit logs', error);
    } finally {
      setLoadingLogs(false);
    }
  };

  const fetchTeam = async () => {
    setLoadingTeam(true);
    try {
      const response = await api.get('/auth/users');
      setTeam(response.data);
    } catch (error) {
      console.error('Failed to fetch team members', error);
    } finally {
      setLoadingTeam(false);
    }
  };

  const fetchCompanySettings = async () => {
    try {
      const response = await api.get('/auth/me');
      const comp = response.data.company;
      if (comp) {
        setCompanyName(comp.name || '');
        setLegalName(comp.legal_name || '');
        setSupportEmail(comp.support_email || '');
        setInvoicePrefix(comp.invoice_prefix || 'INV');
        setTaxRate(comp.tax_rate ? String(comp.tax_rate) : '18');
        setAddress(comp.address || '');
      }
    } catch (error) {
      console.error('Failed to load company profile settings', error);
    }
  };

  useEffect(() => {
    if (activeTab === 'general') {
      fetchCompanySettings();
    } else if (activeTab === 'audit') {
      fetchAuditLogs();
    } else if (activeTab === 'team') {
      fetchTeam();
    }
  }, [activeTab]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingSettings(true);
    setSettingsSaved(false);
    try {
      await api.put('/auth/company', {
        name: companyName,
        legal_name: legalName,
        support_email: supportEmail,
        invoice_prefix: invoicePrefix,
        tax_rate: parseFloat(taxRate) || 18.00,
        address: address
      });
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 3000);
      // Refresh context or locally cached values
      fetchCompanySettings();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to save settings.');
    } finally {
      setUpdatingSettings(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingMember(true);
    setMemberError('');
    setMemberSuccess('');
    try {
      const response = await api.post('/auth/users', {
        email: memberEmail,
        full_name: memberName,
        password: memberPassword,
        role_name: memberRole
      });
      setTeam(prev => [...prev, response.data]);
      setMemberSuccess('User onboarded successfully!');
      setTimeout(() => {
        setShowAddMemberModal(false);
        setMemberSuccess('');
        setMemberName('');
        setMemberEmail('');
        setMemberPassword('');
        setMemberRole('Dispatcher');
      }, 1500);
    } catch (err: any) {
      setMemberError(err.response?.data?.detail || 'Failed to onboard team member.');
    } finally {
      setSubmittingMember(false);
    }
  };

  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case 'create_shipment': return 'text-emerald-700 bg-emerald-50 border-emerald-250';
      case 'update_shipment': return 'text-blue-700 bg-blue-50 border-blue-250';
      case 'settle_invoice_payment': return 'text-purple-700 bg-purple-50 border-purple-250';
      case 'create_user': return 'text-amber-700 bg-amber-50 border-amber-250';
      default: return 'text-slate-700 bg-slate-50 border-slate-200';
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System Settings & Operations</h1>
        <p className="text-sm text-slate-500 mt-1">Configure company profiles, invite employees, and monitor security logs.</p>
      </div>

      {/* Tabs list */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('general')}
          className={`py-3 px-6 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'general'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Settings className="w-4 h-4 inline mr-1.5" /> General Config
        </button>
        <button
          onClick={() => setActiveTab('team')}
          className={`py-3 px-6 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'team'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4 inline mr-1.5" /> Team Management
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`py-3 px-6 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'audit'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4 inline mr-1.5" /> Security Audit Ledger
        </button>
      </div>

      {/* General Settings Tab */}
      {activeTab === 'general' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 max-w-xl">
          <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center">
            <Building className="w-5 h-5 mr-2 text-blue-500" /> Company Parameters
          </h3>
          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Company Display Name</label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Legal Entity Name</label>
                <input
                  type="text"
                  required
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  placeholder="e.g. LogiFlow India Private Limited"
                  className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Support Contact Email</label>
              <input
                type="email"
                required
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Invoice Prefix</label>
                <input
                  type="text"
                  required
                  value={invoicePrefix}
                  onChange={(e) => setInvoicePrefix(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Standard GST Tax Rate (%)</label>
                <input
                  type="number"
                  required
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Billing & Registered Address</label>
              <textarea
                required
                rows={3}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. 100 Logistics Tech Way, Bandra East, Mumbai - 400051"
                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-blue-500"
              />
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center gap-3 justify-end">
              {settingsSaved && (
                <span className="text-xs text-emerald-600 font-semibold flex items-center">
                  <CheckCircle2 className="w-4 h-4 mr-1 animate-pulse" /> Settings Saved!
                </span>
              )}
              <button
                type="submit"
                disabled={updatingSettings}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg transition-colors inline-flex items-center disabled:opacity-50 cursor-pointer"
              >
                {updatingSettings && <Loader2 className="animate-spin -ml-1 mr-1.5 h-4 w-4" />}
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Team Management Tab */}
      {activeTab === 'team' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-150 flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-slate-800">Company Team Members</h3>
                <p className="text-xs text-slate-500 mt-0.5">Manage user profiles, assign roles, and authorize login credentials.</p>
              </div>
              <button
                onClick={() => setShowAddMemberModal(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                <UserPlus className="w-4 h-4 mr-1.5" /> Onboard Member
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Member Name</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Email Address</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Security Role</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200 text-slate-700">
                  {loadingTeam ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-10 text-center text-slate-500">
                        <div className="flex justify-center items-center space-x-2">
                          <Loader2 className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                          <span>Loading team directory...</span>
                        </div>
                      </td>
                    </tr>
                  ) : team.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-10 text-center text-slate-500">
                        No team members registered.
                      </td>
                    </tr>
                  ) : (
                    team.map((member) => (
                      <tr key={member.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 font-bold flex items-center justify-center mr-3 text-xs uppercase">
                              {member.full_name.substring(0, 2)}
                            </div>
                            <span className="font-semibold text-slate-900">{member.full_name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-slate-500 flex items-center pt-6">
                          <Mail className="w-3.5 h-3.5 text-slate-400 mr-1.5" />
                          {member.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                            {member.role_name || 'Member'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            member.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-800'
                          }`}>
                            {member.is_active ? 'Active' : 'Suspended'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Security Audit Ledger Tab */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-150 flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-slate-800">Immutable Audit Trail Logs</h3>
                <p className="text-xs text-slate-500 mt-0.5">Logs are recorded directly inside the Postgres ledger and are read-only.</p>
              </div>
              <button
                onClick={fetchAuditLogs}
                disabled={loadingLogs}
                className="p-1.5 border border-slate-300 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${loadingLogs ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Timestamp</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Actor / User</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Action</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">IP Address</th>
                    <th scope="col" className="relative px-6 py-3"><span className="sr-only">Details</span></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200 text-slate-700">
                  {loadingLogs ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-slate-500">
                        <div className="flex justify-center items-center space-x-2">
                          <Loader2 className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                          <span>Loading ledger...</span>
                        </div>
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-slate-500">
                        No audit events recorded in this session. Create a shipment or process a payment to trigger logs.
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500 font-mono">
                          <div className="flex items-center">
                            <Calendar className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                            {new Date(log.timestamp).toLocaleString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-semibold text-slate-900">
                          <div className="flex items-center">
                            <User className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                            {log.user_name || 'System / Platform'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${getActionColor(log.action)}`}>
                            {log.action.replace(/_/g, ' ').toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-slate-500">
                          {log.ip_address || '127.0.0.1'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-medium">
                          {(log.old_values || log.new_values) && (
                            <button
                              onClick={() => setSelectedLog(log)}
                              className="text-blue-600 hover:text-blue-900 font-bold flex items-center gap-1 justify-end ml-auto cursor-pointer"
                            >
                              <Terminal className="w-3.5 h-3.5" /> View Changes
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMemberModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-scale-in">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800 flex items-center">
                <UserPlus className="w-5 h-5 mr-2 text-blue-500" /> Onboard Team Member
              </h3>
              <button
                type="button"
                onClick={() => setShowAddMemberModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleAddMember} className="p-6 space-y-4">
              {memberError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-650 text-xs rounded-lg p-3 flex items-center">
                  <ShieldAlert className="w-4 h-4 mr-2" />
                  <span>{memberError}</span>
                </div>
              )}

              {memberSuccess && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-750 text-xs rounded-lg p-3 flex items-center">
                  <CheckCircle2 className="w-4 h-4 mr-2 flex-shrink-0 animate-bounce" />
                  <span>{memberSuccess}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vijay Patil"
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. vijay.patil@logiflow.com"
                  value={memberEmail}
                  onChange={(e) => setMemberEmail(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Temporary Password</label>
                  <input
                    type="password"
                    required
                    placeholder="Min 6 chars"
                    value={memberPassword}
                    onChange={(e) => setMemberPassword(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">System Role</label>
                  <select
                    value={memberRole}
                    onChange={(e) => setMemberRole(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-blue-500"
                  >
                    <option value="Dispatcher">Dispatcher</option>
                    <option value="Warehouse Mgr">Warehouse Mgr</option>
                    <option value="Accountant">Accountant</option>
                    <option value="Customer">Customer Client</option>
                    <option value="Driver">Driver</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddMemberModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingMember}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors inline-flex items-center cursor-pointer"
                >
                  {submittingMember && <Loader2 className="animate-spin -ml-1 mr-1.5 h-4 w-4" />}
                  Register Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delta changes JSON diff modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-scale-in">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-800 flex items-center">
                <Layers className="w-5 h-5 mr-2 text-blue-500" /> Change Delta Ledger
              </h3>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>
            
            <div className="p-6 space-y-4 max-h-[400px] overflow-y-auto">
              <div className="text-xs text-slate-500">
                Log Event ID: <span className="font-mono">{selectedLog.id}</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                {/* Old Values Column */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Before Change</h4>
                  {selectedLog.old_values ? (
                    <div className="bg-rose-50/50 border border-rose-100 rounded-lg p-3 text-xs font-mono text-rose-800 space-y-1 overflow-x-auto">
                      {Object.entries(selectedLog.old_values).map(([key, value]) => (
                        <div key={key}>
                          <span className="font-bold">{key}:</span> {JSON.stringify(value)}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-400 italic text-center py-6">
                      (No prior values / Insert)
                    </div>
                  )}
                </div>

                {/* New Values Column */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">After Change</h4>
                  {selectedLog.new_values ? (
                    <div className="bg-emerald-50/50 border border-emerald-100 rounded-lg p-3 text-xs font-mono text-emerald-800 space-y-1 overflow-x-auto">
                      {Object.entries(selectedLog.new_values).map(([key, value]) => (
                        <div key={key}>
                          <span className="font-bold">{key}:</span> {JSON.stringify(value)}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-400 italic text-center py-6">
                      (No new values / Delete)
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg text-sm font-semibold cursor-pointer"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
