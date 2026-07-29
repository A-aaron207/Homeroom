window.Homeroom = window.Homeroom || {};

Homeroom.OfflineDB = {
  dbName: 'HomeroomOfflineDB',
  version: 1,
  db: null,

  async init() {
    if (this.db) return this.db;
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onupgradeneeded = (e) => {
        const db = e.target.result;

        // Key-value store for cached API responses (notes, announcements, user profile)
        if (!db.objectStoreNames.contains('cache')) {
          db.createObjectStore('cache', { keyPath: 'key' });
        }

        // Offline action queue for messages/posts queued while offline
        if (!db.objectStoreNames.contains('queue')) {
          db.createObjectStore('queue', { keyPath: 'id', autoIncrement: true });
        }
      };

      request.onsuccess = (e) => {
        this.db = e.target.result;
        resolve(this.db);
      };

      request.onerror = (e) => {
        console.warn('IndexedDB failed to initialize:', e);
        resolve(null);
      };
    });
  },

  async setCache(key, data) {
    try {
      await this.init();
      if (!this.db) return;
      const tx = this.db.transaction('cache', 'readwrite');
      const store = tx.objectStore('cache');
      store.put({ key, data, timestamp: Date.now() });
    } catch (e) {}
  },

  async getCache(key) {
    try {
      await this.init();
      if (!this.db) return null;
      return new Promise((resolve) => {
        const tx = this.db.transaction('cache', 'readonly');
        const store = tx.objectStore('cache');
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result ? req.result.data : null);
        req.onerror = () => resolve(null);
      });
    } catch (e) {
      return null;
    }
  },

  async queueAction(actionType, payload) {
    try {
      await this.init();
      if (!this.db) return;
      const tx = this.db.transaction('queue', 'readwrite');
      const store = tx.objectStore('queue');
      store.add({ actionType, payload, createdAt: Date.now() });
    } catch (e) {}
  },

  async processQueue(handler) {
    try {
      await this.init();
      if (!this.db) return;
      const tx = this.db.transaction('queue', 'readwrite');
      const store = tx.objectStore('queue');
      const req = store.getAll();
      req.onsuccess = async () => {
        const items = req.result || [];
        for (const item of items) {
          try {
            await handler(item.actionType, item.payload);
            const delTx = this.db.transaction('queue', 'readwrite');
            delTx.objectStore('queue').delete(item.id);
          } catch (err) {
            break; // Stop if offline or failed
          }
        }
      };
    } catch (e) {}
  }
};

// Automatically listen for online event to sync queued offline actions
window.addEventListener('online', () => {
  if (window.Homeroom && window.Homeroom.toast) {
    window.Homeroom.toast('⚡ Back online! Synchronizing...', 'success');
  }
  Homeroom.OfflineDB.processQueue(async (actionType, payload) => {
    if (actionType === 'send_message') {
      await Homeroom.API.post(`/conversations/${payload.chatId}/messages`, { content: payload.content });
    }
  });
});
