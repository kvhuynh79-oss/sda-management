"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);

  const isAuthError = error.message?.toLowerCase().includes("unauthorized") || error.message?.toLowerCase().includes("permission");

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6">
      <div className="bg-gray-800 rounded-lg p-8 max-w-md w-full text-center border border-gray-700">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: isAuthError ? "rgba(234, 179, 8, 0.1)" : "rgba(239, 68, 68, 0.1)" }}>
          {isAuthError ? (
            <svg className="w-8 h-8 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          ) : (
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          )}
        </div>
        <h2 className="text-xl font-semibold text-white mb-2">
          {isAuthError ? "Access Denied" : "Something went wrong"}
        </h2>
        <p className="text-gray-400 mb-6">
          {isAuthError
            ? "You don't have permission to access this page."
            : "An unexpected error occurred. Please try again."}
        </p>
        {error.digest && (
          <p className="text-xs text-gray-500 mb-4 font-mono">Error ID: {error.digest}</p>
        )}
        <div className="flex gap-3 justify-center">
          {!isAuthError && (
            <button onClick={reset} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-800">
              Try Again
            </button>
          )}
          <Link href="/dashboard" className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-800">
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
