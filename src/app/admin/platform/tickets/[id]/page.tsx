"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";
import Link from "next/link";
import { useParams } from "next/navigation";
import Header from "../../../../../components/Header";
import { RequireAuth } from "../../../../../components/RequireAuth";
import { useAuth } from "../../../../../hooks/useAuth";
import Badge from "../../../../../components/ui/Badge";
import {
  ArrowLeft,
  ShieldCheck,
  Clock,
  Send,
  User,
  Building2,
  Globe,
  Monitor,
  Calendar,
  AlertTriangle,
  CheckCircle,
  UserCheck,
  Tag,
  Paperclip,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Helper: format relative time
// ---------------------------------------------------------------------------

function timeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (seconds < 60) return "just now";
  if (minutes === 1) return "1 minute ago";
  if (minutes < 60) return `${minutes} minutes ago`;
  if (hours === 1) return "1 hour ago";
  if (hours < 24) return `${hours} hours ago`;
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
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

function formatTimeRemaining(deadline: number): string {
  const now = Date.now();
  const diff = deadline - now;

  if (diff <= 0) {
    const overdue = Math.abs(diff);
    const hours = Math.floor(overdue / 3600000);
    const minutes = Math.floor((overdue % 3600000) / 60000);
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h overdue`;
    }
    return `${hours}h ${minutes}m overdue`;
  }

  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h remaining`;
  }
  return `${hours}h ${minutes}m remaining`;
}

// ---------------------------------------------------------------------------
// Severity badge
// ---------------------------------------------------------------------------

function SeverityBadge({ severity }: { severity: string }) {
  const config: Record<
    string,
    { variant: "error" | "warning" | "info" | "neutral"; label: string }
  > = {
    critical: { variant: "error", label: "Critical" },
    high: { variant: "warning", label: "High" },
    normal: { variant: "info", label: "Normal" },
    low: { variant: "neutral", label: "Low" },
  };

  const { variant, label } = config[severity] || config.normal;

  return (
    <Badge variant={variant} size="sm">
      {label}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Status badge (large variant for sidebar)
// ---------------------------------------------------------------------------

function StatusBadgeLarge({ status }: { status: string }) {
  const config: Record<string, { className: string; label: string }> = {
    open: {
      className: "bg-red-600 text-white",
      label: "Open",
    },
    in_progress: {
      className: "bg-yellow-600 text-white",
      label: "In Progress",
    },
    waiting_on_customer: {
      className: "bg-blue-600 text-white",
      label: "Waiting on Customer",
    },
    resolved: {
      className: "bg-green-600 text-white",
      label: "Resolved",
    },
    closed: {
      className: "bg-gray-600 text-white",
      label: "Closed",
    },
  };

  const { className, label } = config[status] || config.open;

  return (
    <span
      className={`inline-flex items-center px-3 py-1 text-sm font-semibold rounded-lg ${className}`}
    >
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Role badge for message authors
// ---------------------------------------------------------------------------

function AuthorRoleBadge({ role }: { role: string }) {
  const config: Record<string, { variant: "purple" | "info" | "neutral"; label: string }> = {
    admin: { variant: "purple", label: "Admin" },
    customer: { variant: "info", label: "Customer" },
    system: { variant: "neutral", label: "System" },
  };

  const { variant, label } = config[role] || config.customer;

  return (
    <Badge variant={variant} size="xs">
      {label}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// SLA color helper
// ---------------------------------------------------------------------------

function getSlaColor(slaDeadline: number): string {
  const now = Date.now();
  const remaining = slaDeadline - now;
  const fourHours = 4 * 60 * 60 * 1000;

  if (remaining <= 0) return "text-red-400";
  if (remaining < fourHours) return "text-yellow-400";
  return "text-green-400";
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function DetailSkeleton() {
  return (
    <div className="min-h-screen bg-gray-900">
      <Header currentPage="admin" />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-5 w-48 bg-gray-700 rounded" />
          <div className="h-8 w-96 bg-gray-700 rounded" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-gray-800 rounded-lg p-6 h-32" />
              <div className="bg-gray-800 rounded-lg p-6 h-32" />
              <div className="bg-gray-800 rounded-lg p-6 h-32" />
            </div>
            <div className="space-y-4">
              <div className="bg-gray-800 rounded-lg p-6 h-48" />
              <div className="bg-gray-800 rounded-lg p-6 h-48" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page export
// ---------------------------------------------------------------------------

export default function TicketDetailPage() {
  return (
    <RequireAuth allowedRoles={["admin"]}>
      <TicketDetailContent />
    </RequireAuth>
  );
}

// ---------------------------------------------------------------------------
// Page content
// ---------------------------------------------------------------------------

function TicketDetailContent() {
  const { user } = useAuth();
  const params = useParams();
  const ticketId = params.id as string;
  const userId = user ? (user.id as Id<"users">) : undefined;

  // Super-admin check
  const dbUser = useQuery(api.auth.getUser, userId ? { userId } : "skip");
  const isSuperAdmin = dbUser?.isSuperAdmin === true;

  // Ticket data query
  const ticket = useQuery(
    api.supportTickets.getById,
    userId && isSuperAdmin && ticketId
      ? { userId, ticketId: ticketId as Id<"supportTickets"> }
      : "skip"
  );

  // Mutations
  const addMessage = useMutation(api.supportTickets.addMessage);
  const updateStatus = useMutation(api.supportTickets.updateStatus);
  const assignTicket = useMutation(api.supportTickets.assignTicket);

  // Local state
  const [replyMessage, setReplyMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of messages when ticket loads or new messages arrive
  useEffect(() => {
    if (ticket?.messages) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [ticket?.messages?.length]);

  // Sync the status dropdown to the current ticket status
  useEffect(() => {
    if (ticket && !newStatus) {
      setNewStatus(ticket.status);
    }
  }, [ticket, newStatus]);

  // ---- Handlers ----

  const handleSendReply = useCallback(async () => {
    if (!userId || !replyMessage.trim() || isSending) return;

    try {
      setIsSending(true);
      await addMessage({
        userId,
        ticketId: ticketId as Id<"supportTickets">,
        message: replyMessage.trim(),
      });
      setReplyMessage("");
    } catch (err) {
      console.error("Failed to send reply:", err);
    } finally {
      setIsSending(false);
    }
  }, [userId, ticketId, replyMessage, isSending, addMessage]);

  const handleUpdateStatus = useCallback(async () => {
    if (!userId || !newStatus || isUpdatingStatus) return;

    try {
      setIsUpdatingStatus(true);
      await updateStatus({
        userId,
        ticketId: ticketId as Id<"supportTickets">,
        status: newStatus as
          | "open"
          | "in_progress"
          | "waiting_on_customer"
          | "resolved"
          | "closed",
      });
    } catch (err) {
      console.error("Failed to update status:", err);
    } finally {
      setIsUpdatingStatus(false);
    }
  }, [userId, ticketId, newStatus, isUpdatingStatus, updateStatus]);

  const handleAssignToMe = useCallback(async () => {
    if (!userId || !user || isAssigning) return;

    try {
      setIsAssigning(true);
      await assignTicket({
        userId,
        ticketId: ticketId as Id<"supportTickets">,
        assignedTo: `${user.firstName} ${user.lastName}`,
      });
    } catch (err) {
      console.error("Failed to assign ticket:", err);
    } finally {
      setIsAssigning(false);
    }
  }, [userId, user, ticketId, isAssigning, assignTicket]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSendReply();
      }
    },
    [handleSendReply]
  );

  // ---- Access denied state ----
  if (dbUser !== undefined && !isSuperAdmin) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header currentPage="admin" />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col items-center justify-center py-24">
            <div className="p-4 bg-red-600/20 rounded-full mb-4">
              <ShieldCheck
                className="w-10 h-10 text-red-400"
                aria-hidden="true"
              />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">
              Access Denied
            </h1>
            <p className="text-gray-400 text-center max-w-md">
              This page is restricted to platform super-administrators.
            </p>
            <Link
              href="/dashboard"
              className="mt-6 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
            >
              Return to Dashboard
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // ---- Loading state ----
  if (!ticket) {
    return <DetailSkeleton />;
  }

  // Category label formatter
  const categoryLabel = ticket.category
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c: string) => c.toUpperCase());

  return (
    <div className="min-h-screen bg-gray-900">
      <Header currentPage="admin" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back link */}
        <Link
          href="/admin/platform/tickets"
          className="inline-flex items-center gap-1.5 text-sm text-teal-400 hover:text-teal-300 transition-colors mb-6 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Back to Tickets
        </Link>

        {/* Ticket header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <span className="text-sm font-mono text-teal-400 font-semibold">
              {ticket.ticketNumber}
            </span>
            <SeverityBadge severity={ticket.severity} />
          </div>
          <h1 className="text-2xl font-bold text-white">{ticket.subject}</h1>
        </div>

        {/* 2-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ====== Main content (left) ====== */}
          <div className="lg:col-span-2 space-y-6">
            {/* Initial description */}
            <section
              className="bg-gray-800 border border-gray-700 rounded-lg p-5"
              aria-labelledby="description-heading"
            >
              <h2
                id="description-heading"
                className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3"
              >
                Description
              </h2>
              <p className="text-gray-300 whitespace-pre-wrap text-sm leading-relaxed">
                {ticket.description}
              </p>
              {ticket.screenshotStorageId && (
                <div className="mt-4">
                  <p className="text-xs text-gray-400 mb-2 flex items-center gap-1">
                    <Paperclip className="w-3 h-3" aria-hidden="true" />
                    Attached Screenshot
                  </p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`${process.env.NEXT_PUBLIC_CONVEX_URL}/api/storage/${ticket.screenshotStorageId}`}
                    alt="Screenshot attached to ticket"
                    className="max-w-full rounded-lg border border-gray-700"
                  />
                </div>
              )}
            </section>

            {/* Message thread */}
            <section
              className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden"
              aria-labelledby="messages-heading"
            >
              <div className="px-5 py-4 border-b border-gray-700">
                <h2
                  id="messages-heading"
                  className="text-sm font-semibold text-gray-300 uppercase tracking-wider"
                >
                  Messages ({ticket.messages.length})
                </h2>
              </div>

              <div className="p-5 space-y-4 max-h-[600px] overflow-y-auto">
                {ticket.messages.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-8">
                    No messages yet. Send the first reply below.
                  </p>
                ) : (
                  ticket.messages.map((msg) => {
                    // System messages
                    if (msg.authorRole === "system") {
                      return (
                        <div
                          key={msg._id}
                          className="flex justify-center"
                        >
                          <div className="px-3 py-1.5 text-xs text-gray-400 italic bg-gray-700/50 rounded-full max-w-md text-center">
                            {msg.message}
                            <span className="block text-gray-500 mt-0.5">
                              {timeAgo(msg.createdAt)}
                            </span>
                          </div>
                        </div>
                      );
                    }

                    // Customer messages (right-aligned)
                    if (msg.authorRole === "customer") {
                      return (
                        <div
                          key={msg._id}
                          className="flex justify-end"
                        >
                          <div className="max-w-[80%]">
                            <div className="flex items-center gap-2 justify-end mb-1">
                              <span className="text-xs text-gray-400">
                                {timeAgo(msg.createdAt)}
                              </span>
                              <AuthorRoleBadge role={msg.authorRole} />
                              <span className="text-sm font-medium text-white">
                                {msg.authorName}
                              </span>
                            </div>
                            <div className="bg-teal-600/20 border border-teal-600/30 rounded-lg px-4 py-3">
                              <p className="text-sm text-gray-200 whitespace-pre-wrap">
                                {msg.message}
                              </p>
                              {msg.attachmentStorageId && (
                                <div className="mt-2 pt-2 border-t border-teal-600/20">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={`${process.env.NEXT_PUBLIC_CONVEX_URL}/api/storage/${msg.attachmentStorageId}`}
                                    alt="Attachment"
                                    className="max-w-full max-h-48 rounded border border-gray-700"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // Admin messages (left-aligned)
                    return (
                      <div key={msg._id} className="flex justify-start">
                        <div className="max-w-[80%]">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-white">
                              {msg.authorName}
                            </span>
                            <AuthorRoleBadge role={msg.authorRole} />
                            <span className="text-xs text-gray-400">
                              {timeAgo(msg.createdAt)}
                            </span>
                          </div>
                          <div className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-3">
                            <p className="text-sm text-gray-200 whitespace-pre-wrap">
                              {msg.message}
                            </p>
                            {msg.attachmentStorageId && (
                              <div className="mt-2 pt-2 border-t border-gray-600">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={`${process.env.NEXT_PUBLIC_CONVEX_URL}/api/storage/${msg.attachmentStorageId}`}
                                  alt="Attachment"
                                  className="max-w-full max-h-48 rounded border border-gray-700"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply form */}
              <div className="px-5 py-4 border-t border-gray-700 bg-gray-800/50">
                <label htmlFor="reply-message" className="sr-only">
                  Reply message
                </label>
                <textarea
                  id="reply-message"
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your reply... (Ctrl+Enter to send)"
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                />
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-gray-400">
                    Replying as admin
                  </span>
                  <button
                    onClick={handleSendReply}
                    disabled={!replyMessage.trim() || isSending}
                    className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 min-h-[40px] ${
                      !replyMessage.trim() || isSending
                        ? "opacity-50 cursor-not-allowed"
                        : ""
                    }`}
                  >
                    {isSending ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" aria-hidden="true" />
                        Reply as Admin
                      </>
                    )}
                  </button>
                </div>
              </div>
            </section>
          </div>

          {/* ====== Sidebar (right) ====== */}
          <div className="space-y-6">
            {/* Status section */}
            <section
              className="bg-gray-800 border border-gray-700 rounded-lg p-5"
              aria-labelledby="status-heading"
            >
              <h2
                id="status-heading"
                className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3"
              >
                Status
              </h2>
              <div className="mb-4">
                <StatusBadgeLarge status={ticket.status} />
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  aria-label="Change ticket status"
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="waiting_on_customer">Waiting on Customer</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
                <button
                  onClick={handleUpdateStatus}
                  disabled={
                    newStatus === ticket.status || isUpdatingStatus
                  }
                  className={`px-3 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
                    newStatus === ticket.status || isUpdatingStatus
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }`}
                >
                  {isUpdatingStatus ? "..." : "Update"}
                </button>
              </div>
            </section>

            {/* Severity & Category */}
            <section
              className="bg-gray-800 border border-gray-700 rounded-lg p-5"
              aria-labelledby="details-heading"
            >
              <h2
                id="details-heading"
                className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3"
              >
                Details
              </h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                    Severity
                  </span>
                  <SeverityBadge severity={ticket.severity} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5" aria-hidden="true" />
                    Category
                  </span>
                  <span className="text-sm text-white">{categoryLabel}</span>
                </div>
              </div>
            </section>

            {/* SLA section */}
            <section
              className="bg-gray-800 border border-gray-700 rounded-lg p-5"
              aria-labelledby="sla-heading"
            >
              <h2
                id="sla-heading"
                className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3"
              >
                SLA
              </h2>
              <div className="space-y-3">
                <div>
                  <span className="text-xs text-gray-400 block mb-1">
                    Deadline
                  </span>
                  <span className="text-sm text-white">
                    {formatDateTime(ticket.slaDeadline)}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-gray-400 block mb-1">
                    Time Remaining
                  </span>
                  <span
                    className={`text-sm font-semibold ${getSlaColor(ticket.slaDeadline)}`}
                  >
                    {ticket.status === "resolved" || ticket.status === "closed" ? (
                      <span className="flex items-center gap-1 text-green-400">
                        <CheckCircle className="w-4 h-4" aria-hidden="true" />
                        Resolved
                      </span>
                    ) : (
                      formatTimeRemaining(ticket.slaDeadline)
                    )}
                  </span>
                </div>
                {ticket.firstResponseAt && (
                  <div>
                    <span className="text-xs text-gray-400 block mb-1">
                      First Response
                    </span>
                    <span className="text-sm text-white">
                      {formatDateTime(ticket.firstResponseAt)}
                    </span>
                    <span className="block text-xs text-gray-400 mt-0.5">
                      {timeAgo(ticket.firstResponseAt)}
                    </span>
                  </div>
                )}
              </div>
            </section>

            {/* Organization section */}
            <section
              className="bg-gray-800 border border-gray-700 rounded-lg p-5"
              aria-labelledby="org-heading"
            >
              <h2
                id="org-heading"
                className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3"
              >
                Organization
              </h2>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Building2
                    className="w-4 h-4 text-gray-400 flex-shrink-0"
                    aria-hidden="true"
                  />
                  <Link
                    href={`/admin/platform/${ticket.organizationId}`}
                    className="text-sm text-teal-400 hover:text-teal-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded"
                  >
                    {ticket.organizationName}
                  </Link>
                </div>
                <div className="flex items-start gap-2">
                  <User
                    className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                  <div>
                    <span className="text-sm text-white block">
                      {ticket.creatorName}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* Assignment section */}
            <section
              className="bg-gray-800 border border-gray-700 rounded-lg p-5"
              aria-labelledby="assignment-heading"
            >
              <h2
                id="assignment-heading"
                className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3"
              >
                Assignment
              </h2>
              {ticket.assignedTo ? (
                <div className="flex items-center gap-2 mb-3">
                  <UserCheck
                    className="w-4 h-4 text-teal-400"
                    aria-hidden="true"
                  />
                  <span className="text-sm text-white">
                    {ticket.assignedTo}
                  </span>
                </div>
              ) : (
                <p className="text-sm text-gray-400 mb-3">Unassigned</p>
              )}
              <button
                onClick={handleAssignToMe}
                disabled={isAssigning}
                className={`w-full px-3 py-2 text-sm font-medium text-white bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
                  isAssigning ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {isAssigning ? "Assigning..." : "Assign to Me"}
              </button>
            </section>

            {/* Context section */}
            <section
              className="bg-gray-800 border border-gray-700 rounded-lg p-5"
              aria-labelledby="context-heading"
            >
              <h2
                id="context-heading"
                className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3"
              >
                Context
              </h2>
              <div className="space-y-3">
                {ticket.pageUrl && (
                  <div>
                    <span className="text-xs text-gray-400 flex items-center gap-1 mb-1">
                      <Globe className="w-3 h-3" aria-hidden="true" />
                      Page URL
                    </span>
                    <a
                      href={ticket.pageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-teal-400 hover:text-teal-300 transition-colors break-all focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded"
                    >
                      {ticket.pageUrl}
                    </a>
                  </div>
                )}
                {ticket.browserInfo && (
                  <div>
                    <span className="text-xs text-gray-400 flex items-center gap-1 mb-1">
                      <Monitor className="w-3 h-3" aria-hidden="true" />
                      Browser
                    </span>
                    <span className="text-sm text-gray-300 break-all">
                      {ticket.browserInfo}
                    </span>
                  </div>
                )}
                <div>
                  <span className="text-xs text-gray-400 flex items-center gap-1 mb-1">
                    <Calendar className="w-3 h-3" aria-hidden="true" />
                    Created
                  </span>
                  <span className="text-sm text-white">
                    {formatDateTime(ticket.createdAt)}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-gray-400 flex items-center gap-1 mb-1">
                    <Clock className="w-3 h-3" aria-hidden="true" />
                    Last Updated
                  </span>
                  <span className="text-sm text-white">
                    {formatDateTime(ticket.updatedAt)}
                  </span>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
