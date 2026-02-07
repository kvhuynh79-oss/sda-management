"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import Badge, { CommunicationTypeBadge } from "../ui/Badge";
import { LoadingScreen } from "../ui/LoadingScreen";
import { EmptyState } from "../ui/EmptyState";

interface ThreadViewProps {
  userId: string;
  filterUnread?: boolean;
  filterRequiresAction?: boolean;
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

function ComplianceCategoryBadge({ category }: { category: string }) {
  const colors: Record<string, string> = {
    incident_related: "error",
    complaint: "warning",
    safeguarding: "error",
    plan_review: "info",
    access_request: "purple",
    quality_audit: "success",
    advocacy: "cyan",
  };
  const variant = (colors[category] || "neutral") as "error" | "warning" | "info" | "purple" | "success" | "cyan" | "neutral";
  const label = category.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  return <Badge variant={variant} size="xs">{label}</Badge>;
}

// Communication type icon (SVG, not emoji)
function TypeIcon({ type }: { type: string }) {
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

function ThreadMessages({ threadId, userId }: { threadId: string; userId: string }) {
  const data = useQuery(api.communications.getThreadMessages, {
    userId: userId as Id<"users">,
    threadId,
  });

  if (!data) {
    return (
      <div className="py-4 flex justify-center">
        <LoadingScreen fullScreen={false} message="Loading messages..." />
      </div>
    );
  }

  return (
    <div className="space-y-3 pt-3 border-t border-gray-700">
      {data.messages.map((msg) => (
        <div
          key={msg._id}
          className="flex gap-3 p-3 bg-gray-900/50 rounded-lg"
        >
          <TypeIcon type={msg.type} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-white">{msg.contactName}</span>
              <CommunicationTypeBadge type={msg.type as "email" | "sms" | "phone_call" | "meeting" | "other"} size="xs" />
              <span className="text-xs text-gray-400">
                {msg.communicationDate}
                {msg.communicationTime && ` ${msg.communicationTime}`}
              </span>
            </div>
            {msg.subject && (
              <p className="text-sm text-gray-300 font-medium">{msg.subject}</p>
            )}
            <p className="text-sm text-gray-400 mt-0.5">{msg.summary}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ThreadView({ userId, filterUnread, filterRequiresAction }: ThreadViewProps) {
  const [expandedThread, setExpandedThread] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [allThreads, setAllThreads] = useState<any[]>([]);

  const data = useQuery(api.communications.getThreadedView, {
    userId: userId as Id<"users">,
    limit: 20,
    cursor,
    filterUnread,
    filterRequiresAction,
  });

  const markRead = useMutation(api.communications.markThreadRead);

  // Merge paginated results
  const threads = cursor ? [...allThreads, ...(data?.threads || [])] : (data?.threads || []);

  const handleExpand = useCallback(
    async (threadId: string) => {
      if (expandedThread === threadId) {
        setExpandedThread(null);
        return;
      }
      setExpandedThread(threadId);

      // Mark thread as read
      const thread = threads.find((t) => t.threadId === threadId);
      if (thread?.hasUnread) {
        try {
          await markRead({ userId: userId as Id<"users">, threadId });
        } catch {
          // Silently fail - read status is non-critical
        }
      }
    },
    [expandedThread, threads, markRead, userId]
  );

  const handleLoadMore = useCallback(() => {
    if (data?.nextCursor) {
      setAllThreads(threads);
      setCursor(data.nextCursor);
    }
  }, [data, threads]);

  if (!data) {
    return <LoadingScreen fullScreen={false} message="Loading threads..." />;
  }

  if (threads.length === 0) {
    return (
      <EmptyState
        title="No threads found"
        description={
          filterUnread
            ? "All caught up! No unread threads."
            : filterRequiresAction
              ? "No threads requiring action."
              : "Start a conversation to see threads here."
        }
        isFiltered={!!filterUnread || !!filterRequiresAction}
        icon={
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        }
      />
    );
  }

  return (
    <div
      role="tabpanel"
      id="panel-thread"
      aria-labelledby="tab-thread"
    >
      <div role="list" aria-live="polite" aria-relevant="additions removals" className="space-y-2">
        {threads.map((thread) => {
          const isExpanded = expandedThread === thread.threadId;
          const hasNonRoutineCompliance = thread.complianceCategories?.some(
            (c: string) => c !== "routine" && c !== "none"
          );

          return (
            <div
              key={thread.threadId}
              role="listitem"
              className={`bg-gray-800 rounded-lg transition-all duration-200 ${
                thread.hasUnread ? "border-l-4 border-blue-500" : "border-l-4 border-transparent"
              }`}
            >
              <button
                onClick={() => handleExpand(thread.threadId)}
                onKeyDown={(e) => {
                  if (e.key === "Escape" && isExpanded) {
                    setExpandedThread(null);
                  }
                }}
                aria-expanded={isExpanded}
                aria-label={`${isExpanded ? "Collapse" : "Expand"} thread: ${thread.subject || "Untitled Thread"}, ${thread.messageCount} messages, ${thread.hasUnread ? "unread" : "read"}`}
                className="w-full text-left p-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Subject */}
                    <h3
                      className={`text-sm truncate ${
                        thread.hasUnread
                          ? "font-bold text-white"
                          : "font-medium text-gray-200"
                      }`}
                    >
                      {thread.subject || "Untitled Thread"}
                    </h3>

                    {/* Participant names */}
                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                      {thread.participantNames?.join(", ") || "Unknown contact"}
                    </p>

                    {/* Preview */}
                    <p className="text-sm text-gray-400 mt-1 line-clamp-1">
                      {thread.previewText}
                    </p>

                    {/* Badges */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      {hasNonRoutineCompliance &&
                        thread.complianceCategories
                          .filter((c: string) => c !== "routine" && c !== "none")
                          .map((cat: string) => (
                            <ComplianceCategoryBadge key={cat} category={cat} />
                          ))}
                      {thread.requiresAction && (
                        <Badge variant="error" size="xs" dot dotColor="bg-red-400">
                          Action Required
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Right side: count + time */}
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="text-xs text-gray-400">
                      {formatRelativeTime(thread.lastActivityAt)}
                    </span>
                    <span className="inline-flex items-center justify-center min-w-[1.5rem] h-5 px-1.5 text-xs font-medium bg-gray-700 text-gray-300 rounded-full">
                      {thread.messageCount}
                    </span>
                    {/* Expand indicator */}
                    <svg
                      className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </button>

              {/* Expanded messages */}
              {isExpanded && (
                <div className="px-4 pb-4" role="region" aria-label={`Messages in thread: ${thread.subject || "Untitled Thread"}`}>
                  <ThreadMessages threadId={thread.threadId} userId={userId} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Load More */}
      {data.nextCursor && (
        <div className="mt-4 text-center">
          <button
            onClick={handleLoadMore}
            className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            Load More Threads
          </button>
        </div>
      )}
    </div>
  );
}

export default ThreadView;
