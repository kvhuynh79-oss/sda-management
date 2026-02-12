"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import Header from "../../../components/Header";
import { RequireAuth } from "../../../components/RequireAuth";
import { useSession } from "../../../hooks/useSession";
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Check,
} from "lucide-react";

// ── Checklist item and category types ──────────────────────────────

interface ChecklistItem {
  key: string;
  title: string;
  description: string;
  link?: string;
  linkText?: string;
  cost?: string;
  preChecked?: boolean;
}

interface ChecklistCategory {
  id: string;
  title: string;
  icon: string;
  items: ChecklistItem[];
}

// ── Checklist definitions ──────────────────────────────────────────

const CHECKLIST_CATEGORIES: ChecklistCategory[] = [
  {
    id: "identity",
    title: "Identity & Legal Structure",
    icon: "shield",
    items: [
      {
        key: "director_id",
        title: "Apply for Director ID",
        description:
          "15-digit identifier via myGovID app, mandatory for all Australian directors",
        link: "https://www.abrs.gov.au/director-identification-number",
        linkText: "Apply on myGovID",
      },
      {
        key: "company_name",
        title: "Choose Company Name",
        description:
          "Check if 'MySDAManager Pty Ltd' is available on the ASIC register",
        link: "https://connectonline.asic.gov.au/RegistrySearch/faces/landing/SearchRegisters.jspx",
        linkText: "Search ASIC",
      },
      {
        key: "register_pty_ltd",
        title: "Register Pty Ltd with ASIC",
        description:
          "Sole Director, Sole Shareholder initially. Cost: ~$576 + service fee",
        cost: "$576",
      },
    ],
  },
  {
    id: "tax_finance",
    title: "Tax & Finance Setup",
    icon: "banknotes",
    items: [
      {
        key: "abn_tfn",
        title: "Apply for ABN & TFN",
        description:
          "Via Australian Business Register. Needs ACN (company number) first",
        link: "https://www.abr.gov.au/",
        linkText: "Go to ABR",
      },
      {
        key: "register_gst",
        title: "Register for GST",
        description:
          "Claim back 10% GST on development and hosting costs",
      },
      {
        key: "bank_account",
        title: "Open Business Bank Account",
        description:
          "Separate from MMZ Building Solutions. Consider Airwallex or Macquarie for tech integrations",
      },
    ],
  },
  {
    id: "stripe",
    title: "Stripe Integration",
    icon: "credit-card",
    items: [
      {
        key: "stripe_account",
        title: "Create Stripe Business Account",
        description:
          "Link to company ABN and business bank account",
        link: "https://dashboard.stripe.com/register",
        linkText: "Create on Stripe",
      },
      {
        key: "stripe_gst",
        title: "Configure 10% GST Tax Rate",
        description:
          "Set up Australian GST in Stripe Tax settings",
      },
      {
        key: "stripe_xero",
        title: "Link Stripe to Xero",
        description:
          "Auto-create paid invoices for every subscription payment",
      },
      {
        key: "stripe_env_vars",
        title: "Set Stripe Environment Variables",
        description:
          "STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, price IDs in Convex + Vercel",
      },
    ],
  },
  {
    id: "ip",
    title: "Intellectual Property & Digital Assets",
    icon: "sparkles",
    items: [
      {
        key: "trademark",
        title: "File Trademark with IP Australia",
        description:
          "Headstart application for name + logo. Class 9 + Class 42, ~$500",
        cost: "$500",
        link: "https://www.ipaustralia.gov.au/trade-marks",
        linkText: "IP Australia",
      },
      {
        key: "domain_com_au",
        title: "Secure .com.au Domain",
        description:
          "Register mysdamanager.com.au under the new company ABN",
      },
    ],
  },
  {
    id: "compliance",
    title: "NSW NDIS Compliance",
    icon: "check-badge",
    items: [
      {
        key: "privacy_policy",
        title: "Privacy Policy (Health Data under APPs)",
        description:
          "Covers sensitive information handling under Australian Privacy Principles",
        preChecked: true,
      },
      {
        key: "data_breach_plan",
        title: "Data Breach Response Plan",
        description:
          "Documented in Privacy Policy section 7, NDB scheme compliant",
        preChecked: true,
      },
      {
        key: "sentry",
        title: "Configure Sentry Error Tracking",
        description:
          "Set NEXT_PUBLIC_SENTRY_DSN and SENTRY_AUTH_TOKEN in Vercel",
      },
    ],
  },
];

