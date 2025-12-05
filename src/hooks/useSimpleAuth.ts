import { useState, useEffect, useCallback } from 'react';

const AUTH_KEY = 'inventory_admin_auth';

export function useSimpleAuth() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(AUTH_KEY);
    setIsLoggedIn(stored === 'true');
    setLoading(false);
  }, []);

  const login = useCallback(() => {
    localStorage.setItem(AUTH_KEY, 'true');
    setIsLoggedIn(true);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_KEY);
    setIsLoggedIn(false);
  }, []);

  return {
    isLoggedIn,
    isAdmin: isLoggedIn,
    loading,
    login,
    logout,
  };
}