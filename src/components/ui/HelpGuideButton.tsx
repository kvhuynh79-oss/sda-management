"use client";

// ---------------------------------------------------------------------------
// HelpGuideButton - Trigger button for opening contextual help guides.
// Renders icon + label on desktop, icon-only on mobile.
// ---------------------------------------------------------------------------

interface HelpGuideButtonProps {
  onClick: () => void;
  label?: string;
}

export default function HelpGuideButton({
  onClick,
  label = "Guide",
}: HelpGuideButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="border border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
    >
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"
        />
      </svg>
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
