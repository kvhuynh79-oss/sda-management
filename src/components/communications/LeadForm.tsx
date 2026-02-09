"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { FormInput, FormSelect, FormTextarea, Button } from "../forms";
import type {
  Lead,
  LeadStatus,
  SdaCategory,
  UrgencyLevel,
  ReferrerType,
  LeadSource,
} from "./LeadsView";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LeadFormData {
  // Referrer
  referrerType: ReferrerType;
  referrerName: string;
  referrerPhone: string;
  referrerEmail: string;
  referrerOrganization: string;
  referrerEntityId: string;
  // Participant
  participantName: string;
  ndisNumber: string;
  participantAge: string;
  participantGender: string;
  // Housing needs
  sdaCategory: SdaCategory | "";
  preferredAreas: string[];
  preferredState: string;
  specificRequirements: string;
  budgetNotes: string;
  // Tracking
  source: LeadSource | "";
  urgency: UrgencyLevel | "";
  notes: string;
}

const EMPTY_FORM: LeadFormData = {
  referrerType: "ot",
  referrerName: "",
  referrerPhone: "",
  referrerEmail: "",
  referrerOrganization: "",
  referrerEntityId: "",
  participantName: "",
  ndisNumber: "",
  participantAge: "",
  participantGender: "",
  sdaCategory: "",
  preferredAreas: [],
  preferredState: "",
  specificRequirements: "",
  budgetNotes: "",
  source: "",
  urgency: "",
  notes: "",
};

// ---------------------------------------------------------------------------
// File upload types & constants
// ---------------------------------------------------------------------------

interface PendingFile {
  id: string;
  file: File;
  documentType: string;
  storageId: string | null;
  uploading: boolean;
  uploaded: boolean;
  error: string | null;
}

const MAX_FILES = 15;
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const ACCEPTED_FILE_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/png",
  "image/jpeg",
];

const LEAD_DOCUMENT_TYPES = [
  { value: "ndis_plan", label: "NDIS Plan" },
  { value: "sda_quotation", label: "SDA Quotation" },
  { value: "accommodation_agreement", label: "Accommodation Agreement" },
  { value: "centrepay_consent", label: "Centrepay Consent" },
  { value: "report", label: "OT Assessment / Report" },
  { value: "other", label: "Other Document" },
];

// ---------------------------------------------------------------------------
// Option constants
// ---------------------------------------------------------------------------

const REFERRER_TYPE_OPTIONS = [
  { value: "ot", label: "Occupational Therapist" },
  { value: "sc", label: "Support Coordinator" },
  { value: "other", label: "Other" },
];

const SDA_CATEGORY_OPTIONS = [
  { value: "high_physical_support", label: "High Physical Support (HPS)" },
  { value: "robust", label: "Robust" },
  { value: "fully_accessible", label: "Fully Accessible (FA)" },
  { value: "improved_liveability", label: "Improved Liveability (IL)" },
];

const SOURCE_OPTIONS = [
  { value: "phone", label: "Phone Call" },
  { value: "email", label: "Email" },
  { value: "referral", label: "Referral" },
  { value: "website", label: "Website" },
];

