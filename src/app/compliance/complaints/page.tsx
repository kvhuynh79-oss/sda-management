"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import Header from "../../../components/Header";
import { RequireAuth } from "../../../components/RequireAuth";
import { LoadingScreen, StatCard } from "../../../components/ui";
import Badge from "../../../components/ui/Badge";
import { formatDate, formatStatus } from "../../../utils/format";
import { generateComplaintsRegisterPdf } from "../../../utils/complaintsRegisterPdf";
import { useOrganization } from "../../../contexts/OrganizationContext";
import Link from "next/link";
import HelpGuideButton from "@/components/ui/HelpGuideButton";
import HelpGuidePanel from "@/components/ui/HelpGuidePanel";
import { HELP_GUIDES } from "@/constants/helpGuides";

// -- Label maps --

const CATEGORY_LABELS: Record<string, string> = {
  service_delivery: "Service Delivery",
  staff_conduct: "Staff Conduct",
  property_condition: "Property Condition",
  communication: "Communication",
  billing: "Billing / Financial",
  privacy: "Privacy",
  safety: "Safety Concern",
  other: "Other",
};

const SEVERITY_BADGE: Record<
  string,
  { variant: "neutral" | "warning" | "orange" | "error"; label: string }
> = {
  low: { variant: "neutral", label: "Low" },
  medium: { variant: "warning", label: "Medium" },
  high: { variant: "orange", label: "High" },
  critical: { variant: "error", label: "Critical" },
};

const STATUS_BADGE: Record<
  string,
  { variant: "warning" | "info" | "purple" | "success" | "neutral" | "error"; label: string }
> = {
  received: { variant: "warning", label: "Received" },
  acknowledged: { variant: "info", label: "Acknowledged" },
  under_investigation: { variant: "purple", label: "Under Investigation" },
  resolved: { variant: "success", label: "Resolved" },
  closed: { variant: "neutral", label: "Closed" },
  escalated: { variant: "error", label: "Escalated" },
};

const SOURCE_BADGE: Record<string, { variant: "info" | "neutral"; label: string }> = {
  website: { variant: "info", label: "Website" },
  phone: { variant: "neutral", label: "Phone" },
  email: { variant: "neutral", label: "Email" },
  in_person: { variant: "neutral", label: "In Person" },
  internal: { variant: "neutral", label: "Internal" },
};

// -- Helper: hours between two dates --

function hoursBetween(a: Date, b: Date): number {
  return Math.round(Math.abs(b.getTime() - a.getTime()) / (1000 * 60 * 60));
}

// -- Main content component --

