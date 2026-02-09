export default function ContractorsLoading() {
  return (
    <div className="min-h-screen bg-gray-900" role="status" aria-label="Loading contractors">
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
            <div className="h-8 w-44 bg-gray-700 rounded animate-pulse mb-2" />
            <div className="h-4 w-60 bg-gray-800 rounded animate-pulse" />
          </div>
          <div className="h-10 w-40 bg-gray-700 rounded-lg animate-pulse" />
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-gray-800 rounded-lg p-6 border border-gray-700 animate-pulse">
              <div className="h-3 w-24 bg-gray-700 rounded mb-3" />
              <div className="h-8 w-12 bg-gray-700 rounded" />
            </div>
          ))}
        </div>

        {/* Contractor cards skeleton */}
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-gray-800 rounded-lg p-4 sm:p-6 border border-gray-700 animate-pulse">
              <div className="flex flex-col sm:flex-row sm:justify-between gap-3">
                <div className="flex-1">
                  <div className="h-5 w-48 bg-gray-700 rounded mb-2" />
                  <div className="h-4 w-32 bg-gray-700/50 rounded mb-2" />
                  <div className="h-3 w-56 bg-gray-700/50 rounded" />
                </div>
                <div className="flex gap-2">
                  <div className="h-5 w-16 bg-gray-700 rounded" />
                  <div className="h-5 w-20 bg-gray-700 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
      <span className="sr-only">Loading contractors</span>
    </div>
  );
}
