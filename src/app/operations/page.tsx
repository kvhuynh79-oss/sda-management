"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { Id } from "../../../convex/_generated/dataModel";

type TabType = "maintenance" | "inspections" | "schedule";

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-white">Loading...</div>
    </div>
  );
}

export default function OperationsPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <OperationsContent />
    </Suspense>
  );
}

function OperationsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as TabType) || "maintenance";

  const [user, setUser] = useState<{ id: string; role: string } | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);

  useEffect(() => {
    const storedUser = localStorage.getItem("sda_user");
    if (!storedUser) {
      router.push("/login");
      return;
    }
    const parsed = JSON.parse(storedUser);
    setUser({
      id: parsed.id || parsed._id,
      role: parsed.role,
    });
  }, [router]);

  // Update URL when tab changes
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    router.push(`/operations?tab=${tab}`, { scroll: false });
  };

  if (!user) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Header currentPage="operations" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white">Operations</h2>
            <p className="text-gray-400 mt-1 text-sm sm:text-base">Manage maintenance, inspections, and schedules</p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {activeTab === "maintenance" && (
              <Link
                href="/maintenance/new"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                + Log Request
              </Link>
            )}
            {activeTab === "inspections" && (
              <Link
                href="/inspections/new"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                + New Inspection
              </Link>
            )}
            {activeTab === "schedule" && (
              <Link
                href="/preventative-schedule/new"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                + Add Schedule
              </Link>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-700 mb-6 -mx-4 px-4 sm:mx-0 sm:px-0">
          <nav className="flex gap-2 sm:gap-4 overflow-x-auto scrollbar-hide">
            <TabButton
              label="Maintenance"
              isActive={activeTab === "maintenance"}
              onClick={() => handleTabChange("maintenance")}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              }
            />
            <TabButton
              label="Inspections"
              isActive={activeTab === "inspections"}
              onClick={() => handleTabChange("inspections")}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              }
            />
            <TabButton
              label="Preventative Schedule"
              isActive={activeTab === "schedule"}
              onClick={() => handleTabChange("schedule")}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              }
            />
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === "maintenance" && <MaintenanceTab />}
        {activeTab === "inspections" && <InspectionsTab userId={user.id} />}
        {activeTab === "schedule" && <ScheduleTab />}
      </main>
    </div>
  );
}

function TabButton({
  label,
  isActive,
  onClick,
  icon,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 sm:px-4 py-3 border-b-2 transition-colors whitespace-nowrap flex-shrink-0 text-sm sm:text-base ${
        isActive
          ? "border-blue-500 text-blue-400"
          : "border-transparent text-gray-400 hover:text-white hover:border-gray-600"
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
      <span className="sm:hidden">{label.split(' ')[0]}</span>
    </button>
  );
}

// ============================================
// MAINTENANCE TAB
// ============================================
function MaintenanceTab() {
  const [filterStatus, setFilterStatus] = useState<string>("open");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const allRequests = useQuery(api.maintenanceRequests.getAll);
  const stats = useQuery(api.maintenanceRequests.getStats);

  const filteredRequests = allRequests?.filter((request) => {
    let matchesStatus = true;
    if (filterStatus === "open") {
      matchesStatus = request.status !== "completed" && request.status !== "cancelled";
    } else if (filterStatus !== "all") {
      matchesStatus = request.status === filterStatus;
    }
    const matchesPriority = filterPriority === "all" || request.priority === filterPriority;
    const matchesCategory = filterCategory === "all" || request.category === filterCategory;
    const matchesSearch =
      !searchTerm ||
      request.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.property?.addressLine1.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.dwelling?.dwellingName.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesStatus && matchesPriority && matchesCategory && matchesSearch;
  });

  return (
    <div>
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard label="Total Requests" value={stats.total.toString()} color="blue" />
          <StatCard label="Open" value={stats.open.toString()} color="yellow" />
          <StatCard label="Urgent" value={stats.urgent.toString()} color="red" />
          <StatCard label="Completed" value={stats.completed.toString()} color="green" />
        </div>
      )}

      {/* Filters */}
      <div className="bg-gray-800 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search..."
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="reported">Reported</option>
            <option value="awaiting_quotes">Awaiting Quotes</option>
            <option value="quoted">Quoted</option>
            <option value="approved">Approved</option>
            <option value="scheduled">Scheduled</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
          >
            <option value="all">All Priority</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
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
      </div>

      {/* Request List */}
      {!filteredRequests ? (
        <div className="text-gray-400 text-center py-8">Loading...</div>
      ) : filteredRequests.length === 0 ? (
        <div className="text-center py-12 bg-gray-800 rounded-lg">
          <p className="text-gray-400">No maintenance requests found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((request) => (
            <MaintenanceCard key={request._id} request={request} />
          ))}
        </div>
      )}
    </div>
  );
}

