window.Homeroom = window.Homeroom || {};

Homeroom.OfflineDB = {
  dbName: 'HomeroomOfflineDB',
  version: 2,
  db: null,

  async init() {
    if (this.db) return this.db;
    return new Promise((resolve) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onupgradeneeded = (e) => {
        const db = e.target.result;

        if (!db.objectStoreNames.contains('cache')) {
          db.createObjectStore('cache', { keyPath: 'key' });
        }

        if (!db.objectStoreNames.contains('queue')) {
          db.createObjectStore('queue', { keyPath: 'id', autoIncrement: true });
        }

        if (!db.objectStoreNames.contains('drafts')) {
          db.createObjectStore('drafts', { keyPath: 'id' });
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
    } catch (e) {
      console.warn('IndexedDB setCache failed:', e);
    }
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

      if (Homeroom.toast) {
        Homeroom.toast('📥 Saved offline! Will sync automatically when connected.', 'info');
      }

      // Try registering background sync if supported
      if ('serviceWorker' in navigator && 'SyncManager' in window) {
        navigator.serviceWorker.ready.then(swRegistration => {
          swRegistration.sync.register('sync-offline-queue').catch(() => {});
        });
      }
    } catch (e) {
      console.warn('IndexedDB queueAction failed:', e);
    }
  },

  async getQueue() {
    try {
      await this.init();
      if (!this.db) return [];
      return new Promise((resolve) => {
        const tx = this.db.transaction('queue', 'readonly');
        const store = tx.objectStore('queue');
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });
    } catch (e) {
      return [];
    }
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
        if (items.length === 0) return;

        let processedCount = 0;
        for (const item of items) {
          try {
            await handler(item.actionType, item.payload);
            const delTx = this.db.transaction('queue', 'readwrite');
            delTx.objectStore('queue').delete(item.id);
            processedCount++;
          } catch (err) {
            console.warn(`Failed to process queued action ${item.actionType}:`, err);
            break;
          }
        }
        if (processedCount > 0 && Homeroom.toast) {
          Homeroom.toast(`⚡ Synced ${processedCount} offline action(s) with classroom server!`, 'success');
        }
      };
    } catch (e) {}
  }
};

// Global queue processor handler
async function handleOfflineAction(actionType, payload) {
  if (actionType === 'send_message') {
    await Homeroom.API.post(`/conversations/${payload.chatId}/messages`, { content: payload.content });
  } else if (actionType === 'create_question') {
    await Homeroom.API.post('/qna/questions', payload);
  } else if (actionType === 'upload_note') {
    await Homeroom.API.post('/notes', payload);
  } else if (actionType === 'sync_xp') {
    await Homeroom.API.post('/user/xp', payload);
  }
}

// Process sync queue when online
window.addEventListener('online', () => {
  if (window.Homeroom && window.Homeroom.toast) {
    window.Homeroom.toast('⚡ Connection restored! Synchronizing offline data...', 'success');
  }
  Homeroom.OfflineDB.processQueue(handleOfflineAction);
});

// Process sync queue on service worker postMessage
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'PROCESS_OFFLINE_QUEUE') {
      Homeroom.OfflineDB.processQueue(handleOfflineAction);
    }
  });
}
