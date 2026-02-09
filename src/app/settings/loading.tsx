export default function SettingsLoading() {
  return (
    <div className="min-h-screen bg-gray-900" role="status" aria-label="Loading settings">
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
        <div className="h-8 w-32 bg-gray-700 rounded animate-pulse mb-2" />
        <div className="h-4 w-56 bg-gray-800 rounded animate-pulse mb-8" />

        {/* Settings sections skeleton */}
        <div className="space-y-6 max-w-2xl">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-gray-800 rounded-lg p-6 border border-gray-700 animate-pulse">
              <div className="h-5 w-40 bg-gray-700 rounded mb-4" />
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j}>
                    <div className="h-3 w-24 bg-gray-700 rounded mb-2" />
                    <div className="h-10 w-full bg-gray-700 rounded" />
                  </div>
                ))}
              </div>
              <div className="mt-4 h-10 w-24 bg-gray-700 rounded-lg" />
            </div>
          ))}
        </div>
      </main>
      <span className="sr-only">Loading settings</span>
    </div>
  );
}
