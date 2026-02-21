"use client";

import { useEffect, useState, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import {
  getPendingIncidents,
  markAsSynced,
  markSyncFailed,
  removeFromQueue,
  getPendingCount,
} from "@/lib/offlineQueue";

export interface OfflineSyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSync: Date | null;
  error: string | null;
}

/**
 * Hook for managing offline incident sync
 *
 * Automatically syncs pending incidents when connection is restored.
 * Provides status and manual sync capability.
 */
export function useOfflineSync() {
  const [status, setStatus] = useState<OfflineSyncStatus>({
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
    isSyncing: false,
    pendingCount: 0,
    lastSync: null,
    error: null,
  });

  // Convex mutations for creating incidents and uploading photos
  const createIncident = useMutation(api.incidents.create);
  const addPhoto = useMutation(api.incidents.addPhoto);
  const generateUploadUrl = useMutation(api.maintenancePhotos.generateUploadUrl);

  /**
   * Update pending count
   */
  const updatePendingCount = useCallback(async () => {
    try {
      const count = await getPendingCount();
      setStatus((prev) => ({ ...prev, pendingCount: count }));
    } catch (error) {
    }
  }, []);

  /**
   * Sync all pending incidents to server
   */
  const syncPendingIncidents = useCallback(async () => {
    if (!navigator.onLine) {
      return { success: false, synced: 0, failed: 0 };
    }

    setStatus((prev) => ({ ...prev, isSyncing: true, error: null }));

    try {
      const pending = await getPendingIncidents();

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

      // Sync incidents one by one to handle failures gracefully
      for (const queuedIncident of pending) {
        try {
          const { media, ...incidentData } = queuedIncident.data;

          // Create the incident on server
          const incidentId = await createIncident(incidentData);

          // Upload photos/videos if any
          if (media && Array.isArray(media) && media.length > 0) {
            for (const mediaItem of media) {
              try {
                // Convert base64 back to File
                const response = await fetch(mediaItem.file);
                const blob = await response.blob();
                const file = new File([blob], mediaItem.fileName, {
                  type: mediaItem.fileType,
                });

                // Upload to Convex storage
                const uploadUrl = await generateUploadUrl({
                  userId: incidentData.reportedBy as Id<"users">,
                });
                const uploadResponse = await fetch(uploadUrl, {
                  method: "POST",
                  headers: { "Content-Type": file.type },
                  body: file,
                });
                const { storageId } = await uploadResponse.json();

                // Add photo record
                await addPhoto({
                  incidentId: incidentId as Id<"incidents">,
                  storageId: storageId as Id<"_storage">,
                  fileName: mediaItem.fileName,
                  fileSize: mediaItem.fileSize,
                  fileType: mediaItem.fileType,
                  description: mediaItem.description,
                  uploadedBy: incidentData.reportedBy as Id<"users">,
                });
              } catch (photoError) {
                // Continue with other photos even if one fails
              }
            }
          }

          // Mark as synced and remove from queue
          await markAsSynced(queuedIncident.id);
          await removeFromQueue(queuedIncident.id);

          syncedCount++;
        } catch (error) {
          failedCount++;
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";


          // Mark sync as failed (increases retry count)
          await markSyncFailed(queuedIncident.id, errorMessage);
        }
      }

      // Update status
      await updatePendingCount();

      setStatus((prev) => ({
        ...prev,
        isSyncing: false,
        lastSync: new Date(),
        error:
          failedCount > 0
            ? `${failedCount} incident(s) failed to sync`
            : null,
      }));

      return { success: failedCount === 0, synced: syncedCount, failed: failedCount };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Sync failed";

      setStatus((prev) => ({
        ...prev,
        isSyncing: false,
        error: errorMessage,
      }));

      return { success: false, synced: 0, failed: 0 };
    }
  }, [createIncident, addPhoto, generateUploadUrl, updatePendingCount]);

  /**
   * Listen for online/offline events
   */
  useEffect(() => {
    const handleOnline = async () => {
      setStatus((prev) => ({ ...prev, isOnline: true }));

      // Wait a moment for connection to stabilize
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Auto-sync when coming back online
      await syncPendingIncidents();
    };

    const handleOffline = () => {
      setStatus((prev) => ({ ...prev, isOnline: false }));
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Update pending count on mount
    updatePendingCount();

    // Periodic check for pending incidents (every 30 seconds)
    const intervalId = setInterval(updatePendingCount, 30000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(intervalId);
    };
  }, [syncPendingIncidents, updatePendingCount]);

  return {
    ...status,
    syncNow: syncPendingIncidents,
  };
}
