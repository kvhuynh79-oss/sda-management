"use client";

import Link from "next/link";

interface EmptyStateProps {
  /** Main title text */
  title: string;
  /** Description text below title */
  description?: string;
  /** Optional icon to display */
  icon?: React.ReactNode;
  /** Call to action button */
  action?: {
    label: string;
    href: string;
  };
  /** Secondary action (optional) */
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  /** Whether this is showing "no results after filter" vs "no data at all" */
  isFiltered?: boolean;
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  secondaryAction,
  isFiltered = false,
}: EmptyStateProps) {
  return (
    <div
      className="text-center py-12 bg-gray-800 rounded-lg"
      role="region"
      aria-label={isFiltered ? "No matching results" : "Empty state"}
    >
      {icon && (
        <div className="text-gray-400 mb-4 flex justify-center" aria-hidden="true">
          {icon}
        </div>
      )}

      <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>

      {description && (
        <p className="text-gray-400 mb-6 max-w-md mx-auto">{description}</p>
      )}

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {action && (
          <Link
            href={action.href}
            className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-800"
          >
            {action.label}
          </Link>
        )}

        {secondaryAction && (
          <button
            onClick={secondaryAction.onClick}
            className="inline-flex items-center justify-center px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-800"
          >
            {secondaryAction.label}
          </button>
        )}
      </div>

      {isFiltered && (
        <p className="text-gray-400 text-sm mt-4">
          Try adjusting your filters or search criteria
        </p>
      )}
    </div>
  );
}

export default EmptyState;
