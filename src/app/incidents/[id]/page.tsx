"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import Link from "next/link";
import Header from "@/components/Header";
import { Id } from "../../../../convex/_generated/dataModel";

interface PendingMedia {
  file: File;
  preview: string;
  description: string;
  isVideo: boolean;
}

type IncidentStatus = "reported" | "under_investigation" | "resolved" | "closed";

export default function IncidentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const incidentId = params.id as Id<"incidents">;

  const [user, setUser] = useState<{ _id: string; role: string } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [showResolveModal, setShowResolveModal] = useState(false);

  const incident = useQuery(api.incidents.getById, { incidentId });
  const updateIncident = useMutation(api.incidents.update);
  const resolveIncident = useMutation(api.incidents.resolve);
  const generateUploadUrl = useMutation(api.incidents.generateUploadUrl);
  const addPhoto = useMutation(api.incidents.addPhoto);
  const deletePhoto = useMutation(api.incidents.deletePhoto);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingMedia, setPendingMedia] = useState<PendingMedia[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState("");

  const [formData, setFormData] = useState({
    status: "reported" as IncidentStatus,
    severity: "moderate" as "minor" | "moderate" | "major" | "critical",
    title: "",
    description: "",
    incidentDate: "",
    incidentTime: "",
    location: "",
    witnessNames: "",
    immediateActionTaken: "",
    followUpRequired: false,
    followUpNotes: "",
    reportedToNdis: false,
    ndisReportDate: "",
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
    if (incident) {
      setFormData({
        status: incident.status as IncidentStatus,
        severity: incident.severity,
        title: incident.title,
        description: incident.description,
        incidentDate: incident.incidentDate,
        incidentTime: incident.incidentTime || "",
        location: incident.location || "",
        witnessNames: incident.witnessNames || "",
        immediateActionTaken: incident.immediateActionTaken || "",
        followUpRequired: incident.followUpRequired,
        followUpNotes: incident.followUpNotes || "",
        reportedToNdis: incident.reportedToNdis || false,
        ndisReportDate: incident.ndisReportDate || "",
      });
    }
  }, [incident]);

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newMedia: PendingMedia[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isVideo = file.type.startsWith("video/");
      const isImage = file.type.startsWith("image/");

      if (isImage || isVideo) {
        newMedia.push({
          file,
          preview: URL.createObjectURL(file),
          description: "",
          isVideo,
        });
      }
    }
    setPendingMedia([...pendingMedia, ...newMedia]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removePendingMedia = (index: number) => {
    const newMedia = [...pendingMedia];
    URL.revokeObjectURL(newMedia[index].preview);
    newMedia.splice(index, 1);
    setPendingMedia(newMedia);
  };

  const updatePendingMediaDescription = (index: number, description: string) => {
    const newMedia = [...pendingMedia];
    newMedia[index].description = description;
    setPendingMedia(newMedia);
  };

  const handleDeleteExistingMedia = async (photoId: Id<"incidentPhotos">) => {
    if (!confirm("Are you sure you want to delete this media?")) return;
    try {
      await deletePhoto({ photoId });
    } catch (err) {
      setError("Failed to delete media");
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    setError("");

    try {
      await updateIncident({
        incidentId,
        status: formData.status,
        severity: formData.severity,
        title: formData.title,
        description: formData.description,
        incidentDate: formData.incidentDate,
        incidentTime: formData.incidentTime || undefined,
        location: formData.location || undefined,
        witnessNames: formData.witnessNames || undefined,
        immediateActionTaken: formData.immediateActionTaken || undefined,
        followUpRequired: formData.followUpRequired,
        followUpNotes: formData.followUpNotes || undefined,
        reportedToNdis: formData.reportedToNdis,
        ndisReportDate: formData.ndisReportDate || undefined,
      });

      // Upload pending media
      if (pendingMedia.length > 0) {
        setUploadingMedia(true);
        for (const media of pendingMedia) {
          try {
            const uploadUrl = await generateUploadUrl();
            const response = await fetch(uploadUrl, {
              method: "POST",
              headers: { "Content-Type": media.file.type },
              body: media.file,
            });
            const { storageId } = await response.json();

            await addPhoto({
              incidentId,
              storageId,
              fileName: media.file.name,
              fileSize: media.file.size,
              fileType: media.file.type,
              description: media.description || undefined,
              uploadedBy: user._id as Id<"users">,
            });
          } catch (mediaErr) {
            console.error("Failed to upload media:", mediaErr);
          }
        }
        setPendingMedia([]);
        setUploadingMedia(false);
      }

      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  };

  const handleResolve = async () => {
    if (!user) return;
    try {
      await resolveIncident({
        incidentId,
        resolvedBy: user._id as Id<"users">,
        resolutionNotes: resolutionNotes || undefined,
      });
      setShowResolveModal(false);
      setResolutionNotes("");
    } catch (err) {
      setError("Failed to resolve incident");
    }
  };

  const handleClose = async () => {
    if (!confirm("Are you sure you want to close this incident?")) return;
    try {
      await updateIncident({
        incidentId,
        status: "closed",
      });
    } catch (err) {
      setError("Failed to close incident");
    }
  };

  if (!user) {
    return <LoadingScreen />;
  }

  if (incident === undefined) {
    return <LoadingScreen />;
  }

  if (incident === null) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header currentPage="incidents" />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <p className="text-gray-400">Incident not found</p>
            <Link href="/incidents" className="text-blue-400 hover:text-blue-300 mt-4 inline-block">
              Back to Incidents
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const getSeverityColor = (severity: string) => {
    const colors: Record<string, string> = {
      critical: "bg-red-600",
      major: "bg-orange-600",
      moderate: "bg-yellow-600",
      minor: "bg-gray-600",
    };
    return colors[severity] || "bg-gray-600";
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      reported: "bg-red-600",
      under_investigation: "bg-yellow-600",
      resolved: "bg-green-600",
      closed: "bg-gray-600",
    };
    return colors[status] || "bg-gray-600";
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const formatIncidentType = (type: string) => {
    return type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const canResolve = incident.status === "reported" || incident.status === "under_investigation";
  const canClose = incident.status === "resolved";

  return (
    <div className="min-h-screen bg-gray-900">
      <Header currentPage="incidents" />

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
              <Link href="/incidents" className="text-gray-400 hover:text-white">
                Incidents
              </Link>
            </li>
            <li className="text-gray-600">/</li>
            <li className="text-white">{incident.title}</li>
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
                <span className={`px-2 py-1 rounded text-xs text-white ${getSeverityColor(incident.severity)}`}>
                  {incident.severity.toUpperCase()}
                </span>
                <span className={`px-2 py-1 rounded text-xs text-white ${getStatusColor(incident.status)}`}>
                  {formatStatus(incident.status)}
                </span>
                <span className="text-gray-400 text-sm">{formatIncidentType(incident.incidentType)}</span>
              </div>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="text-xl font-bold text-white bg-gray-700 border border-gray-600 rounded px-3 py-1 w-full"
                />
              ) : (
                <h1 className="text-xl font-bold text-white">{incident.title}</h1>
              )}
            </div>
            <div className="flex gap-2">
              {canResolve && !isEditing && (
                <button
                  onClick={() => setShowResolveModal(true)}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                >
                  Resolve
                </button>
              )}
              {canClose && !isEditing && (
                <button
                  onClick={handleClose}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
                >
                  Close
                </button>
              )}
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
                    disabled={isSaving || uploadingMedia}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
                  >
                    {isSaving ? (uploadingMedia ? "Uploading..." : "Saving...") : "Save Changes"}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Edit
                </button>
              )}
            </div>
          </div>

          {/* Location */}
          <div className="mb-6 p-4 bg-gray-700/50 rounded-lg">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-400 text-sm">Property</p>
                <p className="text-white">
                  {incident.property?.propertyName || incident.property?.addressLine1}
                </p>
              </div>
              {incident.participant && (
                <div>
                  <p className="text-gray-400 text-sm">Participant</p>
                  <p className="text-white">
                    {incident.participant.firstName} {incident.participant.lastName}
                  </p>
                </div>
              )}
              {incident.dwelling && (
                <div>
                  <p className="text-gray-400 text-sm">Dwelling</p>
                  <p className="text-white">{incident.dwelling.dwellingName}</p>
                </div>
              )}
            </div>
          </div>

          {/* Status & Severity (Edit Mode) */}
          {isEditing && (
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as IncidentStatus })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  <option value="reported">Reported</option>
                  <option value="under_investigation">Under Investigation</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Severity</label>
                <select
                  value={formData.severity}
                  onChange={(e) => setFormData({ ...formData, severity: e.target.value as any })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  <option value="minor">Minor</option>
                  <option value="moderate">Moderate</option>
                  <option value="major">Major</option>
                  <option value="critical">Critical</option>
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
              <p className="text-white whitespace-pre-wrap">{incident.description}</p>
            )}
          </div>

          {/* Incident Details */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div>
              <p className="text-gray-400 text-sm">Incident Date</p>
              {isEditing ? (
                <input
                  type="date"
                  value={formData.incidentDate}
                  onChange={(e) => setFormData({ ...formData, incidentDate: e.target.value })}
                  className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                />
              ) : (
                <p className="text-white">{incident.incidentDate}</p>
              )}
            </div>
            <div>
              <p className="text-gray-400 text-sm">Incident Time</p>
              {isEditing ? (
                <input
                  type="time"
                  value={formData.incidentTime}
                  onChange={(e) => setFormData({ ...formData, incidentTime: e.target.value })}
                  className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                />
              ) : (
                <p className="text-white">{incident.incidentTime || "-"}</p>
              )}
            </div>
            <div>
              <p className="text-gray-400 text-sm">Location</p>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                />
              ) : (
                <p className="text-white">{incident.location || "-"}</p>
              )}
            </div>
            <div>
              <p className="text-gray-400 text-sm">Witnesses</p>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.witnessNames}
                  onChange={(e) => setFormData({ ...formData, witnessNames: e.target.value })}
                  className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                />
              ) : (
                <p className="text-white">{incident.witnessNames || "-"}</p>
              )}
            </div>
          </div>

          {/* Immediate Action */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-300 mb-2">Immediate Action Taken</h3>
            {isEditing ? (
              <textarea
                value={formData.immediateActionTaken}
                onChange={(e) => setFormData({ ...formData, immediateActionTaken: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              />
            ) : (
              <p className="text-white whitespace-pre-wrap">{incident.immediateActionTaken || "None recorded"}</p>
            )}
          </div>

          {/* Follow-up */}
          <div className="border-t border-gray-700 pt-6 mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">Follow-up</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-400 text-sm">Follow-up Required</p>
                {isEditing ? (
                  <select
                    value={formData.followUpRequired ? "yes" : "no"}
                    onChange={(e) => setFormData({ ...formData, followUpRequired: e.target.value === "yes" })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  >
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                ) : (
                  <p className="text-white">{incident.followUpRequired ? "Yes" : "No"}</p>
                )}
              </div>
              {(incident.followUpRequired || formData.followUpRequired) && (
                <div>
                  <p className="text-gray-400 text-sm">Follow-up Notes</p>
                  {isEditing ? (
                    <textarea
                      value={formData.followUpNotes}
                      onChange={(e) => setFormData({ ...formData, followUpNotes: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    />
                  ) : (
                    <p className="text-white">{incident.followUpNotes || "-"}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* NDIS Reporting */}
          <div className="border-t border-gray-700 pt-6 mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">NDIS Reporting</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-400 text-sm">Reported to NDIS</p>
                {isEditing ? (
                  <select
                    value={formData.reportedToNdis ? "yes" : "no"}
                    onChange={(e) => setFormData({ ...formData, reportedToNdis: e.target.value === "yes" })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  >
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                ) : (
                  <p className="text-white">{incident.reportedToNdis ? "Yes" : "No"}</p>
                )}
              </div>
              {(incident.reportedToNdis || formData.reportedToNdis) && (
                <div>
                  <p className="text-gray-400 text-sm">NDIS Report Date</p>
                  {isEditing ? (
                    <input
                      type="date"
                      value={formData.ndisReportDate}
                      onChange={(e) => setFormData({ ...formData, ndisReportDate: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    />
                  ) : (
                    <p className="text-white">{incident.ndisReportDate || "-"}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Resolution Info (if resolved) */}
          {(incident.status === "resolved" || incident.status === "closed") && (incident as any).resolutionNotes && (
            <div className="border-t border-gray-700 pt-6 mb-6">
              <h3 className="text-lg font-semibold text-white mb-4">Resolution</h3>
              <p className="text-white whitespace-pre-wrap">{(incident as any).resolutionNotes}</p>
            </div>
          )}

          {/* Photos/Videos */}
          <div className="border-t border-gray-700 pt-6">
            <h3 className="text-lg font-semibold text-white mb-4">Photos & Videos</h3>

            {/* Existing Media */}
            {incident.photos && incident.photos.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                {incident.photos.map((media: any) => (
                  <div key={media._id} className="bg-gray-700 rounded-lg p-3">
                    <div className="relative aspect-video mb-2">
                      {media.url && (
                        media.fileType?.startsWith("video/") ? (
                          <video
                            src={media.url}
                            controls
                            className="w-full h-full object-cover rounded"
                          />
                        ) : (
                          <img
                            src={media.url}
                            alt={media.description || media.fileName}
                            className="w-full h-full object-cover rounded cursor-pointer"
                            onClick={() => window.open(media.url!, "_blank")}
                          />
                        )
                      )}
                      {isEditing && (
                        <button
                          type="button"
                          onClick={() => handleDeleteExistingMedia(media._id)}
                          className="absolute top-1 right-1 w-6 h-6 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center text-sm"
                        >
                          X
                        </button>
                      )}
                    </div>
                    <p className="text-white text-sm">{media.fileName}</p>
                    {media.description && (
                      <p className="text-gray-400 text-xs">{media.description}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Add Media (Edit Mode) */}
            {isEditing && (
              <>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleMediaSelect}
                  accept="image/*,video/*"
                  multiple
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors mb-4"
                >
                  + Add Photos/Videos
                </button>

                {/* Pending Media */}
                {pendingMedia.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                    {pendingMedia.map((media, index) => (
                      <div key={index} className="bg-gray-700 rounded-lg p-3 border-2 border-dashed border-blue-500">
                        <div className="relative aspect-video mb-2">
                          {media.isVideo ? (
                            <video
                              src={media.preview}
                              controls
                              className="w-full h-full object-cover rounded"
                            />
                          ) : (
                            <img
                              src={media.preview}
                              alt={`New media ${index + 1}`}
                              className="w-full h-full object-cover rounded"
                            />
                          )}
                          <button
                            type="button"
                            onClick={() => removePendingMedia(index)}
                            className="absolute top-1 right-1 w-6 h-6 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center text-sm"
                          >
                            X
                          </button>
                        </div>
                        <input
                          type="text"
                          value={media.description}
                          onChange={(e) => updatePendingMediaDescription(index, e.target.value)}
                          placeholder="Description (optional)"
                          className="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm"
                        />
                        <p className="text-blue-400 text-xs mt-1">
                          {media.isVideo ? "Video" : "Photo"} - will be uploaded on save
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {!isEditing && (!incident.photos || incident.photos.length === 0) && (
              <p className="text-gray-400">No photos or videos uploaded</p>
            )}
          </div>
        </div>

        {/* Resolve Modal */}
        {showResolveModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg p-6 max-w-lg w-full">
              <h2 className="text-xl font-bold text-white mb-4">Resolve Incident</h2>
              <div className="mb-4">
                <label className="block text-sm text-gray-300 mb-2">Resolution Notes</label>
                <textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  rows={4}
                  placeholder="Describe how the incident was resolved..."
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowResolveModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResolve}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
                >
                  Resolve Incident
                </button>
              </div>
            </div>
          </div>
        )}
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
