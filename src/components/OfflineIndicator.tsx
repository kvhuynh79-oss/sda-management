"use client";

import { useOfflineSync } from "@/hooks/useOfflineSync";

/**
 * Offline Indicator Component
 *
 * Displays offline status and pending sync count.
 * Shows at the top of the screen when offline or syncing.
 */
export function OfflineIndicator() {
  const { isOnline, isSyncing, pendingCount, lastSync, error, syncNow } =
    useOfflineSync();

  // Don't show anything if online and no pending incidents
  if (isOnline && pendingCount === 0 && !isSyncing) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50" role="status" aria-live="polite">
      {/* Offline Banner */}
      {!isOnline && (
        <div className="bg-yellow-600 text-white px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
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
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <span className="font-medium">
                You are offline - incidents will be saved locally
              </span>
            </div>
            {pendingCount > 0 && (
              <span className="text-sm">
                {pendingCount} pending incident{pendingCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Syncing Banner */}
      {isSyncing && (
        <div className="bg-blue-600 text-white px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span className="font-medium">
                Syncing {pendingCount} incident{pendingCount !== 1 ? "s" : ""}...
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Pending Incidents (Online) */}
      {isOnline && !isSyncing && pendingCount > 0 && (
        <div className="bg-orange-600 text-white px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
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
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="font-medium">
                {pendingCount} incident{pendingCount !== 1 ? "s" : ""} pending
                sync
              </span>
            </div>
            <button
              onClick={syncNow}
              className="px-3 py-1 bg-white text-orange-600 rounded hover:bg-orange-50 transition-colors text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              Sync Now
            </button>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="bg-red-600 text-white px-4 py-2">
          <div className="max-w-7xl mx-auto flex items-center gap-2">
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
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}

      {/* Success Message (Last Sync) */}
      {isOnline && !isSyncing && pendingCount === 0 && lastSync && (
        <div className="bg-green-600 text-white px-4 py-2 animate-fade-out">
          <div className="max-w-7xl mx-auto flex items-center gap-2">
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
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-sm font-medium">
              All incidents synced successfully
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default OfflineIndicator;
