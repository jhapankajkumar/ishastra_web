import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * Gates a route behind login, and optionally a specific role.
 *
 * Waits for the silent-refresh-on-load check (`initializing`) to finish
 * before deciding to redirect — otherwise a logged-in user reloading the
 * page would flash to /login for a moment while the refresh call is
 * still in flight.
 */
export default function ProtectedRoute({ roles, children }) {
  const { user, initializing } = useAuth();
  const location = useLocation();

  if (initializing) {
    return null;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
