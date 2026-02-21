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
import { formatDate, formatStatus } from "@/utils/format";

const CERT_TYPE_LABELS: Record<string, string> = {
  ndis_practice_standards: "NDIS Practice Standards",
  ndis_verification_audit: "NDIS Verification Audit",
  sda_design_standard: "SDA Design Standard",
  sda_registration: "SDA Registration",
  ndis_worker_screening: "Worker Screening",
  fire_safety: "Fire Safety",
  building_compliance: "Building Compliance",
  other: "Other",
};

const STATUS_BADGE: Record<string, { variant: "success" | "warning" | "error" | "purple"; label: string }> = {
  current: { variant: "success", label: "Current" },
  expiring_soon: { variant: "warning", label: "Expiring Soon" },
  expired: { variant: "error", label: "Expired" },
  pending_renewal: { variant: "purple", label: "Pending Renewal" },
};

const AUDIT_OUTCOME_BADGE: Record<string, { variant: "success" | "warning" | "error" | "info"; label: string }> = {
  pass: { variant: "success", label: "Pass" },
  conditional_pass: { variant: "warning", label: "Conditional Pass" },
  fail: { variant: "error", label: "Fail" },
  pending: { variant: "info", label: "Pending" },
};

interface EditFormData {
  certificationName: string;
  certifyingBody: string;
  certificateNumber: string;
  issueDate: string;
  expiryDate: string;
  lastAuditDate: string;
  nextAuditDate: string;
  auditorName: string;
  auditOutcome: string;
  notes: string;
}

