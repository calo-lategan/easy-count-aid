import { useState, useEffect, useCallback } from 'react';
import * as db from '@/lib/indexedDb';
import { addToSyncQueue } from '@/lib/indexedDb';
import { triggerSync } from '@/lib/syncService';

export function useInventoryItems() {
  const [items, setItems] = useState<db.InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadItems = useCallback(async () => {
    const data = await db.getAllItems();
    setItems(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const addItem = async (item: Omit<db.InventoryItem, 'id' | 'created_at' | 'updated_at'>) => {
    const newItem: db.InventoryItem = {
      ...item,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    await db.saveItem(newItem);
    await addToSyncQueue({
      action: 'insert',
      table_name: 'inventory_items',
      record_data: newItem,
    });
    
    await loadItems();
    triggerSync();
    return newItem;
  };

  const updateItem = async (id: string, updates: Partial<db.InventoryItem>) => {
    const existing = await db.getItem(id);
    if (!existing) return;
    
    const updated: db.InventoryItem = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    
    await db.saveItem(updated);
    await addToSyncQueue({
      action: 'update',
      table_name: 'inventory_items',
      record_data: updated,
    });
    
    await loadItems();
    triggerSync();
    return updated;
  };

  const updateQuantity = async (
    id: string, 
    quantity: number, 
    type: 'add' | 'remove',
    userId?: string,
    entryMethod: 'ai_assisted' | 'manual' = 'manual',
    aiConfidence?: number,
    notes?: string,
    condition?: 'new' | 'good' | 'damaged' | 'broken'
  ) => {
    const existing = await db.getItem(id);
    if (!existing) return;
    
    // Allow negative quantities
    const newQuantity = type === 'add' 
      ? existing.current_quantity + quantity 
      : existing.current_quantity - quantity;
    
    // Update item quantity
    const updated: db.InventoryItem = {
      ...existing,
      current_quantity: newQuantity,
      updated_at: new Date().toISOString(),
    };
    
    await db.saveItem(updated);
    await addToSyncQueue({
      action: 'update',
      table_name: 'inventory_items',
      record_data: updated,
    });
    
    // Create stock movement record with condition
    const movement: db.StockMovement = {
      id: crypto.randomUUID(),
      item_id: id,
      device_user_id: userId,
      movement_type: type,
      quantity,
      entry_method: entryMethod,
      ai_confidence: aiConfidence,
      notes,
      condition,
      created_at: new Date().toISOString(),
    };
    
    await db.saveMovement(movement);
    await addToSyncQueue({
      action: 'insert',
      table_name: 'stock_movements',
      record_data: movement,
    });
    
    await loadItems();
    triggerSync();
    return updated;
  };

  // Create a stock movement record without changing quantity (for initial stock)
  const addStockMovement = async (
    itemId: string,
    quantity: number,
    type: 'add' | 'remove',
    userId?: string,
    entryMethod: 'ai_assisted' | 'manual' = 'manual',
    aiConfidence?: number,
    notes?: string,
    condition?: 'new' | 'good' | 'damaged' | 'broken'
  ) => {
    const movement: db.StockMovement = {
      id: crypto.randomUUID(),
      item_id: itemId,
      device_user_id: userId,
      movement_type: type,
      quantity,
      entry_method: entryMethod,
      ai_confidence: aiConfidence,
      notes,
      condition,
      created_at: new Date().toISOString(),
    };
    
    await db.saveMovement(movement);
    await addToSyncQueue({
      action: 'insert',
      table_name: 'stock_movements',
      record_data: movement,
    });
    
    triggerSync();
    return movement;
  };

  const deleteItem = async (id: string) => {
    await db.deleteItem(id);
    await addToSyncQueue({
      action: 'delete',
      table_name: 'inventory_items',
      record_data: { id },
    });
    
    await loadItems();
    triggerSync();
  };

  return {
    items,
    loading,
    addItem,
    updateItem,
    updateQuantity,
    addStockMovement,
    deleteItem,
    refresh: loadItems,
  };
}

export function useDeviceUsers() {
  const [users, setUsers] = useState<db.DeviceUser[]>([]);
  const [currentUser, setCurrentUser] = useState<db.DeviceUser | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUsers = useCallback(async () => {
    const data = await db.getAllDeviceUsers();
    setUsers(data);
    
    // Load saved current user from localStorage
    const savedUserId = localStorage.getItem('currentDeviceUserId');
    if (savedUserId) {
      const user = data.find(u => u.id === savedUserId);
      if (user) setCurrentUser(user);
    }
    
    setLoading(false);
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const addUser = async (name: string) => {
    const newUser: db.DeviceUser = {
      id: crypto.randomUUID(),
      name,
      created_at: new Date().toISOString(),
    };
    
    await db.saveDeviceUser(newUser);
    await addToSyncQueue({
      action: 'insert',
      table_name: 'device_users',
      record_data: newUser,
    });
    
    await loadUsers();
    triggerSync();
    return newUser;
  };

  const selectUser = (user: db.DeviceUser | null) => {
    setCurrentUser(user);
    if (user) {
      localStorage.setItem('currentDeviceUserId', user.id);
    } else {
      localStorage.removeItem('currentDeviceUserId');
    }
  };

  return {
    users,
    currentUser,
    loading,
    addUser,
    selectUser,
    refresh: loadUsers,
  };
}

export function useStockMovements(itemId?: string) {
  const [movements, setMovements] = useState<db.StockMovement[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMovements = useCallback(async () => {
    const data = itemId 
      ? await db.getMovementsByItem(itemId)
      : await db.getAllMovements();
    setMovements(data.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ));
    setLoading(false);
  }, [itemId]);

  useEffect(() => {
    loadMovements();
  }, [loadMovements]);

  return { movements, loading, refresh: loadMovements };
}
