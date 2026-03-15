import React, { createContext, useContext, useState, useEffect } from 'react';

interface AdminAuthContextType {
  isAuthorized: boolean;
  authorize: (password: string) => boolean;
  logoutAdmin: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthorized, setIsAuthorized] = useState<boolean>(() => {
    return sessionStorage.getItem('admin_authorized') === 'true';
  });

  const authorize = (password: string) => {
    const correctPassword = import.meta.env.VITE_ADMIN_PASSWORD || 'admin123';
    if (password === correctPassword) {
      setIsAuthorized(true);
      sessionStorage.setItem('admin_authorized', 'true');
      return true;
    }
    return false;
  };

  const logoutAdmin = () => {
    setIsAuthorized(false);
    sessionStorage.removeItem('admin_authorized');
  };

  return (
    <AdminAuthContext.Provider value={{ isAuthorized, authorize, logoutAdmin }}>
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};
