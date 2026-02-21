"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import Header from "@/components/Header";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/hooks/useAuth";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CalendarConnection {
  _id: Id<"calendarConnections">;
  provider: "google" | "outlook";
  userEmail: string | undefined;
  syncEnabled: boolean;
  lastSyncAt: number | undefined;
  expiresAt: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

// ---------------------------------------------------------------------------
// Provider Card
// ---------------------------------------------------------------------------

function ProviderCard({
  provider,
  connection,
  userId,
  onDisconnect,
  onToggleSync,
  onTriggerSync,
}: {
  provider: "google" | "outlook";
  connection: CalendarConnection | undefined;
  userId: string;
  onDisconnect: (provider: "google" | "outlook") => Promise<void>;
  onToggleSync: (provider: "google" | "outlook", enabled: boolean) => Promise<void>;
  onTriggerSync: (provider: "google" | "outlook") => Promise<void>;
}) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isTogglingSync, setIsTogglingSync] = useState(false);
  const { confirm: confirmDialog } = useConfirmDialog();

  const isConnected = !!connection;
  const isGoogle = provider === "google";
  const providerLabel = isGoogle ? "Google Calendar" : "Outlook Calendar";

  const handleConnect = () => {
    const route = isGoogle ? "/api/google/connect" : "/api/microsoft/connect";
    window.location.href = `${route}?userId=${encodeURIComponent(userId)}`;
  };

  const handleDisconnect = async () => {
    const confirmed = await confirmDialog({
      title: `Disconnect ${providerLabel}`,
      message: `Are you sure you want to disconnect ${providerLabel}? Calendar events will no longer sync.`,
      confirmLabel: "Disconnect",
      variant: "danger",
    });
    if (!confirmed) return;

    setIsDisconnecting(true);
    try {
      await onDisconnect(provider);
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleToggleSync = async () => {
    if (!connection) return;
    setIsTogglingSync(true);
    try {
      await onToggleSync(provider, !connection.syncEnabled);
    } finally {
      setIsTogglingSync(false);
    }
  };

  const handleTriggerSync = async () => {
    setIsSyncing(true);
    try {
      await onTriggerSync(provider);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 flex flex-col">
      {/* Provider Header */}
      <div className="flex items-center gap-3 mb-4">
        {isGoogle ? <GoogleIcon /> : <OutlookIcon />}
        <h3 className="text-lg font-semibold text-white">{providerLabel}</h3>
      </div>

      {/* Connection Status */}
      <div className="flex items-center gap-2 mb-3">
        <span
          className={`w-2 h-2 rounded-full flex-shrink-0 ${
            isConnected ? "bg-green-500" : "bg-gray-500"
          }`}
          aria-hidden="true"
        />
        <span className={isConnected ? "text-green-400 text-sm font-medium" : "text-gray-400 text-sm"}>
          {isConnected ? "Connected" : "Not Connected"}
        </span>
      </div>

      {/* Connected State Details */}
      {isConnected && connection && (
        <div className="space-y-2 mb-4 flex-1">
          <p className="text-gray-400 text-sm">{connection.userEmail}</p>
          {connection.lastSyncAt && (
            <p className="text-gray-400 text-sm">
              Last sync: {formatRelativeTime(connection.lastSyncAt)}
            </p>
          )}
          {connection.expiresAt && connection.expiresAt < Date.now() && (
            <p className="text-yellow-400 text-sm">
              Token expired - reconnect to continue syncing
            </p>
          )}
        </div>
      )}

      {/* Not Connected State */}
      {!isConnected && (
        <p className="text-gray-400 text-sm mb-4 flex-1">
          Connect your {providerLabel} to sync events with maintenance schedules and inspections.
        </p>
      )}

      {/* Actions */}
      <div className="mt-auto space-y-3">
        {isConnected && connection && (
          <>
            {/* Auto-sync Toggle */}
            <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
              <div>
                <span className="text-white text-sm font-medium">Auto-sync</span>
                <p className="text-gray-400 text-xs mt-0.5">Sync every 30 minutes</p>
              </div>
              <button
                onClick={handleToggleSync}
                disabled={isTogglingSync}
                aria-label={`${connection.syncEnabled ? "Disable" : "Enable"} auto-sync for ${providerLabel}`}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:outline-none ${
                  connection.syncEnabled ? "bg-teal-600" : "bg-gray-600"
                } ${isTogglingSync ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    connection.syncEnabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* Sync Now + Disconnect Buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleTriggerSync}
                disabled={isSyncing}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:outline-none"
              >
                {isSyncing ? (
                  <>
                    <SpinnerIcon />
                    Syncing...
                  </>
                ) : (
                  <>
                    <SyncIcon />
                    Sync Now
                  </>
                )}
              </button>
              <button
                onClick={handleDisconnect}
                disabled={isDisconnecting}
                className="px-4 py-2 bg-red-600/20 text-red-400 hover:bg-red-600/30 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:outline-none"
              >
                {isDisconnecting ? "..." : "Disconnect"}
              </button>
            </div>
          </>
        )}

        {!isConnected && (
          <button
            onClick={handleConnect}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:outline-none"
          >
            {isGoogle ? <GoogleIcon size={16} /> : <OutlookIcon size={16} />}
            Connect {providerLabel}
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SVG Icons
// ---------------------------------------------------------------------------

function GoogleIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function OutlookIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M24 7.387v10.478c0 .23-.08.424-.238.583a.795.795 0 01-.583.238h-9.405V6.566h9.405c.23 0 .424.08.583.238.159.159.238.353.238.583z" fill="#0072C6" />
      <path d="M16.182 3.097v3.469h-2.408V3.097l1.204-1.204 1.204 1.204z" fill="#0072C6" />
      <path d="M16.182 18.687v3.469l-1.204 1.204-1.204-1.204v-3.469h2.408z" fill="#0072C6" />
      <path d="M16.182 6.566v12.121H7.82V6.566h8.362z" fill="#0072C6" opacity="0.5" />
      <path d="M14.978 0H1.636C1.175 0 .776.152.437.457A1.49 1.49 0 000 1.5v21c0 .414.146.77.437 1.065.29.296.667.435 1.13.435h13.41c.46 0 .842-.146 1.145-.435.303-.296.454-.651.454-1.065v-21c0-.403-.151-.758-.454-1.043C15.82.152 15.438 0 14.978 0z" fill="#0072C6" />
      <path
        d="M10.94 8.384c-.65-.49-1.46-.735-2.43-.735-.99 0-1.82.257-2.49.77-.67.514-1.005 1.26-1.005 2.24 0 .95.328 1.69.985 2.22.656.53 1.498.795 2.525.795.96 0 1.763-.245 2.41-.735.648-.49.972-1.22.972-2.19 0-.99-.322-1.77-.967-2.365zM9.95 12.53c-.32.37-.75.555-1.29.555-.55 0-.99-.185-1.32-.555-.33-.37-.495-.865-.495-1.485 0-.64.165-1.145.495-1.515.33-.37.77-.555 1.32-.555.54 0 .97.185 1.29.555.32.37.48.875.48 1.515 0 .62-.16 1.115-.48 1.485z"
        fill="white"
      />
    </svg>
  );
}

function SyncIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function CalendarIntegrationsPage() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { confirm: confirmDialog, alert: alertDialog } = useConfirmDialog();

  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Convex queries/mutations
  const connections = useQuery(
    api.calendar.getConnections,
    user ? { userId: user.id as Id<"users"> } : "skip"
  );
  const disconnectProvider = useMutation(api.calendar.disconnectProvider);
  const toggleSync = useMutation(api.calendar.toggleSync);
  const triggerSync = useMutation(api.calendar.triggerSync);

  // Handle URL search params for success/error messages
  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");

    if (success === "google") {
      setMessage({ type: "success", text: "Google Calendar connected successfully!" });
    } else if (success === "outlook") {
      setMessage({ type: "success", text: "Outlook Calendar connected successfully!" });
    } else if (error) {
      setMessage({ type: "error", text: decodeURIComponent(error) });
    }
  }, [searchParams]);

  // Auto-dismiss messages after 5 seconds
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), 5000);
    return () => clearTimeout(timer);
  }, [message]);

  const googleConnection = connections?.find(
    (c: CalendarConnection) => c.provider === "google"
  );
  const outlookConnection = connections?.find(
    (c: CalendarConnection) => c.provider === "outlook"
  );

  const handleDisconnect = useCallback(
    async (provider: "google" | "outlook") => {
      if (!user) return;
      try {
        await disconnectProvider({
          userId: user.id as Id<"users">,
          provider,
        });
        const label = provider === "google" ? "Google Calendar" : "Outlook Calendar";
        setMessage({ type: "success", text: `${label} disconnected.` });
      } catch (error) {
        setMessage({
          type: "error",
          text: `Failed to disconnect. Please try again.`,
        });
      }
    },
    [user, disconnectProvider]
  );

  const handleToggleSync = useCallback(
    async (provider: "google" | "outlook", enabled: boolean) => {
      if (!user) return;
      try {
        await toggleSync({
          userId: user.id as Id<"users">,
          provider,
          enabled,
        });
        setMessage({
          type: "success",
          text: `Auto-sync ${enabled ? "enabled" : "disabled"}.`,
        });
      } catch (error) {
        setMessage({
          type: "error",
          text: "Failed to update sync settings.",
        });
      }
    },
    [user, toggleSync]
  );

  const handleTriggerSync = useCallback(
    async (provider: "google" | "outlook") => {
      if (!user) return;
      try {
        await triggerSync({
          userId: user.id as Id<"users">,
          provider,
        });
        setMessage({
          type: "success",
          text: "Sync triggered. Events will update shortly.",
        });
      } catch (error) {
        setMessage({
          type: "error",
          text: "Failed to trigger sync. Please try again.",
        });
      }
    },
    [user, triggerSync]
  );

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <RequireAuth>
      <div className="min-h-screen bg-gray-900">
        <Header currentPage="settings" />

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Breadcrumb */}
          <div className="mb-6">
            <Link
              href="/settings"
              className="text-teal-500 hover:text-teal-400 text-sm focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:outline-none rounded"
            >
              &larr; Back to Settings
            </Link>
          </div>

          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-1">
              <CalendarIcon />
              <h1 className="text-2xl font-bold text-white">Calendar Integrations</h1>
            </div>
            <p className="text-gray-400 mt-1">
              Connect your calendars for two-way sync of maintenance schedules, inspections, and tasks.
            </p>
          </div>

          {/* Success/Error Banner */}
          {message && (
            <div
              role="alert"
              className={`mb-6 p-4 rounded-lg flex items-center justify-between ${
                message.type === "success"
                  ? "bg-green-900/30 border border-green-800 text-green-300"
                  : "bg-red-900/30 border border-red-800 text-red-300"
              }`}
            >
              <span>{message.text}</span>
              <button
                onClick={() => setMessage(null)}
                className="text-current opacity-70 hover:opacity-100 ml-4 flex-shrink-0 focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:outline-none rounded"
                aria-label="Dismiss message"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Provider Cards */}
          {connections === undefined ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[0, 1].map((i) => (
                <div
                  key={i}
                  className="bg-gray-800 border border-gray-700 rounded-lg p-6 animate-pulse"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-6 h-6 bg-gray-700 rounded" />
                    <div className="h-5 w-36 bg-gray-700 rounded" />
                  </div>
                  <div className="h-4 w-24 bg-gray-700 rounded mb-3" />
                  <div className="h-3 w-48 bg-gray-700 rounded mb-2" />
                  <div className="h-3 w-32 bg-gray-700 rounded mb-6" />
                  <div className="h-10 w-full bg-gray-700 rounded-lg" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ProviderCard
                provider="google"
                connection={googleConnection}
                userId={user.id}
                onDisconnect={handleDisconnect}
                onToggleSync={handleToggleSync}
                onTriggerSync={handleTriggerSync}
              />
              <ProviderCard
                provider="outlook"
                connection={outlookConnection}
                userId={user.id}
                onDisconnect={handleDisconnect}
                onToggleSync={handleToggleSync}
                onTriggerSync={handleTriggerSync}
              />
            </div>
          )}

          {/* Sync Info */}
          <div className="mt-6 bg-gray-800 border border-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-3">How Calendar Sync Works</h3>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-teal-500 mt-0.5 flex-shrink-0">1.</span>
                <span>
                  Maintenance schedules, inspections, and follow-up tasks are synced to your calendar as events.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-teal-500 mt-0.5 flex-shrink-0">2.</span>
                <span>
                  Auto-sync runs every 30 minutes. Use "Sync Now" for immediate updates.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-teal-500 mt-0.5 flex-shrink-0">3.</span>
                <span>
                  Changes made in your calendar (reschedule, cancel) are reflected back in MySDAManager.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-teal-500 mt-0.5 flex-shrink-0">4.</span>
                <span>
                  Only events within the next 90 days are synced. Past events are not modified.
                </span>
              </li>
            </ul>
          </div>

          {/* Setup Requirements */}
          <div className="mt-6 bg-teal-950/20 border border-teal-900 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-teal-400 mb-2">
              Setup Requirements
            </h3>
            <p className="text-teal-200 text-sm mb-3">
              Calendar integrations require OAuth credentials to be configured by your administrator:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <h4 className="text-teal-300 font-medium text-sm mb-1">Google Calendar</h4>
                <ul className="text-teal-200 text-sm space-y-1 list-disc list-inside">
                  <li>
                    <code className="bg-teal-950 px-1.5 py-0.5 rounded text-xs">GOOGLE_CLIENT_ID</code>
                  </li>
                  <li>
                    <code className="bg-teal-950 px-1.5 py-0.5 rounded text-xs">GOOGLE_CLIENT_SECRET</code>
                  </li>
                  <li>
                    <code className="bg-teal-950 px-1.5 py-0.5 rounded text-xs">GOOGLE_REDIRECT_URI</code>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="text-teal-300 font-medium text-sm mb-1">Outlook Calendar</h4>
                <ul className="text-teal-200 text-sm space-y-1 list-disc list-inside">
                  <li>
                    <code className="bg-teal-950 px-1.5 py-0.5 rounded text-xs">MICROSOFT_CLIENT_ID</code>
                  </li>
                  <li>
                    <code className="bg-teal-950 px-1.5 py-0.5 rounded text-xs">MICROSOFT_CLIENT_SECRET</code>
                  </li>
                  <li>
                    <code className="bg-teal-950 px-1.5 py-0.5 rounded text-xs">MICROSOFT_REDIRECT_URI</code>
                  </li>
                </ul>
              </div>
            </div>
            <p className="text-teal-400 text-xs mt-3">
              Create apps at{" "}
              <a
                href="https://console.cloud.google.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-teal-200"
              >
                Google Cloud Console
              </a>
              {" "}and{" "}
              <a
                href="https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-teal-200"
              >
                Azure Portal
              </a>
            </p>
          </div>

          {/* Navigation */}
          <div className="mt-6 flex gap-4">
            <Link
              href="/calendar"
              className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors font-medium focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:outline-none"
            >
              Go to Calendar
            </Link>
            <Link
              href="/settings"
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:outline-none"
            >
              Back to Settings
            </Link>
          </div>
        </main>
      </div>
    </RequireAuth>
  );
}
