export default function CalendarLoading() {
  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header skeleton */}
      <div className="h-14 bg-gray-800 border-b border-gray-700" />

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6">
        {/* Title skeleton */}
        <div className="mb-8">
          <div className="h-8 w-48 bg-gray-800 rounded animate-pulse" />
          <div className="h-4 w-72 bg-gray-800 rounded animate-pulse mt-2" />
        </div>

        <div className="flex gap-6">
          {/* Filter sidebar skeleton (desktop only) */}
          <div className="hidden md:block w-56 flex-shrink-0">
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 space-y-3">
              <div className="h-5 w-20 bg-gray-700 rounded animate-pulse" />
              <div className="h-px bg-gray-700" />
              {Array.from({ length: 11 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-700 rounded animate-pulse" />
                  <div
                    className="h-4 bg-gray-700 rounded animate-pulse"
                    style={{ width: `${60 + Math.random() * 40}%` }}
                  />
                </div>
              ))}
              <div className="h-px bg-gray-700 mt-2" />
              <div className="h-5 w-16 bg-gray-700 rounded animate-pulse" />
              <div className="h-9 bg-gray-700 rounded-lg animate-pulse" />
            </div>
          </div>

          {/* Calendar area skeleton */}
          <div className="flex-1">
            <div
              className="bg-gray-800 rounded-lg border border-gray-700 p-4"
              style={{ height: "calc(100vh - 200px)" }}
            >
              {/* Toolbar skeleton */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex gap-2">
                  <div className="h-8 w-16 bg-gray-700 rounded animate-pulse" />
                  <div className="h-8 w-16 bg-gray-700 rounded animate-pulse" />
                  <div className="h-8 w-16 bg-gray-700 rounded animate-pulse" />
                </div>
                <div className="h-6 w-36 bg-gray-700 rounded animate-pulse" />
                <div className="flex gap-2">
                  <div className="h-8 w-16 bg-gray-700 rounded animate-pulse" />
                  <div className="h-8 w-14 bg-gray-700 rounded animate-pulse" />
                  <div className="h-8 w-12 bg-gray-700 rounded animate-pulse" />
                  <div className="h-8 w-16 bg-gray-700 rounded animate-pulse" />
                </div>
              </div>

              {/* Calendar grid skeleton */}
              <div className="grid grid-cols-7 gap-px bg-gray-700 rounded overflow-hidden flex-1">
                {/* Header row */}
                {Array.from({ length: 7 }).map((_, i) => (
                  <div
                    key={`header-${i}`}
                    className="bg-gray-800 p-2 h-8"
                  >
                    <div className="h-3 w-8 bg-gray-700 rounded animate-pulse mx-auto" />
                  </div>
                ))}
                {/* Calendar cells */}
                {Array.from({ length: 35 }).map((_, i) => (
                  <div
                    key={`cell-${i}`}
                    className="bg-gray-800 p-2 h-20"
                  >
                    <div className="h-3 w-4 bg-gray-700 rounded animate-pulse" />
                    {i % 5 === 0 && (
                      <div className="h-3 w-16 bg-gray-700 rounded animate-pulse mt-2" />
                    )}
                    {i % 7 === 2 && (
                      <div className="h-3 w-12 bg-gray-700 rounded animate-pulse mt-1" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
