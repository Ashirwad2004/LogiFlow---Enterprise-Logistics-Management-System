import React, { useState, useEffect } from 'react';
import api from '../../core/api';
import { 
  ShieldAlert, 
  Search, 
  Calendar, 
  User, 
  FileSpreadsheet, 
  ChevronDown, 
  ChevronUp, 
  Loader2, 
  CheckCircle,
  Database,
  ArrowRight
} from 'lucide-react';

interface AuditLog {
  id: string;
  user_id: string;
  user_name?: string;
  action: string;
  table_name: string;
  record_id: string;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  ip_address: string | null;
  timestamp: string;
}

const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [tableFilter, setTableFilter] = useState('all');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const fetchLogs = async () => {
    try {
      const response = await api.get('/audit-logs/');
      setLogs(response.data);
    } catch (err) {
      console.error('Failed to load audit logs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const toggleExpand = (id: string) => {
    if (expandedLogId === id) {
      setExpandedLogId(null);
    } else {
      setExpandedLogId(id);
    }
  };

  const getActionBadgeColor = (action: string) => {
    const act = action.toLowerCase();
    if (act.includes('create') || act.includes('add') || act.includes('register')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (act.includes('delete') || act.includes('remove') || act.includes('cancel')) {
      return 'bg-rose-50 text-rose-700 border-rose-200';
    }
    if (act.includes('update') || act.includes('edit') || act.includes('assign') || act.includes('allocate')) {
      return 'bg-amber-50 text-amber-700 border-amber-200';
    }
    return 'bg-slate-50 text-slate-700 border-slate-200';
  };

  // Distinct list of actions and tables for filter selects
  const uniqueActions = Array.from(new Set(logs.map(l => l.action)));
  const uniqueTables = Array.from(new Set(logs.map(l => l.table_name)));

  // Filtered log list
  const filteredLogs = logs.filter(log => {
    const query = searchQuery.toLowerCase();
    const userName = (log.user_name || '').toLowerCase();
    const action = log.action.toLowerCase();
    const table = log.table_name.toLowerCase();
    const recordId = log.record_id.toLowerCase();
    const matchesSearch = userName.includes(query) || action.includes(query) || table.includes(query) || recordId.includes(query);
    
    const matchesAction = actionFilter === 'all' || log.action === actionFilter;
    const matchesTable = tableFilter === 'all' || log.table_name === tableFilter;

    return matchesSearch && matchesAction && matchesTable;
  });

  const handleExportCSV = () => {
    // Generate CSV data from logs
    const headers = 'Timestamp,Actor,Action,Table,Record ID,IP Address\n';
    const rows = filteredLogs.map(log => 
      `"${log.timestamp}","${log.user_name || 'System'}","${log.action}","${log.table_name}","${log.record_id}","${log.ip_address || 'N/A'}"`
    ).join('\n');
    
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `logiflow_audit_ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center">
            <ShieldAlert className="w-7 h-7 mr-2.5 text-blue-600" />
            Security Audit Trail Ledger
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            SOC2 compliant immutable ledger recording system state modifications and operations.
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          disabled={filteredLogs.length === 0}
          className="inline-flex items-center px-4 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-lg shadow-2xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FileSpreadsheet className="w-5 h-5 mr-1.5 text-emerald-600" />
          Export Ledger (CSV)
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
        {/* Search */}
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by actor name, action, or record ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2 block w-full border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Action Filter */}
        <div>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">-- All Actions --</option>
            {uniqueActions.map(act => (
              <option key={act} value={act}>{act}</option>
            ))}
          </select>
        </div>

        {/* Table/Entity Filter */}
        <div>
          <select
            value={tableFilter}
            onChange={(e) => setTableFilter(e.target.value)}
            className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">-- All Entities --</option>
            {uniqueTables.map(tbl => (
              <option key={tbl} value={tbl}>{tbl}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Ledger Content */}
      {loading ? (
        <div className="p-16 text-center text-slate-500 flex justify-center items-center space-x-2 bg-white rounded-xl border border-slate-200 shadow-sm">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          <span>Syncing audit ledger logs...</span>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="bg-white p-12 rounded-xl border border-slate-200 shadow-sm text-center">
          <CheckCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-800">No Logs Found</h3>
          <p className="text-slate-500 text-sm mt-1 max-w-sm mx-auto">
            No security ledger records matched your search query or selected category filters.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm text-slate-700">
              <thead className="bg-slate-50 font-semibold text-slate-500 uppercase tracking-wider text-xs border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5">Timestamp</th>
                  <th className="px-6 py-3.5">Actor (User)</th>
                  <th className="px-6 py-3.5">Action</th>
                  <th className="px-6 py-3.5">Database Entity</th>
                  <th className="px-6 py-3.5">Target Record ID</th>
                  <th className="relative px-6 py-3.5"><span className="sr-only">Details</span></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-150">
                {filteredLogs.map((log) => {
                  const isExpanded = expandedLogId === log.id;
                  return (
                    <React.Fragment key={log.id}>
                      <tr 
                        onClick={() => toggleExpand(log.id)}
                        className={`hover:bg-slate-50/50 transition-colors cursor-pointer ${isExpanded ? 'bg-slate-50/30 font-medium' : ''}`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-slate-500 text-xs font-mono">
                          <span className="flex items-center">
                            <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400" />
                            {new Date(log.timestamp).toLocaleString()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="flex items-center font-bold text-slate-800">
                            <User className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                            {log.user_name || 'System automated'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-full text-2xs font-extrabold border ${getActionBadgeColor(log.action)}`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="flex items-center text-slate-650 font-mono text-xs">
                            <Database className="w-3.5 h-3.5 mr-1 text-slate-400" />
                            {log.table_name}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-mono text-slate-400 text-xs">
                          {log.record_id.substring(0, 18)}...
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            type="button"
                            className="p-1 hover:bg-slate-100 rounded-md text-slate-400 hover:text-slate-650"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-slate-50/50">
                          <td colSpan={6} className="px-6 py-5 border-t border-slate-100">
                            <div className="space-y-4 max-w-3xl">
                              <div className="flex items-center space-x-6 text-xs text-slate-500">
                                <span><strong>Record Full UUID:</strong> {log.record_id}</span>
                                <span><strong>IP Address:</strong> {log.ip_address || '127.0.0.1'}</span>
                                <span><strong>Audit Log ID:</strong> {log.id}</span>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <span className="block text-2xs font-extrabold text-slate-450 uppercase mb-1">Old State values</span>
                                  {log.old_values && Object.keys(log.old_values).length > 0 ? (
                                    <pre className="p-3 bg-slate-900 text-slate-100 rounded-lg text-xs font-mono overflow-auto max-h-48 border border-slate-800">
                                      {JSON.stringify(log.old_values, null, 2)}
                                    </pre>
                                  ) : (
                                    <div className="p-3 bg-slate-100 text-slate-400 rounded-lg text-xs italic border border-slate-200/60">
                                      No values / Record was created
                                    </div>
                                  )}
                                </div>

                                <div>
                                  <span className="block text-2xs font-extrabold text-slate-450 uppercase mb-1 flex items-center">
                                    New State values
                                    <ArrowRight className="w-3 h-3 ml-1 text-slate-400 animate-pulse" />
                                  </span>
                                  {log.new_values && Object.keys(log.new_values).length > 0 ? (
                                    <pre className="p-3 bg-slate-900 text-blue-100 rounded-lg text-xs font-mono overflow-auto max-h-48 border border-blue-950">
                                      {JSON.stringify(log.new_values, null, 2)}
                                    </pre>
                                  ) : (
                                    <div className="p-3 bg-slate-105 text-slate-400 rounded-lg text-xs italic border border-slate-200">
                                      No new values / Record was deleted
                                    </div>
                                  )}
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
        </div>
      )}
    </div>
  );
};

export default AuditLogs;
