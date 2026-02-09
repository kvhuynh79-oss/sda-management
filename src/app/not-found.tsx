import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-6">
          <span className="text-2xl font-bold text-teal-400">MySDAManager</span>
        </div>
        <div className="bg-gray-800 rounded-lg p-8 border border-gray-700">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-700 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h1 className="text-6xl font-bold text-gray-400 mb-2">404</h1>
          <h2 className="text-xl font-semibold text-white mb-2">Page not found</h2>
          <p className="text-gray-400 mb-8">
            The page you are looking for does not exist or has been moved.
          </p>
          <div className="flex gap-3 justify-center">
            <Link
              href="/dashboard"
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-800"
            >
              Go to Dashboard
            </Link>
            <Link
              href="/"
              className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-800"
            >
              Home
            </Link>
          </div>
        </div>
        <p className="text-gray-400 text-sm mt-6">
          Built for NDIS compliance &middot; MySDAManager
        </p>
      </div>
    </div>
  );
}
