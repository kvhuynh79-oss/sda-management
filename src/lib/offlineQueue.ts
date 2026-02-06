/**
 * Offline Queue System
 *
 * Stores pending incidents in IndexedDB when offline and syncs when online.
 * Ensures NDIS compliance by never losing incident data.
 */

// IndexedDB configuration
const DB_NAME = "sda_offline_db";
const DB_VERSION = 1;
const STORE_NAME = "pending_incidents";

export interface QueuedIncident {
  id: string; // UUID for local tracking
  data: any; // Incident data to be submitted
  timestamp: number; // When it was created offline
  synced: boolean; // Whether it's been synced to server
  retryCount: number; // Number of sync attempts
  error?: string; // Last sync error if any
}

/**
 * Initialize IndexedDB database
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create object store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("timestamp", "timestamp", { unique: false });
        store.createIndex("synced", "synced", { unique: false });
      }
    };
  });
}

/**
 * Add incident to offline queue
 */
export async function addToQueue(incidentData: any): Promise<string> {
  const db = await openDB();
  const id = crypto.randomUUID();

  const queuedIncident: QueuedIncident = {
    id,
    data: incidentData,
    timestamp: Date.now(),
    synced: false,
    retryCount: 0,
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.add(queuedIncident);

    request.onsuccess = () => resolve(id);
    request.onerror = () => reject(request.error);

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Get all pending (unsynced) incidents
 */
export async function getPendingIncidents(): Promise<QueuedIncident[]> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index("synced");
    const request = index.getAll(IDBKeyRange.only(0)); // Get all unsynced (0 = false)

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Get pending incidents count
 */
export async function getPendingCount(): Promise<number> {
  const pending = await getPendingIncidents();
  return pending.length;
}

/**
 * Mark incident as synced
 */
export async function markAsSynced(id: string): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => {
      const incident = request.result;
      if (incident) {
        incident.synced = true;
        store.put(incident);
      }
      resolve();
    };

    request.onerror = () => reject(request.error);

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Update retry count and error for failed sync
 */
export async function markSyncFailed(
  id: string,
  error: string
): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => {
      const incident = request.result;
      if (incident) {
        incident.retryCount += 1;
        incident.error = error;
        store.put(incident);
      }
      resolve();
    };

    request.onerror = () => reject(request.error);

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Remove incident from queue (after successful sync)
 */
export async function removeFromQueue(id: string): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Clear all synced incidents (cleanup)
 */
export async function clearSyncedIncidents(): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index("synced");
    const request = index.openCursor(IDBKeyRange.only(true));

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      } else {
        resolve();
      }
    };

    request.onerror = () => reject(request.error);

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Get all incidents (for debugging)
 */
export async function getAllIncidents(): Promise<QueuedIncident[]> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);

    transaction.oncomplete = () => db.close();
  });
}
