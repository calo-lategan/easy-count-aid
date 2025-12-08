import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const AUTH_TOKEN_KEY = 'inventory_admin_token';
const AUTH_EXPIRY_KEY = 'inventory_admin_expiry';

export function useSecureAuth() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  // Validate token on mount and periodically
  const validateToken = useCallback(async () => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const expiry = localStorage.getItem(AUTH_EXPIRY_KEY);
    
    if (!token || !expiry) {
      setIsLoggedIn(false);
      setLoading(false);
      return false;
    }

    // Check if token is expired locally first
    if (Date.now() > parseInt(expiry)) {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(AUTH_EXPIRY_KEY);
      setIsLoggedIn(false);
      setLoading(false);
      return false;
    }

    // Validate token server-side
    try {
      const { data, error } = await supabase.functions.invoke('verify-admin-pin', {
        body: { action: 'validate', token },
      });

      if (error || !data?.valid) {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(AUTH_EXPIRY_KEY);
        setIsLoggedIn(false);
        setLoading(false);
        return false;
      }

      setIsLoggedIn(true);
      setLoading(false);
      return true;
    } catch (err) {
      console.error('Token validation error:', err);
      setIsLoggedIn(false);
      setLoading(false);
      return false;
    }
  }, []);

  useEffect(() => {
    validateToken();
  }, [validateToken]);

  const login = useCallback(async (pin: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.functions.invoke('verify-admin-pin', {
        body: { action: 'verify', pin },
      });

      if (error) {
        return { success: false, error: error.message || 'Failed to verify PIN' };
      }

      if (!data?.success) {
        return { success: false, error: data?.error || 'Invalid PIN' };
      }

      // Store the secure token
      localStorage.setItem(AUTH_TOKEN_KEY, data.token);
      localStorage.setItem(AUTH_EXPIRY_KEY, data.expiresAt.toString());
      setIsLoggedIn(true);

      return { success: true };
    } catch (err) {
      console.error('Login error:', err);
      return { success: false, error: 'Network error. Please try again.' };
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_EXPIRY_KEY);
    setIsLoggedIn(false);
  }, []);

  return {
    isLoggedIn,
    isAdmin: isLoggedIn,
    loading,
    login,
    logout,
    validateToken,
  };
}
