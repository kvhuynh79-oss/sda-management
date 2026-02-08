"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import Header from "../../../../components/Header";
import Link from "next/link";

// Guidance for NDIS SDA providers on required certifications
const CERTIFICATION_GUIDANCE = {
  ndis_practice_standards: {
    name: "NDIS Practice Standards Certification",
    description: "Required for all registered NDIS providers. Demonstrates compliance with NDIS Practice Standards including rights, governance, and service delivery.",
    typicalCertifier: "NDIS Quality and Safeguards Commission approved auditor",
    renewalPeriod: "3 years (mid-term audit at 18 months)",
    required: true,
  },
  ndis_verification_audit: {
    name: "NDIS Verification Audit",
    description: "Required for providers delivering lower-risk supports. A desktop audit verifying policies, procedures, and systems are in place.",
    typicalCertifier: "NDIS Quality and Safeguards Commission approved auditor",
    renewalPeriod: "3 years",
    required: false,
  },
  sda_design_standard: {
    name: "SDA Design Standard Certification",
    description: "Required for each SDA dwelling. Certifies the property meets SDA Design Standard requirements for the registered category (HPS, Fully Accessible, etc).",
    typicalCertifier: "Certified SDA Assessor / Building Certifier",
    renewalPeriod: "One-time (unless modifications made)",
    required: true,
  },
  sda_registration: {
    name: "SDA Provider Registration",
    description: "Registration with NDIS Commission to provide SDA. Must be renewed and demonstrates ongoing compliance with SDA requirements.",
    typicalCertifier: "NDIS Quality and Safeguards Commission",
    renewalPeriod: "3 years",
    required: true,
  },
  ndis_worker_screening: {
    name: "NDIS Worker Screening Check",
    description: "All workers with more than incidental contact with participants must have valid NDIS Worker Screening clearance. Track expiry dates for all staff.",
    typicalCertifier: "State/Territory Worker Screening Unit",
    renewalPeriod: "5 years",
    required: true,
  },
  fire_safety: {
    name: "Fire Safety Certificate/Statement",
    description: "Annual fire safety statement required for SDA properties. Includes fire detection, alarms, extinguishers, exits, and evacuation plans.",
    typicalCertifier: "Accredited Fire Safety Practitioner",
    renewalPeriod: "Annual",
    required: true,
  },
  building_compliance: {
    name: "Building Compliance Certificate",
    description: "Occupancy certificate or compliance certificate confirming the building meets BCA requirements and is safe for occupation.",
    typicalCertifier: "Private Certifier / Local Council",
    renewalPeriod: "One-time (unless modifications)",
    required: true,
  },
  other: {
    name: "Other Certification",
    description: "Other certifications such as pool safety, electrical safety, pest management, etc.",
    typicalCertifier: "Varies",
    renewalPeriod: "Varies",
    required: false,
  },
};

