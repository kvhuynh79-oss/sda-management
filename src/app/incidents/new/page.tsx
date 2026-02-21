"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import Link from "next/link";
import Header from "@/components/Header";
import { RequireAuth } from "@/components/RequireAuth";
import OfflineIndicator from "@/components/OfflineIndicator";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import { addToQueue } from "@/lib/offlineQueue";
import { Id } from "../../../../convex/_generated/dataModel";

type MediaUpload = {
  file: File;
  preview: string;
  description: string;
  isVideo: boolean;
};

export default function NewIncidentPage() {
  const router = useRouter();
  const { alert: alertDialog } = useConfirmDialog();
  const [user, setUser] = useState<{ id: string; role: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");
  const [media, setMedia] = useState<MediaUpload[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const properties = useQuery(api.properties.getAll, user ? { userId: user.id as Id<"users"> } : "skip");
  const dwellings = useQuery(
    api.dwellings.getByProperty,
    selectedPropertyId && user ? { propertyId: selectedPropertyId as Id<"properties">, userId: user.id as Id<"users"> } : "skip"
  );
  const participants = useQuery(
    api.participants.getAll,
    user ? { userId: user.id as Id<"users"> } : "skip"
  );

  const createIncident = useMutation(api.incidents.create);
  const addPhoto = useMutation(api.incidents.addPhoto);
  const generateUploadUrl = useMutation(api.maintenancePhotos.generateUploadUrl);

  const [formData, setFormData] = useState({
    propertyId: "",
    dwellingId: "",
    participantId: "",
    incidentType: "other" as
      | "injury"
      | "near_miss"
      | "property_damage"
      | "behavioral"
      | "medication"
      | "abuse_neglect"
      | "complaint"
      // NDIS Reportable types
      | "death"
      | "serious_injury"
      | "unauthorized_restrictive_practice"
      | "sexual_assault"
      | "sexual_misconduct"
      | "staff_assault"
      | "unlawful_conduct"
      | "unexplained_injury"
      | "missing_participant"
      | "other",
    severity: "minor" as "minor" | "moderate" | "major" | "critical",
    title: "",
    description: "",
    incidentDate: new Date().toISOString().split("T")[0],
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
    const parsed = JSON.parse(storedUser);
    const userId = parsed.id || parsed._id;

    // If user ID is missing, clear session and redirect to login
    if (!userId) {
      localStorage.removeItem("sda_user");
      router.push("/login");
      return;
    }

    setUser({
      id: userId,
      role: parsed.role,
    });
  }, [router]);

  // Track online/offline status
  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Filter participants by selected property
  const filteredParticipants = participants?.filter((p) => {
    if (!selectedPropertyId || !dwellings) return false;
    return dwellings.some((d) => d._id === p.dwellingId);
  });

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newMedia: MediaUpload[] = [];
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
    setMedia([...media, ...newMedia]);
  };

  const removeMedia = (index: number) => {
    const newMedia = [...media];
    URL.revokeObjectURL(newMedia[index].preview);
    newMedia.splice(index, 1);
    setMedia(newMedia);
  };

  const updateMediaDescription = (index: number, description: string) => {
    const newMedia = [...media];
    newMedia[index].description = description;
    setMedia(newMedia);
  };

  // Helper function to convert File to base64 for offline storage
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!user) {
      setError("User not authenticated");
      return;
    }

    if (!formData.propertyId) {
      setError("Please select a property");
      return;
    }

    if (!formData.title || !formData.description) {
      setError("Please enter a title and description");
      return;
    }

    setIsSubmitting(true);

    try {
      // Check if offline - save to IndexedDB
      if (!isOnline) {
        // Prepare incident data for offline queue
        const incidentData = {
          propertyId: formData.propertyId,
          dwellingId: formData.dwellingId || undefined,
          participantId: formData.participantId || undefined,
          incidentType: formData.incidentType,
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
          reportedBy: user.id,
          // Store media as base64 for offline support
          media: await Promise.all(
            media.map(async (item) => ({
              file: await fileToBase64(item.file),
              fileName: item.file.name,
              fileSize: item.file.size,
              fileType: item.file.type,
              description: item.description || undefined,
              isVideo: item.isVideo,
            }))
          ),
        };

        // Save to offline queue
        await addToQueue(incidentData);

        // Show success message
        await alertDialog("Incident saved locally. It will sync when you're back online.");

        // Redirect to incidents page
        router.push("/incidents");
        return;
      }

      // Online flow - submit normally via Convex
      const incidentId = await createIncident({
        propertyId: formData.propertyId as Id<"properties">,
        dwellingId: formData.dwellingId ? (formData.dwellingId as Id<"dwellings">) : undefined,
        participantId: formData.participantId
          ? (formData.participantId as Id<"participants">)
          : undefined,
        incidentType: formData.incidentType,
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
        reportedBy: user.id as Id<"users">,
      });

      // Upload media (photos/videos)
      for (const item of media) {
        const uploadUrl = await generateUploadUrl({ userId: user.id as Id<"users"> });
        const response = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": item.file.type },
          body: item.file,
        });
        const { storageId } = await response.json();

        await addPhoto({
          incidentId: incidentId as Id<"incidents">,
          storageId: storageId as Id<"_storage">,
          fileName: item.file.name,
          fileSize: item.file.size,
          fileType: item.file.type,
          description: item.description || undefined,
          uploadedBy: user.id as Id<"users">,
        });
      }

      router.push("/incidents");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create incident report");
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return <LoadingScreen />;
  }

  const getSeverityColor = (severity: string) => {
    const colors: Record<string, string> = {
      critical: "border-red-600 bg-red-600/10",
      major: "border-orange-600 bg-orange-600/10",
      moderate: "border-yellow-600 bg-yellow-600/10",
      minor: "border-gray-600 bg-gray-600/10",
    };
    return colors[severity] || colors.minor;
  };

  return (
    <RequireAuth>
    <div className="min-h-screen bg-gray-900">
      <OfflineIndicator />
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
            <li className="text-gray-400">/</li>
            <li>
              <Link href="/incidents" className="text-gray-400 hover:text-white">
                Incidents
              </Link>
            </li>
            <li className="text-gray-400">/</li>
            <li className="text-white">New Report</li>
          </ol>
        </nav>

        {/* Link to Compliance Guides */}
        <div className="mb-4">
          <Link href="/compliance" className="text-teal-500 hover:text-teal-400 text-sm flex items-center gap-2">
            <span>ℹ️</span> View NDIS Incident Reporting Guide in Compliance Dashboard
          </Link>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <h1 className="text-2xl font-bold text-white mb-6">Report Incident</h1>

          {error && (
            <div className="mb-6 p-4 bg-red-900/50 border border-red-600 rounded-lg text-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Property & Dwelling */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Property *</label>
                <select
                  required
                  value={formData.propertyId}
                  onChange={(e) => {
                    setSelectedPropertyId(e.target.value);
                    setFormData({
                      ...formData,
                      propertyId: e.target.value,
                      dwellingId: "",
                      participantId: "",
                    });
                  }}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  <option value="">Select a property</option>
                  {properties?.map((property) => (
                    <option key={property._id} value={property._id}>
                      {property.propertyName || property.addressLine1}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Dwelling</label>
                <select
                  value={formData.dwellingId}
                  onChange={(e) => setFormData({ ...formData, dwellingId: e.target.value })}
                  disabled={!formData.propertyId}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white disabled:opacity-50"
                >
                  <option value="">All dwellings / Not specific</option>
                  {dwellings?.map((dwelling) => (
                    <option key={dwelling._id} value={dwelling._id}>
                      {dwelling.dwellingName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Participant (optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Related Participant (optional)
              </label>
              <select
                value={formData.participantId}
                onChange={(e) => setFormData({ ...formData, participantId: e.target.value })}
                disabled={!formData.propertyId}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white disabled:opacity-50"
              >
                <option value="">Not participant-specific</option>
                {filteredParticipants?.map((participant) => (
                  <option key={participant._id} value={participant._id}>
                    {participant.firstName} {participant.lastName}
                  </option>
                ))}
              </select>
            </div>

            {/* Incident Type & Severity */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Incident Type *
                </label>
                <select
                  required
                  value={formData.incidentType}
                  onChange={(e) => setFormData({ ...formData, incidentType: e.target.value as any })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  <optgroup label="Standard Incidents">
                    <option value="injury">Injury</option>
                    <option value="near_miss">Near Miss</option>
                    <option value="property_damage">Property Damage</option>
                    <option value="behavioral">Behavioral</option>
                    <option value="medication">Medication Related</option>
                    <option value="complaint">Complaint</option>
                    <option value="other">Other</option>
                  </optgroup>
                  <optgroup label="⚠️ NDIS Reportable - 24 Hour Notification">
                    <option value="death">Death of Participant</option>
                    <option value="serious_injury">Serious Injury (Emergency Treatment)</option>
                    <option value="unauthorized_restrictive_practice">Unauthorized Restrictive Practice</option>
                    <option value="sexual_assault">Sexual Assault</option>
                    <option value="sexual_misconduct">Sexual Misconduct</option>
                    <option value="staff_assault">Staff Assault (Physical/Sexual)</option>
                  </optgroup>
                  <optgroup label="⚠️ NDIS Reportable - 5 Business Days">
                    <option value="abuse_neglect">Abuse/Neglect Concern</option>
                    <option value="unlawful_conduct">Unlawful Conduct</option>
                    <option value="unexplained_injury">Unexplained Serious Injury</option>
                    <option value="missing_participant">Missing Participant</option>
                  </optgroup>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">Severity *</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(["minor", "moderate", "major", "critical"] as const).map((severity) => (
                    <label
                      key={severity}
                      className={`cursor-pointer border-2 rounded-lg p-2 text-center transition-all text-sm ${
                        formData.severity === severity
                          ? getSeverityColor(severity)
                          : "border-gray-700 bg-gray-700/30"
                      }`}
                    >
                      <input
                        type="radio"
                        name="severity"
                        value={severity}
                        checked={formData.severity === severity}
                        onChange={(e) =>
                          setFormData({ ...formData, severity: e.target.value as any })
                        }
                        className="sr-only"
                      />
                      <span className="text-white capitalize">{severity}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* NDIS Reportable Warning */}
            {["death", "serious_injury", "unauthorized_restrictive_practice", "sexual_assault", "sexual_misconduct", "staff_assault"].includes(formData.incidentType) && (
              <div className="p-4 bg-red-900/50 border border-red-600 rounded-lg">
                <div className="flex items-start gap-3">
                  <svg className="w-7 h-7 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
                  <div>
                    <h4 className="text-red-200 font-semibold">NDIS Reportable Incident - 24 Hour Notification Required</h4>
                    <p className="text-red-300 text-sm mt-1">
                      This incident type requires immediate notification to the NDIS Quality and Safeguards Commission within 24 hours.
                      After submitting this report, ensure you notify the Commission via the{" "}
                      <a href="https://www.ndiscommission.gov.au" target="_blank" rel="noopener noreferrer" className="underline hover:text-white">
                        NDIS Commission Portal
                      </a>.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {["abuse_neglect", "unlawful_conduct", "unexplained_injury", "missing_participant"].includes(formData.incidentType) && (
              <div className="p-4 bg-yellow-900/50 border border-yellow-600 rounded-lg">
                <div className="flex items-start gap-3">
                  <svg className="w-7 h-7 text-yellow-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
                  <div>
                    <h4 className="text-yellow-200 font-semibold">NDIS Reportable Incident - 5 Business Day Notification Required</h4>
                    <p className="text-yellow-300 text-sm mt-1">
                      This incident type requires notification to the NDIS Quality and Safeguards Commission within 5 business days.
                      After submitting this report, ensure you notify the Commission via the{" "}
                      <a href="https://www.ndiscommission.gov.au" target="_blank" rel="noopener noreferrer" className="underline hover:text-white">
                        NDIS Commission Portal
                      </a>.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Title *</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Brief summary of the incident"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Description *</label>
              <textarea
                required
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                placeholder="Detailed description of what happened..."
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              />
            </div>

            {/* Date, Time, Location */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Incident Date *
                </label>
                <input
                  type="date"
                  required
                  value={formData.incidentDate}
                  onChange={(e) => setFormData({ ...formData, incidentDate: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Incident Time
                </label>
                <input
                  type="time"
                  value={formData.incidentTime}
                  onChange={(e) => setFormData({ ...formData, incidentTime: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g., Kitchen, Bathroom"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                />
              </div>
            </div>

            {/* Witnesses */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Witness Names
              </label>
              <input
                type="text"
                value={formData.witnessNames}
                onChange={(e) => setFormData({ ...formData, witnessNames: e.target.value })}
                placeholder="Names of witnesses (if any)"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              />
            </div>

            {/* Immediate Action Taken */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Immediate Action Taken
              </label>
              <textarea
                value={formData.immediateActionTaken}
                onChange={(e) =>
                  setFormData({ ...formData, immediateActionTaken: e.target.value })
                }
                rows={4}
                placeholder="Describe what was done immediately after the incident..."
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              />
            </div>

            {/* Follow-up & NDIS Reporting */}
            <div className="border-t border-gray-700 pt-6">
              <h3 className="text-lg font-semibold text-white mb-4">Follow-up & Reporting</h3>

              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.followUpRequired}
                      onChange={(e) =>
                        setFormData({ ...formData, followUpRequired: e.target.checked })
                      }
                      className="w-4 h-4 rounded bg-gray-700 border-gray-600"
                    />
                    <span className="text-gray-300">Follow-up required</span>
                  </label>
                </div>

                {formData.followUpRequired && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Follow-up Notes
                    </label>
                    <textarea
                      value={formData.followUpNotes}
                      onChange={(e) => setFormData({ ...formData, followUpNotes: e.target.value })}
                      rows={2}
                      placeholder="What follow-up actions are needed?"
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    />
                  </div>
                )}

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.reportedToNdis}
                      onChange={(e) =>
                        setFormData({ ...formData, reportedToNdis: e.target.checked })
                      }
                      className="w-4 h-4 rounded bg-gray-700 border-gray-600"
                    />
                    <span className="text-gray-300">Reported to NDIS</span>
                  </label>
                </div>

                {formData.reportedToNdis && (
                  <div className="w-1/3">
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      NDIS Report Date
                    </label>
                    <input
                      type="date"
                      value={formData.ndisReportDate}
                      onChange={(e) => setFormData({ ...formData, ndisReportDate: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Photo/Video Upload */}
            <div className="border-t border-gray-700 pt-6">
              <h3 className="text-lg font-semibold text-white mb-4">Photos & Videos</h3>

              <div className="space-y-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  onChange={handleMediaSelect}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  + Add Photos/Videos
                </button>

                {media.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {media.map((item, index) => (
                      <div key={index} className="bg-gray-700 rounded-lg p-2">
                        <div className="relative aspect-video mb-2">
                          {item.isVideo ? (
                            <video
                              src={item.preview}
                              controls
                              className="w-full h-full object-cover rounded"
                            />
                          ) : (
                            <img
                              src={item.preview}
                              alt={`Media ${index + 1}`}
                              className="w-full h-full object-cover rounded"
                            />
                          )}
                          <button
                            type="button"
                            onClick={() => removeMedia(index)}
                            className="absolute top-1 right-1 p-1 bg-red-600 hover:bg-red-700 text-white rounded-full text-xs"
                          >
                            ✕
                          </button>
                        </div>
                        <input
                          type="text"
                          placeholder="Description..."
                          value={item.description}
                          onChange={(e) => updateMediaDescription(index, e.target.value)}
                          className="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm"
                        />
                        <p className="text-gray-400 text-xs mt-1">
                          {item.isVideo ? "Video" : "Photo"}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Submit */}
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded-lg transition-colors font-medium"
              >
                {isSubmitting ? "Submitting Report..." : "Submit Incident Report"}
              </button>
              <Link
                href="/incidents"
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </main>
    </div>
    </RequireAuth>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-white">Loading...</div>
    </div>
  );
}
