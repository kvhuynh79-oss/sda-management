"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "../hooks/useSession";
import { logout } from "../lib/auth";
import GlobalUploadModal from "./GlobalUploadModal";

interface HeaderProps {
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
    | "contractors";
}

export default function Header({ currentPage }: HeaderProps) {
  const router = useRouter();
  const { user, loading } = useSession();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeItemRef = useRef<HTMLAnchorElement>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Scroll active nav item into view on mount/page change
  useEffect(() => {
    if (activeItemRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const activeItem = activeItemRef.current;

      // Calculate scroll position to center the active item
      const containerRect = container.getBoundingClientRect();
      const itemRect = activeItem.getBoundingClientRect();
      const scrollLeft = activeItem.offsetLeft - (containerRect.width / 2) + (itemRect.width / 2);

      container.scrollTo({ left: Math.max(0, scrollLeft), behavior: "instant" });
    }
  }, [currentPage]);

  const handleLogout = () => {
    logout(); // Uses centralized logout function
  };

  const navItems = [
    { href: "/dashboard", label: "Dashboard", key: "dashboard" },
    { href: "/properties", label: "Properties", key: "properties" },
    { href: "/participants", label: "Participants", key: "participants" },
    { href: "/financials", label: "Financials", key: "financials" },
    { href: "/operations", label: "Maintenance", key: "operations" },
    { href: "/communications", label: "Communications", key: "communications" },
    { href: "/database", label: "Database", key: "database" },
    { href: "/incidents", label: "Incidents", key: "incidents" },
    { href: "/compliance", label: "Compliance", key: "compliance" },
    { href: "/onboarding", label: "Onboarding", key: "onboarding" },
    { href: "/reports", label: "Reports", key: "reports" },
    { href: "/admin/ai", label: "AI Assistant", key: "ai" },
    { href: "/settings", label: "Settings", key: "settings" },
  ];

  return (
    <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50">
      {/* Top row - Logo and User info */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14 lg:h-16">
          <Link href="/dashboard" className="flex-shrink-0 flex items-center gap-3">
            <Image
              src="/Logo.jpg"
              alt="Better Living Solutions"
              width={120}
              height={48}
              className="rounded object-contain h-10 lg:h-12 w-auto"
              priority
            />
            <div className="hidden sm:flex flex-col border-l border-gray-600 pl-3">
              <span className="text-white font-semibold text-sm tracking-wide">MySDAManager</span>
              <span className="text-gray-400 text-xs">SDA Property Management</span>
            </div>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            {user && (
              <>
                <span className="hidden sm:inline text-gray-300 text-sm">
                  {user.firstName} {user.lastName}
                </span>
                <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded">
                  {user.role.replace("_", " ")}
                </span>
              </>
            )}
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="text-gray-400 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded p-2"
              aria-label="Upload document"
              title="Upload Document"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </button>
            <button
              onClick={handleLogout}
              className="text-gray-400 hover:text-white transition-colors text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded px-2 py-1"
              aria-label="Logout from account"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
      {/* Navigation - scrollable on mobile */}
      <div
        ref={scrollContainerRef}
        className="overflow-x-scroll scrollbar-hide touch-pan-x max-w-7xl mx-auto"
        style={{ WebkitOverflowScrolling: 'touch', overscrollBehaviorX: 'contain' }}
      >
        <nav
          className="flex gap-3 sm:gap-4 pb-2 px-4 sm:px-6 lg:px-8 min-w-max lg:w-auto lg:justify-center"
          aria-label="Main navigation"
        >
        {navItems.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            ref={currentPage === item.key ? activeItemRef : null}
            aria-current={currentPage === item.key ? "page" : undefined}
            className={`whitespace-nowrap text-sm flex-shrink-0 py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded px-1 ${
              currentPage === item.key
                ? "text-white font-medium border-b-2 border-blue-500 pb-1"
                : "text-gray-400 hover:text-white transition-colors"
            }`}
          >
            {item.label}
          </Link>
        ))}
          {/* Spacer to ensure last item is scrollable into view */}
          <div className="flex-shrink-0 w-4" aria-hidden="true" />
        </nav>
      </div>

      {/* Global Upload Modal */}
      <GlobalUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={() => {
          setIsUploadModalOpen(false);
          // Optionally refresh the page or show a success message
        }}
      />
    </header>
  );
}