export default function NewCertificationPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; role: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const properties = useQuery(api.properties.getAll);
  const createCertification = useMutation(api.complianceCertifications.create);

  const [formData, setFormData] = useState({
    certificationType: "" as
      | "ndis_practice_standards"
      | "ndis_verification_audit"
      | "sda_design_standard"
      | "sda_registration"
      | "ndis_worker_screening"
      | "fire_safety"
      | "building_compliance"
      | "other"
      | "",
    certificationName: "",
    isOrganizationWide: true,
    propertyId: "",
    certifyingBody: "",
    certificateNumber: "",
    issueDate: "",
    expiryDate: "",
    lastAuditDate: "",
    nextAuditDate: "",
    auditorName: "",
    auditOutcome: "" as "pass" | "conditional_pass" | "fail" | "pending" | "",
    notes: "",
  });

  useEffect(() => {
    const storedUser = localStorage.getItem("sda_user");
    if (!storedUser) {
      router.push("/login");
      return;
    }
    setUser(JSON.parse(storedUser));
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.certificationType) return;

    setIsSaving(true);
    setError("");

    try {
      await createCertification({
        certificationType: formData.certificationType,
        certificationName: formData.certificationName || CERTIFICATION_GUIDANCE[formData.certificationType]?.name || formData.certificationType,
        isOrganizationWide: formData.isOrganizationWide,
        propertyId: !formData.isOrganizationWide && formData.propertyId ? formData.propertyId as Id<"properties"> : undefined,
        certifyingBody: formData.certifyingBody || undefined,
        certificateNumber: formData.certificateNumber || undefined,
        issueDate: formData.issueDate,
        expiryDate: formData.expiryDate,
        lastAuditDate: formData.lastAuditDate || undefined,
        nextAuditDate: formData.nextAuditDate || undefined,
        auditorName: formData.auditorName || undefined,
        auditOutcome: formData.auditOutcome || undefined,
        notes: formData.notes || undefined,
        userId: user.id as Id<"users">,
      });

      router.push("/compliance");
    } catch (err: any) {
      setError(err.message || "Failed to create certification");
    } finally {
      setIsSaving(false);
    }
  };

  // Auto-fill certification name when type changes
  const handleTypeChange = (type: string) => {
    const guidance = CERTIFICATION_GUIDANCE[type as keyof typeof CERTIFICATION_GUIDANCE];
    setFormData({
      ...formData,
      certificationType: type as any,
      certificationName: guidance?.name || "",
      certifyingBody: guidance?.typicalCertifier || "",
    });
  };

  const selectedGuidance = formData.certificationType
    ? CERTIFICATION_GUIDANCE[formData.certificationType as keyof typeof CERTIFICATION_GUIDANCE]
    : null;

  if (!user) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Header currentPage="compliance" />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link href="/compliance" className="text-blue-400 hover:text-blue-300 text-sm mb-2 block">
              &larr; Back to Compliance
            </Link>
            <h1 className="text-2xl font-bold text-white">Add Certification</h1>
            <p className="text-gray-400 mt-1">Record compliance certifications for your organisation or properties</p>
          </div>
        </div>

        {/* Link to Compliance Guides */}
        <div className="mb-4">
          <Link href="/compliance" className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-2">
            <span>ℹ️</span> View Certifications Guide in Compliance Dashboard
          </Link>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-gray-800 rounded-lg p-6 space-y-6">
          {/* Certification Type */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Certification Type *
            </label>
            <select
              required
              value={formData.certificationType}
              onChange={(e) => handleTypeChange(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            >
              <option value="">Select certification type...</option>
              <optgroup label="Organisation-Level (Required)">
                <option value="ndis_practice_standards">NDIS Practice Standards Certification</option>
                <option value="sda_registration">SDA Provider Registration</option>
              </optgroup>
              <optgroup label="Worker Requirements">
                <option value="ndis_worker_screening">NDIS Worker Screening Check</option>
              </optgroup>
              <optgroup label="Property-Level">
                <option value="sda_design_standard">SDA Design Standard Certification</option>
                <option value="fire_safety">Fire Safety Certificate/Statement</option>
                <option value="building_compliance">Building Compliance Certificate</option>
              </optgroup>
              <optgroup label="Other">
                <option value="ndis_verification_audit">NDIS Verification Audit</option>
                <option value="other">Other Certification</option>
              </optgroup>
            </select>
          </div>

          {/* Type-specific guidance */}
          {selectedGuidance && (
            <div className="bg-gray-700/50 border border-gray-600 rounded-lg p-4">
              <p className="text-gray-300 text-sm">{selectedGuidance.description}</p>
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div>
                  <p className="text-gray-400 text-xs">Typical Certifier</p>
                  <p className="text-gray-300 text-sm">{selectedGuidance.typicalCertifier}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Renewal Period</p>
                  <p className="text-gray-300 text-sm">{selectedGuidance.renewalPeriod}</p>
                </div>
              </div>
            </div>
          )}

          {/* Certification Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Certification Name *
            </label>
            <input
              type="text"
              required
              value={formData.certificationName}
              onChange={(e) => setFormData({ ...formData, certificationName: e.target.value })}
              placeholder="e.g., NDIS Practice Standards Certification 2024"
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            />
          </div>

          {/* Scope */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Scope
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={formData.isOrganizationWide}
                  onChange={() => setFormData({ ...formData, isOrganizationWide: true, propertyId: "" })}
                  className="text-blue-600"
                />
                <span className="text-white">Organisation-wide</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={!formData.isOrganizationWide}
                  onChange={() => setFormData({ ...formData, isOrganizationWide: false })}
                  className="text-blue-600"
                />
                <span className="text-white">Specific Property</span>
              </label>
            </div>
          </div>

          {/* Property Selection (if not org-wide) */}
          {!formData.isOrganizationWide && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Property
              </label>
              <select
                value={formData.propertyId}
                onChange={(e) => setFormData({ ...formData, propertyId: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              >
                <option value="">Select property...</option>
                {properties?.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.propertyName} - {p.addressLine1}, {p.suburb}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Certifying Body & Certificate Number */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Certifying Body
              </label>
              <input
                type="text"
                value={formData.certifyingBody}
                onChange={(e) => setFormData({ ...formData, certifyingBody: e.target.value })}
                placeholder="e.g., SAI Global, BSI"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Certificate Number
              </label>
              <input
                type="text"
                value={formData.certificateNumber}
                onChange={(e) => setFormData({ ...formData, certificateNumber: e.target.value })}
                placeholder="e.g., CERT-2024-12345"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              />
            </div>
          </div>

          {/* Issue & Expiry Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Issue Date *
              </label>
              <input
                type="date"
                required
                value={formData.issueDate}
                onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Expiry Date *
              </label>
              <input
                type="date"
                required
                value={formData.expiryDate}
                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              />
            </div>
          </div>

          {/* Audit Information */}
          <div className="border-t border-gray-700 pt-4">
            <h3 className="text-lg font-medium text-white mb-4">Audit Information (Optional)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Last Audit Date
                </label>
                <input
                  type="date"
                  value={formData.lastAuditDate}
                  onChange={(e) => setFormData({ ...formData, lastAuditDate: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Next Audit Date
                </label>
                <input
                  type="date"
                  value={formData.nextAuditDate}
                  onChange={(e) => setFormData({ ...formData, nextAuditDate: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Auditor Name
                </label>
                <input
                  type="text"
                  value={formData.auditorName}
                  onChange={(e) => setFormData({ ...formData, auditorName: e.target.value })}
                  placeholder="Name of auditor/assessor"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Audit Outcome
                </label>
                <select
                  value={formData.auditOutcome}
                  onChange={(e) => setFormData({ ...formData, auditOutcome: e.target.value as any })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  <option value="">Select outcome...</option>
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
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              placeholder="Any additional notes about this certification..."
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            />
          </div>

          {/* Submit */}
          <div className="flex gap-4 pt-4">
            <Link
              href="/compliance"
              className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-center"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSaving || !formData.certificationType}
              className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg"
            >
              {isSaving ? "Saving..." : "Add Certification"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-white">Loading...</div>
    </div>
  );
}
