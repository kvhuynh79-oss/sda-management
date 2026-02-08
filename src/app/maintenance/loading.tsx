export default function MaintenanceLoading() {
  return (
    <div className="min-h-screen bg-gray-900" role="status" aria-label="Loading maintenance">
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
            <div className="h-7 w-52 bg-gray-700 rounded animate-pulse mb-2" />
            <div className="h-4 w-64 bg-gray-800 rounded animate-pulse" />
          </div>
          <div className="h-10 w-40 bg-gray-700 rounded-lg animate-pulse" />
        </div>

        {/* Cards skeleton */}
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-gray-800 rounded-lg p-4 sm:p-6 border border-gray-700">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <div className="h-5 w-56 bg-gray-700 rounded animate-pulse mb-2" />
                  <div className="h-4 w-40 bg-gray-700/50 rounded animate-pulse" />
                </div>
                <div className="h-6 w-20 bg-gray-700 rounded animate-pulse" />
              </div>
              <div className="flex gap-4 mt-3">
                <div className="h-4 w-24 bg-gray-700/50 rounded animate-pulse" />
                <div className="h-4 w-32 bg-gray-700/50 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </main>
      <span className="sr-only">Loading maintenance requests</span>
    </div>
  );
}
