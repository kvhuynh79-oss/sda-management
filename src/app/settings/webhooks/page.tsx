"use client";

import { useEffect, useState, useMemo } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import Header from "@/components/Header";
import Link from "next/link";
import { RequireAuth } from "@/components/RequireAuth";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";

// ============================================================================
// Types
// ============================================================================

interface WebhookRecord {
  _id: Id<"webhooks">;
  url: string;
  events: string[];
  isActive: boolean;
  description?: string;
  createdAt: number;
  createdBy: Id<"users">;
  lastTriggeredAt?: number;
  failureCount: number;
  lastError?: string;
}

interface DeliveryRecord {
  _id: Id<"webhookDeliveries">;
  webhookId: Id<"webhooks">;
  event: string;
  payload: string;
  statusCode?: number;
  response?: string;
  success: boolean;
  attemptCount: number;
  error?: string;
  duration?: number;
  createdAt: number;
}

// ============================================================================
// Event Type Definitions
// ============================================================================

const EVENT_GROUPS = [
  {
    group: "Participants",
    events: [
      { value: "participant.created", label: "Created" },
      { value: "participant.updated", label: "Updated" },
    ],
  },
  {
    group: "Maintenance",
    events: [
      { value: "maintenance.created", label: "Created" },
      { value: "maintenance.updated", label: "Updated" },
      { value: "maintenance.completed", label: "Completed" },
    ],
  },
  {
    group: "Incidents",
    events: [
      { value: "incident.created", label: "Created" },
      { value: "incident.resolved", label: "Resolved" },
    ],
  },
  {
    group: "Payments",
    events: [{ value: "payment.created", label: "Created" }],
  },
  {
    group: "Documents",
    events: [{ value: "document.uploaded", label: "Uploaded" }],
  },
  {
    group: "Inspections",
    events: [{ value: "inspection.completed", label: "Completed" }],
  },
];

const EVENT_LABELS: Record<string, string> = {
  "participant.created": "Participant Created",
  "participant.updated": "Participant Updated",
  "maintenance.created": "Maintenance Created",
  "maintenance.updated": "Maintenance Updated",
  "maintenance.completed": "Maintenance Completed",
  "incident.created": "Incident Created",
  "incident.resolved": "Incident Resolved",
  "payment.created": "Payment Created",
  "document.uploaded": "Document Uploaded",
  "inspection.completed": "Inspection Completed",
  "webhook.test": "Test Delivery",
};

// ============================================================================
// Page Component
// ============================================================================

export default function WebhooksPage() {
  return (
    <RequireAuth allowedRoles={["admin"]} loadingMessage="Loading webhooks...">
      <WebhooksContent />
    </RequireAuth>
  );
}

