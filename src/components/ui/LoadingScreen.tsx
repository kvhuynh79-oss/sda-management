"use client";

interface LoadingScreenProps {
  /** Optional message to display below spinner */
  message?: string;
  /** Show full screen (default) or inline loader */
  fullScreen?: boolean;
}

export function LoadingScreen({
  message = "Loading...",
  fullScreen = true
}: LoadingScreenProps) {
  if (!fullScreen) {
    return (
      <div
        className="flex flex-col items-center justify-center py-12"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-teal-600 mb-3" />
        <p className="text-gray-400">{message}</p>
        <span className="sr-only">Loading content</span>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-gray-900 flex items-center justify-center"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex flex-col items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-600 mb-4" />
        <p className="text-white">{message}</p>
        <span className="sr-only">Loading content</span>
      </div>
    </div>
  );
}

export default LoadingScreen;
