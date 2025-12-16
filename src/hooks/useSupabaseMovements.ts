import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SupabaseStockMovement {
  id: string;
  item_id: string;
  device_user_id: string | null;
  movement_type: 'add' | 'remove';
  quantity: number;
  entry_method: 'ai_assisted' | 'manual';
  ai_confidence: number | null;
  notes: string | null;
  condition: 'new' | 'good' | 'damaged' | 'broken' | null;
  created_at: string;
}

export function useSupabaseMovements(itemId?: string) {
  const [movements, setMovements] = useState<SupabaseStockMovement[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMovements = useCallback(async () => {
    try {
      let query = supabase
        .from('stock_movements')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (itemId) {
        query = query.eq('item_id', itemId);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error loading movements from Supabase:', error);
        return;
      }
      
      setMovements(data || []);
    } catch (error) {
      console.error('Failed to load movements:', error);
    } finally {
      setLoading(false);
    }
  }, [itemId]);

  useEffect(() => {
    loadMovements();
  }, [loadMovements]);

  return { movements, loading, refresh: loadMovements };
}
