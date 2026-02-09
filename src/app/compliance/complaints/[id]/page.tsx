"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import Header from "../../../../components/Header";
import RequireAuth from "../../../../components/RequireAuth";
import { LoadingScreen } from "../../../../components/ui/LoadingScreen";
import Badge from "../../../../components/ui/Badge";
import SOP001Overlay from "../../../../components/compliance/SOP001Overlay";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Constants & helpers
// ---------------------------------------------------------------------------

const STATUS_LABELS: Record<string, string> = {
  received: "Received",
  acknowledged: "Acknowledged",
  under_investigation: "Under Investigation",
  resolved: "Resolved",
  closed: "Closed",
  escalated: "Escalated",
};

const STATUS_BADGE_VARIANT: Record<string, "warning" | "info" | "purple" | "success" | "neutral" | "error"> = {
  received: "warning",
  acknowledged: "info",
  under_investigation: "purple",
  resolved: "success",
  closed: "neutral",
  escalated: "error",
};

const SEVERITY_BADGE_VARIANT: Record<string, "success" | "warning" | "error" | "error"> = {
  low: "success",
  medium: "warning",
  high: "error",
  critical: "error",
};

const CATEGORY_LABELS: Record<string, string> = {
  service_delivery: "Service Delivery",
  staff_conduct: "Staff Conduct",
  property_condition: "Property Condition",
  communication: "Communication",
  billing: "Billing",
  privacy: "Privacy",
  safety: "Safety",
  other: "Other",
};

const COMPLAINANT_TYPE_LABELS: Record<string, string> = {
  participant: "Participant",
  family_carer: "Family / Carer",
  support_coordinator: "Support Coordinator",
  sil_provider: "SIL Provider",
  staff: "Staff",
  anonymous: "Anonymous",
  other: "Other",
};

const SOURCE_LABELS: Record<string, string> = {
  website: "Website",
  phone: "Phone",
  email: "Email",
  in_person: "In Person",
  internal: "Internal",
};

const OUTCOME_LABELS: Record<string, string> = {
  upheld: "Upheld",
  partially_upheld: "Partially Upheld",
  not_upheld: "Not Upheld",
  withdrawn: "Withdrawn",
};

const ACK_METHOD_LABELS: Record<string, string> = {
  email: "Email",
  phone: "Phone",
  letter: "Letter",
  in_person: "In Person",
};

// Stage definitions for the 5-stage progress bar
const STAGES = [
  { key: "acknowledge", label: "Acknowledge" },
  { key: "triage", label: "Triage" },
  { key: "investigate", label: "Investigate" },
  { key: "resolve", label: "Resolve" },
  { key: "close", label: "Close" },
] as const;

function statusToStageIndex(status: string): number {
  switch (status) {
    case "received": return 0;
    case "acknowledged": return 1;
    case "under_investigation": return 2;
    case "resolved": return 3;
    case "closed": return 4;
    case "escalated": return -1; // special
    default: return 0;
  }
}

function formatDate(d: string | undefined | null): string {
  if (!d) return "-";
  try {
    return new Date(d).toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return d;
  }
}

function formatDateTime(ts: number | string | undefined | null): string {
  if (!ts) return "-";
  try {
    const date = typeof ts === "number" ? new Date(ts) : new Date(ts);
    return date.toLocaleString("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(ts);
  }
}

function getResolutionDueColor(complaint: { resolutionDueDate?: string; status: string }) {
  if (complaint.status === "resolved" || complaint.status === "closed") return "text-gray-400";
  if (!complaint.resolutionDueDate) return "text-gray-400";
  const now = new Date();
  const due = new Date(complaint.resolutionDueDate);
  const daysRemaining = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (daysRemaining < 0) return "text-red-400 font-semibold";
  if (daysRemaining <= 3) return "text-red-400";
  if (daysRemaining <= 7) return "text-yellow-400";
  return "text-green-400";
}

function getResolutionDueLabel(complaint: { resolutionDueDate?: string; status: string; resolutionDate?: string }) {
  if (complaint.status === "resolved" || complaint.status === "closed") {
    return complaint.resolutionDate ? formatDate(complaint.resolutionDate) : "Resolved";
  }
  if (!complaint.resolutionDueDate) return "N/A";
  const now = new Date();
  const due = new Date(complaint.resolutionDueDate);
  const daysRemaining = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (daysRemaining < 0) return `${Math.abs(daysRemaining)}d overdue`;
  if (daysRemaining === 0) return "Due today";
  return `${daysRemaining}d remaining`;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Simple detail field for read-only display */
function DetailField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-sm text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm text-white">{value || <span className="text-gray-400">-</span>}</p>
    </div>
  );
}

