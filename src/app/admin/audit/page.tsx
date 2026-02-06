"use client";

import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import Header from "../../../components/Header";
import { RequireAuth } from "../../../components/RequireAuth";
import { useSession } from "../../../hooks/useSession";
import {
  Shield,
  Search,
  Filter,
  Calendar,
  User,
  FileText,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  Trash2,
  Edit,
  Plus,
  LogIn,
  LogOut,
  Download,
  Upload,
} from "lucide-react";

const ACTION_ICONS: Record<string, React.ReactNode> = {
  create: <Plus className="w-4 h-4 text-green-400" />,
  update: <Edit className="w-4 h-4 text-blue-400" />,
  delete: <Trash2 className="w-4 h-4 text-red-400" />,
  login: <LogIn className="w-4 h-4 text-purple-400" />,
  logout: <LogOut className="w-4 h-4 text-gray-400" />,
  export: <Download className="w-4 h-4 text-yellow-400" />,
  import: <Upload className="w-4 h-4 text-cyan-400" />,
  view: <FileText className="w-4 h-4 text-gray-400" />,
};

const ACTION_COLORS: Record<string, string> = {
  create: "bg-green-900/30 text-green-400 border-green-700",
  update: "bg-blue-900/30 text-blue-400 border-blue-700",
  delete: "bg-red-900/30 text-red-400 border-red-700",
  login: "bg-purple-900/30 text-purple-400 border-purple-700",
  logout: "bg-gray-800/30 text-gray-400 border-gray-600",
  export: "bg-yellow-900/30 text-yellow-400 border-yellow-700",
  import: "bg-cyan-900/30 text-cyan-400 border-cyan-700",
  view: "bg-gray-800/30 text-gray-400 border-gray-600",
};

const ENTITY_TYPE_LABELS: Record<string, string> = {
  property: "Property",
  participant: "Participant",
  payment: "Payment",
  maintenanceRequest: "Maintenance",
  document: "Document",
  incident: "Incident",
  incidentAction: "Incident Action",
  user: "User",
  dwelling: "Dwelling",
  contractor: "Contractor",
  owner: "Owner",
  inspection: "Inspection",
  alert: "Alert",
  claim: "Claim",
};

export default function AuditLogPage() {
  return (
    <RequireAuth allowedRoles={["admin"]}>
      <AuditLogContent />
    </RequireAuth>
  );
}

