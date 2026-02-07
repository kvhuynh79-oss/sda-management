"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import Header from "@/components/Header";
import { RequireAuth } from "@/components/RequireAuth";
import { LoadingScreen } from "@/components/ui";
import { FormInput, FormSelect, FormTextarea, Button } from "@/components/forms";
import { Id } from "../../../../../convex/_generated/dataModel";

// Contact types that can be linked to database entities
const DB_LINKABLE_TYPES = ["support_coordinator", "sil_provider", "ot", "contractor"] as const;
type DbLinkableType = typeof DB_LINKABLE_TYPES[number];

// Map contactType to stakeholderEntityType for the backend
const CONTACT_TO_STAKEHOLDER: Record<string, string> = {
  support_coordinator: "support_coordinator",
  sil_provider: "sil_provider",
  ot: "occupational_therapist",
  contractor: "contractor",
};

const COMPLIANCE_CATEGORIES = [
  { value: "none", label: "None" },
  { value: "routine", label: "Routine" },
  { value: "incident_related", label: "Incident Related" },
  { value: "complaint", label: "Complaint" },
  { value: "safeguarding", label: "Safeguarding" },
  { value: "plan_review", label: "Plan Review" },
  { value: "access_request", label: "Access Request" },
  { value: "quality_audit", label: "Quality Audit" },
  { value: "advocacy", label: "Advocacy" },
];

const COMPLIANCE_FLAGS = [
  { value: "requires_documentation", label: "Requires Documentation" },
  { value: "time_sensitive", label: "Time Sensitive" },
  { value: "escalation_required", label: "Escalation Required" },
  { value: "ndia_reportable", label: "NDIA Reportable" },
  { value: "legal_hold", label: "Legal Hold" },
];

