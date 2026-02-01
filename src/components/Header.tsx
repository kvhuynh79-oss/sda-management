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
    | "contractors"
    | "database"
    | "incidents"
    | "documents"
    | "onboarding"
    | "reports"
    | "ai"
    | "settings"
    // Legacy - kept for backwards compatibility during transition
    | "payments"
    | "claims"
    | "maintenance"
    | "inspections"
    | "alerts"
    | "schedule";
}

// Database dropdown items
const databaseItems = [
  { href: "/database/support-coordinators", label: "Support Coordinators" },
  { href: "/contractors", label: "Contractors" },
];

export default function Header({ currentPage }: HeaderProps) {
  const router = useRouter();
  const [user, setUser] = useState<{
    firstName: string;
    lastName: string;
    role: string;
  } | null>(null);
  const [databaseOpen, setDatabaseOpen] = useState(false);
  const databaseRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("sda_user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (databaseRef.current && !databaseRef.current.contains(event.target as Node)) {
        setDatabaseOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("sda_user");
    router.push("/login");
  };

  const navItems = [
    { href: "/dashboard", label: "Dashboard", key: "dashboard" },
    { href: "/properties", label: "Properties", key: "properties" },
    { href: "/participants", label: "Participants", key: "participants" },
    { href: "/financials", label: "Financials", key: "financials" },
    { href: "/operations", label: "Operations", key: "operations" },
    { href: "/incidents", label: "Incidents", key: "incidents" },
    { href: "/documents", label: "Documents", key: "documents" },
    { href: "/onboarding", label: "Onboarding", key: "onboarding" },
    { href: "/reports", label: "Reports", key: "reports" },
    { href: "/admin/ai", label: "AI Assistant", key: "ai" },
    { href: "/settings", label: "Settings", key: "settings" },
  ];

  const isDatabaseActive = currentPage === "database" || currentPage === "contractors";

  return (
    <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50 overflow-visible">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 overflow-visible">
        {/* Top row - Logo and User info */}
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
              className="text-gray-400 hover:text-white transition-colors text-sm"
            >
              Logout
            </button>
          </div>
        </div>
        {/* Navigation - scrollable on mobile */}
        <nav className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 scrollbar-hide items-center min-w-0">
          {navItems.slice(0, 5).map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={`whitespace-nowrap text-sm flex-shrink-0 ${
                currentPage === item.key
                  ? "text-white font-medium"
                  : "text-gray-400 hover:text-white transition-colors"
              }`}
            >
              {item.label}
            </Link>
          ))}

          {/* Database Dropdown */}
          <div ref={databaseRef} className="relative flex-shrink-0">
            <button
              type="button"
              onClick={() => setDatabaseOpen(!databaseOpen)}
              className={`whitespace-nowrap text-sm flex items-center gap-1 ${
                isDatabaseActive
                  ? "text-white font-medium"
                  : "text-gray-400 hover:text-white transition-colors"
              }`}
            >
              Database
              <svg
                className={`w-3 h-3 transition-transform ${databaseOpen ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {databaseOpen && (
              <div
                className="absolute left-0 bg-gray-800 border border-gray-700 rounded-lg shadow-lg py-1 min-w-[180px]"
                style={{ top: '100%', marginTop: '4px', zIndex: 9999 }}
              >
                {databaseItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setDatabaseOpen(false)}
                    className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {navItems.slice(5).map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={`whitespace-nowrap text-sm flex-shrink-0 ${
                currentPage === item.key
                  ? "text-white font-medium"
                  : "text-gray-400 hover:text-white transition-colors"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
