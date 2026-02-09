export default function RegisterLoading() {
  return (
    <div className="min-h-screen bg-gray-900" role="status" aria-label="Loading registration page">
      {/* Header skeleton */}
      <div className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="h-6 w-40 bg-gray-700 rounded animate-pulse" />
            <div className="flex items-center gap-4">
              <div className="h-4 w-36 bg-gray-700 rounded animate-pulse" />
              <div className="h-4 w-14 bg-gray-700 rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 sm:px-6 py-12">
        {/* Title skeleton */}
        <div className="text-center mb-8">
          <div className="h-8 w-64 bg-gray-800 rounded animate-pulse mx-auto mb-2" />
          <div className="h-4 w-80 bg-gray-800 rounded animate-pulse mx-auto" />
        </div>

        {/* Step indicator skeleton */}
        <div className="flex items-center justify-center gap-4 mb-8">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="w-8 h-8 bg-gray-700 rounded-full animate-pulse" />
              {i < 2 && <div className="w-16 h-0.5 bg-gray-700 animate-pulse" />}
            </div>
          ))}
        </div>

        {/* Form skeleton */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-8">
          <div className="h-6 w-40 bg-gray-700 rounded animate-pulse mb-6" />
          <div className="space-y-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i}>
                <div className="h-4 w-28 bg-gray-700 rounded animate-pulse mb-1" />
                <div className="h-10 w-full bg-gray-700 rounded-lg animate-pulse" />
              </div>
            ))}
          </div>
          <div className="h-11 w-full bg-gray-700 rounded-lg animate-pulse mt-6" />
        </div>
      </div>
      <span className="sr-only">Loading registration page</span>
    </div>
  );
}
