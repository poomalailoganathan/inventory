import { 
  Rod, 
  Process, 
  MaterialUsed, 
  FinishedGood, 
  NonConformingItem, 
  RejectedItem, 
  ScrapItem, 
  LeftoverMaterial 
} from '../types/inventory';

const DB_NAME = 'MetalRodInventoryDB';
const DB_VERSION = 1;

const STORES = {
  RODS: 'rods',
  PROCESSES: 'processes',
  FINISHED_GOODS: 'finishedGoods',
  NON_CONFORMING: 'nonConformingItems',
  REJECTED: 'rejectedItems',
  WEIGHT_LOSS: 'weightLossItems',
  LEFTOVER_MATERIALS: 'leftoverMaterials',
  PROCESS_SUMMARY: 'processSummary',
  DIAMETERS: 'diameters',
  BLADE_DIAMETERS: 'bladeDiameters',
  INVENTORY_HISTORY: 'inventoryHistory',
  PROCESS_GROUPS: 'processGroups'
};

class DatabaseManager {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores
        if (!db.objectStoreNames.contains(STORES.RODS)) {
          const rodsStore = db.createObjectStore(STORES.RODS, { keyPath: 'id' });
          rodsStore.createIndex('diameter', 'diameter', { unique: false });
          rodsStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.PROCESSES)) {
          const processesStore = db.createObjectStore(STORES.PROCESSES, { keyPath: 'id' });
          processesStore.createIndex('processId', 'processId', { unique: false });
          processesStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.FINISHED_GOODS)) {
          db.createObjectStore(STORES.FINISHED_GOODS, { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains(STORES.NON_CONFORMING)) {
          db.createObjectStore(STORES.NON_CONFORMING, { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains(STORES.REJECTED)) {
          db.createObjectStore(STORES.REJECTED, { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains(STORES.WEIGHT_LOSS)) {
          db.createObjectStore(STORES.WEIGHT_LOSS, { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains(STORES.LEFTOVER_MATERIALS)) {
          db.createObjectStore(STORES.LEFTOVER_MATERIALS, { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains(STORES.PROCESS_SUMMARY)) {
          db.createObjectStore(STORES.PROCESS_SUMMARY, { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains(STORES.DIAMETERS)) {
          db.createObjectStore(STORES.DIAMETERS, { keyPath: 'diameter' });
        }

        if (!db.objectStoreNames.contains(STORES.BLADE_DIAMETERS)) {
          db.createObjectStore(STORES.BLADE_DIAMETERS, { keyPath: 'diameter' });
        }

        if (!db.objectStoreNames.contains(STORES.INVENTORY_HISTORY)) {
          const historyStore = db.createObjectStore(STORES.INVENTORY_HISTORY, { keyPath: 'id' });
          historyStore.createIndex('date', 'date', { unique: false });
          historyStore.createIndex('type', 'type', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.PROCESS_GROUPS)) {
          db.createObjectStore(STORES.PROCESS_GROUPS, { keyPath: 'id' });
        }
      };
    });
  }

  async add<T>(storeName: string, data: T): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.add(data);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getAll<T>(storeName: string): Promise<T[]> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async update<T>(storeName: string, data: T): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async delete(storeName: string, id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getByIndex<T>(storeName: string, indexName: string, value: any): Promise<T[]> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async exportAllData(): Promise<any> {
    const data: any = {};
    
    for (const store of Object.values(STORES)) {
      data[store] = await this.getAll(store);
    }
    
    return data;
  }

  async importAllData(data: any): Promise<void> {
    for (const [storeName, items] of Object.entries(data)) {
      if (Object.values(STORES).includes(storeName as any)) {
        const transaction = this.db!.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        
        // Clear existing data
        await new Promise<void>((resolve, reject) => {
          const clearRequest = store.clear();
          clearRequest.onerror = () => reject(clearRequest.error);
          clearRequest.onsuccess = () => resolve();
        });
        
        // Add new data
        for (const item of items as any[]) {
          await new Promise<void>((resolve, reject) => {
            const addRequest = store.add(item);
            addRequest.onerror = () => reject(addRequest.error);
            addRequest.onsuccess = () => resolve();
          });
        }
      }
    }
  }
}

export const dbManager = new DatabaseManager();
export { STORES };