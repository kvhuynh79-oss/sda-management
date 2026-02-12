"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import Link from "next/link";
import Header from "@/components/Header";
import { RequireAuth } from "@/components/RequireAuth";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useOrganization } from "@/contexts/OrganizationContext";
import { formatDate } from "@/utils/format";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<
  string,
  { label: string; dotColor: string; bgColor: string; textColor: string }
> = {
  draft: {
    label: "Draft",
    dotColor: "bg-gray-400",
    bgColor: "bg-gray-500/20",
    textColor: "text-gray-400",
  },
  active: {
    label: "Active",
    dotColor: "bg-green-400",
    bgColor: "bg-green-500/20",
    textColor: "text-green-400",
  },
  under_review: {
    label: "Under Review",
    dotColor: "bg-yellow-400",
    bgColor: "bg-yellow-500/20",
    textColor: "text-yellow-400",
  },
  archived: {
    label: "Archived",
    dotColor: "bg-red-400",
    bgColor: "bg-red-500/20",
    textColor: "text-red-400",
  },
};

const CATEGORY_OPTIONS = [
  { value: "SDA Tenancy Management", label: "SDA Tenancy Management" },
  { value: "SDA Property Management", label: "SDA Property Management" },
  { value: "Tenant Rights & Engagement", label: "Tenant Rights & Engagement" },
  { value: "SDA Operations", label: "SDA Operations" },
  { value: "NDIS Practice Standards", label: "NDIS Practice Standards" },
  { value: "Agreements & Templates", label: "Agreements & Templates" },
  { value: "Reference", label: "Reference" },
  { value: "Governance", label: "Governance" },
  { value: "Health & Safety", label: "Health & Safety" },
  { value: "Human Resources", label: "Human Resources" },
  { value: "Finance", label: "Finance" },
  { value: "Incident Management", label: "Incident Management" },
  { value: "Compliance", label: "Compliance" },
  { value: "Other", label: "Other" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${config.bgColor} ${config.textColor}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${config.dotColor}`}
        aria-hidden="true"
      />
      {config.label}
    </span>
  );
}

function CategoryBadge({ category }: { category: string }) {
  const found = CATEGORY_OPTIONS.find((c) => c.value === category);
  const label = found
    ? found.label
    : category.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  return (
    <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full bg-teal-500/20 text-teal-400">
      {label}
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

function getReviewStatus(reviewDueDate?: string): "overdue" | "soon" | "ok" | "none" {
  if (!reviewDueDate) return "none";
  const due = new Date(reviewDueDate);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  if (due < now) return "overdue";
  if (due <= thirtyDays) return "soon";
  return "ok";
}

// ---------------------------------------------------------------------------
// Edit form state interface
// ---------------------------------------------------------------------------

interface EditFormState {
  title: string;
  description: string;
  category: string;
  version: string;
  effectiveDate: string;
  reviewDueDate: string;
  notes: string;
}

// ---------------------------------------------------------------------------
// Main content
// ---------------------------------------------------------------------------

function PolicyDetailContent() {
  const params = useParams();
  const router = useRouter();
  const { confirm: confirmDialog, alert: alertDialog } = useConfirmDialog();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const policyId = params.id as Id<"policies">;

  // -- Auth --
  const [user, setUser] = useState<{ id: string; role: string } | null>(null);
  useEffect(() => {
    const stored = localStorage.getItem("sda_user");
    if (!stored) {
      router.push("/login");
      return;
    }
    try {
      setUser(JSON.parse(stored));
    } catch {
      // invalid
    }
  }, [router]);

  // -- Data --
  const policy = useQuery(
    api.policies.getById,
    user ? { userId: user.id as Id<"users">, policyId } : "skip"
  );

  const updatePolicy = useMutation(api.policies.update);
  const removePolicy = useMutation(api.policies.remove);
  const generateUploadUrl = useMutation(api.policies.generateUploadUrl);

  // -- Edit state --
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const [editForm, setEditForm] = useState<EditFormState>({
    title: "",
    description: "",
    category: "",
    version: "",
    effectiveDate: "",
    reviewDueDate: "",
    notes: "",
  });

  // -- Role checks --
  const canEdit =
    user?.role === "admin" || user?.role === "property_manager";
  const canDelete = user?.role === "admin";

  // -- Populate edit form --
  const handleStartEdit = useCallback(() => {
    if (!policy) return;
    setEditForm({
      title: policy.title || "",
      description: policy.description || "",
      category: policy.category || "",
      version: policy.version || "",
      effectiveDate: policy.effectiveDate || "",
      reviewDueDate: policy.reviewDueDate || "",
      notes: policy.notes || "",
    });
    setIsEditing(true);
    setError("");
  }, [policy]);

  const handleCancelEdit = () => {
    setIsEditing(false);
    setError("");
  };

  // -- Save changes --
  const handleSave = async () => {
    if (!user || !policy) return;
    if (!editForm.title.trim()) {
      setError("Title is required.");
      return;
    }
    setIsSaving(true);
    setError("");

    try {
      await updatePolicy({
        userId: user.id as Id<"users">,
        policyId,
        title: editForm.title,
        description: editForm.description || undefined,
        category: editForm.category || undefined,
        version: editForm.version || undefined,
        effectiveDate: editForm.effectiveDate || undefined,
        reviewDueDate: editForm.reviewDueDate || undefined,
        notes: editForm.notes || undefined,
      });
      setIsEditing(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to save changes";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  // -- Status change --
  const handleStatusChange = async (
    newStatus: "draft" | "active" | "under_review" | "archived"
  ) => {
    if (!user) return;
    try {
      await updatePolicy({
        userId: user.id as Id<"users">,
        policyId,
        status: newStatus,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to update status";
      await alertDialog({ title: "Error", message });
    }
  };

  // -- Document upload --
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploading(true);
    setError("");

    try {
      const uploadUrl = await generateUploadUrl();
      const uploadResult = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!uploadResult.ok) {
        throw new Error("File upload failed");
      }

      const { storageId } = await uploadResult.json();

      await updatePolicy({
        userId: user.id as Id<"users">,
        policyId,
        documentStorageId: storageId as Id<"_storage">,
        documentFileName: file.name,
      });

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to upload document";
      setError(message);
    } finally {
      setIsUploading(false);
    }
  };

  // -- Delete --
  const handleDelete = async () => {
    if (!user) return;
    const confirmed = await confirmDialog({
      title: "Delete Policy",
      message:
        "Are you sure you want to delete this policy? This action cannot be undone.",
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!confirmed) return;

    try {
      await removePolicy({
        userId: user.id as Id<"users">,
        policyId,
      });
      router.push("/compliance/policies");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to delete policy";
      await alertDialog({ title: "Error", message });
    }
  };

  // -- Loading --
  if (policy === undefined) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header currentPage="compliance" />
        <div className="flex items-center justify-center h-96">
          <div
            className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-600"
            role="status"
            aria-label="Loading policy details"
          />
        </div>
      </div>
    );
  }

  // -- Not found --
  if (policy === null) {
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
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
              />
            </svg>
            <p className="text-gray-400 mb-4">Policy not found</p>
            <Link
              href="/compliance/policies"
              className="inline-block px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
            >
              Back to Policies
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const reviewStatus = getReviewStatus(policy.reviewDueDate);

  // =========================================================================
  // RENDER
  // =========================================================================
  return (
    <div className="min-h-screen bg-gray-900">
      <Header currentPage="compliance" />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ── Breadcrumb ──────────────────────────────────────────────── */}
        <Link
          href="/compliance/policies"
          className="text-teal-500 hover:text-teal-400 text-sm mb-2 inline-block focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 rounded"
        >
          &larr; Back to Policies
        </Link>

        {/* ── Header row ──────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">
              {isEditing ? "Edit Policy" : policy.title}
            </h1>
            {!isEditing && (
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <StatusBadge status={policy.status} />
                <CategoryBadge category={policy.category} />
                {policy.version && (
                  <span className="text-gray-400 text-sm">
                    v{policy.version}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Action buttons (read mode only) */}
          {!isEditing && canEdit && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleStartEdit}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
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
                    d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"
                  />
                </svg>
                Edit
              </button>

              {canDelete && (
                <button
                  onClick={handleDelete}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 text-sm rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
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
                  Delete
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Status quick-action buttons (read mode) ─────────────────── */}
        {!isEditing && canEdit && (
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <span className="text-sm text-gray-400 mr-1">Set status:</span>
            {(
              ["draft", "active", "under_review", "archived"] as const
            ).map((s) => {
              const isCurrentStatus = policy.status === s;
              const config = STATUS_CONFIG[s];
              return (
                <button
                  key={s}
                  onClick={() => handleStatusChange(s)}
                  disabled={isCurrentStatus}
                  className={`px-3 py-1.5 text-xs rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
                    isCurrentStatus
                      ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                      : "bg-gray-700 hover:bg-gray-600 text-white"
                  }`}
                  aria-label={`Set status to ${config.label}`}
                >
                  {config.label}
                </button>
              );
            })}
          </div>
        )}

        {/* ── Error banner ────────────────────────────────────────────── */}
        {error && (
          <div
            className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg mb-6"
            role="alert"
          >
            {error}
          </div>
        )}

        {/* ── Review overdue warning ──────────────────────────────────── */}
        {!isEditing && reviewStatus === "overdue" && (
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
                Review is overdue
              </p>
              <p className="text-gray-400 text-sm mt-0.5">
                This policy was due for review on{" "}
                {formatDate(policy.reviewDueDate)}. Please review and update
                as required.
              </p>
            </div>
          </div>
        )}

        {!isEditing && reviewStatus === "soon" && (
          <div className="rounded-lg p-4 mb-6 flex items-center gap-3 bg-yellow-900/30 border border-yellow-600/50">
            <svg
              className="w-5 h-5 flex-shrink-0 text-yellow-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <p className="font-medium text-yellow-400">
                Review due soon
              </p>
              <p className="text-gray-400 text-sm mt-0.5">
                This policy is due for review on{" "}
                {formatDate(policy.reviewDueDate)}.
              </p>
            </div>
          </div>
        )}

        {/* ================================================================
         * EDIT MODE
         * ================================================================ */}
        {isEditing ? (
          <div className="space-y-6">
            {/* Policy details edit form */}
            <section className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h2 className="text-lg font-semibold text-white mb-4">
                Policy Details
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label
                    htmlFor="edit-title"
                    className="block text-sm font-medium text-gray-300 mb-1"
                  >
                    Title *
                  </label>
                  <input
                    id="edit-title"
                    type="text"
                    value={editForm.title}
                    onChange={(e) =>
                      setEditForm({ ...editForm, title: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors"
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="edit-category"
                    className="block text-sm font-medium text-gray-300 mb-1"
                  >
                    Category
                  </label>
                  <select
                    id="edit-category"
                    value={editForm.category}
                    onChange={(e) =>
                      setEditForm({ ...editForm, category: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors"
                  >
                    <option value="">Select category</option>
                    {CATEGORY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="edit-version"
                    className="block text-sm font-medium text-gray-300 mb-1"
                  >
                    Version
                  </label>
                  <input
                    id="edit-version"
                    type="text"
                    value={editForm.version}
                    onChange={(e) =>
                      setEditForm({ ...editForm, version: e.target.value })
                    }
                    placeholder="e.g. 1.0"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors"
                  />
                </div>
                <div>
                  <label
                    htmlFor="edit-effectiveDate"
                    className="block text-sm font-medium text-gray-300 mb-1"
                  >
                    Effective Date
                  </label>
                  <input
                    id="edit-effectiveDate"
                    type="date"
                    value={editForm.effectiveDate}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        effectiveDate: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors"
                  />
                </div>
                <div>
                  <label
                    htmlFor="edit-reviewDueDate"
                    className="block text-sm font-medium text-gray-300 mb-1"
                  >
                    Review Due Date
                  </label>
                  <input
                    id="edit-reviewDueDate"
                    type="date"
                    value={editForm.reviewDueDate}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        reviewDueDate: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label
                    htmlFor="edit-description"
                    className="block text-sm font-medium text-gray-300 mb-1"
                  >
                    Description
                  </label>
                  <textarea
                    id="edit-description"
                    value={editForm.description}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        description: e.target.value,
                      })
                    }
                    rows={4}
                    placeholder="Brief summary of this policy..."
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label
                    htmlFor="edit-notes"
                    className="block text-sm font-medium text-gray-300 mb-1"
                  >
                    Notes
                  </label>
                  <textarea
                    id="edit-notes"
                    value={editForm.notes}
                    onChange={(e) =>
                      setEditForm({ ...editForm, notes: e.target.value })
                    }
                    rows={3}
                    placeholder="Internal notes about this policy..."
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors"
                  />
                </div>
              </div>
            </section>

            {/* Document upload in edit mode */}
            <section className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h2 className="text-lg font-semibold text-white mb-4">
                Document
              </h2>
              {policy.documentFileName && (
                <div className="flex items-center gap-3 mb-4 px-4 py-3 bg-gray-700/50 rounded-lg border border-gray-600/50">
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
                  <span className="text-sm text-white truncate">
                    {policy.documentFileName}
                  </span>
                  <span className="text-xs text-gray-400">(current)</span>
                </div>
              )}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
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
                      d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                    />
                  </svg>
                  {isUploading
                    ? "Uploading..."
                    : policy.documentFileName
                      ? "Replace Document"
                      : "Upload Document"}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                  onChange={handleFileUpload}
                  className="hidden"
                  aria-label="Select policy document to upload"
                />
                <span className="text-xs text-gray-400">
                  PDF, Word, Excel, or image files
                </span>
              </div>
            </section>

            {/* Save / Cancel buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
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
          /* ================================================================
           * READ MODE - Full-width content-focused layout
           * ================================================================ */
          <div className="space-y-6">
            {/* ── Policy Information Bar ──────────────────────────────── */}
            <section
              className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden"
              aria-labelledby="section-info"
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-x divide-gray-700">
                <div className="p-4">
                  <p className="text-xs text-gray-400 mb-1 uppercase tracking-wider">Status</p>
                  <StatusBadge status={policy.status} />
                </div>
                <div className="p-4">
                  <p className="text-xs text-gray-400 mb-1 uppercase tracking-wider">Category</p>
                  <CategoryBadge category={policy.category} />
                </div>
                <div className="p-4">
                  <p className="text-xs text-gray-400 mb-1 uppercase tracking-wider">Version</p>
                  <p className="text-sm text-white font-medium">
                    {policy.version ? `v${policy.version}` : "-"}
                  </p>
                </div>
                <div className="p-4">
                  <p className="text-xs text-gray-400 mb-1 uppercase tracking-wider">Effective</p>
                  <p className="text-sm text-white">
                    {policy.effectiveDate ? formatDate(policy.effectiveDate) : "-"}
                  </p>
                </div>
                <div className="p-4">
                  <p className="text-xs text-gray-400 mb-1 uppercase tracking-wider">Review Due</p>
                  <p className={`text-sm font-medium ${
                    reviewStatus === "overdue"
                      ? "text-red-400"
                      : reviewStatus === "soon"
                        ? "text-yellow-400"
                        : "text-white"
                  }`}>
                    {policy.reviewDueDate ? formatDate(policy.reviewDueDate) : "-"}
                    {reviewStatus === "overdue" && <span className="ml-1 text-xs">(overdue)</span>}
                    {reviewStatus === "soon" && <span className="ml-1 text-xs">(due soon)</span>}
                  </p>
                </div>
                <div className="p-4">
                  <p className="text-xs text-gray-400 mb-1 uppercase tracking-wider">Updated</p>
                  <p className="text-sm text-white">
                    {new Date(policy.updatedAt).toLocaleDateString("en-AU", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
            </section>

            {/* ── Purpose / Description ───────────────────────────────── */}
            <section
              className="bg-gray-800 rounded-lg p-6 border border-gray-700"
              aria-labelledby="section-description"
            >
              <h2
                id="section-description"
                className="text-lg font-semibold text-white mb-3 flex items-center gap-2"
              >
                <svg className="w-5 h-5 text-teal-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                </svg>
                Purpose & Overview
              </h2>
              {policy.description ? (
                <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {policy.description}
                </p>
              ) : (
                <p className="text-gray-400 italic">No description has been added to this policy.</p>
              )}
            </section>

            {/* ── Full Policy Content ─────────────────────────────────── */}
            {policy.content && (
              <section
                className="bg-gray-800 rounded-lg border border-gray-700"
                aria-labelledby="section-content"
              >
                <div className="p-6 border-b border-gray-700">
                  <h2
                    id="section-content"
                    className="text-lg font-semibold text-white flex items-center gap-2"
                  >
                    <svg className="w-5 h-5 text-teal-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                    Policy Content
                  </h2>
                </div>
                <div className="p-6 max-h-[600px] overflow-y-auto">
                  <div className="prose prose-invert prose-sm max-w-none">
                    {policy.content.split("\n").map((line, i) => {
                      const trimmed = line.trim();
                      if (!trimmed) return <div key={i} className="h-3" />;
                      // Detect headings (ALL CAPS lines or lines ending with colon)
                      if (
                        (trimmed === trimmed.toUpperCase() && trimmed.length > 3 && trimmed.length < 80 && /[A-Z]/.test(trimmed)) ||
                        (trimmed.match(/^\d+\.\s+[A-Z]/) && trimmed.length < 80)
                      ) {
                        return (
                          <h3 key={i} className="text-white font-semibold mt-5 mb-2 text-sm uppercase tracking-wide">
                            {trimmed}
                          </h3>
                        );
                      }
                      // Detect sub-headings (numbered items like "1.1", "2.3")
                      if (trimmed.match(/^\d+\.\d+\s/)) {
                        return (
                          <h4 key={i} className="text-gray-200 font-medium mt-3 mb-1 text-sm">
                            {trimmed}
                          </h4>
                        );
                      }
                      // Detect bullet points
                      if (trimmed.startsWith("- ") || trimmed.startsWith("* ") || trimmed.match(/^[a-z]\)\s/) || trimmed.match(/^[ivx]+\)\s/)) {
                        return (
                          <li key={i} className="text-gray-300 text-sm ml-4 list-disc mb-1">
                            {trimmed.replace(/^[-*]\s/, "").replace(/^[a-z]\)\s/, "").replace(/^[ivx]+\)\s/, "")}
                          </li>
                        );
                      }
                      return (
                        <p key={i} className="text-gray-300 text-sm leading-relaxed mb-2">
                          {trimmed}
                        </p>
                      );
                    })}
                  </div>
                </div>
              </section>
            )}

            {/* ── Internal Notes ──────────────────────────────────────── */}
            {policy.notes && (
              <section
                className="bg-gray-800 rounded-lg p-6 border border-gray-700"
                aria-labelledby="section-notes"
              >
                <h2
                  id="section-notes"
                  className="text-lg font-semibold text-white mb-3 flex items-center gap-2"
                >
                  <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                  </svg>
                  Internal Notes
                </h2>
                <div className="bg-gray-700/30 rounded-lg p-4 border border-gray-600/30">
                  <p className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">
                    {policy.notes}
                  </p>
                </div>
              </section>
            )}

            {/* ── Document Download ───────────────────────────────────── */}
            <section
              className="bg-gray-800 rounded-lg p-6 border border-gray-700"
              aria-labelledby="section-document"
            >
              <h2
                id="section-document"
                className="text-lg font-semibold text-white mb-4 flex items-center gap-2"
              >
                <svg className="w-5 h-5 text-teal-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Document Download
              </h2>
              {policy.documentFileName && policy.documentUrl ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 py-4 bg-gray-700/40 rounded-lg border border-gray-600/40">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-teal-600/20 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-teal-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-white font-medium truncate">
                        {policy.documentFileName}
                      </p>
                      <p className="text-xs text-gray-400">
                        Word Document (.docx)
                      </p>
                    </div>
                  </div>
                  <a
                    href={policy.documentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 flex-shrink-0"
                    aria-label={`Download ${policy.documentFileName}`}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    Download Document
                  </a>
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-700/20 rounded-lg border border-dashed border-gray-600">
                  <svg className="w-10 h-10 mx-auto text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  <p className="text-gray-400 text-sm">No document attached</p>
                  <p className="text-gray-400 text-xs mt-1">Click Edit to upload a policy document</p>
                </div>
              )}
            </section>

            {/* ── Document Metadata Footer ────────────────────────────── */}
            <div className="flex flex-wrap items-center justify-between gap-4 px-1 text-xs text-gray-400">
              <div className="flex items-center gap-4">
                <span>
                  Created: {new Date(policy.createdAt).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                </span>
                <span>
                  Last Updated: {new Date(policy.updatedAt).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              </div>
              <span>
                Document ID: {policy._id}
              </span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// BLS Gate - restrict to Better Living Solutions organisation only
// ---------------------------------------------------------------------------

function BlsGate({ children }: { children: React.ReactNode }) {
  const { organization, isLoading } = useOrganization();
  if (isLoading) return null;
  if (organization?.slug !== "better-living-solutions") {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header currentPage="compliance" />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-24">
            <h1 className="text-2xl font-bold text-white mb-2">
              Policy Details
            </h1>
            <p className="text-gray-400">
              This feature is not available for your organisation.
            </p>
          </div>
        </main>
      </div>
    );
  }
  return <>{children}</>;
}

// ---------------------------------------------------------------------------
// Page export with auth + BLS gate wrappers
// ---------------------------------------------------------------------------

export default function PolicyDetailPage() {
  return (
    <RequireAuth>
      <BlsGate>
        <PolicyDetailContent />
      </BlsGate>
    </RequireAuth>
  );
}
