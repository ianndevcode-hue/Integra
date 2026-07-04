const DB_NAME = 'integra_pdv';
const DB_VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('offline_sales')) {
        const store = db.createObjectStore('offline_sales', { keyPath: 'local_id', autoIncrement: true });
        store.createIndex('sync_status', 'sync_status', { unique: false });
        store.createIndex('created_at', 'created_at', { unique: false });
      }
      if (!db.objectStoreNames.contains('products_cache')) {
        db.createObjectStore('products_cache', { keyPath: '_id' });
      }
      if (!db.objectStoreNames.contains('clients_cache')) {
        db.createObjectStore('clients_cache', { keyPath: '_id' });
      }
      if (!db.objectStoreNames.contains('cash_movements')) {
        const mvStore = db.createObjectStore('cash_movements', { keyPath: 'local_id', autoIncrement: true });
        mvStore.createIndex('sync_status', 'sync_status', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ===== OFFLINE SALES =====
export async function saveOfflineSale(sale) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('offline_sales', 'readwrite');
    const store = tx.objectStore('offline_sales');
    sale.sync_status = 'pending';
    sale.fiscal_status = 'pendente_sync';
    sale.created_at = new Date().toISOString();
    const req = store.add(sale);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getPendingSales() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('offline_sales', 'readonly');
    const store = tx.objectStore('offline_sales');
    const index = store.index('sync_status');
    const req = index.getAll('pending');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getAllOfflineSales() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('offline_sales', 'readonly');
    const req = tx.objectStore('offline_sales').getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function markSaleSynced(localId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('offline_sales', 'readwrite');
    const store = tx.objectStore('offline_sales');
    const getReq = store.get(localId);
    getReq.onsuccess = () => {
      const sale = getReq.result;
      if (sale) {
        sale.sync_status = 'synced';
        sale.synced_at = new Date().toISOString();
        store.put(sale);
      }
      resolve();
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

export async function clearSyncedSales() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('offline_sales', 'readwrite');
    const store = tx.objectStore('offline_sales');
    const index = store.index('sync_status');
    const req = index.openCursor('synced');
    req.onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      } else {
        resolve();
      }
    };
    req.onerror = () => reject(req.error);
  });
}

// ===== PRODUCTS CACHE =====
export async function cacheProducts(products) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('products_cache', 'readwrite');
    const store = tx.objectStore('products_cache');
    store.clear();
    products.forEach(p => {
      if (p._id || p.id) {
        store.put({ ...p, _id: p._id || p.id });
      }
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getCachedProducts() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('products_cache', 'readonly');
    const req = tx.objectStore('products_cache').getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ===== CLIENTS CACHE =====
export async function cacheClients(clients) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('clients_cache', 'readwrite');
    const store = tx.objectStore('clients_cache');
    store.clear();
    clients.forEach(c => {
      if (c._id || c.id) {
        store.put({ ...c, _id: c._id || c.id });
      }
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getCachedClients() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('clients_cache', 'readonly');
    const req = tx.objectStore('clients_cache').getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ===== SYNC ENGINE =====
export async function syncPendingSales(apiPost) {
  const pending = await getPendingSales();
  const results = { synced: 0, failed: 0, errors: [] };
  for (const sale of pending) {
    try {
      const { local_id, sync_status, synced_at, ...saleData } = sale;
      await apiPost('/api/pdv/sync', { sales: [saleData] });
      await markSaleSynced(local_id);
      results.synced++;
    } catch (err) {
      results.failed++;
      results.errors.push({ local_id: sale.local_id, error: err.message });
    }
  }
  return results;
}
