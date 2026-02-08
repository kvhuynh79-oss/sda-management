/**
 * Inspection Offline Queue System
 *
 * Stores pending inspection item changes (status, remarks, photos) in IndexedDB
 * when offline. Syncs changes when connectivity is restored. Also caches full
 * inspection data so inspectors can continue reviewing items without a network
 * connection.
 *
 * Shares the "sda_offline_db" database with the incident offline queue, upgrading
 * from version 1 to version 2 to add the new object stores while preserving
 * the existing "pending_incidents" store.
 */

// ---------------------------------------------------------------------------
// IndexedDB configuration
// ---------------------------------------------------------------------------

const DB_NAME = "sda_offline_db";
const DB_VERSION = 2;
const CHANGES_STORE = "pending_inspection_changes";
const CACHE_STORE = "cached_inspections";
const INCIDENTS_STORE = "pending_incidents"; // existing store from v1

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type InspectionChangeType = "status" | "remarks" | "photo";

export interface QueuedInspectionChange {
  id: string;
  inspectionId: string;
  itemId: string;
  changeType: InspectionChangeType;
  /** The payload varies by changeType:
   *  - "status": { status, condition?, remarks? }
   *  - "remarks": { remarks }
   *  - "photo": { base64, fileName, fileSize, fileType, description? }
   */
  data: Record<string, unknown>;
  timestamp: number;
  synced: boolean;
  retryCount: number;
  error?: string;
}

export interface CachedInspection {
  inspectionId: string;
  data: Record<string, unknown>;
  items: Record<string, unknown>[];
  cachedAt: number;
}

// ---------------------------------------------------------------------------
// Database helpers
// ---------------------------------------------------------------------------

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Preserve the existing incidents store from v1
      if (!db.objectStoreNames.contains(INCIDENTS_STORE)) {
        const incidentsStore = db.createObjectStore(INCIDENTS_STORE, {
          keyPath: "id",
        });
        incidentsStore.createIndex("timestamp", "timestamp", { unique: false });
        incidentsStore.createIndex("synced", "synced", { unique: false });
      }

      // Create the pending inspection changes store (new in v2)
      if (!db.objectStoreNames.contains(CHANGES_STORE)) {
        const changesStore = db.createObjectStore(CHANGES_STORE, {
          keyPath: "id",
        });
        changesStore.createIndex("inspectionId", "inspectionId", {
          unique: false,
        });
        changesStore.createIndex("timestamp", "timestamp", { unique: false });
        changesStore.createIndex("synced", "synced", { unique: false });
      }

      // Create the cached inspections store (new in v2)
      if (!db.objectStoreNames.contains(CACHE_STORE)) {
        db.createObjectStore(CACHE_STORE, { keyPath: "inspectionId" });
      }
    };
  });
}

// ---------------------------------------------------------------------------
// Pending inspection change operations
// ---------------------------------------------------------------------------

/**
 * Queue an inspection change for later sync.
 */
export async function addInspectionChange(
  change: Omit<QueuedInspectionChange, "id" | "timestamp" | "synced" | "retryCount">
): Promise<string> {
  const db = await openDB();
  const id = crypto.randomUUID();

  const entry: QueuedInspectionChange = {
    ...change,
    id,
    timestamp: Date.now(),
    synced: false,
    retryCount: 0,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction([CHANGES_STORE], "readwrite");
    const store = tx.objectStore(CHANGES_STORE);
    const request = store.add(entry);

    request.onsuccess = () => resolve(id);
    request.onerror = () => reject(request.error);

    tx.oncomplete = () => db.close();
  });
}

/**
 * Get all pending (un-synced) inspection changes, optionally filtered by
 * inspectionId. Results are sorted by timestamp ascending so changes are
 * replayed in the order they were made.
 */
