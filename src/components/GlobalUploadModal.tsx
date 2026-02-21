"use client";

import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuth } from "@/hooks/useAuth";
import { Id } from "../../convex/_generated/dataModel";
// Simple SVG icon components
const BuildingOffice2Icon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
  </svg>
);

const UserIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
  </svg>
);

const ShieldCheckIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
  </svg>
);

const BuildingLibraryIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
  </svg>
);

const XMarkIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const DocumentArrowUpIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
  </svg>
);

interface GlobalUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  prefillCategory?: "property" | "participant" | "organisation" | "dwelling" | "owner";
  prefillEntityId?: string;
  onSuccess?: () => void;
}

type DocumentType =
  | "ndis_plan"
  | "accommodation_agreement"
  | "sda_quotation"
  | "centrepay_consent"
  | "lease"
  | "fire_safety_certificate"
  | "building_compliance_certificate"
  | "sda_design_certificate"
  | "public_liability_insurance"
  | "professional_indemnity_insurance"
  | "building_insurance"
  | "workers_compensation_insurance"
  | "ndis_practice_standards_cert"
  | "sda_registration_cert"
  | "ndis_worker_screening"
  | "invoice"
  | "receipt"
  | "quote"
  | "report"
  | "other"
  | "service_agreement"
  | "insurance"
  | "compliance";

type DocumentCategory = "property" | "participant" | "organisation" | "dwelling" | "owner";

const COMPLIANCE_DOC_TYPES: DocumentType[] = [
  "fire_safety_certificate",
  "building_compliance_certificate",
  "ndis_practice_standards_cert",
  "sda_design_certificate",
  "sda_registration_cert",
  "ndis_worker_screening",
  "public_liability_insurance",
  "professional_indemnity_insurance",
  "building_insurance",
  "workers_compensation_insurance",
];

const INVOICE_DOC_TYPES: DocumentType[] = ["invoice", "receipt", "quote"];

const ACCEPTED_FILE_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/png",
  "image/jpeg",
  "image/jpg",
];

const FILE_SIZE_LIMIT = 50 * 1024 * 1024; // 50MB

