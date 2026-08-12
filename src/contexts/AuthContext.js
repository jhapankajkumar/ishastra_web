import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as authApi from '../api/authApi';
import { setAccessToken, clearAccessToken } from '../auth/tokenStore';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  // Distinguishes "still figuring out if we're logged in" (silent refresh in
  // flight on page load) from "confirmed logged out" — ProtectedRoute needs
  // this to avoid redirecting to /login for a split second on every reload.
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { accessToken } = await authApi.refresh();
        if (cancelled) return;
        setAccessToken(accessToken);
        const { user: freshUser } = await authApi.me();
        if (cancelled) return;
        setUser(freshUser);
      } catch (err) {
        // No valid refresh cookie — visitor is a guest. Not an error.
        clearAccessToken();
        setUser(null);
      } finally {
        if (!cancelled) setInitializing(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async ({ email, password }) => {
    const { accessToken, user: loggedInUser } = await authApi.login({ email, password });
    setAccessToken(accessToken);
    setUser(loggedInUser);
    return loggedInUser;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      clearAccessToken();
      setUser(null);
    }
  }, []);

  const refreshMe = useCallback(async () => {
    const { user: freshUser } = await authApi.me();
    setUser(freshUser);
    return freshUser;
  }, []);

  const value = {
    user,
    initializing,
    isAuthenticated: !!user,
    isSuperuser: user?.role === 'SUPERUSER',
    login,
    logout,
    refreshMe,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
