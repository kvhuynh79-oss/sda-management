export default function PrivacyLoading() {
  return (
    <div className="min-h-screen bg-gray-900" role="status" aria-label="Loading Privacy Policy">
      {/* Header skeleton */}
      <header className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="h-6 w-40 bg-gray-800 rounded animate-pulse" />
            <div className="flex items-center gap-4">
              <div className="h-4 w-16 bg-gray-800 rounded animate-pulse" />
              <div className="h-4 w-12 bg-gray-800 rounded animate-pulse" />
              <div className="h-8 w-24 bg-gray-800 rounded-lg animate-pulse" />
            </div>
          </div>
        </div>
      </header>

      {/* Content skeleton */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="h-4 w-28 bg-gray-800 rounded animate-pulse mb-8" />
        <div className="h-10 w-56 bg-gray-800 rounded animate-pulse mb-2" />
        <div className="h-4 w-48 bg-gray-800 rounded animate-pulse mb-10" />

        {/* TOC skeleton */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 mb-12">
          <div className="h-4 w-36 bg-gray-700 rounded animate-pulse mb-4" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {Array.from({ length: 14 }).map((_, i) => (
              <div key={i} className="h-4 bg-gray-700 rounded animate-pulse" style={{ width: `${60 + Math.random() * 30}%` }} />
            ))}
          </div>
        </div>

        {/* Body skeleton */}
        <div className="space-y-10">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i}>
              <div className="h-6 w-64 bg-gray-800 rounded animate-pulse mb-4" />
              <div className="space-y-2">
                <div className="h-4 bg-gray-800 rounded animate-pulse w-full" />
                <div className="h-4 bg-gray-800 rounded animate-pulse w-11/12" />
                <div className="h-4 bg-gray-800 rounded animate-pulse w-10/12" />
                <div className="h-4 bg-gray-800 rounded animate-pulse w-full" />
              </div>
            </div>
          ))}
        </div>
      </main>
      <span className="sr-only">Loading Privacy Policy</span>
    </div>
  );
}
