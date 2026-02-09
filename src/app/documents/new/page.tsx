"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import Link from "next/link";
import Header from "@/components/Header";
import { Id } from "../../../../convex/_generated/dataModel";

// Document type definitions with suggested categories
const DOCUMENT_TYPES = {
  // Participant Documents
  ndis_plan: { label: "NDIS Plan", category: "participant", group: "Participant Documents" },
  accommodation_agreement: { label: "Accommodation Agreement", category: "participant", group: "Participant Documents" },
  sda_quotation: { label: "SDA Quotation", category: "participant", group: "Participant Documents" },
  centrepay_consent: { label: "Centrepay Consent Form", category: "participant", group: "Participant Documents" },

  // Property Documents
  lease: { label: "Lease Agreement", category: "property", group: "Property Documents" },
  fire_safety_certificate: { label: "Fire Safety Certificate", category: "property", group: "Property Documents" },
  building_compliance_certificate: { label: "Building Compliance Certificate", category: "property", group: "Property Documents" },
  sda_design_certificate: { label: "SDA Design Certificate", category: "dwelling", group: "Property Documents" },

  // Insurance Documents (Organisation-wide)
  public_liability_insurance: { label: "Public Liability Insurance", category: "organisation", group: "Insurance Documents" },
  professional_indemnity_insurance: { label: "Professional Indemnity Insurance", category: "organisation", group: "Insurance Documents" },
  building_insurance: { label: "Building Insurance", category: "property", group: "Insurance Documents" },
  workers_compensation_insurance: { label: "Workers Compensation Insurance", category: "organisation", group: "Insurance Documents" },

  // Compliance/Certification Documents
  ndis_practice_standards_cert: { label: "NDIS Practice Standards Certificate", category: "organisation", group: "Compliance Certifications" },
  sda_registration_cert: { label: "SDA Registration Certificate", category: "organisation", group: "Compliance Certifications" },
  ndis_worker_screening: { label: "NDIS Worker Screening Check", category: "organisation", group: "Compliance Certifications" },

  // General
  report: { label: "Report", category: "participant", group: "General" },
  other: { label: "Other", category: "participant", group: "General" },
};

type DocumentType = keyof typeof DOCUMENT_TYPES;
type DocumentCategory = "participant" | "property" | "dwelling" | "owner" | "organisation";

