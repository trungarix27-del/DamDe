import { Story, VectorData } from '../types';

const DB_NAME = 'SachHiepDB';
const DB_VERSION = 1;
const STORE_STORIES = 'sach_hiep_stories';
const STORE_VECTORS = 'sach_hiep_vectors';

let dbInstance: Promise<IDBDatabase> | null = null;

const openDB = (): Promise<IDBDatabase> => {
  if (dbInstance) return dbInstance;

  dbInstance = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
        dbInstance = null;
        reject(request.error);
    };
    
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const tx = (event.target as IDBOpenDBRequest).transaction;

      if (!db.objectStoreNames.contains(STORE_STORIES)) {
        db.createObjectStore(STORE_STORIES, { keyPath: 'id' });
      }

      let vectorStore: IDBObjectStore;
      if (!db.objectStoreNames.contains(STORE_VECTORS)) {
        vectorStore = db.createObjectStore(STORE_VECTORS, { keyPath: 'id' });
      } else {
        vectorStore = tx!.objectStore(STORE_VECTORS);
      }

      if (!vectorStore.indexNames.contains('storyId')) {
          vectorStore.createIndex('storyId', 'storyId', { unique: false });
      }
      if (!vectorStore.indexNames.contains('referenceId')) {
          vectorStore.createIndex('referenceId', 'metadata.referenceId', { unique: false });
      }
      if (!vectorStore.indexNames.contains('type')) {
          vectorStore.createIndex('type', 'metadata.type', { unique: false });
      }
    };
  });
  
  return dbInstance;
};

export const sachHiepStorageService = {
  async saveStory(story: Story): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_STORIES, 'readwrite');
      const store = tx.objectStore(STORE_STORIES);
      const request = store.put(story);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  async getStory(id: string): Promise<Story | undefined> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_STORIES, 'readonly');
      const store = tx.objectStore(STORE_STORIES);
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async getAllStories(): Promise<Story[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_STORIES, 'readonly');
      const store = tx.objectStore(STORE_STORIES);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async deleteStory(id: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_STORIES, 'readwrite');
        const store = tx.objectStore(STORE_STORIES);
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
  },

  async saveVectors(vectors: VectorData[]): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_VECTORS, 'readwrite');
      const store = tx.objectStore(STORE_VECTORS);
      
      if (vectors.length === 0) {
          resolve();
          return;
      }

      let errorOccurred = false;
      let completed = 0;

      vectors.forEach(v => {
        const req = store.put(v);
        req.onsuccess = () => {
          completed++;
          if (completed === vectors.length && !errorOccurred) resolve();
        };
        req.onerror = () => {
           console.error("Vector save error", req.error);
           errorOccurred = true;
        };
      });
      
      tx.oncomplete = () => {
          if (!errorOccurred && completed < vectors.length) resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  },

  async getVectorsByStory(storyId: string): Promise<VectorData[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_VECTORS, 'readonly');
      const store = tx.objectStore(STORE_VECTORS);
      const index = store.index('storyId');
      const request = index.getAll(IDBKeyRange.only(storyId));
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async deleteVectorsByStory(storyId: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_VECTORS, 'readwrite');
        const store = tx.objectStore(STORE_VECTORS);
        const index = store.index('storyId');
        
        const request = index.openKeyCursor(IDBKeyRange.only(storyId));
        
        request.onsuccess = () => {
            const cursor = request.result;
            if (cursor) {
                store.delete(cursor.primaryKey);
                cursor.continue();
            } else {
                resolve();
            }
        };
        request.onerror = () => reject(request.error);
    });
  },

  async deleteVectorsByReference(storyId: string, referenceId: string): Promise<void> {
      const db = await openDB();
      return new Promise((resolve, reject) => {
          const tx = db.transaction(STORE_VECTORS, 'readwrite');
          const store = tx.objectStore(STORE_VECTORS);
          const index = store.index('referenceId');
          
          const request = index.openCursor(IDBKeyRange.only(referenceId));
          
          request.onsuccess = () => {
              const cursor = request.result;
              if (cursor) {
                  const record = cursor.value as VectorData;
                  if (record.storyId === storyId) {
                      cursor.delete();
                  }
                  cursor.continue();
              } else {
                  resolve();
              }
          };
          request.onerror = () => reject(request.error);
      });
  },

  async getAllVectors(): Promise<VectorData[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_VECTORS, 'readonly');
      const store = tx.objectStore(STORE_VECTORS);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
};
