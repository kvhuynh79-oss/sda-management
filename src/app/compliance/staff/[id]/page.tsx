"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import Header from "@/components/Header";
import { RequireAuth } from "@/components/RequireAuth";
import Link from "next/link";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import { formatDate } from "@/utils/format";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EditFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  address: string;
  suburb: string;
  state: string;
  postcode: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  position: string;
  employmentType: string;
  startDate: string;
  endDate: string;
  policeCheckNumber: string;
  policeCheckDate: string;
  policeCheckExpiry: string;
  ndisWorkerScreeningNumber: string;
  ndisWorkerScreeningDate: string;
  ndisWorkerScreeningExpiry: string;
  workingWithChildrenNumber: string;
  workingWithChildrenDate: string;
  workingWithChildrenExpiry: string;
  ndisWorkerOrientation: boolean;
  ndisWorkerOrientationDate: string;
  firstAidCertDate: string;
  firstAidCertExpiry: string;
  notes: string;
  isActive: boolean;
}

const DOCUMENT_TYPE_OPTIONS = [
  { value: "police_check", label: "Police Check" },
  { value: "ndis_worker_screening_doc", label: "NDIS Worker Screening" },
  { value: "wwcc_check", label: "Working With Children Check" },
  { value: "first_aid_cert", label: "First Aid Certificate" },
  { value: "employment_contract", label: "Employment Contract" },
  { value: "training_record", label: "Training Record" },
  { value: "identity_document", label: "Identity Document" },
  { value: "other", label: "Other" },
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function EmploymentTypeBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    full_time: "bg-green-500/20 text-green-400",
    part_time: "bg-blue-500/20 text-blue-400",
    casual: "bg-yellow-500/20 text-yellow-400",
    contractor: "bg-purple-500/20 text-purple-400",
  };
  const labels: Record<string, string> = {
    full_time: "Full Time",
    part_time: "Part Time",
    casual: "Casual",
    contractor: "Contractor",
  };
  return (
    <span
      className={`px-2 py-1 text-xs rounded-full ${styles[type] || "bg-gray-500/20 text-gray-400"}`}
    >
      {labels[type] || type}
    </span>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return active ? (
    <span className="px-2 py-1 text-xs rounded-full bg-green-500/20 text-green-400">
      Active
    </span>
  ) : (
    <span className="px-2 py-1 text-xs rounded-full bg-red-500/20 text-red-400">
      Inactive
    </span>
  );
}

function getScreeningStatus(expiryDate?: string): string {
  if (!expiryDate) return "not_set";
  const expiry = new Date(expiryDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const thirtyDays = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
  if (expiry < today) return "expired";
  if (expiry <= thirtyDays) return "expiring_soon";
  return "current";
}

function ScreeningStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    current: { label: "Current", className: "bg-green-500/20 text-green-400" },
    expiring_soon: {
      label: "Expiring",
      className: "bg-yellow-500/20 text-yellow-400",
    },
    expired: { label: "EXPIRED", className: "bg-red-500/20 text-red-400" },
    not_set: {
      label: "Not recorded",
      className: "bg-gray-500/20 text-gray-400",
    },
  };
  const c = config[status] || config.not_set;
  return (
    <span className={`px-2 py-0.5 text-xs rounded-full ${c.className}`}>
      {c.label}
    </span>
  );
}

