"use client";

import Link from "next/link";

export interface BreadcrumbItem {
  label: string;
  href?: string; // Last item has no href (current page)
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

/**
 * Reusable breadcrumb navigation component (WCAG 2.1 AA compliant).
 *
 * Usage:
 * ```tsx
 * <Breadcrumbs items={[
 *   { label: "Dashboard", href: "/dashboard" },
 *   { label: "Properties", href: "/properties" },
 *   { label: "123 Smith St" }
 * ]} />
 * ```
 */
export default function Breadcrumbs({ items }: BreadcrumbsProps) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb navigation" className="mb-6">
      <ol className="flex items-center gap-2 text-sm flex-wrap">
        {items.map((item, index) => (
          <li key={index} className="flex items-center gap-2">
            {index > 0 && (
              <svg
                className="w-4 h-4 text-gray-500 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            )}
            {item.href ? (
              <Link
                href={item.href}
                className="text-gray-400 hover:text-white transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-white font-medium" aria-current="page">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
