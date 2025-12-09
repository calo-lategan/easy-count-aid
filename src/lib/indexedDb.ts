import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  current_quantity: number;
  reference_image_url?: string;
  category_id?: string | null;
  condition?: 'new' | 'good' | 'damaged' | 'broken';
  photos?: string[];
  low_stock_threshold?: number;
  created_at: string;
  updated_at: string;
}

interface DeviceUser {
  id: string;
  name: string;
  created_at: string;
}

interface StockMovement {
  id: string;
  item_id: string;
  device_user_id?: string;
  movement_type: 'add' | 'remove';
  quantity: number;
  entry_method: 'ai_assisted' | 'manual';
  ai_confidence?: number;
  notes?: string;
  condition?: 'new' | 'good' | 'damaged' | 'broken';
  created_at: string;
}

interface SyncQueueItem {
  id: string;
  action: 'insert' | 'update' | 'delete';
  table_name: string;
  record_data: any;
  synced: boolean;
  created_at: string;
  synced_at?: string;
}

interface InventoryDB extends DBSchema {
  inventory_items: {
    key: string;
    value: InventoryItem;
    indexes: { 'by-sku': string };
  };
  device_users: {
    key: string;
    value: DeviceUser;
  };
  stock_movements: {
    key: string;
    value: StockMovement;
    indexes: { 'by-item': string };
  };
  sync_queue: {
    key: string;
    value: SyncQueueItem;
    indexes: { 'by-synced': number };
  };
}

let dbInstance: IDBPDatabase<InventoryDB> | null = null;

export async function getDb(): Promise<IDBPDatabase<InventoryDB>> {
  if (dbInstance) return dbInstance;
  
  dbInstance = await openDB<InventoryDB>('inventory-db', 1, {
    upgrade(db) {
      // Inventory items store
      const itemStore = db.createObjectStore('inventory_items', { keyPath: 'id' });
      itemStore.createIndex('by-sku', 'sku', { unique: true });
      
      // Device users store
      db.createObjectStore('device_users', { keyPath: 'id' });
      
      // Stock movements store
      const movementStore = db.createObjectStore('stock_movements', { keyPath: 'id' });
      movementStore.createIndex('by-item', 'item_id');
      
      // Sync queue store
      const syncStore = db.createObjectStore('sync_queue', { keyPath: 'id' });
      syncStore.createIndex('by-synced', 'synced');
    },
  });
  
  return dbInstance;
}

// Inventory Items
export async function getAllItems(): Promise<InventoryItem[]> {
  const db = await getDb();
  return db.getAll('inventory_items');
}

export async function getItem(id: string): Promise<InventoryItem | undefined> {
  const db = await getDb();
  return db.get('inventory_items', id);
}

export async function saveItem(item: InventoryItem): Promise<void> {
  const db = await getDb();
  await db.put('inventory_items', item);
}

export async function deleteItem(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('inventory_items', id);
}

// Device Users
export async function getAllDeviceUsers(): Promise<DeviceUser[]> {
  const db = await getDb();
  return db.getAll('device_users');
}

export async function saveDeviceUser(user: DeviceUser): Promise<void> {
  const db = await getDb();
  await db.put('device_users', user);
}

// Stock Movements
export async function getAllMovements(): Promise<StockMovement[]> {
  const db = await getDb();
  return db.getAll('stock_movements');
}

export async function getMovementsByItem(itemId: string): Promise<StockMovement[]> {
  const db = await getDb();
  return db.getAllFromIndex('stock_movements', 'by-item', itemId);
}

export async function saveMovement(movement: StockMovement): Promise<void> {
  const db = await getDb();
  await db.put('stock_movements', movement);
}

// Sync Queue
export async function addToSyncQueue(item: Omit<SyncQueueItem, 'id' | 'created_at' | 'synced'>): Promise<void> {
  const db = await getDb();
  const queueItem: SyncQueueItem = {
    ...item,
    id: crypto.randomUUID(),
    synced: false,
    created_at: new Date().toISOString(),
  };
  await db.put('sync_queue', queueItem);
}

export async function getUnsyncedItems(): Promise<SyncQueueItem[]> {
  const db = await getDb();
  const all = await db.getAll('sync_queue');
  return all.filter(item => !item.synced);
}

export async function markAsSynced(id: string): Promise<void> {
  const db = await getDb();
  const item = await db.get('sync_queue', id);
  if (item) {
    item.synced = true;
    item.synced_at = new Date().toISOString();
    await db.put('sync_queue', item);
  }
}

export async function clearSyncedItems(): Promise<void> {
  const db = await getDb();
  const all = await db.getAll('sync_queue');
  for (const item of all) {
    if (item.synced) {
      await db.delete('sync_queue', item.id);
    }
  }
}

export type { InventoryItem, DeviceUser, StockMovement, SyncQueueItem };
