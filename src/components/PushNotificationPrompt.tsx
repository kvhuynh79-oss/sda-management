"use client";

import { useState } from "react";
import { Id } from "../../convex/_generated/dataModel";
import { usePushNotifications } from "@/hooks/usePushNotifications";

/**
 * PushNotificationPrompt
 *
 * Settings UI component for enabling/disabling Web Push notifications.
 * Shows the current subscription status, browser support information,
 * and a toggle to manage the subscription. Includes an overview of
 * notification categories the user will receive.
 *
 * Usage:
 *   <PushNotificationPrompt userId={user.id as Id<"users">} />
 *
 * Place this in the Settings page or a dedicated notifications settings section.
 */

interface PushNotificationPromptProps {
  userId: Id<"users"> | null | undefined;
}

// Notification categories that the system can send
const NOTIFICATION_CATEGORIES = [
  {
    id: "critical_incidents",
    label: "Critical Incidents",
    description:
      "NDIS-reportable incidents requiring 24-hour notification. Includes deaths, serious injuries, unauthorized restrictive practices, and safeguarding concerns.",
    severity: "critical" as const,
  },
  {
    id: "maintenance_assignments",
    label: "Maintenance Assignments",
    description:
      "New maintenance requests assigned to you, quote submissions from contractors, and urgent repair notifications.",
    severity: "warning" as const,
  },
  {
    id: "ndis_deadlines",
    label: "NDIS Deadlines",
    description:
      "Plan expiry reminders, claim submission deadlines, certification renewals, and vacancy notification due dates.",
    severity: "warning" as const,
  },
  {
    id: "overdue_tasks",
    label: "Overdue Tasks",
    description:
      "Follow-up tasks past their due date, overdue communications requiring action, and unacknowledged complaints.",
    severity: "info" as const,
  },
];

const SEVERITY_STYLES = {
  critical: {
    dot: "bg-red-500",
    badge: "bg-red-500/20 text-red-400 border border-red-500/30",
    label: "Critical",
  },
  warning: {
    dot: "bg-yellow-500",
    badge: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
    label: "Important",
  },
  info: {
    dot: "bg-blue-500",
    badge: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
    label: "Standard",
  },
};

