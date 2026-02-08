export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-gray-900" role="status" aria-label="Loading dashboard">
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Title */}
        <div className="h-8 w-48 bg-gray-700 rounded animate-pulse mb-2" />
        <div className="h-4 w-64 bg-gray-800 rounded animate-pulse mb-8" />

        {/* Stat cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="h-4 w-24 bg-gray-700 rounded animate-pulse mb-3" />
              <div className="h-8 w-16 bg-gray-700 rounded animate-pulse" />
            </div>
          ))}
        </div>

        {/* Content sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="h-5 w-32 bg-gray-700 rounded animate-pulse mb-4" />
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="h-12 bg-gray-700/50 rounded animate-pulse mb-3" />
              ))}
            </div>
          ))}
        </div>
      </main>
      <span className="sr-only">Loading dashboard</span>
    </div>
  );
}
