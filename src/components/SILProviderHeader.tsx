"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";

interface SILProviderHeaderProps {
  currentPage?: "dashboard" | "incidents" | "maintenance" | "properties";
  providerName?: string;
}

export default function SILProviderHeader({
  currentPage,
  providerName,
}: SILProviderHeaderProps) {
  const router = useRouter();
  const [user, setUser] = useState<{
    firstName: string;
    lastName: string;
    role: string;
  } | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const activeItemRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("sda_user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  // Scroll active nav item into view on mount/page change
  useEffect(() => {
    if (activeItemRef.current && navRef.current) {
      const nav = navRef.current;
      const activeItem = activeItemRef.current;

      const navRect = nav.getBoundingClientRect();
      const itemRect = activeItem.getBoundingClientRect();
      const scrollLeft =
        activeItem.offsetLeft - navRect.width / 2 + itemRect.width / 2;

      nav.scrollTo({ left: Math.max(0, scrollLeft), behavior: "instant" });
    }
  }, [currentPage]);

  const handleLogout = () => {
    localStorage.removeItem("sda_user");
    router.push("/login");
  };

  const navItems = [
    { href: "/portal/dashboard", label: "Dashboard", key: "dashboard" },
    { href: "/portal/incidents", label: "Incidents", key: "incidents" },
    { href: "/portal/maintenance", label: "Maintenance", key: "maintenance" },
    { href: "/portal/properties", label: "Properties", key: "properties" },
  ];

  return (
    <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top row - Portal name and User info */}
        <div className="flex justify-between items-center h-14 lg:h-16">
          <Link href="/portal/dashboard" className="flex items-center gap-3">
            <div className="bg-purple-600 text-white px-3 py-1.5 rounded-lg font-semibold text-sm">
              SIL Provider Portal
            </div>
            {providerName && (
              <span className="hidden sm:inline text-white font-medium">
                {providerName}
              </span>
            )}
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            {user && (
              <>
                <span className="hidden sm:inline text-gray-300 text-sm">
                  {user.firstName} {user.lastName}
                </span>
                <span className="text-xs bg-purple-600 text-white px-2 py-1 rounded">
                  SIL Provider
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
        {/* Navigation - restricted options */}
        <nav
          ref={navRef}
          className="flex gap-4 sm:gap-6 overflow-x-auto pb-2 scrollbar-hide"
        >
          {navItems.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              ref={currentPage === item.key ? activeItemRef : null}
              className={`whitespace-nowrap text-sm flex-shrink-0 pb-1 border-b-2 ${
                currentPage === item.key
                  ? "text-white font-medium border-purple-500"
                  : "text-gray-400 hover:text-white transition-colors border-transparent"
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
