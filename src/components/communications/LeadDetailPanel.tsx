"use client";

import { useState, useCallback, useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import Badge from "../ui/Badge";
import { Button } from "../forms/Button";
import LeadForm from "./LeadForm";
import type { Lead, LeadStatus } from "./LeadsView";
import {
  STATUS_CONFIG,
  SDA_CATEGORY_CONFIG,
  URGENCY_CONFIG,
  SdaCategoryBadge,
  LeadStatusBadge,
  ReferrerTypeBadge,
} from "./LeadsView";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LeadDetailPanelProps {
  lead: Lead;
  userId: string;
  userRole?: string;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Status transition map - defines valid next statuses from each status
// ---------------------------------------------------------------------------

const STATUS_TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  new: ["contacted", "lost"],
  contacted: ["viewing", "waiting_list", "no_availability", "lost"],
  viewing: ["waiting_list", "placed", "no_availability", "lost"],
  waiting_list: ["viewing", "placed", "no_availability", "lost"],
  placed: [],
  no_availability: ["waiting_list", "contacted"],
  lost: ["new", "contacted"],
};

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

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
  return new Date(timestamp).toLocaleDateString("en-AU");
}

// ---------------------------------------------------------------------------
// Document type labels
// ---------------------------------------------------------------------------

const DOC_TYPE_LABELS: Record<string, string> = {
  ndis_plan: "NDIS Plan",
  sda_quotation: "SDA Quotation",
  accommodation_agreement: "Accommodation Agreement",
  centrepay_consent: "Centrepay Consent",
  report: "OT Assessment / Report",
  other: "Other",
};