export async function getPendingChanges(
  inspectionId?: string
): Promise<QueuedInspectionChange[]> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction([CHANGES_STORE], "readonly");
    const store = tx.objectStore(CHANGES_STORE);

    let request: IDBRequest;

    if (inspectionId) {
      const index = store.index("inspectionId");
      request = index.getAll(IDBKeyRange.only(inspectionId));
    } else {
      request = store.getAll();
    }

    request.onsuccess = () => {
      const results = (request.result as QueuedInspectionChange[])
        .filter((c) => !c.synced)
        .sort((a, b) => a.timestamp - b.timestamp);
      resolve(results);
    };
    request.onerror = () => reject(request.error);

    tx.oncomplete = () => db.close();
  });
}

/**
 * Return the total number of un-synced inspection changes.
 */
export async function getPendingInspectionCount(): Promise<number> {
  const pending = await getPendingChanges();
  return pending.length;
}

/**
 * Mark a single change as synced.
 */
export async function markChangeAsSynced(id: string): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction([CHANGES_STORE], "readwrite");
    const store = tx.objectStore(CHANGES_STORE);
    const request = store.get(id);

    request.onsuccess = () => {
      const entry = request.result as QueuedInspectionChange | undefined;
      if (entry) {
        entry.synced = true;
        store.put(entry);
      }
      resolve();
    };

    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

/**
 * Record a sync failure. Increments retryCount and stores the error message.
 */
export async function markChangeSyncFailed(
  id: string,
  error: string
): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction([CHANGES_STORE], "readwrite");
    const store = tx.objectStore(CHANGES_STORE);
    const request = store.get(id);

    request.onsuccess = () => {
      const entry = request.result as QueuedInspectionChange | undefined;
      if (entry) {
        entry.retryCount += 1;
        entry.error = error;
        store.put(entry);
      }
      resolve();
    };

    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

/**
 * Remove a change from the queue entirely (typically after successful sync).
 */
export async function removeChange(id: string): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction([CHANGES_STORE], "readwrite");
    const store = tx.objectStore(CHANGES_STORE);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);

    tx.oncomplete = () => db.close();
  });
}

// ---------------------------------------------------------------------------
// Cached inspection operations (read-only offline access)
// ---------------------------------------------------------------------------

/**
 * Cache a full inspection snapshot (header data + items) so the inspector can
 * continue reviewing items while offline.
 */
export async function cacheInspectionData(
  inspectionId: string,
  data: Record<string, unknown>,
  items?: Record<string, unknown>[]
): Promise<void> {
  const db = await openDB();

  const cached: CachedInspection = {
    inspectionId,
    data,
    items: items ?? [],
    cachedAt: Date.now(),
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction([CACHE_STORE], "readwrite");
    const store = tx.objectStore(CACHE_STORE);
    // put() will insert or overwrite an existing cache entry
    const request = store.put(cached);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);

    tx.oncomplete = () => db.close();
  });
}

/**
 * Retrieve a previously cached inspection. Returns null if not found.
 */
export async function getCachedInspection(
  inspectionId: string
): Promise<CachedInspection | null> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction([CACHE_STORE], "readonly");
    const store = tx.objectStore(CACHE_STORE);
    const request = store.get(inspectionId);

    request.onsuccess = () => {
      resolve((request.result as CachedInspection) ?? null);
    };
    request.onerror = () => reject(request.error);

    tx.oncomplete = () => db.close();
  });
}

/**
 * Remove a cached inspection.
 */
export async function removeCachedInspection(
  inspectionId: string
): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction([CACHE_STORE], "readwrite");
    const store = tx.objectStore(CACHE_STORE);
    const request = store.delete(inspectionId);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);

    tx.oncomplete = () => db.close();
  });
}

/**
 * Clear all synced changes from the queue (housekeeping).
 */
export async function clearSyncedChanges(): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction([CHANGES_STORE], "readwrite");
    const store = tx.objectStore(CHANGES_STORE);
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
    tx.oncomplete = () => db.close();
  });
}
