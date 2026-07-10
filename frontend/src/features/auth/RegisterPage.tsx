import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../core/api';
import { supabase } from '../../core/supabaseClient';
import { PackageSearch, Loader2, Building, User, Mail, Lock } from 'lucide-react';

const RegisterPage: React.FC = () => {
  const [formData, setFormData] = useState({
    company_name: '',
    admin_name: '',
    admin_email: '',
    admin_password: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // 1. Sign up user in Supabase
      const { error: sbError } = await supabase.auth.signUp({
        email: formData.admin_email,
        password: formData.admin_password,
      });

      if (sbError) {
        throw new Error(sbError.message);
      }

      // 2. Synchronize workspace profile mapping in local Postgres DB
      await api.post('/auth/register', formData);
      
      // Auto redirect to login with a success param
      navigate('/login?registered=true');
    } catch (err: any) {
      let errorMessage = err.message || 'Failed to register company.';
      if (err.response?.data?.detail) {
        if (Array.isArray(err.response.data.detail)) {
          errorMessage = err.response.data.detail.map((d: any) => d.msg).join(', ');
        } else if (typeof err.response.data.detail === 'string') {
          errorMessage = err.response.data.detail;
        }
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
            <PackageSearch className="w-8 h-8 text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900 tracking-tight">
          Create your LogiFlow Space
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500 transition-colors">
            Sign in here
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl shadow-slate-200/50 sm:rounded-2xl sm:px-10 border border-slate-100">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg p-4 flex items-center">
                <span className="font-medium">{error}</span>
              </div>
            )}
            
            <div>
              <label htmlFor="company_name" className="block text-sm font-medium text-slate-700">
                Company Name
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Building className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="company_name"
                  name="company_name"
                  type="text"
                  required
                  value={formData.company_name}
                  onChange={handleChange}
                  className="pl-10 appearance-none block w-full px-3 py-2.5 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                  placeholder="Acme Logistics Inc."
                />
              </div>
            </div>

            <div>
              <label htmlFor="admin_name" className="block text-sm font-medium text-slate-700">
                Admin Full Name
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="admin_name"
                  name="admin_name"
                  type="text"
                  required
                  value={formData.admin_name}
                  onChange={handleChange}
                  className="pl-10 appearance-none block w-full px-3 py-2.5 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                  placeholder="John Doe"
                />
              </div>
            </div>

            <div>
              <label htmlFor="admin_email" className="block text-sm font-medium text-slate-700">
                Admin Email
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="admin_email"
                  name="admin_email"
                  type="email"
                  required
                  value={formData.admin_email}
                  onChange={handleChange}
                  className="pl-10 appearance-none block w-full px-3 py-2.5 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                  placeholder="admin@acme.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="admin_password" className="block text-sm font-medium text-slate-700">
                Admin Password
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="admin_password"
                  name="admin_password"
                  type="password"
                  required
                  value={formData.admin_password}
                  onChange={handleChange}
                  className="pl-10 appearance-none block w-full px-3 py-2.5 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-70 disabled:cursor-not-allowed mt-4"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                    Registering...
                  </>
                ) : (
                  'Create Company Account'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
