import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAdminAuth } from '../context/AdminAuthContext';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { Vote, User, Shield, LogOut, Lock } from 'lucide-react';

const Navbar: React.FC = () => {
  const { user, firebaseUser, isAdmin } = useAuth();
  const { isAuthorized, logoutAdmin } = useAdminAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    logoutAdmin();
    navigate('/');
  };

  return (
    <nav className="bg-white border-b border-neutral-200 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center space-x-2">
            <Vote className="w-8 h-8 text-indigo-600" />
            <span className="text-xl font-bold tracking-tight">DecentralVote</span>
          </Link>

          <div className="flex items-center space-x-6">
            {firebaseUser ? (
              <>
                {user ? (
                  <>
                    <Link to="/dashboard" className="text-neutral-600 hover:text-indigo-600 flex items-center space-x-1">
                      <User className="w-4 h-4" />
                      <span>Dashboard</span>
                    </Link>
                    <Link to="/vote" className="text-neutral-600 hover:text-indigo-600 flex items-center space-x-1">
                      <Vote className="w-4 h-4" />
                      <span>Vote</span>
                    </Link>
                    {isAdmin && (
                      <div className="flex items-center space-x-4 border-l border-neutral-100 pl-4">
                        <Link to={isAuthorized ? "/admin" : "/admin-login"} className="text-indigo-600 hover:text-indigo-800 flex items-center space-x-1 font-bold">
                          <Shield className="w-4 h-4" />
                          <span>Admin</span>
                        </Link>
                        {isAuthorized && (
                          <button 
                            onClick={logoutAdmin}
                            className="text-neutral-400 hover:text-neutral-600"
                            title="Lock Admin Session"
                          >
                            <Lock className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <Link to="/register" className="text-indigo-600 font-bold hover:underline">
                    Complete Profile
                  </Link>
                )}
                <button 
                  onClick={handleLogout}
                  className="text-neutral-600 hover:text-red-600 flex items-center space-x-1"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-neutral-600 hover:text-indigo-600">Login</Link>
                <Link to="/register" className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
