"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import Link from "next/link";
import Header from "@/components/Header";
import { RequireAuth } from "@/components/RequireAuth";
import Badge from "@/components/ui/Badge";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import { formatDate } from "@/utils/format";
import { generateEmergencyPlanPdf } from "@/utils/emergencyPlanPdf";
import { useOrganization } from "@/contexts/OrganizationContext";

const STATUS_BADGE: Record<string, { variant: "success" | "warning" | "error" | "neutral"; label: string }> = {
  active: { variant: "success", label: "Active" },
  draft: { variant: "neutral", label: "Draft" },
  under_review: { variant: "warning", label: "Under Review" },
  archived: { variant: "error", label: "Archived" },
};

const PROCEDURE_TYPES = [
  { value: "fire", label: "Fire" },
  { value: "flood", label: "Flood" },
  { value: "storm", label: "Storm" },
  { value: "medical_emergency", label: "Medical Emergency" },
  { value: "power_outage", label: "Power Outage" },
  { value: "gas_leak", label: "Gas Leak" },
  { value: "security_threat", label: "Security Threat" },
  { value: "other", label: "Other" },
];

interface ManagementContact {
  name: string;
  role: string;
  phone: string;
  email?: string;
}

interface EmergencyContact {
  service: string;
  phone: string;
  notes?: string;
}

interface EmergencyKitItem {
  item: string;
  location?: string;
  lastChecked?: string;
}

interface EmergencyTeamMember {
  name: string;
  role: string;
  responsibilities?: string;
  phone: string;
}

interface EmergencyProcedure {
  type: string;
  steps: string;
}

