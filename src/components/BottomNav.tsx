"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import {
  Home,
  Building2,
  AlertTriangle,
  Wrench,
  MoreHorizontal,
  X,
  Users,
  CreditCard,
  BarChart3,
  FileText,
  Award,
  MessageCircleWarning,
  ClipboardCheck,
  CalendarClock,
  CalendarDays,
  UserCog,
  HeartHandshake,
  Stethoscope,
  MessagesSquare,
  ListChecks,
  Settings,
  Search,
} from "lucide-react";

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
    | "contractors"
    | "follow-ups"
    | "calendar";
}

// ── "More" sheet item definitions ─────────────────────────────────

interface MoreSheetItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

interface MoreSheetGroup {
  label: string;
  items: MoreSheetItem[];
}

const MORE_SHEET_GROUPS: MoreSheetGroup[] = [
  {
    label: "Portfolio",
    items: [
      {
        href: "/participants",
        label: "Participants",
        icon: <Users className="w-5 h-5" aria-hidden="true" />,
      },
    ],
  },
  {
    label: "Operations",
    items: [
      {
        href: "/inspections",
        label: "Inspections",
        icon: <ClipboardCheck className="w-5 h-5" aria-hidden="true" />,
      },
      {
        href: "/preventative-schedule",
        label: "Preventative Schedule",
        icon: <CalendarClock className="w-5 h-5" aria-hidden="true" />,
      },
      {
        href: "/calendar",
        label: "Compliance Watchdog",
        icon: <CalendarDays className="w-5 h-5" aria-hidden="true" />,
      },
    ],
  },
  {
    label: "Finance",
    items: [
      {
        href: "/financials",
        label: "Payments",
        icon: <CreditCard className="w-5 h-5" aria-hidden="true" />,
      },
      {
        href: "/reports",
        label: "Reports",
        icon: <BarChart3 className="w-5 h-5" aria-hidden="true" />,
      },
    ],
  },
  {
    label: "Compliance",
    items: [
      {
        href: "/documents",
        label: "Evidence Vault",
        icon: <FileText className="w-5 h-5" aria-hidden="true" />,
      },
      {
        href: "/compliance/certifications",
        label: "Certifications",
        icon: <Award className="w-5 h-5" aria-hidden="true" />,
      },
      {
        href: "/compliance/complaints",
        label: "Complaints",
        icon: <MessageCircleWarning className="w-5 h-5" aria-hidden="true" />,
      },
    ],
  },
  {
    label: "Database",
    items: [
      {
        href: "/database",
        label: "Contractors",
        icon: <UserCog className="w-5 h-5" aria-hidden="true" />,
      },
      {
        href: "/database/support-coordinators",
        label: "Support Coordinators",
        icon: <HeartHandshake className="w-5 h-5" aria-hidden="true" />,
      },
      {
        href: "/database/sil-providers",
        label: "SIL Providers",
        icon: <Home className="w-5 h-5" aria-hidden="true" />,
      },
      {
        href: "/database/occupational-therapists",
        label: "Occupational Therapists",
        icon: <Stethoscope className="w-5 h-5" aria-hidden="true" />,
      },
    ],
  },
  {
    label: "Communications",
    items: [
      {
        href: "/communications",
        label: "Communications",
        icon: <MessagesSquare className="w-5 h-5" aria-hidden="true" />,
      },
      {
        href: "/follow-ups",
        label: "Follow-ups",
        icon: <ListChecks className="w-5 h-5" aria-hidden="true" />,
      },
    ],
  },
  {
    label: "Utilities",
    items: [
      {
        href: "/admin/ai",
        label: "AI Assistant",
        icon: <Search className="w-5 h-5" aria-hidden="true" />,
      },
      {
        href: "/settings",
        label: "Settings",
        icon: <Settings className="w-5 h-5" aria-hidden="true" />,
      },
    ],
  },
];

// ── Bottom sheet for "More" items ─────────────────────────────────

