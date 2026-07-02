import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../core/api';
import { PackageSearch, Loader2, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [debugToken, setDebugToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setDebugToken('');
    setIsLoading(true);

    try {
      const response = await api.post('/auth/forgot-password', { email });
      setSuccess(true);
      if (response.data?.debug_token) {
        setDebugToken(response.data.debug_token);
      }
    } catch (err: any) {
      let errorMessage = 'Failed to request password reset.';
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
          Reset your password
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Enter your registered email below to receive a password reset link.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl shadow-slate-200/50 sm:rounded-2xl sm:px-10 border border-slate-100">
          {!success ? (
            <form className="space-y-5" onSubmit={handleSubmit}>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg p-4 flex items-center">
                  <span className="font-medium">{error}</span>
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                  Email Address
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 appearance-none block w-full px-3 py-2.5 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                    placeholder="admin@company.com"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-70 disabled:cursor-not-allowed mt-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                      Sending Link...
                    </>
                  ) : (
                    'Send Reset Link'
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="bg-emerald-50 border border-emerald-150 rounded-xl p-5 text-center">
                <div className="flex justify-center mb-3">
                  <CheckCircle2 className="h-12 w-12 text-emerald-500" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-1">Reset Link Sent</h3>
                <p className="text-sm text-slate-600">
                  If that email is in our database, we have sent instructions to reset your password.
                </p>
              </div>

              {debugToken && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
                  <h4 className="text-xs font-semibold text-blue-800 uppercase tracking-wider mb-2">
                    Developer Mode Shortcut
                  </h4>
                  <p className="text-xs text-blue-700 mb-3">
                    A test reset token was successfully intercepted. Click below to reset directly:
                  </p>
                  <Link
                    to={`/reset-password?token=${debugToken}`}
                    className="inline-flex w-full justify-center items-center py-2 px-4 border border-blue-600 rounded-lg text-sm font-semibold text-blue-600 hover:bg-blue-600 hover:text-white transition-all bg-white"
                  >
                    Reset Password Now
                  </Link>
                  <div className="mt-3">
                    <span className="text-[10px] text-blue-500 font-mono break-all bg-blue-100/50 p-1.5 rounded block">
                      Token: {debugToken.substring(0, 40)}...
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center">
            <Link
              to="/login"
              className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Back to Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
