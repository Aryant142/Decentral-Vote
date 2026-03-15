/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AdminAuthProvider, useAdminAuth } from './context/AdminAuthContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import AdminPanel from './pages/AdminPanel';
import AdminLogin from './pages/AdminLogin';
import VotingPage from './pages/VotingPage';
import ErrorBoundary from './components/ErrorBoundary';

const PrivateRoute: React.FC<{ children: React.ReactNode; adminOnly?: boolean }> = ({ children, adminOnly }) => {
  const { firebaseUser, user, loading, isAdmin } = useAuth();

  if (loading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  if (!firebaseUser) return <Navigate to="/login" />;
  
  // If authenticated but no profile, redirect to register to complete profile
  // Note: AppRoutes handles the logic of not redirecting if already on /register
  if (!user && window.location.pathname !== '/register') return <Navigate to="/register" />;
  
  if (adminOnly && !isAdmin) return <Navigate to="/dashboard" />;

  return <>{children}</>;
};

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthorized } = useAdminAuth();
  const { isAdmin, loading } = useAuth();

  if (loading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  if (!isAdmin) return <Navigate to="/dashboard" />;
  if (!isAuthorized) return <Navigate to="/admin-login" />;

  return <>{children}</>;
};

function AppRoutes() {
  return (
    <div className="min-h-screen bg-neutral-50 font-sans text-neutral-900">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/admin-login" element={<PrivateRoute adminOnly><AdminLogin /></PrivateRoute>} />
          <Route 
            path="/dashboard" 
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/admin" 
            element={
              <AdminRoute>
                <AdminPanel />
              </AdminRoute>
            } 
          />
          <Route 
            path="/vote" 
            element={
              <PrivateRoute>
                <VotingPage />
              </PrivateRoute>
            } 
          />
        </Routes>
      </main>
      <Toaster position="bottom-right" />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AdminAuthProvider>
          <Router>
            <AppRoutes />
          </Router>
        </AdminAuthProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

