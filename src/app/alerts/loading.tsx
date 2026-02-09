export default function AlertsLoading() {
  return (
    <div className="min-h-screen bg-gray-900" role="status" aria-label="Loading alerts">
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
        <div className="flex justify-between items-center mb-8">
          <div>
            <div className="h-8 w-32 bg-gray-700 rounded animate-pulse mb-2" />
            <div className="h-4 w-56 bg-gray-800 rounded animate-pulse" />
          </div>
          <div className="flex gap-2">
            <div className="h-10 w-28 bg-gray-700 rounded-lg animate-pulse" />
            <div className="h-10 w-28 bg-gray-700 rounded-lg animate-pulse" />
          </div>
        </div>

        {/* Filter tabs skeleton */}
        <div className="flex gap-2 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-9 w-24 bg-gray-800 rounded-lg animate-pulse" />
          ))}
        </div>

        {/* Alert items skeleton */}
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-gray-800 rounded-lg p-4 border border-gray-700 animate-pulse">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-gray-700 rounded-full flex-shrink-0" />
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <div className="h-4 w-48 bg-gray-700 rounded" />
                    <div className="h-5 w-16 bg-gray-700 rounded" />
                  </div>
                  <div className="h-3 w-72 bg-gray-700/50 rounded mb-2" />
                  <div className="h-3 w-28 bg-gray-700/50 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
      <span className="sr-only">Loading alerts</span>
    </div>
  );
}
