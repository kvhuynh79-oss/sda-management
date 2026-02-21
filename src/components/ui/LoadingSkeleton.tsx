"use client";

interface LoadingSkeletonProps {
  variant?: "dashboard" | "table" | "cards" | "form" | "detail" | "list";
  rows?: number;
  count?: number;
  fields?: number;
}

export default function LoadingSkeleton({ variant = "table", rows = 5, count = 4, fields = 6 }: LoadingSkeletonProps) {
  if (variant === "dashboard") {
    return (
      <div className="min-h-screen bg-gray-900 p-6" role="status" aria-label="Loading">
        <div className="h-8 w-48 bg-gray-700 rounded animate-pulse mb-8" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-gray-800 rounded-lg p-4 h-24 animate-pulse" />
          ))}
        </div>
        <div className="bg-gray-800 rounded-lg p-6 h-64 animate-pulse" />
        <span className="sr-only">Loading</span>
      </div>
    );
  }
  if (variant === "table") {
    return (
      <div className="min-h-screen bg-gray-900 p-6" role="status" aria-label="Loading">
        <div className="h-8 w-48 bg-gray-700 rounded animate-pulse mb-8" />
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="h-10 bg-gray-700 rounded animate-pulse mb-4" />
          {[...Array(rows)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-700/50 rounded animate-pulse mb-2" />
          ))}
        </div>
        <span className="sr-only">Loading</span>
      </div>
    );
  }
  if (variant === "cards") {
    return (
      <div className="min-h-screen bg-gray-900 p-6" role="status" aria-label="Loading">
        <div className="h-8 w-48 bg-gray-700 rounded animate-pulse mb-8" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(count)].map((_, i) => (
            <div key={i} className="bg-gray-800 rounded-lg p-6 h-40 animate-pulse" />
          ))}
        </div>
        <span className="sr-only">Loading</span>
      </div>
    );
  }
  if (variant === "form") {
    return (
      <div className="min-h-screen bg-gray-900 p-6" role="status" aria-label="Loading">
        <div className="h-8 w-48 bg-gray-700 rounded animate-pulse mb-8" />
        <div className="bg-gray-800 rounded-lg p-6 max-w-2xl">
          {[...Array(fields)].map((_, i) => (
            <div key={i} className="mb-4">
              <div className="h-4 w-24 bg-gray-700 rounded animate-pulse mb-2" />
              <div className="h-10 bg-gray-700/50 rounded animate-pulse" />
            </div>
          ))}
        </div>
        <span className="sr-only">Loading</span>
      </div>
    );
  }
  if (variant === "detail") {
    return (
      <div className="min-h-screen bg-gray-900 p-6" role="status" aria-label="Loading">
        <div className="h-8 w-64 bg-gray-700 rounded animate-pulse mb-4" />
        <div className="h-4 w-32 bg-gray-700/50 rounded animate-pulse mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-800 rounded-lg p-6 h-48 animate-pulse" />
          <div className="bg-gray-800 rounded-lg p-6 h-48 animate-pulse" />
        </div>
        <span className="sr-only">Loading</span>
      </div>
    );
  }
  // list variant
  return (
    <div className="min-h-screen bg-gray-900 p-6" role="status" aria-label="Loading">
      <div className="h-8 w-48 bg-gray-700 rounded animate-pulse mb-8" />
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="bg-gray-800 rounded-lg p-4 mb-3 h-16 animate-pulse" />
      ))}
      <span className="sr-only">Loading</span>
    </div>
  );
}