function MoreSheet({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`
          fixed inset-0 bg-black/60 backdrop-blur-sm z-40
          transition-opacity duration-300
          ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}
        `}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Bottom sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="More navigation options"
        className={`
          fixed inset-x-0 bottom-0 z-50 bg-gray-800
          border-t border-gray-600 rounded-t-2xl
          shadow-2xl
          transition-transform duration-300 ease-out
          ${isOpen ? "translate-y-0" : "translate-y-full"}
        `}
        style={{ maxHeight: "75vh" }}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-600 rounded-full" aria-hidden="true" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3 border-b border-gray-600">
          <span className="text-white font-semibold">More</span>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700/50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
            aria-label="Close more options"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Scrollable content */}
        <nav
          className="overflow-y-auto px-4 py-4 space-y-5"
          style={{ maxHeight: "calc(75vh - 80px)" }}
          aria-label="Additional navigation"
        >
          {MORE_SHEET_GROUPS.map((group) => (
            <div key={group.label}>
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-300 mb-2 px-1">
                {group.label}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {group.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-lg text-gray-300 hover:bg-gray-700/50 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                  >
                    {item.icon}
                    <span className="text-[11px] text-center leading-tight font-medium">
                      {item.label}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </div>
    </>
  );
}

// ── Main BottomNav component ──────────────────────────────────────

const primaryNavItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
    key: "dashboard",
    icon: Home,
  },
  {
    href: "/properties",
    label: "Properties",
    key: "properties",
    icon: Building2,
  },
  {
    href: "/incidents",
    label: "Incidents",
    key: "incidents",
    icon: AlertTriangle,
  },
  {
    href: "/operations",
    label: "Maintenance",
    key: "operations",
    matchKeys: ["operations", "maintenance"],
    icon: Wrench,
  },
];

export default function BottomNav({ currentPage }: BottomNavProps) {
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  // Determine if "More" tab should show as active
  const primaryKeys = ["dashboard", "properties", "incidents", "operations", "maintenance"];
  const isMoreActive = currentPage ? !primaryKeys.includes(currentPage) : false;

  return (
    <>
      {/* Spacer to prevent content from being hidden behind the fixed bar */}
      <div className="h-16 md:hidden safe-area-inset-bottom" aria-hidden="true" />

      {/* More sheet */}
      <MoreSheet isOpen={isMoreOpen} onClose={() => setIsMoreOpen(false)} />

      {/* Bottom navigation bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 bg-gray-800 border-t border-gray-600 md:hidden safe-area-inset-bottom"
        aria-label="Mobile navigation"
        role="navigation"
      >
        <div className="flex items-stretch justify-around">
          {primaryNavItems.map((item) => {
            const matchKeys = "matchKeys" in item ? (item as { matchKeys: string[] }).matchKeys : [item.key];
            const isActive = currentPage ? matchKeys.includes(currentPage) : false;
            const Icon = item.icon;
            return (
              <Link
                key={item.key}
                href={item.href}
                aria-label={item.label}
                aria-current={isActive ? "page" : undefined}
                className={`
                  relative flex flex-col items-center justify-center flex-1
                  min-h-[56px] py-1.5 px-1
                  focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-inset
                  focus-visible:outline-none
                  ${isActive
                    ? "text-teal-400"
                    : "text-gray-400 active:text-gray-200"
                  }
                `}
              >
                <Icon
                  className={`w-6 h-6 ${isActive ? "text-teal-400" : "text-gray-400"}`}
                  strokeWidth={isActive ? 2.5 : 2}
                  aria-hidden="true"
                />
                <span
                  className={`
                    mt-0.5 text-[10px] leading-tight font-medium truncate max-w-full
                    ${isActive ? "text-teal-400" : "text-gray-400"}
                  `}
                >
                  {item.label}
                </span>
                {isActive && (
                  <span
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-teal-400 rounded-b-full"
                    aria-hidden="true"
                  />
                )}
              </Link>
            );
          })}

          {/* More button */}
          <button
            onClick={() => setIsMoreOpen(true)}
            aria-label="More navigation options"
            className={`
              relative flex flex-col items-center justify-center flex-1
              min-h-[56px] py-1.5 px-1
              focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-inset
              focus-visible:outline-none
              ${isMoreActive
                ? "text-teal-400"
                : "text-gray-400 active:text-gray-200"
              }
            `}
          >
            <MoreHorizontal
              className={`w-6 h-6 ${isMoreActive ? "text-teal-400" : "text-gray-400"}`}
              strokeWidth={isMoreActive ? 2.5 : 2}
              aria-hidden="true"
            />
            <span
              className={`
                mt-0.5 text-[10px] leading-tight font-medium truncate max-w-full
                ${isMoreActive ? "text-teal-400" : "text-gray-400"}
              `}
            >
              More
            </span>
            {isMoreActive && (
              <span
                className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-teal-400 rounded-b-full"
                aria-hidden="true"
              />
            )}
          </button>
        </div>
      </nav>
    </>
  );
}
