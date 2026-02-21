"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useMemo, Suspense, useRef, useCallback } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { RequireAuth } from "@/components/RequireAuth";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatCard } from "@/components/ui/StatCard";
import { FormInput } from "@/components/forms/FormInput";
import { FormSelect } from "@/components/forms/FormSelect";
import { Id } from "../../../convex/_generated/dataModel";
import { formatStatus } from "@/utils/format";

type TabType = "maintenance" | "inspections" | "schedule";

const TABS: { id: TabType; label: string; icon: React.ReactNode }[] = [
  {
    id: "maintenance",
    label: "Maintenance",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    id: "inspections",
    label: "Inspections",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  {
    id: "schedule",
    label: "Preventative Schedule",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
];

const MAINTENANCE_STATUS_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "open", label: "Open" },
  { value: "reported", label: "Reported" },
  { value: "awaiting_quotes", label: "Awaiting Quotes" },
  { value: "quoted", label: "Quoted" },
  { value: "approved", label: "Approved" },
  { value: "scheduled", label: "Scheduled" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
];

const PRIORITY_OPTIONS = [
  { value: "all", label: "All Priority" },
  { value: "urgent", label: "Urgent" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

const CATEGORY_OPTIONS = [
  { value: "all", label: "All Categories" },
  { value: "plumbing", label: "Plumbing" },
  { value: "electrical", label: "Electrical" },
  { value: "appliances", label: "Appliances" },
  { value: "building", label: "Building" },
  { value: "grounds", label: "Grounds" },
  { value: "safety", label: "Safety" },
  { value: "general", label: "General" },
];

const SCHEDULE_STATUS_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "overdue", label: "Overdue" },
  { value: "due_soon", label: "Due Soon" },
  { value: "on_track", label: "On Track" },
];

const INSPECTION_STATUS_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "scheduled", label: "Scheduled" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export default function OperationsPage() {
  return (
    <RequireAuth>
      <Suspense fallback={<LoadingScreen />}>
        <OperationsContent />
      </Suspense>
    </RequireAuth>
  );
}

function OperationsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as TabType) || "maintenance";

  const [user, setUser] = useState<{ id: string; role: string } | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem("sda_user");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const userId = parsed._id || parsed.id;
        if (userId) {
          setUser({ id: userId, role: parsed.role });
        }
      } catch {
        // Invalid data
      }
    }
  }, []);

  const handleTabChange = useCallback((tab: TabType) => {
    setActiveTab(tab);
    router.push(`/operations?tab=${tab}`, { scroll: false });
  }, [router]);

  const handleTabKeyDown = useCallback(
    (e: React.KeyboardEvent, index: number) => {
      let nextIndex = -1;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        nextIndex = (index + 1) % TABS.length;
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        nextIndex = (index - 1 + TABS.length) % TABS.length;
      } else if (e.key === "Home") {
        e.preventDefault();
        nextIndex = 0;
      } else if (e.key === "End") {
        e.preventDefault();
        nextIndex = TABS.length - 1;
      }
      if (nextIndex >= 0) {
        tabRefs.current[nextIndex]?.focus();
        handleTabChange(TABS[nextIndex].id);
      }
    },
    [handleTabChange]
  );

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
            <h1 className="text-xl sm:text-2xl font-bold text-white">Operations</h1>
            <p className="text-gray-300 mt-1 text-sm sm:text-base">Manage maintenance, inspections, and schedules</p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {activeTab === "maintenance" && (
              <Link
                href="/maintenance/new"
                className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg transition-colors text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
              >
                + Log Request
              </Link>
            )}
            {activeTab === "inspections" && (
              <Link
                href="/inspections/new"
                className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg transition-colors text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
              >
                + New Inspection
              </Link>
            )}
            {activeTab === "schedule" && (
              <Link
                href="/preventative-schedule/new"
                className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg transition-colors text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
              >
                + Add Schedule
              </Link>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-700 mb-6">
          <nav
            role="tablist"
            aria-label="Operations tabs"
            className="flex gap-2 sm:gap-4 overflow-x-auto scrollbar-hide"
          >
            {TABS.map((tab, index) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  ref={(el) => { tabRefs.current[index] = el; }}
                  role="tab"
                  id={`tab-${tab.id}`}
                  aria-selected={isActive}
                  aria-controls={`panel-${tab.id}`}
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => handleTabChange(tab.id)}
                  onKeyDown={(e) => handleTabKeyDown(e, index)}
                  className={`flex items-center gap-2 px-3 sm:px-4 py-3 border-b-2 transition-colors whitespace-nowrap flex-shrink-0 text-sm sm:text-base focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
                    isActive
                      ? "border-teal-600 text-teal-500"
                      : "border-transparent text-gray-400 hover:text-white hover:border-gray-600"
                  }`}
                >
                  {tab.icon}
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.label.split(" ")[0]}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === "maintenance" && (
          <div role="tabpanel" id="panel-maintenance" aria-labelledby="tab-maintenance">
            <MaintenanceTab userId={user.id} />
          </div>
        )}
        {activeTab === "inspections" && (
          <div role="tabpanel" id="panel-inspections" aria-labelledby="tab-inspections">
            <InspectionsTab userId={user.id} />
          </div>
        )}
        {activeTab === "schedule" && (
          <div role="tabpanel" id="panel-schedule" aria-labelledby="tab-schedule">
            <ScheduleTab userId={user.id} />
          </div>
        )}
      </main>
    </div>
  );
}

