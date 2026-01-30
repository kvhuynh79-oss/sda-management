"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import Link from "next/link";
import Header from "@/components/Header";
import { Id } from "../../../../convex/_generated/dataModel";

interface PendingPhoto {
  file: File;
  preview: string;
  description: string;
  photoType: "before" | "during" | "after" | "issue";
}

export default function MaintenanceRequestDetailPage() {
  const router = useRouter();
  const params = useParams();
  const requestId = params.id as Id<"maintenanceRequests">;

  const [user, setUser] = useState<{ id: string; role: string } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const request = useQuery(api.maintenanceRequests.getById, { requestId });
  const photos = useQuery(api.maintenancePhotos.getByMaintenanceRequest, {
    maintenanceRequestId: requestId,
  });
  const updateRequest = useMutation(api.maintenanceRequests.update);
  const generateUploadUrl = useMutation(api.maintenancePhotos.generateUploadUrl);
  const addPhoto = useMutation(api.maintenancePhotos.addPhoto);
  const deletePhoto = useMutation(api.maintenancePhotos.deletePhoto);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  const [formData, setFormData] = useState({
    status: "reported" as "reported" | "scheduled" | "in_progress" | "completed" | "cancelled",
    priority: "medium" as "urgent" | "high" | "medium" | "low",
    title: "",
    description: "",
    scheduledDate: "",
    completedDate: "",
    contractorName: "",
    contractorContact: "",
    quotedAmount: "",
    actualCost: "",
    invoiceNumber: "",
    notes: "",
  });

  useEffect(() => {
    const storedUser = localStorage.getItem("sda_user");
    if (!storedUser) {
      router.push("/login");
      return;
    }
    setUser(JSON.parse(storedUser));
  }, [router]);

  useEffect(() => {
    if (request) {
      setFormData({
        status: request.status,
        priority: request.priority,
        title: request.title,
        description: request.description,
        scheduledDate: request.scheduledDate || "",
        completedDate: request.completedDate || "",
        contractorName: request.contractorName || "",
        contractorContact: request.contractorContact || "",
        quotedAmount: request.quotedAmount?.toString() || "",
        actualCost: request.actualCost?.toString() || "",
        invoiceNumber: request.invoiceNumber || "",
        notes: request.notes || "",
      });
    }
  }, [request]);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newPhotos: PendingPhoto[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith("image/")) {
        newPhotos.push({
          file,
          preview: URL.createObjectURL(file),
          description: "",
          photoType: "issue",
        });
      }
    }
    setPendingPhotos([...pendingPhotos, ...newPhotos]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removePendingPhoto = (index: number) => {
    const newPhotos = [...pendingPhotos];
    URL.revokeObjectURL(newPhotos[index].preview);
    newPhotos.splice(index, 1);
    setPendingPhotos(newPhotos);
  };

  const updatePendingPhotoDescription = (index: number, description: string) => {
    const newPhotos = [...pendingPhotos];
    newPhotos[index].description = description;
    setPendingPhotos(newPhotos);
  };

  const updatePendingPhotoType = (index: number, photoType: PendingPhoto["photoType"]) => {
    const newPhotos = [...pendingPhotos];
    newPhotos[index].photoType = photoType;
    setPendingPhotos(newPhotos);
  };

  const handleDeleteExistingPhoto = async (photoId: Id<"maintenancePhotos">) => {
    if (!confirm("Are you sure you want to delete this photo?")) return;
    try {
      await deletePhoto({ photoId });
    } catch (err) {
      setError("Failed to delete photo");
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    setError("");

    try {
      await updateRequest({
        requestId,
        status: formData.status,
        priority: formData.priority,
        title: formData.title,
        description: formData.description,
        scheduledDate: formData.scheduledDate || undefined,
        completedDate: formData.completedDate || undefined,
        contractorName: formData.contractorName || undefined,
        contractorContact: formData.contractorContact || undefined,
        quotedAmount: formData.quotedAmount ? parseFloat(formData.quotedAmount) : undefined,
        actualCost: formData.actualCost ? parseFloat(formData.actualCost) : undefined,
        invoiceNumber: formData.invoiceNumber || undefined,
        notes: formData.notes || undefined,
      });

      // Upload pending photos
      if (pendingPhotos.length > 0) {
        setUploadingPhotos(true);
        for (const photo of pendingPhotos) {
          try {
            const uploadUrl = await generateUploadUrl();
            const response = await fetch(uploadUrl, {
              method: "POST",
              headers: { "Content-Type": photo.file.type },
              body: photo.file,
            });
            const { storageId } = await response.json();

            await addPhoto({
              maintenanceRequestId: requestId,
              storageId,
              fileName: photo.file.name,
              fileSize: photo.file.size,
              fileType: photo.file.type,
              description: photo.description || undefined,
              photoType: photo.photoType,
              uploadedBy: user.id as Id<"users">,
            });
          } catch (photoErr) {
            console.error("Failed to upload photo:", photoErr);
          }
        }
        setPendingPhotos([]);
        setUploadingPhotos(false);
      }

      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) {
    return <LoadingScreen />;
  }

  if (request === undefined) {
    return <LoadingScreen />;
  }

  if (request === null) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header currentPage="maintenance" />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <p className="text-gray-400">Maintenance request not found</p>
            <Link href="/maintenance" className="text-blue-400 hover:text-blue-300 mt-4 inline-block">
              Back to Maintenance
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      reported: "bg-red-600",
      scheduled: "bg-blue-600",
      in_progress: "bg-yellow-600",
      completed: "bg-green-600",
      cancelled: "bg-gray-600",
    };
    return colors[status] || "bg-gray-600";
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      urgent: "bg-red-600",
      high: "bg-orange-600",
      medium: "bg-yellow-600",
      low: "bg-gray-600",
    };
    return colors[priority] || "bg-gray-600";
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <Header currentPage="maintenance" />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="mb-6">
          <ol className="flex items-center gap-2 text-sm">
            <li>
              <Link href="/dashboard" className="text-gray-400 hover:text-white">
                Dashboard
              </Link>
            </li>
            <li className="text-gray-600">/</li>
            <li>
              <Link href="/maintenance" className="text-gray-400 hover:text-white">
                Maintenance
              </Link>
            </li>
            <li className="text-gray-600">/</li>
            <li className="text-white">{request.title}</li>
          </ol>
        </nav>

        {error && (
          <div className="mb-6 p-4 bg-red-900/50 border border-red-600 rounded-lg text-red-200">
            {error}
          </div>
        )}

        <div className="bg-gray-800 rounded-lg p-6">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className={`px-2 py-1 rounded text-xs text-white ${getPriorityColor(request.priority)}`}>
                  {request.priority.toUpperCase()}
                </span>
                <span className={`px-2 py-1 rounded text-xs text-white ${getStatusColor(request.status)}`}>
                  {request.status.replace("_", " ").toUpperCase()}
                </span>
                <span className="text-gray-400 text-sm">{request.category}</span>
              </div>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="text-xl font-bold text-white bg-gray-700 border border-gray-600 rounded px-3 py-1 w-full"
                />
              ) : (
                <h1 className="text-xl font-bold text-white">{request.title}</h1>
              )}
            </div>
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving || uploadingPhotos}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
                  >
                    {isSaving ? (uploadingPhotos ? "Uploading..." : "Saving...") : "Save Changes"}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Edit Request
                </button>
              )}
            </div>
          </div>

          {/* Location */}
          <div className="mb-6 p-4 bg-gray-700/50 rounded-lg">
            <p className="text-gray-400 text-sm">Location</p>
            <p className="text-white">
              {request.dwelling?.dwellingName} at {request.property?.propertyName || request.property?.addressLine1}
            </p>
            <p className="text-gray-400 text-sm">
              {request.property?.suburb}, {request.property?.state}
            </p>
          </div>

          {/* Status & Priority (Edit Mode) */}
          {isEditing && (
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  <option value="reported">Reported</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>
          )}

          {/* Description */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-300 mb-2">Description</h3>
            {isEditing ? (
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              />
            ) : (
              <p className="text-white whitespace-pre-wrap">{request.description}</p>
            )}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div>
              <p className="text-gray-400 text-sm">Reported Date</p>
              <p className="text-white">{request.reportedDate}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Reported By</p>
              <p className="text-white">{request.reportedBy || "-"}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Scheduled Date</p>
              {isEditing ? (
                <input
                  type="date"
                  value={formData.scheduledDate}
                  onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                  className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                />
              ) : (
                <p className="text-white">{request.scheduledDate || "-"}</p>
              )}
            </div>
            <div>
              <p className="text-gray-400 text-sm">Completed Date</p>
              {isEditing ? (
                <input
                  type="date"
                  value={formData.completedDate}
                  onChange={(e) => setFormData({ ...formData, completedDate: e.target.value })}
                  className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                />
              ) : (
                <p className="text-white">{request.completedDate || "-"}</p>
              )}
            </div>
          </div>

          {/* Contractor Details */}
          <div className="border-t border-gray-700 pt-6 mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">Contractor Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-400 text-sm">Contractor Name</p>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.contractorName}
                    onChange={(e) => setFormData({ ...formData, contractorName: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                ) : (
                  <p className="text-white">{request.contractorName || "-"}</p>
                )}
              </div>
              <div>
                <p className="text-gray-400 text-sm">Contractor Contact</p>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.contractorContact}
                    onChange={(e) => setFormData({ ...formData, contractorContact: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                ) : (
                  <p className="text-white">{request.contractorContact || "-"}</p>
                )}
              </div>
            </div>
          </div>

          {/* Costs */}
          <div className="border-t border-gray-700 pt-6 mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">Costs</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-gray-400 text-sm">Quoted Amount</p>
                {isEditing ? (
                  <input
                    type="number"
                    step="0.01"
                    value={formData.quotedAmount}
                    onChange={(e) => setFormData({ ...formData, quotedAmount: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                ) : (
                  <p className="text-white">
                    {request.quotedAmount ? `$${request.quotedAmount.toFixed(2)}` : "-"}
                  </p>
                )}
              </div>
              <div>
                <p className="text-gray-400 text-sm">Actual Cost</p>
                {isEditing ? (
                  <input
                    type="number"
                    step="0.01"
                    value={formData.actualCost}
                    onChange={(e) => setFormData({ ...formData, actualCost: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                ) : (
                  <p className="text-white">
                    {request.actualCost ? `$${request.actualCost.toFixed(2)}` : "-"}
                  </p>
                )}
              </div>
              <div>
                <p className="text-gray-400 text-sm">Invoice Number</p>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.invoiceNumber}
                    onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                ) : (
                  <p className="text-white">{request.invoiceNumber || "-"}</p>
                )}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="border-t border-gray-700 pt-6 mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">Notes</h3>
            {isEditing ? (
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              />
            ) : (
              <p className="text-white whitespace-pre-wrap">{request.notes || "No notes"}</p>
            )}
          </div>

          {/* Photos */}
          <div className="border-t border-gray-700 pt-6">
            <h3 className="text-lg font-semibold text-white mb-4">Photos</h3>

            {/* Existing Photos */}
            {photos && photos.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                {photos.map((photo) => (
                  <div key={photo._id} className="bg-gray-700 rounded-lg p-3">
                    <div className="relative aspect-video mb-2">
                      {photo.url && (
                        <img
                          src={photo.url}
                          alt={photo.description || photo.fileName}
                          className="w-full h-full object-cover rounded cursor-pointer"
                          onClick={() => window.open(photo.url!, "_blank")}
                        />
                      )}
                      {isEditing && (
                        <button
                          type="button"
                          onClick={() => handleDeleteExistingPhoto(photo._id)}
                          className="absolute top-1 right-1 w-6 h-6 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center text-sm"
                        >
                          X
                        </button>
                      )}
                    </div>
                    <p className="text-white text-sm">{photo.photoType.replace("_", " ")}</p>
                    {photo.description && (
                      <p className="text-gray-400 text-xs">{photo.description}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Add Photos (Edit Mode) */}
            {isEditing && (
              <>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handlePhotoSelect}
                  accept="image/*"
                  multiple
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors mb-4"
                >
                  + Add Photos
                </button>

                {/* Pending Photos */}
                {pendingPhotos.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                    {pendingPhotos.map((photo, index) => (
                      <div key={index} className="bg-gray-700 rounded-lg p-3 border-2 border-dashed border-blue-500">
                        <div className="relative aspect-video mb-2">
                          <img
                            src={photo.preview}
                            alt={`New photo ${index + 1}`}
                            className="w-full h-full object-cover rounded"
                          />
                          <button
                            type="button"
                            onClick={() => removePendingPhoto(index)}
                            className="absolute top-1 right-1 w-6 h-6 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center text-sm"
                          >
                            X
                          </button>
                        </div>
                        <select
                          value={photo.photoType}
                          onChange={(e) =>
                            updatePendingPhotoType(index, e.target.value as PendingPhoto["photoType"])
                          }
                          className="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm mb-2"
                        >
                          <option value="issue">Issue Photo</option>
                          <option value="before">Before Work</option>
                          <option value="during">During Work</option>
                          <option value="after">After Work</option>
                        </select>
                        <input
                          type="text"
                          value={photo.description}
                          onChange={(e) => updatePendingPhotoDescription(index, e.target.value)}
                          placeholder="Description (optional)"
                          className="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm"
                        />
                        <p className="text-blue-400 text-xs mt-1">New - will be uploaded on save</p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {!isEditing && (!photos || photos.length === 0) && (
              <p className="text-gray-400">No photos uploaded</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-white">Loading...</div>
    </div>
  );
}