export default function NewCommunicationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    communicationType: "phone_call" as "email" | "sms" | "phone_call" | "meeting" | "other",
    direction: "sent" as "sent" | "received",
    communicationDate: new Date().toISOString().split("T")[0],
    communicationTime: "",
    contactType: "ndia" as "ndia" | "support_coordinator" | "sil_provider" | "participant" | "family" | "plan_manager" | "ot" | "contractor" | "other",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    subject: "",
    summary: "",
    linkedParticipantId: "",
    linkedPropertyId: "",
    complianceCategory: "none" as string,
    complianceFlags: [] as string[],
  });

  // Track selected DB entity for stakeholder linking
  const [selectedEntityId, setSelectedEntityId] = useState("");
  const [isEntityLinked, setIsEntityLinked] = useState(false);
  const [useManualEntry, setUseManualEntry] = useState(false);

  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [createFollowUpTask, setCreateFollowUpTask] = useState(false);
  const [followUpTaskTitle, setFollowUpTaskTitle] = useState("");
  const [followUpTaskDueDate, setFollowUpTaskDueDate] = useState("");

  useEffect(() => {
    const storedUser = localStorage.getItem("sda_user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  // Pre-fill from URL search params (when linked from detail pages)
  useEffect(() => {
    const participantId = searchParams.get("participantId");
    const propertyId = searchParams.get("propertyId");
    const stakeholderType = searchParams.get("stakeholderType");
    const stakeholderId = searchParams.get("stakeholderId");
    const contactType = searchParams.get("contactType");

    if (participantId || propertyId || contactType) {
      setFormData((prev) => ({
        ...prev,
        linkedParticipantId: participantId || prev.linkedParticipantId,
        linkedPropertyId: propertyId || prev.linkedPropertyId,
        contactType: (contactType as any) || prev.contactType,
      }));
    }

    if (stakeholderType && stakeholderId) {
      setSelectedEntityId(stakeholderId);
    }
  }, [searchParams]);

  // Core data queries
  const participants = useQuery(
    api.participants.getAll,
    user ? { userId: user.id as Id<"users"> } : "skip"
  );
  const properties = useQuery(api.properties.getAll);

  // Conditional entity queries - only fire when contact type matches
  const isDbLinkable = DB_LINKABLE_TYPES.includes(formData.contactType as DbLinkableType);

  const supportCoordinators = useQuery(
    api.supportCoordinators.getAll,
    formData.contactType === "support_coordinator" ? { status: "active" } : "skip"
  );
  const silProviders = useQuery(
    api.silProviders.getAll,
    formData.contactType === "sil_provider" ? { status: "active" } : "skip"
  );
  const occupationalTherapists = useQuery(
    api.occupationalTherapists.getAll,
    formData.contactType === "ot" ? { status: "active" } : "skip"
  );
  const contractors = useQuery(
    api.contractors.getAll,
    formData.contactType === "contractor" ? {} : "skip"
  );

  // Build entity options based on selected contact type
  const entityOptions = useMemo(() => {
    switch (formData.contactType) {
      case "support_coordinator":
        return (supportCoordinators || []).map((sc) => ({
          value: sc._id,
          label: `${sc.firstName} ${sc.lastName}${sc.organization ? ` (${sc.organization})` : ""}`,
          email: sc.email,
          phone: sc.phone || "",
          displayName: `${sc.firstName} ${sc.lastName}`,
        }));
      case "sil_provider":
        return (silProviders || []).map((sp) => ({
          value: sp._id,
          label: `${sp.companyName}${sp.contactName ? ` - ${sp.contactName}` : ""}`,
          email: sp.email,
          phone: sp.phone || "",
          displayName: sp.contactName || sp.companyName,
        }));
      case "ot":
        return (occupationalTherapists || []).map((ot) => ({
          value: ot._id,
          label: `${ot.firstName} ${ot.lastName}${ot.organization ? ` (${ot.organization})` : ""}`,
          email: ot.email,
          phone: ot.phone || "",
          displayName: `${ot.firstName} ${ot.lastName}`,
        }));
      case "contractor":
        return (contractors || []).map((c) => ({
          value: c._id,
          label: `${c.companyName}${c.contactName ? ` - ${c.contactName}` : ""}`,
          email: c.email,
          phone: c.phone || "",
          displayName: c.contactName || c.companyName,
        }));
      default:
        return [];
    }
  }, [formData.contactType, supportCoordinators, silProviders, occupationalTherapists, contractors]);

  // Handle entity selection - auto-populate contact fields
  const handleEntitySelect = (entityId: string) => {
    if (entityId === "__manual__") {
      setUseManualEntry(true);
      setSelectedEntityId("");
      setIsEntityLinked(false);
      setFormData((prev) => ({
        ...prev,
        contactName: "",
        contactEmail: "",
        contactPhone: "",
      }));
      return;
    }

    setSelectedEntityId(entityId);
    setUseManualEntry(false);

    if (!entityId) {
      setIsEntityLinked(false);
      setFormData((prev) => ({
        ...prev,
        contactName: "",
        contactEmail: "",
        contactPhone: "",
      }));
      return;
    }

    const entity = entityOptions.find((e) => e.value === entityId);
    if (entity) {
      setIsEntityLinked(true);
      setFormData((prev) => ({
        ...prev,
        contactName: entity.displayName,
        contactEmail: entity.email,
        contactPhone: entity.phone,
      }));
    }
  };

  // Reset entity state when contact type changes
  useEffect(() => {
    setSelectedEntityId("");
    setIsEntityLinked(false);
    setUseManualEntry(false);
    setFormData((prev) => ({
      ...prev,
      contactName: "",
      contactEmail: "",
      contactPhone: "",
    }));
  }, [formData.contactType]);

  // Handle compliance flag toggle
  const handleFlagToggle = (flag: string) => {
    setFormData((prev) => ({
      ...prev,
      complianceFlags: prev.complianceFlags.includes(flag)
        ? prev.complianceFlags.filter((f) => f !== flag)
        : [...prev.complianceFlags, flag],
    }));
  };

  const createCommunication = useMutation(api.communications.create);
  const generateUploadUrl = useMutation(api.communications.generateUploadUrl);
  const createTask = useMutation(api.tasks.create);

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const relatedTarget = e.relatedTarget as Node | null;
    const currentTarget = e.currentTarget;
    if (!currentTarget.contains(relatedTarget)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      const acceptedTypes = ["image/", "application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
      const isAccepted = acceptedTypes.some((type) =>
        type.endsWith("/") ? file.type.startsWith(type) : file.type === type
      );

      if (isAccepted) {
        setAttachmentFile(file);
      } else {
        setError("Please upload an image, PDF, or Word document.");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    setError(null);

    try {
      let attachmentStorageId: Id<"_storage"> | undefined;
      let attachmentFileName: string | undefined;
      let attachmentFileType: string | undefined;

      // Upload attachment if exists
      if (attachmentFile) {
        const uploadUrl = await generateUploadUrl();
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": attachmentFile.type },
          body: attachmentFile,
        });
        const { storageId } = await result.json();
        attachmentStorageId = storageId;
        attachmentFileName = attachmentFile.name;
        attachmentFileType = attachmentFile.type;
      }

      // Build stakeholder fields
      const stakeholderEntityType = isEntityLinked && selectedEntityId
        ? CONTACT_TO_STAKEHOLDER[formData.contactType] as any
        : undefined;
      const stakeholderEntityId = isEntityLinked && selectedEntityId
        ? selectedEntityId
        : undefined;

      // Create communication
      const result = await createCommunication({
        communicationType: formData.communicationType,
        direction: formData.direction,
        communicationDate: formData.communicationDate,
        communicationTime: formData.communicationTime || undefined,
        contactType: formData.contactType,
        contactName: formData.contactName,
        contactEmail: formData.contactEmail || undefined,
        contactPhone: formData.contactPhone || undefined,
        subject: formData.subject || undefined,
        summary: formData.summary,
        linkedParticipantId: formData.linkedParticipantId
          ? (formData.linkedParticipantId as Id<"participants">)
          : undefined,
        linkedPropertyId: formData.linkedPropertyId
          ? (formData.linkedPropertyId as Id<"properties">)
          : undefined,
        stakeholderEntityType,
        stakeholderEntityId,
        complianceCategory: formData.complianceCategory !== "none"
          ? formData.complianceCategory as any
          : undefined,
        complianceFlags: formData.complianceFlags.length > 0
          ? formData.complianceFlags as any
          : undefined,
        attachmentStorageId,
        attachmentFileName,
        attachmentFileType,
        createdBy: user.id as Id<"users">,
      });

      // Create follow-up task if requested
      if (createFollowUpTask && followUpTaskTitle && followUpTaskDueDate) {
        await createTask({
          title: followUpTaskTitle,
          description: `Follow-up from ${formData.communicationType} with ${formData.contactName}`,
          dueDate: followUpTaskDueDate,
          priority: "medium",
          category: "follow_up",
          linkedParticipantId: formData.linkedParticipantId
            ? (formData.linkedParticipantId as Id<"participants">)
            : undefined,
          linkedCommunicationId: result.communicationId,
          createdBy: user.id as Id<"users">,
        });
      }

      router.push("/follow-ups");
    } catch (err) {
      console.error("Failed to create communication:", err);
      setError("Failed to create communication. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user || participants === undefined || properties === undefined) {
    return (
      <RequireAuth>
        <div className="min-h-screen bg-gray-900">
          <Header currentPage="follow-ups" />
          <LoadingScreen fullScreen={false} message="Loading..." />
        </div>
      </RequireAuth>
    );
  }

  // Show the entity dropdown or free text based on contact type
  const showEntityDropdown = isDbLinkable && !useManualEntry;

  return (
    <RequireAuth>
      <div className="min-h-screen bg-gray-900">
        <Header currentPage="follow-ups" />

        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-xl sm:text-2xl font-bold text-white">Log Communication</h1>
            <p className="text-gray-400 mt-1">Record a communication for follow-up tracking</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-900/50 border border-red-600 rounded-lg text-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Communication Details */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Communication Details</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormSelect
                  label="Type"
                  required
                  value={formData.communicationType}
                  onChange={(e) =>
                    setFormData({ ...formData, communicationType: e.target.value as any })
                  }
                  options={[
                    { value: "phone_call", label: "Phone Call" },
                    { value: "email", label: "Email" },
                    { value: "sms", label: "SMS" },
                    { value: "meeting", label: "Meeting" },
                    { value: "other", label: "Other" },
                  ]}
                />

                <FormSelect
                  label="Direction"
                  required
                  value={formData.direction}
                  onChange={(e) =>
                    setFormData({ ...formData, direction: e.target.value as any })
                  }
                  options={[
                    { value: "sent", label: "Sent (Outgoing)" },
                    { value: "received", label: "Received (Incoming)" },
                  ]}
                />

                <FormInput
                  label="Date"
                  type="date"
                  required
                  value={formData.communicationDate}
                  onChange={(e) =>
                    setFormData({ ...formData, communicationDate: e.target.value })
                  }
                />

                <FormInput
                  label="Time"
                  type="time"
                  value={formData.communicationTime}
                  onChange={(e) =>
                    setFormData({ ...formData, communicationTime: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Contact Details */}
            <div className="bg-gray-800 rounded-lg p-6" role="group" aria-labelledby="contact-details-heading">
              <h2 id="contact-details-heading" className="text-lg font-semibold text-white mb-4">Contact Details</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormSelect
                  label="Contact Type"
                  required
                  value={formData.contactType}
                  onChange={(e) =>
                    setFormData({ ...formData, contactType: e.target.value as any })
                  }
                  options={[
                    { value: "ndia", label: "NDIA" },
                    { value: "support_coordinator", label: "Support Coordinator" },
                    { value: "plan_manager", label: "Plan Manager" },
                    { value: "sil_provider", label: "SIL Provider" },
                    { value: "participant", label: "Participant" },
                    { value: "family", label: "Family Member" },
                    { value: "ot", label: "Occupational Therapist" },
                    { value: "contractor", label: "Contractor" },
                    { value: "other", label: "Other" },
                  ]}
                />

                {/* Conditional: DB-linked dropdown OR free text */}
                {showEntityDropdown ? (
                  <FormSelect
                    label="Select Contact"
                    required
                    value={selectedEntityId}
                    onChange={(e) => handleEntitySelect(e.target.value)}
                    options={[
                      { value: "", label: "-- Select from Database --" },
                      ...entityOptions.map((e) => ({
                        value: e.value,
                        label: e.label,
                      })),
                      { value: "__manual__", label: "+ Enter manually" },
                    ]}
                  />
                ) : (
                  <FormInput
                    label="Contact Name"
                    required
                    value={formData.contactName}
                    onChange={(e) =>
                      setFormData({ ...formData, contactName: e.target.value })
                    }
                    placeholder="Enter contact name"
                  />
                )}

                <div className={isEntityLinked ? "opacity-60" : ""}>
                  <FormInput
                    label="Email"
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) =>
                      !isEntityLinked && setFormData({ ...formData, contactEmail: e.target.value })
                    }
                    placeholder="contact@example.com"
                    readOnly={isEntityLinked}
                  />
                </div>

                <div className={isEntityLinked ? "opacity-60" : ""}>
                  <FormInput
                    label="Phone"
                    type="tel"
                    value={formData.contactPhone}
                    onChange={(e) =>
                      !isEntityLinked && setFormData({ ...formData, contactPhone: e.target.value })
                    }
                    placeholder="0400 000 000"
                    readOnly={isEntityLinked}
                  />
                </div>
              </div>

              {/* Linked entity indicator */}
              {isEntityLinked && (
                <div className="mt-3 flex items-center gap-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-900/50 text-blue-300 border border-blue-700">
                    Linked to database record
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setUseManualEntry(true);
                      setSelectedEntityId("");
                      setIsEntityLinked(false);
                      setFormData((prev) => ({
                        ...prev,
                        contactName: "",
                        contactEmail: "",
                        contactPhone: "",
                      }));
                    }}
                    className="text-xs text-gray-400 hover:text-white underline"
                  >
                    Unlink
                  </button>
                </div>
              )}

              {/* Manual entry mode indicator with option to go back to dropdown */}
              {useManualEntry && isDbLinkable && (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => setUseManualEntry(false)}
                    className="text-xs text-blue-400 hover:text-blue-300 underline"
                  >
                    Select from database instead
                  </button>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Content</h2>

              <div className="space-y-4">
                <FormInput
                  label="Subject"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Subject or topic (optional)"
                />

                <FormTextarea
                  label="Summary / Notes"
                  required
                  value={formData.summary}
                  onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                  placeholder="Summarize the communication..."
                  rows={5}
                />
              </div>
            </div>

            {/* NDIS Compliance */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4">NDIS Compliance</h2>

              <div className="space-y-4">
                <FormSelect
                  label="Compliance Category"
                  value={formData.complianceCategory}
                  onChange={(e) =>
                    setFormData({ ...formData, complianceCategory: e.target.value })
                  }
                  options={COMPLIANCE_CATEGORIES}
                />

                <fieldset>
                  <legend className="text-sm font-medium text-gray-300 mb-2">
                    Compliance Flags
                  </legend>
                  <div className="space-y-2">
                    {COMPLIANCE_FLAGS.map((flag) => (
                      <label
                        key={flag.value}
                        className="flex items-center gap-3 cursor-pointer group"
                      >
                        <input
                          type="checkbox"
                          checked={formData.complianceFlags.includes(flag.value)}
                          onChange={() => handleFlagToggle(flag.value)}
                          className="w-4 h-4 rounded border-gray-600 text-blue-600 focus:ring-blue-500 bg-gray-700"
                        />
                        <span className="text-sm text-gray-300 group-hover:text-white">
                          {flag.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              </div>
            </div>

            {/* Linking */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Link to Record</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormSelect
                  label="Participant"
                  value={formData.linkedParticipantId}
                  onChange={(e) =>
                    setFormData({ ...formData, linkedParticipantId: e.target.value })
                  }
                  options={[
                    { value: "", label: "-- Select Participant --" },
                    ...participants.map((p) => ({
                      value: p._id,
                      label: `${p.firstName} ${p.lastName}`,
                    })),
                  ]}
                />

                <FormSelect
                  label="Property"
                  value={formData.linkedPropertyId}
                  onChange={(e) =>
                    setFormData({ ...formData, linkedPropertyId: e.target.value })
                  }
                  options={[
                    { value: "", label: "-- Select Property --" },
                    ...properties.map((p) => ({
                      value: p._id,
                      label: p.propertyName || p.addressLine1,
                    })),
                  ]}
                />
              </div>
            </div>

            {/* Attachment */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Attachment</h2>

              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => setAttachmentFile(e.target.files?.[0] || null)}
                className="hidden"
                accept="image/*,.pdf,.doc,.docx"
              />

              {attachmentFile ? (
                <div className="flex items-center gap-3 p-3 bg-gray-700 rounded-lg">
                  <span className="text-2xl" aria-hidden="true">📎</span>
                  <div className="flex-1">
                    <p className="text-white text-sm">{attachmentFile.name}</p>
                    <p className="text-gray-400 text-xs">
                      {(attachmentFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAttachmentFile(null)}
                    className="text-red-400 hover:text-red-300"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div
                  onDragOver={handleDragOver}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      fileInputRef.current?.click();
                    }
                  }}
                  aria-label="Upload attachment. Click or drag and drop a file."
                  className={`w-full p-6 border-2 border-dashed rounded-lg transition-colors cursor-pointer ${
                    isDragOver
                      ? "border-blue-500 bg-blue-500/10 text-blue-400"
                      : "border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-300"
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <svg
                      className={`w-8 h-8 ${isDragOver ? "text-blue-400" : "text-gray-400"}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                    <p className="text-center">
                      {isDragOver ? (
                        <span className="font-medium">Drop file here</span>
                      ) : (
                        <>
                          <span className="font-medium">Click to upload</span> or drag and drop
                        </>
                      )}
                    </p>
                    <p className="text-xs text-gray-400">
                      Images, PDF, or Word documents
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Create Follow-up Task */}
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <input
                  type="checkbox"
                  id="createFollowUpTask"
                  checked={createFollowUpTask}
                  onChange={(e) => setCreateFollowUpTask(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="createFollowUpTask" className="text-lg font-semibold text-white">
                  Create Follow-up Task
                </label>
              </div>

              {createFollowUpTask && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-700">
                  <FormInput
                    label="Task Title"
                    required={createFollowUpTask}
                    value={followUpTaskTitle}
                    onChange={(e) => setFollowUpTaskTitle(e.target.value)}
                    placeholder="e.g., Follow up on funding approval"
                  />

                  <FormInput
                    label="Due Date"
                    type="date"
                    required={createFollowUpTask}
                    value={followUpTaskDueDate}
                    onChange={(e) => setFollowUpTaskDueDate(e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                isLoading={isSubmitting}
                fullWidth
              >
                Log Communication
              </Button>
            </div>
          </form>
        </main>
      </div>
    </RequireAuth>
  );
}
