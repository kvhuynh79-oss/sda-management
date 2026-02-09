export default function OnboardingSetupLoading() {
  return (
    <div className="min-h-screen bg-gray-900" role="status" aria-label="Loading onboarding">
      {/* Header skeleton */}
      <div className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="h-6 w-40 bg-gray-700 rounded animate-pulse" />
            <div className="h-4 w-20 bg-gray-700 rounded animate-pulse" />
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
        {/* Step indicator skeleton */}
        <div className="flex items-center justify-center gap-4 mb-10">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 bg-gray-700 rounded-full animate-pulse" />
                <div className="h-3 w-12 bg-gray-700 rounded animate-pulse mt-1.5" />
              </div>
              {i < 3 && <div className="w-20 h-0.5 bg-gray-700 animate-pulse mb-5" />}
            </div>
          ))}
        </div>

        {/* Content skeleton */}
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-700 rounded-full animate-pulse mx-auto mb-6" />
          <div className="h-8 w-72 bg-gray-800 rounded animate-pulse mx-auto mb-3" />
          <div className="h-4 w-96 bg-gray-800 rounded animate-pulse mx-auto mb-8" />

          <div className="bg-gray-800 rounded-xl border border-gray-700 p-8 max-w-md mx-auto">
            <div className="space-y-5">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i}>
                  <div className="h-4 w-20 bg-gray-700 rounded animate-pulse mb-1" />
                  <div className="h-10 w-full bg-gray-700 rounded-lg animate-pulse" />
                </div>
              ))}
            </div>
            <div className="h-11 w-full bg-gray-700 rounded-lg animate-pulse mt-6" />
          </div>
        </div>
      </div>
      <span className="sr-only">Loading onboarding</span>
    </div>
  );
}