function AuditLogContent() {
  const { user } = useSession();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAction, setSelectedAction] = useState<string>("");
  const [selectedEntityType, setSelectedEntityType] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [page, setPage] = useState(0);
  const limit = 25;

  const auditData = useQuery(
    api.auditLog.getAuditLogs,
    user
      ? {
          requestingUserId: user.id,
          limit,
          offset: page * limit,
          searchTerm: searchTerm || undefined,
          action: selectedAction || undefined,
          entityType: selectedEntityType || undefined,
          startDate: startDate ? new Date(startDate).getTime() : undefined,
          endDate: endDate ? new Date(endDate).getTime() + 86400000 : undefined, // End of day
        }
      : "skip"
  );

  const stats = useQuery(
    api.auditLog.getAuditStats,
    user
      ? {
          requestingUserId: user.id,
          startDate: startDate ? new Date(startDate).getTime() : undefined,
          endDate: endDate ? new Date(endDate).getTime() + 86400000 : undefined,
        }
      : "skip"
  );

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString("en-AU", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatJSON = (jsonString: string | undefined) => {
    if (!jsonString) return null;
    try {
      const obj = JSON.parse(jsonString);
      return Object.entries(obj).map(([key, value]) => (
        <div key={key} className="text-xs">
          <span className="text-gray-400">{key}:</span>{" "}
          <span className="text-gray-300">{String(value)}</span>
        </div>
      ));
    } catch {
      return <span className="text-gray-400 text-xs">{jsonString}</span>;
    }
  };

  return (
    <RequireAuth allowedRoles={["admin"]}>
      <div className="min-h-screen bg-gray-900">
        <Header currentPage="admin" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-purple-600/20 rounded-lg">
            <Shield className="w-8 h-8 text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Audit Logs</h1>
            <p className="text-gray-400">Track all user actions and system changes</p>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="text-sm text-gray-400">Total Logs</div>
              <div className="text-2xl font-bold text-white">{stats.totalLogs}</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="text-sm text-gray-400">Creates</div>
              <div className="text-2xl font-bold text-green-400">{stats.actionCounts.create || 0}</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="text-sm text-gray-400">Updates</div>
              <div className="text-2xl font-bold text-blue-400">{stats.actionCounts.update || 0}</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="text-sm text-gray-400">Deletes</div>
              <div className="text-2xl font-bold text-red-400">{stats.actionCounts.delete || 0}</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6 border border-gray-700">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-gray-400" />
            <span className="text-white font-medium">Filters</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(0);
                }}
                className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Action Filter */}
            <select
              value={selectedAction}
              onChange={(e) => {
                setSelectedAction(e.target.value);
                setPage(0);
              }}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">All Actions</option>
              <option value="create">Create</option>
              <option value="update">Update</option>
              <option value="delete">Delete</option>
              <option value="login">Login</option>
              <option value="logout">Logout</option>
              <option value="export">Export</option>
              <option value="import">Import</option>
            </select>

            {/* Entity Type Filter */}
            <select
              value={selectedEntityType}
              onChange={(e) => {
                setSelectedEntityType(e.target.value);
                setPage(0);
              }}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">All Entity Types</option>
              <option value="property">Property</option>
              <option value="participant">Participant</option>
              <option value="payment">Payment</option>
              <option value="maintenanceRequest">Maintenance</option>
              <option value="document">Document</option>
              <option value="incident">Incident</option>
              <option value="user">User</option>
            </select>

            {/* Start Date */}
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(0);
                }}
                className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* End Date */}
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(0);
                }}
                className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Clear Filters */}
          {(searchTerm || selectedAction || selectedEntityType || startDate || endDate) && (
            <button
              onClick={() => {
                setSearchTerm("");
                setSelectedAction("");
                setSelectedEntityType("");
                setStartDate("");
                setEndDate("");
                setPage(0);
              }}
              className="mt-4 text-sm text-purple-400 hover:text-purple-300"
            >
              Clear all filters
            </button>
          )}
        </div>

        {/* Audit Log Table */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr className="border-b border-gray-700">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Entity
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {auditData?.logs.map((log) => (
                  <tr key={log._id} className="hover:bg-gray-700/50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-white">{formatTimestamp(log.timestamp)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                          <User className="w-4 h-4 text-gray-400" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-white">{log.userName}</div>
                          <div className="text-xs text-gray-400">{log.userEmail}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                          ACTION_COLORS[log.action] || "bg-gray-800 text-gray-400"
                        }`}
                      >
                        {ACTION_ICONS[log.action]}
                        {log.action.charAt(0).toUpperCase() + log.action.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-white">
                        {ENTITY_TYPE_LABELS[log.entityType] || log.entityType}
                      </div>
                      {log.entityName && (
                        <div className="text-xs text-gray-400 truncate max-w-[200px]">
                          {log.entityName}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {log.changes && (
                        <details className="cursor-pointer">
                          <summary className="text-xs text-purple-400 hover:text-purple-300">
                            View changes
                          </summary>
                          <div className="mt-2 p-2 bg-gray-900 rounded text-xs max-w-[300px] overflow-auto">
                            {formatJSON(log.changes)}
                          </div>
                        </details>
                      )}
                      {log.metadata && !log.changes && (
                        <details className="cursor-pointer">
                          <summary className="text-xs text-gray-400 hover:text-gray-300">
                            View metadata
                          </summary>
                          <div className="mt-2 p-2 bg-gray-900 rounded text-xs max-w-[300px] overflow-auto">
                            {formatJSON(log.metadata)}
                          </div>
                        </details>
                      )}
                      {log.previousValues && (
                        <details className="cursor-pointer mt-1">
                          <summary className="text-xs text-yellow-400 hover:text-yellow-300">
                            Previous values
                          </summary>
                          <div className="mt-2 p-2 bg-gray-900 rounded text-xs max-w-[300px] overflow-auto">
                            {formatJSON(log.previousValues)}
                          </div>
                        </details>
                      )}
                    </td>
                  </tr>
                ))}
                {auditData?.logs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                      <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No audit logs found</p>
                      {(searchTerm || selectedAction || selectedEntityType || startDate || endDate) && (
                        <p className="text-sm mt-1">Try adjusting your filters</p>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {auditData && auditData.totalCount > limit && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-700">
              <div className="text-sm text-gray-400">
                Showing {page * limit + 1} to {Math.min((page + 1) * limit, auditData.totalCount)} of{" "}
                {auditData.totalCount} logs
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="p-2 bg-gray-700 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!auditData.hasMore}
                  className="p-2 bg-gray-700 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
      </div>
    </RequireAuth>
  );
}
