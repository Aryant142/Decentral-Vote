import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createUserWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { UserPlus, Mail, Lock, User, CreditCard } from 'lucide-react';

const Register: React.FC = () => {
  const { firebaseUser, user: profile } = useAuth();
  const [formData, setFormData] = useState({
    name: firebaseUser?.displayName || '',
    email: firebaseUser?.email || '',
    password: '',
    aadhaarId: ''
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // If profile exists, redirect to dashboard
  useEffect(() => {
    if (profile) {
      navigate('/dashboard');
    }
  }, [profile, navigate]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.aadhaarId.length !== 12) {
      toast.error('Aadhaar ID must be 12 digits');
      return;
    }

    setLoading(true);
    try {
      let currentUser = firebaseUser;
      
      if (!currentUser) {
        const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        currentUser = userCredential.user;
      }

      // Create user profile in Firestore
      await setDoc(doc(db, 'users', currentUser.uid), {
        uid: currentUser.uid,
        name: formData.name,
        email: formData.email,
        aadhaarId: formData.aadhaarId,
        role: 'voter',
        kycStatus: 'pending',
        createdAt: serverTimestamp()
      });

      toast.success('Account created successfully!');
      navigate('/dashboard');
    } catch (error: any) {
      if (error.code?.startsWith('auth/')) {
        toast.error(error.message || 'Failed to register');
      } else {
        handleFirestoreError(error, OperationType.WRITE, 'users');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      // After successful Google login, the user will be redirected to complete their profile
      // if they don't have one yet, thanks to the logic in App.tsx and the form in this component.
      toast.success('Signed in with Google. Please complete your profile.');
    } catch (error: any) {
      if (error.code?.startsWith('auth/')) {
        toast.error('Failed to register with Google');
      } else {
        handleFirestoreError(error, OperationType.WRITE, 'users');
      }
    }
  };

  return (
    <div className="max-w-md mx-auto mt-8">
      <div className="bg-white p-8 rounded-2xl shadow-xl border border-neutral-100">
        <div className="text-center mb-8">
          <div className="bg-indigo-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <UserPlus className="w-8 h-8 text-indigo-600" />
          </div>
          <h2 className="text-3xl font-bold">Create Account</h2>
          <p className="text-neutral-500 mt-2">Join the decentralized voting platform</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Full Name</label>
            <div className="relative">
              <User className="w-5 h-5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                required
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                placeholder="John Doe"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-5 h-5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="email" 
                required
                disabled={!!firebaseUser}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all disabled:bg-neutral-50 disabled:text-neutral-500"
                placeholder="you@example.com"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Aadhaar ID (12 Digits)</label>
            <div className="relative">
              <CreditCard className="w-5 h-5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                required
                maxLength={12}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                placeholder="1234 5678 9012"
                value={formData.aadhaarId}
                onChange={(e) => setFormData({...formData, aadhaarId: e.target.value.replace(/\D/g, '')})}
              />
            </div>
          </div>

          {!firebaseUser && (
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-5 h-5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="password" 
                  required
                  minLength={6}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                />
              </div>
            </div>
          )}

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all disabled:opacity-50"
          >
            {loading ? 'Processing...' : firebaseUser ? 'Complete Profile' : 'Register'}
          </button>
        </form>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-neutral-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-neutral-500 uppercase tracking-wider">Or continue with</span>
          </div>
        </div>

        <button 
          onClick={handleGoogleRegister}
          className="w-full flex items-center justify-center space-x-3 border border-neutral-200 py-3 rounded-xl font-medium hover:bg-neutral-50 transition-all"
        >
          <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
          <span>Register with Google</span>
        </button>

        <p className="text-center mt-8 text-neutral-600">
          Already have an account? <Link to="/login" className="text-indigo-600 font-bold hover:underline">Sign In</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
