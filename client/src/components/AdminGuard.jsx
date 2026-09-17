import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { isAdminAuthenticated } from '../services/adminAuthService';

export default function AdminGuard({ children }) {
  const location = useLocation();
  const isAuth = isAdminAuthenticated();

  if (!isAuth) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  return children;
}
