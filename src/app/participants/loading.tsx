export default function ParticipantsLoading() {
  return (
    <div className="min-h-screen bg-gray-900" role="status" aria-label="Loading participants">
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
            <div className="h-7 w-40 bg-gray-700 rounded animate-pulse mb-2" />
            <div className="h-4 w-48 bg-gray-800 rounded animate-pulse" />
          </div>
          <div className="h-10 w-40 bg-gray-700 rounded-lg animate-pulse" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="h-5 w-36 bg-gray-700 rounded animate-pulse mb-3" />
              <div className="h-4 w-48 bg-gray-700/50 rounded animate-pulse mb-2" />
              <div className="h-4 w-32 bg-gray-700/50 rounded animate-pulse mb-4" />
              <div className="h-6 w-24 bg-gray-700 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </main>
      <span className="sr-only">Loading participants</span>
    </div>
  );
}
