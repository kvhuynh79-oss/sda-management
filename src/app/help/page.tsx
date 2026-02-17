"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { RequireAuth } from "@/components/RequireAuth";
import { HELP_GUIDES } from "@/constants/helpGuides";

// ---------------------------------------------------------------------------
// Guide-to-route mapping
// ---------------------------------------------------------------------------

const GUIDE_ROUTES: Record<string, string> = {
  dashboard: "/dashboard",
  properties: "/properties",
  participants: "/participants",
  maintenance: "/operations",
  inspections: "/inspections",
  incidents: "/incidents",
  contractors: "/database",
  staff: "/compliance/staff",
  emergency_plans: "/emergency-plans",
  "emergency-plans": "/emergency-plans",
  "business-continuity": "/compliance/business-continuity",
  financials: "/financials",
  payments: "/financials",
  communications: "/follow-ups",
  follow_ups: "/follow-ups",
  complaints: "/compliance/complaints",
  certifications: "/compliance/certifications",
  documents: "/documents",
  settings: "/settings",
  calendar: "/calendar",
  alerts: "/alerts",
  reports: "/reports",
  policies: "/compliance/policies",
};

// ---------------------------------------------------------------------------
// Category definitions
// ---------------------------------------------------------------------------

interface GuideCategory {
  name: string;
  description: string;
  guideIds: string[];
}

const CATEGORIES: GuideCategory[] = [
  {
    name: "Getting Started",
    description: "Learn the basics and orient yourself",
    guideIds: ["dashboard"],
  },
  {
    name: "Operations",
    description: "Day-to-day property and participant management",
    guideIds: [
      "properties",
      "participants",
      "maintenance",
      "inspections",
      "incidents",
      "contractors",
      "staff",
      "emergency_plans",
    ],
  },
  {
    name: "Finance",
    description: "Payments, claims, invoicing, and tasks",
    guideIds: ["financials", "communications"],
  },
  {
    name: "Compliance",
    description: "NDIS compliance, certifications, and documentation",
    guideIds: ["complaints", "certifications", "documents", "policies"],
  },
  {
    name: "Settings",
    description: "Configuration, integrations, alerts, and reporting",
    guideIds: ["settings", "calendar", "alerts", "reports"],
  },
];

// ---------------------------------------------------------------------------
// Category icon SVGs
// ---------------------------------------------------------------------------

