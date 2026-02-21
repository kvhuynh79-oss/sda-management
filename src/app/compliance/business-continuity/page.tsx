"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import Header from "@/components/Header";
import { RequireAuth } from "@/components/RequireAuth";
import Badge from "@/components/ui/Badge";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import { formatDate } from "@/utils/format";
import { generateBusinessContinuityPdf, calculateRiskLevel } from "@/utils/businessContinuityPdf";
import Link from "next/link";
import { useOrganization } from "@/contexts/OrganizationContext";

// ── Types ──────────────────────────────────────────────────

interface KeyPersonnel {
  name: string;
  role: string;
  phone: string;
  email?: string;
  responsibilities?: string;
}

interface CriticalService {
  service: string;
  provider: string;
  contactPhone?: string;
  contactEmail?: string;
  alternativeProvider?: string;
}

interface InsuranceDetail {
  type: string;
  provider: string;
  policyNumber?: string;
  coverage?: string;
  expiryDate?: string;
}

interface RiskScenario {
  scenario: string;
  likelihood: string;
  impact: string;
  riskLevel: string;
  mitigationSteps?: string;
  recoverySteps?: string;
  rto?: string;
}

interface DataBackup {
  method?: string;
  frequency?: string;
  location?: string;
  responsiblePerson?: string;
  lastTestedDate?: string;
}

interface CommunicationPlan {
  internalNotification?: string;
  externalNotification?: string;
  mediaResponse?: string;
}

interface RecoveryStep {
  step: string;
  description?: string;
  responsible?: string;
  completed?: boolean;
}

// ── Constants ──────────────────────────────────────────────

const STATUS_BADGE: Record<string, { variant: "neutral" | "success" | "warning" | "error"; label: string }> = {
  draft: { variant: "neutral", label: "Draft" },
  active: { variant: "success", label: "Active" },
  under_review: { variant: "warning", label: "Under Review" },
  archived: { variant: "error", label: "Archived" },
};

const LIKELIHOOD_OPTIONS = ["Rare", "Unlikely", "Possible", "Likely", "Almost Certain"];
const IMPACT_OPTIONS = ["Insignificant", "Minor", "Moderate", "Major", "Catastrophic"];
const FREQUENCY_OPTIONS = ["Daily", "Weekly", "Monthly", "Real-time"];
const INSURANCE_TYPE_OPTIONS = [
  "Public Liability",
  "Professional Indemnity",
  "Workers Compensation",
  "Property",
  "Vehicle",
  "Cyber",
  "Other",
];

const DEFAULT_RISK_SCENARIOS: RiskScenario[] = [
  { scenario: "Fire / Building Damage", likelihood: "Unlikely", impact: "Catastrophic", riskLevel: "high", mitigationSteps: "", recoverySteps: "", rto: "" },
  { scenario: "Natural Disaster (Flood, Storm)", likelihood: "Possible", impact: "Major", riskLevel: "high", mitigationSteps: "", recoverySteps: "", rto: "" },
  { scenario: "IT System Failure", likelihood: "Possible", impact: "Major", riskLevel: "high", mitigationSteps: "", recoverySteps: "", rto: "" },
  { scenario: "Key Staff Unavailability", likelihood: "Likely", impact: "Moderate", riskLevel: "high", mitigationSteps: "", recoverySteps: "", rto: "" },
  { scenario: "Pandemic / Health Emergency", likelihood: "Possible", impact: "Major", riskLevel: "high", mitigationSteps: "", recoverySteps: "", rto: "" },
  { scenario: "Supply Chain Disruption", likelihood: "Possible", impact: "Moderate", riskLevel: "medium", mitigationSteps: "", recoverySteps: "", rto: "" },
  { scenario: "Utility Failure (Power, Water)", likelihood: "Unlikely", impact: "Moderate", riskLevel: "medium", mitigationSteps: "", recoverySteps: "", rto: "" },
];

const DEFAULT_RECOVERY_CHECKLIST: RecoveryStep[] = [
  { step: "Activate Emergency Response Team", description: "Contact all key personnel and establish communication channels", responsible: "", completed: false },
  { step: "Assess Situation and Impact", description: "Evaluate the extent of disruption and immediate risks to participants", responsible: "", completed: false },
  { step: "Ensure Participant Safety", description: "Verify all participants are safe and accounted for; arrange alternative accommodation if needed", responsible: "", completed: false },
  { step: "Notify Relevant Authorities", description: "Contact NDIS Commission, emergency services, and insurers as required", responsible: "", completed: false },
  { step: "Activate Backup Systems", description: "Switch to backup IT systems, alternative service providers, and communication channels", responsible: "", completed: false },
  { step: "Communicate with Stakeholders", description: "Notify participants, families, support coordinators, and SIL providers", responsible: "", completed: false },
  { step: "Document All Actions", description: "Maintain a detailed log of all decisions, actions taken, and communications", responsible: "", completed: false },
  { step: "Restore Critical Services", description: "Prioritize restoration of participant care services and essential operations", responsible: "", completed: false },
  { step: "Conduct Post-Incident Review", description: "Evaluate the response effectiveness and identify areas for improvement", responsible: "", completed: false },
  { step: "Update BCP Based on Lessons Learned", description: "Revise procedures and recovery steps based on incident review findings", responsible: "", completed: false },
];

// ── Risk Level Calculation (for UI) ────────────────────────

function computeRiskLevel(likelihood: string, impact: string): string {
  const likelihoodScores: Record<string, number> = {
    "Rare": 1,
    "Unlikely": 2,
    "Possible": 3,
    "Likely": 4,
    "Almost Certain": 5,
  };
  const impactScores: Record<string, number> = {
    "Insignificant": 1,
    "Minor": 2,
    "Moderate": 3,
    "Major": 4,
    "Catastrophic": 5,
  };
  const score = (likelihoodScores[likelihood] || 1) * (impactScores[impact] || 1);
  if (score <= 4) return "low";
  if (score <= 9) return "medium";
  if (score <= 15) return "high";
  return "extreme";
}

