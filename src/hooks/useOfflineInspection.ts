"use client";

import { useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useNetwork } from "@/contexts/NetworkContext";
import { addPendingMutation, addOfflinePhoto } from "@/lib/offlineStorage";
import { Id } from "../../convex/_generated/dataModel";

export function useOfflineInspection() {
  const { isOnline, refreshPendingCount } = useNetwork();
  const updateItemStatusMutation = useMutation(api.inspections.updateItemStatus);
  const generateUploadUrl = useMutation(api.inspections.generateUploadUrl);
  const savePhotoMutation = useMutation(api.inspections.saveInspectionPhoto);

  const updateItemStatus = useCallback(async (
    itemId: Id<"inspectionItems">,
    status: "pending" | "pass" | "fail" | "na",
    remarks: string | undefined,
    updatedBy: Id<"users">
  ) => {
    if (isOnline) {
      return updateItemStatusMutation({ itemId, status, remarks, updatedBy });
    }

    // Queue for later sync
    await addPendingMutation({
      id: `inspection-item-${itemId}-${Date.now()}`,
      type: "inspection",
      action: "update",
      data: { itemId, status, remarks, updatedBy },
      timestamp: Date.now(),
      retryCount: 0,
    });
    await refreshPendingCount();
  }, [isOnline, updateItemStatusMutation, refreshPendingCount]);

  const uploadPhoto = useCallback(async (
    file: File,
    inspectionId: Id<"inspections">,
    inspectionItemId: Id<"inspectionItems">,
    uploadedBy: Id<"users">
  ) => {
    if (isOnline) {
      try {
        const uploadUrl = await generateUploadUrl({ userId: uploadedBy });
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        const { storageId } = await result.json();

        return savePhotoMutation({
          inspectionId,
          inspectionItemId,
          storageId,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          uploadedBy,
        });
      } catch (error) {
        // Fall through to offline storage
      }
    }

    // Store photo locally for later upload
    await addOfflinePhoto({
      id: `photo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      inspectionId,
      itemId: inspectionItemId,
      blob: file,
      fileName: file.name,
      timestamp: Date.now(),
    });
    await refreshPendingCount();
  }, [isOnline, generateUploadUrl, savePhotoMutation, refreshPendingCount]);

  return { updateItemStatus, uploadPhoto, isOnline };
}
