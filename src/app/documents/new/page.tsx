"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import Link from "next/link";
import Image from "next/image";
import { Id } from "../../../../convex/_generated/dataModel";

export default function NewDocumentPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; role: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const dragCounterRef = useRef(0);

  const participants = useQuery(api.participants.getAll);
  const properties = useQuery(api.properties.getAll);
  const owners = useQuery(api.owners.getAll);

  const generateUploadUrl = useMutation(api.documents.generateUploadUrl);
  const createDocument = useMutation(api.documents.create);

  const [formData, setFormData] = useState({
    documentType: "other" as
      | "ndis_plan"
      | "service_agreement"
      | "lease"
      | "insurance"
      | "compliance"
      | "centrepay_consent"
      | "report"
      | "other",
    documentCategory: "participant" as "participant" | "property" | "dwelling" | "owner",
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
    selectedPropertyForDwelling
      ? { propertyId: selectedPropertyForDwelling as Id<"properties"> }
      : "skip"
  );

  useEffect(() => {
    const storedUser = localStorage.getItem("sda_user");
    if (!storedUser) {
      router.push("/login");
      return;
    }
    setUser(JSON.parse(storedUser));
  }, [router]);

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

    // Validate that a link is selected based on category
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
        storageId,
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

  if (!user) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Header />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="mb-6">
          <ol className="flex items-center gap-2 text-sm">
            <li>
              <Link href="/dashboard" className="text-gray-400 hover:text-white">
                Dashboard
              </Link>
            </li>
            <li className="text-gray-600">/</li>
            <li>
              <Link href="/documents" className="text-gray-400 hover:text-white">
                Documents
              </Link>
            </li>
            <li className="text-gray-600">/</li>
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

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
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
                    ? 'border-blue-500 bg-blue-500/10'
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
                          className="w-8 h-8 mb-4 text-blue-400"
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
                        <p className="text-sm text-blue-400 font-semibold">
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
                        <p className="text-xs text-gray-500">PDF, DOC, DOCX, XLS, XLSX, PNG, JPG (MAX. 10MB)</p>
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

            {/* Document Type */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Document Type *
                </label>
                <select
                  required
                  value={formData.documentType}
                  onChange={(e) =>
                    setFormData({ ...formData, documentType: e.target.value as any })
                  }
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="ndis_plan">NDIS Plan</option>
                  <option value="service_agreement">Service Agreement</option>
                  <option value="lease">Lease Agreement</option>
                  <option value="insurance">Insurance</option>
                  <option value="compliance">Compliance Certificate</option>
                  <option value="centrepay_consent">Centrepay Consent Form</option>
                  <option value="report">Report</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Category *
                </label>
                <select
                  required
                  value={formData.documentCategory}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      documentCategory: e.target.value as any,
                      linkedParticipantId: "",
                      linkedPropertyId: "",
                      linkedDwellingId: "",
                      linkedOwnerId: "",
                    });
                  }}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="participant">Participant</option>
                  <option value="property">Property</option>
                  <option value="dwelling">Dwelling</option>
                  <option value="owner">Owner</option>
                </select>
              </div>
            </div>

            {/* Linked Entity Selection */}
            {formData.documentCategory === "participant" && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Participant *
                </label>
                <select
                  required
                  value={formData.linkedParticipantId}
                  onChange={(e) =>
                    setFormData({ ...formData, linkedParticipantId: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Property *
                </label>
                <select
                  required
                  value={formData.linkedPropertyId}
                  onChange={(e) =>
                    setFormData({ ...formData, linkedPropertyId: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Property *
                  </label>
                  <select
                    required
                    value={selectedPropertyForDwelling}
                    onChange={(e) => {
                      setSelectedPropertyForDwelling(e.target.value);
                      setFormData({ ...formData, linkedDwellingId: "" });
                    }}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Dwelling *
                  </label>
                  <select
                    required
                    value={formData.linkedDwellingId}
                    onChange={(e) =>
                      setFormData({ ...formData, linkedDwellingId: e.target.value })
                    }
                    disabled={!selectedPropertyForDwelling}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
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
                <label className="block text-sm font-medium text-gray-300 mb-2">Owner *</label>
                <select
                  required
                  value={formData.linkedOwnerId}
                  onChange={(e) => setFormData({ ...formData, linkedOwnerId: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                placeholder="Additional information about this document..."
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Expiry Date */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Expiry Date (Optional)
              </label>
              <input
                type="date"
                value={formData.expiryDate}
                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-400 mt-1">
                Set an expiry date for documents like insurance, plans, or certificates
              </p>
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={isSubmitting || !selectedFile}
                className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors font-medium"
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

function Header() {
  const router = useRouter();
  const [user, setUser] = useState<{ firstName: string; lastName: string; role: string } | null>(
    null
  );

  useEffect(() => {
    const storedUser = localStorage.getItem("sda_user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("sda_user");
    router.push("/login");
  };

  return (
    <header className="bg-gray-800 border-b border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-8">
            <Link href="/dashboard">
              <Image
                src="/Logo.jpg"
                alt="Better Living Solutions"
                width={140}
                height={40}
                className="rounded"
              />
            </Link>
            <nav className="flex gap-4">
              <Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors">
                Dashboard
              </Link>
              <Link href="/properties" className="text-gray-400 hover:text-white transition-colors">
                Properties
              </Link>
              <Link
                href="/participants"
                className="text-gray-400 hover:text-white transition-colors"
              >
                Participants
              </Link>
              <Link href="/payments" className="text-gray-400 hover:text-white transition-colors">
                Payments
              </Link>
              <Link
                href="/maintenance"
                className="text-gray-400 hover:text-white transition-colors"
              >
                Maintenance
              </Link>
              <Link href="/documents" className="text-white font-medium">
                Documents
              </Link>
              <Link href="/alerts" className="text-gray-400 hover:text-white transition-colors">
                Alerts
              </Link>
              <Link href="/schedule" className="text-gray-400 hover:text-white transition-colors">
                Schedule
              </Link>
              <Link href="/settings" className="text-gray-400 hover:text-white transition-colors">
                Settings
              </Link>
            </nav>
          </div>
          {user && (
            <div className="flex items-center gap-4">
              <span className="text-gray-300">
                {user.firstName} {user.lastName}
              </span>
              <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded">
                {user.role.replace("_", " ")}
              </span>
              <button
                onClick={handleLogout}
                className="text-gray-400 hover:text-white transition-colors"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-white">Loading...</div>
    </div>
  );
}
