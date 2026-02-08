"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

type StakeholderEntityType = "support_coordinator" | "sil_provider" | "occupational_therapist" | "contractor" | "participant";

interface CommunicationsHistoryProps {
  participantId?: Id<"participants">;
  propertyId?: Id<"properties">;
  stakeholderEntityType?: StakeholderEntityType;
  stakeholderEntityId?: string;
  limit?: number;
}

const TYPE_ICONS: Record<string, string> = {
  phone_call: "📞",
  email: "📧",
  sms: "💬",
  meeting: "🤝",
  other: "📋",
};

const DIRECTION_COLORS: Record<string, string> = {
  sent: "bg-blue-900/50 text-blue-300",
  received: "bg-green-900/50 text-green-300",
};

// SVG icons for communication types (no emoji)
function CommunicationTypeIcon({ type }: { type: string }) {
  const iconClass = "w-4 h-4 flex-shrink-0";
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

function formatRelativeDate(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: days > 365 ? "numeric" : undefined,
  });
}

export default function CommunicationsHistory({
  participantId,
  propertyId,
  stakeholderEntityType,
  stakeholderEntityId,
  limit = 10,
}: CommunicationsHistoryProps) {
  const { user } = useAuth();
  const userId = user ? (user.id as Id<"users">) : undefined;
  const [expandedThreadId, setExpandedThreadId] = useState<string | null>(null);

  // Conditionally call the right query based on props
  const byParticipant = useQuery(
    api.communications.getByParticipant,
    participantId && userId ? { participantId, userId } : "skip"
  );

  const byProperty = useQuery(
    api.communications.getByProperty,
    propertyId && userId ? { propertyId, userId } : "skip"
  );

  const byStakeholder = useQuery(
    api.communications.getByStakeholder,
    stakeholderEntityType && stakeholderEntityId && userId
      ? { stakeholderEntityType, stakeholderEntityId, limit, userId }
      : "skip"
  );

  // Threaded query for participant pages
  const threadedData = useQuery(
    api.communications.getByParticipantThreaded,
    participantId && userId ? { participantId, userId } : "skip"
  );

  // Use threaded view for participant pages when data is available
  const useThreadedView = !!participantId && threadedData !== undefined;

  // Determine which data source to use (flat view)
  const communications = participantId
    ? byParticipant
    : propertyId
      ? byProperty
      : byStakeholder;

  const isLoading = participantId
    ? (byParticipant === undefined && threadedData === undefined)
    : communications === undefined;

  // Limit results for display
  const displayComms = communications
    ? communications.slice(0, limit)
    : [];

  const totalCount = communications?.length || 0;

  // Build the "Add Entry" link with pre-fill params
  const logCommLink = buildAddEntryLink({
    participantId,
    propertyId,
    stakeholderEntityType,
    stakeholderEntityId,
  });

  return (
    <section aria-labelledby="comms-history-heading" className="bg-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 id="comms-history-heading" className="text-lg font-semibold text-white">
          Communications
          {totalCount > 0 && (
            <span className="ml-2 text-sm font-normal text-gray-400">
              ({totalCount})
            </span>
          )}
        </h2>
        <Link
          href={logCommLink}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
        >
          + Add Entry
        </Link>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse flex items-start gap-3 p-3 bg-gray-700/50 rounded-lg">
              <div className="w-8 h-8 bg-gray-600 rounded" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-600 rounded w-3/4" />
                <div className="h-3 bg-gray-600 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Threaded view for participant pages */}
      {!isLoading && useThreadedView && threadedData && (
        <>
          {threadedData.threads.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400 mb-3">No communications recorded yet</p>
              <Link
                href={logCommLink}
                className="inline-flex items-center px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors"
              >
                Add Entry
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {threadedData.threads.slice(0, limit).map((thread: any) => {
                const isExpanded = expandedThreadId === thread.threadId;
                return (
                  <div key={thread.threadId} className="bg-gray-700/50 rounded-lg overflow-hidden">
                    {/* Thread header - collapsible */}
                    <button
                      onClick={() => setExpandedThreadId(isExpanded ? null : thread.threadId)}
                      aria-expanded={isExpanded}
                      className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-white text-sm font-medium truncate">
                            {thread.subject || "Untitled Thread"}
                          </span>
                          <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 text-xs font-medium bg-gray-600 text-gray-300 rounded-full">
                            {thread.messageCount}
                          </span>
                          {thread.status === "completed" && (
                            <span className="px-1.5 py-0.5 rounded text-xs bg-green-900/50 text-green-300">Done</span>
                          )}
                          {thread.status === "archived" && (
                            <span className="px-1.5 py-0.5 rounded text-xs bg-gray-600 text-gray-300">Archived</span>
                          )}
                        </div>
                        <p className="text-gray-400 text-xs truncate">
                          {thread.participantNames?.join(", ") || thread.contactName || "Unknown"}
                        </p>
                      </div>
                      <span className="text-gray-400 text-xs whitespace-nowrap">
                        {thread.lastActivityAt ? formatRelativeDate(thread.lastActivityAt) : ""}
                      </span>
                      <svg
                        className={`w-4 h-4 text-gray-400 transition-transform duration-200 flex-shrink-0 ${isExpanded ? "rotate-180" : ""}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {/* Expanded messages */}
                    {isExpanded && thread.messages && (
                      <div className="px-3 pb-3 space-y-2 border-t border-gray-600">
                        {thread.messages.map((msg: any) => (
                          <Link
                            key={msg._id}
                            href={`/follow-ups/communications/${msg._id}`}
                            className="flex items-start gap-2 p-2 rounded hover:bg-gray-600/50 transition-colors"
                          >
                            <CommunicationTypeIcon type={msg.communicationType || msg.type} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-white text-xs font-medium">{msg.contactName}</span>
                                <span className={`px-1 py-0.5 rounded text-xs ${DIRECTION_COLORS[msg.direction] || "bg-gray-600 text-gray-300"}`}>
                                  {msg.direction === "sent" ? "Sent" : "Received"}
                                </span>
                                <span className="text-gray-400 text-xs">
                                  {msg.communicationDate}
                                  {msg.communicationTime && ` ${msg.communicationTime}`}
                                </span>
                              </div>
                              <p className="text-gray-400 text-xs line-clamp-1 mt-0.5">{msg.summary}</p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* View all threads */}
              {threadedData.threads.length > limit && (
                <div className="mt-3 text-center">
                  <Link
                    href="/communications"
                    className="text-sm text-blue-400 hover:text-blue-300"
                  >
                    View all {threadedData.threads.length} threads
                  </Link>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Flat view for property/stakeholder pages (non-threaded) */}
      {!isLoading && !useThreadedView && (
        <>
          {/* Empty state */}
          {displayComms.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-400 mb-3">No communications recorded yet</p>
              <Link
                href={logCommLink}
                className="inline-flex items-center px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors"
              >
                Add Entry
              </Link>
            </div>
          )}

          {/* Communications list */}
          {displayComms.length > 0 && (
            <div className="space-y-2" role="list">
              {displayComms.map((comm) => (
                <Link
                  key={comm._id}
                  href={`/follow-ups/communications/${comm._id}`}
                  className="flex items-start gap-3 p-3 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors group"
                  role="listitem"
                >
                  {/* Type icon */}
                  <CommunicationTypeIcon type={comm.communicationType} />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-white text-sm font-medium truncate">
                        {comm.contactName}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-xs ${DIRECTION_COLORS[comm.direction] || "bg-gray-600 text-gray-300"}`}>
                        {comm.direction === "sent" ? "Sent" : "Received"}
                      </span>
                      {comm.complianceCategory && comm.complianceCategory !== "none" && comm.complianceCategory !== "routine" && (
                        <span className="px-1.5 py-0.5 rounded text-xs bg-yellow-900/50 text-yellow-300">
                          {comm.complianceCategory.replace(/_/g, " ")}
                        </span>
                      )}
                    </div>

                    {comm.subject && (
                      <p className="text-gray-300 text-sm truncate">{comm.subject}</p>
                    )}

                    <p className="text-gray-400 text-xs line-clamp-1 mt-0.5">
                      {comm.summary}
                    </p>
                  </div>

                  {/* Date */}
                  <span className="text-gray-400 text-xs whitespace-nowrap mt-1">
                    {formatRelativeDate(comm.createdAt)}
                  </span>
                </Link>
              ))}
            </div>
          )}

          {/* View all link */}
          {totalCount > limit && (
            <div className="mt-3 text-center">
              <Link
                href={buildViewAllLink({ participantId, propertyId, stakeholderEntityType, stakeholderEntityId })}
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                View all {totalCount} communications
              </Link>
            </div>
          )}
        </>
      )}
    </section>
  );
}

// Build URL for "Add Entry" with pre-fill params
function buildAddEntryLink(params: {
  participantId?: Id<"participants">;
  propertyId?: Id<"properties">;
  stakeholderEntityType?: StakeholderEntityType;
  stakeholderEntityId?: string;
}): string {
  const searchParams = new URLSearchParams();
  if (params.participantId) searchParams.set("participantId", params.participantId);
  if (params.propertyId) searchParams.set("propertyId", params.propertyId);
  if (params.stakeholderEntityType) searchParams.set("contactType", params.stakeholderEntityType);
  if (params.stakeholderEntityId) {
    searchParams.set("stakeholderType", params.stakeholderEntityType || "");
    searchParams.set("stakeholderId", params.stakeholderEntityId);
  }

  const qs = searchParams.toString();
  return `/follow-ups/communications/new${qs ? `?${qs}` : ""}`;
}

// Build URL for "View all" link
function buildViewAllLink(params: {
  participantId?: Id<"participants">;
  propertyId?: Id<"properties">;
  stakeholderEntityType?: StakeholderEntityType;
  stakeholderEntityId?: string;
}): string {
  // Navigate to the follow-ups page - the user can filter there
  return "/follow-ups";
}
