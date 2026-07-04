import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../core/api';
import { Users, Plus, Key, Calendar, Loader2, UserPlus, FileText, Phone, ShieldAlert, CheckCircle2, Truck } from 'lucide-react';

interface Driver {
  id: string;
  user_id: string;
  full_name?: string; // Mapped from backend
  license_number: string;
  license_expiry: string;
  emergency_contact?: string;
  status: string;
  assigned_vehicle_id?: string | null;
  created_at: string;
}

interface UserAccount {
  id: string;
  email: string;
  full_name: string;
}

const DriversList: React.FC = () => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [companyUsers, setCompanyUsers] = useState<UserAccount[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal wizard states
  const [showAddModal, setShowAddModal] = useState(false);
  const [creationMode, setCreationMode] = useState<'existing' | 'new'>('new');
  
  // Existing user promotion fields
  const [selectedUserId, setSelectedUserId] = useState('');
  
  // New user account fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Driver details fields
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseExpiry, setLicenseExpiry] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchDriversAndUsers = async () => {
    try {
      const drvResponse = await api.get('/fleet/drivers');
      setDrivers(drvResponse.data);

      const usersResponse = await api.get('/auth/users');
      // Filter out users who are already drivers to avoid duplicate promotion crashes
      const existingDriverUserIds = new Set(drvResponse.data.map((d: Driver) => d.user_id));
      const unassignedUsers = usersResponse.data.filter((u: UserAccount) => !existingDriverUserIds.has(u.id));
      setCompanyUsers(unassignedUsers);

      const vehResponse = await api.get('/fleet/vehicles');
      setVehicles(vehResponse.data.filter((v: any) => v.status === 'active'));
    } catch (error) {
      console.error('Failed to fetch fleet or user lists', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDriversAndUsers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccessMsg('');

    try {
      let targetUserId = selectedUserId;

      // 1. If 'new' user mode, register the User account first
      if (creationMode === 'new') {
        const userResponse = await api.post('/auth/users', {
          email,
          full_name: fullName,
          password,
          role_name: 'Driver'
        });
        targetUserId = userResponse.data.id;
      }

      if (!targetUserId) {
        throw new Error('Please select or create a user account first.');
      }

      // 2. Promote user to Driver
      const driverResponse = await api.post('/fleet/drivers', {
        user_id: targetUserId,
        license_number: licenseNumber,
        license_expiry: licenseExpiry,
        emergency_contact: emergencyContact || null,
        status: 'available'
      });

      setSuccessMsg('Driver profile created and verified!');
      
      // Re-fetch lists
      await fetchDriversAndUsers();

      setTimeout(() => {
        setShowAddModal(false);
        setSuccessMsg('');
        setSelectedUserId('');
        setFullName('');
        setEmail('');
        setPassword('');
        setLicenseNumber('');
        setLicenseExpiry('');
        setEmergencyContact('');
      }, 1500);

    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to onboard driver.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'available': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'on_trip': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'offline': return 'bg-slate-100 text-slate-800 border-slate-200';
      default: return 'bg-slate-100 text-slate-850 border-slate-200';
    }
  };

  const handleAssignVehicle = async (driverId: string, vehicleId: string) => {
    try {
      await api.put(`/fleet/drivers/${driverId}`, {
        assigned_vehicle_id: vehicleId || null
      });
      fetchDriversAndUsers();
    } catch (err) {
      console.error('Failed to assign vehicle', err);
      alert('Failed to assign vehicle. Make sure the vehicle is active.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Fleet Drivers</h1>
          <p className="text-sm text-slate-500 mt-1">Manage transport staff, driver licensing records, and active delivery availability.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg shadow-sm transition-colors cursor-pointer"
        >
          <Plus className="w-5 h-5 mr-1.5" />
          Add Driver
        </button>
      </div>
      
      {/* Fleet Navigation Tabs */}
      <div className="flex border-b border-slate-200">
        <button className="border-b-2 border-blue-600 text-blue-600 px-4 py-2.5 text-sm font-semibold flex items-center gap-2">
          <Users className="w-4 h-4" />
          Drivers List
        </button>
        <Link
          to="/vehicles"
          className="border-b-2 border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-350 px-4 py-2.5 text-sm font-medium transition-all flex items-center gap-2"
        >
          <Truck className="w-4 h-4" />
          Vehicles Fleet
        </Link>
      </div>

      {/* Drivers List Table */}
      <div className="bg-white shadow-sm border border-slate-200 rounded-xl overflow-hidden animate-fade-in">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Driver Name</th>
                <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">License details</th>
                <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">License Expiry</th>
                <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Assigned Vehicle</th>
                <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-500">
                    <div className="flex justify-center items-center space-x-2">
                      <Loader2 className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      <span>Loading fleet staff...</span>
                    </div>
                  </td>
                </tr>
              ) : drivers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center py-6">
                      <Users className="w-12 h-12 text-slate-300 mb-3" />
                      <p className="font-semibold text-slate-800">No drivers onboarded.</p>
                      <p className="text-xs text-slate-400 mt-1">Onboard drivers and input their licensing to begin routing shipments.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                drivers.map(driver => (
                  <tr key={driver.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-bold text-slate-900">{driver.full_name || 'System Driver'}</div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">ID: {driver.id.substring(0, 8)}...</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center font-medium text-slate-850">
                        <Key className="mr-2 h-4 w-4 text-slate-400" />
                        {driver.license_number}
                      </div>
                      {driver.emergency_contact && (
                        <div className="text-xs text-slate-400 mt-0.5 flex items-center">
                          <Phone className="w-3 h-3 mr-1" /> {driver.emergency_contact}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-500">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 text-slate-400 mr-1.5" />
                        {new Date(driver.license_expiry).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select 
                        value={driver.assigned_vehicle_id || ''}
                        onChange={(e) => handleAssignVehicle(driver.id, e.target.value)}
                        className="text-xs border border-slate-300 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">-- No Vehicle --</option>
                        {vehicles.map(v => (
                          <option key={v.id} value={v.id}>{v.registration_number} ({v.type})</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${getStatusColor(driver.status)}`}>
                        {driver.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Driver Modal Wizard */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-scale-in">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800 flex items-center">
                <UserPlus className="w-5 h-5 mr-2 text-blue-500" /> Onboard Fleet Driver
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[500px] overflow-y-auto">
              {error && (
                <div className="bg-rose-50 border border-rose-200 text-rose-650 text-xs rounded-lg p-3 flex items-center">
                  <ShieldAlert className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {successMsg && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-755 text-xs rounded-lg p-3 flex items-center">
                  <CheckCircle2 className="w-4 h-4 mr-2 flex-shrink-0 animate-bounce" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Wizard Selector */}
              <div className="flex border-b border-slate-200 pb-2 mb-4">
                <button
                  type="button"
                  onClick={() => { setCreationMode('new'); setError(''); }}
                  className={`flex-1 text-center pb-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors cursor-pointer ${
                    creationMode === 'new' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-400'
                  }`}
                >
                  Register New Account
                </button>
                <button
                  type="button"
                  onClick={() => { setCreationMode('existing'); setError(''); }}
                  className={`flex-1 text-center pb-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors cursor-pointer ${
                    creationMode === 'existing' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-400'
                  }`}
                >
                  Promote User
                </button>
              </div>

              {/* Step 1: User Account details */}
              {creationMode === 'new' ? (
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Account Credentials</h4>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Vijay Patil"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Email Address</label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. vijay.patil@logiflow.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Temporary Password</label>
                    <input
                      type="password"
                      required
                      placeholder="Min 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-blue-500"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Select User</h4>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Company Users</label>
                    <select
                      value={selectedUserId}
                      required
                      onChange={(e) => setSelectedUserId(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-blue-500"
                    >
                      <option value="">-- Select Unassigned User --</option>
                      {companyUsers.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.full_name} ({u.email})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Step 2: License Details */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Licensing Details</h4>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Commercial License Number</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. DL-MH12-2026-9812"
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">License Expiry Date</label>
                    <input
                      type="date"
                      required
                      value={licenseExpiry}
                      onChange={(e) => setLicenseExpiry(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Emergency Contact</label>
                    <input
                      type="text"
                      placeholder="e.g. 9988776655"
                      value={emergencyContact}
                      onChange={(e) => setEmergencyContact(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-slate-100 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors inline-flex items-center cursor-pointer"
                >
                  {submitting && <Loader2 className="animate-spin -ml-1 mr-1.5 h-4 w-4" />}
                  Register Driver
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DriversList;
