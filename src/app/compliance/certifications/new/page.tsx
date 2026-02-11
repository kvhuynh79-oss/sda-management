"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import Header from "../../../../components/Header";
import { RequireAuth } from "@/components/RequireAuth";
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

  const properties = useQuery(api.properties.getAll, user ? { userId: user.id as Id<"users"> } : "skip");
  const createCertification = useMutation(api.complianceCertifications.create);
  const generateUploadUrl = useMutation(api.documents.generateUploadUrl);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      // Upload file if selected
      let certificateStorageId: Id<"_storage"> | undefined;
      if (selectedFile) {
        setIsUploading(true);
        const uploadUrl = await generateUploadUrl();
        const uploadResult = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": selectedFile.type },
          body: selectedFile,
        });
        if (!uploadResult.ok) {
          throw new Error("File upload failed");
        }
        const { storageId } = await uploadResult.json();
        certificateStorageId = storageId as Id<"_storage">;
        setIsUploading(false);
      }

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
        certificateStorageId,
        notes: formData.notes || undefined,
        userId: user.id as Id<"users">,
      });

      router.push("/compliance");
    } catch (err: any) {
      setError(err.message || "Failed to create certification");
    } finally {
      setIsSaving(false);
      setIsUploading(false);
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
    <RequireAuth>
    <div className="min-h-screen bg-gray-900">
      <Header currentPage="compliance" />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link href="/compliance" className="text-teal-500 hover:text-teal-400 text-sm mb-2 block">
              &larr; Back to Compliance
            </Link>
            <h1 className="text-2xl font-bold text-white">Add Certification</h1>
            <p className="text-gray-400 mt-1">Record compliance certifications for your organisation or properties</p>
          </div>
        </div>

        {/* Link to Compliance Guides */}
        <div className="mb-4">
          <Link href="/compliance" className="text-teal-500 hover:text-teal-400 text-sm flex items-center gap-2">
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
                  className="text-teal-700"
                />
                <span className="text-white">Organisation-wide</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={!formData.isOrganizationWide}
                  onChange={() => setFormData({ ...formData, isOrganizationWide: false })}
                  className="text-teal-700"
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

          {/* Certificate Document Upload */}
          <div className="border-t border-gray-700 pt-4">
            <h3 className="text-lg font-medium text-white mb-4">Certificate Document</h3>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Upload Certificate (PDF, image, or document)
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setSelectedFile(file);
                }}
                className="hidden"
                aria-label="Upload certificate file"
              />
              {!selectedFile ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full px-4 py-6 border-2 border-dashed border-gray-600 rounded-lg text-gray-400 hover:border-teal-600 hover:text-teal-400 transition-colors flex flex-col items-center gap-2"
                >
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                  </svg>
                  <span className="text-sm">Click to upload certificate file</span>
                  <span className="text-xs text-gray-500">PDF, JPG, PNG, DOC up to 10MB</span>
                </button>
              ) : (
                <div className="flex items-center gap-3 px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg">
                  <svg className="w-5 h-5 text-teal-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{selectedFile.name}</p>
                    <p className="text-xs text-gray-400">{(selectedFile.size / 1024).toFixed(0)} KB</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="text-gray-400 hover:text-red-400 p-1"
                    aria-label="Remove file"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
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
              className="flex-1 px-4 py-3 bg-teal-700 hover:bg-teal-800 disabled:bg-gray-600 text-white rounded-lg"
            >
              {isUploading ? "Uploading file..." : isSaving ? "Saving..." : "Add Certification"}
            </button>
          </div>
        </form>
      </main>
    </div>
    </RequireAuth>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-white">Loading...</div>
    </div>
  );
}
