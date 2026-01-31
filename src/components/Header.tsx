"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

interface HeaderProps {
  currentPage?:
    | "dashboard"
    | "properties"
    | "participants"
    | "payments"
    | "maintenance"
    | "inspections"
    | "incidents"
    | "documents"
    | "alerts"
    | "schedule"
    | "onboarding"
    | "settings"
    | "reports";
}

export default function Header({ currentPage }: HeaderProps) {
  const router = useRouter();
  const [user, setUser] = useState<{
    firstName: string;
    lastName: string;
    role: string;
  } | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("sda_user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("sda_user");
    router.push("/login");
  };

  const navItems = [
    { href: "/dashboard", label: "Dashboard", key: "dashboard" },
    { href: "/properties", label: "Properties", key: "properties" },
    { href: "/participants", label: "Participants", key: "participants" },
    { href: "/payments", label: "Payments", key: "payments" },
    { href: "/maintenance", label: "Maintenance", key: "maintenance" },
    { href: "/inspections", label: "Inspections", key: "inspections" },
    { href: "/incidents", label: "Incidents", key: "incidents" },
    { href: "/documents", label: "Documents", key: "documents" },
    { href: "/onboarding", label: "Onboarding", key: "onboarding" },
    { href: "/alerts", label: "Alerts", key: "alerts" },
    { href: "/preventative-schedule", label: "Schedule", key: "schedule" },
    { href: "/settings", label: "Settings", key: "settings" },
  ];

  return (
    <header className="bg-gray-800 border-b border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
        <nav className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
          {navItems.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={`whitespace-nowrap text-sm ${
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
