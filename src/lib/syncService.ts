import { supabase } from '@/integrations/supabase/client';
import * as db from './indexedDb';

let isOnline = navigator.onLine;
let syncInProgress = false;

// Track online status
window.addEventListener('online', () => {
  isOnline = true;
  triggerSync();
});

window.addEventListener('offline', () => {
  isOnline = false;
});

export function getOnlineStatus(): boolean {
  return isOnline;
}

export async function triggerSync(): Promise<void> {
  if (!isOnline || syncInProgress) return;
  
  syncInProgress = true;
  console.log('Starting sync...');
  
  try {
    // First, sync local changes to server
    await syncLocalChanges();
    
    // Then, fetch latest from server
    await fetchFromServer();
    
    // Clean up synced items from queue
    await db.clearSyncedItems();
    
    console.log('Sync completed');
  } catch (error) {
    console.error('Sync failed:', error);
  } finally {
    syncInProgress = false;
  }
}

async function syncLocalChanges(): Promise<void> {
  const unsyncedItems = await db.getUnsyncedItems();
  
  for (const item of unsyncedItems) {
    try {
      if (item.table_name === 'inventory_items') {
        if (item.action === 'insert' || item.action === 'update') {
          const { error } = await supabase
            .from('inventory_items')
            .upsert(item.record_data);
          if (error) throw error;
        } else if (item.action === 'delete') {
          const { error } = await supabase
            .from('inventory_items')
            .delete()
            .eq('id', item.record_data.id);
          if (error) throw error;
        }
      } else if (item.table_name === 'stock_movements') {
        if (item.action === 'insert') {
          const { error } = await supabase
            .from('stock_movements')
            .insert(item.record_data);
          if (error) throw error;
        }
      } else if (item.table_name === 'device_users') {
        if (item.action === 'insert' || item.action === 'update') {
          const { error } = await supabase
            .from('device_users')
            .upsert(item.record_data);
          if (error) throw error;
        }
      }
      
      await db.markAsSynced(item.id);
    } catch (error) {
      console.error('Failed to sync item:', item, error);
    }
  }
}

async function fetchFromServer(): Promise<void> {
  // Fetch inventory items
  const { data: items, error: itemsError } = await supabase
    .from('inventory_items')
    .select('*');
  
  if (itemsError) {
    console.error('Failed to fetch items:', itemsError);
  } else if (items) {
    for (const item of items) {
      await db.saveItem(item as db.InventoryItem);
    }
  }
  
  // Fetch device users
  const { data: users, error: usersError } = await supabase
    .from('device_users')
    .select('*');
  
  if (usersError) {
    console.error('Failed to fetch users:', usersError);
  } else if (users) {
    for (const user of users) {
      await db.saveDeviceUser(user as db.DeviceUser);
    }
  }
  
  // Fetch stock movements
  const { data: movements, error: movementsError } = await supabase
    .from('stock_movements')
    .select('*');
  
  if (movementsError) {
    console.error('Failed to fetch movements:', movementsError);
  } else if (movements) {
    for (const movement of movements) {
      await db.saveMovement(movement as db.StockMovement);
    }
  }
}

// Initial sync on load
if (isOnline) {
  setTimeout(triggerSync, 1000);
}
