"use client";

import { useState, useRef, useEffect } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import Link from "next/link";
import Header from "@/components/Header";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/hooks/useAuth";
import Badge from "@/components/ui/Badge";
import {
  ArrowLeft,
  Clock,
  AlertCircle,
  Send,
  Loader2,
  ImageIcon,
  ExternalLink,
  Info,
} from "lucide-react";

// ── Status & severity configs ────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { variant: "error" | "warning" | "info" | "success" | "neutral"; label: string }> = {
  open: { variant: "error", label: "Open" },
  in_progress: { variant: "warning", label: "In Progress" },
  waiting_on_customer: { variant: "info", label: "Waiting on You" },
  resolved: { variant: "success", label: "Resolved" },
  closed: { variant: "neutral", label: "Closed" },
};

const SEVERITY_CONFIG: Record<string, { variant: "error" | "warning" | "info" | "neutral"; label: string }> = {
  critical: { variant: "error", label: "Critical" },
  high: { variant: "warning", label: "High" },
  normal: { variant: "info", label: "Normal" },
  low: { variant: "neutral", label: "Low" },
};

const CATEGORY_LABELS: Record<string, string> = {
  bug: "Bug Report",
  how_to: "How-to Question",
  feature_request: "Feature Request",
  billing: "Billing",
  data_issue: "Data Issue",
  other: "Other",
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatSlaCountdown(slaDeadline: number): { text: string; color: string } {
  const now = Date.now();
  const diff = slaDeadline - now;

  if (diff <= 0) {
    const overdue = Math.abs(diff);
    const hours = Math.floor(overdue / (1000 * 60 * 60));
    const minutes = Math.floor((overdue % (1000 * 60 * 60)) / (1000 * 60));
    return {
      text: `Overdue by ${hours}h ${minutes}m`,
      color: "text-red-400",
    };
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours < 4) {
    return {
      text: `${hours}h ${minutes}m remaining`,
      color: "text-yellow-400",
    };
  }

  return {
    text: `${hours}h ${minutes}m remaining`,
    color: "text-green-400",
  };
}

// ── Loading skeleton ─────────────────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <div className="h-6 bg-gray-700 rounded w-48 mb-3" />
        <div className="h-8 bg-gray-700 rounded w-3/4 mb-4" />
        <div className="flex gap-2">
          <div className="h-6 bg-gray-700 rounded-full w-20" />
          <div className="h-6 bg-gray-700 rounded-full w-20" />
        </div>
      </div>
      <div className="space-y-4">
        <div className="h-20 bg-gray-800 border border-gray-700 rounded-lg" />
        <div className="h-20 bg-gray-800 border border-gray-700 rounded-lg" />
      </div>
    </div>
  );
}

// ── Main page component ──────────────────────────────────────────────────────