export default function NewDocumentPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; role: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const dragCounterRef = useRef(0);

  const participants = useQuery(
    api.participants.getAll,
    user ? { userId: user.id as Id<"users"> } : "skip"
  );
  const properties = useQuery(api.properties.getAll, user ? { userId: user.id as Id<"users"> } : "skip");
  const owners = useQuery(api.owners.getAll, user ? { userId: user.id as Id<"users"> } : "skip");

  const generateUploadUrl = useMutation(api.documents.generateUploadUrl);
  const createDocument = useMutation(api.documents.create);

  const [formData, setFormData] = useState({
    documentType: "other" as DocumentType,
    documentCategory: "participant" as DocumentCategory,
    linkedParticipantId: "",
    linkedPropertyId: "",
    linkedDwellingId: "",
    linkedOwnerId: "",
    description: "",
    expiryDate: "",
  });

  const [selectedPropertyForDwelling, setSelectedPropertyForDwelling] = useState<string>("");
  const dwellings = useQuery(
    api.dwellings.getByProperty,
    selectedPropertyForDwelling && user
      ? { propertyId: selectedPropertyForDwelling as Id<"properties">, userId: user.id as Id<"users"> }
      : "skip"
  );

  useEffect(() => {
    const storedUser = localStorage.getItem("sda_user");
    if (!storedUser) {
      router.push("/login");
      return;
    }
    const parsed = JSON.parse(storedUser);
    const userId = parsed.id || parsed._id;

    if (!userId) {
      localStorage.removeItem("sda_user");
      router.push("/login");
      return;
    }

    setUser({
      id: userId,
      role: parsed.role,
    });
  }, [router]);

  // Auto-select category when document type changes
  const handleDocumentTypeChange = (docType: DocumentType) => {
    const typeInfo = DOCUMENT_TYPES[docType];
    setFormData({
      ...formData,
      documentType: docType,
      documentCategory: typeInfo?.category as DocumentCategory || "participant",
      // Clear linked entities when type changes
      linkedParticipantId: "",
      linkedPropertyId: "",
      linkedDwellingId: "",
      linkedOwnerId: "",
    });
    setSelectedPropertyForDwelling("");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragActive(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragActive(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'image/png',
        'image/jpeg'
      ];

      if (allowedTypes.includes(file.type)) {
        setSelectedFile(file);
        setError('');
      } else {
        setError('Invalid file type. Please upload PDF, DOC, DOCX, XLS, XLSX, PNG, or JPG files.');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!user) {
      setError("User not authenticated");
      return;
    }

    if (!selectedFile) {
      setError("Please select a file to upload");
      return;
    }

    // Validate expiry date for certification documents
    if (isCertDoc && !formData.expiryDate) {
      setError("Expiry date is required for compliance certifications");
      return;
    }

    // Validate that a link is selected based on category (except for organisation-wide)
    if (formData.documentCategory === "participant" && !formData.linkedParticipantId) {
      setError("Please select a participant");
      return;
    }
    if (formData.documentCategory === "property" && !formData.linkedPropertyId) {
      setError("Please select a property");
      return;
    }
    if (formData.documentCategory === "dwelling" && !formData.linkedDwellingId) {
      setError("Please select a dwelling");
      return;
    }
    if (formData.documentCategory === "owner" && !formData.linkedOwnerId) {
      setError("Please select an owner");
      return;
    }
    // Organisation-wide documents don't need a linked entity

    setIsSubmitting(true);

    try {
      // Step 1: Get upload URL
      const uploadUrl = await generateUploadUrl();

      // Step 2: Upload file
      const uploadResult = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": selectedFile.type },
        body: selectedFile,
      });

      if (!uploadResult.ok) {
        throw new Error("File upload failed");
      }

      const { storageId } = await uploadResult.json();

      // Step 3: Create document record
      await createDocument({
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        fileType: selectedFile.type,
        storageId: storageId as Id<"_storage">,
        documentType: formData.documentType,
        documentCategory: formData.documentCategory,
        linkedParticipantId: formData.linkedParticipantId
          ? (formData.linkedParticipantId as Id<"participants">)
          : undefined,
        linkedPropertyId: formData.linkedPropertyId
          ? (formData.linkedPropertyId as Id<"properties">)
          : undefined,
        linkedDwellingId: formData.linkedDwellingId
          ? (formData.linkedDwellingId as Id<"dwellings">)
          : undefined,
        linkedOwnerId: formData.linkedOwnerId
          ? (formData.linkedOwnerId as Id<"owners">)
          : undefined,
        description: formData.description || undefined,
        expiryDate: formData.expiryDate || undefined,
        uploadedBy: user.id as Id<"users">,
      });

      router.push("/documents");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload document");
      setIsSubmitting(false);
    }
  };

  // Group document types for the select dropdown
  const groupedDocTypes = Object.entries(DOCUMENT_TYPES).reduce((acc, [key, value]) => {
    if (!acc[value.group]) {
      acc[value.group] = [];
    }
    acc[value.group].push({ key, ...value });
    return acc;
  }, {} as Record<string, Array<{ key: string; label: string; category: string; group: string }>>);

  // Certification types that auto-link to Compliance Dashboard
  const isCertDoc = ["ndis_practice_standards_cert", "sda_registration_cert",
    "ndis_worker_screening", "fire_safety_certificate", "building_compliance_certificate",
    "sda_design_certificate"].includes(formData.documentType);

  // Insurance types (future auto-link)
  const isInsuranceDoc = ["public_liability_insurance", "professional_indemnity_insurance",
    "workers_compensation_insurance", "building_insurance"].includes(formData.documentType);

  // Check if selected document type is compliance-related (for showing compliance link)
  const isComplianceDoc = isCertDoc || isInsuranceDoc;

  if (!user) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Header currentPage="database" />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="mb-6">
          <ol className="flex items-center gap-2 text-sm">
            <li>
              <Link href="/dashboard" className="text-gray-400 hover:text-white">
                Dashboard
              </Link>
            </li>
            <li className="text-gray-400">/</li>
            <li>
              <Link href="/database?tab=documents" className="text-gray-400 hover:text-white">
                Database
              </Link>
            </li>
            <li className="text-gray-400">/</li>
            <li>
              <span className="text-gray-400">Documents</span>
            </li>
            <li className="text-gray-400">/</li>
            <li className="text-white">Upload Document</li>
          </ol>
        </nav>

        <div className="bg-gray-800 rounded-lg p-6">
          <h1 className="text-2xl font-bold text-white mb-6">Upload Document</h1>

          {error && (
            <div className="mb-6 p-4 bg-red-900/50 border border-red-600 rounded-lg text-red-200">
              {error}
            </div>
          )}

          {/* Compliance Document Notice */}
          {isCertDoc && (
            <div className="mb-6 p-4 bg-green-900/30 border border-green-600 rounded-lg">
              <p className="text-green-200 text-sm">
                <span className="font-semibold">Auto-linked:</span> This certification will automatically appear in the{" "}
                <Link href="/compliance" className="underline hover:text-white">Compliance Dashboard</Link>.
                {" "}Make sure to set the <strong>Expiry Date</strong> below.
              </p>
            </div>
          )}
          {isInsuranceDoc && (
            <div className="mb-6 p-4 bg-teal-950/30 border border-teal-700 rounded-lg">
              <p className="text-teal-200 text-sm">
                <span className="font-semibold">Tip:</span> For full compliance tracking, also add this in{" "}
                <Link href="/compliance/insurance/new" className="underline hover:text-white">Insurance Policies</Link>.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Select File *
              </label>
              <div
                className="flex items-center justify-center w-full"
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                  isDragActive
                    ? 'border-teal-600 bg-teal-600/10'
                    : 'border-gray-600 bg-gray-700 hover:bg-gray-650'
                }`}>
                  <div className={`flex flex-col items-center justify-center pt-5 pb-6 ${isDragActive ? 'pointer-events-none' : ''}`}>
                    {selectedFile ? (
                      <>
                        <p className="text-sm text-white font-medium">{selectedFile.name}</p>
                        <p className="text-xs text-gray-400">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </>
                    ) : isDragActive ? (
                      <>
                        <svg
                          className="w-8 h-8 mb-4 text-teal-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                          />
                        </svg>
                        <p className="text-sm text-teal-500 font-semibold">
                          Drop file here
                        </p>
                      </>
                    ) : (
                      <>
                        <svg
                          className="w-8 h-8 mb-4 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                          />
                        </svg>
                        <p className="mb-2 text-sm text-gray-400">
                          <span className="font-semibold">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-gray-400">PDF, DOC, DOCX, XLS, XLSX, PNG, JPG (MAX. 10MB)</p>
                      </>
                    )}
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleFileChange}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                  />
                </label>
              </div>
            </div>

            {/* Document Type - Grouped */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Document Type *
              </label>
              <select
                required
                value={formData.documentType}
                onChange={(e) => handleDocumentTypeChange(e.target.value as DocumentType)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-teal-600 focus:border-transparent"
              >
                {Object.entries(groupedDocTypes).map(([group, types]) => (
                  <optgroup key={group} label={group}>
                    {types.map((type) => (
                      <option key={type.key} value={type.key}>
                        {type.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* Category - Auto-selected but can be changed */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Category *
                <span className="text-gray-400 font-normal ml-2">(auto-selected based on document type)</span>
              </label>
              <select
                required
                value={formData.documentCategory}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    documentCategory: e.target.value as DocumentCategory,
                    linkedParticipantId: "",
                    linkedPropertyId: "",
                    linkedDwellingId: "",
                    linkedOwnerId: "",
                  });
                  setSelectedPropertyForDwelling("");
                }}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-teal-600 focus:border-transparent"
              >
                <option value="participant">Participant</option>
                <option value="property">Property</option>
                <option value="dwelling">Dwelling</option>
                <option value="owner">Owner</option>
                <option value="organisation">Organisation (Company-wide)</option>
              </select>
            </div>

            {/* Linked Entity Selection - Based on Category */}
            {formData.documentCategory === "participant" && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Participant *
                </label>
                <select
                  required
                  value={formData.linkedParticipantId}
                  onChange={(e) =>
                    setFormData({ ...formData, linkedParticipantId: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-teal-600 focus:border-transparent"
                >
                  <option value="">Select a participant</option>
                  {participants?.map((participant) => (
                    <option key={participant._id} value={participant._id}>
                      {participant.firstName} {participant.lastName} - {participant.ndisNumber}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {formData.documentCategory === "property" && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Property *
                </label>
                <select
                  required
                  value={formData.linkedPropertyId}
                  onChange={(e) =>
                    setFormData({ ...formData, linkedPropertyId: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-teal-600 focus:border-transparent"
                >
                  <option value="">Select a property</option>
                  {properties?.map((property) => (
                    <option key={property._id} value={property._id}>
                      {property.propertyName || property.addressLine1}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {formData.documentCategory === "dwelling" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Property *
                  </label>
                  <select
                    required
                    value={selectedPropertyForDwelling}
                    onChange={(e) => {
                      setSelectedPropertyForDwelling(e.target.value);
                      setFormData({ ...formData, linkedDwellingId: "" });
                    }}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-teal-600 focus:border-transparent"
                  >
                    <option value="">Select a property first</option>
                    {properties?.map((property) => (
                      <option key={property._id} value={property._id}>
                        {property.propertyName || property.addressLine1}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Dwelling *
                  </label>
                  <select
                    required
                    value={formData.linkedDwellingId}
                    onChange={(e) =>
                      setFormData({ ...formData, linkedDwellingId: e.target.value })
                    }
                    disabled={!selectedPropertyForDwelling}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-teal-600 focus:border-transparent disabled:opacity-50"
                  >
                    <option value="">
                      {selectedPropertyForDwelling ? "Select a dwelling" : "Select property first"}
                    </option>
                    {dwellings?.map((dwelling) => (
                      <option key={dwelling._id} value={dwelling._id}>
                        {dwelling.dwellingName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {formData.documentCategory === "owner" && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Owner *</label>
                <select
                  required
                  value={formData.linkedOwnerId}
                  onChange={(e) => setFormData({ ...formData, linkedOwnerId: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-teal-600 focus:border-transparent"
                >
                  <option value="">Select an owner</option>
                  {owners?.map((owner) => (
                    <option key={owner._id} value={owner._id}>
                      {owner.ownerType === "company"
                        ? owner.companyName
                        : `${owner.firstName} ${owner.lastName}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {formData.documentCategory === "organisation" && (
              <div className="p-4 bg-gray-700/50 border border-gray-600 rounded-lg">
                <p className="text-gray-300 text-sm">
                  This document will be stored as an <strong>organisation-wide</strong> document
                  and will be accessible from the Compliance Dashboard.
                </p>
              </div>
            )}

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                placeholder="Additional information about this document..."
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-teal-600 focus:border-transparent"
              />
            </div>

            {/* Expiry Date */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Expiry Date {isCertDoc ? "*" : "(Optional)"}
              </label>
              <input
                type="date"
                required={isCertDoc}
                value={formData.expiryDate}
                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-teal-600 focus:border-transparent"
              />
              <p className="text-xs text-gray-400 mt-1">
                {isCertDoc
                  ? "Required for compliance certifications. This date will be tracked in the Compliance Dashboard."
                  : "Set an expiry date for documents like insurance, plans, or certificates. You\u0027ll receive alerts before expiry."}
              </p>
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={isSubmitting || !selectedFile}
                className="flex-1 px-6 py-3 bg-teal-700 hover:bg-teal-800 disabled:bg-gray-600 text-white rounded-lg transition-colors font-medium"
              >
                {isSubmitting ? "Uploading..." : "Upload Document"}
              </button>
              <Link
                href="/documents"
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
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
