"use client";

import { useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useNetwork } from "@/contexts/NetworkContext";
import { addOfflinePhoto } from "@/lib/offlineStorage";
import { Id } from "../../convex/_generated/dataModel";

export function useOfflineMaintenance() {
  const { isOnline, refreshPendingCount } = useNetwork();
  const generateUploadUrl = useMutation(api.maintenancePhotos.generateUploadUrl);
  const addPhotoMutation = useMutation(api.maintenancePhotos.addPhoto);

  const uploadMaintenancePhoto = useCallback(async (
    file: File,
    maintenanceRequestId: Id<"maintenanceRequests">,
    uploadedBy: Id<"users">,
    photoType: "before" | "during" | "after" | "issue" = "issue",
    description?: string
  ) => {
    if (isOnline) {
      try {
        const uploadUrl = await generateUploadUrl({});
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        const { storageId } = await result.json();

        return addPhotoMutation({
          maintenanceRequestId,
          storageId,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          uploadedBy,
          photoType,
          description,
        });
      } catch (error) {
        console.error("Failed to upload maintenance photo, saving offline:", error);
        // Fall through to offline storage
      }
    }

    // Store photo locally for later upload
    await addOfflinePhoto({
      id: `maint-photo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      maintenanceId: maintenanceRequestId,
      blob: file,
      fileName: file.name,
      timestamp: Date.now(),
    });
    await refreshPendingCount();
  }, [isOnline, generateUploadUrl, addPhotoMutation, refreshPendingCount]);

  return { uploadMaintenancePhoto, isOnline };
}
