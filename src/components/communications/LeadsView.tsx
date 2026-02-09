"use client";

import { useState, useMemo, useCallback } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import Badge from "../ui/Badge";
import { LoadingScreen } from "../ui/LoadingScreen";
import { EmptyState } from "../ui/EmptyState";
import LeadDetailPanel from "./LeadDetailPanel";
import { FormInput, FormSelect } from "../forms";

// ---------------------------------------------------------------------------
// Types (frontend display types - mapped from backend schema in convex/leads.ts)
// ---------------------------------------------------------------------------

export type LeadStatus =
  | "new"
  | "contacted"
  | "viewing"
  | "waiting_list"
  | "placed"
  | "no_availability"
  | "lost";

export type SdaCategory =
  | "high_physical_support"
  | "robust"
  | "fully_accessible"
  | "improved_liveability";

export type UrgencyLevel = "urgent" | "high" | "medium" | "low";

export type ReferrerType = "ot" | "sc" | "other";

export type LeadSource = "phone" | "email" | "referral" | "website";

export interface Lead {
  _id: string;
  _creationTime: number;
  // Referrer info
  referrerType: ReferrerType;
  referrerName: string;
  referrerPhone?: string;
  referrerEmail?: string;
  referrerOrganization?: string;
  referrerEntityId?: string; // OT or SC database ID
  // Participant info
  participantName: string;
  ndisNumber?: string;
  participantAge?: number;
  participantGender?: string;
  // Housing needs
  sdaCategory: SdaCategory;
  preferredAreas: string[];
  preferredState?: string;
  specificRequirements?: string;
  budgetNotes?: string;
  // Tracking
  status: LeadStatus;
  source: LeadSource;
  urgency: UrgencyLevel;
  notes?: string;
  linkedThreadId?: string;
  matchedPropertyId?: string;
  // Activity
  lastActivityAt?: number;
  statusHistory?: Array<{
    status: LeadStatus;
    changedAt: number;
    changedBy?: string;
    note?: string;
  }>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<LeadStatus, { label: string; variant: string; order: number }> = {
  new: { label: "New", variant: "info", order: 0 },
  contacted: { label: "Contacted", variant: "purple", order: 1 },
  viewing: { label: "Viewing", variant: "cyan", order: 2 },
  waiting_list: { label: "Waiting List", variant: "warning", order: 3 },
  placed: { label: "Placed", variant: "success", order: 4 },
  no_availability: { label: "No Availability", variant: "orange", order: 5 },
  lost: { label: "Lost", variant: "neutral", order: 6 },
};

const SDA_CATEGORY_CONFIG: Record<SdaCategory, { label: string; variant: string; short: string }> = {
  high_physical_support: { label: "High Physical Support", variant: "error", short: "HPS" },
  robust: { label: "Robust", variant: "warning", short: "Robust" },
  fully_accessible: { label: "Fully Accessible", variant: "info", short: "FA" },
  improved_liveability: { label: "Improved Liveability", variant: "success", short: "IL" },
};

const URGENCY_CONFIG: Record<UrgencyLevel, { label: string; dotColor: string }> = {
  urgent: { label: "Urgent", dotColor: "bg-red-500" },
  high: { label: "High", dotColor: "bg-orange-500" },
  medium: { label: "Medium", dotColor: "bg-yellow-500" },
  low: { label: "Low", dotColor: "bg-gray-500" },
};

const REFERRER_TYPE_OPTIONS = [
  { value: "", label: "All" },
  { value: "ot", label: "OT" },
  { value: "sc", label: "SC" },
  { value: "other", label: "Other" },
];

const SDA_CATEGORY_OPTIONS = [
  { value: "", label: "All Categories" },
  { value: "high_physical_support", label: "High Physical Support" },
  { value: "robust", label: "Robust" },
  { value: "fully_accessible", label: "Fully Accessible" },
  { value: "improved_liveability", label: "Improved Liveability" },
];

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "viewing", label: "Viewing" },
  { value: "waiting_list", label: "Waiting List" },
  { value: "placed", label: "Placed" },
  { value: "no_availability", label: "No Availability" },
  { value: "lost", label: "Lost" },
];