function WebhooksContent() {
  const { confirm: confirmDialog, alert: alertDialog } = useConfirmDialog();
  const [user, setUser] = useState<{
    id: string;
    firstName: string;
    lastName: string;
    role: string;
  } | null>(null);

  // View state
  const [view, setView] = useState<"list" | "create" | "detail">("list");
  const [selectedWebhookId, setSelectedWebhookId] = useState<Id<"webhooks"> | null>(null);

  // Create form state
  const [formUrl, setFormUrl] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formEvents, setFormEvents] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // Secret reveal state
  const [showSecretModal, setShowSecretModal] = useState(false);
  const [revealedSecret, setRevealedSecret] = useState("");
  const [copiedSecret, setCopiedSecret] = useState(false);

  // Test state
  const [testingId, setTestingId] = useState<Id<"webhooks"> | null>(null);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    statusCode?: number;
    error?: string;
    duration?: number;
  } | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("sda_user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  // Queries
  const webhooksRaw = useQuery(
    api.webhooks.getAll,
    user ? { userId: user.id as Id<"users"> } : "skip"
  );
  const webhooks = (webhooksRaw as WebhookRecord[] | undefined) ?? [];

  const selectedWebhook = useQuery(
    api.webhooks.getById,
    user && selectedWebhookId
      ? { userId: user.id as Id<"users">, webhookId: selectedWebhookId }
      : "skip"
  ) as WebhookRecord | null | undefined;

  const deliveriesRaw = useQuery(
    api.webhooks.getDeliveries,
    user && selectedWebhookId
      ? { userId: user.id as Id<"users">, webhookId: selectedWebhookId }
      : "skip"
  );
  const deliveries = (deliveriesRaw as DeliveryRecord[] | undefined) ?? [];

  // Mutations
  const createWebhook = useMutation(api.webhooks.create);
  const updateWebhook = useMutation(api.webhooks.update);
  const removeWebhook = useMutation(api.webhooks.remove);
  const testWebhookAction = useAction(api.webhooks.testWebhook);

  // Computed
  const { activeWebhooks, inactiveWebhooks } = useMemo(() => {
    return {
      activeWebhooks: webhooks.filter((w) => w.isActive),
      inactiveWebhooks: webhooks.filter((w) => !w.isActive),
    };
  }, [webhooks]);

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleToggleEvent = (eventType: string) => {
    setFormEvents((prev) =>
      prev.includes(eventType)
        ? prev.filter((e) => e !== eventType)
        : [...prev, eventType]
    );
  };

  const handleSelectAllEvents = () => {
    const allEvents = EVENT_GROUPS.flatMap((g) => g.events.map((e) => e.value));
    if (formEvents.length === allEvents.length) {
      setFormEvents([]);
    } else {
      setFormEvents(allEvents);
    }
  };

  const handleCreate = async () => {
    if (!user) return;

    if (!formUrl.trim()) {
      setCreateError("Endpoint URL is required.");
      return;
    }
    if (!formUrl.startsWith("https://")) {
      setCreateError("URL must use HTTPS.");
      return;
    }
    if (formEvents.length === 0) {
      setCreateError("Select at least one event type.");
      return;
    }

    setIsCreating(true);
    setCreateError("");

    try {
      const result = await createWebhook({
        userId: user.id as Id<"users">,
        url: formUrl.trim(),
        events: formEvents,
        description: formDescription.trim() || undefined,
      });

      // Show secret reveal modal
      setRevealedSecret(result.secret);
      setShowSecretModal(true);

      // Reset form
      setFormUrl("");
      setFormDescription("");
      setFormEvents([]);
      setView("list");
    } catch (error) {
      setCreateError(
        error instanceof Error ? error.message : "Failed to create webhook."
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleActive = async (webhook: WebhookRecord) => {
    if (!user) return;

    const action = webhook.isActive ? "disable" : "enable";
    const confirmed = await confirmDialog({
      title: `${webhook.isActive ? "Disable" : "Enable"} Webhook`,
      message: `Are you sure you want to ${action} this webhook?${
        !webhook.isActive && webhook.failureCount >= 10
          ? " The failure count will be reset."
          : ""
      }`,
      confirmLabel: webhook.isActive ? "Disable" : "Enable",
      variant: webhook.isActive ? "danger" : "default",
    });

    if (!confirmed) return;

    try {
      await updateWebhook({
        userId: user.id as Id<"users">,
        webhookId: webhook._id,
        isActive: !webhook.isActive,
      });
    } catch (error) {
      await alertDialog({
        title: "Error",
        message: "Failed to update webhook. Please try again.",
      });
    }
  };

  const handleDelete = async (webhook: WebhookRecord) => {
    if (!user) return;

    const confirmed = await confirmDialog({
      title: "Delete Webhook",
      message: `Are you sure you want to delete this webhook? All delivery history will be permanently removed. This action cannot be undone.`,
      confirmLabel: "Delete Webhook",
      variant: "danger",
    });

    if (!confirmed) return;

    try {
      await removeWebhook({
        userId: user.id as Id<"users">,
        webhookId: webhook._id,
      });
      if (selectedWebhookId === webhook._id) {
        setSelectedWebhookId(null);
        setView("list");
      }
    } catch (error) {
      await alertDialog({
        title: "Error",
        message: "Failed to delete webhook. Please try again.",
      });
    }
  };

  const handleTest = async (webhookId: Id<"webhooks">) => {
    if (!user) return;

    setTestingId(webhookId);
    setTestResult(null);

    try {
      const result = await testWebhookAction({
        userId: user.id as Id<"users">,
        webhookId,
      });
      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        error: error instanceof Error ? error.message : "Test failed.",
      });
    } finally {
      setTestingId(null);
    }
  };

  const handleCopySecret = async () => {
    try {
      await navigator.clipboard.writeText(revealedSecret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = revealedSecret;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    }
  };

  const openDetail = (webhookId: Id<"webhooks">) => {
    setSelectedWebhookId(webhookId);
    setView("detail");
    setTestResult(null);
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="min-h-screen bg-gray-900">
      <Header currentPage="settings" />
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="mb-4 text-sm text-gray-400">
          <Link href="/settings" className="hover:text-white">
            Settings
          </Link>
          <span className="mx-2">/</span>
          {view === "list" && <span className="text-white">Webhooks</span>}
          {view === "create" && (
            <>
              <button
                onClick={() => setView("list")}
                className="hover:text-white"
              >
                Webhooks
              </button>
              <span className="mx-2">/</span>
              <span className="text-white">Create</span>
            </>
          )}
          {view === "detail" && (
            <>
              <button
                onClick={() => {
                  setView("list");
                  setSelectedWebhookId(null);
                }}
                className="hover:text-white"
              >
                Webhooks
              </button>
              <span className="mx-2">/</span>
              <span className="text-white">Details</span>
            </>
          )}
        </nav>

        {/* List View */}
        {view === "list" && (
          <>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-2xl font-bold text-white">Webhooks</h1>
                <p className="text-gray-400 mt-1">
                  Configure endpoints to receive real-time event notifications.
                </p>
              </div>
              <button
                onClick={() => {
                  setView("create");
                  setCreateError("");
                }}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-500 transition-colors focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:outline-none"
              >
                <svg
                  className="w-5 h-5 inline-block mr-1.5 -mt-0.5"
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
                Add Webhook
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                <p className="text-gray-400 text-sm">Total Webhooks</p>
                <p className="text-2xl font-bold text-white">{webhooks.length}</p>
              </div>
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                <p className="text-gray-400 text-sm">Active</p>
                <p className="text-2xl font-bold text-green-400">
                  {activeWebhooks.length}
                </p>
              </div>
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                <p className="text-gray-400 text-sm">Inactive / Disabled</p>
                <p className="text-2xl font-bold text-gray-400">
                  {inactiveWebhooks.length}
                </p>
              </div>
            </div>

            {/* Webhook List */}
            {webhooks.length === 0 ? (
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-12 text-center">
                <svg
                  className="w-12 h-12 text-gray-600 mx-auto mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                  />
                </svg>
                <h3 className="text-lg font-medium text-white mb-2">
                  No webhooks configured
                </h3>
                <p className="text-gray-400 mb-6">
                  Add a webhook endpoint to receive real-time notifications when
                  events occur in your organization.
                </p>
                <button
                  onClick={() => setView("create")}
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-500 transition-colors"
                >
                  Create Your First Webhook
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {webhooks.map((webhook) => (
                  <div
                    key={webhook._id}
                    className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:bg-gray-700/80 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {/* Status indicator */}
                          <span
                            className={`inline-block w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                              webhook.isActive
                                ? webhook.failureCount > 0
                                  ? "bg-yellow-400"
                                  : "bg-green-400"
                                : "bg-gray-500"
                            }`}
                            title={
                              webhook.isActive
                                ? webhook.failureCount > 0
                                  ? `Active (${webhook.failureCount} failures)`
                                  : "Active"
                                : "Inactive"
                            }
                          />
                          <button
                            onClick={() => openDetail(webhook._id)}
                            className="text-white font-medium truncate hover:text-teal-400 transition-colors text-left focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:outline-none rounded"
                          >
                            {webhook.description || webhook.url}
                          </button>
                        </div>

                        <p className="text-sm text-gray-400 truncate mb-2">
                          {webhook.url}
                        </p>

                        {/* Event badges */}
                        <div className="flex flex-wrap gap-1.5">
                          {webhook.events.slice(0, 4).map((event) => (
                            <span
                              key={event}
                              className="px-2 py-0.5 text-xs bg-gray-700 text-gray-300 rounded"
                            >
                              {EVENT_LABELS[event] || event}
                            </span>
                          ))}
                          {webhook.events.length > 4 && (
                            <span className="px-2 py-0.5 text-xs bg-gray-700 text-gray-400 rounded">
                              +{webhook.events.length - 4} more
                            </span>
                          )}
                        </div>

                        {/* Error message */}
                        {webhook.lastError && (
                          <p className="text-xs text-red-400 mt-2 truncate">
                            Last error: {webhook.lastError}
                          </p>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => openDetail(webhook._id)}
                          className="px-3 py-1.5 text-sm text-gray-300 bg-gray-700 rounded hover:bg-gray-600 transition-colors focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:outline-none"
                        >
                          Details
                        </button>
                        <button
                          onClick={() => handleToggleActive(webhook)}
                          className={`px-3 py-1.5 text-sm rounded transition-colors focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:outline-none ${
                            webhook.isActive
                              ? "text-yellow-400 bg-yellow-900/30 hover:bg-yellow-900/50"
                              : "text-green-400 bg-green-900/30 hover:bg-green-900/50"
                          }`}
                        >
                          {webhook.isActive ? "Disable" : "Enable"}
                        </button>
                      </div>
                    </div>

                    {/* Footer meta */}
                    <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-700 text-xs text-gray-400">
                      <span>
                        Created{" "}
                        {new Date(webhook.createdAt).toLocaleDateString()}
                      </span>
                      {webhook.lastTriggeredAt && (
                        <span>
                          Last triggered{" "}
                          {new Date(
                            webhook.lastTriggeredAt
                          ).toLocaleDateString()}{" "}
                          {new Date(
                            webhook.lastTriggeredAt
                          ).toLocaleTimeString()}
                        </span>
                      )}
                      {webhook.failureCount > 0 && (
                        <span className="text-yellow-400">
                          {webhook.failureCount} consecutive failure
                          {webhook.failureCount !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Documentation */}
            <div className="mt-8 bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-3">
                Webhook Integration Guide
              </h3>
              <div className="space-y-3 text-sm text-gray-400">
                <p>
                  Webhooks send an HTTP POST request to your endpoint when events
                  occur. Each request includes:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>
                    <code className="text-teal-400">X-Webhook-Signature</code> -
                    HMAC-SHA256 signature for payload verification
                  </li>
                  <li>
                    <code className="text-teal-400">X-Webhook-Event</code> -
                    Event type (e.g., participant.created)
                  </li>
                  <li>
                    <code className="text-teal-400">X-Webhook-Timestamp</code> -
                    Unix timestamp of the event
                  </li>
                </ul>
                <p className="mt-2">
                  Verify the signature by computing{" "}
                  <code className="text-teal-400">
                    HMAC-SHA256(secret, request_body)
                  </code>{" "}
                  and comparing it to the{" "}
                  <code className="text-teal-400">X-Webhook-Signature</code>{" "}
                  header. Failed deliveries are retried up to 3 times with
                  exponential backoff. Webhooks are auto-disabled after 10
                  consecutive failures.
                </p>
              </div>
            </div>
          </>
        )}

        {/* Create View */}
        {view === "create" && (
          <>
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-2xl font-bold text-white">
                Create Webhook
              </h1>
              <button
                onClick={() => setView("list")}
                className="px-4 py-2 text-gray-300 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:outline-none"
              >
                Cancel
              </button>
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 max-w-2xl">
              {/* URL */}
              <div className="mb-6">
                <label
                  htmlFor="webhook-url"
                  className="block text-sm font-medium text-gray-300 mb-1"
                >
                  Endpoint URL *
                </label>
                <input
                  id="webhook-url"
                  type="url"
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  placeholder="https://example.com/webhooks/sda"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-teal-500 focus:border-transparent focus-visible:outline-none"
                  autoComplete="url"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Must be an HTTPS endpoint that accepts POST requests.
                </p>
              </div>

              {/* Description */}
              <div className="mb-6">
                <label
                  htmlFor="webhook-description"
                  className="block text-sm font-medium text-gray-300 mb-1"
                >
                  Description (optional)
                </label>
                <input
                  id="webhook-description"
                  type="text"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="e.g., Production CRM integration"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-teal-500 focus:border-transparent focus-visible:outline-none"
                  autoComplete="off"
                />
              </div>

              {/* Event Types */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-300">
                    Event Types *
                  </label>
                  <button
                    onClick={handleSelectAllEvents}
                    className="text-xs text-teal-400 hover:text-teal-300 transition-colors focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:outline-none rounded"
                  >
                    {formEvents.length ===
                    EVENT_GROUPS.flatMap((g) => g.events).length
                      ? "Deselect All"
                      : "Select All"}
                  </button>
                </div>

                <div className="space-y-4 mt-3">
                  {EVENT_GROUPS.map((group) => (
                    <fieldset key={group.group}>
                      <legend className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                        {group.group}
                      </legend>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {group.events.map((event) => (
                          <label
                            key={event.value}
                            className="flex items-center gap-2 cursor-pointer group"
                          >
                            <input
                              type="checkbox"
                              checked={formEvents.includes(event.value)}
                              onChange={() => handleToggleEvent(event.value)}
                              className="w-4 h-4 rounded bg-gray-700 border-gray-600 text-teal-500 focus:ring-teal-500 focus:ring-offset-0"
                            />
                            <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                              {event.label}
                            </span>
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  ))}
                </div>
              </div>

              {/* Error */}
              {createError && (
                <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-sm text-red-400">
                  {createError}
                </div>
              )}

              {/* Submit */}
              <button
                onClick={handleCreate}
                disabled={isCreating}
                className="w-full px-4 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:outline-none"
              >
                {isCreating ? "Creating..." : "Create Webhook"}
              </button>
            </div>
          </>
        )}

        {/* Detail View */}
        {view === "detail" && selectedWebhook && (
          <>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-2xl font-bold text-white">
                  {selectedWebhook.description || "Webhook Details"}
                </h1>
                <p className="text-gray-400 text-sm mt-1 truncate max-w-lg">
                  {selectedWebhook.url}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleTest(selectedWebhook._id)}
                  disabled={testingId !== null || !selectedWebhook.isActive}
                  className="px-4 py-2 text-teal-400 bg-teal-900/30 rounded-lg hover:bg-teal-900/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:outline-none"
                  title={
                    !selectedWebhook.isActive
                      ? "Enable the webhook first to send a test"
                      : ""
                  }
                >
                  {testingId === selectedWebhook._id
                    ? "Sending..."
                    : "Send Test"}
                </button>
                <button
                  onClick={() => handleDelete(selectedWebhook)}
                  className="px-4 py-2 text-red-400 bg-red-900/30 rounded-lg hover:bg-red-900/50 transition-colors focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:outline-none"
                >
                  Delete
                </button>
                <button
                  onClick={() => {
                    setView("list");
                    setSelectedWebhookId(null);
                    setTestResult(null);
                  }}
                  className="px-4 py-2 text-gray-300 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:outline-none"
                >
                  Back
                </button>
              </div>
            </div>

            {/* Test Result Banner */}
            {testResult && (
              <div
                className={`mb-6 p-4 rounded-lg border ${
                  testResult.success
                    ? "bg-green-900/30 border-green-700 text-green-400"
                    : "bg-red-900/30 border-red-700 text-red-400"
                }`}
              >
                <div className="flex items-center gap-2 font-medium">
                  {testResult.success ? (
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  )}
                  {testResult.success
                    ? "Test delivery successful"
                    : "Test delivery failed"}
                </div>
                <div className="text-sm mt-1 opacity-80">
                  {testResult.statusCode && (
                    <span>Status: {testResult.statusCode}</span>
                  )}
                  {testResult.duration && (
                    <span className="ml-3">
                      Duration: {testResult.duration}ms
                    </span>
                  )}
                  {testResult.error && (
                    <span className="ml-3">Error: {testResult.error}</span>
                  )}
                </div>
              </div>
            )}

            {/* Webhook Info Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Status Card */}
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-400 mb-3">
                  Status
                </h3>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-block w-3 h-3 rounded-full ${
                      selectedWebhook.isActive
                        ? "bg-green-400"
                        : "bg-gray-500"
                    }`}
                  />
                  <span className="text-white font-medium">
                    {selectedWebhook.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                <button
                  onClick={() => handleToggleActive(selectedWebhook)}
                  className={`mt-3 w-full px-3 py-1.5 text-sm rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:outline-none ${
                    selectedWebhook.isActive
                      ? "text-yellow-400 bg-yellow-900/30 hover:bg-yellow-900/50"
                      : "text-green-400 bg-green-900/30 hover:bg-green-900/50"
                  }`}
                >
                  {selectedWebhook.isActive ? "Disable" : "Enable"}
                </button>
              </div>

              {/* Failure Count Card */}
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-400 mb-3">
                  Health
                </h3>
                <p
                  className={`text-2xl font-bold ${
                    selectedWebhook.failureCount === 0
                      ? "text-green-400"
                      : selectedWebhook.failureCount >= 10
                        ? "text-red-400"
                        : "text-yellow-400"
                  }`}
                >
                  {selectedWebhook.failureCount === 0
                    ? "Healthy"
                    : `${selectedWebhook.failureCount} Failures`}
                </p>
                {selectedWebhook.failureCount >= 10 && (
                  <p className="text-xs text-red-400 mt-1">
                    Auto-disabled due to consecutive failures
                  </p>
                )}
              </div>

              {/* Last Triggered Card */}
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-400 mb-3">
                  Last Triggered
                </h3>
                <p className="text-white font-medium">
                  {selectedWebhook.lastTriggeredAt
                    ? new Date(
                        selectedWebhook.lastTriggeredAt
                      ).toLocaleString()
                    : "Never"}
                </p>
              </div>
            </div>

            {/* Subscribed Events */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-8">
              <h3 className="text-sm font-medium text-gray-400 mb-3">
                Subscribed Events
              </h3>
              <div className="flex flex-wrap gap-2">
                {selectedWebhook.events.map((event) => (
                  <span
                    key={event}
                    className="px-3 py-1 text-sm bg-gray-700 text-gray-300 rounded-full"
                  >
                    {EVENT_LABELS[event] || event}
                  </span>
                ))}
              </div>
            </div>

            {/* Last Error */}
            {selectedWebhook.lastError && (
              <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 mb-8">
                <h3 className="text-sm font-medium text-red-400 mb-2">
                  Last Error
                </h3>
                <p className="text-sm text-red-300 break-all">
                  {selectedWebhook.lastError}
                </p>
              </div>
            )}

            {/* Delivery History */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-700">
                <h3 className="text-lg font-semibold text-white">
                  Delivery History
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Most recent 50 deliveries
                </p>
              </div>

              {deliveries.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  No deliveries recorded yet. Events will appear here when
                  triggered.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-700/50">
                        <th className="text-left px-4 py-2 text-gray-400 font-medium">
                          Status
                        </th>
                        <th className="text-left px-4 py-2 text-gray-400 font-medium">
                          Event
                        </th>
                        <th className="text-left px-4 py-2 text-gray-400 font-medium">
                          HTTP
                        </th>
                        <th className="text-left px-4 py-2 text-gray-400 font-medium">
                          Duration
                        </th>
                        <th className="text-left px-4 py-2 text-gray-400 font-medium">
                          Attempts
                        </th>
                        <th className="text-left px-4 py-2 text-gray-400 font-medium">
                          Time
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {deliveries.map((delivery) => (
                        <DeliveryRow
                          key={delivery._id}
                          delivery={delivery}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* Detail View - Loading State */}
        {view === "detail" && !selectedWebhook && selectedWebhookId && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Secret Reveal Modal */}
        {showSecretModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
            role="dialog"
            aria-modal="true"
            aria-label="Webhook signing secret"
          >
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 max-w-lg w-full">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-yellow-900/50 rounded-full flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-yellow-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">
                    Signing Secret Created
                  </h2>
                  <p className="text-sm text-gray-400">
                    Copy this secret now. It will not be shown again.
                  </p>
                </div>
              </div>

              <div className="bg-gray-900 border border-gray-600 rounded-lg p-3 mb-4">
                <code className="text-sm text-teal-400 break-all select-all">
                  {revealedSecret}
                </code>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleCopySecret}
                  className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-500 transition-colors font-medium focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:outline-none"
                >
                  {copiedSecret ? "Copied!" : "Copy Secret"}
                </button>
                <button
                  onClick={() => {
                    setShowSecretModal(false);
                    setRevealedSecret("");
                  }}
                  className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:outline-none"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ============================================================================
// Delivery Row Component
// ============================================================================

function DeliveryRow({ delivery }: { delivery: DeliveryRecord }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr
        className="hover:bg-gray-700/50 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <td className="px-4 py-2.5">
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${
              delivery.success
                ? "bg-green-900/50 text-green-400"
                : "bg-red-900/50 text-red-400"
            }`}
          >
            {delivery.success ? (
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            )}
            {delivery.success ? "OK" : "Failed"}
          </span>
        </td>
        <td className="px-4 py-2.5 text-gray-300">
          {EVENT_LABELS[delivery.event] || delivery.event}
        </td>
        <td className="px-4 py-2.5">
          {delivery.statusCode ? (
            <span
              className={`text-sm ${
                delivery.statusCode >= 200 && delivery.statusCode < 300
                  ? "text-green-400"
                  : delivery.statusCode >= 400
                    ? "text-red-400"
                    : "text-yellow-400"
              }`}
            >
              {delivery.statusCode}
            </span>
          ) : (
            <span className="text-gray-500">--</span>
          )}
        </td>
        <td className="px-4 py-2.5 text-gray-400">
          {delivery.duration ? `${delivery.duration}ms` : "--"}
        </td>
        <td className="px-4 py-2.5 text-gray-400">{delivery.attemptCount}</td>
        <td className="px-4 py-2.5 text-gray-400">
          {new Date(delivery.createdAt).toLocaleString()}
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={6} className="px-4 py-3 bg-gray-900/50">
            <div className="space-y-2 text-xs">
              {delivery.error && (
                <div>
                  <span className="text-gray-400 font-medium">Error: </span>
                  <span className="text-red-400">{delivery.error}</span>
                </div>
              )}
              {delivery.response && (
                <div>
                  <span className="text-gray-400 font-medium">Response: </span>
                  <code className="text-gray-300 break-all">
                    {delivery.response.substring(0, 500)}
                  </code>
                </div>
              )}
              <div>
                <span className="text-gray-400 font-medium">Payload: </span>
                <details>
                  <summary className="text-teal-400 cursor-pointer inline">
                    View payload
                  </summary>
                  <pre className="mt-1 p-2 bg-gray-800 rounded text-gray-300 overflow-x-auto whitespace-pre-wrap">
                    {(() => {
                      try {
                        return JSON.stringify(
                          JSON.parse(delivery.payload),
                          null,
                          2
                        );
                      } catch {
                        return delivery.payload;
                      }
                    })()}
                  </pre>
                </details>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
