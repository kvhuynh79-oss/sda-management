import { openDB, DBSchema, IDBPDatabase } from "idb";

interface PendingMutation {
  id: string;
  type: "inspection" | "maintenance" | "photo";
  action: "create" | "update";
  data: Record<string, unknown>;
  timestamp: number;
  retryCount: number;
}

interface CachedData {
  type: string;
  data: unknown;
  timestamp: number;
}

interface OfflinePhoto {
  id: string;
  inspectionId?: string;
  maintenanceId?: string;
  itemId?: string;
  blob: Blob;
  fileName: string;
  timestamp: number;
}

interface OfflineDB extends DBSchema {
  pendingMutations: {
    key: string;
    value: PendingMutation;
  };
  cachedData: {
    key: string;
    value: CachedData;
  };
  offlinePhotos: {
    key: string;
    value: OfflinePhoto;
  };
}

let db: IDBPDatabase<OfflineDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<OfflineDB>> {
  if (db) return db;

  db = await openDB<OfflineDB>("sda-offline", 1, {
    upgrade(database) {
      if (!database.objectStoreNames.contains("pendingMutations")) {
        database.createObjectStore("pendingMutations", { keyPath: "id" });
      }
      if (!database.objectStoreNames.contains("cachedData")) {
        database.createObjectStore("cachedData", { keyPath: "type" });
      }
      if (!database.objectStoreNames.contains("offlinePhotos")) {
        database.createObjectStore("offlinePhotos", { keyPath: "id" });
      }
    },
  });

  return db;
}

// Pending Mutations
export async function addPendingMutation(mutation: PendingMutation): Promise<void> {
  const database = await getDB();
  await database.put("pendingMutations", mutation);
}

export async function getPendingMutations(): Promise<PendingMutation[]> {
  const database = await getDB();
  return database.getAll("pendingMutations");
}

export async function removePendingMutation(id: string): Promise<void> {
  const database = await getDB();
  await database.delete("pendingMutations", id);
}

export async function updateMutationRetryCount(id: string, retryCount: number): Promise<void> {
  const database = await getDB();
  const mutation = await database.get("pendingMutations", id);
  if (mutation) {
    mutation.retryCount = retryCount;
    await database.put("pendingMutations", mutation);
  }
}

// Cached Data
export async function cacheData(type: string, data: unknown): Promise<void> {
  const database = await getDB();
  await database.put("cachedData", { type, data, timestamp: Date.now() });
}

export async function getCachedData<T>(type: string): Promise<T | null> {
  const database = await getDB();
  const cached = await database.get("cachedData", type);
  return cached?.data as T | null;
}

export async function clearCachedData(type: string): Promise<void> {
  const database = await getDB();
  await database.delete("cachedData", type);
}

// Offline Photos
export async function addOfflinePhoto(photo: OfflinePhoto): Promise<void> {
  const database = await getDB();
  await database.put("offlinePhotos", photo);
}

export async function getOfflinePhotos(): Promise<OfflinePhoto[]> {
  const database = await getDB();
  return database.getAll("offlinePhotos");
}

export async function getOfflinePhotosByInspection(inspectionId: string): Promise<OfflinePhoto[]> {
  const database = await getDB();
  const all = await database.getAll("offlinePhotos");
  return all.filter(p => p.inspectionId === inspectionId);
}

export async function getOfflinePhotosByMaintenance(maintenanceId: string): Promise<OfflinePhoto[]> {
  const database = await getDB();
  const all = await database.getAll("offlinePhotos");
  return all.filter(p => p.maintenanceId === maintenanceId);
}

export async function removeOfflinePhoto(id: string): Promise<void> {
  const database = await getDB();
  await database.delete("offlinePhotos", id);
}

// Utility
export async function clearAllOfflineData(): Promise<void> {
  const database = await getDB();
  await database.clear("pendingMutations");
  await database.clear("cachedData");
  await database.clear("offlinePhotos");
}

export async function getPendingCount(): Promise<number> {
  const mutations = await getPendingMutations();
  const photos = await getOfflinePhotos();
  return mutations.length + photos.length;
}