export default function GlobalUploadModal({
  isOpen,
  onClose,
  prefillCategory,
  prefillEntityId,
  onSuccess,
}: GlobalUploadModalProps) {
  const { user } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [category, setCategory] = useState<DocumentCategory | null>(
    prefillCategory || null
  );
  const [documentType, setDocumentType] = useState<DocumentType>("other");
  const [linkedEntityId, setLinkedEntityId] = useState<string>(prefillEntityId || "");
  const [description, setDescription] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");

  // Invoice fields
  const [showInvoiceFields, setShowInvoiceFields] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [invoiceAmount, setInvoiceAmount] = useState("");
  const [vendor, setVendor] = useState("");
  const [isPaid, setIsPaid] = useState(false);

  // AI Analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiFilledFields, setAiFilledFields] = useState<Set<string>>(new Set());
  const [aiConfidence, setAiConfidence] = useState<"high" | "medium" | "low" | null>(null);
  const [uploadedStorageId, setUploadedStorageId] = useState<Id<"_storage"> | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Queries
  const properties = useQuery(api.properties.getAll, user ? { userId: user.id as Id<"users"> } : "skip");
  const participants = useQuery(
    api.participants.getAll,
    user ? { userId: user.id as Id<"users"> } : "skip"
  );

  // Mutations
  const generateUploadUrl = useMutation(api.documents.generateUploadUrl);
  const createDocument = useMutation(api.documents.create);

  // AI Analysis action
  const analyzeDocumentAction = useAction(api.aiDocumentAnalysis.analyzeDocument);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedFile(null);
      setCategory(prefillCategory || null);
      setDocumentType("other");
      setLinkedEntityId(prefillEntityId || "");
      setDescription("");
      setExpiryDate("");
      setInvoiceNumber("");
      setInvoiceDate("");
      setInvoiceAmount("");
      setVendor("");
      setIsPaid(false);
      setShowInvoiceFields(false);
      setError("");
      setIsDragOver(false);
      setIsAnalyzing(false);
      setAiFilledFields(new Set());
      setAiConfidence(null);
      setUploadedStorageId(null);
    }
  }, [isOpen, prefillCategory, prefillEntityId]);

  // Update invoice fields visibility
  useEffect(() => {
    setShowInvoiceFields(INVOICE_DOC_TYPES.includes(documentType));
  }, [documentType]);

  // Handle file selection
  const handleFileSelect = (file: File) => {
    setError("");

    // Validate file type
    if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
      setError(
        "Invalid file type. Please upload PDF, Word, Excel, or image files (PNG, JPG)."
      );
      return;
    }

    // Validate file size
    if (file.size > FILE_SIZE_LIMIT) {
      setError("File size exceeds 50MB limit. Please select a smaller file.");
      return;
    }

    setSelectedFile(file);
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  // Click to browse
  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  // Get filtered document types
  const getDocumentTypeOptions = (): DocumentType[] => {
    if (category === "organisation") {
      return COMPLIANCE_DOC_TYPES;
    }
    return [
      "ndis_plan",
      "accommodation_agreement",
      "sda_quotation",
      "centrepay_consent",
      "lease",
      "fire_safety_certificate",
      "building_compliance_certificate",
      "sda_design_certificate",
      "public_liability_insurance",
      "professional_indemnity_insurance",
      "building_insurance",
      "workers_compensation_insurance",
      "ndis_practice_standards_cert",
      "sda_registration_cert",
      "ndis_worker_screening",
      "invoice",
      "receipt",
      "quote",
      "report",
      "other",
    ];
  };

  // Format document type label
  const formatDocumentTypeLabel = (type: DocumentType): string => {
    return type
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  // AI Analysis handler
  const handleAIAnalysis = async () => {
    if (!selectedFile || !user) return;

    setIsAnalyzing(true);
    setError("");

    try {
      // First, upload the file temporarily to get a storageId
      const uploadUrl = await generateUploadUrl();
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": selectedFile.type },
        body: selectedFile,
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload file for analysis");
      }

      const { storageId } = await uploadResponse.json();
      setUploadedStorageId(storageId as Id<"_storage">);

      // Call AI analysis action
      const result = await analyzeDocumentAction({
        storageId: storageId as Id<"_storage">,
        fileName: selectedFile.name,
        fileType: selectedFile.type,
      });

      // Track which fields were filled by AI
      const filledFields = new Set<string>();

      // Auto-populate fields from AI result
      if (result.documentType) {
        setDocumentType(result.documentType as DocumentType);
        filledFields.add("documentType");
      }

      if (result.category) {
        setCategory(result.category as DocumentCategory);
        filledFields.add("category");
      }

      if (result.description) {
        setDescription(result.description);
        filledFields.add("description");
      }

      if (result.invoiceNumber) {
        setInvoiceNumber(result.invoiceNumber);
        filledFields.add("invoiceNumber");
      }

      if (result.invoiceDate) {
        setInvoiceDate(result.invoiceDate);
        filledFields.add("invoiceDate");
      }

      if (result.invoiceAmount) {
        setInvoiceAmount(result.invoiceAmount.toString());
        filledFields.add("invoiceAmount");
      }

      if (result.vendor) {
        setVendor(result.vendor);
        filledFields.add("vendor");
      }

      if (result.expiryDate) {
        setExpiryDate(result.expiryDate);
        filledFields.add("expiryDate");
      }

      setAiFilledFields(filledFields);
      setAiConfidence(result.confidence || "medium");

      // Show success message
      const fieldsCount = filledFields.size;
      setError(`✓ AI analyzed document! ${fieldsCount} field${fieldsCount > 1 ? 's' : ''} auto-filled. Please review and edit if needed.`);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "AI analysis failed. Please try again or fill in the fields manually.";
      setError(errorMessage);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Validate form
  const isFormValid = (): boolean => {
    if (!selectedFile || !category || !user) return false;

    // Require entity selection for property/participant categories
    if ((category === "property" || category === "participant") && !linkedEntityId) {
      return false;
    }

    return true;
  };

  // Submit handler
  const handleSubmit = async () => {
    if (!isFormValid() || !user || !selectedFile) return;

    setIsUploading(true);
    setError("");

    try {
      // Use already-uploaded storageId if AI analysis was run, otherwise upload now
      let storageId: Id<"_storage">;

      if (uploadedStorageId) {
        // File already uploaded during AI analysis
        storageId = uploadedStorageId;
      } else {
        // Step 1: Generate upload URL
        const uploadUrl = await generateUploadUrl();

        // Step 2: Upload file to storage
        const uploadResponse = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": selectedFile.type },
          body: selectedFile,
        });

        if (!uploadResponse.ok) {
          throw new Error("Failed to upload file");
        }

        const result = await uploadResponse.json();
        storageId = result.storageId as Id<"_storage">;
      }

      // Step 3: Create document record
      const documentData: any = {
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        fileType: selectedFile.type,
        storageId,
        documentType,
        documentCategory: category,
        description: description || undefined,
        expiryDate: expiryDate || undefined,
        uploadedBy: user.id as Id<"users">,
      };

      // Add entity links
      if (category === "property" && linkedEntityId) {
        documentData.linkedPropertyId = linkedEntityId as Id<"properties">;
      } else if (category === "participant" && linkedEntityId) {
        documentData.linkedParticipantId = linkedEntityId as Id<"participants">;
      } else if (category === "dwelling" && linkedEntityId) {
        documentData.linkedDwellingId = linkedEntityId as Id<"dwellings">;
      } else if (category === "owner" && linkedEntityId) {
        documentData.linkedOwnerId = linkedEntityId as Id<"owners">;
      }

      // Add invoice fields if applicable
      if (showInvoiceFields) {
        documentData.invoiceNumber = invoiceNumber || undefined;
        documentData.invoiceDate = invoiceDate || undefined;
        documentData.invoiceAmount = invoiceAmount
          ? parseFloat(invoiceAmount)
          : undefined;
        documentData.vendor = vendor || undefined;
        documentData.isPaid = isPaid;
      }

      await createDocument(documentData);

      // Success
      onSuccess?.();
      onClose();
    } catch (err) {
      // Show the actual error message from Convex
      const errorMessage = err instanceof Error ? err.message : "Failed to upload document. Please try again.";
      setError(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-2xl font-bold text-white">Upload Document</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 rounded"
            aria-label="Close modal"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-red-900/20 border border-red-500 text-red-400 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* File Upload Zone */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              File
            </label>
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragOver
                  ? "border-teal-600 bg-teal-600/10"
                  : "border-gray-600 hover:border-gray-500 bg-gray-700/50"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={handleClick}
            >
              <DocumentArrowUpIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              {selectedFile ? (
                <div>
                  <p className="text-white font-medium">{selectedFile.name}</p>
                  <p className="text-gray-400 text-sm mt-1">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-white mb-2">
                    Drag & drop files here or click to browse
                  </p>
                  <p className="text-gray-400 text-sm">
                    Accepts: PDF, Word, Excel, PNG, JPG (max 50MB)
                  </p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                onChange={handleFileInputChange}
              />
            </div>
          </div>

          {/* AI Analysis Button */}
          {selectedFile && !category && (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={handleAIAnalysis}
                disabled={isAnalyzing}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-teal-700 hover:from-purple-700 hover:to-teal-800 disabled:from-gray-600 disabled:to-gray-700 text-white rounded-lg transition-all font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
              >
                {isAnalyzing ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    <span>Analyzing document...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
                      />
                    </svg>
                    <span>Analyze with AI</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* AI Confidence Badge */}
          {aiConfidence && (
            <div className="flex items-center justify-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                aiConfidence === "high"
                  ? "bg-green-500/20 text-green-400 border border-green-500"
                  : aiConfidence === "medium"
                  ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500"
                  : "bg-red-500/20 text-red-400 border border-red-500"
              }`}>
                AI Confidence: {aiConfidence.toUpperCase()}
              </span>
            </div>
          )}

          {/* Category Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Route To:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {/* Property */}
              <button
                type="button"
                onClick={() => setCategory("property")}
                className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
                  category === "property"
                    ? "border-teal-600 bg-teal-600/20 text-teal-500"
                    : "border-gray-600 bg-gray-700 text-gray-400 hover:border-gray-500"
                }`}
              >
                <BuildingOffice2Icon className="w-8 h-8 mb-2" />
                <span className="text-sm font-medium">Property</span>
              </button>

              {/* Participant */}
              <button
                type="button"
                onClick={() => setCategory("participant")}
                className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
                  category === "participant"
                    ? "border-teal-600 bg-teal-600/20 text-teal-500"
                    : "border-gray-600 bg-gray-700 text-gray-400 hover:border-gray-500"
                }`}
              >
                <UserIcon className="w-8 h-8 mb-2" />
                <span className="text-sm font-medium">Participant</span>
              </button>

              {/* Compliance */}
              <button
                type="button"
                onClick={() => setCategory("organisation")}
                className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
                  category === "organisation"
                    ? "border-teal-600 bg-teal-600/20 text-teal-500"
                    : "border-gray-600 bg-gray-700 text-gray-400 hover:border-gray-500"
                }`}
              >
                <ShieldCheckIcon className="w-8 h-8 mb-2" />
                <span className="text-sm font-medium">Compliance</span>
              </button>

              {/* Office */}
              <button
                type="button"
                onClick={() => setCategory("organisation")}
                className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
                  category === "organisation"
                    ? "border-teal-600 bg-teal-600/20 text-teal-500"
                    : "border-gray-600 bg-gray-700 text-gray-400 hover:border-gray-500"
                }`}
              >
                <BuildingLibraryIcon className="w-8 h-8 mb-2" />
                <span className="text-sm font-medium">Office</span>
              </button>
            </div>
          </div>

          {/* Entity Linker */}
          {category === "property" && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Select Property
              </label>
              <select
                value={linkedEntityId}
                onChange={(e) => setLinkedEntityId(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-teal-600"
              >
                <option value="">-- Select Property --</option>
                {properties?.map((property) => (
                  <option key={property._id} value={property._id}>
                    {property.addressLine1}, {property.suburb}
                  </option>
                ))}
              </select>
            </div>
          )}

          {category === "participant" && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Select Participant
              </label>
              <select
                value={linkedEntityId}
                onChange={(e) => setLinkedEntityId(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-teal-600"
              >
                <option value="">-- Select Participant --</option>
                {participants?.map((participant) => (
                  <option key={participant._id} value={participant._id}>
                    {participant.firstName} {participant.lastName} - NDIS{" "}
                    {participant.ndisNumber}
                  </option>
                ))}
              </select>
            </div>
          )}

          {category === "organisation" && (
            <div className="bg-teal-950/20 border border-teal-600 text-teal-500 px-4 py-3 rounded">
              <p className="text-sm">
                <strong>Compliance documents</strong> with expiry dates will automatically
                create compliance certifications.
              </p>
            </div>
          )}

          {/* Document Type */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Document Type {aiFilledFields.has("documentType") && (
                <span className="ml-2 text-xs text-teal-500">✨ AI-filled</span>
              )}
            </label>
            <select
              value={documentType}
              onChange={(e) => {
                setDocumentType(e.target.value as DocumentType);
                // Remove AI-filled indicator when user manually edits
                if (aiFilledFields.has("documentType")) {
                  const newFields = new Set(aiFilledFields);
                  newFields.delete("documentType");
                  setAiFilledFields(newFields);
                }
              }}
              className={`w-full px-3 py-2 bg-gray-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-teal-600 ${
                aiFilledFields.has("documentType")
                  ? "border-2 border-teal-600 bg-teal-600/10"
                  : "border border-gray-600"
              }`}
            >
              {getDocumentTypeOptions().map((type) => (
                <option key={type} value={type}>
                  {formatDocumentTypeLabel(type)}
                </option>
              ))}
            </select>
          </div>

          {/* Optional Property Link for Compliance */}
          {category === "organisation" &&
            COMPLIANCE_DOC_TYPES.includes(documentType) && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Link to Property (Optional)
                </label>
                <select
                  value={linkedEntityId}
                  onChange={(e) => setLinkedEntityId(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                >
                  <option value="">-- Organisation Wide --</option>
                  {properties?.map((property) => (
                    <option key={property._id} value={property._id}>
                      {property.addressLine1}, {property.suburb}
                    </option>
                  ))}
                </select>
              </div>
            )}

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Description (Optional) {aiFilledFields.has("description") && (
                <span className="ml-2 text-xs text-teal-500">✨ AI-filled</span>
              )}
            </label>
            <textarea
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (aiFilledFields.has("description")) {
                  const newFields = new Set(aiFilledFields);
                  newFields.delete("description");
                  setAiFilledFields(newFields);
                }
              }}
              rows={3}
              className={`w-full px-3 py-2 bg-gray-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-teal-600 ${
                aiFilledFields.has("description")
                  ? "border-2 border-teal-600 bg-teal-600/10"
                  : "border border-gray-600"
              }`}
              placeholder="Add notes about this document..."
            />
          </div>

          {/* Expiry Date */}
          {(category === "organisation" || COMPLIANCE_DOC_TYPES.includes(documentType)) && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Expiry Date
                {category === "organisation" && (
                  <span className="text-red-400 ml-1">*</span>
                )}
                {aiFilledFields.has("expiryDate") && (
                  <span className="ml-2 text-xs text-teal-500">✨ AI-filled</span>
                )}
              </label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => {
                  setExpiryDate(e.target.value);
                  if (aiFilledFields.has("expiryDate")) {
                    const newFields = new Set(aiFilledFields);
                    newFields.delete("expiryDate");
                    setAiFilledFields(newFields);
                  }
                }}
                className={`w-full px-3 py-2 bg-gray-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-teal-600 ${
                  aiFilledFields.has("expiryDate")
                    ? "border-2 border-teal-600 bg-teal-600/10"
                    : "border border-gray-600"
                }`}
              />
            </div>
          )}

          {/* Invoice Fields */}
          {showInvoiceFields && (
            <div className="border-t border-gray-700 pt-6">
              <h3 className="text-lg font-semibold text-white mb-4">Invoice Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Invoice Number {aiFilledFields.has("invoiceNumber") && (
                      <span className="ml-2 text-xs text-teal-500">✨ AI</span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => {
                      setInvoiceNumber(e.target.value);
                      if (aiFilledFields.has("invoiceNumber")) {
                        const newFields = new Set(aiFilledFields);
                        newFields.delete("invoiceNumber");
                        setAiFilledFields(newFields);
                      }
                    }}
                    className={`w-full px-3 py-2 bg-gray-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-teal-600 ${
                      aiFilledFields.has("invoiceNumber")
                        ? "border-2 border-teal-600 bg-teal-600/10"
                        : "border border-gray-600"
                    }`}
                    placeholder="INV-12345"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Invoice Date {aiFilledFields.has("invoiceDate") && (
                      <span className="ml-2 text-xs text-teal-500">✨ AI</span>
                    )}
                  </label>
                  <input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => {
                      setInvoiceDate(e.target.value);
                      if (aiFilledFields.has("invoiceDate")) {
                        const newFields = new Set(aiFilledFields);
                        newFields.delete("invoiceDate");
                        setAiFilledFields(newFields);
                      }
                    }}
                    className={`w-full px-3 py-2 bg-gray-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-teal-600 ${
                      aiFilledFields.has("invoiceDate")
                        ? "border-2 border-teal-600 bg-teal-600/10"
                        : "border border-gray-600"
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Amount {aiFilledFields.has("invoiceAmount") && (
                      <span className="ml-2 text-xs text-teal-500">✨ AI</span>
                    )}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-400">$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={invoiceAmount}
                      onChange={(e) => {
                        setInvoiceAmount(e.target.value);
                        if (aiFilledFields.has("invoiceAmount")) {
                          const newFields = new Set(aiFilledFields);
                          newFields.delete("invoiceAmount");
                          setAiFilledFields(newFields);
                        }
                      }}
                      className={`w-full pl-8 pr-3 py-2 bg-gray-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-teal-600 ${
                        aiFilledFields.has("invoiceAmount")
                          ? "border-2 border-teal-600 bg-teal-600/10"
                          : "border border-gray-600"
                      }`}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Vendor {aiFilledFields.has("vendor") && (
                      <span className="ml-2 text-xs text-teal-500">✨ AI</span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={vendor}
                    onChange={(e) => {
                      setVendor(e.target.value);
                      if (aiFilledFields.has("vendor")) {
                        const newFields = new Set(aiFilledFields);
                        newFields.delete("vendor");
                        setAiFilledFields(newFields);
                      }
                    }}
                    className={`w-full px-3 py-2 bg-gray-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-teal-600 ${
                      aiFilledFields.has("vendor")
                        ? "border-2 border-teal-600 bg-teal-600/10"
                        : "border border-gray-600"
                    }`}
                    placeholder="Vendor name"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="flex items-center gap-2 text-gray-300">
                  <input
                    type="checkbox"
                    checked={isPaid}
                    onChange={(e) => setIsPaid(e.target.checked)}
                    className="w-4 h-4 bg-gray-700 border-gray-600 rounded focus:ring-2 focus:ring-teal-600"
                  />
                  <span className="text-sm">Paid</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-700">
          <button
            onClick={onClose}
            disabled={isUploading}
            className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isFormValid() || isUploading}
            className="px-4 py-2 bg-teal-700 text-white rounded hover:bg-teal-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? "Uploading..." : "Upload & File"}
          </button>
        </div>
      </div>
    </div>
  );
}
