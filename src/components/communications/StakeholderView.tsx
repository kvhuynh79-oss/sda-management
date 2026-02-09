"use client";

import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import Link from "next/link";
import { ContactTypeBadge } from "../ui/Badge";
import Badge from "../ui/Badge";
import { LoadingScreen } from "../ui/LoadingScreen";
import { EmptyState } from "../ui/EmptyState";
import { FormInput } from "../forms/FormInput";
import { useConfirmDialog } from "../ui/ConfirmDialog";

function buildStakeholderAddEntryUrl(stakeholder: any): string {
  const params: Record<string, string> = {};
  if (stakeholder.contactType) params.contactType = stakeholder.contactType;
  if (stakeholder.contactName) params.contactName = stakeholder.contactName;
  if (stakeholder.contactEmail) params.contactEmail = stakeholder.contactEmail;
  if (stakeholder.contactPhone) params.contactPhone = stakeholder.contactPhone;
  if (stakeholder.latestSubject) params.subject = stakeholder.latestSubject;
  if (stakeholder.stakeholderEntityType) {
    params.stakeholderType = stakeholder.stakeholderEntityType;
    if (stakeholder.stakeholderEntityId) params.stakeholderId = stakeholder.stakeholderEntityId;
  }
  return `/follow-ups/communications/new?${new URLSearchParams(params).toString()}`;
}

interface StakeholderViewProps {
  userId: string;
  contactTypeFilter?: string;
  searchName?: string;
  onFilterChange?: (filters: { contactType?: string; searchName?: string }) => void;
  userRole?: string;
}

const CONTACT_TYPE_LABELS: Record<string, string> = {
  ndia: "NDIA",
  support_coordinator: "Support Coordinators",
  sil_provider: "SIL Providers",
  participant: "Participants",
  family: "Family Members",
  plan_manager: "Plan Managers",
  ot: "Occupational Therapists",
  contractor: "Contractors",
  other: "Other",
};

const AVATAR_COLORS: Record<string, string> = {
  ndia: "bg-purple-600",
  support_coordinator: "bg-teal-700",
  sil_provider: "bg-orange-600",
  participant: "bg-green-600",
  family: "bg-cyan-600",
  plan_manager: "bg-indigo-600",
  ot: "bg-pink-600",
  contractor: "bg-yellow-600",
  other: "bg-gray-600",
};

