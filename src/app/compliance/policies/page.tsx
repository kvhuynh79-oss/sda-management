"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { useSearchParams } from "next/navigation";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import Link from "next/link";
import Header from "@/components/Header";
import { RequireAuth } from "@/components/RequireAuth";
import { LoadingScreen, StatCard } from "@/components/ui";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useOrganization } from "@/contexts/OrganizationContext";
import { formatDate } from "@/utils/format";

// ── Constants ────────────────────────────────────────────────────────────────

type PolicyStatus = "draft" | "active" | "under_review" | "archived";

const STATUS_BADGE_COLORS: Record<PolicyStatus, string> = {
  active: "bg-green-500/20 text-green-400",
  draft: "bg-gray-500/20 text-gray-400",
  under_review: "bg-yellow-500/20 text-yellow-400",
  archived: "bg-purple-500/20 text-purple-400",
};

const STATUS_LABELS: Record<PolicyStatus, string> = {
  active: "Active",
  draft: "Draft",
  under_review: "Under Review",
  archived: "Archived",
};

// ── Types ────────────────────────────────────────────────────────────────────

interface Policy {
  _id: Id<"policies">;
  title: string;
  description?: string;
  category: string;
  documentStorageId?: Id<"_storage">;
  documentFileName?: string;
  version?: string;
  effectiveDate?: string;
  reviewDueDate?: string;
  status: PolicyStatus;
  notes?: string;
  summary?: string;
  isActive: boolean;
  createdBy: Id<"users">;
  createdAt: number;
  updatedAt: number;
}

interface PolicyFormData {
  title: string;
  category: string;
  description: string;
  version: string;
  effectiveDate: string;
  reviewDueDate: string;
  status: "draft" | "active";
  notes: string;
}