const TOTAL_ITEMS = CHECKLIST_CATEGORIES.reduce(
  (sum, cat) => sum + cat.items.length,
  0
);

// ── SVG category icons ─────────────────────────────────────────────

function CategoryIcon({ icon }: { icon: string }) {
  switch (icon) {
    case "shield":
      return (
        <svg
          className="w-5 h-5 text-teal-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
      );
    case "banknotes":
      return (
        <svg
          className="w-5 h-5 text-teal-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"
          />
        </svg>
      );
    case "credit-card":
      return (
        <svg
          className="w-5 h-5 text-teal-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z"
          />
        </svg>
      );
    case "sparkles":
      return (
        <svg
          className="w-5 h-5 text-teal-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
          />
        </svg>
      );
    case "check-badge":
      return (
        <svg
          className="w-5 h-5 text-teal-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.745 3.745 0 011.043 3.296A3.745 3.745 0 0121 12z"
          />
        </svg>
      );
    default:
      return null;
  }
}

// ── Page wrapper with RequireAuth ─────────────────────────────────

export default function LaunchChecklistPage() {
  return (
    <RequireAuth allowedRoles={["admin"]}>
      <LaunchChecklistContent />
    </RequireAuth>
  );
}

// ── Main content component ────────────────────────────────────────

function LaunchChecklistContent() {
  const { user } = useSession();
  const [expandedCategories, setExpandedCategories] = useState<
    Record<string, boolean>
  >(() => {
    const initial: Record<string, boolean> = {};
    for (const cat of CHECKLIST_CATEGORIES) {
      initial[cat.id] = true;
    }
    return initial;
  });

  const checklistData = useQuery(
    api.launchChecklist.getAll,
    user ? { userId: user.id as Id<"users"> } : "skip"
  );
  const toggleItem = useMutation(api.launchChecklist.toggleItem);

  // Build a map of itemKey -> DB record for quick lookup
  const itemMap = useMemo(() => {
    const map: Record<
      string,
      { completed: boolean; completedAt?: number; notes?: string }
    > = {};
    if (checklistData) {
      for (const record of checklistData) {
        map[record.itemKey] = {
          completed: record.completed,
          completedAt: record.completedAt,
          notes: record.notes,
        };
      }
    }
    return map;
  }, [checklistData]);

  // Determine effective checked state for an item
  function isItemChecked(item: ChecklistItem): boolean {
    const record = itemMap[item.key];
    if (record !== undefined) {
      return record.completed;
    }
    // No DB record: if preChecked, show as checked
    return !!item.preChecked;
  }

  // Count completed items overall
  const completedCount = useMemo(() => {
    let count = 0;
    for (const cat of CHECKLIST_CATEGORIES) {
      for (const item of cat.items) {
        if (isItemChecked(item)) count++;
      }
    }
    return count;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemMap]);

  // Count completed items per category
  function getCategoryCompleted(category: ChecklistCategory): number {
    let count = 0;
    for (const item of category.items) {
      if (isItemChecked(item)) count++;
    }
    return count;
  }

  const overallPercent = Math.round((completedCount / TOTAL_ITEMS) * 100);

  // Handle checkbox toggle
  async function handleToggle(item: ChecklistItem) {
    if (!user) return;
    const currentlyChecked = isItemChecked(item);
    await toggleItem({
      userId: user.id as Id<"users">,
      itemKey: item.key,
      completed: !currentlyChecked,
    });
  }

  function toggleCategory(categoryId: string) {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  }

  function formatCompletionDate(timestamp?: number): string {
    if (!timestamp) return "";
    return new Date(timestamp).toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  const isLoading = checklistData === undefined;

  return (
    <div className="min-h-screen bg-gray-900">
      <Header currentPage="settings" />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">
            Go-Live Launch Checklist
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            Track the business milestones needed to launch MySDAManager as a
            registered company.
          </p>
        </div>

        {/* Overall progress bar */}
        <div className="mb-8 bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-white">
              Overall Progress
            </span>
            <span className="text-sm font-medium text-gray-400">
              {completedCount} of {TOTAL_ITEMS} complete ({overallPercent}%)
            </span>
          </div>
          <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-teal-600 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${overallPercent}%` }}
            />
          </div>
        </div>

        {/* Loading skeleton */}
        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="bg-gray-800 border border-gray-700 rounded-lg p-4 animate-pulse"
              >
                <div className="h-5 bg-gray-700 rounded w-1/3 mb-3" />
                <div className="h-3 bg-gray-700 rounded w-full mb-2" />
                <div className="h-3 bg-gray-700 rounded w-2/3" />
              </div>
            ))}
          </div>
        )}

        {/* Category cards */}
        {!isLoading && (
          <div className="space-y-4">
            {CHECKLIST_CATEGORIES.map((category) => {
              const catCompleted = getCategoryCompleted(category);
              const catTotal = category.items.length;
              const catPercent = Math.round((catCompleted / catTotal) * 100);
              const isExpanded = expandedCategories[category.id] ?? true;

              return (
                <div
                  key={category.id}
                  className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden"
                >
                  {/* Category header */}
                  <button
                    onClick={() => toggleCategory(category.id)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-700/50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-inset"
                    aria-expanded={isExpanded}
                    aria-controls={`category-${category.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <CategoryIcon icon={category.icon} />
                      <span className="text-sm font-semibold text-white">
                        {category.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-medium text-gray-400">
                        {catCompleted} of {catTotal}
                      </span>
                      {/* Mini progress bar */}
                      <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden hidden sm:block">
                        <div
                          className="h-full bg-teal-600 rounded-full transition-all duration-300"
                          style={{ width: `${catPercent}%` }}
                        />
                      </div>
                      {isExpanded ? (
                        <ChevronDown
                          className="w-4 h-4 text-gray-400"
                          aria-hidden="true"
                        />
                      ) : (
                        <ChevronRight
                          className="w-4 h-4 text-gray-400"
                          aria-hidden="true"
                        />
                      )}
                    </div>
                  </button>

                  {/* Category items */}
                  {isExpanded && (
                    <div
                      id={`category-${category.id}`}
                      className="border-t border-gray-700"
                    >
                      {category.items.map((item) => {
                        const checked = isItemChecked(item);
                        const record = itemMap[item.key];
                        const isPreVerified =
                          item.preChecked && record === undefined;

                        return (
                          <div
                            key={item.key}
                            className="flex items-start gap-3 px-4 py-3 hover:bg-gray-700/50 transition-colors border-b border-gray-700/50 last:border-b-0"
                          >
                            {/* Checkbox */}
                            <button
                              onClick={() => handleToggle(item)}
                              className={`
                                mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center
                                transition-all duration-200
                                focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-800
                                ${
                                  checked
                                    ? "bg-teal-600 border-teal-600"
                                    : "border-gray-500 hover:border-gray-400"
                                }
                              `}
                              role="checkbox"
                              aria-checked={checked}
                              aria-label={`Mark "${item.title}" as ${checked ? "incomplete" : "complete"}`}
                            >
                              {checked && (
                                <Check
                                  className="w-3.5 h-3.5 text-white"
                                  aria-hidden="true"
                                />
                              )}
                            </button>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span
                                  className={`text-sm font-medium ${
                                    checked
                                      ? "line-through text-gray-400"
                                      : "text-white"
                                  }`}
                                >
                                  {item.title}
                                </span>
                                {item.cost && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium rounded bg-yellow-900/40 text-yellow-400 border border-yellow-700/50">
                                    {item.cost}
                                  </span>
                                )}
                                {isPreVerified && (
                                  <span className="text-xs text-teal-400 font-medium">
                                    (Pre-verified)
                                  </span>
                                )}
                              </div>
                              <p className="mt-0.5 text-sm text-gray-400">
                                {item.description}
                              </p>
                              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                {item.link && (
                                  <a
                                    href={item.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs font-medium text-teal-400 hover:text-teal-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded"
                                  >
                                    {item.linkText || "Visit"}
                                    <ExternalLink
                                      className="w-3 h-3"
                                      aria-hidden="true"
                                    />
                                  </a>
                                )}
                                {checked && record?.completedAt && (
                                  <span className="text-xs text-gray-400">
                                    Completed{" "}
                                    {formatCompletionDate(record.completedAt)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
