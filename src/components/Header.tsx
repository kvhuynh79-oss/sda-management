"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useSession } from "../hooks/useSession";
import { logout } from "../lib/auth";
import { useOrganization } from "../contexts/OrganizationContext";
import GlobalUploadModal from "./GlobalUploadModal";
import {
  Building2,
  Wrench,
  DollarSign,
  ShieldCheck,
  Database,
  MessageSquareMore,
  ChevronDown,
  Menu,
  X,
  Home,
  Users,
  DoorOpen,
  HardHat,
  ClipboardCheck,
  CalendarClock,
  CreditCard,
  BarChart3,
  AlertTriangle,
  FileText,
  Award,
  MessageCircleWarning,
  UserCog,
  HeartHandshake,
  Stethoscope,
  MessagesSquare,
  ListChecks,
  Search,
  Settings,
  UserCheck,
  Flame,
  LifeBuoy,
} from "lucide-react";

// ── Type definitions ──────────────────────────────────────────────

export type CurrentPage =
  | "dashboard"
  | "properties"
  | "participants"
  | "financials"
  | "operations"
  | "communications"
  | "database"
  | "incidents"
  | "compliance"
  | "onboarding"
  | "reports"
  | "ai"
  | "settings"
  | "admin"
  // Legacy - kept for backwards compatibility during transition
  | "payments"
  | "claims"
  | "maintenance"
  | "inspections"
  | "alerts"
  | "schedule"
  | "contractors"
  | "documents"
  | "follow-ups";

interface HeaderProps {
  currentPage?: CurrentPage;
}

// ── Navigation cluster definitions ────────────────────────────────

interface NavItem {
  href: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  pageKeys: CurrentPage[];
  /** If true, only shown for BLS organization (slug: better-living-solutions) */
  blsOnly?: boolean;
}

interface NavCluster {
  id: string;
  label: string;
  icon: React.ReactNode;
  items: NavItem[];
  pageKeys: CurrentPage[];
  /** If set, only users with these roles see this cluster */
  allowedRoles?: string[];
}

