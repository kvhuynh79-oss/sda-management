"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import Link from "next/link";
import Image from "next/image";

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
  const alertStats = useQuery(api.alerts.getStats);
  const scheduleStats = useQuery(api.preventativeSchedule.getStats);
  const upcomingSchedules = useQuery(api.preventativeSchedule.getUpcoming, { limit: 5 });
  const overdueSchedules = useQuery(api.preventativeSchedule.getOverdue);
  const activeAlerts = useQuery(api.alerts.getActive);

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
          {/* Top row - Logo and User info */}
          <div className="flex justify-between items-center h-14 lg:h-16">
            <Link href="/dashboard" className="flex-shrink-0">
              <Image
                src="/Logo.jpg"
                alt="Better Living Solutions"
                width={120}
                height={34}
                className="rounded lg:w-[140px] lg:h-[40px]"
                priority
              />
            </Link>
            <div className="flex items-center gap-2 sm:gap-4">
              <span className="hidden sm:inline text-gray-300 text-sm">
                {user.firstName} {user.lastName}
              </span>
              <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded">
                {user.role.replace("_", " ")}
              </span>
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
            <Link href="/dashboard" className="text-white font-medium whitespace-nowrap text-sm">
              Dashboard
            </Link>
            <Link href="/properties" className="text-gray-400 hover:text-white transition-colors whitespace-nowrap text-sm">
              Properties
            </Link>
            <Link href="/participants" className="text-gray-400 hover:text-white transition-colors whitespace-nowrap text-sm">
              Participants
            </Link>
            <Link href="/payments" className="text-gray-400 hover:text-white transition-colors whitespace-nowrap text-sm">
              Payments
            </Link>
            <Link href="/maintenance" className="text-gray-400 hover:text-white transition-colors whitespace-nowrap text-sm">
              Maintenance
            </Link>
            <Link href="/incidents" className="text-gray-400 hover:text-white transition-colors whitespace-nowrap text-sm">
              Incidents
            </Link>
            <Link href="/documents" className="text-gray-400 hover:text-white transition-colors whitespace-nowrap text-sm">
              Documents
            </Link>
            <Link href="/alerts" className="text-gray-400 hover:text-white transition-colors whitespace-nowrap text-sm">
              Alerts
            </Link>
            <Link href="/preventative-schedule" className="text-gray-400 hover:text-white transition-colors whitespace-nowrap text-sm">
              Schedule
            </Link>
            <Link href="/settings" className="text-gray-400 hover:text-white transition-colors whitespace-nowrap text-sm">
              Settings
            </Link>
          </nav>
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
          <Link href="/alerts">
            <DashboardCard
              title="Alerts"
              value={(alertStats?.active || 0).toString()}
              subtitle={`${alertStats?.critical || 0} critical`}
              color="red"
            />
          </Link>
        </div>

        {/* Preventative Maintenance Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Link href="/preventative-schedule?status=overdue">
            <DashboardCard
              title="Overdue Maintenance"
              value={(scheduleStats?.overdue || 0).toString()}
              subtitle="Requires immediate attention"
              color="red"
            />
          </Link>
          <Link href="/preventative-schedule?status=due_soon">
            <DashboardCard
              title="Due Within 7 Days"
              value={(upcomingSchedules?.filter(s => s.daysUntilDue >= 0 && s.daysUntilDue <= 7).length || 0).toString()}
              subtitle="Upcoming scheduled tasks"
              color="yellow"
            />
          </Link>
          <Link href="/preventative-schedule">
            <DashboardCard
              title="Due Within 30 Days"
              value={(scheduleStats?.dueWithin30Days || 0).toString()}
              subtitle={`Est. $${
                upcomingSchedules
                  ?.filter(s => s.daysUntilDue >= 0 && s.daysUntilDue <= 30)
                  .reduce((sum, s) => sum + (s.estimatedCost || 0), 0) || 0
              }`}
              color="blue"
            />
          </Link>
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
            <Link href="/documents/new">
              <QuickActionButton label="Upload Document" />
            </Link>
            <Link href="/preventative-schedule/new">
              <QuickActionButton label="Schedule Maintenance" />
            </Link>
          </div>
        </div>

        {/* Upcoming Preventative Maintenance */}
        {upcomingSchedules && upcomingSchedules.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-6 mb-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">Upcoming Preventative Maintenance</h3>
              <Link href="/preventative-schedule" className="text-blue-400 hover:text-blue-300 text-sm">
                View all →
              </Link>
            </div>
            <div className="space-y-3">
              {upcomingSchedules.map((schedule) => {
                const isOverdue = schedule.daysUntilDue < 0;
                const isDueSoon = schedule.daysUntilDue >= 0 && schedule.daysUntilDue <= 7;
                const statusColor = isOverdue
                  ? "bg-red-600"
                  : isDueSoon
                  ? "bg-yellow-600"
                  : "bg-green-600";
                const statusText = isOverdue
                  ? `OVERDUE (${Math.abs(schedule.daysUntilDue)} days)`
                  : `Due in ${schedule.daysUntilDue} days`;

                return (
                  <Link key={schedule._id} href="/preventative-schedule">
                    <div className="flex justify-between items-center p-4 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-white font-medium">{schedule.taskName}</p>
                          <span className={`px-2 py-1 text-white text-xs rounded-full ${statusColor}`}>
                            {statusText}
                          </span>
                        </div>
                        <p className="text-gray-400 text-sm">
                          {schedule.dwelling
                            ? `${schedule.dwelling.dwellingName} at ${schedule.property?.addressLine1}`
                            : schedule.property?.addressLine1}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-white">{schedule.nextDueDate}</p>
                        {schedule.estimatedCost && (
                          <p className="text-gray-400 text-sm">${schedule.estimatedCost}</p>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

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
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-white">Recent Alerts</h3>
            <Link href="/alerts" className="text-blue-400 hover:text-blue-300 text-sm">
              View all →
            </Link>
          </div>
          {activeAlerts && activeAlerts.length > 0 ? (
            <div className="space-y-3">
              {activeAlerts.slice(0, 5).map((alert) => {
                const severityColors: Record<string, string> = {
                  critical: "bg-red-600",
                  warning: "bg-yellow-600",
                  info: "bg-blue-600",
                };
                return (
                  <Link key={alert._id} href="/alerts">
                    <div className="p-4 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors">
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={`px-2 py-1 text-white text-xs rounded-full ${
                            severityColors[alert.severity]
                          }`}
                        >
                          {alert.severity.toUpperCase()}
                        </span>
                        <span className="text-white font-medium">{alert.title}</span>
                      </div>
                      <p className="text-gray-400 text-sm">{alert.message}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="text-gray-400 text-center py-8">No alerts at this time</div>
          )}
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