// ============================================
// MAINTENANCE TAB
// ============================================
function MaintenanceTab({ userId }: { userId: string }) {
  const [filterStatus, setFilterStatus] = useState<string>("open");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const allRequests = useQuery(api.maintenanceRequests.getAll, { userId: userId as Id<"users"> });
  const stats = useQuery(api.maintenanceRequests.getStats, { userId: userId as Id<"users"> });

  const filteredRequests = useMemo(() => {
    if (!allRequests) return undefined;
    return allRequests.filter((request) => {
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
  }, [allRequests, filterStatus, filterPriority, filterCategory, searchTerm]);

  const isFiltered = filterStatus !== "open" || filterPriority !== "all" || filterCategory !== "all" || searchTerm !== "";

  return (
    <div>
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard title="Total Requests" value={stats.total} color="blue" />
          <StatCard title="Open" value={stats.open} color="yellow" />
          <StatCard title="Urgent" value={stats.urgent} color="red" />
          <StatCard title="Completed" value={stats.completed} color="green" />
        </div>
      )}

      {/* Filters */}
      <div className="bg-gray-800 rounded-lg p-4 mb-6 border border-gray-600">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <FormInput
            label="Search"
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search requests..."
          />
          <FormSelect
            label="Status"
            options={MAINTENANCE_STATUS_OPTIONS}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            placeholder=""
          />
          <FormSelect
            label="Priority"
            options={PRIORITY_OPTIONS}
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            placeholder=""
          />
          <FormSelect
            label="Category"
            options={CATEGORY_OPTIONS}
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            placeholder=""
          />
        </div>
      </div>

      {/* Request List */}
      {filteredRequests === undefined ? (
        <LoadingScreen fullScreen={false} message="Loading maintenance requests..." />
      ) : filteredRequests.length === 0 ? (
        <EmptyState
          title="No maintenance requests found"
          description={isFiltered ? "Try adjusting your filters." : "Log your first maintenance request to get started."}
          isFiltered={isFiltered}
          action={!isFiltered ? { label: "+ Log Request", href: "/maintenance/new" } : undefined}
          icon={
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
        />
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
      case "quoted": return "bg-teal-700";
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
      className="block bg-gray-800 rounded-lg p-4 border border-gray-600 hover:bg-gray-700/80 hover:border-gray-500 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-inset"
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-1 text-xs text-white rounded ${getPriorityColor(request.priority)}`}>
              {formatStatus(request.priority)}
            </span>
            <span className={`px-2 py-1 text-xs text-white rounded ${getStatusColor(request.status)}`}>
              {formatStatus(request.status)}
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
        <div className="text-right text-sm">
          <p className="text-gray-400">{request.reportedDate}</p>
          {request.scheduledDate && <p className="text-teal-500">Scheduled: {request.scheduledDate}</p>}
          {request.status !== "completed" && request.reportedDate && (() => {
            const days = Math.floor((Date.now() - new Date(request.reportedDate).getTime()) / (1000 * 60 * 60 * 24));
            const color = days >= 15 ? "text-red-400" : days >= 8 ? "text-orange-400" : days >= 4 ? "text-yellow-400" : "text-gray-500";
            return <p className={`text-xs mt-1 font-medium ${color}`}>{days}d ago</p>;
          })()}
        </div>
      </div>
    </Link>
  );
}

// ============================================
// INSPECTIONS TAB
// ============================================
function InspectionsTab({ userId }: { userId: string }) {
  const { confirm: confirmDialog, alert: alertDialog } = useConfirmDialog();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: Id<"inspections">; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const inspections = useQuery(api.inspections.getInspections, { userId: userId as Id<"users"> });
  const templates = useQuery(api.inspections.getTemplates, { userId: userId as Id<"users"> });
  const seedBLSTemplate = useMutation(api.inspections.seedBLSTemplate);
  const deleteInspection = useMutation(api.inspections.deleteInspection);

  const handleSeedTemplate = async () => {
    try {
      await seedBLSTemplate({ createdBy: userId as Id<"users"> });
      await alertDialog({ title: "Notice", message: "BLS Template created successfully!" });
    } catch (error) {
      await alertDialog({ title: "Error", message: "Error creating template. It may already exist." });
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    setIsDeleting(true);
    try {
      await deleteInspection({ userId: userId as Id<"users">, inspectionId: deleteConfirm.id });
      setDeleteConfirm(null);
    } catch (error) {
      await alertDialog({ title: "Error", message: "Error deleting inspection." });
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredInspections = useMemo(() => {
    if (!inspections) return undefined;
    if (statusFilter === "all") return inspections;
    return inspections.filter((inspection) => inspection.status === statusFilter);
  }, [inspections, statusFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled": return "bg-teal-700";
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
        <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4 mb-6" role="alert">
          <div className="flex items-center justify-between">
            <p className="text-yellow-300">No inspection templates found. Create the BLS template to get started.</p>
            <button
              onClick={handleSeedTemplate}
              className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500"
            >
              Create BLS Template
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-gray-800 rounded-lg p-4 mb-6 border border-gray-600">
        <div className="flex gap-4 items-end">
          <div className="w-48">
            <FormSelect
              label="Status"
              options={INSPECTION_STATUS_OPTIONS}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              placeholder=""
            />
          </div>
          <Link
            href="/inspections/templates"
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
          >
            Manage Templates
          </Link>
        </div>
      </div>

      {/* Inspections List */}
      {filteredInspections === undefined ? (
        <LoadingScreen fullScreen={false} message="Loading inspections..." />
      ) : filteredInspections.length === 0 ? (
        <EmptyState
          title="No inspections found"
          description={statusFilter !== "all" ? "Try a different status filter." : "Create your first inspection to get started."}
          isFiltered={statusFilter !== "all"}
          action={statusFilter === "all" ? { label: "+ New Inspection", href: "/inspections/new" } : undefined}
          icon={
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          }
        />
      ) : (
        <div className="space-y-4">
          {filteredInspections.map((inspection) => (
            <div key={inspection._id} className="bg-gray-800 rounded-lg p-4 border border-gray-600">
              <div className="flex justify-between items-start">
                <Link
                  href={`/inspections/${inspection._id}`}
                  className="flex-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 rounded"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-1 text-xs text-white rounded ${getStatusColor(inspection.status)}`}>
                      {formatStatus(inspection.status)}
                    </span>
                  </div>
                  <h3 className="text-white font-medium">
                    {inspection.property?.propertyName || inspection.property?.addressLine1}
                  </h3>
                  <p className="text-gray-400 text-sm">
                    {inspection.dwelling?.dwellingName || "All Dwellings"} | {inspection.scheduledDate}
                  </p>
                  <p className="text-gray-400 text-xs mt-1">
                    {inspection.completedItems}/{inspection.totalItems} items |{" "}
                    {inspection.passedItems} passed, {inspection.failedItems} failed
                  </p>
                </Link>
                <button
                  onClick={() => setDeleteConfirm({ id: inspection._id, name: inspection.property?.addressLine1 || "Unknown" })}
                  className="p-2 text-gray-400 hover:text-red-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded"
                  aria-label={`Delete inspection for ${inspection.property?.addressLine1 || "Unknown"}`}
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
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setDeleteConfirm(null)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-inspection-title"
            className="bg-gray-800 rounded-lg p-6 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="delete-inspection-title" className="text-lg font-semibold text-white mb-2">Delete Inspection?</h3>
            <p className="text-gray-400 text-sm mb-4">
              Are you sure you want to delete the inspection for{" "}
              <span className="font-semibold text-white">{deleteConfirm.name}</span>?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={isDeleting}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-700 text-white rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-800 text-white rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
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
function ScheduleTab({ userId }: { userId: string }) {
  const { confirm: confirmDialog, alert: alertDialog } = useConfirmDialog();
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const allSchedules = useQuery(api.preventativeSchedule.getAll, { userId: userId as Id<"users"> });
  const stats = useQuery(api.preventativeSchedule.getStats, { userId: userId as Id<"users"> });
  const completeSchedule = useMutation(api.preventativeSchedule.complete);
  const removeSchedule = useMutation(api.preventativeSchedule.remove);

  const handleComplete = async (scheduleId: Id<"preventativeSchedule">) => {
    const today = new Date().toISOString().split("T")[0];
    const notes = prompt("Add completion notes (optional):");
    const actualCost = prompt("Enter actual cost (optional):");

    try {
      await completeSchedule({
        userId: userId as Id<"users">,
        scheduleId,
        completedDate: today,
        actualCost: actualCost ? parseFloat(actualCost) : undefined,
        notes: notes || undefined,
        createMaintenanceRecord: true,
      });
    } catch (err) {
      await alertDialog({ title: "Error", message: "Failed to mark schedule as completed." });
    }
  };

  const handleDelete = async (scheduleId: Id<"preventativeSchedule">) => {
    const confirmed = await confirmDialog({ title: "Delete Schedule", message: "Are you sure you want to delete this schedule?", variant: "danger", confirmLabel: "Yes" });
    if (!confirmed) return;
    try {
      await removeSchedule({ userId: userId as Id<"users">, scheduleId });
    } catch (err) {
      await alertDialog({ title: "Error", message: "Failed to delete schedule." });
    }
  };

  const schedulesWithStatus = useMemo(() => {
    if (!allSchedules) return undefined;
    const today = new Date();
    return allSchedules.map((schedule) => {
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
  }, [allSchedules]);

  const filteredSchedules = useMemo(() => {
    if (!schedulesWithStatus) return undefined;
    return schedulesWithStatus.filter((schedule) => {
      const matchesCategory = filterCategory === "all" || schedule.category === filterCategory;
      const matchesStatus = filterStatus === "all" || schedule.status === filterStatus;
      const matchesSearch =
        !searchTerm ||
        schedule.taskName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        schedule.property?.addressLine1.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesCategory && matchesStatus && matchesSearch;
    });
  }, [schedulesWithStatus, filterCategory, filterStatus, searchTerm]);

  const isFiltered = filterCategory !== "all" || filterStatus !== "all" || searchTerm !== "";

  return (
    <div>
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard title="Total Tasks" value={stats.total} color="blue" />
          <StatCard title="Overdue" value={stats.overdue} color="red" />
          <StatCard title="Due Within 30 Days" value={stats.dueWithin30Days} color="yellow" />
          <StatCard title="Active" value={stats.active} color="green" />
        </div>
      )}

      {/* Filters */}
      <div className="bg-gray-800 rounded-lg p-4 mb-6 border border-gray-600">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormInput
            label="Search"
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search tasks..."
          />
          <FormSelect
            label="Status"
            options={SCHEDULE_STATUS_OPTIONS}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            placeholder=""
          />
          <FormSelect
            label="Category"
            options={CATEGORY_OPTIONS}
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            placeholder=""
          />
        </div>
      </div>

      {/* Schedule List */}
      {filteredSchedules === undefined ? (
        <LoadingScreen fullScreen={false} message="Loading schedules..." />
      ) : filteredSchedules.length === 0 ? (
        <EmptyState
          title="No scheduled tasks found"
          description={isFiltered ? "Try adjusting your filters." : "Add preventative maintenance schedules to get started."}
          isFiltered={isFiltered}
          action={!isFiltered ? { label: "+ Add Schedule", href: "/preventative-schedule/new" } : undefined}
          icon={
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
        />
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
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-600">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-1 text-xs text-white rounded ${getStatusColor(schedule.status)}`}>
              {formatStatus(schedule.status)}
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
          <p className="text-gray-400 text-xs mt-1">
            Due: {schedule.nextDueDate} ({schedule.daysUntilDue > 0 ? `in ${schedule.daysUntilDue} days` : `${Math.abs(schedule.daysUntilDue)} days overdue`})
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onComplete}
            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
            aria-label={`Mark ${schedule.taskName} as complete`}
          >
            Complete
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-gray-400 hover:text-red-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded"
            aria-label={`Delete ${schedule.taskName}`}
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