function getRiskBadgeVariant(level: string): "success" | "warning" | "orange" | "error" | "neutral" {
  switch (level) {
    case "low": return "success";
    case "medium": return "warning";
    case "high": return "orange";
    case "extreme": return "error";
    default: return "neutral";
  }
}

// ── Main Content ───────────────────────────────────────────

function BusinessContinuityContent() {
  const { confirm, alert } = useConfirmDialog();

  // Auth
  const [user, setUser] = useState<{ id: string; role: string; name: string } | null>(null);
  useEffect(() => {
    const stored = localStorage.getItem("sda_user");
    if (stored) {
      const parsed = JSON.parse(stored);
      setUser(parsed);
    }
  }, []);

  const userId = user?.id as Id<"users"> | undefined;

  // Queries
  const existingPlan = useQuery(
    api.businessContinuityPlans.get,
    userId ? { userId: userId as Id<"users"> } : "skip"
  );
  const providerSettings = useQuery(
    api.providerSettings.get,
    userId ? { userId: userId as Id<"users"> } : "skip"
  );

  // Mutations
  const createPlan = useMutation(api.businessContinuityPlans.create);
  const updatePlan = useMutation(api.businessContinuityPlans.update);
  const updateStatusMut = useMutation(api.businessContinuityPlans.updateStatus);
  const removePlan = useMutation(api.businessContinuityPlans.remove);

  // Form state
  const [planId, setPlanId] = useState<Id<"businessContinuityPlans"> | null>(null);
  const [status, setStatus] = useState("draft");
  const [version, setVersion] = useState("1.0");
  const [lastReviewDate, setLastReviewDate] = useState("");
  const [nextReviewDate, setNextReviewDate] = useState("");

  // Section 1: Business Details
  const [businessName, setBusinessName] = useState("");
  const [abn, setAbn] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  // Section 2: Key Personnel
  const [keyPersonnel, setKeyPersonnel] = useState<KeyPersonnel[]>([]);

  // Section 3: Critical Services
  const [criticalServices, setCriticalServices] = useState<CriticalService[]>([]);

  // Section 4: Insurance Details
  const [insuranceDetails, setInsuranceDetails] = useState<InsuranceDetail[]>([]);

  // Section 5: Risk Scenarios
  const [riskScenarios, setRiskScenarios] = useState<RiskScenario[]>([]);

  // Section 6: Data Backup
  const [backupMethod, setBackupMethod] = useState("");
  const [backupFrequency, setBackupFrequency] = useState("");
  const [backupLocation, setBackupLocation] = useState("");
  const [backupResponsible, setBackupResponsible] = useState("");
  const [backupLastTested, setBackupLastTested] = useState("");

  // Section 7: Communication Plan
  const [internalNotification, setInternalNotification] = useState("");
  const [externalNotification, setExternalNotification] = useState("");
  const [mediaResponse, setMediaResponse] = useState("");

  // Section 8: Recovery Checklist
  const [recoveryChecklist, setRecoveryChecklist] = useState<RecoveryStep[]>([]);

  // UI state
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear success message timer on unmount
  useEffect(() => {
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    };
  }, []);

  // Helper to set a temporary success message
  const showSuccess = useCallback((msg: string) => {
    if (successTimerRef.current) clearTimeout(successTimerRef.current);
    setSuccessMsg(msg);
    successTimerRef.current = setTimeout(() => setSuccessMsg(""), 3000);
  }, []);

  // Load existing plan data into form
  useEffect(() => {
    if (existingPlan && existingPlan._id) {
      setPlanId(existingPlan._id);
      setStatus(existingPlan.status || "draft");
      setVersion(existingPlan.version || "1.0");
      setLastReviewDate(existingPlan.lastReviewDate || "");
      setNextReviewDate(existingPlan.nextReviewDate || "");

      // Business Details
      const bd = existingPlan.businessDetails;
      if (bd) {
        setBusinessName(bd.name || "");
        setAbn(bd.abn || "");
        setAddress(bd.address || "");
        setPhone(bd.phone || "");
        setEmail(bd.email || "");
      }

      // Key Personnel
      if (existingPlan.keyPersonnel && existingPlan.keyPersonnel.length > 0) {
        setKeyPersonnel(existingPlan.keyPersonnel.map((p: KeyPersonnel) => ({ ...p })));
      }

      // Critical Services
      if (existingPlan.criticalServices && existingPlan.criticalServices.length > 0) {
        setCriticalServices(existingPlan.criticalServices.map((s: CriticalService) => ({ ...s })));
      }

      // Insurance Details
      if (existingPlan.insuranceDetails && existingPlan.insuranceDetails.length > 0) {
        setInsuranceDetails(existingPlan.insuranceDetails.map((i: InsuranceDetail) => ({ ...i })));
      }

      // Risk Scenarios
      if (existingPlan.riskScenarios && existingPlan.riskScenarios.length > 0) {
        setRiskScenarios(existingPlan.riskScenarios.map((r: RiskScenario) => ({ ...r })));
      }

      // Data Backup
      const db = existingPlan.dataBackupProcedures;
      if (db) {
        setBackupMethod(db.method || "");
        setBackupFrequency(db.frequency || "");
        setBackupLocation(db.location || "");
        setBackupResponsible(db.responsiblePerson || "");
        setBackupLastTested(db.lastTestedDate || "");
      }

      // Communication Plan
      const cp = existingPlan.communicationPlan;
      if (cp) {
        setInternalNotification(cp.internalNotification || "");
        setExternalNotification(cp.externalNotification || "");
        setMediaResponse(cp.mediaResponse || "");
      }

      // Recovery Checklist
      if (existingPlan.recoveryChecklist && existingPlan.recoveryChecklist.length > 0) {
        setRecoveryChecklist(existingPlan.recoveryChecklist.map((s: RecoveryStep) => ({ ...s })));
      }
    }
  }, [existingPlan]);

  // Toggle section collapse
  const toggleSection = useCallback((section: string) => {
    setCollapsedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  }, []);

  // ── CREATE ────────────────────────────────────────────

  const handleCreate = async () => {
    if (!userId) return;
    setCreating(true);
    setError("");

    try {
      // Pre-fill from provider settings
      const bdName = providerSettings?.providerName || "";
      const bdAbn = providerSettings?.abn || "";
      const bdAddress = providerSettings?.address || "";
      const bdPhone = providerSettings?.contactPhone || "";
      const bdEmail = providerSettings?.contactEmail || "";

      const newId = await createPlan({
        userId: userId as Id<"users">,
        businessDetails: {
          name: bdName,
          abn: bdAbn,
          address: bdAddress,
          phone: bdPhone,
          email: bdEmail,
        },
        riskScenarios: DEFAULT_RISK_SCENARIOS,
        recoveryChecklist: DEFAULT_RECOVERY_CHECKLIST,
        status: "draft",
        version: "1.0",
      });

      // The useQuery for `get` will automatically refetch with the new plan
      showSuccess("Business Continuity Plan created successfully.");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create plan";
      setError(message);
    } finally {
      setCreating(false);
    }
  };

  // ── SAVE ──────────────────────────────────────────────

  const handleSave = async () => {
    if (!userId || !planId) return;
    setSaving(true);
    setError("");

    try {
      await updatePlan({
        userId: userId as Id<"users">,
        id: planId,
        version,
        lastReviewDate: lastReviewDate || undefined,
        nextReviewDate: nextReviewDate || undefined,
        businessDetails: {
          name: businessName,
          abn: abn || undefined,
          address: address || undefined,
          phone: phone || undefined,
          email: email || undefined,
        },
        keyPersonnel: keyPersonnel.map((p) => ({
          name: p.name,
          role: p.role,
          phone: p.phone,
          email: p.email || undefined,
          responsibilities: p.responsibilities || undefined,
        })),
        criticalServices: criticalServices.map((s) => ({
          service: s.service,
          provider: s.provider,
          contactPhone: s.contactPhone || undefined,
          contactEmail: s.contactEmail || undefined,
          alternativeProvider: s.alternativeProvider || undefined,
        })),
        insuranceDetails: insuranceDetails.map((i) => ({
          type: i.type,
          provider: i.provider,
          policyNumber: i.policyNumber || undefined,
          coverage: i.coverage || undefined,
          expiryDate: i.expiryDate || undefined,
        })),
        riskScenarios: riskScenarios.map((r) => ({
          scenario: r.scenario,
          likelihood: r.likelihood,
          impact: r.impact,
          riskLevel: r.riskLevel,
          mitigationSteps: r.mitigationSteps || undefined,
          recoverySteps: r.recoverySteps || undefined,
          rto: r.rto || undefined,
        })),
        dataBackupProcedures: {
          method: backupMethod || undefined,
          frequency: backupFrequency || undefined,
          location: backupLocation || undefined,
          responsiblePerson: backupResponsible || undefined,
          lastTestedDate: backupLastTested || undefined,
        },
        communicationPlan: {
          internalNotification: internalNotification || undefined,
          externalNotification: externalNotification || undefined,
          mediaResponse: mediaResponse || undefined,
        },
        recoveryChecklist: recoveryChecklist.map((s) => ({
          step: s.step,
          description: s.description || undefined,
          responsible: s.responsible || undefined,
          completed: s.completed || false,
        })),
      });

      showSuccess("Plan saved successfully.");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save plan";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  // ── STATUS CHANGE ─────────────────────────────────────

  const handleStatusChange = async (newStatus: "draft" | "active" | "under_review" | "archived") => {
    if (!userId || !planId) return;
    setShowStatusMenu(false);

    const confirmed = await confirm({
      title: "Change Plan Status",
      message: `Are you sure you want to change the status to "${STATUS_BADGE[newStatus]?.label || newStatus}"?`,
    });
    if (!confirmed) return;

    try {
      await updateStatusMut({
        userId: userId as Id<"users">,
        id: planId,
        status: newStatus,
      });
      setStatus(newStatus);
      showSuccess(`Status changed to ${STATUS_BADGE[newStatus]?.label || newStatus}.`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update status";
      setError(message);
    }
  };

  // ── DELETE ────────────────────────────────────────────

  const handleDelete = async () => {
    if (!userId || !planId) return;

    const confirmed = await confirm({
      title: "Delete Business Continuity Plan",
      message: "This action cannot be undone. Are you sure you want to permanently delete this plan?",
      variant: "danger",
      confirmLabel: "Delete Plan",
    });
    if (!confirmed) return;

    try {
      await removePlan({
        userId: userId as Id<"users">,
        id: planId,
      });
      setPlanId(null);
      showSuccess("Plan deleted.");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete plan";
      setError(message);
    }
  };

  // ── PDF EXPORT ────────────────────────────────────────

  const handleExportPdf = () => {
    // Map form state to the PDF utility's expected interface
    generateBusinessContinuityPdf(
      {
        status,
        version,
        lastReviewedDate: lastReviewDate,
        nextReviewDate,
        businessName,
        abn,
        address,
        phone,
        email,
        keyPersonnel,
        criticalServices,
        insuranceDetails,
        riskScenarios: riskScenarios.map((r) => ({
          ...r,
          // Normalize likelihood/impact keys for the PDF calculator
          likelihood: r.likelihood.toLowerCase().replace(/ /g, "_"),
          impact: r.impact.toLowerCase().replace(/ /g, "_"),
        })),
        dataBackup: {
          method: backupMethod,
          frequency: backupFrequency.toLowerCase().replace(/-/g, "_"),
          storageLocation: backupLocation,
          responsiblePerson: backupResponsible,
          lastTestedDate: backupLastTested,
        },
        communicationPlan: {
          internalProcedure: internalNotification,
          externalProcedure: externalNotification,
          mediaResponsePlan: mediaResponse,
        },
        recoveryChecklist,
      },
      businessName || "MySDAManager"
    );
  };

  // ── Dynamic Array Helpers ─────────────────────────────

  const addPersonnel = () => {
    setKeyPersonnel((prev) => [...prev, { name: "", role: "", phone: "", email: "", responsibilities: "" }]);
  };

  const removePersonnel = (index: number) => {
    setKeyPersonnel((prev) => prev.filter((_, i) => i !== index));
  };

  const updatePersonnel = (index: number, field: keyof KeyPersonnel, value: string) => {
    setKeyPersonnel((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
  };

  const addService = () => {
    setCriticalServices((prev) => [...prev, { service: "", provider: "", contactPhone: "", contactEmail: "", alternativeProvider: "" }]);
  };

  const removeService = (index: number) => {
    setCriticalServices((prev) => prev.filter((_, i) => i !== index));
  };

  const updateService = (index: number, field: keyof CriticalService, value: string) => {
    setCriticalServices((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  };

  const addInsurance = () => {
    setInsuranceDetails((prev) => [...prev, { type: "Public Liability", provider: "", policyNumber: "", coverage: "", expiryDate: "" }]);
  };

  const removeInsurance = (index: number) => {
    setInsuranceDetails((prev) => prev.filter((_, i) => i !== index));
  };

  const updateInsurance = (index: number, field: keyof InsuranceDetail, value: string) => {
    setInsuranceDetails((prev) => prev.map((ins, i) => (i === index ? { ...ins, [field]: value } : ins)));
  };

  const addRiskScenario = () => {
    setRiskScenarios((prev) => [...prev, { scenario: "", likelihood: "Possible", impact: "Moderate", riskLevel: "medium", mitigationSteps: "", recoverySteps: "", rto: "" }]);
  };

  const removeRiskScenario = (index: number) => {
    setRiskScenarios((prev) => prev.filter((_, i) => i !== index));
  };

  const updateRiskScenario = (index: number, field: keyof RiskScenario, value: string) => {
    setRiskScenarios((prev) =>
      prev.map((r, i) => {
        if (i !== index) return r;
        const updated = { ...r, [field]: value };
        // Recalculate risk level when likelihood or impact changes
        if (field === "likelihood" || field === "impact") {
          updated.riskLevel = computeRiskLevel(updated.likelihood, updated.impact);
        }
        return updated;
      })
    );
  };

  const addRecoveryStep = () => {
    setRecoveryChecklist((prev) => [...prev, { step: "", description: "", responsible: "", completed: false }]);
  };

  const removeRecoveryStep = (index: number) => {
    setRecoveryChecklist((prev) => prev.filter((_, i) => i !== index));
  };

  const updateRecoveryStep = (index: number, field: string, value: string | boolean) => {
    setRecoveryChecklist((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  };

  // ── Computed ──────────────────────────────────────────

  const completedSteps = useMemo(
    () => recoveryChecklist.filter((s) => s.completed).length,
    [recoveryChecklist]
  );

  const statusInfo = STATUS_BADGE[status] || { variant: "neutral" as const, label: status };

  // ── Loading ───────────────────────────────────────────

  if (existingPlan === undefined) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header currentPage="compliance" />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-600" />
        </div>
      </div>
    );
  }

  // ── Empty State ───────────────────────────────────────

  if (existingPlan === null && !planId) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header currentPage="compliance" />
        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <Link
              href="/compliance"
              className="text-teal-500 hover:text-teal-400 text-sm mb-2 inline-block focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 rounded"
            >
              &larr; Back to Compliance
            </Link>
            <h1 className="text-2xl font-bold text-white">Business Continuity Plan</h1>
          </div>

          {error && (
            <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg mb-6" role="alert">
              {error}
            </div>
          )}

          <div className="flex flex-col items-center justify-center py-20 text-center bg-gray-800 border border-gray-700 rounded-lg">
            <svg className="w-16 h-16 text-gray-500 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h2 className="text-xl font-semibold text-white mb-2">No Business Continuity Plan</h2>
            <p className="text-gray-400 max-w-md mb-8">
              Create a Business Continuity Plan to document your organisation&apos;s preparedness for disruptions, ensure NDIS compliance, and protect participants.
            </p>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="px-6 py-3 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-600 text-white font-medium rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
            >
              {creating ? "Creating..." : "Create Business Continuity Plan"}
            </button>
          </div>
        </main>
      </div>
    );
  }

  // ── Full Form View ────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-900">
      <Header currentPage="compliance" />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <div className="mb-2">
          <Link
            href="/compliance"
            className="text-teal-500 hover:text-teal-400 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 rounded"
          >
            &larr; Back to Compliance
          </Link>
        </div>

        {/* Header Area */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Business Continuity Plan</h1>
            <div className="flex flex-wrap items-center gap-3 mt-2">
              <Badge variant={statusInfo.variant} size="sm" dot>
                {statusInfo.label}
              </Badge>
              <span className="text-gray-400 text-sm">Version {version}</span>
              {lastReviewDate && (
                <span className="text-gray-400 text-sm">Last reviewed: {formatDate(lastReviewDate)}</span>
              )}
              {nextReviewDate && (
                <span className={`text-sm ${new Date(nextReviewDate) < new Date() ? "text-red-400" : "text-gray-400"}`}>
                  Next review: {formatDate(nextReviewDate)}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Save */}
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
            >
              {saving ? "Saving..." : "Save"}
            </button>

            {/* Status dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowStatusMenu(!showStatusMenu)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
                aria-haspopup="true"
                aria-expanded={showStatusMenu}
              >
                Status
                <svg className="w-4 h-4 inline-block ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showStatusMenu && (
                <div className="absolute right-0 mt-1 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-10" role="menu">
                  {(["draft", "active", "under_review", "archived"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => handleStatusChange(s)}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-700 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                        status === s ? "text-teal-400 font-medium" : "text-gray-300"
                      }`}
                      role="menuitem"
                    >
                      {STATUS_BADGE[s]?.label || s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Export PDF */}
            <button
              onClick={handleExportPdf}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
            >
              <svg className="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export PDF
            </button>

            {/* Delete */}
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 text-sm rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
            >
              Delete
            </button>
          </div>
        </div>

        {/* Close status menu on outside click */}
        {showStatusMenu && (
          <div className="fixed inset-0 z-0" onClick={() => setShowStatusMenu(false)} aria-hidden="true" />
        )}

        {/* Messages */}
        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg mb-6" role="alert">
            {error}
            <button onClick={() => setError("")} className="ml-2 text-red-300 hover:text-red-100" aria-label="Dismiss error">
              &times;
            </button>
          </div>
        )}
        {successMsg && (
          <div className="bg-green-900/50 border border-green-500 text-green-200 px-4 py-3 rounded-lg mb-6" role="status">
            {successMsg}
          </div>
        )}

        {/* Review Dates */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Plan Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="version" className="block text-sm font-medium text-gray-300 mb-1">
                Version
              </label>
              <input
                id="version"
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                className="bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors"
              />
            </div>
            <div>
              <label htmlFor="lastReviewDate" className="block text-sm font-medium text-gray-300 mb-1">
                Last Review Date
              </label>
              <input
                id="lastReviewDate"
                type="date"
                value={lastReviewDate}
                onChange={(e) => setLastReviewDate(e.target.value)}
                className="bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors"
              />
            </div>
            <div>
              <label htmlFor="nextReviewDate" className="block text-sm font-medium text-gray-300 mb-1">
                Next Review Date
              </label>
              <input
                id="nextReviewDate"
                type="date"
                value={nextReviewDate}
                onChange={(e) => setNextReviewDate(e.target.value)}
                className="bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors"
              />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* ── Section 1: Business Details ──────────────── */}
          <SectionCard
            title="1. Business Details"
            collapsed={collapsedSections["business"]}
            onToggle={() => toggleSection("business")}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label htmlFor="businessName" className="block text-sm font-medium text-gray-300 mb-1">
                  Business Name
                </label>
                <input
                  id="businessName"
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Organisation name"
                  className="bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 w-full placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors"
                />
              </div>
              <div>
                <label htmlFor="abn" className="block text-sm font-medium text-gray-300 mb-1">
                  ABN
                </label>
                <input
                  id="abn"
                  type="text"
                  value={abn}
                  onChange={(e) => setAbn(e.target.value)}
                  placeholder="e.g., 12 345 678 901"
                  className="bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 w-full placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors"
                />
              </div>
              <div>
                <label htmlFor="bizPhone" className="block text-sm font-medium text-gray-300 mb-1">
                  Phone
                </label>
                <input
                  id="bizPhone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g., 02 1234 5678"
                  className="bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 w-full placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors"
                />
              </div>
              <div>
                <label htmlFor="bizEmail" className="block text-sm font-medium text-gray-300 mb-1">
                  Email
                </label>
                <input
                  id="bizEmail"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g., admin@company.com.au"
                  className="bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 w-full placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors"
                />
              </div>
              <div>
                <label htmlFor="bizAddress" className="block text-sm font-medium text-gray-300 mb-1">
                  Address
                </label>
                <input
                  id="bizAddress"
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Full business address"
                  className="bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 w-full placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors"
                />
              </div>
            </div>
          </SectionCard>

          {/* ── Section 2: Key Personnel ─────────────────── */}
          <SectionCard
            title="2. Key Personnel"
            collapsed={collapsedSections["personnel"]}
            onToggle={() => toggleSection("personnel")}
            count={keyPersonnel.length}
          >
            {keyPersonnel.length === 0 && (
              <p className="text-gray-400 text-sm mb-4">No key personnel added yet.</p>
            )}

            <div className="space-y-4">
              {keyPersonnel.map((person, idx) => (
                <div key={idx} className="bg-gray-700/50 border border-gray-600 rounded-lg p-4 relative">
                  <button
                    onClick={() => removePersonnel(idx)}
                    className="absolute top-2 right-2 text-gray-400 hover:text-red-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded"
                    aria-label={`Remove ${person.name || "personnel"}`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pr-8">
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">Name</label>
                      <input
                        type="text"
                        value={person.name}
                        onChange={(e) => updatePersonnel(idx, "name", e.target.value)}
                        placeholder="Full name"
                        className="bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 w-full placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">Role</label>
                      <input
                        type="text"
                        value={person.role}
                        onChange={(e) => updatePersonnel(idx, "role", e.target.value)}
                        placeholder="e.g., Director, Property Manager"
                        className="bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 w-full placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">Phone</label>
                      <input
                        type="tel"
                        value={person.phone}
                        onChange={(e) => updatePersonnel(idx, "phone", e.target.value)}
                        placeholder="Contact number"
                        className="bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 w-full placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">Email</label>
                      <input
                        type="email"
                        value={person.email || ""}
                        onChange={(e) => updatePersonnel(idx, "email", e.target.value)}
                        placeholder="Email address"
                        className="bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 w-full placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors text-sm"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-gray-400 mb-1">Responsibilities</label>
                      <textarea
                        value={person.responsibilities || ""}
                        onChange={(e) => updatePersonnel(idx, "responsibilities", e.target.value)}
                        rows={2}
                        placeholder="Key responsibilities during a disruption"
                        className="bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 w-full placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors text-sm resize-none"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={addPersonnel}
              className="mt-4 px-4 py-2 border border-dashed border-gray-500 hover:border-teal-500 text-gray-400 hover:text-teal-400 text-sm rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 w-full"
            >
              + Add Personnel
            </button>
          </SectionCard>

          {/* ── Section 3: Critical Services ──────────────── */}
          <SectionCard
            title="3. Critical Services"
            collapsed={collapsedSections["services"]}
            onToggle={() => toggleSection("services")}
            count={criticalServices.length}
          >
            {criticalServices.length === 0 && (
              <p className="text-gray-400 text-sm mb-4">No critical services added yet.</p>
            )}

            <div className="space-y-4">
              {criticalServices.map((svc, idx) => (
                <div key={idx} className="bg-gray-700/50 border border-gray-600 rounded-lg p-4 relative">
                  <button
                    onClick={() => removeService(idx)}
                    className="absolute top-2 right-2 text-gray-400 hover:text-red-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded"
                    aria-label={`Remove ${svc.service || "service"}`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pr-8">
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">Service</label>
                      <input
                        type="text"
                        value={svc.service}
                        onChange={(e) => updateService(idx, "service", e.target.value)}
                        placeholder="e.g., IT Support, Cleaning"
                        className="bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 w-full placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">Provider</label>
                      <input
                        type="text"
                        value={svc.provider}
                        onChange={(e) => updateService(idx, "provider", e.target.value)}
                        placeholder="Provider name"
                        className="bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 w-full placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">Contact Phone</label>
                      <input
                        type="tel"
                        value={svc.contactPhone || ""}
                        onChange={(e) => updateService(idx, "contactPhone", e.target.value)}
                        placeholder="Phone number"
                        className="bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 w-full placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">Contact Email</label>
                      <input
                        type="email"
                        value={svc.contactEmail || ""}
                        onChange={(e) => updateService(idx, "contactEmail", e.target.value)}
                        placeholder="Email address"
                        className="bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 w-full placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors text-sm"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-gray-400 mb-1">Alternative Provider</label>
                      <input
                        type="text"
                        value={svc.alternativeProvider || ""}
                        onChange={(e) => updateService(idx, "alternativeProvider", e.target.value)}
                        placeholder="Backup provider if primary unavailable"
                        className="bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 w-full placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={addService}
              className="mt-4 px-4 py-2 border border-dashed border-gray-500 hover:border-teal-500 text-gray-400 hover:text-teal-400 text-sm rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 w-full"
            >
              + Add Critical Service
            </button>
          </SectionCard>

          {/* ── Section 4: Insurance Details ──────────────── */}
          <SectionCard
            title="4. Insurance Details"
            collapsed={collapsedSections["insurance"]}
            onToggle={() => toggleSection("insurance")}
            count={insuranceDetails.length}
          >
            {insuranceDetails.length === 0 && (
              <p className="text-gray-400 text-sm mb-4">No insurance policies added yet.</p>
            )}

            <div className="space-y-4">
              {insuranceDetails.map((ins, idx) => (
                <div key={idx} className="bg-gray-700/50 border border-gray-600 rounded-lg p-4 relative">
                  <button
                    onClick={() => removeInsurance(idx)}
                    className="absolute top-2 right-2 text-gray-400 hover:text-red-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded"
                    aria-label={`Remove ${ins.type || "insurance"}`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pr-8">
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">Insurance Type</label>
                      <select
                        value={ins.type}
                        onChange={(e) => updateInsurance(idx, "type", e.target.value)}
                        className="bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors text-sm"
                      >
                        {INSURANCE_TYPE_OPTIONS.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">Provider</label>
                      <input
                        type="text"
                        value={ins.provider}
                        onChange={(e) => updateInsurance(idx, "provider", e.target.value)}
                        placeholder="Insurance provider"
                        className="bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 w-full placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">Policy Number</label>
                      <input
                        type="text"
                        value={ins.policyNumber || ""}
                        onChange={(e) => updateInsurance(idx, "policyNumber", e.target.value)}
                        placeholder="Policy number"
                        className="bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 w-full placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">Coverage Amount</label>
                      <input
                        type="text"
                        value={ins.coverage || ""}
                        onChange={(e) => updateInsurance(idx, "coverage", e.target.value)}
                        placeholder="e.g., $10,000,000"
                        className="bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 w-full placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">Expiry Date</label>
                      <input
                        type="date"
                        value={ins.expiryDate || ""}
                        onChange={(e) => updateInsurance(idx, "expiryDate", e.target.value)}
                        className="bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={addInsurance}
              className="mt-4 px-4 py-2 border border-dashed border-gray-500 hover:border-teal-500 text-gray-400 hover:text-teal-400 text-sm rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 w-full"
            >
              + Add Insurance Policy
            </button>
          </SectionCard>

          {/* ── Section 5: Risk Scenarios ─────────────────── */}
          <SectionCard
            title="5. Risk Scenarios"
            collapsed={collapsedSections["risks"]}
            onToggle={() => toggleSection("risks")}
            count={riskScenarios.length}
          >
            {riskScenarios.length === 0 && (
              <p className="text-gray-400 text-sm mb-4">No risk scenarios defined yet.</p>
            )}

            <div className="space-y-4">
              {riskScenarios.map((risk, idx) => (
                <div key={idx} className="bg-gray-700/50 border border-gray-600 rounded-lg p-4 relative">
                  <div className="flex items-center justify-between mb-3 pr-8">
                    <span className="text-sm font-medium text-white">
                      {risk.scenario || `Scenario ${idx + 1}`}
                    </span>
                    <Badge variant={getRiskBadgeVariant(risk.riskLevel)} size="xs">
                      {risk.riskLevel ? risk.riskLevel.charAt(0).toUpperCase() + risk.riskLevel.slice(1) : "N/A"}
                    </Badge>
                  </div>
                  <button
                    onClick={() => removeRiskScenario(idx)}
                    className="absolute top-2 right-2 text-gray-400 hover:text-red-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded"
                    aria-label={`Remove ${risk.scenario || "scenario"}`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-3">
                      <label className="block text-xs font-medium text-gray-400 mb-1">Scenario</label>
                      <input
                        type="text"
                        value={risk.scenario}
                        onChange={(e) => updateRiskScenario(idx, "scenario", e.target.value)}
                        placeholder="Describe the risk scenario"
                        className="bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 w-full placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">Likelihood</label>
                      <select
                        value={risk.likelihood}
                        onChange={(e) => updateRiskScenario(idx, "likelihood", e.target.value)}
                        className="bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors text-sm"
                      >
                        {LIKELIHOOD_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">Impact</label>
                      <select
                        value={risk.impact}
                        onChange={(e) => updateRiskScenario(idx, "impact", e.target.value)}
                        className="bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors text-sm"
                      >
                        {IMPACT_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">Recovery Time Objective</label>
                      <input
                        type="text"
                        value={risk.rto || ""}
                        onChange={(e) => updateRiskScenario(idx, "rto", e.target.value)}
                        placeholder="e.g., 4 hours, 1 day"
                        className="bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 w-full placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors text-sm"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <label className="block text-xs font-medium text-gray-400 mb-1">Mitigation Steps</label>
                      <textarea
                        value={risk.mitigationSteps || ""}
                        onChange={(e) => updateRiskScenario(idx, "mitigationSteps", e.target.value)}
                        rows={2}
                        placeholder="Steps to prevent or reduce the likelihood/impact"
                        className="bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 w-full placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors text-sm resize-none"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <label className="block text-xs font-medium text-gray-400 mb-1">Recovery Steps</label>
                      <textarea
                        value={risk.recoverySteps || ""}
                        onChange={(e) => updateRiskScenario(idx, "recoverySteps", e.target.value)}
                        rows={2}
                        placeholder="Steps to recover if the scenario occurs"
                        className="bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 w-full placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors text-sm resize-none"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={addRiskScenario}
              className="mt-4 px-4 py-2 border border-dashed border-gray-500 hover:border-teal-500 text-gray-400 hover:text-teal-400 text-sm rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 w-full"
            >
              + Add Risk Scenario
            </button>
          </SectionCard>

          {/* ── Section 6: Data Backup Procedures ─────────── */}
          <SectionCard
            title="6. Data Backup Procedures"
            collapsed={collapsedSections["backup"]}
            onToggle={() => toggleSection("backup")}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="backupMethod" className="block text-sm font-medium text-gray-300 mb-1">
                  Backup Method
                </label>
                <input
                  id="backupMethod"
                  type="text"
                  value={backupMethod}
                  onChange={(e) => setBackupMethod(e.target.value)}
                  placeholder="e.g., Cloud backup, Local NAS + offsite"
                  className="bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 w-full placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors"
                />
              </div>
              <div>
                <label htmlFor="backupFrequency" className="block text-sm font-medium text-gray-300 mb-1">
                  Frequency
                </label>
                <select
                  id="backupFrequency"
                  value={backupFrequency}
                  onChange={(e) => setBackupFrequency(e.target.value)}
                  className="bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors"
                >
                  <option value="">Select frequency</option>
                  {FREQUENCY_OPTIONS.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="backupLocation" className="block text-sm font-medium text-gray-300 mb-1">
                  Storage Location
                </label>
                <input
                  id="backupLocation"
                  type="text"
                  value={backupLocation}
                  onChange={(e) => setBackupLocation(e.target.value)}
                  placeholder="e.g., AWS Sydney region, offsite safe"
                  className="bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 w-full placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors"
                />
              </div>
              <div>
                <label htmlFor="backupResponsible" className="block text-sm font-medium text-gray-300 mb-1">
                  Responsible Person
                </label>
                <input
                  id="backupResponsible"
                  type="text"
                  value={backupResponsible}
                  onChange={(e) => setBackupResponsible(e.target.value)}
                  placeholder="Name of person responsible"
                  className="bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 w-full placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors"
                />
              </div>
              <div>
                <label htmlFor="backupLastTested" className="block text-sm font-medium text-gray-300 mb-1">
                  Last Tested Date
                </label>
                <input
                  id="backupLastTested"
                  type="date"
                  value={backupLastTested}
                  onChange={(e) => setBackupLastTested(e.target.value)}
                  className="bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors"
                />
              </div>
            </div>
          </SectionCard>

          {/* ── Section 7: Communication Plan ─────────────── */}
          <SectionCard
            title="7. Communication Plan"
            collapsed={collapsedSections["communication"]}
            onToggle={() => toggleSection("communication")}
          >
            <div className="space-y-4">
              <div>
                <label htmlFor="internalNotification" className="block text-sm font-medium text-gray-300 mb-1">
                  Internal Notification Procedure
                </label>
                <textarea
                  id="internalNotification"
                  value={internalNotification}
                  onChange={(e) => setInternalNotification(e.target.value)}
                  rows={4}
                  placeholder="Describe how internal staff will be notified during a disruption (e.g., phone tree, email blast, SMS alert system)"
                  className="bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 w-full placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors resize-none"
                />
              </div>
              <div>
                <label htmlFor="externalNotification" className="block text-sm font-medium text-gray-300 mb-1">
                  External Notification Procedure
                </label>
                <textarea
                  id="externalNotification"
                  value={externalNotification}
                  onChange={(e) => setExternalNotification(e.target.value)}
                  rows={4}
                  placeholder="Describe how participants, families, support coordinators, and NDIS Commission will be notified"
                  className="bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 w-full placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors resize-none"
                />
              </div>
              <div>
                <label htmlFor="mediaResponse" className="block text-sm font-medium text-gray-300 mb-1">
                  Media Response Plan
                </label>
                <textarea
                  id="mediaResponse"
                  value={mediaResponse}
                  onChange={(e) => setMediaResponse(e.target.value)}
                  rows={4}
                  placeholder="Describe the media response strategy, spokesperson designation, and approved communication channels"
                  className="bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 w-full placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors resize-none"
                />
              </div>
            </div>
          </SectionCard>

          {/* ── Section 8: Recovery Checklist ──────────────── */}
          <SectionCard
            title="8. Recovery Checklist"
            collapsed={collapsedSections["recovery"]}
            onToggle={() => toggleSection("recovery")}
            count={recoveryChecklist.length}
            extra={
              recoveryChecklist.length > 0 ? (
                <span className="text-sm text-gray-400">
                  {completedSteps}/{recoveryChecklist.length} completed
                </span>
              ) : null
            }
          >
            {recoveryChecklist.length === 0 && (
              <p className="text-gray-400 text-sm mb-4">No recovery steps defined yet.</p>
            )}

            <div className="space-y-3">
              {recoveryChecklist.map((step, idx) => (
                <div key={idx} className="bg-gray-700/50 border border-gray-600 rounded-lg p-4 relative">
                  <button
                    onClick={() => removeRecoveryStep(idx)}
                    className="absolute top-2 right-2 text-gray-400 hover:text-red-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded"
                    aria-label={`Remove step ${step.step || idx + 1}`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>

                  <div className="flex items-start gap-3 pr-8">
                    {/* Completed checkbox */}
                    <div className="pt-1">
                      <input
                        type="checkbox"
                        checked={step.completed || false}
                        onChange={(e) => updateRecoveryStep(idx, "completed", e.target.checked)}
                        className="w-5 h-5 rounded border-gray-500 text-teal-600 focus:ring-teal-600 bg-gray-700"
                        aria-label={`Mark step "${step.step}" as completed`}
                      />
                    </div>

                    <div className="flex-1 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-400 mb-1">Step</label>
                          <input
                            type="text"
                            value={step.step}
                            onChange={(e) => updateRecoveryStep(idx, "step", e.target.value)}
                            placeholder="Recovery step name"
                            className={`bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 w-full placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors text-sm ${
                              step.completed ? "line-through text-gray-400" : ""
                            }`}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-400 mb-1">Responsible</label>
                          <input
                            type="text"
                            value={step.responsible || ""}
                            onChange={(e) => updateRecoveryStep(idx, "responsible", e.target.value)}
                            placeholder="Person/role responsible"
                            className="bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 w-full placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors text-sm"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">Description</label>
                        <textarea
                          value={step.description || ""}
                          onChange={(e) => updateRecoveryStep(idx, "description", e.target.value)}
                          rows={2}
                          placeholder="Detailed description of this recovery step"
                          className="bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 w-full placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors text-sm resize-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={addRecoveryStep}
              className="mt-4 px-4 py-2 border border-dashed border-gray-500 hover:border-teal-500 text-gray-400 hover:text-teal-400 text-sm rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 w-full"
            >
              + Add Recovery Step
            </button>
          </SectionCard>
        </div>

        {/* Bottom Save Bar */}
        <div className="mt-8 flex items-center justify-between bg-gray-800 border border-gray-700 rounded-lg p-4">
          <p className="text-sm text-gray-400">
            Remember to save your changes regularly.
          </p>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-600 text-white font-medium rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
          >
            {saving ? "Saving..." : "Save Plan"}
          </button>
        </div>
      </main>
    </div>
  );
}

// ── Section Card Component ──────────────────────────────────

interface SectionCardProps {
  title: string;
  children: React.ReactNode;
  collapsed?: boolean;
  onToggle?: () => void;
  count?: number;
  extra?: React.ReactNode;
}

function SectionCard({ title, children, collapsed, onToggle, count, extra }: SectionCardProps) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-6 py-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 rounded-t-lg"
        aria-expanded={!collapsed}
      >
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          {count !== undefined && count > 0 && (
            <Badge variant="neutral" size="xs">{count}</Badge>
          )}
          {extra}
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${collapsed ? "" : "rotate-180"}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {!collapsed && <div className="px-6 pb-6">{children}</div>}
    </div>
  );
}

// ── Page Export ──────────────────────────────────────────────

function BlsGate({ children }: { children: React.ReactNode }) {
  const { organization, isLoading } = useOrganization();
  if (isLoading) return null;
  if (organization?.slug !== "better-living-solutions") {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header currentPage="compliance" />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-24">
            <h1 className="text-2xl font-bold text-white mb-2">Business Continuity Plan</h1>
            <p className="text-gray-400">This feature is not available for your organisation.</p>
          </div>
        </main>
      </div>
    );
  }
  return <>{children}</>;
}

export default function BusinessContinuityPage() {
  return (
    <RequireAuth>
      <BlsGate>
        <BusinessContinuityContent />
      </BlsGate>
    </RequireAuth>
  );
}
