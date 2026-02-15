"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import Header from "../../../components/Header";
import { RequireAuth } from "../../../components/RequireAuth";
import { useAuth } from "../../../hooks/useAuth";
import { StatCard } from "../../../components/ui/StatCard";
import {
  Download,
  Mail,
  Search,
  Users,
  Building2,
  Calendar,
  Phone,
  MessageSquare,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const SOURCE_OPTIONS = [
  { value: "all", label: "All Sources" },
  { value: "audit_checklist", label: "Audit Checklist" },
  { value: "contact_form", label: "Contact Form" },
  { value: "landing_page", label: "Landing Page" },
];

const SOURCE_BADGE_STYLES: Record<string, string> = {
  audit_checklist: "bg-teal-900/40 text-teal-400 border border-teal-700",
  contact_form: "bg-purple-900/40 text-purple-400 border border-purple-700",
  landing_page: "bg-blue-900/40 text-blue-400 border border-blue-700",
};

const SOURCE_LABELS: Record<string, string> = {
  audit_checklist: "Audit Checklist",
  contact_form: "Contact Form",
  landing_page: "Landing Page",
};

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const day = date.getDate();
  const month = date.toLocaleString("en-AU", { month: "short" });
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

function LeadsContent() {
  const { user } = useAuth();
  const leads = useQuery(
    api.marketingLeads.getAll,
    user ? { userId: user.id as Id<"users"> } : "skip"
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const now = Date.now();
  const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;

  const stats = useMemo(() => {
    if (!leads) return { total: 0, checklist: 0, contact: 0, thisWeek: 0 };
    return {
      total: leads.length,
      checklist: leads.filter((l) => l.source === "audit_checklist").length,
      contact: leads.filter((l) => l.source === "contact_form").length,
      thisWeek: leads.filter((l) => l.downloadedAt >= oneWeekAgo).length,
    };
  }, [leads, oneWeekAgo]);

  const filteredLeads = useMemo(() => {
    if (!leads) return [];
    return leads.filter((lead) => {
      if (sourceFilter !== "all" && lead.source !== sourceFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = lead.name.toLowerCase().includes(q);
        const matchesEmail = lead.email.toLowerCase().includes(q);
        const matchesOrg = lead.organization?.toLowerCase().includes(q);
        if (!matchesName && !matchesEmail && !matchesOrg) return false;
      }
      return true;
    });
  }, [leads, searchQuery, sourceFilter]);

  const isLoading = leads === undefined;

  return (
    <div className="min-h-screen bg-gray-900">
      <Header currentPage="admin" />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Marketing Leads</h1>
          <p className="text-gray-400 mt-1">
            Track leads captured from the website, audit checklist downloads, and contact
            inquiries.
          </p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Total Leads"
            value={isLoading ? "..." : stats.total}
            color="blue"
            icon={<Users className="w-5 h-5" />}
          />
          <StatCard
            title="Checklist Downloads"
            value={isLoading ? "..." : stats.checklist}
            color="green"
            icon={<Download className="w-5 h-5" />}
          />
          <StatCard
            title="Contact Inquiries"
            value={isLoading ? "..." : stats.contact}
            color="purple"
            icon={<Mail className="w-5 h-5" />}
          />
          <StatCard
            title="This Week"
            value={isLoading ? "..." : stats.thisWeek}
            color="yellow"
            icon={<Calendar className="w-5 h-5" />}
          />
        </div>

        {/* Filter / Search Bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, or organisation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent"
              aria-label="Search leads"
            />
          </div>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent"
            aria-label="Filter by source"
          >
            {SOURCE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="bg-gray-800 rounded-lg border border-gray-700 p-4 animate-pulse"
              >
                <div className="h-4 bg-gray-700 rounded w-1/3 mb-2" />
                <div className="h-3 bg-gray-700 rounded w-1/2" />
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredLeads.length === 0 && (
          <div className="text-center py-16 bg-gray-800 rounded-lg border border-gray-700">
            <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-white mb-2">
              {leads && leads.length > 0 ? "No matching leads" : "No leads yet"}
            </h2>
            <p className="text-gray-400 max-w-md mx-auto">
              {leads && leads.length > 0
                ? "Try adjusting your search or filter to find leads."
                : "Leads will appear here when visitors download the audit checklist, submit the contact form, or sign up from the landing page."}
            </p>
          </div>
        )}

        {/* Table View (md+) */}
        {!isLoading && filteredLeads.length > 0 && (
          <>
            <div className="hidden md:block bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
              <table className="w-full" role="table" aria-label="Marketing leads">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">
                      Name
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">
                      Email
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">
                      Organisation
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-400 text-center">
                      Properties
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">
                      Source
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">
                      Date
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-400 w-10">
                      <span className="sr-only">Expand</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.map((lead) => {
                    const hasDetails = !!(lead.message || lead.phone || lead.inquiryType || lead.role);
                    const isExpanded = expandedRow === lead._id;

                    return (
                      <tr key={lead._id} className="group">
                        <td colSpan={7} className="p-0">
                          <div>
                            {/* Main row */}
                            <div
                              className={`flex items-center border-b border-gray-700/50 hover:bg-gray-700/40 transition-colors ${
                                hasDetails ? "cursor-pointer" : ""
                              }`}
                              onClick={() => {
                                if (hasDetails) {
                                  setExpandedRow(isExpanded ? null : lead._id);
                                }
                              }}
                              role={hasDetails ? "button" : undefined}
                              tabIndex={hasDetails ? 0 : undefined}
                              aria-expanded={hasDetails ? isExpanded : undefined}
                              onKeyDown={(e) => {
                                if (hasDetails && (e.key === "Enter" || e.key === " ")) {
                                  e.preventDefault();
                                  setExpandedRow(isExpanded ? null : lead._id);
                                }
                              }}
                            >
                              <div className="flex-1 min-w-0 px-4 py-3">
                                <span className="text-white text-sm font-medium">
                                  {lead.name}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0 px-4 py-3">
                                <a
                                  href={`mailto:${lead.email}`}
                                  className="text-teal-400 hover:text-teal-300 text-sm inline-flex items-center gap-1"
                                  onClick={(e) => e.stopPropagation()}
                                  aria-label={`Email ${lead.name}`}
                                >
                                  {lead.email}
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </div>
                              <div className="flex-1 min-w-0 px-4 py-3">
                                <span className="text-gray-300 text-sm">
                                  {lead.organization || (
                                    <span className="text-gray-600">--</span>
                                  )}
                                </span>
                              </div>
                              <div className="w-24 px-4 py-3 text-center">
                                <span className="text-gray-300 text-sm">
                                  {lead.numberOfProperties != null ? (
                                    <span className="inline-flex items-center gap-1">
                                      <Building2 className="w-3.5 h-3.5 text-gray-400" />
                                      {lead.numberOfProperties}
                                    </span>
                                  ) : (
                                    <span className="text-gray-600">--</span>
                                  )}
                                </span>
                              </div>
                              <div className="w-40 px-4 py-3">
                                <span
                                  className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                                    SOURCE_BADGE_STYLES[lead.source] ||
                                    "bg-gray-700 text-gray-300 border border-gray-600"
                                  }`}
                                >
                                  {SOURCE_LABELS[lead.source] || lead.source}
                                </span>
                              </div>
                              <div className="w-32 px-4 py-3">
                                <span className="text-gray-300 text-sm">
                                  {formatDate(lead.downloadedAt)}
                                </span>
                              </div>
                              <div className="w-10 px-4 py-3">
                                {hasDetails && (
                                  <span className="text-gray-400">
                                    {isExpanded ? (
                                      <ChevronUp className="w-4 h-4" />
                                    ) : (
                                      <ChevronDown className="w-4 h-4" />
                                    )}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Expanded details */}
                            {isExpanded && hasDetails && (
                              <div className="px-4 py-3 bg-gray-750/50 bg-gray-800/80 border-b border-gray-700/50">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                                  {lead.phone && (
                                    <div className="flex items-center gap-2">
                                      <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                      <span className="text-gray-400">Phone:</span>
                                      <a
                                        href={`tel:${lead.phone}`}
                                        className="text-teal-400 hover:text-teal-300"
                                      >
                                        {lead.phone}
                                      </a>
                                    </div>
                                  )}
                                  {lead.role && (
                                    <div className="flex items-center gap-2">
                                      <Users className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                      <span className="text-gray-400">Role:</span>
                                      <span className="text-gray-300">{lead.role}</span>
                                    </div>
                                  )}
                                  {lead.inquiryType && (
                                    <div className="flex items-center gap-2">
                                      <MessageSquare className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                      <span className="text-gray-400">Inquiry Type:</span>
                                      <span className="text-gray-300 capitalize">
                                        {lead.inquiryType.replace(/_/g, " ")}
                                      </span>
                                    </div>
                                  )}
                                  {lead.message && (
                                    <div className="col-span-full">
                                      <div className="flex items-start gap-2">
                                        <MessageSquare className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                                        <div>
                                          <span className="text-gray-400 block mb-1">
                                            Message:
                                          </span>
                                          <p className="text-gray-300 whitespace-pre-wrap bg-gray-900/50 rounded p-3 border border-gray-700">
                                            {lead.message}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
              {filteredLeads.map((lead) => {
                const hasDetails = !!(lead.message || lead.phone || lead.inquiryType || lead.role);
                const isExpanded = expandedRow === lead._id;

                return (
                  <div
                    key={lead._id}
                    className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden"
                  >
                    <div
                      className={`p-4 ${hasDetails ? "cursor-pointer" : ""}`}
                      onClick={() => {
                        if (hasDetails) {
                          setExpandedRow(isExpanded ? null : lead._id);
                        }
                      }}
                      role={hasDetails ? "button" : undefined}
                      tabIndex={hasDetails ? 0 : undefined}
                      aria-expanded={hasDetails ? isExpanded : undefined}
                      onKeyDown={(e) => {
                        if (hasDetails && (e.key === "Enter" || e.key === " ")) {
                          e.preventDefault();
                          setExpandedRow(isExpanded ? null : lead._id);
                        }
                      }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="min-w-0 flex-1">
                          <h3 className="text-white font-medium truncate">{lead.name}</h3>
                          <a
                            href={`mailto:${lead.email}`}
                            className="text-teal-400 hover:text-teal-300 text-sm inline-flex items-center gap-1 mt-0.5"
                            onClick={(e) => e.stopPropagation()}
                            aria-label={`Email ${lead.name}`}
                          >
                            {lead.email}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                        <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                              SOURCE_BADGE_STYLES[lead.source] ||
                              "bg-gray-700 text-gray-300 border border-gray-600"
                            }`}
                          >
                            {SOURCE_LABELS[lead.source] || lead.source}
                          </span>
                          {hasDetails && (
                            <span className="text-gray-400">
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-400 mt-2">
                        {lead.organization && (
                          <span className="inline-flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5" />
                            {lead.organization}
                          </span>
                        )}
                        {lead.numberOfProperties != null && (
                          <span className="inline-flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5" />
                            {lead.numberOfProperties} properties
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDate(lead.downloadedAt)}
                        </span>
                      </div>
                    </div>

                    {/* Expanded details (mobile) */}
                    {isExpanded && hasDetails && (
                      <div className="px-4 pb-4 pt-2 border-t border-gray-700 space-y-3">
                        {lead.phone && (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <span className="text-gray-400">Phone:</span>
                            <a
                              href={`tel:${lead.phone}`}
                              className="text-teal-400 hover:text-teal-300"
                            >
                              {lead.phone}
                            </a>
                          </div>
                        )}
                        {lead.role && (
                          <div className="flex items-center gap-2 text-sm">
                            <Users className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <span className="text-gray-400">Role:</span>
                            <span className="text-gray-300">{lead.role}</span>
                          </div>
                        )}
                        {lead.inquiryType && (
                          <div className="flex items-center gap-2 text-sm">
                            <MessageSquare className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <span className="text-gray-400">Inquiry:</span>
                            <span className="text-gray-300 capitalize">
                              {lead.inquiryType.replace(/_/g, " ")}
                            </span>
                          </div>
                        )}
                        {lead.message && (
                          <div className="text-sm">
                            <span className="text-gray-400 block mb-1">Message:</span>
                            <p className="text-gray-300 whitespace-pre-wrap bg-gray-900/50 rounded p-3 border border-gray-700">
                              {lead.message}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Results count */}
            <div className="mt-4 text-sm text-gray-400">
              Showing {filteredLeads.length} of {leads?.length ?? 0} leads
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default function AdminLeadsPage() {
  return (
    <RequireAuth allowedRoles={["admin"]}>
      <LeadsContent />
    </RequireAuth>
  );
}