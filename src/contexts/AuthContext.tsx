import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  isAuthenticated: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, displayName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkAdminRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle();
      
      if (error) {
        console.error('Error checking admin role:', error);
        return false;
      }
      
      return !!data;
    } catch (err) {
      console.error('Error in checkAdminRole:', err);
      return false;
    }
  };

  // Log auth events to audit_logs
  const logAuthEvent = async (userId: string, displayName: string, eventType: 'user_signed_up' | 'user_signed_in' | 'user_signed_out') => {
    try {
      await supabase.from('audit_logs').insert({
        user_id: userId,
        action_type: eventType,
        item_name: displayName,
        notes: eventType === 'user_signed_up' 
          ? 'New user account created' 
          : eventType === 'user_signed_in'
          ? 'User signed in'
          : 'User signed out',
      });
    } catch (err) {
      console.error('Error logging auth event:', err);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer Supabase calls with setTimeout
        if (session?.user) {
          setTimeout(() => {
            checkAdminRole(session.user.id).then(setIsAdmin);
          }, 0);
        } else {
          setIsAdmin(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        checkAdminRole(session.user.id).then(setIsAdmin);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      return { error: error.message };
    }
    
    // Log sign-in event
    if (data.user) {
      const displayName = data.user.user_metadata?.display_name || email;
      setTimeout(() => {
        logAuthEvent(data.user.id, displayName, 'user_signed_in');
      }, 0);
    }
    
    return { error: null };
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          display_name: displayName,
        },
      },
    });
    
    if (error) {
      if (error.message.includes('already registered')) {
        return { error: 'This email is already registered. Please sign in instead.' };
      }
      return { error: error.message };
    }
    
    // Log sign-up event
    if (data.user) {
      setTimeout(() => {
        logAuthEvent(data.user.id, displayName, 'user_signed_up');
      }, 0);
    }
    
    return { error: null };
  };

  const signOut = async () => {
    // Log sign-out before actually signing out
    if (user) {
      const displayName = user.user_metadata?.display_name || user.email || 'Unknown';
      await logAuthEvent(user.id, displayName, 'user_signed_out');
    }
    
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      isAdmin,
      isAuthenticated: !!user,
      loading,
      signIn,
      signUp,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
