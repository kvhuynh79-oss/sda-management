"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { Id } from "../../../convex/_generated/dataModel";

export default function PreventativeSchedulePage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; role: string } | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterFrequency, setFilterFrequency] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const allSchedules = useQuery(api.preventativeSchedule.getAll, user ? { userId: user.id as Id<"users"> } : "skip");
  const stats = useQuery(api.preventativeSchedule.getStats, user ? { userId: user.id as Id<"users"> } : "skip");
  const completeSchedule = useMutation(api.preventativeSchedule.complete);
  const removeSchedule = useMutation(api.preventativeSchedule.remove);

  useEffect(() => {
    const storedUser = localStorage.getItem("sda_user");
    if (!storedUser) {
      router.push("/login");
      return;
    }
    const parsed = JSON.parse(storedUser);
    const userId = parsed._id || parsed.id;
    if (userId) {
      setUser({ id: userId, role: parsed.role });
    }
  }, [router]);

  const handleComplete = async (scheduleId: Id<"preventativeSchedule">) => {
    const today = new Date().toISOString().split("T")[0];
    const notes = prompt("Add completion notes (optional):");
    const actualCost = prompt("Enter actual cost (optional):");

    try {
      await completeSchedule({
        userId: user!.id as Id<"users">,
        scheduleId,
        completedDate: today,
        actualCost: actualCost ? parseFloat(actualCost) : undefined,
        notes: notes || undefined,
        createMaintenanceRecord: true,
      });
    } catch (err) {
      console.error("Failed to complete schedule:", err);
      alert("Failed to mark schedule as completed");
    }
  };

  const handleDelete = async (scheduleId: Id<"preventativeSchedule">) => {
    if (!confirm("Are you sure you want to delete this schedule?")) return;

    try {
      await removeSchedule({ userId: user!.id as Id<"users">, scheduleId });
    } catch (err) {
      console.error("Failed to delete schedule:", err);
      alert("Failed to delete schedule");
    }
  };

  if (!user) {
    return <LoadingScreen />;
  }

  // Calculate status for each schedule
  const schedulesWithStatus = allSchedules?.map((schedule) => {
    const today = new Date();
    const dueDate = new Date(schedule.nextDueDate);
    const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    let status: "overdue" | "due_soon" | "on_track";
    if (daysUntilDue < 0) {
      status = "overdue";
    } else if (daysUntilDue <= 7) {
      status = "due_soon";
    } else {
      status = "on_track";
    }

    return { ...schedule, status, daysUntilDue };
  });

  // Filter schedules
  const filteredSchedules = schedulesWithStatus?.filter((schedule) => {
    const matchesCategory = filterCategory === "all" || schedule.category === filterCategory;
    const matchesFrequency =
      filterFrequency === "all" || schedule.frequencyType === filterFrequency;
    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "active" && schedule.isActive) ||
      (filterStatus === "inactive" && !schedule.isActive) ||
      (filterStatus === "overdue" && schedule.status === "overdue") ||
      (filterStatus === "due_soon" && schedule.status === "due_soon");
    const matchesSearch =
      !searchTerm ||
      schedule.taskName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      schedule.property?.addressLine1.toLowerCase().includes(searchTerm.toLowerCase()) ||
      schedule.contractorName?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesCategory && matchesFrequency && matchesStatus && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gray-900">
      <Header currentPage="schedule" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white">Preventative Maintenance Schedule</h2>
            <p className="text-gray-400 mt-1">Manage recurring maintenance tasks</p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/preventative-schedule/templates"
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              Apply SDA Templates
            </Link>
            <Link
              href="/preventative-schedule/new"
              className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg transition-colors"
            >
              + Create Schedule
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <StatCard label="Active Schedules" value={stats.active.toString()} color="blue" />
            <StatCard label="Overdue" value={stats.overdue.toString()} color="red" />
            <StatCard
              label="Due Within 30 Days"
              value={stats.dueWithin30Days.toString()}
              color="yellow"
            />
            <StatCard label="Total Schedules" value={stats.total.toString()} color="green" />
          </div>
        )}

        {/* Filters */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Search</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Task name, property, contractor..."
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-teal-600 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-teal-600 focus:border-transparent"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="overdue">Overdue</option>
                <option value="due_soon">Due Soon</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Category</label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-teal-600 focus:border-transparent"
              >
                <option value="all">All Categories</option>
                <option value="plumbing">Plumbing</option>
                <option value="electrical">Electrical</option>
                <option value="appliances">Appliances</option>
                <option value="building">Building</option>
                <option value="grounds">Grounds</option>
                <option value="safety">Safety</option>
                <option value="general">General</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Frequency</label>
              <select
                value={filterFrequency}
                onChange={(e) => setFilterFrequency(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-teal-600 focus:border-transparent"
              >
                <option value="all">All Frequencies</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="biannually">Biannually</option>
                <option value="annually">Annually</option>
              </select>
            </div>
          </div>
        </div>

        {/* Schedules List */}
        {allSchedules === undefined ? (
          <div className="text-gray-400 text-center py-12">Loading schedules...</div>
        ) : filteredSchedules && filteredSchedules.length === 0 ? (
          <EmptyState
            hasFilters={
              searchTerm !== "" ||
              filterCategory !== "all" ||
              filterFrequency !== "all" ||
              filterStatus !== "all"
            }
          />
        ) : (
          <div className="space-y-4">
            {filteredSchedules?.map((schedule) => (
              <ScheduleCard
                key={schedule._id}
                schedule={schedule}
                onComplete={handleComplete}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

        {/* Results count */}
        {filteredSchedules && filteredSchedules.length > 0 && (
          <p className="text-gray-400 text-sm text-center mt-6">
            Showing {filteredSchedules.length} schedule{filteredSchedules.length !== 1 ? "s" : ""}
          </p>
        )}
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: "blue" | "green" | "yellow" | "red";
}) {
  const colorClasses = {
    blue: "text-teal-500",
    green: "text-green-400",
    yellow: "text-yellow-400",
    red: "text-red-400",
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <p className="text-gray-400 text-sm mb-2">{label}</p>
      <p className={`text-2xl font-bold ${colorClasses[color]}`}>{value}</p>
    </div>
  );
}

function ScheduleCard({
  schedule,
  onComplete,
  onDelete,
}: {
  schedule: any;
  onComplete: (id: Id<"preventativeSchedule">) => void;
  onDelete: (id: Id<"preventativeSchedule">) => void;
}) {
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      overdue: "bg-red-600",
      due_soon: "bg-yellow-600",
      on_track: "bg-green-600",
    };
    return colors[status] || colors.on_track;
  };

  const formatCategory = (category: string) => {
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

  const formatFrequency = (type: string, interval: number) => {
    const prefix = interval > 1 ? `Every ${interval} ` : "";
    return `${prefix}${type.charAt(0).toUpperCase() + type.slice(1)}`;
  };

  const getStatusText = (status: string, daysUntilDue: number) => {
    if (status === "overdue") {
      return `OVERDUE (${Math.abs(daysUntilDue)} days)`;
    } else if (status === "due_soon") {
      return `DUE SOON (${daysUntilDue} days)`;
    } else {
      return `DUE IN ${daysUntilDue} DAYS`;
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:bg-gray-700/80 transition-colors">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span
              className={`px-3 py-1 text-white text-xs rounded-full ${getStatusColor(
                schedule.status
              )}`}
            >
              {getStatusText(schedule.status, schedule.daysUntilDue)}
            </span>
            <span className="px-3 py-1 bg-teal-700 text-white text-xs rounded-full">
              {formatCategory(schedule.category)}
            </span>
            <span className="text-gray-400 text-xs">
              {formatFrequency(schedule.frequencyType, schedule.frequencyInterval)}
            </span>
            {!schedule.isActive && (
              <span className="px-3 py-1 bg-gray-600 text-white text-xs rounded-full">
                INACTIVE
              </span>
            )}
          </div>
          <h3 className="text-lg font-semibold text-white mb-1">{schedule.taskName}</h3>
          {schedule.description && (
            <p className="text-gray-300 text-sm mb-3">{schedule.description}</p>
          )}

          <div className="text-sm text-gray-400">
            <p>
              <span className="text-gray-400">Property: </span>
              <Link
                href={`/properties/${schedule.property._id}`}
                className="text-teal-500 hover:text-teal-400"
              >
                {schedule.property.propertyName || schedule.property.addressLine1}
              </Link>
            </p>
            {schedule.dwelling && (
              <p>
                <span className="text-gray-400">Dwelling: </span>
                <span className="text-white">{schedule.dwelling.dwellingName}</span>
              </p>
            )}
            {schedule.contractorName && (
              <p>
                <span className="text-gray-400">Contractor: </span>
                <span className="text-white">{schedule.contractorName}</span>
              </p>
            )}
          </div>
        </div>

        {schedule.isActive && (
          <div className="flex gap-2">
            <button
              onClick={() => onComplete(schedule._id)}
              className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition-colors"
            >
              Mark Complete
            </button>
            <button
              onClick={() => onDelete(schedule._id)}
              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-700 text-sm">
        <div>
          <p className="text-gray-400 text-xs">Next Due</p>
          <p className="text-white">{schedule.nextDueDate}</p>
        </div>
        {schedule.lastCompletedDate && (
          <div>
            <p className="text-gray-400 text-xs">Last Completed</p>
            <p className="text-white">{schedule.lastCompletedDate}</p>
          </div>
        )}
        {schedule.estimatedCost && (
          <div>
            <p className="text-gray-400 text-xs">Estimated Cost</p>
            <p className="text-white">${schedule.estimatedCost.toFixed(2)}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="bg-gray-800 rounded-lg p-12 text-center">
      <div className="flex justify-center mb-4"><svg className="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg></div>
      <h3 className="text-xl font-semibold text-white mb-2">
        {hasFilters ? "No schedules found" : "No preventative schedules yet"}
      </h3>
      <p className="text-gray-400 mb-6">
        {hasFilters
          ? "Try adjusting your filters to see more results"
          : "Create your first recurring maintenance schedule"}
      </p>
      {!hasFilters && (
        <Link
          href="/preventative-schedule/new"
          className="inline-block px-6 py-3 bg-teal-700 hover:bg-teal-800 text-white rounded-lg transition-colors"
        >
          + Create First Schedule
        </Link>
      )}
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-white">Loading...</div>
    </div>
  );
}
