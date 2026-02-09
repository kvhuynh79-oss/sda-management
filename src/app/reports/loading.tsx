export default function ReportsLoading() {
  return (
    <div className="min-h-screen bg-gray-900" role="status" aria-label="Loading reports">
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
        <div className="h-8 w-48 bg-gray-700 rounded animate-pulse mb-2" />
        <div className="h-4 w-72 bg-gray-800 rounded animate-pulse mb-8" />

        {/* Report category cards skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-gray-800 rounded-lg p-6 border border-gray-700 animate-pulse">
              <div className="w-12 h-12 bg-gray-700 rounded-lg mb-4" />
              <div className="h-5 w-36 bg-gray-700 rounded mb-2" />
              <div className="h-3 w-full bg-gray-700/50 rounded mb-1" />
              <div className="h-3 w-2/3 bg-gray-700/50 rounded mb-4" />
              <div className="h-9 w-full bg-gray-700 rounded-lg" />
            </div>
          ))}
        </div>
      </main>
      <span className="sr-only">Loading reports</span>
    </div>
  );
}