function CertificationDetailContent() {
  const params = useParams();
  const router = useRouter();
  const certId = params.id as Id<"complianceCertifications">;

  const [userId, setUserId] = useState<Id<"users"> | null>(null);
  const [userRole, setUserRole] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [error, setError] = useState("");
  const [editForm, setEditForm] = useState<EditFormData>({
    certificationName: "",
    certifyingBody: "",
    certificateNumber: "",
    issueDate: "",
    expiryDate: "",
    lastAuditDate: "",
    nextAuditDate: "",
    auditorName: "",
    auditOutcome: "",
    notes: "",
  });

  useEffect(() => {
    const storedUser = localStorage.getItem("sda_user");
    if (!storedUser) {
      router.push("/login");
      return;
    }
    const user = JSON.parse(storedUser);
    setUserId(user.id as Id<"users">);
    setUserRole(user.role || "");
  }, [router]);

  const cert = useQuery(api.complianceCertifications.getById, userId ? { certificationId: certId, userId } : "skip");
  const updateCert = useMutation(api.complianceCertifications.update);
  const removeCert = useMutation(api.complianceCertifications.remove);

  const canEdit = userRole === "admin" || userRole === "property_manager";

  const daysUntilExpiry = (expiryDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const handleStartEdit = () => {
    if (!cert) return;
    setEditForm({
      certificationName: cert.certificationName || "",
      certifyingBody: cert.certifyingBody || "",
      certificateNumber: cert.certificateNumber || "",
      issueDate: cert.issueDate || "",
      expiryDate: cert.expiryDate || "",
      lastAuditDate: cert.lastAuditDate || "",
      nextAuditDate: cert.nextAuditDate || "",
      auditorName: cert.auditorName || "",
      auditOutcome: cert.auditOutcome || "",
      notes: cert.notes || "",
    });
    setIsEditing(true);
    setError("");
  };

  const handleSave = async () => {
    if (!userId || !cert) return;
    setIsSaving(true);
    setError("");

    try {
      await updateCert({
        userId,
        certificationId: certId,
        certificationName: editForm.certificationName || undefined,
        certifyingBody: editForm.certifyingBody || undefined,
        certificateNumber: editForm.certificateNumber || undefined,
        issueDate: editForm.issueDate || undefined,
        expiryDate: editForm.expiryDate || undefined,
        lastAuditDate: editForm.lastAuditDate || undefined,
        nextAuditDate: editForm.nextAuditDate || undefined,
        auditorName: editForm.auditorName || undefined,
        auditOutcome: editForm.auditOutcome
          ? (editForm.auditOutcome as "pass" | "conditional_pass" | "fail" | "pending")
          : undefined,
        notes: editForm.notes || undefined,
      });
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message || "Failed to update certification");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!userId) return;
    try {
      await removeCert({ userId, certificationId: certId });
      router.push("/compliance/certifications");
    } catch (err: any) {
      setError(err.message || "Failed to delete certification");
      setDeleteConfirm(false);
    }
  };

  // Loading
  if (cert === undefined) {
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
  if (cert === null) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header currentPage="compliance" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12 bg-gray-800 rounded-lg">
            <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <p className="text-gray-400 mb-4">Certification not found</p>
            <Link
              href="/compliance/certifications"
              className="inline-block px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg transition-colors"
            >
              Back to Certifications
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const statusInfo = STATUS_BADGE[cert.status] || { variant: "neutral" as const, label: formatStatus(cert.status) };
  const days = daysUntilExpiry(cert.expiryDate);

  return (
    <div className="min-h-screen bg-gray-900">
      <Header currentPage="compliance" />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb + Actions */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <div>
            <Link
              href="/compliance/certifications"
              className="text-teal-500 hover:text-teal-400 text-sm mb-2 inline-block focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 rounded"
            >
              &larr; Back to Certifications
            </Link>
            <h1 className="text-2xl font-bold text-white">
              {isEditing ? "Edit Certification" : cert.certificationName}
            </h1>
            {!isEditing && (
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={statusInfo.variant} size="sm" dot>
                  {statusInfo.label}
                </Badge>
                <span className="text-gray-400 text-sm">
                  {CERT_TYPE_LABELS[cert.certificationType] || formatStatus(cert.certificationType)}
                </span>
              </div>
            )}
          </div>

          {/* Action buttons */}
          {!isEditing && canEdit && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleStartEdit}
                className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white text-sm rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
              >
                Edit
              </button>
              {deleteConfirm ? (
                <div className="flex items-center gap-2">
                  <span className="text-red-400 text-sm">Confirm delete?</span>
                  <button
                    onClick={handleDelete}
                    className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                  >
                    Yes, Delete
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(false)}
                    className="px-3 py-2 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setDeleteConfirm(true)}
                  className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 text-sm rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                >
                  Delete
                </button>
              )}
            </div>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg mb-6" role="alert">
            {error}
          </div>
        )}

        {/* Expiry warning banner */}
        {!isEditing && (cert.status === "expired" || cert.status === "expiring_soon") && (
          <div
            className={`rounded-lg p-4 mb-6 flex items-center gap-3 ${
              cert.status === "expired"
                ? "bg-red-900/30 border border-red-600/50"
                : "bg-yellow-900/30 border border-yellow-600/50"
            }`}
          >
            <svg className="w-5 h-5 flex-shrink-0 text-current" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <p className={`font-medium ${cert.status === "expired" ? "text-red-400" : "text-yellow-400"}`}>
                {cert.status === "expired"
                  ? `This certification expired ${Math.abs(days)} day${Math.abs(days) !== 1 ? "s" : ""} ago`
                  : `This certification expires in ${days} day${days !== 1 ? "s" : ""}`}
              </p>
              <p className="text-gray-400 text-sm mt-0.5">
                Expiry date: {formatDate(cert.expiryDate)}
              </p>
            </div>
          </div>
        )}

        {/* Edit Mode Form */}
        {isEditing ? (
          <div className="bg-gray-800 rounded-lg p-6 space-y-6">
            {/* Certification Name */}
            <div>
              <label htmlFor="edit-name" className="block text-sm font-medium text-gray-300 mb-1">
                Certification Name
              </label>
              <input
                id="edit-name"
                type="text"
                value={editForm.certificationName}
                onChange={(e) => setEditForm({ ...editForm, certificationName: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors"
              />
            </div>

            {/* Certifying Body & Certificate Number */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="edit-body" className="block text-sm font-medium text-gray-300 mb-1">
                  Certifying Body
                </label>
                <input
                  id="edit-body"
                  type="text"
                  value={editForm.certifyingBody}
                  onChange={(e) => setEditForm({ ...editForm, certifyingBody: e.target.value })}
                  placeholder="e.g., SAI Global, BSI"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors"
                />
              </div>
              <div>
                <label htmlFor="edit-number" className="block text-sm font-medium text-gray-300 mb-1">
                  Certificate Number
                </label>
                <input
                  id="edit-number"
                  type="text"
                  value={editForm.certificateNumber}
                  onChange={(e) => setEditForm({ ...editForm, certificateNumber: e.target.value })}
                  placeholder="e.g., CERT-2024-12345"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors"
                />
              </div>
            </div>

            {/* Issue & Expiry Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="edit-issue" className="block text-sm font-medium text-gray-300 mb-1">
                  Issue Date
                </label>
                <input
                  id="edit-issue"
                  type="date"
                  value={editForm.issueDate}
                  onChange={(e) => setEditForm({ ...editForm, issueDate: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors"
                />
              </div>
              <div>
                <label htmlFor="edit-expiry" className="block text-sm font-medium text-gray-300 mb-1">
                  Expiry Date
                </label>
                <input
                  id="edit-expiry"
                  type="date"
                  value={editForm.expiryDate}
                  onChange={(e) => setEditForm({ ...editForm, expiryDate: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors"
                />
                <p className="mt-1 text-xs text-gray-400">
                  Status will auto-recalculate based on expiry date
                </p>
              </div>
            </div>

            {/* Audit Section */}
            <div className="border-t border-gray-700 pt-4">
              <h3 className="text-lg font-medium text-white mb-4">Audit Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="edit-last-audit" className="block text-sm font-medium text-gray-300 mb-1">
                    Last Audit Date
                  </label>
                  <input
                    id="edit-last-audit"
                    type="date"
                    value={editForm.lastAuditDate}
                    onChange={(e) => setEditForm({ ...editForm, lastAuditDate: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors"
                  />
                </div>
                <div>
                  <label htmlFor="edit-next-audit" className="block text-sm font-medium text-gray-300 mb-1">
                    Next Audit Date
                  </label>
                  <input
                    id="edit-next-audit"
                    type="date"
                    value={editForm.nextAuditDate}
                    onChange={(e) => setEditForm({ ...editForm, nextAuditDate: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors"
                  />
                </div>
                <div>
                  <label htmlFor="edit-auditor" className="block text-sm font-medium text-gray-300 mb-1">
                    Auditor Name
                  </label>
                  <input
                    id="edit-auditor"
                    type="text"
                    value={editForm.auditorName}
                    onChange={(e) => setEditForm({ ...editForm, auditorName: e.target.value })}
                    placeholder="Name of auditor/assessor"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors"
                  />
                </div>
                <div>
                  <label htmlFor="edit-outcome" className="block text-sm font-medium text-gray-300 mb-1">
                    Audit Outcome
                  </label>
                  <select
                    id="edit-outcome"
                    value={editForm.auditOutcome}
                    onChange={(e) => setEditForm({ ...editForm, auditOutcome: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors"
                  >
                    <option value="">No outcome recorded</option>
                    <option value="pass">Pass</option>
                    <option value="conditional_pass">Conditional Pass</option>
                    <option value="fail">Fail</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label htmlFor="edit-notes" className="block text-sm font-medium text-gray-300 mb-1">
                Notes
              </label>
              <textarea
                id="edit-notes"
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                rows={3}
                placeholder="Any additional notes..."
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors"
              />
            </div>

            {/* Save / Cancel */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-2 bg-teal-700 hover:bg-teal-800 disabled:bg-gray-600 text-white rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
              <button
                onClick={() => { setIsEditing(false); setError(""); }}
                disabled={isSaving}
                className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          /* Read-Only Detail View */
          <div className="space-y-6">
            {/* Main Details Card */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Certification Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
                {/* Name */}
                <DetailField label="Certification Name" value={cert.certificationName} />

                {/* Type */}
                <DetailField
                  label="Type"
                  value={CERT_TYPE_LABELS[cert.certificationType] || formatStatus(cert.certificationType)}
                />

                {/* Certifying Body */}
                <DetailField label="Certifying Body" value={cert.certifyingBody} />

                {/* Certificate Number */}
                <DetailField label="Certificate Number" value={cert.certificateNumber} />

                {/* Scope */}
                <div>
                  <p className="text-sm text-gray-400 mb-1">Scope</p>
                  {cert.isOrganizationWide ? (
                    <Badge variant="info" size="sm">Organisation-wide</Badge>
                  ) : cert.property ? (
                    <Link
                      href={`/properties/${cert.property._id}`}
                      className="text-teal-500 hover:text-teal-400 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 rounded"
                    >
                      {cert.property.propertyName || cert.property.addressLine1}
                      {cert.dwelling && (
                        <span className="text-gray-400"> - {cert.dwelling.dwellingName || "Dwelling"}</span>
                      )}
                    </Link>
                  ) : (
                    <span className="text-gray-400 text-sm">Not specified</span>
                  )}
                </div>

                {/* Status */}
                <div>
                  <p className="text-sm text-gray-400 mb-1">Status</p>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusInfo.variant} size="sm" dot>
                      {statusInfo.label}
                    </Badge>
                    {(cert.status === "expiring_soon" || cert.status === "expired") && (
                      <span className={`text-xs ${days < 0 ? "text-red-400" : "text-yellow-400"}`}>
                        ({days < 0 ? `${Math.abs(days)}d overdue` : `${days}d remaining`})
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Dates Card */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Dates</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
                <DetailField label="Issue Date" value={formatDate(cert.issueDate)} />
                <div>
                  <p className="text-sm text-gray-400 mb-1">Expiry Date</p>
                  <p className={`text-sm ${cert.status === "expired" ? "text-red-400 font-medium" : cert.status === "expiring_soon" ? "text-yellow-400 font-medium" : "text-white"}`}>
                    {formatDate(cert.expiryDate)}
                  </p>
                </div>
              </div>
            </div>

            {/* Audit Information Card */}
            {(cert.lastAuditDate || cert.nextAuditDate || cert.auditorName || cert.auditOutcome) && (
              <div className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Audit Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
                  <DetailField label="Last Audit Date" value={cert.lastAuditDate ? formatDate(cert.lastAuditDate) : undefined} />
                  <DetailField label="Next Audit Date" value={cert.nextAuditDate ? formatDate(cert.nextAuditDate) : undefined} />
                  <DetailField label="Auditor Name" value={cert.auditorName} />
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Audit Outcome</p>
                    {cert.auditOutcome ? (
                      <Badge
                        variant={AUDIT_OUTCOME_BADGE[cert.auditOutcome]?.variant || "neutral"}
                        size="sm"
                      >
                        {AUDIT_OUTCOME_BADGE[cert.auditOutcome]?.label || formatStatus(cert.auditOutcome)}
                      </Badge>
                    ) : (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Certificate Document */}
            {cert.certificateUrl && (
              <div className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Certificate Document</h2>
                <a
                  href={cert.certificateUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  View Certificate
                </a>
              </div>
            )}

            {/* Notes */}
            {cert.notes && (
              <div className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Notes</h2>
                <p className="text-gray-300 text-sm whitespace-pre-wrap">{cert.notes}</p>
              </div>
            )}

            {/* Metadata */}
            <div className="text-xs text-gray-400 flex items-center gap-4">
              <span>Created: {new Date(cert.createdAt).toLocaleDateString("en-AU")}</span>
              <span>Updated: {new Date(cert.updatedAt).toLocaleDateString("en-AU")}</span>
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

export default function CertificationDetailPage() {
  return (
    <RequireAuth>
      <CertificationDetailContent />
    </RequireAuth>
  );
}
