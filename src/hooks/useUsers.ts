import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AppUser {
  id: string;
  user_id: string;
  display_name: string;
  created_at: string;
  is_admin: boolean;
}

export function useUsers() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);

  const loadUsers = useCallback(async () => {
    try {
      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, user_id, display_name, created_at');

      if (profilesError) throw profilesError;

      // Get all admin roles
      const { data: adminRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      if (rolesError) throw rolesError;

      const adminUserIds = new Set(adminRoles?.map(r => r.user_id) || []);

      const userList: AppUser[] = (profiles || []).map(profile => ({
        id: profile.id,
        user_id: profile.user_id || '',
        display_name: profile.display_name,
        created_at: profile.created_at,
        is_admin: adminUserIds.has(profile.user_id || ''),
      }));

      setUsers(userList);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const deleteUser = async (userId: string) => {
    // Note: This deletes the profile, not the auth user
    // The auth user would need to be deleted via admin API
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('user_id', userId);
    
    if (error) throw error;
    
    // Also delete any roles
    await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId);
    
    await loadUsers();
  };

  return {
    users,
    loading,
    deleteUser,
    refresh: loadUsers,
  };
}
