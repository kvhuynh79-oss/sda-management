"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";

interface HeaderProps {
  currentPage?:
    | "dashboard"
    | "properties"
    | "participants"
    | "financials"
    | "operations"
    | "database"
    | "incidents"
    | "compliance"
    | "documents"
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
  const [user, setUser] = useState<{
    firstName: string;
    lastName: string;
    role: string;
  } | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeItemRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("sda_user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

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
    localStorage.removeItem("sda_user");
    router.push("/login");
  };

  const navItems = [
    { href: "/dashboard", label: "Dashboard", key: "dashboard" },
    { href: "/properties", label: "Properties", key: "properties" },
    { href: "/participants", label: "Participants", key: "participants" },
    { href: "/financials", label: "Financials", key: "financials" },
    { href: "/operations", label: "Maintenance", key: "operations" },
    { href: "/database", label: "Database", key: "database" },
    { href: "/incidents", label: "Incidents", key: "incidents" },
    { href: "/compliance", label: "Compliance", key: "compliance" },
    { href: "/documents", label: "Documents", key: "documents" },
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
          <Link href="/dashboard" className="flex-shrink-0">
            <Image
              src="/Logo.jpg"
              alt="Better Living Solutions"
              width={120}
              height={48}
              className="rounded object-contain h-10 lg:h-12 w-auto"
              priority
            />
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
        className="w-full overflow-x-auto scrollbar-hide"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <nav
          className="flex gap-3 sm:gap-4 pb-2 px-4 sm:px-6 lg:px-8 min-w-max"
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
                ? "text-white font-medium"
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
    </header>
  );
}
