"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import Link from "next/link";
import Badge, { CommunicationTypeBadge } from "../ui/Badge";
import { LoadingScreen } from "../ui/LoadingScreen";
import { EmptyState } from "../ui/EmptyState";
import { exportThreadToPdf } from "../../lib/threadPdfExport";
import { useConfirmDialog } from "../ui/ConfirmDialog";

function buildThreadAddEntryUrl(thread: any): string {
  const params: Record<string, string> = {};
  // Pass threadId so the new entry gets added to this existing thread
  if (thread.threadId) params.threadId = thread.threadId;
  if (thread.subject) params.subject = thread.subject;
  if (thread.participantId) params.participantId = thread.participantId;
  if (thread.contactType) params.contactType = thread.contactType;
  if (thread.participantNames?.[0]) params.contactName = thread.participantNames[0];
  return `/follow-ups/communications/new?${new URLSearchParams(params).toString()}`;
}

type ThreadStatus = "active" | "completed" | "archived" | "all";

interface ThreadViewProps {
  userId: string;
  filterUnread?: boolean;
  filterRequiresAction?: boolean;
  statusFilter?: ThreadStatus;
  onStatusChange?: (status: "active" | "completed" | "archived") => void;
  userRole?: string;
  isSelecting?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
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
        <svg className={`${iconClass} text-teal-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

function ThreadMessages({ threadId, userId, userRole }: { threadId: string; userId: string; userRole?: string }) {
  const data = useQuery(api.communications.getThreadMessages, {
    userId: userId as Id<"users">,
    threadId,
  });
  const deleteCommunication = useMutation(api.communications.remove);
  const canDelete = userRole === "admin" || userRole === "property_manager";
  const { confirm: confirmDialog } = useConfirmDialog();

  const handleDeleteMessage = useCallback(
    async (messageId: string, contactName: string) => {
      if (!(await confirmDialog({ title: "Confirm Delete", message: `Delete this communication from ${contactName}? It can be restored by an admin.`, variant: "danger" }))) return;
      try {
        await deleteCommunication({
          id: messageId as Id<"communications">,
          userId: userId as Id<"users">,
        });
      } catch (error) {
        console.error("Failed to delete communication:", error);
      }
    },
    [deleteCommunication, userId, confirmDialog]
  );

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
          className="flex gap-3 p-3 bg-gray-900/50 rounded-lg group/msg"
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
          {canDelete && (
            <button
              onClick={() => handleDeleteMessage(msg._id, msg.contactName)}
              className="opacity-0 group-hover/msg:opacity-100 flex-shrink-0 p-1.5 text-gray-400 hover:text-red-400 rounded transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:opacity-100"
              aria-label={`Delete message from ${msg.contactName}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

const STATUS_TABS: { key: ThreadStatus; label: string }[] = [
  { key: "active", label: "Active" },
  { key: "completed", label: "Completed" },
  { key: "archived", label: "Archived" },
];

export function ThreadView({ userId, filterUnread, filterRequiresAction, statusFilter, onStatusChange, userRole, isSelecting, selectedIds, onToggleSelect }: ThreadViewProps) {
  const [expandedThread, setExpandedThread] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [allThreads, setAllThreads] = useState<any[]>([]);
  const [exportingThreadId, setExportingThreadId] = useState<string | null>(null);

  const data = useQuery(api.communications.getThreadedView, {
    userId: userId as Id<"users">,
    limit: 20,
    cursor,
    filterUnread,
    filterRequiresAction,
    statusFilter: statusFilter || "active",
  });

  const markRead = useMutation(api.communications.markThreadRead);
  const updateThreadStatus = useMutation(api.communications.updateThreadStatus);

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

  const handleThreadStatusUpdate = useCallback(
    async (threadId: string, status: "active" | "completed" | "archived") => {
      try {
        await updateThreadStatus({
          userId: userId as Id<"users">,
          threadId,
          status,
        });
      } catch (error) {
        console.error("Failed to update thread status:", error);
      }
    },
    [updateThreadStatus, userId]
  );

  const handleExportPdf = useCallback(
    async (thread: any) => {
      setExportingThreadId(thread.threadId);
      try {
        // Fetch the thread messages for the export
        // We use the thread data we already have plus the expanded messages data
        // The messages are available from the ThreadMessages sub-component query,
        // but we need to fetch them directly for the PDF export
        const exportData = {
          thread: {
            subject: thread.subject || "Untitled Thread",
            status: thread.status,
            participantNames: thread.participantNames,
            lastContactName: thread.participantNames?.[0],
            messageCount: thread.messageCount,
          },
          communications: (thread.messages || []).map((msg: any) => ({
            contactName: msg.contactName || "Unknown",
            type: msg.type || "other",
            direction: msg.direction || "received",
            subject: msg.subject,
            content: msg.summary || msg.content || "",
            date: msg.communicationDate || "",
            time: msg.communicationTime,
            complianceCategory: msg.complianceCategory,
            complianceFlags: msg.complianceFlags,
            contactType: msg.contactType,
          })),
          organization: { name: "MySDAManager" },
          exportedAt: new Date().toISOString(),
        };

        // If no messages are available from the thread object (they come from expanded view),
        // generate with what we have - the subject and metadata
        if (exportData.communications.length === 0) {
          exportData.communications = [{
            contactName: thread.participantNames?.[0] || "Unknown",
            type: "other",
            direction: "received",
            subject: thread.subject || "Untitled Thread",
            content: thread.previewText || "No message content available. Expand the thread first to load messages.",
            date: new Date(thread.lastActivityAt).toISOString().split("T")[0],
            complianceCategory: undefined,
            complianceFlags: undefined,
            contactType: undefined,
          }];
        }

        await exportThreadToPdf(exportData);
      } catch (error) {
        console.error("Failed to export thread PDF:", error);
      } finally {
        setExportingThreadId(null);
      }
    },
    []
  );

  if (!data) {
    return <LoadingScreen fullScreen={false} message="Loading threads..." />;
  }

  return (
    <div
      role="tabpanel"
      id="panel-thread"
      aria-labelledby="tab-thread"
    >
      {/* Status filter tabs - always visible so user can switch back */}
      <div
        role="radiogroup"
        aria-label="Thread status filter"
        className="flex gap-1 mb-4 bg-gray-800 rounded-lg p-1"
      >
        {STATUS_TABS.map((tab) => {
          const isActive = (statusFilter || "active") === tab.key;
          return (
            <button
              key={tab.key}
              role="radio"
              aria-checked={isActive}
              onClick={() => {
                onStatusChange?.(tab.key as "active" | "completed" | "archived");
                setCursor(undefined);
                setAllThreads([]);
              }}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
                isActive
                  ? "bg-teal-700 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {threads.length === 0 ? (
        <EmptyState
          title="No threads found"
          description={
            filterUnread
              ? "All caught up! No unread threads."
              : filterRequiresAction
                ? "No threads requiring action."
                : statusFilter === "completed"
                  ? "No completed threads yet. Mark active threads as complete to see them here."
                  : statusFilter === "archived"
                    ? "No archived threads. Archive threads you no longer need to see them here."
                    : "Start a conversation to see threads here."
          }
          isFiltered={!!filterUnread || !!filterRequiresAction || (!!statusFilter && statusFilter !== "active")}
          icon={
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          }
        />
      ) : (
      <>
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
                thread.hasUnread ? "border-l-4 border-teal-600" : "border-l-4 border-transparent"
              }`}
            >
              <div className="flex items-start">
                {isSelecting && onToggleSelect && (
                  <div className="flex items-center pl-3 pt-4">
                    <input
                      type="checkbox"
                      checked={selectedIds?.has(thread.threadId) || false}
                      onChange={() => onToggleSelect(thread.threadId)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-4 h-4 rounded border-gray-500 bg-gray-700 text-teal-700 focus:ring-teal-600 focus:ring-offset-0 cursor-pointer"
                      aria-label={`Select thread: ${thread.subject || "Untitled Thread"}`}
                    />
                  </div>
                )}
              <button
                onClick={() => handleExpand(thread.threadId)}
                onKeyDown={(e) => {
                  if (e.key === "Escape" && isExpanded) {
                    setExpandedThread(null);
                  }
                }}
                aria-expanded={isExpanded}
                aria-label={`${isExpanded ? "Collapse" : "Expand"} thread: ${thread.subject || "Untitled Thread"}, ${thread.messageCount} messages, ${thread.hasUnread ? "unread" : "read"}`}
                className="flex-1 text-left p-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 rounded-lg"
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
                      {thread.status === "completed" && (
                        <Badge variant="success" size="xs">Completed</Badge>
                      )}
                      {thread.status === "archived" && (
                        <Badge variant="neutral" size="xs">Archived</Badge>
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

              </div>
              {/* Expanded messages */}
              {isExpanded && (
                <div className="px-4 pb-4" role="region" aria-label={`Messages in thread: ${thread.subject || "Untitled Thread"}`}>
                  <ThreadMessages threadId={thread.threadId} userId={userId} userRole={userRole} />
                  <div className="mt-3 pt-3 border-t border-gray-700 flex flex-wrap items-center gap-2">
                    <Link
                      href={buildThreadAddEntryUrl(thread)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white text-sm rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add Entry
                    </Link>

                    {/* Export PDF */}
                    <button
                      onClick={() => handleExportPdf(thread)}
                      disabled={exportingThreadId === thread.threadId}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 disabled:opacity-50"
                      aria-label={`Export thread "${thread.subject || "Untitled Thread"}" as PDF`}
                    >
                      {exportingThreadId === thread.threadId ? (
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      )}
                      {exportingThreadId === thread.threadId ? "Exporting..." : "Export PDF"}
                    </button>

                    {/* Thread status actions */}
                    {(!thread.status || thread.status === "active") && (
                      <>
                        <button
                          onClick={() => handleThreadStatusUpdate(thread.threadId, "completed")}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
                          aria-label={`Mark thread "${thread.subject || "Untitled Thread"}" as completed`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Complete
                        </button>
                        <button
                          onClick={() => handleThreadStatusUpdate(thread.threadId, "archived")}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
                          aria-label={`Archive thread "${thread.subject || "Untitled Thread"}"`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                          </svg>
                          Archive
                        </button>
                      </>
                    )}
                    {(thread.status === "completed" || thread.status === "archived") && (
                      <button
                        onClick={() => handleThreadStatusUpdate(thread.threadId, "active")}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white text-sm rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                        aria-label={`Reactivate thread "${thread.subject || "Untitled Thread"}"`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Reactivate
                      </button>
                    )}
                  </div>
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
            className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
          >
            Load More Threads
          </button>
        </div>
      )}
      </>
      )}
    </div>
  );
}

export default ThreadView;