function EmergencyPlanDetailContent() {
  const params = useParams();
  const router = useRouter();
  const planId = params.id as Id<"emergencyManagementPlans">;
  const { confirm, alert: alertDialog } = useConfirmDialog();

  const [user, setUser] = useState<{ id: string; role: string } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  // Form state for editing
  const [managementContacts, setManagementContacts] = useState<ManagementContact[]>([]);
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const [assemblyPoint, setAssemblyPoint] = useState("");
  const [evacuationProcedure, setEvacuationProcedure] = useState("");
  const [emergencyKit, setEmergencyKit] = useState<EmergencyKitItem[]>([]);
  const [emergencyTeam, setEmergencyTeam] = useState<EmergencyTeamMember[]>([]);
  const [procedures, setProcedures] = useState<EmergencyProcedure[]>([]);
  const [participantSpecificNotes, setParticipantSpecificNotes] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("sda_user");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        // Invalid data
      }
    }
  }, []);

  const plan = useQuery(
    api.emergencyManagementPlans.getById,
    user ? { userId: user.id as Id<"users">, id: planId } : "skip"
  );

  const updatePlan = useMutation(api.emergencyManagementPlans.update);
  const updateStatus = useMutation(api.emergencyManagementPlans.updateStatus);
  const removePlan = useMutation(api.emergencyManagementPlans.remove);

  // Populate edit form when plan loads or when entering edit mode
  const populateForm = () => {
    if (!plan) return;
    setManagementContacts(plan.managementContacts?.map((c) => ({ ...c })) || []);
    setEmergencyContacts(plan.emergencyContacts?.map((c) => ({ ...c })) || []);
    setAssemblyPoint(plan.assemblyPoint || "");
    setEvacuationProcedure(plan.evacuationProcedure || "");
    setEmergencyKit(plan.emergencyKit?.map((k) => ({ ...k })) || []);
    setEmergencyTeam(plan.emergencyTeam?.map((t) => ({ ...t })) || []);
    setProcedures(plan.procedures?.map((p) => ({ ...p })) || []);
    setParticipantSpecificNotes(plan.participantSpecificNotes || "");
  };

  const handleStartEdit = () => {
    populateForm();
    setIsEditing(true);
    setError("");
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setError("");
  };

  const handleSave = async () => {
    if (!user || !plan) return;
    setIsSaving(true);
    setError("");

    try {
      await updatePlan({
        userId: user.id as Id<"users">,
        id: planId,
        managementContacts,
        emergencyContacts,
        assemblyPoint: assemblyPoint || undefined,
        evacuationProcedure: evacuationProcedure || undefined,
        emergencyKit,
        emergencyTeam,
        procedures,
        participantSpecificNotes: participantSpecificNotes || undefined,
      });
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message || "Failed to update emergency plan");
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: "draft" | "active" | "under_review" | "archived") => {
    if (!user) return;
    try {
      await updateStatus({
        userId: user.id as Id<"users">,
        id: planId,
        status: newStatus,
      });
    } catch (err: any) {
      await alertDialog({ title: "Error", message: err.message || "Failed to update status" });
    }
  };

  const handleDelete = async () => {
    if (!user) return;
    const confirmed = await confirm({
      title: "Delete Emergency Plan",
      message: "Are you sure you want to permanently delete this emergency management plan? This action cannot be undone.",
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!confirmed) return;
    try {
      await removePlan({
        userId: user.id as Id<"users">,
        id: planId,
      });
      router.push("/compliance/emergency-plans");
    } catch (err: any) {
      await alertDialog({ title: "Error", message: err.message || "Failed to delete plan" });
    }
  };

  const handleExportPdf = () => {
    if (!plan || !plan.property) return;
    generateEmergencyPlanPdf(
      {
        version: plan.version || "1.0",
        status: plan.status,
        lastReviewedDate: plan.lastReviewDate,
        nextReviewDate: plan.nextReviewDate,
        managementContacts: plan.managementContacts || [],
        emergencyContacts: plan.emergencyContacts || [],
        assemblyPoint: plan.assemblyPoint,
        evacuationProcedure: plan.evacuationProcedure,
        emergencyKit: plan.emergencyKit || [],
        emergencyTeam: plan.emergencyTeam || [],
        procedures: plan.procedures || [],
        participantNotes: plan.participantSpecificNotes,
      },
      {
        propertyName: plan.property.propertyName,
        addressLine1: plan.property.addressLine1,
        suburb: plan.property.suburb,
        state: plan.property.state,
        postcode: plan.property.postcode,
      },
      "MySDAManager"
    );
  };

  // --- Dynamic row helpers ---
  const addManagementContact = () =>
    setManagementContacts([...managementContacts, { name: "", role: "", phone: "", email: "" }]);
  const removeManagementContact = (i: number) =>
    setManagementContacts(managementContacts.filter((_, idx) => idx !== i));
  const updateManagementContact = (i: number, field: keyof ManagementContact, value: string) =>
    setManagementContacts(managementContacts.map((c, idx) => (idx === i ? { ...c, [field]: value } : c)));

  const addEmergencyContact = () =>
    setEmergencyContacts([...emergencyContacts, { service: "", phone: "", notes: "" }]);
  const removeEmergencyContact = (i: number) =>
    setEmergencyContacts(emergencyContacts.filter((_, idx) => idx !== i));
  const updateEmergencyContact = (i: number, field: keyof EmergencyContact, value: string) =>
    setEmergencyContacts(emergencyContacts.map((c, idx) => (idx === i ? { ...c, [field]: value } : c)));

  const addKitItem = () =>
    setEmergencyKit([...emergencyKit, { item: "", location: "", lastChecked: "" }]);
  const removeKitItem = (i: number) =>
    setEmergencyKit(emergencyKit.filter((_, idx) => idx !== i));
  const updateKitItem = (i: number, field: keyof EmergencyKitItem, value: string) =>
    setEmergencyKit(emergencyKit.map((k, idx) => (idx === i ? { ...k, [field]: value } : k)));

  const addTeamMember = () =>
    setEmergencyTeam([...emergencyTeam, { name: "", role: "", responsibilities: "", phone: "" }]);
  const removeTeamMember = (i: number) =>
    setEmergencyTeam(emergencyTeam.filter((_, idx) => idx !== i));
  const updateTeamMember = (i: number, field: keyof EmergencyTeamMember, value: string) =>
    setEmergencyTeam(emergencyTeam.map((t, idx) => (idx === i ? { ...t, [field]: value } : t)));

  const addProcedure = () =>
    setProcedures([...procedures, { type: "other", steps: "" }]);
  const removeProcedure = (i: number) =>
    setProcedures(procedures.filter((_, idx) => idx !== i));
  const updateProcedure = (i: number, field: keyof EmergencyProcedure, value: string) =>
    setProcedures(procedures.map((p, idx) => (idx === i ? { ...p, [field]: value } : p)));

  // Loading
  if (plan === undefined) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header currentPage="compliance" />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-600" />
        </div>
      </div>
    );
  }

  // Not found
  if (plan === null) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header currentPage="compliance" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12 bg-gray-800 rounded-lg">
            <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <p className="text-gray-400 mb-4">Emergency management plan not found</p>
            <Link
              href="/compliance/emergency-plans"
              className="inline-block px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors"
            >
              Back to Emergency Plans
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const statusInfo = STATUS_BADGE[plan.status] || { variant: "neutral" as const, label: plan.status };
  const canEdit = user?.role === "admin" || user?.role === "property_manager";

  const getProcedureLabel = (type: string) => {
    const found = PROCEDURE_TYPES.find((pt) => pt.value === type);
    return found ? found.label : type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <Header currentPage="compliance" />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb + Actions */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
          <div>
            <Link
              href="/compliance/emergency-plans"
              className="text-teal-500 hover:text-teal-400 text-sm mb-2 inline-block focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 rounded"
            >
              &larr; Back to Emergency Plans
            </Link>
            <h1 className="text-2xl font-bold text-white">
              {isEditing ? "Edit Emergency Plan" : "Emergency Management Plan"}
            </h1>
            {!isEditing && (
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={statusInfo.variant} size="sm" dot>
                  {statusInfo.label}
                </Badge>
                <span className="text-gray-400 text-sm">v{plan.version || "1.0"}</span>
              </div>
            )}
          </div>

          {/* Action buttons */}
          {!isEditing && canEdit && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleStartEdit}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
              >
                Edit
              </button>

              {/* Status dropdown */}
              <select
                value={plan.status}
                onChange={(e) =>
                  handleStatusChange(e.target.value as "draft" | "active" | "under_review" | "archived")
                }
                className="px-3 py-2 bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
                aria-label="Change plan status"
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="under_review">Under Review</option>
                <option value="archived">Archived</option>
              </select>

              <button
                onClick={handleExportPdf}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
              >
                Export PDF
              </button>

              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 text-sm rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              >
                Delete
              </button>
            </div>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg mb-6" role="alert">
            {error}
          </div>
        )}

        {/* ===== EDIT MODE ===== */}
        {isEditing ? (
          <div className="space-y-6">
            {/* Section 1: Property Info (read-only) */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Property Information</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Property</p>
                  <p className="text-sm text-white">
                    {plan.property?.propertyName || plan.property?.addressLine1 || "Unknown"}
                  </p>
                </div>
                {plan.dwelling && (
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Dwelling</p>
                    <p className="text-sm text-white">
                      {plan.dwelling.dwellingName || "Dwelling"}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Section 2: Management Contacts */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Management Contacts</h2>
                <button
                  type="button"
                  onClick={addManagementContact}
                  className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white text-sm rounded transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                >
                  + Add
                </button>
              </div>
              {managementContacts.length === 0 ? (
                <p className="text-gray-400 text-sm">No management contacts added.</p>
              ) : (
                <div className="space-y-4">
                  {managementContacts.map((contact, i) => (
                    <div key={i} className="bg-gray-700/50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm text-gray-300 font-medium">Contact {i + 1}</span>
                        <button
                          type="button"
                          onClick={() => removeManagementContact(i)}
                          className="text-red-400 hover:text-red-300 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Name</label>
                          <input
                            type="text"
                            value={contact.name}
                            onChange={(e) => updateManagementContact(i, "name", e.target.value)}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
                            placeholder="Full name"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Role</label>
                          <input
                            type="text"
                            value={contact.role}
                            onChange={(e) => updateManagementContact(i, "role", e.target.value)}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
                            placeholder="e.g. Property Manager"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Phone</label>
                          <input
                            type="tel"
                            value={contact.phone}
                            onChange={(e) => updateManagementContact(i, "phone", e.target.value)}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
                            placeholder="04XX XXX XXX"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Email</label>
                          <input
                            type="email"
                            value={contact.email || ""}
                            onChange={(e) => updateManagementContact(i, "email", e.target.value)}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
                            placeholder="email@example.com"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section 3: Emergency Contacts */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Emergency Contacts</h2>
                <button
                  type="button"
                  onClick={addEmergencyContact}
                  className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white text-sm rounded transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                >
                  + Add
                </button>
              </div>
              {emergencyContacts.length === 0 ? (
                <p className="text-gray-400 text-sm">No emergency contacts added.</p>
              ) : (
                <div className="space-y-4">
                  {emergencyContacts.map((contact, i) => (
                    <div key={i} className="bg-gray-700/50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm text-gray-300 font-medium">Service {i + 1}</span>
                        <button
                          type="button"
                          onClick={() => removeEmergencyContact(i)}
                          className="text-red-400 hover:text-red-300 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Service</label>
                          <input
                            type="text"
                            value={contact.service}
                            onChange={(e) => updateEmergencyContact(i, "service", e.target.value)}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
                            placeholder="e.g. Emergency Services"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Phone</label>
                          <input
                            type="tel"
                            value={contact.phone}
                            onChange={(e) => updateEmergencyContact(i, "phone", e.target.value)}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
                            placeholder="000"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Notes</label>
                          <input
                            type="text"
                            value={contact.notes || ""}
                            onChange={(e) => updateEmergencyContact(i, "notes", e.target.value)}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
                            placeholder="Optional notes"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section 4: Evacuation */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Evacuation Details</h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="edit-assembly" className="block text-sm font-medium text-gray-300 mb-1">
                    Assembly Point
                  </label>
                  <input
                    id="edit-assembly"
                    type="text"
                    value={assemblyPoint}
                    onChange={(e) => setAssemblyPoint(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                    placeholder="e.g. Front driveway, away from building"
                  />
                </div>
                <div>
                  <label htmlFor="edit-evacuation" className="block text-sm font-medium text-gray-300 mb-1">
                    Evacuation Procedure
                  </label>
                  <textarea
                    id="edit-evacuation"
                    value={evacuationProcedure}
                    onChange={(e) => setEvacuationProcedure(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                    placeholder="Describe step-by-step evacuation procedure..."
                  />
                </div>
              </div>
            </div>

            {/* Section 5: Emergency Kit */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Emergency Kit</h2>
                <button
                  type="button"
                  onClick={addKitItem}
                  className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white text-sm rounded transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                >
                  + Add Item
                </button>
              </div>
              {emergencyKit.length === 0 ? (
                <p className="text-gray-400 text-sm">No emergency kit items added.</p>
              ) : (
                <div className="space-y-4">
                  {emergencyKit.map((kitItem, i) => (
                    <div key={i} className="bg-gray-700/50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm text-gray-300 font-medium">Item {i + 1}</span>
                        <button
                          type="button"
                          onClick={() => removeKitItem(i)}
                          className="text-red-400 hover:text-red-300 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Item</label>
                          <input
                            type="text"
                            value={kitItem.item}
                            onChange={(e) => updateKitItem(i, "item", e.target.value)}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
                            placeholder="e.g. First Aid Kit"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Location</label>
                          <input
                            type="text"
                            value={kitItem.location || ""}
                            onChange={(e) => updateKitItem(i, "location", e.target.value)}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
                            placeholder="e.g. Kitchen cupboard"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Last Checked</label>
                          <input
                            type="date"
                            value={kitItem.lastChecked || ""}
                            onChange={(e) => updateKitItem(i, "lastChecked", e.target.value)}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section 6: Emergency Team */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Emergency Team</h2>
                <button
                  type="button"
                  onClick={addTeamMember}
                  className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white text-sm rounded transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                >
                  + Add Member
                </button>
              </div>
              {emergencyTeam.length === 0 ? (
                <p className="text-gray-400 text-sm">No emergency team members added.</p>
              ) : (
                <div className="space-y-4">
                  {emergencyTeam.map((member, i) => (
                    <div key={i} className="bg-gray-700/50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm text-gray-300 font-medium">Member {i + 1}</span>
                        <button
                          type="button"
                          onClick={() => removeTeamMember(i)}
                          className="text-red-400 hover:text-red-300 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Name</label>
                          <input
                            type="text"
                            value={member.name}
                            onChange={(e) => updateTeamMember(i, "name", e.target.value)}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
                            placeholder="Full name"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Role</label>
                          <input
                            type="text"
                            value={member.role}
                            onChange={(e) => updateTeamMember(i, "role", e.target.value)}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
                            placeholder="e.g. Fire Warden"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Responsibilities</label>
                          <input
                            type="text"
                            value={member.responsibilities || ""}
                            onChange={(e) => updateTeamMember(i, "responsibilities", e.target.value)}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
                            placeholder="Key responsibilities"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Phone</label>
                          <input
                            type="tel"
                            value={member.phone}
                            onChange={(e) => updateTeamMember(i, "phone", e.target.value)}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
                            placeholder="04XX XXX XXX"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section 7: Procedures */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Emergency Procedures</h2>
                <button
                  type="button"
                  onClick={addProcedure}
                  className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white text-sm rounded transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                >
                  + Add Procedure
                </button>
              </div>
              {procedures.length === 0 ? (
                <p className="text-gray-400 text-sm">No procedures added.</p>
              ) : (
                <div className="space-y-4">
                  {procedures.map((proc, i) => (
                    <div key={i} className="bg-gray-700/50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm text-gray-300 font-medium">Procedure {i + 1}</span>
                        <button
                          type="button"
                          onClick={() => removeProcedure(i)}
                          className="text-red-400 hover:text-red-300 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Type</label>
                          <select
                            value={proc.type}
                            onChange={(e) => updateProcedure(i, "type", e.target.value)}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
                          >
                            {PROCEDURE_TYPES.map((pt) => (
                              <option key={pt.value} value={pt.value}>
                                {pt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Steps</label>
                          <textarea
                            value={proc.steps}
                            onChange={(e) => updateProcedure(i, "steps", e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
                            placeholder="Describe the step-by-step procedure..."
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section 8: Participant Notes */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Participant-Specific Notes</h2>
              <textarea
                value={participantSpecificNotes}
                onChange={(e) => setParticipantSpecificNotes(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                placeholder="Any participant-specific considerations (mobility requirements, sensory needs, communication preferences, etc.)..."
              />
            </div>

            {/* Save / Cancel buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-600 text-white rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
              <button
                onClick={handleCancelEdit}
                disabled={isSaving}
                className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          /* ===== READ-ONLY VIEW ===== */
          <div className="space-y-6">
            {/* Section 1: Property Information */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Property Information</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
                <DetailField
                  label="Property"
                  value={plan.property?.propertyName || plan.property?.addressLine1 || "Unknown"}
                />
                {plan.property?.addressLine1 && (
                  <DetailField
                    label="Address"
                    value={[plan.property.addressLine1, plan.property.suburb, plan.property.state, plan.property.postcode].filter(Boolean).join(", ")}
                  />
                )}
                {plan.dwelling && (
                  <DetailField
                    label="Dwelling"
                    value={plan.dwelling.dwellingName || "Dwelling"}
                  />
                )}
                <DetailField label="Last Reviewed" value={formatDate(plan.lastReviewDate)} />
                <DetailField label="Next Review" value={formatDate(plan.nextReviewDate)} />
              </div>
            </div>

            {/* Section 2: Management Contacts */}
            {plan.managementContacts && plan.managementContacts.length > 0 && (
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Management Contacts</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" role="table">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th scope="col" className="text-left py-2 text-gray-400 font-medium">Name</th>
                        <th scope="col" className="text-left py-2 text-gray-400 font-medium">Role</th>
                        <th scope="col" className="text-left py-2 text-gray-400 font-medium">Phone</th>
                        <th scope="col" className="text-left py-2 text-gray-400 font-medium">Email</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {plan.managementContacts.map((c, i) => (
                        <tr key={i}>
                          <td className="py-2 text-white">{c.name || "-"}</td>
                          <td className="py-2 text-gray-300">{c.role || "-"}</td>
                          <td className="py-2 text-gray-300">{c.phone || "-"}</td>
                          <td className="py-2 text-gray-300">{c.email || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Section 3: Emergency Contacts */}
            {plan.emergencyContacts && plan.emergencyContacts.length > 0 && (
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-red-400 mb-4">Emergency Contacts</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" role="table">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th scope="col" className="text-left py-2 text-gray-400 font-medium">Service</th>
                        <th scope="col" className="text-left py-2 text-gray-400 font-medium">Phone</th>
                        <th scope="col" className="text-left py-2 text-gray-400 font-medium">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {plan.emergencyContacts.map((c, i) => (
                        <tr key={i}>
                          <td className="py-2 text-white">{c.service || "-"}</td>
                          <td className="py-2 text-gray-300 font-mono">{c.phone || "-"}</td>
                          <td className="py-2 text-gray-300">{c.notes || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Section 4: Evacuation */}
            {(plan.assemblyPoint || plan.evacuationProcedure) && (
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Evacuation Details</h2>
                <div className="space-y-4">
                  {plan.assemblyPoint && (
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Assembly Point</p>
                      <p className="text-sm text-white">{plan.assemblyPoint}</p>
                    </div>
                  )}
                  {plan.evacuationProcedure && (
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Evacuation Procedure</p>
                      <p className="text-sm text-white whitespace-pre-wrap">{plan.evacuationProcedure}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Section 5: Emergency Kit */}
            {plan.emergencyKit && plan.emergencyKit.length > 0 && (
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Emergency Kit</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" role="table">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th scope="col" className="text-left py-2 text-gray-400 font-medium">Item</th>
                        <th scope="col" className="text-left py-2 text-gray-400 font-medium">Location</th>
                        <th scope="col" className="text-left py-2 text-gray-400 font-medium">Last Checked</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {plan.emergencyKit.map((k, i) => (
                        <tr key={i}>
                          <td className="py-2 text-white">{k.item || "-"}</td>
                          <td className="py-2 text-gray-300">{k.location || "-"}</td>
                          <td className="py-2 text-gray-300">{k.lastChecked ? formatDate(k.lastChecked) : "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Section 6: Emergency Team */}
            {plan.emergencyTeam && plan.emergencyTeam.length > 0 && (
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Emergency Team</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" role="table">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th scope="col" className="text-left py-2 text-gray-400 font-medium">Name</th>
                        <th scope="col" className="text-left py-2 text-gray-400 font-medium">Role</th>
                        <th scope="col" className="text-left py-2 text-gray-400 font-medium">Responsibilities</th>
                        <th scope="col" className="text-left py-2 text-gray-400 font-medium">Phone</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {plan.emergencyTeam.map((t, i) => (
                        <tr key={i}>
                          <td className="py-2 text-white">{t.name || "-"}</td>
                          <td className="py-2 text-gray-300">{t.role || "-"}</td>
                          <td className="py-2 text-gray-300">{t.responsibilities || "-"}</td>
                          <td className="py-2 text-gray-300">{t.phone || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Section 7: Emergency Procedures */}
            {plan.procedures && plan.procedures.length > 0 && (
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Emergency Procedures</h2>
                <div className="space-y-4">
                  {plan.procedures.map((proc, i) => (
                    <div key={i} className="bg-gray-700/50 rounded-lg p-4">
                      <h3 className="text-sm font-semibold text-teal-400 mb-2">
                        {getProcedureLabel(proc.type)}
                      </h3>
                      <p className="text-sm text-gray-300 whitespace-pre-wrap">
                        {proc.steps || "No steps defined"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Section 8: Participant Notes */}
            {plan.participantSpecificNotes && (
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Participant-Specific Notes</h2>
                <p className="text-sm text-gray-300 whitespace-pre-wrap">{plan.participantSpecificNotes}</p>
              </div>
            )}

            {/* Metadata */}
            <div className="text-xs text-gray-400 flex items-center gap-4">
              <span>Created: {new Date(plan.createdAt).toLocaleDateString("en-AU")}</span>
              <span>Updated: {new Date(plan.updatedAt).toLocaleDateString("en-AU")}</span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-sm text-gray-400 mb-1">{label}</p>
      <p className="text-sm text-white">{value || <span className="text-gray-400">-</span>}</p>
    </div>
  );
}

function BlsGate({ children }: { children: React.ReactNode }) {
  const { organization, isLoading } = useOrganization();
  if (isLoading) return null;
  if (organization?.slug !== "better-living-solutions") {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header currentPage="compliance" />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-24">
            <h1 className="text-2xl font-bold text-white mb-2">Emergency Plan Details</h1>
            <p className="text-gray-400">This feature is not available for your organisation.</p>
          </div>
        </main>
      </div>
    );
  }
  return <>{children}</>;
}

export default function EmergencyPlanDetailPage() {
  return (
    <RequireAuth>
      <BlsGate>
        <EmergencyPlanDetailContent />
      </BlsGate>
    </RequireAuth>
  );
}
