"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ThreadPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (threadId: string) => void | Promise<void>;
  excludeThreadId?: string;
  userId: string;
}

type SdaCategory =
  | "improved_liveability"
  | "fully_accessible"
  | "robust"
  | "high_physical_support";

type Urgency = "low" | "medium" | "high" | "urgent";
type LeadSource = "phone" | "email" | "referral" | "website";

interface QuickLeadForm {
  participantName: string;
  referrerName: string;
  referrerEmail: string;
  sdaCategoryNeeded: SdaCategory | "";
  urgency: Urgency | "";
  source: LeadSource | "";
  notes: string;
}

const EMPTY_QUICK_FORM: QuickLeadForm = {
  participantName: "",
  referrerName: "",
  referrerEmail: "",
  sdaCategoryNeeded: "",
  urgency: "medium",
  source: "email",
  notes: "",
};

const SDA_OPTIONS: { value: SdaCategory; label: string }[] = [
  { value: "high_physical_support", label: "High Physical Support (HPS)" },
  { value: "robust", label: "Robust" },
  { value: "fully_accessible", label: "Fully Accessible (FA)" },
  { value: "improved_liveability", label: "Improved Liveability (IL)" },
];

const URGENCY_OPTIONS: { value: Urgency; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const SOURCE_OPTIONS: { value: LeadSource; label: string }[] = [
  { value: "phone", label: "Phone Call" },
  { value: "email", label: "Email" },
  { value: "referral", label: "Referral" },
  { value: "website", label: "Website" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ThreadPickerModal({
  isOpen,
  onClose,
  onSelect,
  excludeThreadId,
  userId,
}: ThreadPickerModalProps) {
  const [search, setSearch] = useState("");
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"threads" | "leads">("threads");

  // Quick-create lead state
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [quickForm, setQuickForm] = useState<QuickLeadForm>(EMPTY_QUICK_FORM);
  const [quickErrors, setQuickErrors] = useState<Record<string, string>>({});
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const quickCreateLead = useMutation(api.leads.quickCreate);

  const results = useQuery(
    api.communications.searchThreadsForPicker,
    isOpen
      ? {
          userId: userId as Id<"users">,
          search: search || undefined,
          excludeThreadId,
          includeLeads: true,
        }
      : "skip"
  );

  if (!isOpen) return null;

  const threads = results?.filter((r) => !r.isLead) || [];
  const leads = results?.filter((r) => r.isLead) || [];
  const displayItems = activeTab === "threads" ? threads : leads;

  const formatDate = (ts: number) => {
    if (!ts) return "";
    const d = new Date(ts);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
  };

  const handleSelect = () => {
    if (selectedThreadId) {
      onSelect(selectedThreadId);
      setSelectedThreadId(null);
      setSearch("");
    }
  };

  const handleClose = () => {
    setSelectedThreadId(null);
    setSearch("");
    setShowQuickCreate(false);
    setQuickForm(EMPTY_QUICK_FORM);
    setQuickErrors({});
    setCreateError(null);
    onClose();
  };

  const handleOpenQuickCreate = () => {
    setShowQuickCreate(true);
    setSelectedThreadId(null);
    setQuickErrors({});
    setCreateError(null);
  };

  const handleCancelQuickCreate = () => {
    setShowQuickCreate(false);
    setQuickForm(EMPTY_QUICK_FORM);
    setQuickErrors({});
    setCreateError(null);
  };

  const validateQuickForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!quickForm.participantName.trim()) {
      errors.participantName = "Required";
    }
    if (!quickForm.referrerName.trim()) {
      errors.referrerName = "Required";
    }
    if (!quickForm.sdaCategoryNeeded) {
      errors.sdaCategoryNeeded = "Required";
    }
    if (!quickForm.urgency) {
      errors.urgency = "Required";
    }
    if (!quickForm.source) {
      errors.source = "Required";
    }
    setQuickErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleQuickCreate = async () => {
    if (!validateQuickForm()) return;
    setIsCreating(true);
    setCreateError(null);
    try {
      const result = await quickCreateLead({
        userId: userId as Id<"users">,
        participantName: quickForm.participantName.trim(),
        referrerName: quickForm.referrerName.trim(),
        referrerEmail: quickForm.referrerEmail.trim() || undefined,
        sdaCategoryNeeded: quickForm.sdaCategoryNeeded as SdaCategory,
        urgency: quickForm.urgency as Urgency,
        source: quickForm.source as LeadSource,
        notes: quickForm.notes.trim() || undefined,
      });

      // Move the communication to the newly created lead's thread
      await onSelect(result.threadId);

      // Reset and close
      setShowQuickCreate(false);
      setQuickForm(EMPTY_QUICK_FORM);
      setQuickErrors({});
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to create lead";
      setCreateError(message);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-label="Select a thread or lead"
    >
      <div
        className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-3">
          <h2 className="text-lg font-semibold text-white mb-3">
            {showQuickCreate ? "Create New Lead" : "Link to Thread"}
          </h2>

          {!showQuickCreate && (
            <>
              {/* Tabs */}
              <div className="flex gap-1 mb-3 bg-gray-900 rounded-lg p-1">
                <button
                  onClick={() => setActiveTab("threads")}
                  className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    activeTab === "threads"
                      ? "bg-gray-700 text-white"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  Threads ({threads.length})
                </button>
                <button
                  onClick={() => setActiveTab("leads")}
                  className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    activeTab === "leads"
                      ? "bg-gray-700 text-white"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  Leads ({leads.length})
                </button>
              </div>

              {/* Search */}
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={
                  activeTab === "threads"
                    ? "Search by subject or contact..."
                    : "Search by participant or referrer..."
                }
                className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                autoFocus
              />
            </>
          )}
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto px-5 pb-2 min-h-0">
          {showQuickCreate ? (
            /* ----------------------------------------------------------- */
            /* Quick-create lead inline form                                */
            /* ----------------------------------------------------------- */
            <div className="space-y-3 pb-2">
              <p className="text-xs text-gray-400">
                Create a new lead and move this communication to it. You can add
                more details later from the Leads page.
              </p>

              {createError && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-900/30 border border-red-700 text-sm text-red-400">
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
                  {createError}
                </div>
              )}

              {/* Participant Name */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Participant Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={quickForm.participantName}
                  onChange={(e) =>
                    setQuickForm((p) => ({
                      ...p,
                      participantName: e.target.value,
                    }))
                  }
                  placeholder="Full name of participant"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  autoFocus
                />
                {quickErrors.participantName && (
                  <p className="mt-1 text-xs text-red-400">
                    {quickErrors.participantName}
                  </p>
                )}
              </div>

              {/* Referrer Name */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Referrer Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={quickForm.referrerName}
                  onChange={(e) =>
                    setQuickForm((p) => ({
                      ...p,
                      referrerName: e.target.value,
                    }))
                  }
                  placeholder="Who referred this lead"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
                {quickErrors.referrerName && (
                  <p className="mt-1 text-xs text-red-400">
                    {quickErrors.referrerName}
                  </p>
                )}
              </div>

              {/* Referrer Email (optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Referrer Email
                </label>
                <input
                  type="email"
                  value={quickForm.referrerEmail}
                  onChange={(e) =>
                    setQuickForm((p) => ({
                      ...p,
                      referrerEmail: e.target.value,
                    }))
                  }
                  placeholder="Optional"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  autoComplete="email"
                />
              </div>

              {/* SDA Category */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  SDA Category <span className="text-red-400">*</span>
                </label>
                <select
                  value={quickForm.sdaCategoryNeeded}
                  onChange={(e) =>
                    setQuickForm((p) => ({
                      ...p,
                      sdaCategoryNeeded: e.target.value as SdaCategory,
                    }))
                  }
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  <option value="">Select category...</option>
                  {SDA_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                {quickErrors.sdaCategoryNeeded && (
                  <p className="mt-1 text-xs text-red-400">
                    {quickErrors.sdaCategoryNeeded}
                  </p>
                )}
              </div>

              {/* Urgency + Source in one row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Urgency <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={quickForm.urgency}
                    onChange={(e) =>
                      setQuickForm((p) => ({
                        ...p,
                        urgency: e.target.value as Urgency,
                      }))
                    }
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  >
                    <option value="">Select...</option>
                    {URGENCY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  {quickErrors.urgency && (
                    <p className="mt-1 text-xs text-red-400">
                      {quickErrors.urgency}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Source <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={quickForm.source}
                    onChange={(e) =>
                      setQuickForm((p) => ({
                        ...p,
                        source: e.target.value as LeadSource,
                      }))
                    }
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  >
                    <option value="">Select...</option>
                    {SOURCE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  {quickErrors.source && (
                    <p className="mt-1 text-xs text-red-400">
                      {quickErrors.source}
                    </p>
                  )}
                </div>
              </div>

              {/* Notes (optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Notes
                </label>
                <textarea
                  value={quickForm.notes}
                  onChange={(e) =>
                    setQuickForm((p) => ({ ...p, notes: e.target.value }))
                  }
                  placeholder="Any additional context..."
                  rows={2}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                />
              </div>
            </div>
          ) : (
            /* ----------------------------------------------------------- */
            /* Thread / Lead picker list                                    */
            /* ----------------------------------------------------------- */
            <>
              {/* Create New Lead button (only on Leads tab) */}
              {activeTab === "leads" && (
                <button
                  onClick={handleOpenQuickCreate}
                  className="w-full mb-2 flex items-center gap-2 px-3 py-2.5 rounded-lg border border-dashed border-teal-600 bg-teal-900/20 hover:bg-teal-900/40 text-teal-400 hover:text-teal-300 transition-colors text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
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
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Create New Lead
                </button>
              )}

              {!results ? (
                <div className="text-center py-8 text-gray-400 text-sm">
                  Loading...
                </div>
              ) : displayItems.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">
                  {search
                    ? "No matches found"
                    : `No ${activeTab} available`}
                </div>
              ) : (
                <div className="space-y-1.5">
                  {displayItems.map((item) => (
                    <button
                      key={item.threadId}
                      onClick={() => setSelectedThreadId(item.threadId)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${
                        selectedThreadId === item.threadId
                          ? "border-teal-500 bg-teal-900/30"
                          : "border-gray-700 bg-gray-900 hover:bg-gray-700/80"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {item.isLead && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-teal-900 text-teal-300 shrink-0">
                                Lead
                              </span>
                            )}
                            <p className="text-sm font-medium text-white truncate">
                              {item.subject}
                            </p>
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5 truncate">
                            {item.contactNames.filter(Boolean).join(", ") ||
                              "Unknown contact"}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs text-gray-400">
                            {formatDate(item.lastActivityAt)}
                          </p>
                          {!item.isLead && item.messageCount > 0 && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              {item.messageCount} msg
                              {item.messageCount !== 1 ? "s" : ""}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-700 flex items-center justify-end gap-3">
          {showQuickCreate ? (
            <>
              <button
                onClick={handleCancelQuickCreate}
                disabled={isCreating}
                className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 rounded-lg disabled:opacity-50"
              >
                Back
              </button>
              <button
                onClick={handleQuickCreate}
                disabled={isCreating}
                className="px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
              >
                {isCreating ? (
                  <>
                    <svg
                      className="w-4 h-4 animate-spin"
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
                    Creating...
                  </>
                ) : (
                  <>
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
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    Create Lead & Move
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSelect}
                disabled={!selectedThreadId}
                className="px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Move to {activeTab === "leads" ? "Lead" : "Thread"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