/** Horizontal 5-stage progress bar */
function StageProgressBar({ status }: { status: string }) {
  const currentStage = statusToStageIndex(status);
  const isEscalated = status === "escalated";

  return (
    <div className="flex items-center w-full" role="progressbar" aria-label="Complaint progress" aria-valuenow={currentStage + 1} aria-valuemin={1} aria-valuemax={5}>
      {STAGES.map((stage, idx) => {
        const isCompleted = !isEscalated && currentStage > idx;
        const isCurrent = !isEscalated && currentStage === idx;
        const isFuture = isEscalated || currentStage < idx;

        return (
          <div key={stage.key} className="flex items-center flex-1 last:flex-none">
            {/* Circle */}
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                  isEscalated
                    ? "border-red-500 bg-red-900/50 text-red-400"
                    : isCompleted
                      ? "border-green-500 bg-green-600 text-white"
                      : isCurrent
                        ? "border-teal-600 bg-teal-700 text-white animate-pulse"
                        : "border-gray-600 bg-gray-700 text-gray-400"
                }`}
                aria-label={`${stage.label}: ${isCompleted ? "completed" : isCurrent ? "current" : "pending"}`}
              >
                {isCompleted ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  idx + 1
                )}
              </div>
              <span className={`mt-1 text-xs whitespace-nowrap ${
                isCompleted ? "text-green-400" : isCurrent ? "text-teal-500 font-semibold" : "text-gray-400"
              }`}>
                {stage.label}
              </span>
            </div>
            {/* Connecting line */}
            {idx < STAGES.length - 1 && (
              <div
                className={`h-0.5 flex-1 mx-1 ${
                  isEscalated
                    ? "bg-red-800"
                    : isCompleted
                      ? "bg-green-500"
                      : "bg-gray-600"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Vertical 5-stage progress bar for sidebar */
function VerticalStageProgressBar({ status }: { status: string }) {
  const currentStage = statusToStageIndex(status);
  const isEscalated = status === "escalated";

  return (
    <div className="space-y-0" role="list" aria-label="Complaint stages">
      {STAGES.map((stage, idx) => {
        const isCompleted = !isEscalated && currentStage > idx;
        const isCurrent = !isEscalated && currentStage === idx;

        return (
          <div key={stage.key} className="flex items-start" role="listitem">
            {/* Vertical line + circle */}
            <div className="flex flex-col items-center mr-3">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 shrink-0 ${
                  isEscalated
                    ? "border-red-500 bg-red-900/50 text-red-400"
                    : isCompleted
                      ? "border-green-500 bg-green-600 text-white"
                      : isCurrent
                        ? "border-teal-600 bg-teal-700 text-white"
                        : "border-gray-600 bg-gray-700 text-gray-400"
                }`}
              >
                {isCompleted ? (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  idx + 1
                )}
              </div>
              {idx < STAGES.length - 1 && (
                <div className={`w-0.5 h-6 ${isCompleted ? "bg-green-500" : "bg-gray-600"}`} />
              )}
            </div>
            {/* Label */}
            <span className={`text-sm pt-0.5 ${
              isCompleted ? "text-green-400" : isCurrent ? "text-teal-500 font-semibold" : "text-gray-400"
            }`}>
              {stage.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// Stage guidance text by status
const STAGE_GUIDANCE: Record<string, string> = {
  received: "Contact the complainant via their preferred method within 24 hours to acknowledge receipt of their complaint.",
  acknowledged: "Assign severity, category, and an investigator to the complaint. Determine if this is a systemic or individual issue.",
  under_investigation: "Document findings, interview relevant parties, gather evidence. Keep the complainant informed of progress.",
  resolved: "Record the outcome, corrective actions taken, and confirm the resolution with the complainant.",
  closed: "Confirm complainant satisfaction and log any systemic learnings for continuous improvement.",
  escalated: "This complaint has been escalated to the NDIS Quality and Safeguards Commission. Follow their direction and provide all requested documentation.",
};

// Compliance checklist steps for sidebar
const CHECKLIST_STEPS = [
  { key: "triage" as const, label: "Triage", description: "Check for Reportable Incidents (abuse/neglect)" },
  { key: "acknowledge" as const, label: "Acknowledge", description: "Contact complainant within 24 hours" },
  { key: "investigate" as const, label: "Investigate", description: "Gather evidence from logs & communications" },
  { key: "resolve" as const, label: "Resolve", description: "Provide written outcome within 21 days" },
  { key: "close" as const, label: "Close & Improve", description: "Log resolution and review for trends" },
];

// Audit action colors for chain of custody
const AUDIT_ACTION_COLORS: Record<string, string> = {
  create: "bg-green-500",
  view: "bg-teal-600",
  update: "bg-yellow-500",
  acknowledge: "bg-green-500",
  delete: "bg-red-500",
};

// ---------------------------------------------------------------------------
// Main page content
// ---------------------------------------------------------------------------

function ComplaintDetailContent() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as Id<"complaints">;

  // Auth
  const [user, setUser] = useState<{ id: string; role: string; name?: string } | null>(null);
  useEffect(() => {
    const storedUser = localStorage.getItem("sda_user");
    if (!storedUser) {
      router.push("/login");
      return;
    }
    const parsed = JSON.parse(storedUser);
    setUser({
      id: parsed._id || parsed.id,
      role: parsed.role || "",
      name: parsed.firstName ? `${parsed.firstName} ${parsed.lastName}` : undefined,
    });
  }, [router]);

  // Queries
  const complaint = useQuery(api.complaints.getById, user ? { complaintId: id, userId: user.id as Id<"users"> } : "skip");
  const chainOfCustody = useQuery(api.complaints.getChainOfCustody, user ? { complaintId: id, userId: user.id as Id<"users"> } : "skip");
  const users = useQuery(
    api.auth.getAllUsers,
    user ? { userId: user.id as Id<"users"> } : "skip"
  );

  // Mutations
  const acknowledgeMutation = useMutation(api.complaints.acknowledge);
  const updateMutation = useMutation(api.complaints.update);
  const resolveMutation = useMutation(api.complaints.resolve);
  const closeMutation = useMutation(api.complaints.close);
  const escalateMutation = useMutation(api.complaints.escalate);
  const logViewMutation = useMutation(api.complaints.logView);
  const logPdfMutation = useMutation(api.complaints.logProcedurePdfOpened);
  const updateChecklistStepMutation = useMutation(api.complaints.updateChecklistStep);

  // Log view on page load
  const [viewLogged, setViewLogged] = useState(false);
  useEffect(() => {
    if (user && complaint && !viewLogged) {
      logViewMutation({ userId: user.id as Id<"users">, complaintId: id });
      setViewLogged(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, complaint?._id]);

  // 24-hour countdown
  const [countdown, setCountdown] = useState("");
  const [isOverdue, setIsOverdue] = useState(false);
  useEffect(() => {
    if (!complaint?.acknowledgmentDueDate || complaint.acknowledgedDate) return;

    const calculate = () => {
      const now = new Date();
      const due = new Date(complaint.acknowledgmentDueDate!);
      const diff = due.getTime() - now.getTime();
      if (diff > 0) {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        setCountdown(`${hours}h ${minutes}m remaining`);
        setIsOverdue(false);
      } else {
        const overdue = Math.abs(diff);
        const hours = Math.floor(overdue / (1000 * 60 * 60));
        const minutes = Math.floor((overdue % (1000 * 60 * 60)) / (1000 * 60));
        setCountdown(`${hours}h ${minutes}m overdue`);
        setIsOverdue(true);
      }
    };

    calculate(); // Run immediately
    const timer = setInterval(calculate, 60000);
    return () => clearInterval(timer);
  }, [complaint?.acknowledgmentDueDate, complaint?.acknowledgedDate]);

  // ---- Modal / form states ----
  const [showAckModal, setShowAckModal] = useState(false);
  const [ackDate, setAckDate] = useState(new Date().toISOString().split("T")[0]);
  const [ackMethod, setAckMethod] = useState<"email" | "phone" | "letter" | "in_person">("email");
  const [ackLoading, setAckLoading] = useState(false);

  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolveDate, setResolveDate] = useState(new Date().toISOString().split("T")[0]);
  const [resolveDescription, setResolveDescription] = useState("");
  const [resolveOutcome, setResolveOutcome] = useState<"upheld" | "partially_upheld" | "not_upheld" | "withdrawn">("upheld");
  const [resolveSatisfied, setResolveSatisfied] = useState(false);
  const [resolveSystemic, setResolveSystemic] = useState(false);
  const [resolveCorrectiveActions, setResolveCorrectiveActions] = useState("");
  const [resolveLoading, setResolveLoading] = useState(false);

  const [showEscalateModal, setShowEscalateModal] = useState(false);
  const [escalateDate, setEscalateDate] = useState(new Date().toISOString().split("T")[0]);
  const [escalateReason, setEscalateReason] = useState("");
  const [escalateLoading, setEscalateLoading] = useState(false);

  const [investigationNotes, setInvestigationNotes] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [notesSaving, setNotesSaving] = useState(false);
  const [notesInitialized, setNotesInitialized] = useState(false);

  const [advocacyOffered, setAdvocacyOffered] = useState(false);
  const [advocacyAccepted, setAdvocacyAccepted] = useState(false);
  const [advocacyProvider, setAdvocacyProvider] = useState("");
  const [advocacySaving, setAdvocacySaving] = useState(false);
  const [advocacyInitialized, setAdvocacyInitialized] = useState(false);

  const [closeLoading, setCloseLoading] = useState(false);
  const [error, setError] = useState("");
  const [showSopOverlay, setShowSopOverlay] = useState(false);
  const [checklistSaving, setChecklistSaving] = useState<string | null>(null);

  // Initialize editable fields from complaint
  useEffect(() => {
    if (complaint && !notesInitialized) {
      setInvestigationNotes(complaint.investigationNotes || "");
      setAssignedTo(complaint.assignedTo || "");
      setNotesInitialized(true);
    }
  }, [complaint, notesInitialized]);

  useEffect(() => {
    if (complaint && !advocacyInitialized) {
      setAdvocacyOffered(complaint.advocacyOffered || false);
      setAdvocacyAccepted(complaint.advocacyAccepted || false);
      setAdvocacyProvider(complaint.advocacyProvider || "");
      setAdvocacyInitialized(true);
    }
  }, [complaint, advocacyInitialized]);

  // ---- Handlers ----

  const handleAcknowledge = useCallback(async () => {
    if (!user) return;
    setAckLoading(true);
    setError("");
    try {
      await acknowledgeMutation({
        userId: user.id as Id<"users">,
        complaintId: id,
        acknowledgedDate: ackDate,
        acknowledgmentMethod: ackMethod,
      });
      setShowAckModal(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to acknowledge complaint");
    } finally {
      setAckLoading(false);
    }
  }, [user, acknowledgeMutation, id, ackDate, ackMethod]);

  const handleBeginInvestigation = useCallback(async () => {
    if (!user) return;
    setError("");
    try {
      await updateMutation({
        userId: user.id as Id<"users">,
        complaintId: id,
        status: "under_investigation",
        assignedTo: assignedTo ? (assignedTo as Id<"users">) : undefined,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to begin investigation");
    }
  }, [user, updateMutation, id, assignedTo]);

  const handleSaveNotes = useCallback(async () => {
    if (!user) return;
    setNotesSaving(true);
    setError("");
    try {
      await updateMutation({
        userId: user.id as Id<"users">,
        complaintId: id,
        investigationNotes,
        assignedTo: assignedTo ? (assignedTo as Id<"users">) : undefined,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save notes");
    } finally {
      setNotesSaving(false);
    }
  }, [user, updateMutation, id, investigationNotes, assignedTo]);

  const handleResolve = useCallback(async () => {
    if (!user || !resolveDescription.trim()) return;
    setResolveLoading(true);
    setError("");
    try {
      await resolveMutation({
        userId: user.id as Id<"users">,
        complaintId: id,
        resolutionDate: resolveDate,
        resolutionDescription: resolveDescription,
        resolutionOutcome: resolveOutcome,
        complainantSatisfied: resolveSatisfied,
        systemicIssueIdentified: resolveSystemic,
        correctiveActionsTaken: resolveCorrectiveActions || undefined,
      });
      setShowResolveModal(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to resolve complaint");
    } finally {
      setResolveLoading(false);
    }
  }, [user, resolveMutation, id, resolveDate, resolveDescription, resolveOutcome, resolveSatisfied, resolveSystemic, resolveCorrectiveActions]);

  const handleClose = useCallback(async () => {
    if (!user) return;
    setCloseLoading(true);
    setError("");
    try {
      await closeMutation({
        userId: user.id as Id<"users">,
        complaintId: id,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to close complaint");
    } finally {
      setCloseLoading(false);
    }
  }, [user, closeMutation, id]);

  const handleEscalate = useCallback(async () => {
    if (!user || !escalateReason.trim()) return;
    setEscalateLoading(true);
    setError("");
    try {
      await escalateMutation({
        userId: user.id as Id<"users">,
        complaintId: id,
        escalationDate: escalateDate,
        escalationReason: escalateReason,
      });
      setShowEscalateModal(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to escalate complaint");
    } finally {
      setEscalateLoading(false);
    }
  }, [user, escalateMutation, id, escalateDate, escalateReason]);

  const handleSaveAdvocacy = useCallback(async () => {
    if (!user) return;
    setAdvocacySaving(true);
    setError("");
    try {
      await updateMutation({
        userId: user.id as Id<"users">,
        complaintId: id,
        advocacyOffered,
        advocacyAccepted,
        advocacyProvider: advocacyProvider || undefined,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save advocacy details");
    } finally {
      setAdvocacySaving(false);
    }
  }, [user, updateMutation, id, advocacyOffered, advocacyAccepted, advocacyProvider]);

  const handleOpenProcedurePdf = useCallback(async () => {
    if (!user) return;
    try {
      await logPdfMutation({
        userId: user.id as Id<"users">,
        complaintId: id,
      });
    } catch {
      // Non-blocking - log but continue
    }
    window.open("/documents/complaints-procedure.pdf", "_blank", "noopener,noreferrer");
  }, [user, logPdfMutation, id]);

  const handleChecklistToggle = useCallback(async (step: "triage" | "acknowledge" | "investigate" | "resolve" | "close", currentlyCompleted: boolean) => {
    if (!user) return;
    setChecklistSaving(step);
    try {
      await updateChecklistStepMutation({
        userId: user.id as Id<"users">,
        complaintId: id,
        step,
        completed: !currentlyCompleted,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update checklist");
    } finally {
      setChecklistSaving(null);
    }
  }, [user, updateChecklistStepMutation, id]);

  // Derived values
  const canEdit = user?.role === "admin" || user?.role === "property_manager";
  const daysOpen = complaint
    ? Math.floor((Date.now() - new Date(complaint.receivedDate).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  // ---- Loading / error states ----

  if (!user || complaint === undefined) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header currentPage="compliance" />
        <LoadingScreen fullScreen={false} message="Loading complaint details..." />
      </div>
    );
  }

  if (complaint === null) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header currentPage="compliance" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12 bg-gray-800 rounded-lg">
            <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-400 mb-4">Complaint not found</p>
            <Link
              href="/compliance/complaints"
              className="inline-block px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
            >
              Back to Complaints
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const statusVariant = STATUS_BADGE_VARIANT[complaint.status] || "neutral";
  const severityVariant = SEVERITY_BADGE_VARIANT[complaint.severity] || "neutral";

  // ---- Render ----

  return (
    <div className="min-h-screen bg-gray-900">
      <Header currentPage="compliance" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header row */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <div>
            <Link
              href="/compliance/complaints"
              className="text-teal-500 hover:text-teal-400 text-sm mb-2 inline-block focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 rounded"
            >
              &larr; Back to Complaints
            </Link>
            <h1 className="text-2xl font-bold text-white">
              {complaint.referenceNumber || "Complaint Details"}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Badge variant={statusVariant} size="sm" dot>
                {STATUS_LABELS[complaint.status] || complaint.status}
              </Badge>
              <Badge variant={severityVariant} size="sm">
                {complaint.severity.charAt(0).toUpperCase() + complaint.severity.slice(1)} Severity
              </Badge>
              {complaint.source && (
                <span className="text-gray-400 text-sm">
                  Source: {SOURCE_LABELS[complaint.source] || complaint.source}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg mb-6" role="alert">
            {error}
            <button
              onClick={() => setError("")}
              className="ml-3 text-red-300 hover:text-red-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded"
              aria-label="Dismiss error"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Two-column layout */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main content - 2/3 */}
          <div className="flex-1 min-w-0 space-y-6">

            {/* === 24-Hour Countdown Banner === */}
            {complaint.acknowledgedDate ? (
              <div className="p-4 bg-green-900/50 border border-green-600 rounded-lg" role="status" aria-label="Acknowledgment status">
                <div className="flex items-center gap-3">
                  <svg className="w-6 h-6 text-green-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h2 className="text-green-200 font-semibold">Acknowledged</h2>
                    <p className="text-green-300 text-sm">
                      Acknowledged on {formatDate(complaint.acknowledgedDate)}
                      {complaint.acknowledgmentMethod && (
                        <span> via {ACK_METHOD_LABELS[complaint.acknowledgmentMethod] || complaint.acknowledgmentMethod}</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            ) : complaint.acknowledgmentDueDate && !isOverdue ? (
              <div className="p-4 bg-yellow-900/50 border border-yellow-600 rounded-lg" role="alert" aria-label="Acknowledgment countdown">
                <div className="flex items-center gap-3">
                  <svg className="w-6 h-6 text-yellow-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h2 className="text-yellow-200 font-semibold">Acknowledgment Required</h2>
                    <p className="text-yellow-300 text-sm">
                      <span className="font-mono font-bold">{countdown}</span> to acknowledge this complaint
                    </p>
                    <p className="text-yellow-400/70 text-xs mt-0.5">
                      Deadline: {formatDateTime(complaint.acknowledgmentDueDate)}
                    </p>
                  </div>
                </div>
              </div>
            ) : complaint.acknowledgmentDueDate && isOverdue ? (
              <div className="p-4 bg-red-900/50 border-2 border-red-600 rounded-lg ring-2 ring-red-500/40 ring-offset-1 ring-offset-gray-800" role="alert" aria-label="Acknowledgment overdue">
                <div className="flex items-center gap-3">
                  <svg className="w-6 h-6 text-red-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <div>
                    <h2 className="text-red-200 font-semibold">OVERDUE - Acknowledgment Deadline Passed</h2>
                    <p className="text-red-300 text-sm">
                      <span className="font-mono font-bold">{countdown}</span> past acknowledgment deadline
                    </p>
                    <p className="text-red-400/70 text-xs mt-0.5">
                      Was due: {formatDateTime(complaint.acknowledgmentDueDate)}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {/* === Locked Record Banner === */}
            {complaint.isLocked && complaint.source === "website" && (
              <div className="p-4 bg-orange-900/30 border border-orange-600/50 rounded-lg" role="status" aria-label="Locked record notice">
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-orange-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <p className="text-orange-300 text-sm">
                    This complaint was submitted via the website. Original details are locked for audit integrity.
                  </p>
                </div>
              </div>
            )}

            {/* === 5-Stage Progress Bar === */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Progress</h2>
              {complaint.status === "escalated" && (
                <div className="mb-3 p-2 bg-red-900/30 border border-red-600/40 rounded text-red-400 text-xs text-center">
                  Complaint escalated to NDIS Commission - normal workflow paused
                </div>
              )}
              <StageProgressBar status={complaint.status} />
            </div>

            {/* === Complaint Details === */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Complaint Details</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
                <DetailField label="Reference Number" value={complaint.referenceNumber} />
                <DetailField label="Source" value={complaint.source ? SOURCE_LABELS[complaint.source] || complaint.source : undefined} />
                <DetailField label="Date Received" value={formatDate(complaint.receivedDate)} />
                <DetailField label="Complaint Date" value={formatDate(complaint.complaintDate)} />
                <DetailField label="Category" value={CATEGORY_LABELS[complaint.category] || complaint.category} />
                <DetailField label="Severity" value={complaint.severity.charAt(0).toUpperCase() + complaint.severity.slice(1)} />
              </div>

              {/* Complainant details */}
              <div className="border-t border-gray-700 mt-5 pt-5">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">Complainant Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
                  <DetailField label="Type" value={COMPLAINANT_TYPE_LABELS[complaint.complainantType] || complaint.complainantType} />
                  <DetailField label="Name" value={complaint.complainantName || (complaint.complainantType === "anonymous" ? "Anonymous" : undefined)} />
                  <DetailField label="Contact" value={complaint.complainantContact} />
                  <DetailField label="Preferred Contact Method" value={complaint.preferredContactMethod ? ACK_METHOD_LABELS[complaint.preferredContactMethod] || complaint.preferredContactMethod : undefined} />
                </div>
              </div>

              {/* Linked participant / property */}
              {(complaint.participant || complaint.property) && (
                <div className="border-t border-gray-700 mt-5 pt-5">
                  <h3 className="text-sm font-semibold text-gray-300 mb-3">Linked Records</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
                    {complaint.participant && (
                      <div>
                        <p className="text-sm text-gray-400 mb-0.5">Participant</p>
                        <Link
                          href={`/participants/${complaint.participantId}`}
                          className="text-teal-500 hover:text-teal-400 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 rounded"
                        >
                          {complaint.participant.firstName} {complaint.participant.lastName}
                        </Link>
                      </div>
                    )}
                    {complaint.property && (
                      <div>
                        <p className="text-sm text-gray-400 mb-0.5">Property</p>
                        <Link
                          href={`/properties/${complaint.propertyId}`}
                          className="text-teal-500 hover:text-teal-400 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 rounded"
                        >
                          {complaint.property.propertyName || complaint.property.addressLine1}
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Description */}
              <div className="border-t border-gray-700 mt-5 pt-5">
                <h3 className="text-sm font-semibold text-gray-300 mb-2">Description</h3>
                <p className="text-gray-300 text-sm whitespace-pre-wrap">{complaint.description}</p>
              </div>
            </div>

            {/* === Action Buttons === */}
            {canEdit && complaint.status !== "closed" && (
              <div className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Actions</h2>
                <div className="flex flex-wrap gap-3">
                  {complaint.status === "received" && (
                    <button
                      onClick={() => setShowAckModal(true)}
                      className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                      aria-label="Acknowledge this complaint"
                    >
                      Acknowledge
                    </button>
                  )}
                  {complaint.status === "acknowledged" && (
                    <>
                      <button
                        onClick={handleBeginInvestigation}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
                        aria-label="Begin investigation"
                      >
                        Begin Investigation
                      </button>
                    </>
                  )}
                  {complaint.status === "under_investigation" && (
                    <>
                      <button
                        onClick={() => setShowResolveModal(true)}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
                        aria-label="Resolve this complaint"
                      >
                        Resolve
                      </button>
                    </>
                  )}
                  {complaint.status === "resolved" && (
                    <button
                      onClick={handleClose}
                      disabled={closeLoading}
                      className="px-4 py-2 bg-gray-600 hover:bg-gray-500 disabled:opacity-50 text-white rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
                      aria-label="Close this complaint"
                    >
                      {closeLoading ? "Closing..." : "Close Complaint"}
                    </button>
                  )}
                  {/* Escalate always available when not closed or already escalated */}
                  {complaint.status !== "escalated" && (
                    <button
                      onClick={() => setShowEscalateModal(true)}
                      className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                      aria-label="Escalate to NDIS Commission"
                    >
                      Escalate to NDIS Commission
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* === Investigation Notes === */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Investigation Notes</h2>

              {/* Assigned To */}
              <div className="mb-4">
                <label htmlFor="assigned-to" className="block text-sm text-gray-400 mb-1">
                  Assigned To
                </label>
                {canEdit ? (
                  <select
                    id="assigned-to"
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    className="w-full sm:w-64 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors"
                    aria-label="Assign complaint to user"
                  >
                    <option value="">-- Unassigned --</option>
                    {users?.map((u: { _id: string; firstName: string; lastName: string }) => (
                      <option key={u._id} value={u._id}>
                        {u.firstName} {u.lastName}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-white text-sm">
                    {complaint.assignedToUser
                      ? `${complaint.assignedToUser.firstName} ${complaint.assignedToUser.lastName}`
                      : "Unassigned"}
                  </p>
                )}
              </div>

              {/* Notes textarea */}
              {canEdit ? (
                <>
                  <label htmlFor="investigation-notes" className="block text-sm text-gray-400 mb-1">
                    Notes
                  </label>
                  <textarea
                    id="investigation-notes"
                    value={investigationNotes}
                    onChange={(e) => setInvestigationNotes(e.target.value)}
                    rows={5}
                    placeholder="Document investigation findings, interviews, and evidence gathered..."
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors"
                    aria-label="Investigation notes"
                  />
                  <button
                    onClick={handleSaveNotes}
                    disabled={notesSaving}
                    className="mt-3 px-4 py-2 bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white text-sm rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                  >
                    {notesSaving ? "Saving..." : "Save Notes"}
                  </button>
                </>
              ) : (
                <p className="text-gray-300 text-sm whitespace-pre-wrap">
                  {complaint.investigationNotes || "No investigation notes yet."}
                </p>
              )}
            </div>

            {/* === Resolution Section === */}
            {(complaint.status === "resolved" || complaint.status === "closed") && (
              <div className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Resolution</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
                  <DetailField label="Resolution Date" value={formatDate(complaint.resolutionDate)} />
                  <DetailField label="Outcome" value={complaint.resolutionOutcome ? OUTCOME_LABELS[complaint.resolutionOutcome] || complaint.resolutionOutcome : undefined} />
                  <div>
                    <p className="text-sm text-gray-400 mb-0.5">Complainant Satisfied</p>
                    <p className={`text-sm font-medium ${complaint.complainantSatisfied ? "text-green-400" : "text-red-400"}`}>
                      {complaint.complainantSatisfied ? "Yes" : "No"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-0.5">Systemic Issue Identified</p>
                    <p className={`text-sm font-medium ${complaint.systemicIssueIdentified ? "text-yellow-400" : "text-gray-300"}`}>
                      {complaint.systemicIssueIdentified ? "Yes" : "No"}
                    </p>
                  </div>
                </div>
                {complaint.resolutionDescription && (
                  <div className="mt-4 border-t border-gray-700 pt-4">
                    <h3 className="text-sm font-semibold text-gray-300 mb-2">Resolution Description</h3>
                    <p className="text-gray-300 text-sm whitespace-pre-wrap">{complaint.resolutionDescription}</p>
                  </div>
                )}
                {complaint.correctiveActionsTaken && (
                  <div className="mt-4 border-t border-gray-700 pt-4">
                    <h3 className="text-sm font-semibold text-gray-300 mb-2">Corrective Actions</h3>
                    <p className="text-gray-300 text-sm whitespace-pre-wrap">{complaint.correctiveActionsTaken}</p>
                  </div>
                )}
              </div>
            )}

            {/* === Advocacy Section === */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Advocacy</h2>
              {canEdit ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={advocacyOffered}
                        onChange={(e) => setAdvocacyOffered(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-teal-700 focus:ring-teal-600 focus:ring-2"
                        aria-label="Advocacy offered"
                      />
                      <span className="text-sm text-gray-300">Advocacy Offered</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={advocacyAccepted}
                        onChange={(e) => setAdvocacyAccepted(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-teal-700 focus:ring-teal-600 focus:ring-2"
                        aria-label="Advocacy accepted"
                      />
                      <span className="text-sm text-gray-300">Advocacy Accepted</span>
                    </label>
                  </div>
                  <div>
                    <label htmlFor="advocacy-provider" className="block text-sm text-gray-400 mb-1">
                      Advocacy Provider
                    </label>
                    <input
                      id="advocacy-provider"
                      type="text"
                      value={advocacyProvider}
                      onChange={(e) => setAdvocacyProvider(e.target.value)}
                      placeholder="e.g., Disability Advocacy NSW"
                      className="w-full sm:w-80 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors"
                    />
                  </div>
                  <button
                    onClick={handleSaveAdvocacy}
                    disabled={advocacySaving}
                    className="px-4 py-2 bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white text-sm rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                  >
                    {advocacySaving ? "Saving..." : "Save Advocacy Details"}
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-4 gap-x-8">
                  <div>
                    <p className="text-sm text-gray-400 mb-0.5">Advocacy Offered</p>
                    <p className={`text-sm font-medium ${complaint.advocacyOffered ? "text-green-400" : "text-gray-300"}`}>
                      {complaint.advocacyOffered ? "Yes" : "No"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-0.5">Advocacy Accepted</p>
                    <p className={`text-sm font-medium ${complaint.advocacyAccepted ? "text-green-400" : "text-gray-300"}`}>
                      {complaint.advocacyAccepted ? "Yes" : "No"}
                    </p>
                  </div>
                  <DetailField label="Provider" value={complaint.advocacyProvider} />
                </div>
              )}
            </div>

            {/* === Chain of Custody === */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Chain of Custody</h2>
              {chainOfCustody === undefined ? (
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-teal-600" />
                  Loading audit trail...
                </div>
              ) : chainOfCustody.length === 0 ? (
                <p className="text-gray-400 text-sm">No audit trail entries yet.</p>
              ) : (
                <div className="relative">
                  {/* Vertical line */}
                  <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-gray-600" aria-hidden="true" />

                  <div className="space-y-4" role="list" aria-label="Audit trail">
                    {chainOfCustody.map((entry, idx) => {
                      const actionColor = AUDIT_ACTION_COLORS[entry.action] || "bg-gray-500";
                      const actionLabel = entry.action.charAt(0).toUpperCase() + entry.action.slice(1);
                      let description = "";
                      if (entry.metadata) {
                        try {
                          const meta = JSON.parse(entry.metadata);
                          if (meta.action_detail === "procedure_pdf_opened") {
                            description = "Opened complaint handling procedure PDF";
                          }
                        } catch {
                          // ignore
                        }
                      }

                      return (
                        <div key={entry._id || idx} className="flex items-start gap-3 pl-1" role="listitem">
                          {/* Dot */}
                          <div
                            className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center ${actionColor}`}
                            aria-hidden="true"
                          >
                            <div className="w-2 h-2 rounded-full bg-white" />
                          </div>
                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                              <span className="text-white text-sm font-medium">{entry.userName}</span>
                              <span className="text-gray-400 text-xs">-</span>
                              <span className="text-gray-300 text-sm">{actionLabel}</span>
                            </div>
                            {description && (
                              <p className="text-gray-400 text-xs mt-0.5">{description}</p>
                            )}
                            <p className="text-gray-400 text-xs mt-0.5">
                              {formatDateTime(entry.timestamp)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Metadata */}
            <div className="text-xs text-gray-400 flex flex-wrap items-center gap-4">
              <span>Created: {formatDateTime(complaint.createdAt)}</span>
              <span>Last updated: {formatDateTime(complaint.updatedAt)}</span>
              {complaint.receivedByUser && (
                <span>Received by: {complaint.receivedByUser.firstName} {complaint.receivedByUser.lastName}</span>
              )}
            </div>
          </div>

          {/* Sidebar - fixed 320px */}
          <div className="w-full lg:w-80 shrink-0">
            <div className="lg:sticky lg:top-4 space-y-4">

              {/* SOP-001 Procedure Button */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">Complaints Procedure</h3>
                <button
                  onClick={() => setShowSopOverlay(true)}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-teal-700/20 hover:bg-teal-700/30 text-teal-500 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                  aria-label="View full complaint handling procedure SOP-001"
                >
                  <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <div className="text-left">
                    <p className="text-sm font-medium">View Full Procedure (SOP-001)</p>
                    <p className="text-xs text-teal-500/60">5-step NDIS complaint handling</p>
                  </div>
                </button>
                <button
                  onClick={handleOpenProcedurePdf}
                  className="w-full flex items-center gap-2 mt-2 px-3 py-2 text-gray-400 hover:text-gray-300 hover:bg-gray-700/50 rounded transition-colors text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                  aria-label="Download procedure PDF"
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download PDF version
                </button>
                {complaint.procedurePdfOpenedAt && (
                  <p className="text-gray-400 text-xs mt-2">
                    PDF last opened: {formatDateTime(complaint.procedurePdfOpenedAt)}
                  </p>
                )}
              </div>

              {/* NDIS Compliance Checklist */}
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-300">NDIS Compliance Checklist</h3>
                  <span className="text-xs text-gray-400 font-mono">
                    {CHECKLIST_STEPS.filter(s => complaint.complianceChecklist?.[s.key]).length}/{CHECKLIST_STEPS.length}
                  </span>
                </div>
                {/* Progress indicator */}
                <div className="w-full h-1.5 bg-gray-700 rounded-full mb-4 overflow-hidden" aria-hidden="true">
                  <div
                    className="h-full bg-teal-600 rounded-full transition-all duration-300"
                    style={{
                      width: `${(CHECKLIST_STEPS.filter(s => complaint.complianceChecklist?.[s.key]).length / CHECKLIST_STEPS.length) * 100}%`,
                    }}
                  />
                </div>
                <div className="space-y-3" role="list" aria-label="NDIS compliance checklist">
                  {CHECKLIST_STEPS.map((step) => {
                    const stepData = complaint.complianceChecklist?.[step.key] as { completedAt?: number; completedBy?: string } | undefined;
                    const isCompleted = !!stepData?.completedAt;
                    const isSaving = checklistSaving === step.key;

                    return (
                      <div key={step.key} role="listitem" className="group">
                        <label
                          className={`flex items-start gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${
                            isCompleted
                              ? "bg-green-900/20 border border-green-600/20"
                              : "bg-gray-700/30 border border-gray-700/50 hover:border-teal-700/30 hover:bg-gray-700/50"
                          }`}
                        >
                          <div className="pt-0.5 shrink-0">
                            {isSaving ? (
                              <div className="w-4 h-4 rounded border-2 border-teal-600 flex items-center justify-center">
                                <div className="w-2 h-2 rounded-full bg-teal-600 animate-pulse" />
                              </div>
                            ) : (
                              <input
                                type="checkbox"
                                checked={isCompleted}
                                onChange={() => handleChecklistToggle(step.key, isCompleted)}
                                disabled={!canEdit || isSaving}
                                className="w-4 h-4 rounded border-gray-500 bg-gray-700 text-teal-700 focus:ring-teal-600 focus:ring-2 disabled:opacity-50"
                                aria-label={`Step: ${step.label} - ${step.description}`}
                              />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${isCompleted ? "text-green-400" : "text-gray-200"}`}>
                              {step.label}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">{step.description}</p>
                            {isCompleted && stepData?.completedAt && (
                              <p className="text-xs text-green-500/70 mt-1 flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Completed {formatDateTime(stepData.completedAt)}
                              </p>
                            )}
                          </div>
                        </label>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-gray-400 mt-3">
                  Each step is auto-logged to the audit trail when checked.
                </p>
              </div>

              {/* Vertical Progress Bar */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">Stage Progress</h3>
                <VerticalStageProgressBar status={complaint.status} />
              </div>

              {/* Stage Guidance */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-300 mb-2">Current Stage Guidance</h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  {STAGE_GUIDANCE[complaint.status] || "No guidance available for this status."}
                </p>
              </div>

              {/* Quick Stats */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">Quick Stats</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Days Open</span>
                    <span className={`text-sm font-mono font-semibold ${
                      daysOpen > 21 ? "text-red-400" : daysOpen > 7 ? "text-yellow-400" : "text-green-400"
                    }`}>
                      {daysOpen}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Resolution Due</span>
                    <span className={`text-sm font-mono font-semibold ${getResolutionDueColor(complaint)}`}>
                      {getResolutionDueLabel(complaint)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Source</span>
                    <span className="text-sm text-white">
                      {complaint.source ? SOURCE_LABELS[complaint.source] || complaint.source : "-"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Preferred Contact</span>
                    <span className="text-sm text-white">
                      {complaint.preferredContactMethod
                        ? ACK_METHOD_LABELS[complaint.preferredContactMethod] || complaint.preferredContactMethod
                        : "-"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Assigned To</span>
                    <span className="text-sm text-white">
                      {complaint.assignedToUser
                        ? `${complaint.assignedToUser.firstName} ${complaint.assignedToUser.lastName}`
                        : "Unassigned"}
                    </span>
                  </div>
                  {complaint.escalatedToNdisCommission && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Escalated</span>
                      <span className="text-sm text-red-400 font-medium">
                        {formatDate(complaint.escalationDate)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* NDIS Commission Link */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-300 mb-2">NDIS Resources</h3>
                <a
                  href="https://www.ndiscommission.gov.au/providers/complaints-management"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-teal-500 hover:text-teal-400 text-sm underline focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 rounded"
                >
                  NDIS Commission Complaints Guide
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* === ACKNOWLEDGE MODAL === */}
      {showAckModal && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Acknowledge complaint"
          onClick={(e) => { if (e.target === e.currentTarget) setShowAckModal(false); }}
          onKeyDown={(e) => { if (e.key === "Escape") setShowAckModal(false); }}
        >
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-semibold text-white mb-4">Acknowledge Complaint</h2>
            <p className="text-gray-400 text-sm mb-4">
              Confirm that the complainant has been contacted and the complaint has been acknowledged.
            </p>

            <div className="space-y-4">
              <div>
                <label htmlFor="ack-date" className="block text-sm text-gray-300 mb-1">
                  Acknowledgment Date
                </label>
                <input
                  id="ack-date"
                  type="date"
                  value={ackDate}
                  onChange={(e) => setAckDate(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors"
                />
              </div>
              <div>
                <label htmlFor="ack-method" className="block text-sm text-gray-300 mb-1">
                  Method
                </label>
                <select
                  id="ack-method"
                  value={ackMethod}
                  onChange={(e) => setAckMethod(e.target.value as typeof ackMethod)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors"
                >
                  <option value="email">Email</option>
                  <option value="phone">Phone</option>
                  <option value="letter">Letter</option>
                  <option value="in_person">In Person</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={handleAcknowledge}
                disabled={ackLoading}
                className="px-6 py-2 bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
              >
                {ackLoading ? "Acknowledging..." : "Confirm Acknowledgment"}
              </button>
              <button
                onClick={() => setShowAckModal(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* === RESOLVE MODAL === */}
      {showResolveModal && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label="Resolve complaint"
          onClick={(e) => { if (e.target === e.currentTarget) setShowResolveModal(false); }}
          onKeyDown={(e) => { if (e.key === "Escape") setShowResolveModal(false); }}
        >
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-lg shadow-xl my-8">
            <h2 className="text-lg font-semibold text-white mb-4">Resolve Complaint</h2>

            <div className="space-y-4">
              <div>
                <label htmlFor="resolve-date" className="block text-sm text-gray-300 mb-1">
                  Resolution Date
                </label>
                <input
                  id="resolve-date"
                  type="date"
                  value={resolveDate}
                  onChange={(e) => setResolveDate(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors"
                />
              </div>

              <div>
                <label htmlFor="resolve-outcome" className="block text-sm text-gray-300 mb-1">
                  Outcome
                </label>
                <select
                  id="resolve-outcome"
                  value={resolveOutcome}
                  onChange={(e) => setResolveOutcome(e.target.value as typeof resolveOutcome)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors"
                >
                  <option value="upheld">Upheld</option>
                  <option value="partially_upheld">Partially Upheld</option>
                  <option value="not_upheld">Not Upheld</option>
                  <option value="withdrawn">Withdrawn</option>
                </select>
              </div>

              <div>
                <label htmlFor="resolve-description" className="block text-sm text-gray-300 mb-1">
                  Resolution Description <span className="text-red-400">*</span>
                </label>
                <textarea
                  id="resolve-description"
                  value={resolveDescription}
                  onChange={(e) => setResolveDescription(e.target.value)}
                  rows={4}
                  placeholder="Describe the resolution and how it was communicated to the complainant..."
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors"
                  required
                />
              </div>

              <div>
                <label htmlFor="resolve-corrective" className="block text-sm text-gray-300 mb-1">
                  Corrective Actions Taken
                </label>
                <textarea
                  id="resolve-corrective"
                  value={resolveCorrectiveActions}
                  onChange={(e) => setResolveCorrectiveActions(e.target.value)}
                  rows={3}
                  placeholder="Any corrective actions implemented..."
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors"
                />
              </div>

              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={resolveSatisfied}
                    onChange={(e) => setResolveSatisfied(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-teal-700 focus:ring-teal-600 focus:ring-2"
                    aria-label="Complainant satisfied with resolution"
                  />
                  <span className="text-sm text-gray-300">Complainant Satisfied</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={resolveSystemic}
                    onChange={(e) => setResolveSystemic(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-teal-700 focus:ring-teal-600 focus:ring-2"
                    aria-label="Systemic issue identified"
                  />
                  <span className="text-sm text-gray-300">Systemic Issue Identified</span>
                </label>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={handleResolve}
                disabled={resolveLoading || !resolveDescription.trim()}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
              >
                {resolveLoading ? "Resolving..." : "Resolve Complaint"}
              </button>
              <button
                onClick={() => setShowResolveModal(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* === ESCALATE MODAL === */}
      {showEscalateModal && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Escalate complaint to NDIS Commission"
          onClick={(e) => { if (e.target === e.currentTarget) setShowEscalateModal(false); }}
          onKeyDown={(e) => { if (e.key === "Escape") setShowEscalateModal(false); }}
        >
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-semibold text-red-400 mb-2">Escalate to NDIS Commission</h2>
            <p className="text-gray-400 text-sm mb-4">
              This action will mark the complaint as escalated to the NDIS Quality and Safeguards Commission.
              This should only be done when internal resolution is not possible.
            </p>

            <div className="space-y-4">
              <div>
                <label htmlFor="escalate-date" className="block text-sm text-gray-300 mb-1">
                  Escalation Date
                </label>
                <input
                  id="escalate-date"
                  type="date"
                  value={escalateDate}
                  onChange={(e) => setEscalateDate(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors"
                />
              </div>
              <div>
                <label htmlFor="escalate-reason" className="block text-sm text-gray-300 mb-1">
                  Reason for Escalation <span className="text-red-400">*</span>
                </label>
                <textarea
                  id="escalate-reason"
                  value={escalateReason}
                  onChange={(e) => setEscalateReason(e.target.value)}
                  rows={4}
                  placeholder="Why is this complaint being escalated to the NDIS Commission?"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors"
                  required
                />
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={handleEscalate}
                disabled={escalateLoading || !escalateReason.trim()}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              >
                {escalateLoading ? "Escalating..." : "Confirm Escalation"}
              </button>
              <button
                onClick={() => setShowEscalateModal(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* === SOP-001 OVERLAY === */}
      <SOP001Overlay isOpen={showSopOverlay} onClose={() => setShowSopOverlay(false)} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Default export with auth wrapper
// ---------------------------------------------------------------------------

export default function ComplaintDetailPage() {
  return (
    <RequireAuth>
      <ComplaintDetailContent />
    </RequireAuth>
  );
}