export default function SupportTicketDetailPage() {
  const params = useParams();
  const { user } = useAuth();
  const id = params.id as string;

  const [replyText, setReplyText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [replyError, setReplyError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const ticket = useQuery(
    api.supportTickets.getById,
    user ? { userId: user.id as Id<"users">, ticketId: id as Id<"supportTickets"> } : "skip"
  );

  const addMessage = useMutation(api.supportTickets.addMessage);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (ticket?.messages) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [ticket?.messages?.length]);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !replyText.trim()) return;

    setIsSending(true);
    setReplyError("");

    try {
      await addMessage({
        userId: user.id as Id<"users">,
        ticketId: id as Id<"supportTickets">,
        message: replyText.trim(),
      });
      setReplyText("");
    } catch (err) {
      setReplyError(err instanceof Error ? err.message : "Failed to send reply. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const statusCfg = ticket ? (STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open) : STATUS_CONFIG.open;
  const severityCfg = ticket ? (SEVERITY_CONFIG[ticket.severity] || SEVERITY_CONFIG.normal) : SEVERITY_CONFIG.normal;
  const categoryLabel = ticket ? (CATEGORY_LABELS[ticket.category] || ticket.category) : "";
  const isClosedOrResolved = ticket?.status === "resolved" || ticket?.status === "closed";
  const sla = ticket ? formatSlaCountdown(ticket.slaDeadline) : null;

  return (
    <RequireAuth>
      <div className="min-h-screen bg-gray-900">
        <Header currentPage="support" />

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Breadcrumb */}
          <nav className="mb-6" aria-label="Breadcrumb">
            <ol className="flex items-center gap-2 text-sm">
              <li>
                <Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors">
                  Dashboard
                </Link>
              </li>
              <li className="text-gray-400" aria-hidden="true">/</li>
              <li>
                <Link href="/support" className="text-gray-400 hover:text-white transition-colors">
                  Support Tickets
                </Link>
              </li>
              <li className="text-gray-400" aria-hidden="true">/</li>
              <li className="text-white">{ticket?.ticketNumber || "..."}</li>
            </ol>
          </nav>

          {/* Back link */}
          <Link
            href="/support"
            className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Back to tickets
          </Link>

          {/* Loading state */}
          {ticket === undefined && <DetailSkeleton />}

          {/* Not found */}
          {ticket === null && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <AlertCircle className="w-12 h-12 text-gray-400 mb-4" aria-hidden="true" />
              <h2 className="text-lg font-semibold text-white mb-1">Ticket not found</h2>
              <p className="text-gray-400 text-sm">
                This ticket may have been removed or you may not have access to it.
              </p>
            </div>
          )}

          {/* Ticket content */}
          {ticket && (
            <div className="space-y-6">
              {/* Ticket header card */}
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-5">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-sm font-mono text-teal-400">{ticket.ticketNumber}</span>
                      <Badge variant={statusCfg.variant} size="sm" dot>{statusCfg.label}</Badge>
                      <Badge variant={severityCfg.variant} size="sm">{severityCfg.label}</Badge>
                    </div>
                    <h1 className="text-xl font-bold text-white">{ticket.subject}</h1>
                  </div>
                </div>

                {/* Metadata grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-gray-400">
                    <span className="font-medium text-gray-300">Category:</span>
                    {categoryLabel}
                  </div>
                  <div className="flex items-center gap-2 text-gray-400">
                    <span className="font-medium text-gray-300">Created by:</span>
                    {ticket.creatorName}
                  </div>
                  <div className="flex items-center gap-2 text-gray-400">
                    <Clock className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                    <span className="font-medium text-gray-300">Created:</span>
                    {formatDateTime(ticket.createdAt)}
                  </div>
                  {ticket.assignedTo && (
                    <div className="flex items-center gap-2 text-gray-400">
                      <span className="font-medium text-gray-300">Assigned to:</span>
                      {ticket.assignedTo}
                    </div>
                  )}
                </div>

                {/* SLA indicator */}
                {!isClosedOrResolved && sla && (
                  <div className={`flex items-center gap-2 mt-4 text-sm ${sla.color}`}>
                    <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                    <span className="font-medium">SLA Response: {sla.text}</span>
                  </div>
                )}
                {isClosedOrResolved && ticket.resolvedAt && (
                  <div className="flex items-center gap-2 mt-4 text-sm text-green-400">
                    <Info className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                    <span className="font-medium">Resolved {formatDateTime(ticket.resolvedAt)}</span>
                  </div>
                )}

                {/* Screenshot preview */}
                {ticket.screenshotUrl && (
                  <div className="mt-4 border-t border-gray-700 pt-4">
                    <p className="text-sm font-medium text-gray-300 mb-2">Attached Screenshot</p>
                    <a
                      href={ticket.screenshotUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg overflow-hidden border border-gray-600 inline-block hover:border-gray-500 transition-colors cursor-pointer"
                    >
                      <img
                        src={ticket.screenshotUrl}
                        alt="Screenshot attached to ticket"
                        className="max-h-64 w-auto object-contain bg-gray-900"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                          const fallback = (e.target as HTMLImageElement).nextElementSibling;
                          if (fallback) (fallback as HTMLElement).style.display = "flex";
                        }}
                      />
                      <div className="hidden items-center gap-2 p-4 text-gray-400">
                        <ImageIcon className="w-5 h-5" aria-hidden="true" />
                        <span className="text-sm">Click to view screenshot in new tab</span>
                        <ExternalLink className="w-4 h-4 ml-auto" aria-hidden="true" />
                      </div>
                    </a>
                  </div>
                )}
              </div>

              {/* Description message (initial ticket body) */}
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-5">
                <h2 className="text-sm font-semibold text-gray-300 mb-3">Description</h2>
                <p className="text-gray-200 whitespace-pre-wrap text-sm leading-relaxed">
                  {ticket.description}
                </p>
              </div>

              {/* Message thread */}
              <div>
                <h2 className="text-lg font-semibold text-white mb-4">
                  Messages ({ticket.messages.length})
                </h2>

                {ticket.messages.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-400 text-sm">No messages yet. Start the conversation below.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {ticket.messages.map((msg) => {
                      const isCustomer = msg.authorRole === "customer";
                      const isSystem = msg.authorRole === "system";

                      if (isSystem) {
                        return (
                          <div key={msg._id} className="flex justify-center">
                            <div className="bg-gray-800/50 border border-gray-700 rounded-full px-4 py-1.5 max-w-md text-center">
                              <p className="text-xs text-gray-400 italic">{msg.message}</p>
                              <p className="text-[10px] text-gray-400 mt-0.5">
                                {formatRelativeTime(msg.createdAt)}
                              </p>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={msg._id}
                          className={`flex ${isCustomer ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`
                              max-w-[80%] sm:max-w-[70%] rounded-xl px-4 py-3
                              ${isCustomer
                                ? "bg-teal-600/20 border border-teal-600/30"
                                : "bg-gray-800 border border-gray-700"
                              }
                            `}
                          >
                            {/* Author info */}
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="text-sm font-medium text-white">{msg.authorName}</span>
                              <Badge
                                variant={isCustomer ? "info" : "purple"}
                                size="xs"
                              >
                                {isCustomer ? "You" : "Support"}
                              </Badge>
                            </div>

                            {/* Message text */}
                            <p className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">
                              {msg.message}
                            </p>

                            {/* Attachment */}
                            {msg.attachmentUrl && (
                              <div className="mt-2">
                                <a
                                  href={msg.attachmentUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 text-xs text-teal-400 hover:text-teal-300 transition-colors"
                                >
                                  <ImageIcon className="w-3.5 h-3.5" aria-hidden="true" />
                                  View attachment
                                  <ExternalLink className="w-3 h-3" aria-hidden="true" />
                                </a>
                              </div>
                            )}

                            {/* Timestamp */}
                            <p className={`text-[11px] mt-1.5 ${isCustomer ? "text-teal-400/60" : "text-gray-400"}`}>
                              {formatRelativeTime(msg.createdAt)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} aria-hidden="true" />
                  </div>
                )}
              </div>

              {/* Reply form */}
              {!isClosedOrResolved ? (
                <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                  <form onSubmit={handleSendReply} className="space-y-3">
                    {replyError && (
                      <div className="p-3 bg-red-900/50 border border-red-600 rounded-lg text-red-200 text-sm">
                        {replyError}
                      </div>
                    )}

                    <div>
                      <label htmlFor="reply-message" className="sr-only">Reply message</label>
                      <textarea
                        id="reply-message"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        rows={3}
                        placeholder="Type your reply..."
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:border-teal-500 transition-colors resize-none"
                      />
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={isSending || !replyText.trim()}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
                      >
                        {isSending ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4" aria-hidden="true" />
                            Send Reply
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 text-center">
                  <p className="text-sm text-gray-400">
                    This ticket has been {ticket.status === "resolved" ? "resolved" : "closed"}.
                    If you need further help, please open a new ticket.
                  </p>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </RequireAuth>
  );
}