function DetailField({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div>
      <p className="text-sm text-gray-400 mb-1">{label}</p>
      <p className="text-sm text-white">
        {value || <span className="text-gray-400">-</span>}
      </p>
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function DocumentTypeBadge({ type }: { type: string }) {
  const found = DOCUMENT_TYPE_OPTIONS.find((o) => o.value === type);
  return (
    <span className="px-2 py-0.5 text-xs rounded-full bg-teal-500/20 text-teal-400">
      {found?.label || type}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main content
// ---------------------------------------------------------------------------

function StaffDetailContent() {
  const params = useParams();
  const router = useRouter();
  const { confirm: confirmDialog, alert: alertDialog } = useConfirmDialog();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const staffMemberId = params.id as Id<"staffMembers">;

  // ── Auth ──────────────────────────────────────────────────────────
  const [user, setUser] = useState<{ id: string; role: string } | null>(null);
  useEffect(() => {
    const storedUser = localStorage.getItem("sda_user");
    if (!storedUser) {
      router.push("/login");
      return;
    }
    setUser(JSON.parse(storedUser));
  }, [router]);

  // ── Data ──────────────────────────────────────────────────────────
  const staffMember = useQuery(
    api.staff.getById,
    user ? { userId: user.id as Id<"users">, staffMemberId } : "skip"
  );
  const documents = useQuery(
    api.documents.getByStaffMember,
    user ? { userId: user.id as Id<"users">, staffMemberId } : "skip"
  );
  const updateStaff = useMutation(api.staff.update);
  const generateUploadUrl = useMutation(api.documents.generateUploadUrl);
  const createDocument = useMutation(api.documents.create);
  const removeDocument = useMutation(api.documents.remove);

  // ── Edit mode state ───────────────────────────────────────────────
  const [editMode, setEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [editForm, setEditForm] = useState<EditFormData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    address: "",
    suburb: "",
    state: "",
    postcode: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    position: "",
    employmentType: "full_time",
    startDate: "",
    endDate: "",
    policeCheckNumber: "",
    policeCheckDate: "",
    policeCheckExpiry: "",
    ndisWorkerScreeningNumber: "",
    ndisWorkerScreeningDate: "",
    ndisWorkerScreeningExpiry: "",
    workingWithChildrenNumber: "",
    workingWithChildrenDate: "",
    workingWithChildrenExpiry: "",
    ndisWorkerOrientation: false,
    ndisWorkerOrientationDate: "",
    firstAidCertDate: "",
    firstAidCertExpiry: "",
    notes: "",
    isActive: true,
  });

  // ── Document upload state ─────────────────────────────────────────
  const [isUploading, setIsUploading] = useState(false);
  const [uploadDocType, setUploadDocType] = useState("other");

  // ── Populate edit form when entering edit mode ────────────────────
  const handleStartEdit = useCallback(() => {
    if (!staffMember) return;
    setEditForm({
      firstName: staffMember.firstName || "",
      lastName: staffMember.lastName || "",
      email: staffMember.email || "",
      phone: staffMember.phone || "",
      dateOfBirth: staffMember.dateOfBirth || "",
      address: staffMember.address || "",
      suburb: staffMember.suburb || "",
      state: staffMember.state || "",
      postcode: staffMember.postcode || "",
      emergencyContactName: staffMember.emergencyContactName || "",
      emergencyContactPhone: staffMember.emergencyContactPhone || "",
      position: staffMember.position || "",
      employmentType: staffMember.employmentType || "full_time",
      startDate: staffMember.startDate || "",
      endDate: staffMember.endDate || "",
      policeCheckNumber: staffMember.policeCheckNumber || "",
      policeCheckDate: staffMember.policeCheckDate || "",
      policeCheckExpiry: staffMember.policeCheckExpiry || "",
      ndisWorkerScreeningNumber: staffMember.ndisWorkerScreeningNumber || "",
      ndisWorkerScreeningDate: staffMember.ndisWorkerScreeningDate || "",
      ndisWorkerScreeningExpiry: staffMember.ndisWorkerScreeningExpiry || "",
      workingWithChildrenNumber: staffMember.workingWithChildrenNumber || "",
      workingWithChildrenDate: staffMember.workingWithChildrenDate || "",
      workingWithChildrenExpiry: staffMember.workingWithChildrenExpiry || "",
      ndisWorkerOrientation: staffMember.ndisWorkerOrientation || false,
      ndisWorkerOrientationDate: staffMember.ndisWorkerOrientationDate || "",
      firstAidCertDate: staffMember.firstAidCertDate || "",
      firstAidCertExpiry: staffMember.firstAidCertExpiry || "",
      notes: staffMember.notes || "",
      isActive: staffMember.isActive,
    });
    setEditMode(true);
    setError("");
  }, [staffMember]);

  // ── Save changes ──────────────────────────────────────────────────
  const handleSave = async () => {
    if (!user || !staffMember) return;
    setIsSaving(true);
    setError("");

    try {
      await updateStaff({
        userId: user.id as Id<"users">,
        staffMemberId,
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        email: editForm.email,
        phone: editForm.phone || undefined,
        dateOfBirth: editForm.dateOfBirth || undefined,
        address: editForm.address || undefined,
        suburb: editForm.suburb || undefined,
        state: editForm.state || undefined,
        postcode: editForm.postcode || undefined,
        emergencyContactName: editForm.emergencyContactName || undefined,
        emergencyContactPhone: editForm.emergencyContactPhone || undefined,
        position: editForm.position || undefined,
        employmentType: editForm.employmentType as
          | "full_time"
          | "part_time"
          | "casual"
          | "contractor",
        startDate: editForm.startDate || undefined,
        endDate: editForm.endDate || undefined,
        policeCheckNumber: editForm.policeCheckNumber || undefined,
        policeCheckDate: editForm.policeCheckDate || undefined,
        policeCheckExpiry: editForm.policeCheckExpiry || undefined,
        ndisWorkerScreeningNumber:
          editForm.ndisWorkerScreeningNumber || undefined,
        ndisWorkerScreeningDate:
          editForm.ndisWorkerScreeningDate || undefined,
        ndisWorkerScreeningExpiry:
          editForm.ndisWorkerScreeningExpiry || undefined,
        workingWithChildrenNumber:
          editForm.workingWithChildrenNumber || undefined,
        workingWithChildrenDate:
          editForm.workingWithChildrenDate || undefined,
        workingWithChildrenExpiry:
          editForm.workingWithChildrenExpiry || undefined,
        ndisWorkerOrientation: editForm.ndisWorkerOrientation,
        ndisWorkerOrientationDate:
          editForm.ndisWorkerOrientationDate || undefined,
        firstAidCertDate: editForm.firstAidCertDate || undefined,
        firstAidCertExpiry: editForm.firstAidCertExpiry || undefined,
        notes: editForm.notes || undefined,
        isActive: editForm.isActive,
      });
      setEditMode(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to save changes";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  // ── Document upload ───────────────────────────────────────────────
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploading(true);
    setError("");

    try {
      // Step 1: Get upload URL
      const uploadUrl = await generateUploadUrl();

      // Step 2: Upload file
      const uploadResult = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!uploadResult.ok) {
        throw new Error("File upload failed");
      }

      const { storageId } = await uploadResult.json();

      // Step 3: Create document record
      await createDocument({
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        storageId: storageId as Id<"_storage">,
        documentType: uploadDocType,
        documentCategory: "staff",
        linkedStaffMemberId: staffMemberId,
        uploadedBy: user.id as Id<"users">,
      });

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setUploadDocType("other");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to upload document";
      setError(message);
    } finally {
      setIsUploading(false);
    }
  };

  // ── Document delete ───────────────────────────────────────────────
  const handleDeleteDocument = async (
    docId: Id<"documents">,
    fileName: string
  ) => {
    if (!user) return;
    const confirmed = await confirmDialog({
      title: "Delete Document",
      message: `Are you sure you want to delete "${fileName}"? This action cannot be undone.`,
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!confirmed) return;

    try {
      await removeDocument({
        userId: user.id as Id<"users">,
        id: docId,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to delete document";
      await alertDialog({ title: "Error", message });
    }
  };

  // ── Cancel edit ───────────────────────────────────────────────────
  const handleCancelEdit = () => {
    setEditMode(false);
    setError("");
  };

  // ── Loading ───────────────────────────────────────────────────────
  if (staffMember === undefined) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header currentPage="compliance" />
        <div className="flex items-center justify-center h-96">
          <div
            className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-600"
            role="status"
            aria-label="Loading staff member details"
          />
        </div>
      </div>
    );
  }

  // ── Not found ─────────────────────────────────────────────────────
  if (staffMember === null) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header currentPage="compliance" />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12 bg-gray-800 rounded-lg border border-gray-700">
            <svg
              className="w-12 h-12 mx-auto text-gray-400 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            <p className="text-gray-400 mb-4">Staff member not found</p>
            <Link
              href="/compliance/staff"
              className="inline-block px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
            >
              Back to Staff Files
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // ── Screening data rows ───────────────────────────────────────────
  const screenings = [
    {
      label: "Police Check",
      number: staffMember.policeCheckNumber,
      date: staffMember.policeCheckDate,
      expiry: staffMember.policeCheckExpiry,
      editNumberKey: "policeCheckNumber" as const,
      editDateKey: "policeCheckDate" as const,
      editExpiryKey: "policeCheckExpiry" as const,
    },
    {
      label: "NDIS Worker Screening",
      number: staffMember.ndisWorkerScreeningNumber,
      date: staffMember.ndisWorkerScreeningDate,
      expiry: staffMember.ndisWorkerScreeningExpiry,
      editNumberKey: "ndisWorkerScreeningNumber" as const,
      editDateKey: "ndisWorkerScreeningDate" as const,
      editExpiryKey: "ndisWorkerScreeningExpiry" as const,
    },
    {
      label: "Working With Children",
      number: staffMember.workingWithChildrenNumber,
      date: staffMember.workingWithChildrenDate,
      expiry: staffMember.workingWithChildrenExpiry,
      editNumberKey: "workingWithChildrenNumber" as const,
      editDateKey: "workingWithChildrenDate" as const,
      editExpiryKey: "workingWithChildrenExpiry" as const,
    },
  ];

  const policeStatus = getScreeningStatus(staffMember.policeCheckExpiry);
  const ndisStatus = getScreeningStatus(staffMember.ndisWorkerScreeningExpiry);
  const wwcStatus = getScreeningStatus(staffMember.workingWithChildrenExpiry);
  const firstAidStatus = getScreeningStatus(staffMember.firstAidCertExpiry);

  const hasExpiredScreening =
    policeStatus === "expired" ||
    ndisStatus === "expired" ||
    wwcStatus === "expired" ||
    firstAidStatus === "expired";

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-900">
      <Header currentPage="compliance" />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Staff Files", href: "/compliance/staff" },
          { label: `${staffMember.firstName} ${staffMember.lastName}` },
        ]} />

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">
              {staffMember.firstName} {staffMember.lastName}
            </h1>
            <p className="text-gray-400 mt-1">
              {staffMember.position || "No position set"}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <EmploymentTypeBadge type={staffMember.employmentType} />
            <StatusBadge active={staffMember.isActive} />
            {!editMode ? (
              <button
                onClick={handleStartEdit}
                className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white text-sm rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
              >
                Edit
              </button>
            ) : (
              <button
                onClick={handleCancelEdit}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        {/* ── Error banner ─────────────────────────────────────────── */}
        {error && (
          <div
            className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg mb-6"
            role="alert"
          >
            {error}
          </div>
        )}

        {/* ── Expired screening warning ────────────────────────────── */}
        {!editMode && hasExpiredScreening && (
          <div className="rounded-lg p-4 mb-6 flex items-center gap-3 bg-red-900/30 border border-red-600/50">
            <svg
              className="w-5 h-5 flex-shrink-0 text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
            <div>
              <p className="font-medium text-red-400">
                One or more screening checks have expired
              </p>
              <p className="text-gray-400 text-sm mt-0.5">
                Review the NDIS Screening &amp; Compliance section below and
                arrange renewals.
              </p>
            </div>
          </div>
        )}

        {editMode ? (
          /* ============================================================
           * EDIT MODE
           * ============================================================ */
          <div className="space-y-6">
            {/* ── Personal Details (edit) ───────────────────────────── */}
            <section className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h2 className="text-lg font-semibold text-white mb-4">
                Personal Details
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="edit-firstName"
                    className="block text-sm font-medium text-gray-300 mb-1"
                  >
                    First Name
                  </label>
                  <input
                    id="edit-firstName"
                    type="text"
                    value={editForm.firstName}
                    onChange={(e) =>
                      setEditForm({ ...editForm, firstName: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors"
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="edit-lastName"
                    className="block text-sm font-medium text-gray-300 mb-1"
                  >
                    Last Name
                  </label>
                  <input
                    id="edit-lastName"
                    type="text"
                    value={editForm.lastName}
                    onChange={(e) =>
                      setEditForm({ ...editForm, lastName: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors"
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="edit-email"
                    className="block text-sm font-medium text-gray-300 mb-1"
                  >
                    Email
                  </label>
                  <input
                    id="edit-email"
                    type="email"
                    value={editForm.email}
                    onChange={(e) =>
                      setEditForm({ ...editForm, email: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors"
                    autoComplete="email"
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="edit-phone"
                    className="block text-sm font-medium text-gray-300 mb-1"
                  >
                    Phone
                  </label>
                  <input
                    id="edit-phone"
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) =>
                      setEditForm({ ...editForm, phone: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors"
                    autoComplete="tel"
                  />
                </div>
                <div>
                  <label
                    htmlFor="edit-dob"
                    className="block text-sm font-medium text-gray-300 mb-1"
                  >
                    Date of Birth
                  </label>
                  <input
                    id="edit-dob"
                    type="date"
                    value={editForm.dateOfBirth}
                    onChange={(e) =>
                      setEditForm({ ...editForm, dateOfBirth: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors"
                  />
                </div>
                <div>
                  <label
                    htmlFor="edit-address"
                    className="block text-sm font-medium text-gray-300 mb-1"
                  >
                    Address
                  </label>
                  <input
                    id="edit-address"
                    type="text"
                    value={editForm.address}
                    onChange={(e) =>
                      setEditForm({ ...editForm, address: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors"
                    autoComplete="street-address"
                  />
                </div>
                <div>
                  <label
                    htmlFor="edit-suburb"
                    className="block text-sm font-medium text-gray-300 mb-1"
                  >
                    Suburb
                  </label>
                  <input
                    id="edit-suburb"
                    type="text"
                    value={editForm.suburb}
                    onChange={(e) =>
                      setEditForm({ ...editForm, suburb: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors"
                  />
                </div>
                <div>
                  <label
                    htmlFor="edit-state"
                    className="block text-sm font-medium text-gray-300 mb-1"
                  >
                    State
                  </label>
                  <select
                    id="edit-state"
                    value={editForm.state}
                    onChange={(e) =>
                      setEditForm({ ...editForm, state: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors"
                  >
                    <option value="">Select state</option>
                    <option value="NSW">NSW</option>
                    <option value="VIC">VIC</option>
                    <option value="QLD">QLD</option>
                    <option value="WA">WA</option>
                    <option value="SA">SA</option>
                    <option value="TAS">TAS</option>
                    <option value="ACT">ACT</option>
                    <option value="NT">NT</option>
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="edit-postcode"
                    className="block text-sm font-medium text-gray-300 mb-1"
                  >
                    Postcode
                  </label>
                  <input
                    id="edit-postcode"
                    type="text"
                    value={editForm.postcode}
                    onChange={(e) =>
                      setEditForm({ ...editForm, postcode: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors"
                    maxLength={4}
                    autoComplete="postal-code"
                  />
                </div>
                <div>
                  <label
                    htmlFor="edit-emergName"
                    className="block text-sm font-medium text-gray-300 mb-1"
                  >
                    Emergency Contact Name
                  </label>
                  <input
                    id="edit-emergName"
                    type="text"
                    value={editForm.emergencyContactName}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        emergencyContactName: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors"
                  />
                </div>
                <div>
                  <label
                    htmlFor="edit-emergPhone"
                    className="block text-sm font-medium text-gray-300 mb-1"
                  >
                    Emergency Contact Phone
                  </label>
                  <input
                    id="edit-emergPhone"
                    type="tel"
                    value={editForm.emergencyContactPhone}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        emergencyContactPhone: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors"
                    autoComplete="tel"
                  />
                </div>
                <div className="flex items-center gap-3 sm:col-span-2">
                  <label
                    htmlFor="edit-isActive"
                    className="text-sm font-medium text-gray-300"
                  >
                    Active Status
                  </label>
                  <button
                    id="edit-isActive"
                    type="button"
                    role="switch"
                    aria-checked={editForm.isActive}
                    onClick={() =>
                      setEditForm({
                        ...editForm,
                        isActive: !editForm.isActive,
                      })
                    }
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
                      editForm.isActive ? "bg-teal-600" : "bg-gray-600"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        editForm.isActive ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                  <span className="text-sm text-gray-400">
                    {editForm.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
            </section>

            {/* ── Employment Details (edit) ─────────────────────────── */}
            <section className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h2 className="text-lg font-semibold text-white mb-4">
                Employment Details
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="edit-position"
                    className="block text-sm font-medium text-gray-300 mb-1"
                  >
                    Position
                  </label>
                  <input
                    id="edit-position"
                    type="text"
                    value={editForm.position}
                    onChange={(e) =>
                      setEditForm({ ...editForm, position: e.target.value })
                    }
                    placeholder="e.g., Support Worker, Property Manager"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors"
                  />
                </div>
                <div>
                  <label
                    htmlFor="edit-empType"
                    className="block text-sm font-medium text-gray-300 mb-1"
                  >
                    Employment Type
                  </label>
                  <select
                    id="edit-empType"
                    value={editForm.employmentType}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        employmentType: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors"
                  >
                    <option value="full_time">Full Time</option>
                    <option value="part_time">Part Time</option>
                    <option value="casual">Casual</option>
                    <option value="contractor">Contractor</option>
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="edit-startDate"
                    className="block text-sm font-medium text-gray-300 mb-1"
                  >
                    Start Date
                  </label>
                  <input
                    id="edit-startDate"
                    type="date"
                    value={editForm.startDate}
                    onChange={(e) =>
                      setEditForm({ ...editForm, startDate: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors"
                  />
                </div>
                <div>
                  <label
                    htmlFor="edit-endDate"
                    className="block text-sm font-medium text-gray-300 mb-1"
                  >
                    End Date
                  </label>
                  <input
                    id="edit-endDate"
                    type="date"
                    value={editForm.endDate}
                    onChange={(e) =>
                      setEditForm({ ...editForm, endDate: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors"
                  />
                </div>
              </div>
            </section>

            {/* ── NDIS Screening & Compliance (edit) ───────────────── */}
            <section className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h2 className="text-lg font-semibold text-white mb-4">
                NDIS Screening &amp; Compliance
              </h2>
              <div className="space-y-6">
                {/* Police Check */}
                <fieldset className="border-t border-gray-700 pt-4 first:border-t-0 first:pt-0">
                  <legend className="text-sm font-medium text-gray-300 mb-3">
                    Police Check
                  </legend>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label
                        htmlFor="edit-policeNum"
                        className="block text-sm text-gray-400 mb-1"
                      >
                        Number
                      </label>
                      <input
                        id="edit-policeNum"
                        type="text"
                        value={editForm.policeCheckNumber}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            policeCheckNumber: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="edit-policeDate"
                        className="block text-sm text-gray-400 mb-1"
                      >
                        Issue Date
                      </label>
                      <input
                        id="edit-policeDate"
                        type="date"
                        value={editForm.policeCheckDate}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            policeCheckDate: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="edit-policeExpiry"
                        className="block text-sm text-gray-400 mb-1"
                      >
                        Expiry Date
                      </label>
                      <input
                        id="edit-policeExpiry"
                        type="date"
                        value={editForm.policeCheckExpiry}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            policeCheckExpiry: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors"
                      />
                    </div>
                  </div>
                </fieldset>

                {/* NDIS Worker Screening */}
                <fieldset className="border-t border-gray-700 pt-4">
                  <legend className="text-sm font-medium text-gray-300 mb-3">
                    NDIS Worker Screening
                  </legend>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label
                        htmlFor="edit-ndisNum"
                        className="block text-sm text-gray-400 mb-1"
                      >
                        Number
                      </label>
                      <input
                        id="edit-ndisNum"
                        type="text"
                        value={editForm.ndisWorkerScreeningNumber}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            ndisWorkerScreeningNumber: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="edit-ndisDate"
                        className="block text-sm text-gray-400 mb-1"
                      >
                        Issue Date
                      </label>
                      <input
                        id="edit-ndisDate"
                        type="date"
                        value={editForm.ndisWorkerScreeningDate}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            ndisWorkerScreeningDate: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="edit-ndisExpiry"
                        className="block text-sm text-gray-400 mb-1"
                      >
                        Expiry Date
                      </label>
                      <input
                        id="edit-ndisExpiry"
                        type="date"
                        value={editForm.ndisWorkerScreeningExpiry}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            ndisWorkerScreeningExpiry: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors"
                      />
                    </div>
                  </div>
                </fieldset>

                {/* Working With Children */}
                <fieldset className="border-t border-gray-700 pt-4">
                  <legend className="text-sm font-medium text-gray-300 mb-3">
                    Working With Children Check
                  </legend>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label
                        htmlFor="edit-wwcNum"
                        className="block text-sm text-gray-400 mb-1"
                      >
                        Number
                      </label>
                      <input
                        id="edit-wwcNum"
                        type="text"
                        value={editForm.workingWithChildrenNumber}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            workingWithChildrenNumber: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="edit-wwcDate"
                        className="block text-sm text-gray-400 mb-1"
                      >
                        Issue Date
                      </label>
                      <input
                        id="edit-wwcDate"
                        type="date"
                        value={editForm.workingWithChildrenDate}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            workingWithChildrenDate: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="edit-wwcExpiry"
                        className="block text-sm text-gray-400 mb-1"
                      >
                        Expiry Date
                      </label>
                      <input
                        id="edit-wwcExpiry"
                        type="date"
                        value={editForm.workingWithChildrenExpiry}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            workingWithChildrenExpiry: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors"
                      />
                    </div>
                  </div>
                </fieldset>

                {/* NDIS Worker Orientation */}
                <fieldset className="border-t border-gray-700 pt-4">
                  <legend className="text-sm font-medium text-gray-300 mb-3">
                    NDIS Worker Orientation Module
                  </legend>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <label
                        htmlFor="edit-orientation"
                        className="text-sm text-gray-400"
                      >
                        Completed
                      </label>
                      <button
                        id="edit-orientation"
                        type="button"
                        role="switch"
                        aria-checked={editForm.ndisWorkerOrientation}
                        onClick={() =>
                          setEditForm({
                            ...editForm,
                            ndisWorkerOrientation:
                              !editForm.ndisWorkerOrientation,
                          })
                        }
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
                          editForm.ndisWorkerOrientation
                            ? "bg-teal-600"
                            : "bg-gray-600"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            editForm.ndisWorkerOrientation
                              ? "translate-x-6"
                              : "translate-x-1"
                          }`}
                        />
                      </button>
                      <span className="text-sm text-gray-400">
                        {editForm.ndisWorkerOrientation ? "Yes" : "No"}
                      </span>
                    </div>
                    <div>
                      <label
                        htmlFor="edit-orientDate"
                        className="block text-sm text-gray-400 mb-1"
                      >
                        Completion Date
                      </label>
                      <input
                        id="edit-orientDate"
                        type="date"
                        value={editForm.ndisWorkerOrientationDate}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            ndisWorkerOrientationDate: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors"
                      />
                    </div>
                  </div>
                </fieldset>

                {/* First Aid */}
                <fieldset className="border-t border-gray-700 pt-4">
                  <legend className="text-sm font-medium text-gray-300 mb-3">
                    First Aid Certificate
                  </legend>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="edit-firstAidDate"
                        className="block text-sm text-gray-400 mb-1"
                      >
                        Certificate Date
                      </label>
                      <input
                        id="edit-firstAidDate"
                        type="date"
                        value={editForm.firstAidCertDate}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            firstAidCertDate: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="edit-firstAidExpiry"
                        className="block text-sm text-gray-400 mb-1"
                      >
                        Expiry Date
                      </label>
                      <input
                        id="edit-firstAidExpiry"
                        type="date"
                        value={editForm.firstAidCertExpiry}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            firstAidCertExpiry: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors"
                      />
                    </div>
                  </div>
                </fieldset>
              </div>
            </section>

            {/* ── Notes (edit) ──────────────────────────────────────── */}
            <section className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h2 className="text-lg font-semibold text-white mb-4">Notes</h2>
              <label htmlFor="edit-notes" className="sr-only">
                Notes
              </label>
              <textarea
                id="edit-notes"
                value={editForm.notes}
                onChange={(e) =>
                  setEditForm({ ...editForm, notes: e.target.value })
                }
                rows={4}
                placeholder="Any additional notes about this staff member..."
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors"
              />
            </section>

            {/* ── Save / Cancel buttons ─────────────────────────────── */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-2 bg-teal-700 hover:bg-teal-800 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
              <button
                onClick={handleCancelEdit}
                disabled={isSaving}
                className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          /* ============================================================
           * READ MODE
           * ============================================================ */
          <div className="space-y-6">
            {/* ── Personal Details ──────────────────────────────────── */}
            <section
              className="bg-gray-800 rounded-lg p-6 border border-gray-700"
              aria-labelledby="section-personal"
            >
              <h2
                id="section-personal"
                className="text-lg font-semibold text-white mb-4"
              >
                Personal Details
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <DetailField label="Email" value={staffMember.email} />
                <DetailField label="Phone" value={staffMember.phone} />
                <DetailField
                  label="Date of Birth"
                  value={formatDate(staffMember.dateOfBirth)}
                />
                <DetailField
                  label="Address"
                  value={
                    [
                      staffMember.address,
                      staffMember.suburb,
                      staffMember.state,
                      staffMember.postcode,
                    ]
                      .filter(Boolean)
                      .join(", ") || undefined
                  }
                />
                <DetailField
                  label="Emergency Contact Name"
                  value={staffMember.emergencyContactName}
                />
                <DetailField
                  label="Emergency Contact Phone"
                  value={staffMember.emergencyContactPhone}
                />
              </div>
            </section>

            {/* ── Employment Details ────────────────────────────────── */}
            <section
              className="bg-gray-800 rounded-lg p-6 border border-gray-700"
              aria-labelledby="section-employment"
            >
              <h2
                id="section-employment"
                className="text-lg font-semibold text-white mb-4"
              >
                Employment Details
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <DetailField label="Position" value={staffMember.position} />
                <div>
                  <p className="text-sm text-gray-400 mb-1">Employment Type</p>
                  <EmploymentTypeBadge type={staffMember.employmentType} />
                </div>
                <DetailField
                  label="Start Date"
                  value={formatDate(staffMember.startDate)}
                />
                <DetailField
                  label="End Date"
                  value={formatDate(staffMember.endDate)}
                />
                <div className="sm:col-span-2">
                  <p className="text-sm text-gray-400 mb-1">
                    Assigned Properties
                  </p>
                  {staffMember.assignedProperties &&
                  staffMember.assignedProperties.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {staffMember.assignedProperties.map(
                        (propId: Id<"properties">) => (
                          <Link
                            key={propId}
                            href={`/properties/${propId}`}
                            className="inline-flex items-center px-2 py-1 text-xs rounded-full bg-teal-500/20 text-teal-400 hover:bg-teal-500/30 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                          >
                            {propId}
                          </Link>
                        )
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">
                      No properties assigned
                    </span>
                  )}
                </div>
              </div>
            </section>

            {/* ── NDIS Screening & Compliance ──────────────────────── */}
            <section
              className="bg-gray-800 rounded-lg p-6 border border-gray-700"
              aria-labelledby="section-screening"
            >
              <h2
                id="section-screening"
                className="text-lg font-semibold text-white mb-4"
              >
                NDIS Screening &amp; Compliance
              </h2>
              <div className="overflow-x-auto">
                <table
                  className="w-full text-sm"
                  role="table"
                  aria-label="NDIS screening and compliance checks"
                >
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left text-gray-400 font-medium py-2 pr-4">
                        Screening Type
                      </th>
                      <th className="text-left text-gray-400 font-medium py-2 pr-4">
                        Number
                      </th>
                      <th className="text-left text-gray-400 font-medium py-2 pr-4">
                        Issue Date
                      </th>
                      <th className="text-left text-gray-400 font-medium py-2 pr-4">
                        Expiry Date
                      </th>
                      <th className="text-left text-gray-400 font-medium py-2">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {screenings.map((s) => {
                      const status = getScreeningStatus(s.expiry);
                      return (
                        <tr
                          key={s.label}
                          className="border-b border-gray-700/50"
                        >
                          <td className="py-3 pr-4 text-white font-medium">
                            {s.label}
                          </td>
                          <td className="py-3 pr-4 text-gray-300">
                            {s.number || (
                              <span className="text-gray-500">-</span>
                            )}
                          </td>
                          <td className="py-3 pr-4 text-gray-300">
                            {s.date ? (
                              formatDate(s.date)
                            ) : (
                              <span className="text-gray-500">Not recorded</span>
                            )}
                          </td>
                          <td
                            className={`py-3 pr-4 ${
                              status === "expired"
                                ? "text-red-400"
                                : status === "expiring_soon"
                                  ? "text-yellow-400"
                                  : "text-gray-300"
                            }`}
                          >
                            {s.expiry ? (
                              formatDate(s.expiry)
                            ) : (
                              <span className="text-gray-500">Not recorded</span>
                            )}
                          </td>
                          <td className="py-3">
                            <ScreeningStatusBadge status={status} />
                          </td>
                        </tr>
                      );
                    })}

                    {/* NDIS Worker Orientation (boolean, no expiry) */}
                    <tr className="border-b border-gray-700/50">
                      <td className="py-3 pr-4 text-white font-medium">
                        NDIS Worker Orientation
                      </td>
                      <td className="py-3 pr-4 text-gray-300" colSpan={2}>
                        {staffMember.ndisWorkerOrientation ? (
                          <span className="text-green-400">Completed</span>
                        ) : (
                          <span className="text-gray-500">Not completed</span>
                        )}
                        {staffMember.ndisWorkerOrientationDate && (
                          <span className="text-gray-400 ml-2">
                            ({formatDate(staffMember.ndisWorkerOrientationDate)})
                          </span>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-gray-500">N/A</td>
                      <td className="py-3">
                        <ScreeningStatusBadge
                          status={
                            staffMember.ndisWorkerOrientation
                              ? "current"
                              : "not_set"
                          }
                        />
                      </td>
                    </tr>

                    {/* First Aid */}
                    <tr>
                      <td className="py-3 pr-4 text-white font-medium">
                        First Aid Certificate
                      </td>
                      <td className="py-3 pr-4 text-gray-500">-</td>
                      <td className="py-3 pr-4 text-gray-300">
                        {staffMember.firstAidCertDate ? (
                          formatDate(staffMember.firstAidCertDate)
                        ) : (
                          <span className="text-gray-500">Not recorded</span>
                        )}
                      </td>
                      <td
                        className={`py-3 pr-4 ${
                          firstAidStatus === "expired"
                            ? "text-red-400"
                            : firstAidStatus === "expiring_soon"
                              ? "text-yellow-400"
                              : "text-gray-300"
                        }`}
                      >
                        {staffMember.firstAidCertExpiry ? (
                          formatDate(staffMember.firstAidCertExpiry)
                        ) : (
                          <span className="text-gray-500">Not recorded</span>
                        )}
                      </td>
                      <td className="py-3">
                        <ScreeningStatusBadge status={firstAidStatus} />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* ── Documents ────────────────────────────────────────── */}
            <section
              className="bg-gray-800 rounded-lg p-6 border border-gray-700"
              aria-labelledby="section-documents"
            >
              <div className="flex items-center justify-between mb-4">
                <h2
                  id="section-documents"
                  className="text-lg font-semibold text-white"
                >
                  Documents
                </h2>
                <div className="flex items-center gap-2">
                  <label htmlFor="doc-type-select" className="sr-only">
                    Document type
                  </label>
                  <select
                    id="doc-type-select"
                    value={uploadDocType}
                    onChange={(e) => setUploadDocType(e.target.value)}
                    className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors"
                  >
                    {DOCUMENT_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="px-4 py-2 bg-teal-700 hover:bg-teal-800 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                  >
                    {isUploading ? "Uploading..." : "Upload"}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    onChange={handleFileSelect}
                    className="hidden"
                    aria-label="Select file to upload"
                  />
                </div>
              </div>

              {documents === undefined ? (
                <div className="py-6 text-center">
                  <div
                    className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-teal-600 mx-auto"
                    role="status"
                    aria-label="Loading documents"
                  />
                </div>
              ) : documents && documents.length > 0 ? (
                <div className="space-y-2">
                  {documents.map(
                    (doc: {
                      _id: Id<"documents">;
                      fileName: string;
                      fileType: string;
                      fileSize: number;
                      documentType: string;
                      downloadUrl: string | null;
                      createdAt: number;
                    }) => (
                      <div
                        key={doc._id}
                        className="flex items-center justify-between gap-3 px-4 py-3 bg-gray-700/50 rounded-lg border border-gray-600/50 hover:bg-gray-700/80 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* File icon */}
                          <svg
                            className="w-5 h-5 flex-shrink-0 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                            />
                          </svg>
                          <div className="min-w-0">
                            <p className="text-sm text-white truncate">
                              {doc.fileName}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <DocumentTypeBadge type={doc.documentType} />
                              <span className="text-xs text-gray-400">
                                {formatFileSize(doc.fileSize)}
                              </span>
                              <span className="text-xs text-gray-400">
                                {new Date(doc.createdAt).toLocaleDateString(
                                  "en-AU"
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {doc.downloadUrl && (
                            <a
                              href={doc.downloadUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 text-teal-400 hover:text-teal-300 rounded-lg hover:bg-gray-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                              aria-label={`Download ${doc.fileName}`}
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                aria-hidden="true"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                />
                              </svg>
                            </a>
                          )}
                          <button
                            onClick={() =>
                              handleDeleteDocument(doc._id, doc.fileName)
                            }
                            className="p-2 text-red-400 hover:text-red-300 rounded-lg hover:bg-gray-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                            aria-label={`Delete ${doc.fileName}`}
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              aria-hidden="true"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <svg
                    className="w-10 h-10 mx-auto text-gray-500 mb-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <p className="text-gray-400 text-sm">
                    No documents uploaded yet
                  </p>
                  <p className="text-gray-500 text-xs mt-1">
                    Upload screening certificates, contracts, and training
                    records
                  </p>
                </div>
              )}
            </section>

            {/* ── Notes ────────────────────────────────────────────── */}
            <section
              className="bg-gray-800 rounded-lg p-6 border border-gray-700"
              aria-labelledby="section-notes"
            >
              <h2
                id="section-notes"
                className="text-lg font-semibold text-white mb-4"
              >
                Notes
              </h2>
              {staffMember.notes ? (
                <p className="text-gray-300 text-sm whitespace-pre-wrap">
                  {staffMember.notes}
                </p>
              ) : (
                <p className="text-gray-400 text-sm">No notes recorded.</p>
              )}
            </section>

            {/* ── Metadata ─────────────────────────────────────────── */}
            <div
              className="text-xs text-gray-400 flex items-center gap-4"
              aria-label="Record metadata"
            >
              <span>
                Created:{" "}
                {new Date(staffMember.createdAt).toLocaleDateString("en-AU")}
              </span>
              <span>
                Updated:{" "}
                {new Date(staffMember.updatedAt).toLocaleDateString("en-AU")}
              </span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page export with auth wrapper
// ---------------------------------------------------------------------------

export default function StaffMemberDetailPage() {
  return (
    <RequireAuth allowedRoles={["admin"]}>
      <StaffDetailContent />
    </RequireAuth>
  );
}
