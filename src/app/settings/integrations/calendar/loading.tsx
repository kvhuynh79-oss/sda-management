export default function CalendarIntegrationsLoading() {
  return (
    <div className="min-h-screen bg-gray-900" role="status" aria-label="Loading calendar integrations">
      {/* Header skeleton */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="h-6 w-40 bg-gray-700 rounded animate-pulse" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
          <div className="flex gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-4 w-20 bg-gray-700 rounded animate-pulse flex-shrink-0" />
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb skeleton */}
        <div className="mb-6">
          <div className="h-4 w-28 bg-gray-700 rounded animate-pulse" />
        </div>

        {/* Title skeleton */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-5 h-5 bg-gray-700 rounded animate-pulse" />
            <div className="h-8 w-56 bg-gray-700 rounded animate-pulse" />
          </div>
          <div className="h-4 w-80 bg-gray-800 rounded animate-pulse mt-2" />
        </div>

        {/* Provider cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="bg-gray-800 border border-gray-700 rounded-lg p-6 animate-pulse"
            >
              {/* Provider header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-6 h-6 bg-gray-700 rounded" />
                <div className="h-5 w-36 bg-gray-700 rounded" />
              </div>

              {/* Status dot + label */}
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 bg-gray-700 rounded-full" />
                <div className="h-4 w-24 bg-gray-700 rounded" />
              </div>

              {/* Details */}
              <div className="space-y-2 mb-6">
                <div className="h-3 w-48 bg-gray-700 rounded" />
                <div className="h-3 w-32 bg-gray-700 rounded" />
              </div>

              {/* Toggle row */}
              <div className="p-3 bg-gray-700/50 rounded-lg mb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="h-4 w-20 bg-gray-600 rounded mb-1" />
                    <div className="h-3 w-32 bg-gray-600 rounded" />
                  </div>
                  <div className="w-11 h-6 bg-gray-600 rounded-full" />
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <div className="flex-1 h-10 bg-gray-700 rounded-lg" />
                <div className="w-28 h-10 bg-gray-700 rounded-lg" />
              </div>
            </div>
          ))}
        </div>

        {/* Info section skeleton */}
        <div className="mt-6 bg-gray-800 border border-gray-700 rounded-lg p-6 animate-pulse">
          <div className="h-5 w-48 bg-gray-700 rounded mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-3 w-full bg-gray-700 rounded" />
            ))}
          </div>
        </div>
      </main>
      <span className="sr-only">Loading calendar integrations</span>
    </div>
  );
}
