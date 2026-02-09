export default function OperationsLoading() {
  return (
    <div className="min-h-screen bg-gray-900" role="status" aria-label="Loading operations">
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
        <div className="h-8 w-40 bg-gray-700 rounded animate-pulse mb-2" />
        <div className="h-4 w-64 bg-gray-800 rounded animate-pulse mb-8" />

        {/* Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-gray-800 rounded-lg p-6 border border-gray-700 animate-pulse">
              <div className="h-3 w-24 bg-gray-700 rounded mb-3" />
              <div className="h-8 w-16 bg-gray-700 rounded" />
            </div>
          ))}
        </div>

        {/* Operations sections skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-gray-800 rounded-lg p-6 border border-gray-700 animate-pulse">
              <div className="h-5 w-40 bg-gray-700 rounded mb-4" />
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j} className="flex justify-between items-center py-2 border-b border-gray-700 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-700 rounded" />
                      <div>
                        <div className="h-4 w-32 bg-gray-700 rounded mb-1" />
                        <div className="h-3 w-20 bg-gray-700/50 rounded" />
                      </div>
                    </div>
                    <div className="h-5 w-16 bg-gray-700 rounded" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
      <span className="sr-only">Loading operations</span>
    </div>
  );
}