function MaintenanceCard({ request }: { request: any }) {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "bg-red-600";
      case "high": return "bg-orange-600";
      case "medium": return "bg-yellow-600";
      case "low": return "bg-green-600";
      default: return "bg-gray-600";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "reported": return "bg-gray-600";
      case "awaiting_quotes": return "bg-purple-600";
      case "quoted": return "bg-blue-600";
      case "approved": return "bg-cyan-600";
      case "scheduled": return "bg-indigo-600";
      case "in_progress": return "bg-yellow-600";
      case "completed": return "bg-green-600";
      case "cancelled": return "bg-red-600";
      default: return "bg-gray-600";
    }
  };

  return (
    <Link
      href={`/maintenance/${request._id}`}
      className="block bg-gray-800 rounded-lg p-4 hover:bg-gray-750 transition-colors"
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-1 text-xs text-white rounded ${getPriorityColor(request.priority)}`}>
              {request.priority}
            </span>
            <span className={`px-2 py-1 text-xs text-white rounded ${getStatusColor(request.status)}`}>
              {request.status.replace(/_/g, " ")}
            </span>
            <span className="px-2 py-1 text-xs text-gray-300 bg-gray-700 rounded capitalize">
              {request.category}
            </span>
          </div>
          <h3 className="text-white font-medium">{request.title}</h3>
          <p className="text-gray-400 text-sm mt-1">
            {request.property?.addressLine1} - {request.dwelling?.dwellingName}
          </p>
        </div>
        <div className="text-right text-sm text-gray-400">
          <p>{request.reportedDate}</p>
          {request.scheduledDate && <p className="text-blue-400">Scheduled: {request.scheduledDate}</p>}
        </div>
      </div>
    </Link>
  );
}

// ============================================
// INSPECTIONS TAB
// ============================================
function InspectionsTab({ userId }: { userId: string }) {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: Id<"inspections">; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const inspections = useQuery(api.inspections.getInspections, {});
  const templates = useQuery(api.inspections.getTemplates, {});
  const seedBLSTemplate = useMutation(api.inspections.seedBLSTemplate);
  const deleteInspection = useMutation(api.inspections.deleteInspection);

  const handleSeedTemplate = async () => {
    try {
      await seedBLSTemplate({ createdBy: userId as Id<"users"> });
      alert("BLS Template created successfully!");
    } catch (error) {
      console.error("Error seeding template:", error);
      alert("Error creating template. It may already exist.");
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    setIsDeleting(true);
    try {
      await deleteInspection({ inspectionId: deleteConfirm.id });
      setDeleteConfirm(null);
    } catch (error) {
      console.error("Error deleting inspection:", error);
      alert("Error deleting inspection.");
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredInspections = inspections?.filter((inspection) => {
    if (statusFilter === "all") return true;
    return inspection.status === statusFilter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled": return "bg-blue-600";
      case "in_progress": return "bg-yellow-600";
      case "completed": return "bg-green-600";
      case "cancelled": return "bg-gray-600";
      default: return "bg-gray-600";
    }
  };

  return (
    <div>
      {/* Template Setup Notice */}
      {templates && templates.length === 0 && (
        <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4 mb-6">
          <p className="text-yellow-300 mb-2">No inspection templates found. Create the BLS template to get started.</p>
          <button
            onClick={handleSeedTemplate}
            className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors"
          >
            Create BLS Template
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-gray-800 rounded-lg p-4 mb-6">
        <div className="flex gap-4 items-center">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
          >
            <option value="all">All Status</option>
            <option value="scheduled">Scheduled</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <Link
            href="/inspections/templates"
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Manage Templates
          </Link>
        </div>
      </div>

      {/* Inspections List */}
      {!filteredInspections ? (
        <div className="text-gray-400 text-center py-8">Loading...</div>
      ) : filteredInspections.length === 0 ? (
        <div className="text-center py-12 bg-gray-800 rounded-lg">
          <p className="text-gray-400">No inspections found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredInspections.map((inspection) => (
            <div key={inspection._id} className="bg-gray-800 rounded-lg p-4">
              <div className="flex justify-between items-start">
                <Link href={`/inspections/${inspection._id}`} className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-1 text-xs text-white rounded ${getStatusColor(inspection.status)}`}>
                      {inspection.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <h3 className="text-white font-medium">
                    {inspection.property?.propertyName || inspection.property?.addressLine1}
                  </h3>
                  <p className="text-gray-400 text-sm">
                    {inspection.dwelling?.dwellingName || "All Dwellings"} | {inspection.scheduledDate}
                  </p>
                  <p className="text-gray-500 text-xs mt-1">
                    {inspection.completedItems}/{inspection.totalItems} items |
                    {inspection.passedItems} passed, {inspection.failedItems} failed
                  </p>
                </Link>
                <button
                  onClick={() => setDeleteConfirm({ id: inspection._id, name: inspection.property?.addressLine1 || "Unknown" })}
                  className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-white mb-2">Delete Inspection?</h3>
            <p className="text-gray-400 text-sm mb-4">
              Are you sure you want to delete the inspection for {deleteConfirm.name}?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded-lg"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// SCHEDULE TAB
// ============================================
function ScheduleTab() {
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const allSchedules = useQuery(api.preventativeSchedule.getAll);
  const stats = useQuery(api.preventativeSchedule.getStats);
  const completeSchedule = useMutation(api.preventativeSchedule.complete);
  const removeSchedule = useMutation(api.preventativeSchedule.remove);

  const handleComplete = async (scheduleId: Id<"preventativeSchedule">) => {
    const today = new Date().toISOString().split("T")[0];
    const notes = prompt("Add completion notes (optional):");
    const actualCost = prompt("Enter actual cost (optional):");

    try {
      await completeSchedule({
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
      await removeSchedule({ scheduleId });
    } catch (err) {
      console.error("Failed to delete schedule:", err);
      alert("Failed to delete schedule");
    }
  };

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

  const filteredSchedules = schedulesWithStatus?.filter((schedule) => {
    const matchesCategory = filterCategory === "all" || schedule.category === filterCategory;
    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "overdue" && schedule.status === "overdue") ||
      (filterStatus === "due_soon" && schedule.status === "due_soon") ||
      (filterStatus === "on_track" && schedule.status === "on_track");
    const matchesSearch =
      !searchTerm ||
      schedule.taskName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      schedule.property?.addressLine1.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesCategory && matchesStatus && matchesSearch;
  });

  return (
    <div>
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard label="Total Tasks" value={stats.total.toString()} color="blue" />
          <StatCard label="Overdue" value={stats.overdue.toString()} color="red" />
          <StatCard label="Due Within 30 Days" value={stats.dueWithin30Days.toString()} color="yellow" />
          <StatCard label="Active" value={stats.active.toString()} color="green" />
        </div>
      )}

      {/* Filters */}
      <div className="bg-gray-800 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search tasks..."
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
          >
            <option value="all">All Status</option>
            <option value="overdue">Overdue</option>
            <option value="due_soon">Due Soon</option>
            <option value="on_track">On Track</option>
          </select>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
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
      </div>

      {/* Schedule List */}
      {!filteredSchedules ? (
        <div className="text-gray-400 text-center py-8">Loading...</div>
      ) : filteredSchedules.length === 0 ? (
        <div className="text-center py-12 bg-gray-800 rounded-lg">
          <p className="text-gray-400">No scheduled tasks found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSchedules.map((schedule) => (
            <ScheduleCard
              key={schedule._id}
              schedule={schedule}
              onComplete={() => handleComplete(schedule._id)}
              onDelete={() => handleDelete(schedule._id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ScheduleCard({
  schedule,
  onComplete,
  onDelete,
}: {
  schedule: any;
  onComplete: () => void;
  onDelete: () => void;
}) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "overdue": return "bg-red-600";
      case "due_soon": return "bg-yellow-600";
      case "on_track": return "bg-green-600";
      default: return "bg-gray-600";
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-1 text-xs text-white rounded ${getStatusColor(schedule.status)}`}>
              {schedule.status === "due_soon" ? "Due Soon" : schedule.status === "on_track" ? "On Track" : "Overdue"}
            </span>
            <span className="px-2 py-1 text-xs text-gray-300 bg-gray-700 rounded capitalize">
              {schedule.category}
            </span>
            <span className="px-2 py-1 text-xs text-gray-300 bg-gray-700 rounded capitalize">
              {schedule.frequencyType}
            </span>
          </div>
          <h3 className="text-white font-medium">{schedule.taskName}</h3>
          <p className="text-gray-400 text-sm">{schedule.property?.addressLine1}</p>
          <p className="text-gray-500 text-xs mt-1">
            Due: {schedule.nextDueDate} ({schedule.daysUntilDue > 0 ? `in ${schedule.daysUntilDue} days` : `${Math.abs(schedule.daysUntilDue)} days overdue`})
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onComplete}
            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition-colors"
          >
            Complete
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-gray-400 hover:text-red-400 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// SHARED COMPONENTS
// ============================================
function StatCard({
  label,
  value,
  color = "blue",
}: {
  label: string;
  value: string;
  color?: "blue" | "green" | "yellow" | "red";
}) {
  const colorClasses = {
    blue: "text-blue-400",
    green: "text-green-400",
    yellow: "text-yellow-400",
    red: "text-red-400",
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <p className="text-gray-400 text-sm">{label}</p>
      <p className={`text-2xl font-bold ${colorClasses[color]}`}>{value}</p>
    </div>
  );
}
