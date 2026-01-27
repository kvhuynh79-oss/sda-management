"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import Link from "next/link";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  const properties = useQuery(api.properties.getAll);

  useEffect(() => {
    const storedUser = localStorage.getItem("sda_user");
    if (!storedUser) {
      router.push("/login");
      return;
    }
    setUser(JSON.parse(storedUser));
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("sda_user");
    router.push("/login");
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  // Calculate stats from properties
  const totalProperties = properties?.length || 0;
  const totalParticipants = properties?.reduce((sum, p) => sum + p.currentOccupancy, 0) || 0;
  const totalVacancies = properties?.reduce((sum, p) => sum + p.vacancies, 0) || 0;
  const totalDwellings = properties?.reduce((sum, p) => sum + p.dwellingCount, 0) || 0;

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-8">
              <h1 className="text-xl font-bold text-white">SDA Management</h1>
              <nav className="flex gap-4">
                <Link href="/dashboard" className="text-white font-medium">
                  Dashboard
                </Link>
                <Link href="/properties" className="text-gray-400 hover:text-white transition-colors">
                  Properties
                </Link>
                <Link href="/participants" className="text-gray-400 hover:text-white transition-colors">
                  Participants
                </Link>
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-gray-300">
                {user.firstName} {user.lastName}
              </span>
              <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded">
                {user.role.replace("_", " ")}
              </span>
              <button
                onClick={handleLogout}
                className="text-gray-400 hover:text-white transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-2xl font-bold text-white mb-8">Dashboard</h2>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Link href="/properties">
            <DashboardCard
              title="Properties"
              value={totalProperties.toString()}
              subtitle={`${totalDwellings} dwellings total`}
              color="blue"
            />
          </Link>
          <Link href="/participants">
            <DashboardCard
              title="Participants"
              value={totalParticipants.toString()}
              subtitle="Active residents"
              color="green"
            />
          </Link>
          <Link href="/properties">
            <DashboardCard
              title="Vacancies"
              value={totalVacancies.toString()}
              subtitle="Available spaces"
              color="yellow"
            />
          </Link>
          <DashboardCard
            title="Alerts"
            value="0"
            subtitle="Require attention"
            color="red"
          />
        </div>

        {/* Quick Actions */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/participants/new">
              <QuickActionButton label="Add Participant" />
            </Link>
            <Link href="/properties/new">
              <QuickActionButton label="Add Property" />
            </Link>
            <Link href="/maintenance/new">
              <QuickActionButton label="Log Maintenance" />
            </Link>
            <Link href="/payments/new">
              <QuickActionButton label="Record Payment" />
            </Link>
          </div>
        </div>

        {/* Recent Properties */}
        {properties && properties.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-6 mb-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">Recent Properties</h3>
              <Link href="/properties" className="text-blue-400 hover:text-blue-300 text-sm">
                View all →
              </Link>
            </div>
            <div className="space-y-3">
              {properties.slice(0, 5).map((property) => (
                <Link key={property._id} href={`/properties/${property._id}`}>
                  <div className="flex justify-between items-center p-4 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors">
                    <div>
                      <p className="text-white font-medium">
                        {property.propertyName || property.addressLine1}
                      </p>
                      <p className="text-gray-400 text-sm">
                        {property.suburb}, {property.state}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-white">
                        {property.currentOccupancy}/{property.totalCapacity}
                      </p>
                      <p className="text-gray-400 text-sm">occupied</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Alerts Section */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Recent Alerts</h3>
          <div className="text-gray-400 text-center py-8">
            No alerts at this time
          </div>
        </div>
      </main>
    </div>
  );
}

function DashboardCard({
  title,
  value,
  subtitle,
  color,
}: {
  title: string;
  value: string;
  subtitle: string;
  color: "blue" | "green" | "yellow" | "red";
}) {
  const colorClasses = {
    blue: "bg-blue-600",
    green: "bg-green-600",
    yellow: "bg-yellow-600",
    red: "bg-red-600",
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors cursor-pointer">
      <div className="flex items-center justify-between mb-4">
        <span className="text-gray-400 text-sm">{title}</span>
        <div className={`w-3 h-3 rounded-full ${colorClasses[color]}`} />
      </div>
      <div className="text-3xl font-bold text-white mb-1">{value}</div>
      <div className="text-gray-500 text-sm">{subtitle}</div>
    </div>
  );
}

function QuickActionButton({ label }: { label: string }) {
  return (
    <div className="px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm text-center cursor-pointer">
      + {label}
    </div>
  );
}