const URGENCY_OPTIONS = [
  { value: "", label: "All" },
  { value: "urgent", label: "Urgent" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(timestamp).toLocaleDateString();
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SdaCategoryBadge({ category, size = "xs" }: { category: SdaCategory; size?: "xs" | "sm" }) {
  const config = SDA_CATEGORY_CONFIG[category];
  if (!config) return null;
  return (
    <Badge variant={config.variant as any} size={size}>
      {config.short}
    </Badge>
  );
}

function LeadStatusBadge({ status, size = "xs" }: { status: LeadStatus; size?: "xs" | "sm" }) {
  const config = STATUS_CONFIG[status];
  if (!config) return null;
  return (
    <Badge variant={config.variant as any} size={size}>
      {config.label}
    </Badge>
  );
}

function ReferrerTypeBadge({ type }: { type: ReferrerType }) {
  const config: Record<ReferrerType, { variant: string; label: string }> = {
    ot: { variant: "pink", label: "OT" },
    sc: { variant: "info", label: "SC" },
    other: { variant: "neutral", label: "Other" },
  };
  const c = config[type] || config.other;
  return (
    <Badge variant={c.variant as any} size="xs">
      {c.label}
    </Badge>
  );
}

function UrgencyDot({ urgency }: { urgency: UrgencyLevel }) {
  const config = URGENCY_CONFIG[urgency];
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${config.dotColor}`}
      title={config.label}
      aria-label={`Urgency: ${config.label}`}
    />
  );
}

// ---------------------------------------------------------------------------
// Pipeline Header
// ---------------------------------------------------------------------------

function PipelineHeader({
  leads,
  activeStatus,
  onStatusClick,
}: {
  leads: Lead[];
  activeStatus: LeadStatus | null;
  onStatusClick: (status: LeadStatus | null) => void;
}) {
  const counts = useMemo(() => {
    const c: Record<LeadStatus, number> = {
      new: 0,
      contacted: 0,
      viewing: 0,
      waiting_list: 0,
      placed: 0,
      no_availability: 0,
      lost: 0,
    };
    for (const lead of leads) {
      if (c[lead.status] !== undefined) {
        c[lead.status]++;
      }
    }
    return c;
  }, [leads]);

  const statuses = Object.entries(STATUS_CONFIG)
    .sort(([, a], [, b]) => a.order - b.order)
    .map(([key]) => key as LeadStatus);

  return (
    <div className="flex flex-wrap gap-2 mb-4" role="group" aria-label="Lead status filters">
      <button
        onClick={() => onStatusClick(null)}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-full border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
          activeStatus === null
            ? "bg-teal-700 text-white border-teal-600"
            : "bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700"
        }`}
      >
        All
        <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 text-xs font-bold rounded-full bg-white/20">
          {leads.length}
        </span>
      </button>
      {statuses.map((status) => {
        const config = STATUS_CONFIG[status];
        const count = counts[status];
        const isActive = activeStatus === status;

        return (
          <button
            key={status}
            onClick={() => onStatusClick(isActive ? null : status)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-full border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
              isActive
                ? "bg-teal-700 text-white border-teal-600"
                : "bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700"
            }`}
            aria-pressed={isActive}
          >
            {config.label}
            {count > 0 && (
              <span
                className={`inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 text-xs font-bold rounded-full ${
                  isActive ? "bg-white/20 text-white" : "bg-teal-600/20 text-teal-500"
                }`}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Lead Card
// ---------------------------------------------------------------------------

function LeadCard({
  lead,
  isSelected,
  onClick,
}: {
  lead: Lead;
  isSelected: boolean;
  onClick: (lead: Lead) => void;
}) {
  return (
    <button
      onClick={() => onClick(lead)}
      className={`w-full text-left bg-gray-800 rounded-lg border transition-all duration-200 p-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
        isSelected
          ? "border-teal-600 ring-1 ring-teal-600/50"
          : "border-gray-700 hover:border-gray-600 hover:bg-gray-700/80"
      }`}
      aria-label={`Lead: ${lead.participantName}, ${SDA_CATEGORY_CONFIG[lead.sdaCategory]?.label || lead.sdaCategory}, Status: ${STATUS_CONFIG[lead.status]?.label || lead.status}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Row 1: Name + SDA badge */}
          <div className="flex items-center gap-2 mb-1.5">
            <UrgencyDot urgency={lead.urgency} />
            <h3 className="text-sm font-bold text-white truncate">
              {lead.participantName}
            </h3>
            <SdaCategoryBadge category={lead.sdaCategory} />
          </div>

          {/* Row 2: Referrer */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-gray-400">Referred by</span>
            <span className="text-xs text-gray-300 font-medium truncate">
              {lead.referrerName}
            </span>
            <ReferrerTypeBadge type={lead.referrerType} />
          </div>

          {/* Row 3: Preferred areas as tags */}
          {lead.preferredAreas.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {lead.preferredAreas.slice(0, 3).map((area) => (
                <span
                  key={area}
                  className="inline-flex items-center px-2 py-0.5 text-xs bg-gray-700 text-gray-300 rounded-md border border-gray-600"
                >
                  {area}
                </span>
              ))}
              {lead.preferredAreas.length > 3 && (
                <span className="inline-flex items-center px-2 py-0.5 text-xs text-gray-400">
                  +{lead.preferredAreas.length - 3} more
                </span>
              )}
            </div>
          )}

          {/* Row 4: NDIS Number if present */}
          {lead.ndisNumber && (
            <p className="text-xs text-gray-400 mb-1">
              NDIS: {lead.ndisNumber}
            </p>
          )}
        </div>

        {/* Right side: status + time */}
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <LeadStatusBadge status={lead.status} size="xs" />
          <span className="text-xs text-gray-400">
            {formatRelativeTime(lead._creationTime)}
          </span>
        </div>
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Filters Panel (inline, collapsible on mobile)
// ---------------------------------------------------------------------------

interface LeadFilters {
  sdaCategory: string;
  status: string;
  preferredArea: string;
  referrerType: string;
  urgency: string;
  dateFrom: string;
  dateTo: string;
}

const EMPTY_FILTERS: LeadFilters = {
  sdaCategory: "",
  status: "",
  preferredArea: "",
  referrerType: "",
  urgency: "",
  dateFrom: "",
  dateTo: "",
};

function FiltersPanel({
  filters,
  onChange,
  onReset,
  activeCount,
}: {
  filters: LeadFilters;
  onChange: (filters: LeadFilters) => void;
  onReset: () => void;
  activeCount: number;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 mb-4">
      {/* Toggle button (mobile) + always visible (desktop) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full lg:hidden flex items-center justify-between p-3 text-sm font-medium text-gray-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
        aria-expanded={isOpen}
      >
        <span className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Filters
          {activeCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 text-xs font-bold rounded-full bg-teal-600/20 text-teal-500">
              {activeCount}
            </span>
          )}
        </span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Filters content */}
      <div className={`p-3 space-y-3 ${isOpen ? "block" : "hidden lg:block"}`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <FormSelect
            label="SDA Category"
            value={filters.sdaCategory}
            onChange={(e) => onChange({ ...filters, sdaCategory: e.target.value })}
            options={SDA_CATEGORY_OPTIONS}
            placeholder=""
          />
          <FormSelect
            label="Status"
            value={filters.status}
            onChange={(e) => onChange({ ...filters, status: e.target.value })}
            options={STATUS_OPTIONS}
            placeholder=""
          />
          <FormSelect
            label="Referrer Type"
            value={filters.referrerType}
            onChange={(e) => onChange({ ...filters, referrerType: e.target.value })}
            options={REFERRER_TYPE_OPTIONS}
            placeholder=""
          />
          <FormSelect
            label="Urgency"
            value={filters.urgency}
            onChange={(e) => onChange({ ...filters, urgency: e.target.value })}
            options={URGENCY_OPTIONS}
            placeholder=""
          />
          <FormInput
            label="Preferred Area"
            value={filters.preferredArea}
            onChange={(e) => onChange({ ...filters, preferredArea: e.target.value })}
            placeholder="Search suburb..."
          />
          <div className="grid grid-cols-2 gap-2">
            <FormInput
              label="From"
              type="date"
              value={filters.dateFrom}
              onChange={(e) => onChange({ ...filters, dateFrom: e.target.value })}
            />
            <FormInput
              label="To"
              type="date"
              value={filters.dateTo}
              onChange={(e) => onChange({ ...filters, dateTo: e.target.value })}
            />
          </div>
        </div>
        {activeCount > 0 && (
          <div className="flex justify-end">
            <button
              onClick={onReset}
              className="text-sm text-gray-400 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 rounded px-2 py-1"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

interface LeadsViewProps {
  userId: string;
  userRole?: string;
}

export function LeadsView({ userId, userRole }: LeadsViewProps) {
  // Query leads from Convex backend
  const rawLeads = useQuery(
    api.leads.getAll,
    userId ? { userId: userId as Id<"users"> } : "skip"
  );

  // Map backend field names to frontend Lead type
  const leads: Lead[] | undefined = rawLeads === undefined
    ? undefined
    : rawLeads?.map((lead: any) => ({
        _id: lead._id,
        _creationTime: lead._creationTime,
        referrerType: lead.referrerType === "occupational_therapist" ? "ot" as ReferrerType : lead.referrerType === "support_coordinator" ? "sc" as ReferrerType : "other" as ReferrerType,
        referrerName: lead.referrerName,
        referrerPhone: lead.referrerPhone,
        referrerEmail: lead.referrerEmail,
        referrerOrganization: lead.referrerOrganization,
        referrerEntityId: lead.referrerId,
        participantName: lead.participantName,
        ndisNumber: lead.participantNdisNumber,
        participantAge: lead.participantAge,
        participantGender: lead.participantGender,
        sdaCategory: lead.sdaCategoryNeeded as SdaCategory,
        preferredAreas: lead.preferredAreas || [],
        preferredState: lead.preferredState,
        specificRequirements: lead.specificRequirements,
        budgetNotes: lead.budgetNotes,
        status: lead.status as LeadStatus,
        source: lead.source as LeadSource,
        urgency: lead.urgency as UrgencyLevel,
        notes: lead.notes,
        linkedThreadId: lead.threadId,
        matchedPropertyId: lead.matchedPropertyId,
        lastActivityAt: lead.updatedAt,
        statusHistory: lead.statusHistory,
      })) ?? [];

  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [pipelineFilter, setPipelineFilter] = useState<LeadStatus | null>(null);
  const [filters, setFilters] = useState<LeadFilters>(EMPTY_FILTERS);
  const [showNewLeadForm, setShowNewLeadForm] = useState(false);

  // Active filter count
  const activeFilterCount = useMemo(() => {
    return Object.values(filters).filter((v) => v !== "").length;
  }, [filters]);

  // Apply all filters
  const filteredLeads = useMemo(() => {
    if (!leads) return [];

    return leads.filter((lead) => {
      // Pipeline status filter
      if (pipelineFilter && lead.status !== pipelineFilter) return false;

      // Sidebar filters
      if (filters.sdaCategory && lead.sdaCategory !== filters.sdaCategory) return false;
      if (filters.status && lead.status !== filters.status) return false;
      if (filters.referrerType && lead.referrerType !== filters.referrerType) return false;
      if (filters.urgency && lead.urgency !== filters.urgency) return false;

      // Preferred area text search
      if (filters.preferredArea) {
        const search = filters.preferredArea.toLowerCase();
        const hasMatch = lead.preferredAreas.some((area) =>
          area.toLowerCase().includes(search)
        );
        if (!hasMatch) return false;
      }

      // Date range
      if (filters.dateFrom) {
        const fromTime = new Date(filters.dateFrom).getTime();
        if (lead._creationTime < fromTime) return false;
      }
      if (filters.dateTo) {
        const toTime = new Date(filters.dateTo).getTime() + 86400000; // end of day
        if (lead._creationTime > toTime) return false;
      }

      return true;
    });
  }, [leads, pipelineFilter, filters]);

  // Sort: urgent first, then by creation time descending
  const sortedLeads = useMemo(() => {
    return [...filteredLeads].sort((a, b) => {
      const urgencyOrder: Record<UrgencyLevel, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
      const urgDiff = (urgencyOrder[a.urgency] || 3) - (urgencyOrder[b.urgency] || 3);
      if (urgDiff !== 0) return urgDiff;
      return b._creationTime - a._creationTime;
    });
  }, [filteredLeads]);

  const selectedLead = useMemo(() => {
    if (!selectedLeadId || !leads) return null;
    return leads.find((l) => l._id === selectedLeadId) || null;
  }, [selectedLeadId, leads]);

  const handleLeadClick = useCallback((lead: Lead) => {
    setSelectedLeadId((prev) => (prev === lead._id ? null : lead._id));
  }, []);

  const handleResetFilters = useCallback(() => {
    setFilters(EMPTY_FILTERS);
    setPipelineFilter(null);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedLeadId(null);
  }, []);

  // Loading state
  if (leads === undefined) {
    return <LoadingScreen fullScreen={false} message="Loading leads..." />;
  }

  return (
    <div role="tabpanel" id="panel-leads" aria-labelledby="tab-leads">
      {/* Pipeline Header */}
      <PipelineHeader
        leads={leads}
        activeStatus={pipelineFilter}
        onStatusClick={setPipelineFilter}
      />

      {/* Filters */}
      <FiltersPanel
        filters={filters}
        onChange={setFilters}
        onReset={handleResetFilters}
        activeCount={activeFilterCount}
      />

      {/* Content area: list + detail side-by-side on large screens */}
      <div className="flex gap-4">
        {/* Lead list */}
        <div className={`flex-1 min-w-0 ${selectedLead ? "hidden lg:block lg:max-w-[50%]" : ""}`}>
          {sortedLeads.length === 0 ? (
            <EmptyState
              title="No leads yet"
              description="Start tracking housing inquiries from OTs and Support Coordinators."
              isFiltered={activeFilterCount > 0 || pipelineFilter !== null}
              icon={
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              }
            />
          ) : (
            <div className="space-y-2" role="list" aria-label="Leads list">
              {sortedLeads.map((lead) => (
                <div key={lead._id} role="listitem">
                  <LeadCard
                    lead={lead}
                    isSelected={selectedLeadId === lead._id}
                    onClick={handleLeadClick}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {selectedLead && (
          <div className="flex-1 min-w-0 lg:max-w-[50%]">
            <LeadDetailPanel
              lead={selectedLead}
              userId={userId}
              userRole={userRole}
              onClose={handleCloseDetail}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// Re-export types and config for use in other components
export { STATUS_CONFIG, SDA_CATEGORY_CONFIG, URGENCY_CONFIG, SdaCategoryBadge, LeadStatusBadge, ReferrerTypeBadge };

export default LeadsView;
