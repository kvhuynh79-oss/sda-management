export default function BillingLoading() {
  return (
    <div className="min-h-screen bg-gray-900" role="status" aria-label="Loading billing page">
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
        {/* Title */}
        <div className="h-8 w-60 bg-gray-700 rounded animate-pulse mb-8" />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Current plan card skeleton */}
          <div className="lg:col-span-2 bg-gray-800 rounded-xl border border-gray-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="h-6 w-28 bg-gray-700 rounded animate-pulse" />
              <div className="h-5 w-20 bg-gray-700 rounded-full animate-pulse" />
            </div>
            <div className="h-8 w-36 bg-gray-700 rounded animate-pulse mb-2" />
            <div className="h-6 w-24 bg-gray-700 rounded animate-pulse mb-6" />
            <div className="space-y-2 mb-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-4 w-48 bg-gray-700/50 rounded animate-pulse" />
              ))}
            </div>
            <div className="border-t border-gray-700 pt-4 mb-6">
              <div className="h-4 w-56 bg-gray-700/50 rounded animate-pulse" />
            </div>
            <div className="flex gap-3">
              <div className="h-9 w-32 bg-gray-700 rounded-lg animate-pulse" />
              <div className="h-9 w-44 bg-gray-700 rounded-lg animate-pulse" />
            </div>
          </div>

          {/* Usage stats skeleton */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <div className="h-6 w-16 bg-gray-700 rounded animate-pulse mb-6" />
            <div className="space-y-6">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="h-4 w-20 bg-gray-700 rounded animate-pulse" />
                    <div className="h-4 w-12 bg-gray-700 rounded animate-pulse" />
                  </div>
                  <div className="h-2 w-full bg-gray-700 rounded-full animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Invoice history skeleton */}
        <div className="mt-6 bg-gray-800 rounded-xl border border-gray-700 p-6">
          <div className="h-6 w-32 bg-gray-700 rounded animate-pulse mb-6" />
          <div className="h-4 w-32 bg-gray-700/50 rounded animate-pulse mx-auto" />
        </div>
      </main>
      <span className="sr-only">Loading billing page</span>
    </div>
  );
}
