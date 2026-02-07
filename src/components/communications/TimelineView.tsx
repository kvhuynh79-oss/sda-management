"use client";

import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import Link from "next/link";
import { CommunicationTypeBadge, ContactTypeBadge, DirectionBadge } from "../ui/Badge";
import { LoadingScreen } from "../ui/LoadingScreen";
import { EmptyState } from "../ui/EmptyState";
import { FormSelect } from "../forms/FormSelect";
import { FormInput } from "../forms/FormInput";

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

interface TimelineViewProps {
  userId: string;
  typeFilter?: string;
  dateFrom?: string;
  dateTo?: string;
  onFilterChange?: (filters: { type?: string; dateFrom?: string; dateTo?: string }) => void;
  isSelecting?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  userRole?: string;
}

// Communication type SVG icons
function TypeIcon({ type }: { type: string }) {
  const iconClass = "w-5 h-5 flex-shrink-0";
  switch (type) {
    case "email":
      return (
        <svg className={`${iconClass} text-blue-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      );
    case "phone_call":
      return (
        <svg className={`${iconClass} text-purple-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
      );
    case "sms":
      return (
        <svg className={`${iconClass} text-green-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      );
    case "meeting":
      return (
        <svg className={`${iconClass} text-orange-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    default:
      return (
        <svg className={`${iconClass} text-gray-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      );
  }
}

function formatDateHeader(dateStr: string): string {
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  if (dateStr === today) return "Today";
  if (dateStr === yesterday) return "Yesterday";

  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const TYPE_OPTIONS = [
  { value: "", label: "All Types" },
  { value: "email", label: "Email" },
  { value: "phone_call", label: "Phone Call" },
  { value: "sms", label: "SMS" },
  { value: "meeting", label: "Meeting" },
  { value: "other", label: "Other" },
];

export function TimelineView({
  userId,
  typeFilter,
  dateFrom,
  dateTo,
  onFilterChange,
  isSelecting,
  selectedIds,
  onToggleSelect,
  userRole,
}: TimelineViewProps) {
  const [localType, setLocalType] = useState(typeFilter || "");
  const [localDateFrom, setLocalDateFrom] = useState(dateFrom || "");
  const [localDateTo, setLocalDateTo] = useState(dateTo || "");
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [prevItems, setPrevItems] = useState<any[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const deleteCommunication = useMutation(api.communications.remove);
  const canDelete = userRole === "admin" || userRole === "property_manager";

  const data = useQuery(api.communications.getTimelineView, {
    userId: userId as Id<"users">,
    limit: 50,
    cursor,
    type: localType || undefined,
    dateFrom: localDateFrom || undefined,
    dateTo: localDateTo || undefined,
  });

  const communications = cursor ? [...prevItems, ...(data?.communications || [])] : (data?.communications || []);

  // Group by date
  const groupedByDate = useMemo(() => {
    const groups = new Map<string, typeof communications>();
    for (const comm of communications) {
      const date = comm.communicationDate;
      if (!groups.has(date)) {
        groups.set(date, []);
      }
      groups.get(date)!.push(comm);
    }
    return Array.from(groups.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [communications]);

  const handleTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setLocalType(e.target.value);
      setCursor(undefined);
      setPrevItems([]);
      onFilterChange?.({ type: e.target.value || undefined, dateFrom: localDateFrom || undefined, dateTo: localDateTo || undefined });
    },
    [localDateFrom, localDateTo, onFilterChange]
  );

  const handleDateFromChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setLocalDateFrom(e.target.value);
      setCursor(undefined);
      setPrevItems([]);
      onFilterChange?.({ type: localType || undefined, dateFrom: e.target.value || undefined, dateTo: localDateTo || undefined });
    },
    [localType, localDateTo, onFilterChange]
  );

  const handleDateToChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setLocalDateTo(e.target.value);
      setCursor(undefined);
      setPrevItems([]);
      onFilterChange?.({ type: localType || undefined, dateFrom: localDateFrom || undefined, dateTo: e.target.value || undefined });
    },
    [localType, localDateFrom, onFilterChange]
  );

  const handleDelete = useCallback(
    async (commId: string, contactName: string) => {
      if (!confirm(`Delete this communication with "${contactName}"? It can be restored by an admin.`)) return;
      setDeletingId(commId);
      try {
        await deleteCommunication({
          id: commId as Id<"communications">,
          userId: userId as Id<"users">,
        });
      } catch (error) {
        console.error("Failed to delete:", error);
        alert("Failed to delete communication.");
      } finally {
        setDeletingId(null);
      }
    },
    [deleteCommunication, userId]
  );

  const handleLoadMore = useCallback(() => {
    if (data?.nextCursor) {
      setPrevItems(communications);
      setCursor(data.nextCursor);
    }
  }, [data, communications]);

  if (!data) {
    return <LoadingScreen fullScreen={false} message="Loading timeline..." />;
  }

  return (
    <div
      role="tabpanel"
      id="panel-timeline"
      aria-labelledby="tab-timeline"
    >
      {/* Inline Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="w-40">
          <FormSelect
            label="Type"
            options={TYPE_OPTIONS}
            value={localType}
            onChange={handleTypeChange}
            placeholder=""
          />
        </div>
        <div className="w-40">
          <FormInput
            label="From"
            type="date"
            value={localDateFrom}
            onChange={handleDateFromChange}
          />
        </div>
        <div className="w-40">
          <FormInput
            label="To"
            type="date"
            value={localDateTo}
            onChange={handleDateToChange}
          />
        </div>
      </div>

      {/* Results count for screen readers */}
      <div className="sr-only" aria-live="polite" role="status">
        {communications.length === 0
          ? "No communications found"
          : `Showing ${communications.length} communications`}
      </div>

      {/* Timeline */}
      {communications.length === 0 ? (
        <EmptyState
          title="No communications found"
          description="Adjust your filters or add new communications."
          isFiltered={!!(localType || localDateFrom || localDateTo)}
          icon={
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      ) : (
        <div role="feed" aria-label="Communication timeline" className="space-y-6">
          {groupedByDate.map(([date, items]) => (
            <div key={date}>
              {/* Sticky date header */}
              <div
                className="sticky top-0 z-10 bg-gray-900 py-2"
                aria-label={`Communications on ${formatDateHeader(date)}`}
              >
                <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full" aria-hidden="true" />
                  {formatDateHeader(date)}
                  <span className="text-xs text-gray-400 font-normal">({items.length})</span>
                </h3>
              </div>

              {/* Communications for this date */}
              <div className="space-y-2 ml-4 border-l-2 border-gray-700 pl-4">
                {items.map((comm: any) => (
                  <article
                    key={comm._id}
                    className="bg-gray-800 rounded-lg p-4 hover:bg-gray-700 transition-colors"
                    role="article"
                    aria-label={`${comm.type.replace(/_/g, " ")} ${comm.direction === "inbound" ? "from" : "to"} ${comm.contactName}${comm.subject ? `: ${comm.subject}` : ""}`}
                  >
                    <div className="flex gap-3">
                      {isSelecting && onToggleSelect && (
                        <div className="flex items-start pt-1">
                          <input
                            type="checkbox"
                            checked={selectedIds?.has(comm._id) || false}
                            onChange={() => onToggleSelect(comm._id)}
                            className="w-4 h-4 rounded border-gray-500 bg-gray-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
                            aria-label={`Select communication with ${comm.contactName}`}
                          />
                        </div>
                      )}
                      <div className="flex-shrink-0 w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
                        <TypeIcon type={comm.type} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <DirectionBadge direction={comm.direction} />
                          <CommunicationTypeBadge type={comm.type} size="xs" />
                          <ContactTypeBadge contactType={comm.contactType} size="xs" />
                          {comm.communicationTime && (
                            <span className="text-xs text-gray-400">{comm.communicationTime}</span>
                          )}
                        </div>
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
                            className="text-xs text-blue-400 hover:text-blue-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded px-2 py-1 bg-gray-700/50 hover:bg-gray-700"
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
                    </div>
                  </article>
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
            className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            Load More
          </button>
        </div>
      )}
    </div>
  );
}

export default TimelineView;
