import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AuditLog {
  id: string;
  user_id: string | null;
  device_user_id: string | null;
  action_type: string;
  item_id: string | null;
  item_name: string | null;
  item_sku: string | null;
  old_value: string | null;
  new_value: string | null;
  notes: string | null;
  created_at: string;
}

export function useAuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLogs = useCallback(async () => {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error loading audit logs:', error);
      return;
    }
    
    setLogs(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const addLog = async (log: Omit<AuditLog, 'id' | 'created_at'>) => {
    const { error } = await supabase
      .from('audit_logs')
      .insert(log);
    
    if (error) {
      console.error('Error adding audit log:', error);
      throw error;
    }
    
    await loadLogs();
  };

  return {
    logs,
    loading,
    addLog,
    refresh: loadLogs,
  };
}