const URGENCY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const GENDER_OPTIONS = [
  { value: "", label: "Not specified" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "non_binary", label: "Non-binary" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

const STATE_OPTIONS = [
  { value: "", label: "Any state" },
  { value: "NSW", label: "New South Wales" },
  { value: "VIC", label: "Victoria" },
  { value: "QLD", label: "Queensland" },
  { value: "WA", label: "Western Australia" },
  { value: "SA", label: "South Australia" },
  { value: "TAS", label: "Tasmania" },
  { value: "ACT", label: "Australian Capital Territory" },
  { value: "NT", label: "Northern Territory" },
];

// ---------------------------------------------------------------------------
// Area Tag Input
// ---------------------------------------------------------------------------

function AreaTagInput({
  areas,
  onChange,
}: {
  areas: string[];
  onChange: (areas: string[]) => void;
}) {
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if ((e.key === "Enter" || e.key === ",") && inputValue.trim()) {
        e.preventDefault();
        const newArea = inputValue.trim();
        if (!areas.includes(newArea)) {
          onChange([...areas, newArea]);
        }
        setInputValue("");
      } else if (e.key === "Backspace" && inputValue === "" && areas.length > 0) {
        onChange(areas.slice(0, -1));
      }
    },
    [inputValue, areas, onChange]
  );

  const handleRemove = useCallback(
    (area: string) => {
      onChange(areas.filter((a) => a !== area));
    },
    [areas, onChange]
  );

  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1">
        Preferred Areas
      </label>
      <div
        className="flex flex-wrap gap-1.5 p-2 bg-gray-700 border border-gray-600 rounded-lg min-h-[2.5rem] cursor-text focus-within:ring-2 focus-within:ring-teal-600 focus-within:border-teal-600 transition-colors"
        onClick={() => inputRef.current?.focus()}
      >
        {areas.map((area) => (
          <span
            key={area}
            className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-gray-600 text-gray-200 rounded-md border border-gray-500"
          >
            {area}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleRemove(area);
              }}
              className="text-gray-400 hover:text-white transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-teal-600 rounded"
              aria-label={`Remove ${area}`}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={areas.length === 0 ? "Type suburb and press Enter..." : "Add more..."}
          className="flex-1 min-w-[8rem] bg-transparent text-white text-sm placeholder-gray-400 outline-none"
          aria-label="Add preferred area"
        />
      </div>
      <p className="mt-1 text-xs text-gray-400">
        Type a suburb name and press Enter to add it as a tag.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Form Component
// ---------------------------------------------------------------------------

interface LeadFormProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  editLead?: Lead | null;
  onSubmit?: (data: LeadFormData) => Promise<void>;
}

export function LeadForm({ userId, isOpen, onClose, editLead, onSubmit }: LeadFormProps) {
  const [formData, setFormData] = useState<LeadFormData>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLSelectElement>(null);

  // File upload state
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Query OTs and SCs from database for dropdown
  const ots = useQuery(
    api.occupationalTherapists.getAll,
    userId ? { userId: userId as Id<"users"> } : "skip"
  );
  const scs = useQuery(
    api.supportCoordinators.getAll,
    userId ? { userId: userId as Id<"users"> } : "skip"
  );

  // Mutations for creating/updating leads
  const createLead = useMutation(api.leads.create);
  const updateLead = useMutation(api.leads.update);

  // File upload mutations
  const generateUploadUrl = useMutation(api.documents.generateUploadUrl);
  const createDocument = useMutation(api.documents.create);

  // Derived upload state
  const hasUploadingFiles = pendingFiles.some((f) => f.uploading);
  const hasFailedFiles = pendingFiles.some((f) => f.error);

  // Populate form when editing
  useEffect(() => {
    if (editLead) {
      setFormData({
        referrerType: editLead.referrerType,
        referrerName: editLead.referrerName,
        referrerPhone: editLead.referrerPhone || "",
        referrerEmail: editLead.referrerEmail || "",
        referrerOrganization: editLead.referrerOrganization || "",
        referrerEntityId: editLead.referrerEntityId || "",
        participantName: editLead.participantName,
        ndisNumber: editLead.ndisNumber || "",
        participantAge: editLead.participantAge ? String(editLead.participantAge) : "",
        participantGender: editLead.participantGender || "",
        sdaCategory: editLead.sdaCategory,
        preferredAreas: [...editLead.preferredAreas],
        preferredState: editLead.preferredState || "",
        specificRequirements: editLead.specificRequirements || "",
        budgetNotes: editLead.budgetNotes || "",
        source: editLead.source,
        urgency: editLead.urgency,
        notes: editLead.notes || "",
      });
    } else {
      setFormData(EMPTY_FORM);
    }
    setErrors({});
    setPendingFiles([]);
    setUploadError(null);
  }, [editLead, isOpen]);

  // Focus trap and Escape key
  useEffect(() => {
    if (!isOpen) return;

    // Focus first input
    setTimeout(() => firstInputRef.current?.focus(), 100);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    // Prevent body scroll
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  // Build entity dropdown options
  const entityOptions = useMemo(() => {
    if (formData.referrerType === "ot" && ots) {
      return ots.map((ot: any) => ({
        value: ot._id,
        label: `${ot.firstName} ${ot.lastName}${ot.organization ? ` - ${ot.organization}` : ""}`,
      }));
    }
    if (formData.referrerType === "sc" && scs) {
      return scs.map((sc: any) => ({
        value: sc._id,
        label: `${sc.firstName} ${sc.lastName}${sc.organization ? ` - ${sc.organization}` : ""}`,
      }));
    }
    return [];
  }, [formData.referrerType, ots, scs]);

  // Auto-fill when selecting an existing OT/SC
  const handleEntitySelect = useCallback(
    (entityId: string) => {
      setFormData((prev) => {
        const updated = { ...prev, referrerEntityId: entityId };

        if (entityId) {
          // Find the entity and auto-fill
          if (prev.referrerType === "ot" && ots) {
            const ot = ots.find((o: any) => o._id === entityId);
            if (ot) {
              updated.referrerName = `${(ot as any).firstName} ${(ot as any).lastName}`;
              updated.referrerPhone = (ot as any).phone || "";
              updated.referrerEmail = (ot as any).email || "";
              updated.referrerOrganization = (ot as any).organization || "";
            }
          } else if (prev.referrerType === "sc" && scs) {
            const sc = scs.find((s: any) => s._id === entityId);
            if (sc) {
              updated.referrerName = `${(sc as any).firstName} ${(sc as any).lastName}`;
              updated.referrerPhone = (sc as any).phone || "";
              updated.referrerEmail = (sc as any).email || "";
              updated.referrerOrganization = (sc as any).organization || "";
            }
          }
        }

        return updated;
      });
    },
    [ots, scs]
  );

  // Handle referrer type change - reset entity selection
  const handleReferrerTypeChange = useCallback((type: string) => {
    setFormData((prev) => ({
      ...prev,
      referrerType: type as ReferrerType,
      referrerEntityId: "",
      referrerName: "",
      referrerPhone: "",
      referrerEmail: "",
      referrerOrganization: "",
    }));
  }, []);

  // -------------------------------------------------------------------------
  // File upload handlers
  // -------------------------------------------------------------------------

  const uploadFile = useCallback(
    async (pendingFile: PendingFile) => {
      try {
        setPendingFiles((prev) =>
          prev.map((f) =>
            f.id === pendingFile.id ? { ...f, uploading: true, error: null } : f
          )
        );

        const uploadUrl = await generateUploadUrl();
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": pendingFile.file.type },
          body: pendingFile.file,
        });

        if (!result.ok) throw new Error("Upload failed");

        const { storageId } = await result.json();

        setPendingFiles((prev) =>
          prev.map((f) =>
            f.id === pendingFile.id
              ? { ...f, storageId, uploading: false, uploaded: true }
              : f
          )
        );
      } catch {
        setPendingFiles((prev) =>
          prev.map((f) =>
            f.id === pendingFile.id
              ? { ...f, uploading: false, error: "Upload failed. Click retry." }
              : f
          )
        );
      }
    },
    [generateUploadUrl]
  );

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      setUploadError(null);
      const fileArray = Array.from(files);

      const remaining = MAX_FILES - pendingFiles.length;
      if (fileArray.length > remaining) {
        setUploadError(
          `Maximum ${MAX_FILES} files allowed. You can add ${remaining} more.`
        );
        return;
      }

      const validFiles: PendingFile[] = [];
      for (const file of fileArray) {
        if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
          setUploadError(`"${file.name}" is not a supported file type.`);
          continue;
        }
        if (file.size > MAX_FILE_SIZE) {
          setUploadError(`"${file.name}" exceeds 50MB limit.`);
          continue;
        }
        validFiles.push({
          id: crypto.randomUUID(),
          file,
          documentType: "other",
          storageId: null,
          uploading: false,
          uploaded: false,
          error: null,
        });
      }

      setPendingFiles((prev) => [...prev, ...validFiles]);

      // Start uploading each file immediately
      validFiles.forEach((f) => uploadFile(f));
    },
    [pendingFiles.length, uploadFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles]
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        handleFiles(e.target.files);
        e.target.value = ""; // Reset so same files can be re-selected
      }
    },
    [handleFiles]
  );

  const handleRemoveFile = useCallback((fileId: string) => {
    setPendingFiles((prev) => prev.filter((f) => f.id !== fileId));
  }, []);

  const handleDocTypeChange = useCallback((fileId: string, docType: string) => {
    setPendingFiles((prev) =>
      prev.map((f) => (f.id === fileId ? { ...f, documentType: docType } : f))
    );
  }, []);

  const handleRetry = useCallback(
    (fileId: string) => {
      const file = pendingFiles.find((f) => f.id === fileId);
      if (file) uploadFile(file);
    },
    [pendingFiles, uploadFile]
  );

  // -------------------------------------------------------------------------
  // Validation
  // -------------------------------------------------------------------------

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.participantName.trim()) {
      newErrors.participantName = "Participant name is required";
    }
    if (!formData.referrerName.trim()) {
      newErrors.referrerName = "Referrer name is required";
    }
    if (!formData.sdaCategory) {
      newErrors.sdaCategory = "SDA category is required";
    }
    if (!formData.source) {
      newErrors.source = "Source is required";
    }
    if (!formData.urgency) {
      newErrors.urgency = "Urgency is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // -------------------------------------------------------------------------
  // Submit handler
  // -------------------------------------------------------------------------

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!validate()) return;
      if (hasUploadingFiles) return;

      setIsSubmitting(true);
      try {
        // Map frontend referrerType to backend values
        const referrerTypeMap: Record<string, string> = {
          ot: "occupational_therapist",
          sc: "support_coordinator",
          other: "other",
        };

        // Map frontend gender to backend values (non_binary not in backend schema, map to other)
        const genderMap: Record<string, string> = {
          male: "male",
          female: "female",
          non_binary: "other",
          prefer_not_to_say: "prefer_not_to_say",
        };

        if (editLead) {
          // Update existing lead
          await updateLead({
            userId: userId as Id<"users">,
            leadId: editLead._id as Id<"leads">,
            referrerType: referrerTypeMap[formData.referrerType] as any,
            referrerId: formData.referrerEntityId || undefined,
            referrerName: formData.referrerName,
            referrerPhone: formData.referrerPhone || undefined,
            referrerEmail: formData.referrerEmail || undefined,
            referrerOrganization: formData.referrerOrganization || undefined,
            participantName: formData.participantName,
            participantNdisNumber: formData.ndisNumber || undefined,
            participantAge: formData.participantAge ? parseInt(formData.participantAge) : undefined,
            participantGender: formData.participantGender && genderMap[formData.participantGender]
              ? (genderMap[formData.participantGender] as any)
              : undefined,
            sdaCategoryNeeded: formData.sdaCategory as any,
            preferredAreas: formData.preferredAreas,
            preferredState: formData.preferredState || undefined,
            specificRequirements: formData.specificRequirements || undefined,
            budgetNotes: formData.budgetNotes || undefined,
            urgency: formData.urgency as any,
            source: formData.source as any,
            notes: formData.notes || undefined,
          });
        } else {
          // Create new lead
          const leadId = await createLead({
            userId: userId as Id<"users">,
            referrerType: referrerTypeMap[formData.referrerType] as any,
            referrerId: formData.referrerEntityId || undefined,
            referrerName: formData.referrerName,
            referrerPhone: formData.referrerPhone || undefined,
            referrerEmail: formData.referrerEmail || undefined,
            referrerOrganization: formData.referrerOrganization || undefined,
            participantName: formData.participantName,
            participantNdisNumber: formData.ndisNumber || undefined,
            participantAge: formData.participantAge ? parseInt(formData.participantAge) : undefined,
            participantGender: formData.participantGender && genderMap[formData.participantGender]
              ? (genderMap[formData.participantGender] as any)
              : undefined,
            sdaCategoryNeeded: formData.sdaCategory as any,
            preferredAreas: formData.preferredAreas,
            preferredState: formData.preferredState || undefined,
            specificRequirements: formData.specificRequirements || undefined,
            budgetNotes: formData.budgetNotes || undefined,
            urgency: formData.urgency as any,
            source: formData.source as any,
            notes: formData.notes || undefined,
          });

          // Link uploaded documents to the newly created lead
          for (const pf of pendingFiles) {
            if (pf.uploaded && pf.storageId) {
              try {
                await createDocument({
                  fileName: pf.file.name,
                  fileSize: pf.file.size,
                  fileType: pf.file.type,
                  storageId: pf.storageId as Id<"_storage">,
                  documentType: pf.documentType,
                  documentCategory: "participant",
                  linkedLeadId: leadId as Id<"leads">,
                  uploadedBy: userId as Id<"users">,
                });
              } catch (err) {
                console.error("Failed to link document:", pf.file.name, err);
              }
            }
          }
        }

        if (onSubmit) {
          await onSubmit(formData);
        }
        onClose();
        setFormData(EMPTY_FORM);
        setPendingFiles([]);
        setUploadError(null);
      } catch (error) {
        console.error("Failed to save lead:", error);
      } finally {
        setIsSubmitting(false);
      }
    },
    [formData, validate, onSubmit, onClose, createLead, updateLead, editLead, userId, pendingFiles, createDocument, hasUploadingFiles]
  );

  // -------------------------------------------------------------------------
  // Compute submit button label
  // -------------------------------------------------------------------------

  const submitButtonLabel = useMemo(() => {
    if (hasUploadingFiles) return "Uploading files...";
    if (pendingFiles.length > 0 && !editLead) {
      const uploadedCount = pendingFiles.filter((f) => f.uploaded).length;
      return `Create Lead & Link ${uploadedCount} Document${uploadedCount !== 1 ? "s" : ""}`;
    }
    return editLead ? "Update Lead" : "Create Lead";
  }, [hasUploadingFiles, pendingFiles, editLead]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={editLead ? "Edit Lead" : "New Lead"}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={dialogRef}
        className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-gray-900 border border-gray-700 rounded-xl shadow-2xl mx-4 my-4 sm:my-8"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gray-900 border-b border-gray-700 px-6 py-4 flex items-center justify-between rounded-t-xl">
          <h2 className="text-lg font-bold text-white">
            {editLead ? "Edit Lead" : "New Lead"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Section 1: Referrer */}
          <fieldset>
            <legend className="text-sm font-semibold text-teal-500 uppercase tracking-wider mb-3">
              Referrer Information
            </legend>
            <div className="space-y-3">
              <FormSelect
                ref={firstInputRef}
                label="Referrer Type"
                value={formData.referrerType}
                onChange={(e) => handleReferrerTypeChange(e.target.value)}
                options={REFERRER_TYPE_OPTIONS}
                required
                placeholder=""
              />

              {/* Entity dropdown for OT/SC */}
              {(formData.referrerType === "ot" || formData.referrerType === "sc") && (
                <FormSelect
                  label={formData.referrerType === "ot" ? "Select OT from Database" : "Select SC from Database"}
                  value={formData.referrerEntityId}
                  onChange={(e) => handleEntitySelect(e.target.value)}
                  options={[
                    { value: "", label: "-- Manual entry --" },
                    ...entityOptions,
                  ]}
                  placeholder=""
                  helperText="Select from database to auto-fill details, or leave blank for manual entry."
                />
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormInput
                  label="Name"
                  value={formData.referrerName}
                  onChange={(e) => setFormData((p) => ({ ...p, referrerName: e.target.value }))}
                  required
                  error={errors.referrerName}
                  placeholder="Full name"
                />
                <FormInput
                  label="Organization"
                  value={formData.referrerOrganization}
                  onChange={(e) => setFormData((p) => ({ ...p, referrerOrganization: e.target.value }))}
                  placeholder="Company / practice name"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormInput
                  label="Phone"
                  type="tel"
                  value={formData.referrerPhone}
                  onChange={(e) => setFormData((p) => ({ ...p, referrerPhone: e.target.value }))}
                  placeholder="04XX XXX XXX"
                  autoComplete="tel"
                />
                <FormInput
                  label="Email"
                  type="email"
                  value={formData.referrerEmail}
                  onChange={(e) => setFormData((p) => ({ ...p, referrerEmail: e.target.value }))}
                  placeholder="email@example.com"
                  autoComplete="email"
                />
              </div>
            </div>
          </fieldset>

          {/* Section 2: Participant */}
          <fieldset>
            <legend className="text-sm font-semibold text-teal-500 uppercase tracking-wider mb-3">
              Participant Details
            </legend>
            <div className="space-y-3">
              <FormInput
                label="Participant Name"
                value={formData.participantName}
                onChange={(e) => setFormData((p) => ({ ...p, participantName: e.target.value }))}
                required
                error={errors.participantName}
                placeholder="Full name of participant"
              />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <FormInput
                  label="NDIS Number"
                  value={formData.ndisNumber}
                  onChange={(e) => setFormData((p) => ({ ...p, ndisNumber: e.target.value }))}
                  placeholder="Optional"
                />
                <FormInput
                  label="Age"
                  type="number"
                  value={formData.participantAge}
                  onChange={(e) => setFormData((p) => ({ ...p, participantAge: e.target.value }))}
                  placeholder="Optional"
                  min="0"
                  max="120"
                />
                <FormSelect
                  label="Gender"
                  value={formData.participantGender}
                  onChange={(e) => setFormData((p) => ({ ...p, participantGender: e.target.value }))}
                  options={GENDER_OPTIONS}
                  placeholder=""
                />
              </div>
            </div>
          </fieldset>

          {/* Section 3: Housing Needs */}
          <fieldset>
            <legend className="text-sm font-semibold text-teal-500 uppercase tracking-wider mb-3">
              Housing Needs
            </legend>
            <div className="space-y-3">
              <FormSelect
                label="SDA Category"
                value={formData.sdaCategory}
                onChange={(e) => setFormData((p) => ({ ...p, sdaCategory: e.target.value as SdaCategory }))}
                options={SDA_CATEGORY_OPTIONS}
                required
                error={errors.sdaCategory}
              />

              <AreaTagInput
                areas={formData.preferredAreas}
                onChange={(areas) => setFormData((p) => ({ ...p, preferredAreas: areas }))}
              />

              <FormSelect
                label="Preferred State"
                value={formData.preferredState}
                onChange={(e) => setFormData((p) => ({ ...p, preferredState: e.target.value }))}
                options={STATE_OPTIONS}
                placeholder=""
              />

              <FormTextarea
                label="Specific Requirements"
                value={formData.specificRequirements}
                onChange={(e) => setFormData((p) => ({ ...p, specificRequirements: e.target.value }))}
                placeholder="E.g. wheelchair accessible, ceiling hoists, sensory room, proximity to services..."
                rows={3}
              />

              <FormTextarea
                label="Budget Notes"
                value={formData.budgetNotes}
                onChange={(e) => setFormData((p) => ({ ...p, budgetNotes: e.target.value }))}
                placeholder="Any budget or funding details..."
                rows={2}
              />
            </div>
          </fieldset>

          {/* Section 4: Tracking */}
          <fieldset>
            <legend className="text-sm font-semibold text-teal-500 uppercase tracking-wider mb-3">
              Tracking
            </legend>
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormSelect
                  label="Source"
                  value={formData.source}
                  onChange={(e) => setFormData((p) => ({ ...p, source: e.target.value as LeadSource }))}
                  options={SOURCE_OPTIONS}
                  required
                  error={errors.source}
                />
                <FormSelect
                  label="Urgency"
                  value={formData.urgency}
                  onChange={(e) => setFormData((p) => ({ ...p, urgency: e.target.value as UrgencyLevel }))}
                  options={URGENCY_OPTIONS}
                  required
                  error={errors.urgency}
                />
              </div>

              <FormTextarea
                label="Notes"
                value={formData.notes}
                onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Any additional notes about this lead..."
                rows={3}
              />
            </div>
          </fieldset>

          {/* Section 5: Attachments */}
          <fieldset>
            <legend className="text-sm font-semibold text-teal-500 uppercase tracking-wider mb-3">
              Attachments
            </legend>

            {/* Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragEnter={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                isDragOver
                  ? "border-teal-500 bg-teal-500/10"
                  : "border-gray-600 hover:border-gray-500 hover:bg-gray-800/50"
              }`}
              role="button"
              tabIndex={0}
              aria-label="Drop files here or click to browse"
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                onChange={handleFileInputChange}
                className="hidden"
                aria-hidden="true"
              />
              <svg
                className="mx-auto w-8 h-8 text-gray-400 mb-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <p className="text-sm text-gray-300">
                {isDragOver ? "Drop files here" : "Drop files here or click to browse"}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                PDF, DOC, XLS, PNG, JPG - Max 50MB each - Up to {MAX_FILES} files
              </p>
            </div>

            {/* Upload Error */}
            {uploadError && (
              <div className="mt-2 flex items-center gap-2 text-sm text-red-400">
                <svg
                  className="w-4 h-4 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
                {uploadError}
              </div>
            )}

            {/* File List */}
            {pendingFiles.length > 0 && (
              <div className="mt-3 space-y-2">
                {pendingFiles.map((pf) => (
                  <div
                    key={pf.id}
                    className="flex items-center gap-3 bg-gray-700/50 rounded-lg px-3 py-2 border border-gray-600"
                  >
                    {/* Status icon */}
                    <div className="flex-shrink-0">
                      {pf.uploading ? (
                        <svg
                          className="w-4 h-4 text-teal-400 animate-spin"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                      ) : pf.uploaded ? (
                        <svg
                          className="w-4 h-4 text-green-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      ) : pf.error ? (
                        <svg
                          className="w-4 h-4 text-red-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-4 h-4 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                      )}
                    </div>

                    {/* File name + size */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{pf.file.name}</p>
                      <p className="text-xs text-gray-400">
                        {(pf.file.size / 1024 / 1024).toFixed(1)} MB
                        {pf.error && (
                          <span className="text-red-400 ml-2">{pf.error}</span>
                        )}
                      </p>
                    </div>

                    {/* Document type selector */}
                    <select
                      value={pf.documentType}
                      onChange={(e) => handleDocTypeChange(pf.id, e.target.value)}
                      className="bg-gray-700 border border-gray-600 rounded-md text-sm text-gray-200 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-teal-600"
                      aria-label={`Document type for ${pf.file.name}`}
                    >
                      {LEAD_DOCUMENT_TYPES.map((dt) => (
                        <option key={dt.value} value={dt.value}>
                          {dt.label}
                        </option>
                      ))}
                    </select>

                    {/* Retry button (on error) */}
                    {pf.error && (
                      <button
                        type="button"
                        onClick={() => handleRetry(pf.id)}
                        className="p-1 text-teal-400 hover:text-teal-300 rounded transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-teal-600"
                        aria-label={`Retry upload for ${pf.file.name}`}
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                          />
                        </svg>
                      </button>
                    )}

                    {/* Remove button */}
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(pf.id)}
                      className="p-1 text-gray-400 hover:text-red-400 rounded transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-teal-600"
                      aria-label={`Remove ${pf.file.name}`}
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
                <p className="text-xs text-gray-400">
                  {pendingFiles.length}/{MAX_FILES} files - Select document type for
                  each file before submitting.
                </p>
              </div>
            )}
          </fieldset>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-700">
            <Button variant="ghost" onClick={onClose} type="button">
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              isLoading={isSubmitting}
              disabled={hasUploadingFiles}
              leftIcon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              }
            >
              {submitButtonLabel}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default LeadForm;