const NAV_CLUSTERS: NavCluster[] = [
  {
    id: "portfolio",
    label: "Portfolio",
    icon: <Building2 className="w-5 h-5" aria-hidden="true" />,
    pageKeys: ["properties", "participants", "onboarding"],
    items: [
      {
        href: "/properties",
        label: "Properties",
        description: "SDA properties and dwellings",
        icon: <Building2 className="w-5 h-5 text-gray-400" aria-hidden="true" />,
        pageKeys: ["properties"],
      },
      {
        href: "/participants",
        label: "Participants",
        description: "NDIS participants and plans",
        icon: <Users className="w-5 h-5 text-gray-400" aria-hidden="true" />,
        pageKeys: ["participants"],
      },
      {
        href: "/onboarding",
        label: "Onboarding",
        description: "Participant onboarding documents",
        icon: <DoorOpen className="w-5 h-5 text-gray-400" aria-hidden="true" />,
        pageKeys: ["onboarding"],
      },
    ],
  },
  {
    id: "operations",
    label: "Operations",
    icon: <Wrench className="w-5 h-5" aria-hidden="true" />,
    pageKeys: ["operations", "maintenance", "inspections", "schedule"],
    items: [
      {
        href: "/operations",
        label: "Maintenance",
        description: "Reactive maintenance requests",
        icon: <HardHat className="w-5 h-5 text-gray-400" aria-hidden="true" />,
        pageKeys: ["operations", "maintenance"],
      },
      {
        href: "/inspections",
        label: "Inspections",
        description: "Property inspection checklists",
        icon: <ClipboardCheck className="w-5 h-5 text-gray-400" aria-hidden="true" />,
        pageKeys: ["inspections"],
      },
      {
        href: "/preventative-schedule",
        label: "Preventative Schedule",
        description: "Scheduled maintenance tasks",
        icon: <CalendarClock className="w-5 h-5 text-gray-400" aria-hidden="true" />,
        pageKeys: ["schedule"],
      },
    ],
  },
  {
    id: "finance",
    label: "Finance",
    icon: <DollarSign className="w-5 h-5" aria-hidden="true" />,
    pageKeys: ["financials", "payments", "claims", "reports"],
    allowedRoles: ["admin", "property_manager", "staff", "accountant"],
    items: [
      {
        href: "/financials",
        label: "Payments",
        description: "SDA payments and NDIS exports",
        icon: <CreditCard className="w-5 h-5 text-gray-400" aria-hidden="true" />,
        pageKeys: ["financials", "payments", "claims"],
      },
      {
        href: "/reports",
        label: "Reports",
        description: "Compliance, financial, and contractor reports",
        icon: <BarChart3 className="w-5 h-5 text-gray-400" aria-hidden="true" />,
        pageKeys: ["reports"],
      },
    ],
  },
  {
    id: "compliance",
    label: "Compliance",
    icon: <ShieldCheck className="w-5 h-5" aria-hidden="true" />,
    pageKeys: ["incidents", "compliance", "documents", "alerts"],
    items: [
      {
        href: "/incidents",
        label: "Incidents",
        description: "Incident reports and NDIS notifications",
        icon: <AlertTriangle className="w-5 h-5 text-gray-400" aria-hidden="true" />,
        pageKeys: ["incidents"],
      },
      {
        href: "/documents",
        label: "Documents",
        description: "Document storage and expiry tracking",
        icon: <FileText className="w-5 h-5 text-gray-400" aria-hidden="true" />,
        pageKeys: ["documents"],
      },
      {
        href: "/compliance/certifications",
        label: "Certifications",
        description: "Compliance certifications and audits",
        icon: <Award className="w-5 h-5 text-gray-400" aria-hidden="true" />,
        pageKeys: ["compliance"],
      },
      {
        href: "/compliance/complaints",
        label: "Complaints",
        description: "NDIS complaints and SOP-001 procedure",
        icon: <MessageCircleWarning className="w-5 h-5 text-gray-400" aria-hidden="true" />,
        pageKeys: ["compliance"],
      },
      {
        href: "/compliance/staff",
        label: "Staff Files",
        description: "Staff records and screening compliance",
        icon: <UserCheck className="w-5 h-5 text-gray-400" aria-hidden="true" />,
        pageKeys: ["compliance"],
      },
      {
        href: "/compliance/emergency-plans",
        label: "Emergency Plans",
        description: "Emergency management plans per property",
        icon: <Flame className="w-5 h-5 text-gray-400" aria-hidden="true" />,
        pageKeys: ["compliance"],
        blsOnly: true,
      },
      {
        href: "/compliance/business-continuity",
        label: "Business Continuity",
        description: "Organisation business continuity planning",
        icon: <LifeBuoy className="w-5 h-5 text-gray-400" aria-hidden="true" />,
        pageKeys: ["compliance"],
        blsOnly: true,
      },
    ],
  },
  {
    id: "database",
    label: "Database",
    icon: <Database className="w-5 h-5" aria-hidden="true" />,
    pageKeys: ["database", "contractors"],
    allowedRoles: ["admin", "property_manager", "staff"],
    items: [
      {
        href: "/database",
        label: "Contractors",
        description: "Trade contractors for maintenance",
        icon: <UserCog className="w-5 h-5 text-gray-400" aria-hidden="true" />,
        pageKeys: ["database", "contractors"],
      },
      {
        href: "/database/support-coordinators",
        label: "Support Coordinators",
        description: "NDIS support coordinators",
        icon: <HeartHandshake className="w-5 h-5 text-gray-400" aria-hidden="true" />,
        pageKeys: [],
      },
      {
        href: "/database/sil-providers",
        label: "SIL Providers",
        description: "Supported Independent Living providers",
        icon: <Home className="w-5 h-5 text-gray-400" aria-hidden="true" />,
        pageKeys: [],
      },
      {
        href: "/database/occupational-therapists",
        label: "Occupational Therapists",
        description: "OTs for SDA assessments",
        icon: <Stethoscope className="w-5 h-5 text-gray-400" aria-hidden="true" />,
        pageKeys: [],
      },
    ],
  },
  {
    id: "communications",
    label: "Comms",
    icon: <MessageSquareMore className="w-5 h-5" aria-hidden="true" />,
    pageKeys: ["communications", "follow-ups"],
    items: [
      {
        href: "/communications",
        label: "Communications",
        description: "Email, SMS, and call tracking",
        icon: <MessagesSquare className="w-5 h-5 text-gray-400" aria-hidden="true" />,
        pageKeys: ["communications"],
      },
      {
        href: "/follow-ups",
        label: "Follow-ups",
        description: "Tasks and communication follow-ups",
        icon: <ListChecks className="w-5 h-5 text-gray-400" aria-hidden="true" />,
        pageKeys: ["follow-ups"],
      },
    ],
  },
];