const EMPTY_FORM: PolicyFormData = {
  title: "",
  category: "",
  description: "",
  version: "1.0",
  effectiveDate: "",
  reviewDueDate: "",
  status: "draft",
  notes: "",
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function getReviewDateColor(reviewDueDate?: string): string {
  if (!reviewDueDate) return "text-gray-400";
  const now = new Date();
  const dueDate = new Date(reviewDueDate);
  const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  if (dueDate < now) return "text-red-400";
  if (dueDate <= thirtyDays) return "text-yellow-400";
  return "text-gray-400";
}

function getReviewDateLabel(reviewDueDate?: string): string {
  if (!reviewDueDate) return "";
  const now = new Date();
  const dueDate = new Date(reviewDueDate);
  if (dueDate < now) return "Overdue";
  const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  if (dueDate <= thirtyDays) return "Due soon";
  return "";
}

// ── Policy Row Component ─────────────────────────────────────────────────────

function PolicyRow({ policy }: { policy: Policy }) {
  const statusBadge =
    STATUS_BADGE_COLORS[policy.status] || "bg-gray-500/20 text-gray-400";
  const statusLabel =
    STATUS_LABELS[policy.status] || policy.status.replace(/_/g, " ");
  const reviewColor = getReviewDateColor(policy.reviewDueDate);
  const reviewLabel = getReviewDateLabel(policy.reviewDueDate);

  return (
    <Link
      href={`/compliance/policies/${policy._id}`}
      className="block bg-gray-800 border border-gray-700 rounded-lg px-5 py-4 hover:bg-gray-700/80 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
      role="article"
      aria-label={`Policy: ${policy.title}`}
    >
      {/* Top section: Title, badges, meta */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
        {/* Title and description (takes up remaining space) */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-white font-semibold group-hover:text-teal-400 transition-colors">
              {policy.title}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-teal-500/20 text-teal-400">
              {policy.category}
            </span>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge}`}
            >
              {statusLabel}
            </span>
          </div>

          {/* Description - full text, never truncated */}
          {policy.description && (
            <p className="text-sm text-gray-400 mt-1">{policy.description}</p>
          )}
        </div>

        {/* Meta info column (right side on desktop) */}
        <div className="flex flex-wrap sm:flex-col items-start sm:items-end gap-2 sm:gap-1.5 flex-shrink-0 sm:min-w-[180px]">
          {/* Version */}
          {policy.version && (
            <span className="text-sm text-gray-300">v{policy.version}</span>
          )}

          {/* Review due date */}
          {policy.reviewDueDate && (
            <div className="flex items-center gap-1.5 text-sm">
              <svg
                className={`w-3.5 h-3.5 ${reviewColor} flex-shrink-0`}
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
                />
              </svg>
              <span className={reviewColor}>
                {formatDate(policy.reviewDueDate)}
              </span>
              {reviewLabel && (
                <span
                  className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                    reviewLabel === "Overdue"
                      ? "bg-red-500/20 text-red-400"
                      : "bg-yellow-500/20 text-yellow-400"
                  }`}
                >
                  {reviewLabel}
                </span>
              )}
            </div>
          )}

          {/* Document attached indicator */}
          {policy.documentStorageId ? (
            <div className="flex items-center gap-1.5 text-sm text-teal-400">
              <svg
                className="w-3.5 h-3.5 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                />
              </svg>
              <span>{policy.documentFileName || "Document attached"}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-sm text-gray-400">
              <svg
                className="w-3.5 h-3.5 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                />
              </svg>
              <span>No document</span>
            </div>
          )}

          {/* AI Summary indicator */}
          {policy.summary && (
            <div className="flex items-center gap-1.5 text-sm text-teal-400">
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              <span>AI Summary</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

// ── Add Policy Modal ─────────────────────────────────────────────────────────

function AddPolicyModal({
  onClose,
  userId,
  existingCategories,
}: {
  onClose: () => void;
  userId: string;
  existingCategories: string[];
}) {
  const [form, setForm] = useState<PolicyFormData>({ ...EMPTY_FORM });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof PolicyFormData, string>>>({});
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const createPolicy = useMutation(api.policies.create);
  const generateUploadUrl = useMutation(api.policies.generateUploadUrl);
  const { alert: alertDialog } = useConfirmDialog();
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Focus trap and Escape key
  useEffect(() => {
    closeButtonRef.current?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "Tab" && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  function updateField<K extends keyof PolicyFormData>(key: K, value: PolicyFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  }

  function validate(): boolean {
    const newErrors: Partial<Record<keyof PolicyFormData, string>> = {};
    if (!form.title.trim()) newErrors.title = "Title is required";
    if (!form.category.trim()) newErrors.category = "Category is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setUploadFile(file);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0] ?? null;
    if (file) setUploadFile(file);
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      let storageId: Id<"_storage"> | undefined;
      let fileName: string | undefined;

      // Upload file if one is selected
      if (uploadFile) {
        setIsUploading(true);
        const uploadUrl = await generateUploadUrl();
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": uploadFile.type },
          body: uploadFile,
        });
        if (!result.ok) {
          throw new Error("File upload failed");
        }
        const json = await result.json();
        storageId = json.storageId as Id<"_storage">;
        fileName = uploadFile.name;
        setIsUploading(false);
      }

      await createPolicy({
        userId: userId as Id<"users">,
        title: form.title.trim(),
        category: form.category.trim(),
        description: form.description.trim() || undefined,
        documentStorageId: storageId,
        documentFileName: fileName,
        version: form.version.trim() || "1.0",
        effectiveDate: form.effectiveDate || undefined,
        reviewDueDate: form.reviewDueDate || undefined,
        status: form.status,
        notes: form.notes.trim() || undefined,
      });

      onClose();
    } catch (err) {
      setIsUploading(false);
      await alertDialog({
        title: "Error",
        message:
          err instanceof Error
            ? err.message
            : "Failed to create policy. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const inputClass =
    "w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:border-teal-600 transition-colors";
  const labelClass = "block text-sm font-medium text-gray-300 mb-1";
  const errorClass = "text-red-400 text-xs mt-1";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-policy-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl"
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 sticky top-0 bg-gray-800 z-10">
          <h2 id="add-policy-title" className="text-lg font-semibold text-white">
            Add Policy
          </h2>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white transition-colors rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
            aria-label="Close modal"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-6" noValidate>
          {/* Policy Details */}
          <fieldset>
            <legend className="text-sm font-semibold text-white uppercase tracking-wide mb-3">
              Policy Details
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Title */}
              <div className="sm:col-span-2">
                <label htmlFor="pf-title" className={labelClass}>
                  Title <span className="text-red-400">*</span>
                </label>
                <input
                  id="pf-title"
                  type="text"
                  value={form.title}
                  onChange={(e) => updateField("title", e.target.value)}
                  className={inputClass}
                  placeholder="e.g. Incident Reporting Policy"
                  autoComplete="off"
                  required
                  aria-invalid={!!errors.title}
                  aria-describedby={errors.title ? "err-title" : undefined}
                />
                {errors.title && (
                  <p id="err-title" className={errorClass} role="alert">
                    {errors.title}
                  </p>
                )}
              </div>

              {/* Category */}
              <div>
                <label htmlFor="pf-category" className={labelClass}>
                  Category <span className="text-red-400">*</span>
                </label>
                <input
                  id="pf-category"
                  type="text"
                  list="pf-category-list"
                  value={form.category}
                  onChange={(e) => updateField("category", e.target.value)}
                  className={inputClass}
                  placeholder="e.g. Governance, Safety, HR"
                  autoComplete="off"
                  required
                  aria-invalid={!!errors.category}
                  aria-describedby={errors.category ? "err-category" : undefined}
                />
                <datalist id="pf-category-list">
                  {existingCategories.map((cat) => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
                {errors.category && (
                  <p id="err-category" className={errorClass} role="alert">
                    {errors.category}
                  </p>
                )}
              </div>

              {/* Version */}
              <div>
                <label htmlFor="pf-version" className={labelClass}>
                  Version
                </label>
                <input
                  id="pf-version"
                  type="text"
                  value={form.version}
                  onChange={(e) => updateField("version", e.target.value)}
                  className={inputClass}
                  placeholder="1.0"
                  autoComplete="off"
                />
              </div>

              {/* Effective Date */}
              <div>
                <label htmlFor="pf-effectiveDate" className={labelClass}>
                  Effective Date
                </label>
                <input
                  id="pf-effectiveDate"
                  type="date"
                  value={form.effectiveDate}
                  onChange={(e) => updateField("effectiveDate", e.target.value)}
                  className={inputClass}
                />
              </div>

              {/* Review Due Date */}
              <div>
                <label htmlFor="pf-reviewDueDate" className={labelClass}>
                  Review Due Date
                </label>
                <input
                  id="pf-reviewDueDate"
                  type="date"
                  value={form.reviewDueDate}
                  onChange={(e) => updateField("reviewDueDate", e.target.value)}
                  className={inputClass}
                />
              </div>

              {/* Status */}
              <div className="sm:col-span-2">
                <label htmlFor="pf-status" className={labelClass}>
                  Status
                </label>
                <select
                  id="pf-status"
                  value={form.status}
                  onChange={(e) =>
                    updateField("status", e.target.value as "draft" | "active")
                  }
                  className={inputClass}
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                </select>
              </div>

              {/* Description */}
              <div className="sm:col-span-2">
                <label htmlFor="pf-description" className={labelClass}>
                  Description
                </label>
                <textarea
                  id="pf-description"
                  value={form.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  className={`${inputClass} resize-y`}
                  rows={3}
                  placeholder="Brief description of the policy..."
                />
              </div>
            </div>
          </fieldset>

          {/* File Upload */}
          <fieldset>
            <legend className="text-sm font-semibold text-white uppercase tracking-wide mb-3">
              Document Upload
            </legend>
            <div
              className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center hover:border-teal-600/50 transition-colors"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              {uploadFile ? (
                <div className="space-y-2">
                  <svg
                    className="w-8 h-8 mx-auto text-teal-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M10.125 2.25h-4.5c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M10.125 2.25A2.625 2.625 0 0112.75 4.875v4.5h4.5"
                    />
                  </svg>
                  <p className="text-sm text-white font-medium">{uploadFile.name}</p>
                  <p className="text-xs text-gray-400">
                    {(uploadFile.size / 1024).toFixed(1)} KB
                  </p>
                  <button
                    type="button"
                    onClick={() => setUploadFile(null)}
                    className="text-sm text-red-400 hover:text-red-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded"
                  >
                    Remove file
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <svg
                    className="w-8 h-8 mx-auto text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                    />
                  </svg>
                  <p className="text-sm text-gray-400">
                    Drag and drop a file here, or{" "}
                    <label
                      htmlFor="pf-file-upload"
                      className="text-teal-400 hover:text-teal-300 cursor-pointer underline"
                    >
                      browse
                    </label>
                  </p>
                  <p className="text-xs text-gray-400">PDF, Word, images accepted</p>
                  <input
                    id="pf-file-upload"
                    type="file"
                    className="sr-only"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
                    onChange={handleFileChange}
                    aria-label="Upload policy document"
                  />
                </div>
              )}
            </div>
          </fieldset>

          {/* Notes */}
          <div>
            <label htmlFor="pf-notes" className={labelClass}>
              Notes
            </label>
            <textarea
              id="pf-notes"
              value={form.notes}
              onChange={(e) => updateField("notes", e.target.value)}
              className={`${inputClass} resize-y`}
              rows={2}
              placeholder="Any additional notes..."
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isUploading}
              className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-800"
            >
              {isUploading
                ? "Uploading..."
                : isSubmitting
                  ? "Creating..."
                  : "Create Policy"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Content ─────────────────────────────────────────────────────────────

function PoliciesContent() {
  const { confirm: confirmDialog, alert: alertDialog } = useConfirmDialog();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<{ id: string; role: string; name: string } | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState(() => {
    const urlCategory = searchParams.get("category");
    return urlCategory || "all";
  });
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [groupByCategory, setGroupByCategory] = useState(true);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  const generateAllAction = useAction(api.policies.generateAllSummaries);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);

  const handleGenerateAll = async () => {
    if (!user) return;
    const confirmed = await confirmDialog({
      title: "Generate All Summaries",
      message: "This will generate AI summaries for all policies that don't have one yet. This may take a few minutes. Continue?",
      confirmLabel: "Generate",
    });
    if (!confirmed) return;

    setIsGeneratingAll(true);
    try {
      const result = await generateAllAction({
        userId: user.id as Id<"users">,
      });
      await alertDialog({
        title: "Summaries Generated",
        message: `Generated ${result.generated} summaries.${result.failed > 0 ? ` Failed: ${result.failed}. Errors: ${result.errors.join("; ")}` : ""}`,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to generate summaries";
      await alertDialog({ title: "Error", message });
    } finally {
      setIsGeneratingAll(false);
    }
  };

  useEffect(() => {
    const stored = localStorage.getItem("sda_user");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        // Invalid data
      }
    }
  }, []);

  const policies = useQuery(
    api.policies.getAll,
    user ? { userId: user.id as Id<"users"> } : "skip"
  ) as Policy[] | undefined;

  const stats = useQuery(
    api.policies.getStats,
    user ? { userId: user.id as Id<"users"> } : "skip"
  ) as
    | {
        total: number;
        active: number;
        draft: number;
        archived: number;
        overdueReview: number;
        reviewingSoon: number;
      }
    | undefined;

  const categories = useQuery(
    api.policies.getCategories,
    user ? { userId: user.id as Id<"users"> } : "skip"
  ) as string[] | undefined;

  // Client-side filtering
  const filtered = useMemo(() => {
    if (!policies) return [];
    return policies.filter((p) => {
      const matchesSearch =
        !search ||
        p.title.toLowerCase().includes(search.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(search.toLowerCase()));

      const matchesCategory =
        categoryFilter === "all" || p.category === categoryFilter;

      const matchesStatus =
        statusFilter === "all" || p.status === statusFilter;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [policies, search, categoryFilter, statusFilter]);

  // Group policies by category
  const groupedPolicies = useMemo(() => {
    if (!groupByCategory) return null;
    const groups: Record<string, Policy[]> = {};
    for (const policy of filtered) {
      const cat = policy.category || "Uncategorised";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(policy);
    }
    // Sort category names alphabetically
    const sorted = Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
    return sorted;
  }, [filtered, groupByCategory]);

  function toggleCategory(category: string) {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }

  const hasFilters =
    search !== "" || categoryFilter !== "all" || statusFilter !== "all";

  const dueForReviewCount = (stats?.overdueReview ?? 0) + (stats?.reviewingSoon ?? 0);

  // Loading state
  if (!user || policies === undefined) {
    return <LoadingScreen message="Loading policies..." />;
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Header currentPage="compliance" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
          <div>
            <Link
              href="/compliance"
              className="text-teal-500 hover:text-teal-400 text-sm mb-2 inline-block focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 rounded"
            >
              &larr; Back to Compliance Dashboard
            </Link>
            <h1 className="text-xl sm:text-2xl font-bold text-white">
              Policies & Procedures
            </h1>
            <p className="text-gray-400 mt-1 text-sm sm:text-base">
              Manage organisational policies, procedures and compliance documents
            </p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0 self-start sm:self-auto">
            {(user.role === "admin" || user.role === "property_manager") && (
              <button
                onClick={handleGenerateAll}
                disabled={isGeneratingAll}
                className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                aria-label="Generate AI summaries for all policies"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
                {isGeneratingAll ? "Generating..." : "Generate All Summaries"}
              </button>
            )}
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
              aria-label="Add a new policy"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add Policy
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div
          className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8"
          role="region"
          aria-label="Policy statistics"
        >
          <StatCard title="Total Policies" value={stats?.total ?? policies.length} color="blue" />
          <StatCard
            title="Active"
            value={stats?.active ?? policies.filter((p) => p.status === "active").length}
            color="green"
          />
          <StatCard
            title="Due for Review"
            value={dueForReviewCount}
            color={dueForReviewCount > 0 ? "red" : "yellow"}
          />
          <StatCard
            title="Archived"
            value={stats?.archived ?? policies.filter((p) => p.status === "archived").length}
            color="gray"
          />
        </div>

        {/* Filters */}
        <div
          className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6"
          role="search"
          aria-label="Filter policies"
        >
          {/* Search */}
          <div>
            <label htmlFor="policy-search" className="sr-only">
              Search policies
            </label>
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                />
              </svg>
              <input
                id="policy-search"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by title or description..."
                className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:border-teal-600 transition-colors"
              />
            </div>
          </div>

          {/* Category filter */}
          <div>
            <label htmlFor="policy-category-filter" className="sr-only">
              Filter by category
            </label>
            <select
              id="policy-category-filter"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:border-teal-600 transition-colors"
            >
              <option value="all">All Categories</option>
              {categories?.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Status filter */}
          <div>
            <label htmlFor="policy-status-filter" className="sr-only">
              Filter by status
            </label>
            <select
              id="policy-status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:border-teal-600 transition-colors"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="under_review">Under Review</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          {/* Group by category toggle */}
          <div className="flex items-center">
            <button
              onClick={() => setGroupByCategory((prev) => !prev)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 text-sm font-medium w-full justify-center ${
                groupByCategory
                  ? "bg-teal-600/20 border-teal-600 text-teal-400"
                  : "bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"
              }`}
              aria-pressed={groupByCategory}
              aria-label="Group policies by category"
            >
              {/* Folder/stack icon */}
              <svg
                className="w-4 h-4 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"
                />
              </svg>
              Group by Category
            </button>
          </div>
        </div>

        {/* Clear filters */}
        {hasFilters && (
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm text-gray-400">
              Showing {filtered.length} of {policies.length} policies
            </span>
            <button
              onClick={() => {
                setSearch("");
                setCategoryFilter("all");
                setStatusFilter("all");
              }}
              className="text-sm text-teal-400 hover:text-teal-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 rounded"
            >
              Clear filters
            </button>
          </div>
        )}

        {/* Policy List */}
        {policies.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-12 text-center border border-gray-700">
            <svg
              className="w-12 h-12 mx-auto text-gray-400 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
              />
            </svg>
            <p className="text-white font-medium mb-2">No Policies Yet</p>
            <p className="text-gray-400 mb-4">
              Add your first policy to start managing organisational compliance documents.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add First Policy
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-12 text-center border border-gray-700">
            <svg
              className="w-12 h-12 mx-auto text-gray-400 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
            <p className="text-white font-medium mb-2">No Matching Policies</p>
            <p className="text-gray-400 mb-4">
              No policies match your current filters.
            </p>
            <button
              onClick={() => {
                setSearch("");
                setCategoryFilter("all");
                setStatusFilter("all");
              }}
              className="text-sm text-teal-400 hover:text-teal-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 rounded"
            >
              Clear Filters
            </button>
          </div>
        ) : groupByCategory && groupedPolicies ? (
          /* Grouped by category view */
          <div className="space-y-6" role="list" aria-label="Policies grouped by category">
            {groupedPolicies.map(([category, categoryPolicies]) => {
              const isCollapsed = collapsedCategories.has(category);
              return (
                <section
                  key={category}
                  role="listitem"
                  aria-label={`${category} category - ${categoryPolicies.length} ${categoryPolicies.length === 1 ? "policy" : "policies"}`}
                >
                  {/* Category header */}
                  <button
                    onClick={() => toggleCategory(category)}
                    className="flex items-center gap-3 w-full text-left mb-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 rounded-lg px-2 py-1 -mx-2"
                    aria-expanded={!isCollapsed}
                    aria-controls={`cat-${category.replace(/\s+/g, "-").toLowerCase()}`}
                  >
                    {/* Chevron */}
                    <svg
                      className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${
                        isCollapsed ? "" : "rotate-90"
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                    <h2 className="text-base font-semibold text-white group-hover:text-teal-400 transition-colors">
                      {category}
                    </h2>
                    <span className="text-xs font-medium text-gray-400 bg-gray-700 px-2 py-0.5 rounded-full">
                      {categoryPolicies.length}
                    </span>
                    <div className="flex-1 border-t border-gray-700" aria-hidden="true" />
                  </button>

                  {/* Category policies */}
                  {!isCollapsed && (
                    <div
                      id={`cat-${category.replace(/\s+/g, "-").toLowerCase()}`}
                      className="space-y-2"
                      role="list"
                      aria-label={`${category} policies`}
                    >
                      {categoryPolicies.map((policy) => (
                        <div key={policy._id} role="listitem">
                          <PolicyRow policy={policy} />
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        ) : (
          /* Flat list view */
          <div className="space-y-2" role="list" aria-label="Policies list">
            {filtered.map((policy) => (
              <div key={policy._id} role="listitem">
                <PolicyRow policy={policy} />
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Add Policy Modal */}
      {showAddModal && user && (
        <AddPolicyModal
          onClose={() => setShowAddModal(false)}
          userId={user.id}
          existingCategories={categories ?? []}
        />
      )}
    </div>
  );
}

// ── BLS Gate ─────────────────────────────────────────────────────────────────

function BlsGate({ children }: { children: React.ReactNode }) {
  const { organization, isLoading } = useOrganization();
  if (isLoading) return null;
  if (organization?.slug !== "better-living-solutions") {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header currentPage="compliance" />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-24">
            <h1 className="text-2xl font-bold text-white mb-2">Policies & Procedures</h1>
            <p className="text-gray-400">This feature is not available for your organisation.</p>
          </div>
        </main>
      </div>
    );
  }
  return <>{children}</>;
}

// ── Exported Page ────────────────────────────────────────────────────────────

export default function PoliciesPage() {
  return (
    <RequireAuth>
      <BlsGate>
        <PoliciesContent />
      </BlsGate>
    </RequireAuth>
  );
}