function CategoryIcon({ name }: { name: string }) {
  const cls = "w-5 h-5";
  const shared = {
    className: cls,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    viewBox: "0 0 24 24",
    "aria-hidden": true as const,
  };

  switch (name) {
    case "Getting Started":
      return (
        <svg {...shared}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
          />
        </svg>
      );
    case "Operations":
      return (
        <svg {...shared}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11.42 15.17l-5.66 5.66a2.12 2.12 0 01-3-3l5.66-5.66m0 0l2.12-2.12a4.24 4.24 0 016 0l.7.7a4.24 4.24 0 010 6l-2.12 2.12m-6.36-6.36l6.36 6.36M21 12a2.25 2.25 0 00-2.25-2.25H18M3 12a2.25 2.25 0 012.25-2.25H6"
          />
        </svg>
      );
    case "Finance":
      return (
        <svg {...shared}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );
    case "Compliance":
      return (
        <svg {...shared}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
          />
        </svg>
      );
    case "Settings":
      return (
        <svg {...shared}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      );
    default:
      return (
        <svg {...shared}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
          />
        </svg>
      );
  }
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function HelpCenterPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  // Build list of all available guides
  const allGuides = useMemo(() => {
    return Object.entries(HELP_GUIDES).map(([key, guide]) => ({
      key,
      guide,
      route: GUIDE_ROUTES[key] || "/dashboard",
    }));
  }, []);

  // Filter guides by search query
  const matchesSearch = useMemo(() => {
    if (!searchQuery.trim()) return null; // null means show categories

    const q = searchQuery.toLowerCase();
    return allGuides.filter(({ guide }) => {
      return (
        guide.title.toLowerCase().includes(q) ||
        guide.subtitle.toLowerCase().includes(q) ||
        guide.overview.toLowerCase().includes(q)
      );
    });
  }, [searchQuery, allGuides]);

  const handleGuideClick = (guideKey: string) => {
    const route = GUIDE_ROUTES[guideKey] || "/dashboard";
    router.push(`${route}?showHelp=true`);
  };

  return (
    <RequireAuth>
      <div className="min-h-screen bg-gray-900 text-white">
        <Header currentPage="help" />

        <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
          {/* Page header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <svg
                className="w-8 h-8 text-teal-400"
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
              <h1 className="text-2xl font-bold">Help Center</h1>
            </div>
            <p className="text-gray-400">
              Find answers and guides for all features
            </p>
          </div>

          {/* Search bar */}
          <div className="relative mb-8">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search guides by title, topic, or keyword..."
              className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent"
              aria-label="Search help guides"
              autoComplete="off"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-white rounded transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                aria-label="Clear search"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>

          {/* Search results */}
          {matchesSearch !== null ? (
            <div>
              <p className="text-sm text-gray-400 mb-4">
                {matchesSearch.length} result
                {matchesSearch.length !== 1 ? "s" : ""} for &quot;{searchQuery}
                &quot;
              </p>
              {matchesSearch.length === 0 ? (
                <div className="text-center py-12">
                  <svg
                    className="w-12 h-12 text-gray-600 mx-auto mb-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                    />
                  </svg>
                  <p className="text-gray-400 text-sm">
                    No guides match your search. Try different keywords.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {matchesSearch.map(({ key, guide }) => (
                    <GuideCard
                      key={key}
                      guideKey={key}
                      title={guide.title}
                      subtitle={guide.subtitle}
                      sectionCount={guide.sections.length}
                      onClick={() => handleGuideClick(key)}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Category view */
            <div className="space-y-10">
              {CATEGORIES.map((category) => {
                // Only show guides that exist in HELP_GUIDES
                const categoryGuides = category.guideIds.filter(
                  (id) => HELP_GUIDES[id]
                );
                if (categoryGuides.length === 0) return null;

                return (
                  <section key={category.name}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-teal-400">
                        <CategoryIcon name={category.name} />
                      </span>
                      <h2 className="text-lg font-semibold">{category.name}</h2>
                    </div>
                    <p className="text-sm text-gray-400 mb-4">
                      {category.description}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {categoryGuides.map((guideId) => {
                        const guide = HELP_GUIDES[guideId];
                        if (!guide) return null;
                        return (
                          <GuideCard
                            key={guideId}
                            guideKey={guideId}
                            title={guide.title}
                            subtitle={guide.subtitle}
                            sectionCount={guide.sections.length}
                            onClick={() => handleGuideClick(guideId)}
                          />
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          )}

          {/* Contact Support footer */}
          <div className="mt-12 pt-8 border-t border-gray-700">
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 text-center">
              <svg
                className="w-8 h-8 text-teal-400 mx-auto mb-3"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
                />
              </svg>
              <h3 className="text-white font-semibold mb-1">
                Can&apos;t find what you&apos;re looking for?
              </h3>
              <p className="text-sm text-gray-400 mb-4">
                Our support team is here to help with any questions.
              </p>
              <a
                href="/support"
                className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                  />
                </svg>
                Contact Support
              </a>
            </div>
          </div>
        </main>
      </div>
    </RequireAuth>
  );
}

// ---------------------------------------------------------------------------
// Guide card component
// ---------------------------------------------------------------------------

function GuideCard({
  guideKey,
  title,
  subtitle,
  sectionCount,
  onClick,
}: {
  guideKey: string;
  title: string;
  subtitle: string;
  sectionCount: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="text-left bg-gray-800 border border-gray-700 rounded-lg p-4 hover:bg-gray-700/80 hover:border-gray-600 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 group"
      aria-label={`Open guide: ${title}`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-sm font-semibold text-white group-hover:text-teal-400 transition-colors leading-tight">
          {title}
        </h3>
        <svg
          className="w-4 h-4 text-gray-500 group-hover:text-teal-400 transition-colors shrink-0 mt-0.5"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
          />
        </svg>
      </div>
      <p className="text-xs text-gray-400 mb-3 line-clamp-2">{subtitle}</p>
      <div className="flex items-center gap-1 text-xs text-gray-500">
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
          />
        </svg>
        <span>
          {sectionCount} section{sectionCount !== 1 ? "s" : ""}
        </span>
      </div>
    </button>
  );
}
