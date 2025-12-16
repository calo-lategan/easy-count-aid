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
        // Handle record_data that might be double-stringified JSON
        let recordData = item.record_data;
        if (typeof recordData === 'string') {
          try {
            recordData = JSON.parse(recordData);
          } catch (e) {
            console.error('Failed to parse record_data string:', e);
          }
        }
        
        if (item.action === 'insert' || item.action === 'update') {
          const { error } = await supabase
            .from('inventory_items')
            .upsert(recordData);
          if (error) throw error;
        } else if (item.action === 'delete') {
          const { error } = await supabase
            .from('inventory_items')
            .delete()
            .eq('id', recordData.id);
          if (error) throw error;
        }
      } else if (item.table_name === 'stock_movements') {
        // Handle record_data that might be double-stringified JSON
        let recordData = item.record_data;
        if (typeof recordData === 'string') {
          try {
            recordData = JSON.parse(recordData);
          } catch (e) {
            console.error('Failed to parse record_data string:', e);
          }
        }
        
        if (item.action === 'insert') {
          // Remove device_user_id if it references a non-existent user (FK constraint)
          const cleanedData = { ...recordData };
          
          const { error } = await supabase
            .from('stock_movements')
            .upsert(cleanedData, { onConflict: 'id' });
          if (error) {
            console.error('Stock movement sync error:', error);
            // If FK error on device_user_id, retry without it
            if (error.code === '23503' && error.message?.includes('device_user_id')) {
              delete cleanedData.device_user_id;
              const { error: retryError } = await supabase
                .from('stock_movements')
                .upsert(cleanedData, { onConflict: 'id' });
              if (retryError) throw retryError;
            } else {
              throw error;
            }
          }
        }
      } else if (item.table_name === 'device_users') {
        // Handle record_data that might be double-stringified JSON
        let recordData = item.record_data;
        if (typeof recordData === 'string') {
          try {
            recordData = JSON.parse(recordData);
          } catch (e) {
            console.error('Failed to parse record_data string:', e);
          }
        }
        
        if (item.action === 'insert' || item.action === 'update') {
          const { error } = await supabase
            .from('device_users')
            .upsert(recordData);
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