// ---------------------------------------------------------------------------
// Detail Section component
// ---------------------------------------------------------------------------

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-teal-500 uppercase tracking-wider">{title}</h3>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2">
      <span className="text-xs text-gray-400 min-w-[6rem] flex-shrink-0">{label}</span>
      <span className="text-sm text-gray-200">{value}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function LeadDetailPanel({ lead, userId, userRole, onClose }: LeadDetailPanelProps) {
  const [showEditForm, setShowEditForm] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Convex mutations
  const updateLeadStatus = useMutation(api.leads.updateStatus);
  const removeLead = useMutation(api.leads.remove);

  // Convex queries
  const linkedDocuments = useQuery(
    api.documents.getByLead,
    userId ? { userId: userId as Id<"users">, leadId: lead._id as Id<"leads"> } : "skip"
  );

  const sdaConfig = SDA_CATEGORY_CONFIG[lead.sdaCategory];
  const urgencyConfig = URGENCY_CONFIG[lead.urgency];
  const nextStatuses = STATUS_TRANSITIONS[lead.status] || [];

  const handleStatusChange = useCallback(
    async (newStatus: LeadStatus) => {
      setIsUpdatingStatus(true);
      try {
        await updateLeadStatus({
          userId: userId as Id<"users">,
          leadId: lead._id as Id<"leads">,
          status: newStatus,
        });
      } catch (error) {
        console.error("Failed to update lead status:", error);
      } finally {
        setIsUpdatingStatus(false);
      }
    },
    [lead._id, userId, updateLeadStatus]
  );

  const handleDelete = useCallback(async () => {
    if (!confirm("Are you sure you want to delete this lead? This action can be undone by an admin.")) return;
    setIsDeleting(true);
    try {
      await removeLead({
        userId: userId as Id<"users">,
        leadId: lead._id as Id<"leads">,
      });
      onClose();
    } catch (error) {
      console.error("Failed to delete lead:", error);
    } finally {
      setIsDeleting(false);
    }
  }, [lead._id, userId, removeLead, onClose]);

  const canDelete = userRole === "admin" || userRole === "property_manager";

  const handleMatchToProperty = useCallback(() => {
    // Property matching will be implemented when the property search/selection UI is built
    console.log("Match to property for lead:", lead._id);
  }, [lead._id]);

  return (
    <>
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="text-base font-bold text-white truncate">{lead.participantName}</h2>
            <SdaCategoryBadge category={lead.sdaCategory} size="xs" />
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg transition-colors flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
            aria-label="Close detail panel"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Status + urgency bar */}
        <div className="px-4 py-3 bg-gray-800/50 border-b border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LeadStatusBadge status={lead.status} size="sm" />
            <div className="flex items-center gap-1.5">
              <span
                className={`inline-block w-2.5 h-2.5 rounded-full ${urgencyConfig.dotColor}`}
                aria-hidden="true"
              />
              <span className="text-sm text-gray-300">{urgencyConfig.label} urgency</span>
            </div>
          </div>
          <span className="text-xs text-gray-400">
            Created {formatRelativeTime(lead._creationTime)}
          </span>
        </div>

        {/* Body */}
        <div className="p-4 space-y-5 max-h-[60vh] overflow-y-auto">
          {/* Status Actions */}
          {nextStatuses.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Update Status
              </h3>
              <div className="flex flex-wrap gap-2">
                {nextStatuses.map((status) => {
                  const config = STATUS_CONFIG[status];
                  return (
                    <button
                      key={status}
                      onClick={() => handleStatusChange(status)}
                      disabled={isUpdatingStatus}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg border border-gray-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 disabled:opacity-50"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                      {config.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Placed status - special highlight */}
          {lead.status === "placed" && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium text-green-400">
                  This participant has been placed in housing.
                </span>
              </div>
            </div>
          )}

          {/* Referrer Details */}
          <DetailSection title="Referrer">
            <DetailRow label="Name" value={lead.referrerName} />
            <DetailRow label="Type" value={lead.referrerType === "ot" ? "Occupational Therapist" : lead.referrerType === "sc" ? "Support Coordinator" : "Other"} />
            <DetailRow label="Phone" value={lead.referrerPhone} />
            <DetailRow label="Email" value={lead.referrerEmail} />
            <DetailRow label="Organization" value={lead.referrerOrganization} />
          </DetailSection>

          {/* Participant Details */}
          <DetailSection title="Participant">
            <DetailRow label="Name" value={lead.participantName} />
            <DetailRow label="NDIS Number" value={lead.ndisNumber} />
            <DetailRow label="Age" value={lead.participantAge ? String(lead.participantAge) : undefined} />
            <DetailRow label="Gender" value={lead.participantGender} />
          </DetailSection>

          {/* Housing Needs */}
          <DetailSection title="Housing Needs">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-gray-400 min-w-[6rem]">SDA Category</span>
              <Badge variant={sdaConfig?.variant as any || "neutral"} size="sm">
                {sdaConfig?.label || lead.sdaCategory}
              </Badge>
            </div>
            {lead.preferredAreas.length > 0 && (
              <div className="flex items-start gap-2">
                <span className="text-xs text-gray-400 min-w-[6rem] flex-shrink-0 pt-0.5">Preferred Areas</span>
                <div className="flex flex-wrap gap-1">
                  {lead.preferredAreas.map((area) => (
                    <span
                      key={area}
                      className="inline-flex items-center px-2 py-0.5 text-xs bg-gray-700 text-gray-300 rounded-md border border-gray-600"
                    >
                      {area}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <DetailRow label="State" value={lead.preferredState} />
            <DetailRow label="Requirements" value={lead.specificRequirements} />
            <DetailRow label="Budget Notes" value={lead.budgetNotes} />
          </DetailSection>

          {/* Tracking */}
          <DetailSection title="Tracking">
            <DetailRow
              label="Source"
              value={
                lead.source === "phone"
                  ? "Phone Call"
                  : lead.source === "email"
                    ? "Email"
                    : lead.source === "referral"
                      ? "Referral"
                      : lead.source === "website"
                        ? "Website"
                        : lead.source
              }
            />
            <DetailRow label="Notes" value={lead.notes} />
          </DetailSection>

          {/* Documents */}
          <DetailSection title={`Documents${linkedDocuments && linkedDocuments.length > 0 ? ` (${linkedDocuments.length})` : ""}`}>
            {linkedDocuments === undefined ? (
              <p className="text-xs text-gray-400">Loading documents...</p>
            ) : linkedDocuments.length === 0 ? (
              <p className="text-xs text-gray-400">No documents attached</p>
            ) : (
              <div className="space-y-1">
                {linkedDocuments.map((doc) => (
                  <a
                    key={doc._id}
                    href={doc.downloadUrl ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-700/50 transition-colors group"
                  >
                    {/* File icon */}
                    <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {/* File info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-200 truncate group-hover:text-teal-400 transition-colors">{doc.fileName}</p>
                      <p className="text-xs text-gray-400">{(doc.fileSize / 1024 / 1024).toFixed(1)} MB</p>
                    </div>
                    {/* Type badge */}
                    <span className="text-xs px-2 py-0.5 bg-gray-700 text-gray-300 rounded-md border border-gray-600">
                      {DOC_TYPE_LABELS[doc.documentType] || doc.documentType}
                    </span>
                  </a>
                ))}
              </div>
            )}
          </DetailSection>

          {/* Activity Timeline */}
          {lead.statusHistory && lead.statusHistory.length > 0 && (
            <DetailSection title="Activity Timeline">
              <div className="space-y-2">
                {lead.statusHistory.map((entry, idx) => {
                  const config = STATUS_CONFIG[entry.status];
                  return (
                    <div key={idx} className="flex items-start gap-3 text-sm">
                      <div className="flex-shrink-0 mt-1">
                        <div className="w-2 h-2 rounded-full bg-gray-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant={config?.variant as any || "neutral"} size="xs">
                            {config?.label || entry.status}
                          </Badge>
                          <span className="text-xs text-gray-400">
                            {formatDate(entry.changedAt)}
                          </span>
                        </div>
                        {entry.note && (
                          <p className="text-xs text-gray-400 mt-0.5">{entry.note}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </DetailSection>
          )}

          {/* Linked Communication Thread */}
          {lead.linkedThreadId && (
            <DetailSection title="Linked Communication Thread">
              <div className="bg-gray-700/50 rounded-lg p-3 text-sm text-gray-400">
                Thread ID: {lead.linkedThreadId}
              </div>
            </DetailSection>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-4 py-3 border-t border-gray-700 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMatchToProperty}
              leftIcon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              }
            >
              Match to Property
            </Button>
            {canDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                leftIcon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                }
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </Button>
            )}
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowEditForm(true)}
            leftIcon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            }
          >
            Edit
          </Button>
        </div>
      </div>

      {/* Edit Form Modal */}
      <LeadForm
        userId={userId}
        isOpen={showEditForm}
        onClose={() => setShowEditForm(false)}
        editLead={lead}
      />
    </>
  );
}

export default LeadDetailPanel;
