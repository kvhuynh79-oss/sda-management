"use client";

import { useEffect, useState, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import {
  getPendingChanges,
  getPendingInspectionCount,
  markChangeAsSynced,
  markChangeSyncFailed,
  removeChange,
  cacheInspectionData,
  type QueuedInspectionChange,
} from "@/lib/inspectionOfflineQueue";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface InspectionOfflineSyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSync: Date | null;
  error: string | null;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Hook for managing offline inspection change synchronisation.
 *
 * Monitors network connectivity, automatically syncs queued inspection item
 * changes when the connection is restored, and exposes a manual `syncNow`
 * trigger for the UI.
 *
 * Change types handled:
 *  - "status"  : calls `inspections.updateItemStatus`
 *  - "remarks" : calls `inspections.updateItemStatus` with remarks only
 *  - "photo"   : uploads the file via `inspections.generateUploadUrl` then
 *                calls `inspections.saveInspectionPhoto`
 */
export function useInspectionOfflineSync() {
  const [status, setStatus] = useState<InspectionOfflineSyncStatus>({
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
    isSyncing: false,
    pendingCount: 0,
    lastSync: null,
    error: null,
  });

  // Convex mutations used during sync
  const updateItemStatus = useMutation(api.inspections.updateItemStatus);
  const generateUploadUrl = useMutation(api.inspections.generateUploadUrl);
  const saveInspectionPhoto = useMutation(api.inspections.saveInspectionPhoto);

  // -------------------------------------------------------------------
  // Pending count refresh
  // -------------------------------------------------------------------

  const updatePendingCount = useCallback(async () => {
    try {
      const count = await getPendingInspectionCount();
      setStatus((prev) => ({ ...prev, pendingCount: count }));
    } catch (err) {
    }
  }, []);

  // -------------------------------------------------------------------
  // Single change sync
  // -------------------------------------------------------------------

  const syncSingleChange = useCallback(
    async (change: QueuedInspectionChange): Promise<void> => {
      const { changeType, data, itemId, inspectionId } = change;

      switch (changeType) {
        case "status": {
          await updateItemStatus({
            itemId: itemId as Id<"inspectionItems">,
            status: data.status as "pending" | "pass" | "fail" | "na",
            condition: data.condition as string | undefined,
            remarks: data.remarks as string | undefined,
            updatedBy: data.updatedBy as Id<"users">,
          });
          break;
        }

        case "remarks": {
          // The backend does not have a standalone remarks mutation. We call
          // updateItemStatus with only the remarks field populated. The status
          // field is required by Convex validation so we pass the current
          // status stored in the change data.
          await updateItemStatus({
            itemId: itemId as Id<"inspectionItems">,
            status: (data.currentStatus as "pending" | "pass" | "fail" | "na") ?? "pending",
            remarks: data.remarks as string,
            updatedBy: data.updatedBy as Id<"users">,
          });
          break;
        }

        case "photo": {
          // 1. Convert the stored base64 data URL back to a File object
          const base64 = data.base64 as string;
          const fileName = data.fileName as string;
          const fileType = data.fileType as string;
          const fileSize = data.fileSize as number;
          const description = data.description as string | undefined;
          const uploadedBy = data.uploadedBy as Id<"users">;

          const response = await fetch(base64);
          const blob = await response.blob();
          const file = new File([blob], fileName, { type: fileType });

          // 2. Get an upload URL from Convex storage
          const uploadUrl = await generateUploadUrl({ userId: uploadedBy });

          // 3. Upload the binary data
          const uploadResponse = await fetch(uploadUrl, {
            method: "POST",
            headers: { "Content-Type": file.type },
            body: file,
          });
          const { storageId } = await uploadResponse.json();

          // 4. Create the inspection photo record
          await saveInspectionPhoto({
            inspectionId: inspectionId as Id<"inspections">,
            inspectionItemId: itemId as Id<"inspectionItems">,
            storageId: storageId as Id<"_storage">,
            fileName,
            fileSize,
            fileType,
            description,
            uploadedBy,
          });
          break;
        }

        default:
      }
    },
    [updateItemStatus, generateUploadUrl, saveInspectionPhoto]
  );

  // -------------------------------------------------------------------
  // Full sync pass
  // -------------------------------------------------------------------

  const syncPendingChanges = useCallback(async () => {
    if (!navigator.onLine) {
      return { success: false, synced: 0, failed: 0 };
    }

    setStatus((prev) => ({ ...prev, isSyncing: true, error: null }));

    try {
      const pending = await getPendingChanges();

      if (pending.length === 0) {
        setStatus((prev) => ({
          ...prev,
          isSyncing: false,
          lastSync: new Date(),
        }));
        return { success: true, synced: 0, failed: 0 };
      }


      let syncedCount = 0;
      let failedCount = 0;

      // Process changes sequentially to preserve order of operations
      for (const change of pending) {
        try {
          await syncSingleChange(change);

          // Mark as synced then remove from queue
          await markChangeAsSynced(change.id);
          await removeChange(change.id);

          syncedCount++;
        } catch (err) {
          failedCount++;
          const errorMessage =
            err instanceof Error ? err.message : "Unknown error";


          await markChangeSyncFailed(change.id, errorMessage);
        }
      }

      await updatePendingCount();

      setStatus((prev) => ({
        ...prev,
        isSyncing: false,
        lastSync: new Date(),
        error:
          failedCount > 0
            ? `${failedCount} inspection change(s) failed to sync`
            : null,
      }));

      return {
        success: failedCount === 0,
        synced: syncedCount,
        failed: failedCount,
      };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Inspection sync failed";

      setStatus((prev) => ({
        ...prev,
        isSyncing: false,
        error: errorMessage,
      }));

      return { success: false, synced: 0, failed: 0 };
    }
  }, [syncSingleChange, updatePendingCount]);

  // -------------------------------------------------------------------
  // Cache helper exposed to consumers
  // -------------------------------------------------------------------

  /**
   * Cache a full inspection snapshot in IndexedDB so it can be viewed offline.
   */
  const cacheInspection = useCallback(
    async (
      inspectionId: string,
      inspectionData: Record<string, unknown>,
      items: Record<string, unknown>[]
    ) => {
      try {
        await cacheInspectionData(inspectionId, inspectionData, items);
      } catch (err) {
      }
    },
    []
  );

  // -------------------------------------------------------------------
  // Network event listeners and periodic polling
  // -------------------------------------------------------------------

  useEffect(() => {
    const handleOnline = async () => {
      setStatus((prev) => ({ ...prev, isOnline: true }));

      // Wait 1 second for connection to stabilise
      await new Promise((resolve) => setTimeout(resolve, 1000));

      await syncPendingChanges();
    };

    const handleOffline = () => {
      setStatus((prev) => ({ ...prev, isOnline: false }));
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Initial pending count on mount
    updatePendingCount();

    // Periodic pending count check every 30 seconds
    const intervalId = setInterval(updatePendingCount, 30000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(intervalId);
    };
  }, [syncPendingChanges, updatePendingCount]);

  // -------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------

  return {
    isOnline: status.isOnline,
    isSyncing: status.isSyncing,
    pendingCount: status.pendingCount,
    lastSync: status.lastSync,
    error: status.error,
    syncNow: syncPendingChanges,
    cacheInspection,
  };
}