export default function PushNotificationPrompt({
  userId,
}: PushNotificationPromptProps) {
  const {
    isSupported,
    isSubscribed,
    isLoading,
    permission,
    subscribe,
    unsubscribe,
    error,
    deviceCount,
  } = usePushNotifications(userId);

  const [actionResult, setActionResult] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const handleToggle = async () => {
    setActionResult(null);

    if (isSubscribed) {
      const result = await unsubscribe();
      if (result.success) {
        setActionResult({
          type: "success",
          message: "Push notifications disabled for this device.",
        });
      } else {
        setActionResult({
          type: "error",
          message: result.error || "Failed to disable notifications.",
        });
      }
    } else {
      const result = await subscribe();
      if (result.success) {
        setActionResult({
          type: "success",
          message: "Push notifications enabled. You will now receive alerts on this device.",
        });
      } else {
        setActionResult({
          type: "error",
          message: result.error || "Failed to enable notifications.",
        });
      }
    }
  };

  // Determine the status display
  const getStatusInfo = () => {
    if (!isSupported) {
      return {
        label: "Not Supported",
        color: "text-gray-400",
        bgColor: "bg-gray-700",
        icon: (
          <svg
            className="w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
            />
          </svg>
        ),
      };
    }

    if (permission === "denied") {
      return {
        label: "Blocked",
        color: "text-red-400",
        bgColor: "bg-red-500/10",
        icon: (
          <svg
            className="w-5 h-5 text-red-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        ),
      };
    }

    if (isSubscribed) {
      return {
        label: "Enabled",
        color: "text-green-400",
        bgColor: "bg-green-500/10",
        icon: (
          <svg
            className="w-5 h-5 text-green-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
        ),
      };
    }

    return {
      label: "Disabled",
      color: "text-gray-400",
      bgColor: "bg-gray-700",
      icon: (
        <svg
          className="w-5 h-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20 13.255A23.931 23.931 0 0112 15c-2.8 0-5.47-.48-7.96-1.363M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m8 0H8m8 0h2a2 2 0 012 2v7.5"
          />
        </svg>
      ),
    };
  };

  const statusInfo = getStatusInfo();

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700">
      {/* Header */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${statusInfo.bgColor}`}>
              {statusInfo.icon}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">
                Push Notifications
              </h3>
              <p className="text-sm text-gray-400">
                Receive real-time alerts on this device
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-sm font-medium ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
            {isSupported && permission !== "denied" && (
              <button
                onClick={handleToggle}
                disabled={isLoading || !userId}
                className={`
                  relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full
                  border-2 border-transparent transition-colors duration-200 ease-in-out
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-800
                  disabled:opacity-50 disabled:cursor-not-allowed
                  ${isSubscribed ? "bg-blue-600" : "bg-gray-600"}
                `}
                role="switch"
                aria-checked={isSubscribed}
                aria-label="Toggle push notifications"
              >
                <span
                  className={`
                    pointer-events-none inline-block h-5 w-5 transform rounded-full
                    bg-white shadow ring-0 transition duration-200 ease-in-out
                    ${isSubscribed ? "translate-x-5" : "translate-x-0"}
                  `}
                />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Status Messages */}
      {!isSupported && (
        <div className="mx-6 mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <div className="flex gap-2">
            <svg
              className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
            <div>
              <p className="text-sm font-medium text-yellow-400">
                Browser Not Supported
              </p>
              <p className="text-sm text-gray-400 mt-1">
                Your browser does not support push notifications. For the best
                experience, use Chrome, Firefox, Edge, or Safari 16.4+ on iOS
                (as a PWA added to your Home Screen).
              </p>
            </div>
          </div>
        </div>
      )}

      {permission === "denied" && (
        <div className="mx-6 mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <div className="flex gap-2">
            <svg
              className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
              />
            </svg>
            <div>
              <p className="text-sm font-medium text-red-400">
                Notifications Blocked
              </p>
              <p className="text-sm text-gray-400 mt-1">
                You have blocked notifications for this site. To enable push
                notifications, click the lock icon in your browser address bar
                and change the Notifications setting to &quot;Allow&quot;, then
                reload the page.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Action Result Toast */}
      {actionResult && (
        <div
          className={`mx-6 mt-4 p-3 rounded-lg border ${
            actionResult.type === "success"
              ? "bg-green-500/10 border-green-500/30"
              : "bg-red-500/10 border-red-500/30"
          }`}
          role="alert"
          aria-live="polite"
        >
          <p
            className={`text-sm ${
              actionResult.type === "success" ? "text-green-400" : "text-red-400"
            }`}
          >
            {actionResult.message}
          </p>
        </div>
      )}

      {/* Error Display */}
      {error && !actionResult && (
        <div
          className="mx-6 mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg"
          role="alert"
          aria-live="polite"
        >
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Device Count */}
      {isSubscribed && deviceCount > 0 && (
        <div className="mx-6 mt-4 px-3 py-2 bg-gray-700/50 rounded-lg">
          <p className="text-sm text-gray-400">
            You have push notifications enabled on{" "}
            <span className="text-white font-medium">
              {deviceCount} device{deviceCount !== 1 ? "s" : ""}
            </span>
            .
          </p>
        </div>
      )}

      {/* Notification Categories */}
      <div className="p-6">
        <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">
          Notification Categories
        </h4>
        <div className="space-y-3">
          {NOTIFICATION_CATEGORIES.map((category) => {
            const severity = SEVERITY_STYLES[category.severity];
            return (
              <div
                key={category.id}
                className="flex items-start gap-3 p-3 bg-gray-700/30 rounded-lg"
              >
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${severity.dot}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-white">
                      {category.label}
                    </span>
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded ${severity.badge}`}
                    >
                      {severity.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    {category.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Info */}
      <div className="px-6 pb-6">
        <div className="p-3 bg-gray-700/30 rounded-lg border border-gray-700">
          <p className="text-xs text-gray-400 leading-relaxed">
            Push notifications are sent to this specific device and browser. If
            you use multiple devices, enable notifications on each one
            separately. You can disable notifications at any time from this
            settings page. Notification delivery depends on your device being
            connected to the internet and your browser allowing background
            processes.
          </p>
        </div>
      </div>
    </div>
  );
}