// ── Helper: determine which cluster is active ─────────────────────

function getActiveClusterId(currentPage?: CurrentPage): string | null {
  if (!currentPage) return null;
  for (const cluster of NAV_CLUSTERS) {
    if (cluster.pageKeys.includes(currentPage)) {
      return cluster.id;
    }
  }
  return null;
}

// ── Dropdown component ────────────────────────────────────────────

function NavDropdown({
  cluster,
  isActive,
  isOpen,
  onToggle,
  onClose,
  orgSlug,
}: {
  cluster: NavCluster;
  isActive: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  orgSlug?: string;
}) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Handle keyboard navigation within dropdown
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        buttonRef.current?.focus();
      }
      if (!isOpen) return;

      const items = dropdownRef.current?.querySelectorAll<HTMLAnchorElement>(
        '[role="menuitem"]'
      );
      if (!items || items.length === 0) return;

      const currentIndex = Array.from(items).findIndex(
        (item) => item === document.activeElement
      );

      if (e.key === "ArrowDown") {
        e.preventDefault();
        const next = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
        items[next].focus();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const prev = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
        items[prev].focus();
      }
    },
    [isOpen, onClose]
  );

  // Auto-focus first item when dropdown opens
  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const firstItem =
        dropdownRef.current.querySelector<HTMLAnchorElement>('[role="menuitem"]');
      // Small delay to let the transition start
      const timer = setTimeout(() => firstItem?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  return (
    <div className="relative" onKeyDown={handleKeyDown}>
      <button
        ref={buttonRef}
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className={`
          flex items-center gap-1 px-2 lg:px-2.5 py-1.5 rounded-md text-sm font-medium
          transition-all duration-200
          focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500
          ${
            isActive
              ? "text-white"
              : "text-gray-300 hover:text-white hover:bg-gray-700/50"
          }
        `}
      >
        <span className="[&>svg]:w-4 [&>svg]:h-4">{cluster.icon}</span>
        <span className="hidden lg:inline text-sm">{cluster.label}</span>
        <ChevronDown
          className={`w-3 h-3 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
        {isActive && (
          <span
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-teal-500 rounded-t-full"
            aria-hidden="true"
          />
        )}
      </button>

      {/* Dropdown panel */}
      <div
        ref={dropdownRef}
        role="menu"
        aria-label={`${cluster.label} navigation`}
        className={`
          absolute top-full left-0 mt-1 w-72
          bg-gray-800 rounded-lg shadow-xl border border-gray-600
          transition-all duration-200 origin-top-left z-50
          ${
            isOpen
              ? "opacity-100 scale-100 translate-y-0"
              : "opacity-0 scale-95 -translate-y-1 pointer-events-none"
          }
        `}
      >
        <div className="py-2">
          {cluster.items
            .filter((item) => !item.blsOnly || orgSlug === "better-living-solutions")
            .map((item) => (
            <Link
              key={item.href}
              href={item.href}
              role="menuitem"
              tabIndex={isOpen ? 0 : -1}
              onClick={onClose}
              className="
                flex items-start gap-3 px-4 py-3
                hover:bg-gray-700/50 transition-colors duration-150
                focus:outline-none focus-visible:bg-gray-700/50
              "
            >
              <span className="mt-0.5 flex-shrink-0">{item.icon}</span>
              <div className="min-w-0">
                <div className="text-sm font-medium text-white">{item.label}</div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {item.description}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Mobile navigation overlay ─────────────────────────────────────

function MobileNav({
  isOpen,
  onClose,
  currentPage,
  userRole,
  orgSlug,
}: {
  isOpen: boolean;
  onClose: () => void;
  currentPage?: CurrentPage;
  userRole?: string;
  orgSlug?: string;
}) {
  const activeClusterId = getActiveClusterId(currentPage);

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

      {/* Slide-in panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className={`
          fixed inset-y-0 left-0 w-80 max-w-[85vw] bg-gray-800 z-50
          shadow-2xl border-r border-gray-600
          transition-transform duration-300 ease-out
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-600">
          <span className="text-white font-semibold text-lg">Navigation</span>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700/50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
            aria-label="Close navigation menu"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Navigation links */}
        <nav
          className="overflow-y-auto p-4 space-y-6"
          style={{ maxHeight: "calc(100vh - 65px)" }}
          aria-label="Mobile navigation"
        >
          {/* Dashboard link */}
          <Link
            href="/dashboard"
            onClick={onClose}
            className={`
              flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors
              ${
                currentPage === "dashboard"
                  ? "bg-teal-600/20 text-teal-400"
                  : "text-gray-300 hover:bg-gray-700/50 hover:text-white"
              }
            `}
          >
            <Home className="w-5 h-5" aria-hidden="true" />
            <span className="text-sm font-medium">Dashboard</span>
          </Link>

          {/* Clusters (filtered by role) */}
          {NAV_CLUSTERS.filter((c) => !c.allowedRoles || !userRole || c.allowedRoles.includes(userRole)).map((cluster) => {
            const clusterIsActive = cluster.id === activeClusterId;
            return (
              <div key={cluster.id}>
                <div
                  className={`
                    flex items-center gap-2 px-3 mb-2 text-xs font-semibold uppercase tracking-wider
                    ${clusterIsActive ? "text-teal-400" : "text-gray-300"}
                  `}
                >
                  {cluster.icon}
                  <span>{cluster.label}</span>
                </div>
                <div className="space-y-0.5">
                  {cluster.items
                    .filter((item) => !item.blsOnly || orgSlug === "better-living-solutions")
                    .map((item) => {
                    const isItemActive = item.pageKeys.includes(
                      currentPage as CurrentPage
                    );
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onClose}
                        className={`
                          flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors
                          ${
                            isItemActive
                              ? "bg-teal-600/20 text-teal-400"
                              : "text-gray-300 hover:bg-gray-700/50 hover:text-white"
                          }
                        `}
                      >
                        {item.icon}
                        <div className="min-w-0">
                          <div className="text-sm font-medium">{item.label}</div>
                          <div className="text-xs text-gray-400 truncate">
                            {item.description}
                          </div>
                        </div>
                      </Link>

                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Utility links */}
          <div>
            <div className="flex items-center gap-2 px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-gray-300">
              <span>Utilities</span>
            </div>
            <div className="space-y-0.5">
              <Link
                href="/admin/ai"
                onClick={onClose}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors
                  ${
                    currentPage === "ai"
                      ? "bg-teal-600/20 text-teal-400"
                      : "text-gray-300 hover:bg-gray-700/50 hover:text-white"
                  }
                `}
              >
                <Search className="w-5 h-5 text-gray-400" aria-hidden="true" />
                <span className="text-sm font-medium">AI Assistant</span>
              </Link>
              <Link
                href="/settings"
                onClick={onClose}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors
                  ${
                    currentPage === "settings"
                      ? "bg-teal-600/20 text-teal-400"
                      : "text-gray-300 hover:bg-gray-700/50 hover:text-white"
                  }
                `}
              >
                <ListChecks className="w-5 h-5 text-gray-400" aria-hidden="true" />
                <span className="text-sm font-medium">Settings</span>
              </Link>
            </div>
          </div>
        </nav>
      </div>
    </>
  );
}

// ── Main Header component ─────────────────────────────────────────

export default function Header({ currentPage }: HeaderProps) {
  const router = useRouter();
  const { user, loading } = useSession();
  const { organization } = useOrganization();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [openClusterId, setOpenClusterId] = useState<string | null>(null);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  const activeClusterId = getActiveClusterId(currentPage);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        headerRef.current &&
        !headerRef.current.contains(e.target as Node)
      ) {
        setOpenClusterId(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close dropdown on Escape (global)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenClusterId(null);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // Close dropdown on route change
  const pathname = usePathname();
  useEffect(() => {
    setOpenClusterId(null);
    setIsMobileNavOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    logout();
  };

  const toggleCluster = (clusterId: string) => {
    setOpenClusterId((prev) => (prev === clusterId ? null : clusterId));
  };

  return (
    <>
      <header
        ref={headerRef}
        className="bg-gray-800 border-b border-gray-600 sticky top-0 z-50"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            {/* Left: Mobile hamburger + Logo */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Hamburger for mobile */}
              <button
                onClick={() => setIsMobileNavOpen(true)}
                className="md:hidden p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700/50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                aria-label="Open navigation menu"
              >
                <Menu className="w-5 h-5" aria-hidden="true" />
              </button>

              {/* Logo */}
              <Link
                href="/dashboard"
                className="flex-shrink-0 flex items-center gap-2"
              >
                {organization?.resolvedLogoUrl ? (
                  <img
                    src={organization.resolvedLogoUrl}
                    alt={organization.name}
                    className="rounded object-contain h-7 w-auto max-w-[80px]"
                  />
                ) : (
                  <img
                    src="/mysda-logo-dark.svg"
                    alt="MySDAManager"
                    className="h-7 w-auto"
                  />
                )}
              </Link>
            </div>

            {/* Center: Navigation clusters (desktop only) */}
            <nav
              className="hidden md:flex items-center gap-0.5 mx-4 flex-1 justify-center"
              aria-label="Main navigation"
            >
              {/* Dashboard link */}
              <Link
                href="/dashboard"
                className={`
                  relative flex items-center gap-1 px-2 lg:px-3 py-1.5 rounded-md text-sm font-medium
                  transition-all duration-200
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500
                  ${
                    currentPage === "dashboard"
                      ? "text-white"
                      : "text-gray-300 hover:text-white hover:bg-gray-700/50"
                  }
                `}
              >
                <Home className="w-4 h-4" aria-hidden="true" />
                <span className="hidden lg:inline text-sm">Home</span>
                {currentPage === "dashboard" && (
                  <span
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-teal-500 rounded-t-full"
                    aria-hidden="true"
                  />
                )}
              </Link>

              {/* Dropdown clusters (filtered by role) */}
              {NAV_CLUSTERS
                .filter((c) => !c.allowedRoles || !user?.role || c.allowedRoles.includes(user.role))
                .map((cluster) => (
                <NavDropdown
                  key={cluster.id}
                  cluster={cluster}
                  isActive={cluster.id === activeClusterId}
                  isOpen={openClusterId === cluster.id}
                  onToggle={() => toggleCluster(cluster.id)}
                  onClose={() => setOpenClusterId(null)}
                  orgSlug={organization?.slug}
                />
              ))}
            </nav>

            {/* Right: User info + actions */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              {/* Cmd+K hint */}
              <button
                onClick={() => {
                  window.dispatchEvent(
                    new CustomEvent("open-command-palette")
                  );
                }}
                className="hidden md:flex items-center gap-1 px-2 py-1.5 rounded-md text-xs text-gray-400 hover:text-gray-300 bg-gray-700/50 hover:bg-gray-700 border border-gray-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                aria-label="Open command palette"
              >
                <Search className="w-3.5 h-3.5" aria-hidden="true" />
                <kbd className="text-[10px] bg-gray-600 px-1 py-0.5 rounded font-mono">
                  /
                </kbd>
              </button>

              {user && (
                <>
                  <span className="hidden lg:inline text-gray-300 text-sm truncate max-w-[120px]">
                    {user.firstName}
                  </span>
                  <span className="text-xs bg-teal-600 text-white px-1.5 py-0.5 rounded">
                    {user.role.replace("_", " ")}
                  </span>
                </>
              )}
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="text-gray-400 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded p-1.5"
                aria-label="Upload document"
                title="Upload Document"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
              </button>
              <Link
                href="/settings"
                className="text-gray-400 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded p-1.5"
                aria-label="Settings"
                title="Settings"
              >
                <Settings className="w-4 h-4" aria-hidden="true" />
              </Link>
              <button
                onClick={handleLogout}
                className="text-gray-400 hover:text-white transition-colors text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded px-1.5 py-1"
                aria-label="Logout from account"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile navigation overlay */}
      <MobileNav
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
        currentPage={currentPage}
        userRole={user?.role}
        orgSlug={organization?.slug}
      />

      {/* Global Upload Modal */}
      <GlobalUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={() => {
          setIsUploadModalOpen(false);
        }}
      />
    </>
  );
}
