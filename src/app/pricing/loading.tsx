export default function PricingLoading() {
  return (
    <div className="min-h-screen bg-gray-900" role="status" aria-label="Loading pricing page">
      {/* Header skeleton */}
      <div className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="h-6 w-40 bg-gray-700 rounded animate-pulse" />
            <div className="flex items-center gap-4">
              <div className="h-4 w-16 bg-gray-700 rounded animate-pulse" />
              <div className="h-9 w-24 bg-gray-700 rounded-lg animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      {/* Hero skeleton */}
      <div className="pt-16 pb-8 text-center">
        <div className="max-w-4xl mx-auto px-4">
          <div className="h-12 w-80 bg-gray-800 rounded animate-pulse mx-auto mb-4" />
          <div className="h-5 w-96 bg-gray-800 rounded animate-pulse mx-auto mb-8" />
          <div className="h-7 w-48 bg-gray-800 rounded-full animate-pulse mx-auto" />
        </div>
      </div>

      {/* Pricing cards skeleton */}
      <div className="pb-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-gray-800 rounded-xl border border-gray-700 p-8">
                <div className="h-6 w-24 bg-gray-700 rounded animate-pulse mb-2" />
                <div className="h-4 w-40 bg-gray-700 rounded animate-pulse mb-6" />
                <div className="h-10 w-28 bg-gray-700 rounded animate-pulse mb-6" />
                <div className="space-y-3 mb-8">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <div key={j} className="h-4 w-full bg-gray-700/50 rounded animate-pulse" />
                  ))}
                </div>
                <div className="h-11 w-full bg-gray-700 rounded-lg animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
      <span className="sr-only">Loading pricing page</span>
    </div>
  );
}
