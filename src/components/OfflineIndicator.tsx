"use client";

import { useNetwork } from "@/contexts/NetworkContext";

export default function OfflineIndicator() {
  const { isOnline, pendingCount } = useNetwork();

  // Don't show if online and no pending items
  if (isOnline && pendingCount === 0) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 px-4 py-2 text-center text-sm safe-area-inset-top ${
        isOnline ? "bg-yellow-600" : "bg-red-600"
      }`}
    >
      {!isOnline ? (
        <div className="flex items-center justify-center gap-2 text-white">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
          </svg>
          <span>You are offline. Changes will sync when connected.</span>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-2 text-white">
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>{pendingCount} pending change(s) syncing...</span>
        </div>
      )}
    </div>
  );
}