function ComplaintsRegisterContent() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; role: string } | null>(null);
  const { organization } = useOrganization();

  const [showHelp, setShowHelp] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Filter state
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");

  // Auth
  useEffect(() => {
    const storedUser = localStorage.getItem("sda_user");
    if (!storedUser) {
      router.push("/login");
      return;
    }
    try {
      setUser(JSON.parse(storedUser));
    } catch {
      // Invalid data
    }
  }, [router]);

  // Queries
  const complaintsStats = useQuery(api.complaints.getStats, user ? { userId: user.id as Id<"users"> } : "skip");
  const complaints = useQuery(api.complaints.getAll, user?.id ? {
    userId: user.id as Id<"users">,
    status: statusFilter || undefined,
    category: categoryFilter || undefined,
    severity: severityFilter || undefined,
  } : "skip");
  const pendingAck = useQuery(api.complaints.getPendingAcknowledgment, user ? { userId: user.id as Id<"users"> } : "skip");

  // Client-side filtering for search text and source (not handled by backend)
  const filteredComplaints = useMemo(() => {
    if (!complaints) return [];
    return complaints.filter((c) => {
      if (sourceFilter && c.source !== sourceFilter) return false;
      if (searchText) {
        const search = searchText.toLowerCase();
        if (
          !(c.referenceNumber || "").toLowerCase().includes(search) &&
          !(c.complainantName || "").toLowerCase().includes(search) &&
          !c.description.toLowerCase().includes(search)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [complaints, sourceFilter, searchText]);

  const hasFilters = searchText || statusFilter || categoryFilter || severityFilter || sourceFilter;

  // Next deadline helper — shows acknowledgment deadline OR resolution deadline
  const getDueDateInfo = (complaint: {
    acknowledgmentDueDate?: string;
    acknowledgedDate?: string;
    resolutionDueDate?: string;
    status: string;
  }) => {
    // Resolved/closed — no deadline
    if (complaint.status === "resolved" || complaint.status === "closed") {
      return { color: "text-green-400", label: "Complete" };
    }

    // Acknowledged but not resolved — show resolution deadline
    if (complaint.acknowledgedDate || complaint.status === "acknowledged" || complaint.status === "under_investigation") {
      if (!complaint.resolutionDueDate) {
        return { color: "text-gray-400", label: "N/A" };
      }
      const now = new Date();
      const due = new Date(complaint.resolutionDueDate);
      const daysRemaining = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysRemaining < 0) {
        return { color: "text-red-400 font-semibold", label: `${Math.abs(daysRemaining)}d overdue` };
      }
      if (daysRemaining <= 3) {
        return { color: "text-red-400", label: `${daysRemaining}d (resolve)` };
      }
      if (daysRemaining <= 7) {
        return { color: "text-yellow-400", label: `${daysRemaining}d (resolve)` };
      }
      return { color: "text-green-400", label: `${daysRemaining}d (resolve)` };
    }

    // Not acknowledged — show acknowledgment deadline
    if (!complaint.acknowledgmentDueDate) {
      return { color: "text-gray-400", label: "N/A" };
    }
    const now = new Date();
    const due = new Date(complaint.acknowledgmentDueDate);
    const hoursRemaining = (due.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursRemaining < 0) {
      return { color: "text-red-400 font-semibold", label: `${Math.abs(Math.round(hoursRemaining))}h overdue` };
    }
    if (hoursRemaining < 6) {
      return { color: "text-yellow-400", label: `${Math.round(hoursRemaining)}h (ack)` };
    }
    return { color: "text-green-400", label: `${Math.round(hoursRemaining)}h (ack)` };
  };

  const handleExportPdf = async () => {
    if (!filteredComplaints.length || !complaintsStats) return;
    setIsExporting(true);
    try {
      const now = new Date();
      const pdfData = filteredComplaints.map((c) => {
        const receivedDate = new Date(c.receivedDate);
        const daysOpen = Math.floor(
          (now.getTime() - receivedDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        const daysToAcknowledge = c.acknowledgedDate
          ? Math.floor(
              (new Date(c.acknowledgedDate).getTime() - receivedDate.getTime()) /
                (1000 * 60 * 60 * 24)
            )
          : null;
        const daysToResolve = c.resolutionDate
          ? Math.floor(
              (new Date(c.resolutionDate).getTime() - receivedDate.getTime()) /
                (1000 * 60 * 60 * 24)
            )
          : null;

        return {
          _id: c._id,
          referenceNumber: c.referenceNumber,
          complainantType: c.complainantType,
          complainantName: c.complainantName,
          category: c.category,
          severity: c.severity,
          status: c.status,
          source: c.source,
          receivedDate: c.receivedDate,
          acknowledgedDate: c.acknowledgedDate,
          acknowledgmentMethod: c.acknowledgmentMethod,
          resolutionDate: c.resolutionDate,
          resolutionDescription: c.resolutionDescription,
          resolutionOutcome: c.resolutionOutcome,
          complainantSatisfied: c.complainantSatisfied,
          escalatedToNdisCommission: c.escalatedToNdisCommission,
          escalationDate: c.escalationDate,
          systemicIssueIdentified: c.systemicIssueIdentified,
          correctiveActionsTaken: c.correctiveActionsTaken,
          description: c.description,
          daysOpen,
          daysToAcknowledge,
          daysToResolve,
          participant: c.participant
            ? { firstName: c.participant.firstName, lastName: c.participant.lastName }
            : null,
          property: c.property
            ? { addressLine1: c.property.addressLine1, suburb: c.property.suburb }
            : null,
          receivedByUser: c.receivedByUser
            ? { firstName: c.receivedByUser.firstName, lastName: c.receivedByUser.lastName }
            : null,
          assignedToUser: c.assignedToUser
            ? { firstName: c.assignedToUser.firstName, lastName: c.assignedToUser.lastName }
            : null,
        };
      });

      generateComplaintsRegisterPdf(pdfData, complaintsStats, undefined, organization?.name);
    } catch (error) {
      console.error("Error generating PDF:", error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <Header currentPage="compliance" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <Link
              href="/compliance"
              className="text-teal-500 hover:text-teal-400 text-sm mb-2 inline-block focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 rounded"
            >
              &larr; Back to Compliance Dashboard
            </Link>
            <h1 className="text-2xl font-bold text-white">Complaints Register</h1>
            <p className="text-gray-400 mt-1">
              NDIS-compliant complaint tracking and resolution
            </p>
          </div>
          <div className="flex items-center gap-3">
            <HelpGuideButton onClick={() => setShowHelp(true)} />
            <button
              onClick={handleExportPdf}
              disabled={isExporting || !filteredComplaints.length}
              className={`px-4 py-2 rounded-lg text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 ${
                isExporting || !filteredComplaints.length
                  ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                  : "bg-gray-700 hover:bg-gray-600 text-white"
              }`}
              aria-label="Export complaints register as PDF"
            >
              {isExporting ? "Generating..." : "Export PDF"}
            </button>
            <Link
              href="/compliance/complaints/new"
              className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg transition-colors text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
            >
              + Log Complaint
            </Link>
          </div>
        </div>

        {/* Stats Row */}
        {complaintsStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard
              title="Total Complaints"
              value={complaintsStats.total}
              color="blue"
            />
            <StatCard
              title="Awaiting Acknowledgment"
              value={complaintsStats.byStatus.received}
              color="yellow"
            />
            <StatCard
              title="Under Investigation"
              value={complaintsStats.byStatus.under_investigation}
              color="purple"
            />
            <StatCard
              title="Overdue"
              value={complaintsStats.overdueAcknowledgments}
              color={complaintsStats.overdueAcknowledgments > 0 ? "red" : "green"}
            />
          </div>
        )}

        {/* Urgent: Overdue Acknowledgments Banner */}
        {pendingAck && pendingAck.length > 0 && (
          <div className="mb-8" role="alert" aria-label="Overdue complaint acknowledgments">
            <div className="bg-red-900/30 border border-red-600/50 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-red-400 mb-3 flex items-center gap-2">
                <span className="relative flex h-3 w-3" aria-hidden="true">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
                Pending Acknowledgment ({pendingAck.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {pendingAck.map((complaint) => {
                  const now = new Date();
                  const received = new Date(complaint.receivedDate);
                  const hoursOverdue = hoursBetween(now, received);

                  return (
                    <Link
                      key={complaint._id}
                      href={`/compliance/complaints/${complaint._id}`}
                      className="block bg-red-900/20 border border-red-600/40 rounded-lg p-4 hover:bg-red-900/30 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded-lg"
                    >
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="text-white font-medium truncate">
                            {complaint.referenceNumber || "No Ref #"}
                          </p>
                          <p className="text-gray-400 text-sm">
                            {CATEGORY_LABELS[complaint.category] || formatStatus(complaint.category)}
                          </p>
                          {complaint.participant && (
                            <p className="text-gray-400 text-xs mt-0.5">
                              {complaint.participant.firstName} {complaint.participant.lastName}
                            </p>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0 ml-3">
                          <p className="text-lg font-bold text-red-400">
                            {hoursOverdue}h
                          </p>
                          <p className="text-gray-400 text-xs">since received</p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <fieldset className="bg-gray-800 rounded-lg p-4 mb-6">
          <legend className="sr-only">Filter complaints</legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div>
              <label htmlFor="complaint-search" className="block text-sm font-medium text-gray-300 mb-1">
                Search
              </label>
              <input
                id="complaint-search"
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Ref #, name, description..."
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors"
              />
            </div>

            {/* Status Filter */}
            <div>
              <label htmlFor="complaint-status-filter" className="block text-sm font-medium text-gray-300 mb-1">
                Status
              </label>
              <select
                id="complaint-status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors"
              >
                <option value="">All Statuses</option>
                <option value="received">Received</option>
                <option value="acknowledged">Acknowledged</option>
                <option value="under_investigation">Under Investigation</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
                <option value="escalated">Escalated</option>
              </select>
            </div>

            {/* Category Filter */}
            <div>
              <label htmlFor="complaint-category-filter" className="block text-sm font-medium text-gray-300 mb-1">
                Category
              </label>
              <select
                id="complaint-category-filter"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors"
              >
                <option value="">All Categories</option>
                {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Severity Filter */}
            <div>
              <label htmlFor="complaint-severity-filter" className="block text-sm font-medium text-gray-300 mb-1">
                Severity
              </label>
              <select
                id="complaint-severity-filter"
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors"
              >
                <option value="">All Severities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            {/* Source Filter */}
            <div>
              <label htmlFor="complaint-source-filter" className="block text-sm font-medium text-gray-300 mb-1">
                Source
              </label>
              <select
                id="complaint-source-filter"
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors"
              >
                <option value="">All Sources</option>
                <option value="website">Website</option>
                <option value="phone">Phone</option>
                <option value="email">Email</option>
                <option value="in_person">In Person</option>
                <option value="internal">Internal</option>
              </select>
            </div>
          </div>

          {/* Clear filters */}
          {hasFilters && (
            <button
              onClick={() => {
                setSearchText("");
                setStatusFilter("");
                setCategoryFilter("");
                setSeverityFilter("");
                setSourceFilter("");
              }}
              className="mt-3 text-sm text-teal-500 hover:text-teal-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 rounded"
            >
              Clear all filters
            </button>
          )}
        </fieldset>

        {/* Complaints Table */}
        {complaints === undefined ? (
          <LoadingScreen fullScreen={false} message="Loading complaints..." />
        ) : filteredComplaints.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-12 text-center">
            <svg
              className="w-12 h-12 mx-auto text-gray-400 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p className="text-gray-400 mb-4">
              {hasFilters
                ? "No complaints match your filters"
                : "No complaints recorded yet"}
            </p>
            {!hasFilters && (
              <Link
                href="/compliance/complaints/new"
                className="inline-flex items-center px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
              >
                + Log First Complaint
              </Link>
            )}
          </div>
        ) : (
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full" role="table" aria-label="Complaints register">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th scope="col" className="text-left px-4 py-3 text-sm font-medium text-gray-400">
                      Ref #
                    </th>
                    <th scope="col" className="text-left px-4 py-3 text-sm font-medium text-gray-400">
                      Date
                    </th>
                    <th scope="col" className="text-left px-4 py-3 text-sm font-medium text-gray-400">
                      Complainant
                    </th>
                    <th scope="col" className="text-left px-4 py-3 text-sm font-medium text-gray-400">
                      Category
                    </th>
                    <th scope="col" className="text-left px-4 py-3 text-sm font-medium text-gray-400">
                      Severity
                    </th>
                    <th scope="col" className="text-left px-4 py-3 text-sm font-medium text-gray-400">
                      Status
                    </th>
                    <th scope="col" className="text-left px-4 py-3 text-sm font-medium text-gray-400">
                      Next Deadline
                    </th>
                    <th scope="col" className="text-right px-4 py-3 text-sm font-medium text-gray-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {filteredComplaints.map((complaint) => {
                    const severityInfo =
                      SEVERITY_BADGE[complaint.severity] || {
                        variant: "neutral" as const,
                        label: formatStatus(complaint.severity),
                      };
                    const statusInfo =
                      STATUS_BADGE[complaint.status] || {
                        variant: "neutral" as const,
                        label: formatStatus(complaint.status),
                      };
                    const sourceInfo =
                      SOURCE_BADGE[complaint.source || ""] || {
                        variant: "neutral" as const,
                        label: formatStatus(complaint.source || "unknown"),
                      };
                    const dueDateInfo = getDueDateInfo(complaint);

                    return (
                      <tr
                        key={complaint._id}
                        className="hover:bg-gray-700/50 transition-colors cursor-pointer"
                        onClick={() => router.push(`/compliance/complaints/${complaint._id}`)}
                        tabIndex={0}
                        role="row"
                        aria-label={`Complaint ${complaint.referenceNumber || "no reference"}, ${statusInfo.label}, ${severityInfo.label} severity`}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            router.push(`/compliance/complaints/${complaint._id}`);
                          }
                        }}
                      >
                        {/* Ref # */}
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-white text-sm font-medium font-mono">
                              {complaint.referenceNumber || "\u2014"}
                            </p>
                            <Badge variant={sourceInfo.variant} size="xs">
                              {sourceInfo.label}
                            </Badge>
                          </div>
                        </td>

                        {/* Date */}
                        <td className="px-4 py-3 text-sm text-gray-300">
                          {formatDate(complaint.receivedDate)}
                        </td>

                        {/* Complainant */}
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-white text-sm">
                              {complaint.complainantName || "Anonymous"}
                            </p>
                            <p className="text-gray-400 text-xs">
                              {formatStatus(complaint.complainantType || "unknown")}
                            </p>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="px-4 py-3 text-sm text-gray-300">
                          {CATEGORY_LABELS[complaint.category] || formatStatus(complaint.category)}
                        </td>

                        {/* Severity */}
                        <td className="px-4 py-3">
                          <Badge variant={severityInfo.variant} size="xs">
                            {severityInfo.label}
                          </Badge>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          <Badge variant={statusInfo.variant} size="xs" dot>
                            {statusInfo.label}
                          </Badge>
                        </td>

                        {/* Due Date */}
                        <td className="px-4 py-3">
                          <span className={`text-sm ${dueDateInfo.color}`}>
                            {dueDateInfo.label}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/compliance/complaints/${complaint._id}`}
                            className="text-teal-500 hover:text-teal-400 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 rounded"
                            onClick={(e) => e.stopPropagation()}
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Results count */}
            <div className="px-4 py-3 border-t border-gray-700 text-sm text-gray-400">
              Showing {filteredComplaints.length} complaint{filteredComplaints.length !== 1 ? "s" : ""}
              {hasFilters && complaints && filteredComplaints.length !== complaints.length
                ? ` of ${complaints.length}`
                : ""}
            </div>
          </div>
        )}
        <HelpGuidePanel
          guide={HELP_GUIDES.complaints}
          isOpen={showHelp}
          onClose={() => setShowHelp(false)}
        />
      </main>
    </div>
  );
}

export default function ComplaintsRegisterPage() {
  return (
    <RequireAuth>
      <ComplaintsRegisterContent />
    </RequireAuth>
  );
}
