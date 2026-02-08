export default function CommunicationsLoading() {
  return (
    <div className="min-h-screen bg-gray-900" role="status" aria-label="Loading communications">
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="flex justify-between items-center">
          <div className="h-7 w-48 bg-gray-700 rounded animate-pulse" />
          <div className="h-10 w-44 bg-gray-700 rounded-lg animate-pulse" />
        </div>

        {/* View tabs */}
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-9 w-24 bg-gray-800 rounded animate-pulse" />
          ))}
        </div>

        {/* Content */}
        <div className="lg:flex lg:gap-6">
          <div className="hidden lg:block w-64 flex-shrink-0">
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-8 bg-gray-700/50 rounded animate-pulse mb-3" />
              ))}
            </div>
          </div>
          <div className="flex-1 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="flex justify-between mb-2">
                  <div className="h-4 w-32 bg-gray-700 rounded animate-pulse" />
                  <div className="h-4 w-20 bg-gray-700/50 rounded animate-pulse" />
                </div>
                <div className="h-4 w-64 bg-gray-700/50 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </main>
      <span className="sr-only">Loading communications</span>
    </div>
  );
}