function formatRelativeTime(isoString: string): string {
  const timestamp = new Date(isoString).getTime();
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${days}d ago`;
  return new Date(isoString).toLocaleDateString();
}

export function StakeholderView({
  userId,
  contactTypeFilter,
  searchName,
  onFilterChange,
  userRole,
}: StakeholderViewProps) {
  const [localSearch, setLocalSearch] = useState(searchName || "");
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [prevItems, setPrevItems] = useState<any[]>([]);
  const [deletingContact, setDeletingContact] = useState<string | null>(null);
  const deleteByContactName = useMutation(api.communications.deleteByContactName);
  const canDelete = userRole === "admin" || userRole === "property_manager";
  const { confirm: confirmDialog, alert: alertDialog } = useConfirmDialog();

  const data = useQuery(api.communications.getStakeholderView, {
    userId: userId as Id<"users">,
    limit: 50,
    cursor,
    contactType: contactTypeFilter || undefined,
    searchName: localSearch || undefined,
  });

  const stakeholders = cursor ? [...prevItems, ...(data?.stakeholders || [])] : (data?.stakeholders || []);

  // Group by contactType
  const groupedByType = useMemo(() => {
    const groups = new Map<string, typeof stakeholders>();
    for (const s of stakeholders) {
      const type = s.contactType;
      if (!groups.has(type)) {
        groups.set(type, []);
      }
      groups.get(type)!.push(s);
    }
    // Sort groups by predefined order
    const typeOrder = ["ndia", "support_coordinator", "sil_provider", "participant", "family", "plan_manager", "ot", "contractor", "other"];
    return typeOrder
      .filter((type) => groups.has(type))
      .map((type) => [type, groups.get(type)!] as [string, typeof stakeholders]);
  }, [stakeholders]);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setLocalSearch(e.target.value);
      setCursor(undefined);
      setPrevItems([]);
      onFilterChange?.({ contactType: contactTypeFilter, searchName: e.target.value || undefined });
    },
    [contactTypeFilter, onFilterChange]
  );

  const handleDeleteContact = useCallback(
    async (contactName: string) => {
      if (!(await confirmDialog({ title: "Confirm Delete", message: `Delete all communications with "${contactName}"? This can be restored by an admin.`, variant: "danger" }))) return;
      setDeletingContact(contactName);
      try {
        await deleteByContactName({
          userId: userId as Id<"users">,
          contactName,
        });
        setCursor(undefined);
        setPrevItems([]);
      } catch (error) {
        console.error("Failed to delete:", error);
        await alertDialog("Failed to delete communications.");
      } finally {
        setDeletingContact(null);
      }
    },
    [deleteByContactName, userId, confirmDialog, alertDialog]
  );

  const handleLoadMore = useCallback(() => {
    if (data?.nextCursor) {
      setPrevItems(stakeholders);
      setCursor(data.nextCursor);
    }
  }, [data, stakeholders]);

  if (!data) {
    return <LoadingScreen fullScreen={false} message="Loading stakeholders..." />;
  }

  return (
    <div
      role="tabpanel"
      id="panel-stakeholder"
      aria-labelledby="tab-stakeholder"
    >
      {/* Search bar */}
      <div className="mb-4 max-w-md">
        <FormInput
          label="Search contacts"
          type="search"
          value={localSearch}
          onChange={handleSearchChange}
          placeholder="Search by name..."
        />
      </div>

      {/* Results count for screen readers */}
      <div className="sr-only" aria-live="polite" role="status">
        {stakeholders.length === 0
          ? "No stakeholders found"
          : `Showing ${stakeholders.length} stakeholders`}
      </div>

      {stakeholders.length === 0 ? (
        <EmptyState
          title="No stakeholders found"
          description={localSearch ? "Try a different search term." : "Add communications to see stakeholders here."}
          isFiltered={!!localSearch || !!contactTypeFilter}
          icon={
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
        />
      ) : (
        <div className="space-y-6">
          {groupedByType.map(([type, items]) => (
            <div key={type}>
              <h3 className="text-sm font-semibold text-gray-300 mb-3">
                {CONTACT_TYPE_LABELS[type] || type}
                <span className="text-xs text-gray-400 font-normal ml-2">({items.length})</span>
              </h3>

              <div role="list" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {items.map((stakeholder: any) => (
                  <div
                    key={`${stakeholder.contactName}-${stakeholder.contactType}`}
                    role="listitem"
                    aria-label={`${stakeholder.contactName}, ${CONTACT_TYPE_LABELS[stakeholder.contactType] || stakeholder.contactType}, ${stakeholder.totalCommunications} communications`}
                    className="bg-gray-800 rounded-lg p-4 hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                          AVATAR_COLORS[stakeholder.contactType] || "bg-gray-600"
                        }`}
                      >
                        <span className="text-white font-bold text-sm">
                          {stakeholder.contactName.charAt(0).toUpperCase()}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Name */}
                        <h4 className="text-sm font-semibold text-white truncate">
                          {stakeholder.contactName}
                        </h4>

                        {/* Contact type badge */}
                        <div className="mt-1">
                          <ContactTypeBadge contactType={stakeholder.contactType} size="xs" />
                        </div>

                        {/* Latest subject */}
                        {stakeholder.latestSubject && (
                          <p className="text-xs text-gray-400 mt-1.5 truncate">
                            {stakeholder.latestSubject}
                          </p>
                        )}

                        {/* Stats */}
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                          <span>{stakeholder.totalCommunications} comms</span>
                          <span>{formatRelativeTime(stakeholder.lastContactAt)}</span>
                        </div>

                        {/* Compliance categories */}
                        {stakeholder.complianceCategories?.some(
                          (c: string) => c !== "none" && c !== "routine"
                        ) && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {stakeholder.complianceCategories
                              .filter((c: string) => c !== "none" && c !== "routine")
                              .map((cat: string) => (
                                <Badge key={cat} variant="warning" size="xs">
                                  {cat.replace(/_/g, " ")}
                                </Badge>
                              ))}
                          </div>
                        )}

                        {/* Follow-up action */}
                        <div className="flex items-center gap-2 mt-2">
                          <Link
                            href={buildStakeholderAddEntryUrl(stakeholder)}
                            className="text-xs text-teal-500 hover:text-teal-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 rounded px-2 py-1 bg-gray-700/50 hover:bg-gray-700"
                          >
                            Add Entry
                          </Link>
                          {canDelete && (
                            <button
                              onClick={() => handleDeleteContact(stakeholder.contactName)}
                              disabled={deletingContact === stakeholder.contactName}
                              className="text-xs text-red-400 hover:text-red-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded px-2 py-1 bg-gray-700/50 hover:bg-gray-700 disabled:opacity-50"
                              aria-label={`Delete all communications with ${stakeholder.contactName}`}
                            >
                              {deletingContact === stakeholder.contactName ? "Deleting..." : "Delete"}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Load More */}
      {data.nextCursor && (
        <div className="mt-4 text-center">
          <button
            onClick={handleLoadMore}
            className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
          >
            Load More Stakeholders
          </button>
        </div>
      )}
    </div>
  );
}

export default StakeholderView;
