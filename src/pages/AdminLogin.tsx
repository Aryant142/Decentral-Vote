import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, Lock, ArrowRight } from 'lucide-react';
import { toast } from 'react-hot-toast';

const AdminLogin: React.FC = () => {
  const [password, setPassword] = useState('');
  const { authorize } = useAdminAuth();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center space-y-6">
        <div className="bg-red-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
          <ShieldAlert className="w-10 h-10 text-red-600" />
        </div>
        <h1 className="text-3xl font-bold text-neutral-900">Access Denied</h1>
        <p className="text-neutral-600">
          You do not have administrative privileges. Please contact the system administrator if you believe this is an error.
        </p>
        <button 
          onClick={() => navigate('/')}
          className="text-indigo-600 font-bold hover:underline"
        >
          Back to Home
        </button>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (authorize(password)) {
      toast.success('Admin access granted');
      navigate('/admin');
    } else {
      toast.error('Invalid admin password');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20">
      <div className="bg-white p-8 rounded-3xl shadow-xl border border-neutral-100 space-y-8">
        <div className="text-center space-y-2">
          <div className="bg-indigo-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-indigo-600" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight">Admin Verification</h2>
          <p className="text-neutral-500">Enter the master password to access the control center.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-neutral-700 uppercase tracking-wider">Master Password</label>
            <input 
              type="password"
              required
              autoFocus
              className="w-full px-4 py-4 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-center text-2xl tracking-[0.5em]"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••"
            />
          </div>

          <button 
            type="submit"
            className="w-full bg-neutral-900 text-white py-4 rounded-xl font-bold text-lg hover:bg-neutral-800 transition-all flex items-center justify-center space-x-2"
          >
            <span>Verify Identity</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
