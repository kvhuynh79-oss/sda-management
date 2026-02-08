"use client";

import Link from "next/link";

interface BottomNavProps {
  currentPage?:
    | "dashboard"
    | "properties"
    | "participants"
    | "financials"
    | "operations"
    | "communications"
    | "database"
    | "incidents"
    | "compliance"
    | "documents"
    | "onboarding"
    | "reports"
    | "ai"
    | "settings"
    | "admin"
    | "payments"
    | "claims"
    | "maintenance"
    | "inspections"
    | "alerts"
    | "schedule"
    | "contractors";
}

const navItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
    key: "dashboard",
    icon: (active: boolean) => (
      <svg
        className={`w-6 h-6 ${active ? "text-blue-400" : "text-gray-400"}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={active ? 2.5 : 2}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1h-2z"
        />
      </svg>
    ),
  },
  {
    href: "/properties",
    label: "Properties",
    key: "properties",
    icon: (active: boolean) => (
      <svg
        className={`w-6 h-6 ${active ? "text-blue-400" : "text-gray-400"}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={active ? 2.5 : 2}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
        />
      </svg>
    ),
  },
  {
    href: "/incidents",
    label: "Incidents",
    key: "incidents",
    icon: (active: boolean) => (
      <svg
        className={`w-6 h-6 ${active ? "text-blue-400" : "text-gray-400"}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={active ? 2.5 : 2}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
        />
      </svg>
    ),
  },
  {
    href: "/operations",
    label: "Maintenance",
    key: "operations",
    icon: (active: boolean) => (
      <svg
        className={`w-6 h-6 ${active ? "text-blue-400" : "text-gray-400"}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={active ? 2.5 : 2}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"
        />
      </svg>
    ),
  },
  {
    href: "/inspections",
    label: "Inspections",
    key: "inspections",
    icon: (active: boolean) => (
      <svg
        className={`w-6 h-6 ${active ? "text-blue-400" : "text-gray-400"}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={active ? 2.5 : 2}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
        />
      </svg>
    ),
  },
];

export default function BottomNav({ currentPage }: BottomNavProps) {
  return (
    <>
      {/* Spacer to prevent content from being hidden behind the fixed bar */}
      <div className="h-16 md:hidden safe-area-inset-bottom" aria-hidden="true" />

      {/* Bottom navigation bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 bg-gray-800 border-t border-gray-700 md:hidden safe-area-inset-bottom"
        aria-label="Mobile navigation"
        role="navigation"
      >
        <div className="flex items-stretch justify-around">
          {navItems.map((item) => {
            const isActive = currentPage === item.key;
            return (
              <Link
                key={item.key}
                href={item.href}
                aria-label={item.label}
                aria-current={isActive ? "page" : undefined}
                className={`
                  relative flex flex-col items-center justify-center flex-1
                  min-h-[56px] py-1.5 px-1
                  focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset
                  focus-visible:outline-none
                  ${isActive
                    ? "text-blue-400"
                    : "text-gray-400 active:text-gray-200"
                  }
                `}
              >
                {item.icon(isActive)}
                <span
                  className={`
                    mt-0.5 text-[10px] leading-tight font-medium truncate max-w-full
                    ${isActive ? "text-blue-400" : "text-gray-400"}
                  `}
                >
                  {item.label}
                </span>
                {isActive && (
                  <span
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-blue-400 rounded-b-full"
                    aria-hidden="true"
                  />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
