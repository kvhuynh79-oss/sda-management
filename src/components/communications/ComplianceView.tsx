"use client";

import { useState, useCallback, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import Link from "next/link";
import Badge, { ContactTypeBadge } from "../ui/Badge";
import { LoadingScreen } from "../ui/LoadingScreen";
import { EmptyState } from "../ui/EmptyState";
import { useConfirmDialog } from "../ui/ConfirmDialog";

function buildAddEntryUrl(comm: any): string {
  const params: Record<string, string> = {};
  if (comm.participantId) params.participantId = comm.participantId;
  if (comm.linkedPropertyId) params.propertyId = comm.linkedPropertyId;
  if (comm.contactType) params.contactType = comm.contactType;
  if (comm.contactName) params.contactName = comm.contactName;
  if (comm.contactEmail) params.contactEmail = comm.contactEmail;
  if (comm.contactPhone) params.contactPhone = comm.contactPhone;
  if (comm.subject) params.subject = comm.subject;
  if (comm.stakeholderEntityType) {
    params.stakeholderType = comm.stakeholderEntityType;
    if (comm.stakeholderEntityId) params.stakeholderId = comm.stakeholderEntityId;
  }
  return `/follow-ups/communications/new?${new URLSearchParams(params).toString()}`;
}

interface ComplianceViewProps {
  userId: string;
  categoryFilter?: string;
  onCategoryChange?: (category: string | undefined) => void;
  isSelecting?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  userRole?: string;
}

type ComplianceCategory =
  | "all"
  | "incident_related"
  | "complaint"
  | "safeguarding"
  | "plan_review"
  | "access_request"
  | "quality_audit"
  | "advocacy";

const CATEGORIES: { key: ComplianceCategory; label: string }[] = [
  { key: "all", label: "All" },
  { key: "incident_related", label: "Incident" },
  { key: "complaint", label: "Complaint" },
  { key: "safeguarding", label: "Safeguarding" },
  { key: "plan_review", label: "Plan Review" },
  { key: "access_request", label: "Access Request" },
  { key: "quality_audit", label: "Quality Audit" },
  { key: "advocacy", label: "Advocacy" },
];

const CATEGORY_COLORS: Record<string, { border: string; badge: "error" | "warning" | "info" | "purple" | "success" | "cyan" | "neutral" }> = {
  incident_related: { border: "border-l-red-500", badge: "error" },
  complaint: { border: "border-l-yellow-500", badge: "warning" },
  safeguarding: { border: "border-l-red-600", badge: "error" },
  plan_review: { border: "border-l-teal-600", badge: "info" },
  access_request: { border: "border-l-purple-500", badge: "purple" },
  quality_audit: { border: "border-l-green-500", badge: "success" },
  advocacy: { border: "border-l-cyan-500", badge: "cyan" },
};

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function ComplianceView({
  userId,
  categoryFilter,
  onCategoryChange,
  isSelecting,
  selectedIds,
  onToggleSelect,
  userRole,
}: ComplianceViewProps) {
  const [activeCategory, setActiveCategory] = useState<ComplianceCategory>(
    (categoryFilter as ComplianceCategory) || "all"
  );
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [prevItems, setPrevItems] = useState<any[]>([]);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const deleteCommunication = useMutation(api.communications.remove);
  const canDelete = userRole === "admin" || userRole === "property_manager";
  const { confirm: confirmDialog, alert: alertDialog } = useConfirmDialog();

  const data = useQuery(api.communications.getComplianceView, {
    userId: userId as Id<"users">,
    limit: 50,
    cursor,
    complianceCategory: activeCategory === "all" ? undefined : activeCategory,
  });

  const communications = cursor ? [...prevItems, ...(data?.communications || [])] : (data?.communications || []);
  const stats = data?.stats;

  const handleCategoryChange = useCallback(
    (category: ComplianceCategory) => {
      setActiveCategory(category);
      setCursor(undefined);
      setPrevItems([]);
      onCategoryChange?.(category === "all" ? undefined : category);
    },
    [onCategoryChange]
  );

  const handleTabKeyDown = useCallback(
    (e: React.KeyboardEvent, index: number) => {
      let nextIndex = -1;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        nextIndex = (index + 1) % CATEGORIES.length;
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        nextIndex = (index - 1 + CATEGORIES.length) % CATEGORIES.length;
      } else if (e.key === "Home") {
        e.preventDefault();
        nextIndex = 0;
      } else if (e.key === "End") {
        e.preventDefault();
        nextIndex = CATEGORIES.length - 1;
      }
      if (nextIndex >= 0) {
        tabRefs.current[nextIndex]?.focus();
        handleCategoryChange(CATEGORIES[nextIndex].key);
      }
    },
    [handleCategoryChange]
  );

  const handleDelete = useCallback(
    async (commId: string, contactName: string) => {
      if (!(await confirmDialog({ title: "Confirm Delete", message: `Delete this communication with "${contactName}"? It can be restored by an admin.`, variant: "danger" }))) return;
      setDeletingId(commId);
      try {
        await deleteCommunication({
          id: commId as Id<"communications">,
          userId: userId as Id<"users">,
        });
      } catch (error) {
        console.error("Failed to delete:", error);
        await alertDialog("Failed to delete communication.");
      } finally {
        setDeletingId(null);
      }
    },
    [deleteCommunication, userId, confirmDialog, alertDialog]
  );

  const handleLoadMore = useCallback(() => {
    if (data?.nextCursor) {
      setPrevItems(communications);
      setCursor(data.nextCursor);
    }
  }, [data, communications]);

  if (!data) {
    return <LoadingScreen fullScreen={false} message="Loading compliance data..." />;
  }

  return (
    <div
      role="tabpanel"
      id="panel-compliance"
      aria-labelledby="tab-compliance"
    >
      {/* Stats bar */}
      {stats && (
        <div className="flex flex-wrap gap-3 mb-4 p-3 bg-gray-800 rounded-lg">
          <div className="text-sm text-gray-300">
            <span className="font-semibold text-white">{stats.total}</span> compliance items
          </div>
          <div className="text-sm text-gray-300">
            <span className="font-semibold text-red-400">{stats.flagged}</span> flagged
          </div>
          <div className="text-sm text-gray-300">
            <span className="font-semibold text-yellow-400">{stats.pendingFollowUp}</span> pending follow-up
          </div>
          {/* Category breakdown pills */}
          <div className="flex flex-wrap gap-1.5 ml-auto">
            {Object.entries(stats.byCategory).map(([cat, count]) => {
              const color = CATEGORY_COLORS[cat]?.badge || "neutral";
              return (
                <Badge key={cat} variant={color} size="xs">
                  {cat.replace(/_/g, " ")}: {count as number}
                </Badge>
              );
            })}
          </div>
        </div>
      )}

      {/* Category tabs */}
      <div
        role="tablist"
        aria-label="Compliance categories"
        className="flex overflow-x-auto scrollbar-hide gap-1 mb-4 bg-gray-800 rounded-lg p-1"
      >
        {CATEGORIES.map((cat, index) => {
          const isActive = activeCategory === cat.key;
          const count =
            cat.key === "all"
              ? stats?.total || 0
              : stats?.byCategory[cat.key] || 0;

          return (
            <button
              key={cat.key}
              ref={(el) => { tabRefs.current[index] = el; }}
              role="tab"
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              onClick={() => handleCategoryChange(cat.key)}
              onKeyDown={(e) => handleTabKeyDown(e, index)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
                isActive
                  ? "bg-teal-700 text-white"
                  : "text-gray-300 hover:bg-gray-600"
              }`}
            >
              {cat.label}
              {count > 0 && (
                <span
                  className={`min-w-[1rem] h-4 px-1 text-xs rounded-full inline-flex items-center justify-center ${
                    isActive ? "bg-white/20" : "bg-gray-600"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Results count for screen readers */}
      <div className="sr-only" aria-live="polite" role="status">
        {communications.length === 0
          ? `No ${activeCategory === "all" ? "compliance" : activeCategory.replace(/_/g, " ")} items found`
          : `Showing ${communications.length} ${activeCategory === "all" ? "compliance" : activeCategory.replace(/_/g, " ")} items`}
      </div>

      {/* Communications list */}
      {communications.length === 0 ? (
        <EmptyState
          title={`No ${activeCategory === "all" ? "compliance" : activeCategory.replace(/_/g, " ")} items`}
          description="No compliance-tagged communications found for this category."
          isFiltered={activeCategory !== "all"}
          icon={
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          }
        />
      ) : (
        <div className="space-y-2">
          {communications.map((comm: any) => {
            const catColor = CATEGORY_COLORS[comm.complianceCategory] || { border: "border-l-gray-500", badge: "neutral" as const };

            return (
              <article
                key={comm._id}
                aria-label={`${(comm.complianceCategory || "none").replace(/_/g, " ")} - ${comm.contactName}${comm.subject ? `: ${comm.subject}` : ""}`}
                className={`bg-gray-800 rounded-lg p-4 border-l-4 ${catColor.border} hover:bg-gray-700 transition-colors`}
              >
                <div className="flex items-start justify-between gap-3">
                  {isSelecting && onToggleSelect && (
                    <div className="flex items-start pt-0.5">
                      <input
                        type="checkbox"
                        checked={selectedIds?.has(comm._id) || false}
                        onChange={() => onToggleSelect(comm._id)}
                        className="w-4 h-4 rounded border-gray-500 bg-gray-700 text-teal-700 focus:ring-teal-600 focus:ring-offset-0 cursor-pointer"
                        aria-label={`Select ${comm.contactName} communication`}
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    {/* Badges row */}
                    <div className="flex flex-wrap items-center gap-1.5 mb-2">
                      <Badge variant={catColor.badge} size="xs">
                        {(comm.complianceCategory || "none").replace(/_/g, " ")}
                      </Badge>
                      <ContactTypeBadge contactType={comm.contactType} size="xs" />

                      {comm.complianceFlags?.map((flag: string) => (
                        <Badge key={flag} variant="warning" size="xs">
                          {flag}
                        </Badge>
                      ))}

                      {comm.requiresFollowUp && (
                        <Badge variant="error" size="xs" dot dotColor="bg-red-400">
                          Follow-up Required
                        </Badge>
                      )}
                    </div>

                    {/* Contact + subject */}
                    <h4 className="text-sm font-medium text-white">{comm.contactName}</h4>
                    {comm.subject && (
                      <p className="text-sm text-gray-300 mt-0.5">{comm.subject}</p>
                    )}
                    <p className="text-sm text-gray-400 mt-0.5 line-clamp-2">{comm.summary}</p>

                    {comm.participantName && (
                      <p className="text-xs text-gray-400 mt-1">
                        Participant: {comm.participantName}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <Link
                        href={buildAddEntryUrl(comm)}
                        className="text-xs text-teal-500 hover:text-teal-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 rounded px-2 py-1 bg-gray-700/50 hover:bg-gray-700"
                      >
                        Add Entry
                      </Link>
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(comm._id, comm.contactName)}
                          disabled={deletingId === comm._id}
                          className="text-xs text-red-400 hover:text-red-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded px-2 py-1 bg-gray-700/50 hover:bg-gray-700 disabled:opacity-50"
                          aria-label={`Delete communication with ${comm.contactName}`}
                        >
                          {deletingId === comm._id ? "..." : "Delete"}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Date */}
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    {formatDate(comm.createdAt)}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Load More */}
      {data.nextCursor && (
        <div className="mt-4 text-center">
          <button
            onClick={handleLoadMore}
            className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
          >
            Load More
          </button>
        </div>
      )}
    </div>
  );
}

export default ComplianceView;
