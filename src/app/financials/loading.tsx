export default function FinancialsLoading() {
  return (
    <div className="min-h-screen bg-gray-900" role="status" aria-label="Loading financials">
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
        <div className="h-4 w-72 bg-gray-800 rounded animate-pulse mb-8" />

        {/* Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-gray-800 rounded-lg p-6 border border-gray-700 animate-pulse">
              <div className="h-3 w-20 bg-gray-700 rounded mb-3" />
              <div className="h-8 w-24 bg-gray-700 rounded" />
            </div>
          ))}
        </div>

        {/* Table skeleton */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
          {/* Table header */}
          <div className="flex gap-4 py-3 border-b border-gray-700 mb-2">
            <div className="h-3 w-1/5 bg-gray-600 rounded animate-pulse" />
            <div className="h-3 w-1/4 bg-gray-600 rounded animate-pulse" />
            <div className="h-3 w-1/6 bg-gray-600 rounded animate-pulse" />
            <div className="h-3 w-1/6 bg-gray-600 rounded animate-pulse" />
          </div>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex gap-4 py-3 border-b border-gray-700 last:border-0">
              <div className="h-4 w-1/5 bg-gray-700 rounded animate-pulse" />
              <div className="h-4 w-1/4 bg-gray-700 rounded animate-pulse" />
              <div className="h-4 w-1/6 bg-gray-700 rounded animate-pulse" />
              <div className="h-4 w-1/6 bg-gray-700 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </main>
      <span className="sr-only">Loading financials</span>
    </div>
  );
}
