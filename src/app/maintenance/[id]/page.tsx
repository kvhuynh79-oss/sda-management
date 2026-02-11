"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import Link from "next/link";
import Header from "@/components/Header";
import { RequireAuth } from "@/components/RequireAuth";
import { Id } from "../../../../convex/_generated/dataModel";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useOrganization } from "@/contexts/OrganizationContext";

interface PendingMedia {
  file: File;
  preview: string;
  description: string;
  photoType: "before" | "during" | "after" | "issue";
  isVideo: boolean;
}

type MaintenanceStatus = "reported" | "awaiting_quotes" | "quoted" | "approved" | "scheduled" | "in_progress" | "completed" | "cancelled";

export default function MaintenanceRequestDetailPage() {
  const router = useRouter();
  const params = useParams();
  const requestId = params.id as Id<"maintenanceRequests">;

  const [user, setUser] = useState<{ id: string; role: string } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [showAddQuote, setShowAddQuote] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showRequestQuoteModal, setShowRequestQuoteModal] = useState(false);

  const request = useQuery(api.maintenanceRequests.getById, user ? { userId: user.id as Id<"users">, requestId } : "skip");
  const photos = useQuery(api.maintenancePhotos.getByMaintenanceRequest, user ? {
    userId: user.id as Id<"users">,
    maintenanceRequestId: requestId,
  } : "skip");
  const quotes = useQuery(api.maintenanceQuotes.getByMaintenanceRequest, user ? {
    userId: user.id as Id<"users">,
    maintenanceRequestId: requestId,
  } : "skip");
  const contractors = useQuery(api.contractors.getAll, user ? { userId: user.id as Id<"users"> } : "skip");
  const quoteRequests = useQuery(api.quoteRequests.getByMaintenanceRequest, user ? {
    userId: user.id as Id<"users">,
    maintenanceRequestId: requestId,
  } : "skip");

  const updateRequest = useMutation(api.maintenanceRequests.update);
  const completeRequest = useMutation(api.maintenanceRequests.completeRequest);
  const generateUploadUrl = useMutation(api.maintenancePhotos.generateUploadUrl);
  const addPhoto = useMutation(api.maintenancePhotos.addPhoto);
  const deletePhoto = useMutation(api.maintenancePhotos.deletePhoto);
  const addQuote = useMutation(api.maintenanceQuotes.addQuote);
  const acceptQuote = useMutation(api.maintenanceQuotes.acceptQuote);
  const rejectQuote = useMutation(api.maintenanceQuotes.rejectQuote);
  const deleteQuote = useMutation(api.maintenanceQuotes.deleteQuote);
  const createAndSendQuoteRequest = useAction(api.quoteRequests.createAndSendEmail);
  const { confirm: confirmDialog, alert: alertDialog } = useConfirmDialog();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingMedia, setPendingMedia] = useState<PendingMedia[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  const [formData, setFormData] = useState({
    status: "reported" as MaintenanceStatus,
    priority: "medium" as "urgent" | "high" | "medium" | "low",
    title: "",
    description: "",
    scheduledDate: "",
    completedDate: "",
    contractorName: "",
    contractorContact: "",
    quotedAmount: "",
    actualCost: "",
    invoiceNumber: "",
    completionNotes: "",
    warrantyPeriodMonths: "",
    notes: "",
  });

  const [newQuote, setNewQuote] = useState({
    contractorName: "",
    contractorContact: "",
    contractorEmail: "",
    quoteAmount: "",
    quoteDate: new Date().toISOString().split("T")[0],
    validUntil: "",
    estimatedDays: "",
    warrantyMonths: "",
    description: "",
  });

  const [completeData, setCompleteData] = useState({
    completedDate: new Date().toISOString().split("T")[0],
    actualCost: "",
    invoiceNumber: "",
    completionNotes: "",
    warrantyPeriodMonths: "12",
  });

  useEffect(() => {
    const storedUser = localStorage.getItem("sda_user");
    if (!storedUser) {
      router.push("/login");
      return;
    }
    const parsed = JSON.parse(storedUser);
    const userId = parsed.id || parsed._id;

    // If user ID is missing, clear session and redirect to login
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

  useEffect(() => {
    if (request) {
      setFormData({
        status: request.status as MaintenanceStatus,
        priority: request.priority,
        title: request.title,
        description: request.description,
        scheduledDate: request.scheduledDate || "",
        completedDate: request.completedDate || "",
        contractorName: request.contractorName || "",
        contractorContact: request.contractorContact || "",
        quotedAmount: request.quotedAmount?.toString() || "",
        actualCost: request.actualCost?.toString() || "",
        invoiceNumber: request.invoiceNumber || "",
        completionNotes: (request as any).completionNotes || "",
        warrantyPeriodMonths: (request as any).warrantyPeriodMonths?.toString() || "",
        notes: request.notes || "",
      });
    }
  }, [request]);

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newMedia: PendingMedia[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isVideo = file.type.startsWith("video/");
      const isImage = file.type.startsWith("image/");

      if (isImage || isVideo) {
        newMedia.push({
          file,
          preview: URL.createObjectURL(file),
          description: "",
          photoType: "issue",
          isVideo,
        });
      }
    }
    setPendingMedia([...pendingMedia, ...newMedia]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removePendingMedia = (index: number) => {
    const newMedia = [...pendingMedia];
    URL.revokeObjectURL(newMedia[index].preview);
    newMedia.splice(index, 1);
    setPendingMedia(newMedia);
  };

  const updatePendingMediaDescription = (index: number, description: string) => {
    const newMedia = [...pendingMedia];
    newMedia[index].description = description;
    setPendingMedia(newMedia);
  };

  const updatePendingMediaType = (index: number, photoType: PendingMedia["photoType"]) => {
    const newMedia = [...pendingMedia];
    newMedia[index].photoType = photoType;
    setPendingMedia(newMedia);
  };

  const handleDeleteExistingMedia = async (photoId: Id<"maintenancePhotos">) => {
    if (!user) return;
    const confirmed = await confirmDialog({
      title: "Delete Media",
      message: "Are you sure you want to delete this media?",
      variant: "danger",
      confirmLabel: "Yes",
    });
    if (!confirmed) return;
    try {
      await deletePhoto({ userId: user.id as Id<"users">, photoId });
    } catch (err) {
      setError("Failed to delete media");
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    setError("");

    try {
      await updateRequest({
        userId: user.id as Id<"users">,
        requestId,
        status: formData.status,
        priority: formData.priority,
        title: formData.title,
        description: formData.description,
        scheduledDate: formData.scheduledDate || undefined,
        completedDate: formData.completedDate || undefined,
        contractorName: formData.contractorName || undefined,
        contractorContact: formData.contractorContact || undefined,
        quotedAmount: formData.quotedAmount ? parseFloat(formData.quotedAmount) : undefined,
        actualCost: formData.actualCost ? parseFloat(formData.actualCost) : undefined,
        invoiceNumber: formData.invoiceNumber || undefined,
        completionNotes: formData.completionNotes || undefined,
        warrantyPeriodMonths: formData.warrantyPeriodMonths ? parseInt(formData.warrantyPeriodMonths) : undefined,
        notes: formData.notes || undefined,
      });

      // Upload pending media (photos/videos)
      if (pendingMedia.length > 0) {
        setUploadingMedia(true);
        for (const media of pendingMedia) {
          try {
            const uploadUrl = await generateUploadUrl({ userId: user.id as Id<"users"> });
            const response = await fetch(uploadUrl, {
              method: "POST",
              headers: { "Content-Type": media.file.type },
              body: media.file,
            });
            const { storageId } = await response.json();

            await addPhoto({
              maintenanceRequestId: requestId,
              storageId: storageId as Id<"_storage">,
              fileName: media.file.name,
              fileSize: media.file.size,
              fileType: media.file.type,
              description: media.description || undefined,
              photoType: media.photoType,
              uploadedBy: user.id as Id<"users">,
            });
          } catch (mediaErr) {
            console.error("Failed to upload media:", mediaErr);
          }
        }
        setPendingMedia([]);
        setUploadingMedia(false);
      }

      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddQuote = async () => {
    if (!user || !newQuote.contractorName || !newQuote.quoteAmount) return;

    try {
      await addQuote({
        maintenanceRequestId: requestId,
        contractorName: newQuote.contractorName,
        contractorContact: newQuote.contractorContact || undefined,
        contractorEmail: newQuote.contractorEmail || undefined,
        quoteAmount: parseFloat(newQuote.quoteAmount),
        quoteDate: newQuote.quoteDate,
        validUntil: newQuote.validUntil || undefined,
        estimatedDays: newQuote.estimatedDays ? parseInt(newQuote.estimatedDays) : undefined,
        warrantyMonths: newQuote.warrantyMonths ? parseInt(newQuote.warrantyMonths) : undefined,
        description: newQuote.description || undefined,
        createdBy: user.id as Id<"users">,
      });
      setShowAddQuote(false);
      setNewQuote({
        contractorName: "",
        contractorContact: "",
        contractorEmail: "",
        quoteAmount: "",
        quoteDate: new Date().toISOString().split("T")[0],
        validUntil: "",
        estimatedDays: "",
        warrantyMonths: "",
        description: "",
      });
    } catch (err) {
      setError("Failed to add quote");
    }
  };

  const handleAcceptQuote = async (quoteId: Id<"maintenanceQuotes">) => {
    const confirmed = await confirmDialog({
      title: "Accept Quote",
      message: "Accept this quote and award the work to this contractor?",
      variant: "danger",
      confirmLabel: "Yes",
    });
    if (!confirmed) return;
    try {
      await acceptQuote({ userId: user!.id as Id<"users">, quoteId });
    } catch (err) {
      setError("Failed to accept quote");
    }
  };

  const handleRejectQuote = async (quoteId: Id<"maintenanceQuotes">) => {
    const reason = prompt("Reason for rejection (optional):");
    try {
      await rejectQuote({ userId: user!.id as Id<"users">, quoteId, rejectionReason: reason || undefined });
    } catch (err) {
      setError("Failed to reject quote");
    }
  };

  const handleComplete = async () => {
    if (!user) return;
    if (!completeData.completionNotes) {
      setError("Please enter how the completion was confirmed");
      return;
    }

    try {
      await completeRequest({
        userId: user.id as Id<"users">,
        requestId,
        completedDate: completeData.completedDate,
        actualCost: completeData.actualCost ? parseFloat(completeData.actualCost) : undefined,
        invoiceNumber: completeData.invoiceNumber || undefined,
        completionNotes: completeData.completionNotes,
        warrantyPeriodMonths: completeData.warrantyPeriodMonths ? parseInt(completeData.warrantyPeriodMonths) : undefined,
      });
      setShowCompleteModal(false);
    } catch (err) {
      setError("Failed to complete request");
    }
  };

  if (!user) {
    return <LoadingScreen />;
  }

  if (request === undefined) {
    return <LoadingScreen />;
  }

  if (request === null) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header currentPage="maintenance" />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <p className="text-gray-400">Maintenance request not found</p>
            <Link href="/maintenance" className="text-teal-500 hover:text-teal-400 mt-4 inline-block">
              Back to Maintenance
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      reported: "bg-red-600",
      awaiting_quotes: "bg-orange-600",
      quoted: "bg-yellow-600",
      approved: "bg-teal-700",
      scheduled: "bg-purple-600",
      in_progress: "bg-cyan-600",
      completed: "bg-green-600",
      cancelled: "bg-gray-600",
    };
    return colors[status] || "bg-gray-600";
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      reported: "Reported",
      awaiting_quotes: "Awaiting Quotes",
      quoted: "Quoted",
      approved: "Approved",
      scheduled: "Scheduled",
      in_progress: "In Progress",
      completed: "Completed",
      cancelled: "Cancelled",
    };
    return labels[status] || status;
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      urgent: "bg-red-600",
      high: "bg-orange-600",
      medium: "bg-yellow-600",
      low: "bg-gray-600",
    };
    return colors[priority] || "bg-gray-600";
  };

  const canComplete = request.status !== "completed" && request.status !== "cancelled";
  const acceptedQuote = quotes?.find((q) => q.status === "accepted");

  return (
    <RequireAuth>
    <div className="min-h-screen bg-gray-900">
      <Header currentPage="maintenance" />

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
              <Link href="/maintenance" className="text-gray-400 hover:text-white">
                Maintenance
              </Link>
            </li>
            <li className="text-gray-400">/</li>
            <li className="text-white">{request.title}</li>
          </ol>
        </nav>

        {error && (
          <div className="mb-6 p-4 bg-red-900/50 border border-red-600 rounded-lg text-red-200">
            {error}
          </div>
        )}

        <div className="bg-gray-800 rounded-lg p-6">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className={`px-2 py-1 rounded text-xs text-white ${getPriorityColor(request.priority)}`}>
                  {request.priority.toUpperCase()}
                </span>
                <span className={`px-2 py-1 rounded text-xs text-white ${getStatusColor(request.status)}`}>
                  {getStatusLabel(request.status)}
                </span>
                <span className="text-gray-400 text-sm">{request.category}</span>
              </div>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="text-xl font-bold text-white bg-gray-700 border border-gray-600 rounded px-3 py-1 w-full"
                />
              ) : (
                <h1 className="text-xl font-bold text-white">{request.title}</h1>
              )}
            </div>
            <div className="flex gap-2">
              {canComplete && !isEditing && (
                <button
                  onClick={() => setShowCompleteModal(true)}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                >
                  Mark Complete
                </button>
              )}
              {isEditing ? (
                <>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving || uploadingMedia}
                    className="px-4 py-2 bg-teal-700 hover:bg-teal-800 disabled:bg-gray-600 text-white rounded-lg transition-colors"
                  >
                    {isSaving ? (uploadingMedia ? "Uploading..." : "Saving...") : "Save Changes"}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg transition-colors"
                >
                  Edit Request
                </button>
              )}
            </div>
          </div>

          {/* Location */}
          <div className="mb-6 p-4 bg-gray-700/50 rounded-lg">
            <p className="text-gray-400 text-sm">Location</p>
            <p className="text-white">
              {request.dwelling?.dwellingName} at {request.property?.propertyName || request.property?.addressLine1}
            </p>
            <p className="text-gray-400 text-sm">
              {request.property?.suburb}, {request.property?.state}
            </p>
          </div>

          {/* Status & Priority (Edit Mode) */}
          {isEditing && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as MaintenanceStatus })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  <option value="reported">Reported</option>
                  <option value="awaiting_quotes">Awaiting Quotes</option>
                  <option value="quoted">Quoted</option>
                  <option value="approved">Approved</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>
          )}

          {/* Description */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-300 mb-1">Description</h3>
            {isEditing ? (
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              />
            ) : (
              <p className="text-white whitespace-pre-wrap">{request.description}</p>
            )}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div>
              <p className="text-gray-400 text-sm">Reported Date</p>
              <p className="text-white">{request.reportedDate}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Reported By</p>
              <p className="text-white">{request.reportedBy || "-"}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Scheduled Date</p>
              {isEditing ? (
                <input
                  type="date"
                  value={formData.scheduledDate}
                  onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                  className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                />
              ) : (
                <p className="text-white">{request.scheduledDate || "-"}</p>
              )}
            </div>
            <div>
              <p className="text-gray-400 text-sm">Completed Date</p>
              <p className="text-white">{request.completedDate || "-"}</p>
            </div>
          </div>

          {/* Quotes Section */}
          <div className="border-t border-gray-700 pt-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">Contractor Quotes</h3>
              {request.status !== "completed" && request.status !== "cancelled" && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowRequestQuoteModal(true)}
                    className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
                  >
                    Request Quotes
                  </button>
                  <button
                    onClick={() => setShowAddQuote(true)}
                    className="px-3 py-1 bg-teal-700 hover:bg-teal-800 text-white rounded text-sm"
                  >
                    + Add Quote
                  </button>
                </div>
              )}
            </div>

            {/* Quote Requests Sent */}
            {quoteRequests && quoteRequests.length > 0 && (
              <div className="mb-4">
                <p className="text-gray-400 text-sm mb-2">Quote Requests Sent:</p>
                <div className="flex flex-wrap gap-2">
                  {quoteRequests.map((qr) => (
                    <span
                      key={qr._id}
                      className={`px-2 py-1 rounded text-xs ${
                        qr.status === "quoted"
                          ? "bg-green-600/20 text-green-400 border border-green-600"
                          : qr.status === "viewed"
                          ? "bg-teal-700/20 text-teal-500 border border-teal-700"
                          : qr.status === "declined"
                          ? "bg-red-600/20 text-red-400 border border-red-600"
                          : "bg-yellow-600/20 text-yellow-400 border border-yellow-600"
                      }`}
                    >
                      {qr.contractor?.companyName}: {qr.status}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {quotes && quotes.length > 0 ? (
              <div className="space-y-3">
                {quotes.map((quote) => (
                  <div
                    key={quote._id}
                    className={`p-4 rounded-lg border ${
                      quote.status === "accepted"
                        ? "bg-green-900/20 border-green-600"
                        : quote.status === "rejected"
                        ? "bg-red-900/20 border-red-600"
                        : "bg-gray-700/50 border-gray-600"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-white font-medium">{quote.contractorName}</p>
                        <p className="text-gray-400 text-sm">
                          {quote.contractorContact} {quote.contractorEmail && `| ${quote.contractorEmail}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-white">${quote.quoteAmount.toFixed(2)}</p>
                        <p className="text-gray-400 text-xs">
                          Quoted: {quote.quoteDate}
                          {quote.validUntil && ` | Valid until: ${quote.validUntil}`}
                        </p>
                      </div>
                    </div>
                    {quote.description && (
                      <p className="text-gray-300 text-sm mt-2">{quote.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-3 text-sm">
                      {quote.estimatedDays && (
                        <span className="text-gray-400">Est. {quote.estimatedDays} days</span>
                      )}
                      {quote.warrantyMonths && (
                        <span className="text-gray-400">{quote.warrantyMonths} month warranty</span>
                      )}
                      <span
                        className={`px-2 py-0.5 rounded text-xs ${
                          quote.status === "accepted"
                            ? "bg-green-600 text-white"
                            : quote.status === "rejected"
                            ? "bg-red-600 text-white"
                            : "bg-yellow-600 text-white"
                        }`}
                      >
                        {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
                      </span>
                    </div>
                    {quote.status === "pending" && request.status !== "completed" && (
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => handleAcceptQuote(quote._id)}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
                        >
                          Accept Quote
                        </button>
                        <button
                          onClick={() => handleRejectQuote(quote._id)}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-sm">No quotes received yet</p>
            )}
          </div>

          {/* Contractor Details (from accepted quote or manual entry) */}
          <div className="border-t border-gray-700 pt-6 mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">Contractor Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-gray-400 text-sm">Contractor Name</p>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.contractorName}
                    onChange={(e) => setFormData({ ...formData, contractorName: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                ) : (
                  <p className="text-white">{request.contractorName || "-"}</p>
                )}
              </div>
              <div>
                <p className="text-gray-400 text-sm">Contractor Contact</p>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.contractorContact}
                    onChange={(e) => setFormData({ ...formData, contractorContact: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                ) : (
                  <p className="text-white">{request.contractorContact || "-"}</p>
                )}
              </div>
            </div>
          </div>

          {/* Costs */}
          <div className="border-t border-gray-700 pt-6 mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">Costs</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-gray-400 text-sm">Quoted Amount</p>
                {isEditing ? (
                  <input
                    type="number"
                    step="0.01"
                    value={formData.quotedAmount}
                    onChange={(e) => setFormData({ ...formData, quotedAmount: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                ) : (
                  <p className="text-white">
                    {request.quotedAmount ? `$${request.quotedAmount.toFixed(2)}` : "-"}
                  </p>
                )}
              </div>
              <div>
                <p className="text-gray-400 text-sm">Actual Cost</p>
                {isEditing ? (
                  <input
                    type="number"
                    step="0.01"
                    value={formData.actualCost}
                    onChange={(e) => setFormData({ ...formData, actualCost: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                ) : (
                  <p className="text-white">
                    {request.actualCost ? `$${request.actualCost.toFixed(2)}` : "-"}
                  </p>
                )}
              </div>
              <div>
                <p className="text-gray-400 text-sm">Invoice Number</p>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.invoiceNumber}
                    onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                ) : (
                  <p className="text-white">{request.invoiceNumber || "-"}</p>
                )}
              </div>
            </div>
          </div>

          {/* Warranty (if completed) */}
          {request.status === "completed" && (
            <div className="border-t border-gray-700 pt-6 mb-6">
              <h3 className="text-lg font-semibold text-white mb-4">Warranty Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <p className="text-gray-400 text-sm">Warranty Period</p>
                  <p className="text-white">
                    {(request as any).warrantyPeriodMonths ? `${(request as any).warrantyPeriodMonths} months` : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Warranty Expires</p>
                  <p className="text-white">{(request as any).warrantyExpiryDate || "-"}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Completion Confirmed By</p>
                  <p className="text-white">{(request as any).completionNotes || "-"}</p>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="border-t border-gray-700 pt-6 mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">Notes</h3>
            {isEditing ? (
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              />
            ) : (
              <p className="text-white whitespace-pre-wrap">{request.notes || "No notes"}</p>
            )}
          </div>

          {/* Photos & Videos */}
          <div className="border-t border-gray-700 pt-6">
            <h3 className="text-lg font-semibold text-white mb-4">Photos & Videos</h3>

            {/* Existing Media */}
            {photos && photos.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                {photos.map((media) => (
                  <div key={media._id} className="bg-gray-700 rounded-lg p-3">
                    <div className="relative aspect-video mb-2">
                      {media.url && (
                        media.fileType?.startsWith("video/") ? (
                          <video
                            src={media.url}
                            controls
                            className="w-full h-full object-cover rounded"
                          />
                        ) : (
                          <img
                            src={media.url}
                            alt={media.description || media.fileName}
                            className="w-full h-full object-cover rounded cursor-pointer"
                            onClick={() => window.open(media.url!, "_blank")}
                          />
                        )
                      )}
                      {isEditing && (
                        <button
                          type="button"
                          onClick={() => handleDeleteExistingMedia(media._id)}
                          className="absolute top-1 right-1 w-6 h-6 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center text-sm"
                        >
                          X
                        </button>
                      )}
                    </div>
                    <p className="text-white text-sm">{media.photoType.replace("_", " ")}</p>
                    {media.description && (
                      <p className="text-gray-400 text-xs">{media.description}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Add Media (Edit Mode) */}
            {isEditing && (
              <>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleMediaSelect}
                  accept="image/*,video/*"
                  multiple
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors mb-4"
                >
                  + Add Photos/Videos
                </button>

                {/* Pending Media */}
                {pendingMedia.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                    {pendingMedia.map((media, index) => (
                      <div key={index} className="bg-gray-700 rounded-lg p-3 border-2 border-dashed border-teal-600">
                        <div className="relative aspect-video mb-2">
                          {media.isVideo ? (
                            <video
                              src={media.preview}
                              controls
                              className="w-full h-full object-cover rounded"
                            />
                          ) : (
                            <img
                              src={media.preview}
                              alt={`New media ${index + 1}`}
                              className="w-full h-full object-cover rounded"
                            />
                          )}
                          <button
                            type="button"
                            onClick={() => removePendingMedia(index)}
                            className="absolute top-1 right-1 w-6 h-6 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center text-sm"
                          >
                            X
                          </button>
                        </div>
                        <select
                          value={media.photoType}
                          onChange={(e) =>
                            updatePendingMediaType(index, e.target.value as PendingMedia["photoType"])
                          }
                          className="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm mb-2"
                        >
                          <option value="issue">Issue</option>
                          <option value="before">Before Work</option>
                          <option value="during">During Work</option>
                          <option value="after">After Work</option>
                        </select>
                        <input
                          type="text"
                          value={media.description}
                          onChange={(e) => updatePendingMediaDescription(index, e.target.value)}
                          placeholder="Description (optional)"
                          className="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm"
                        />
                        <p className="text-teal-500 text-xs mt-1">
                          {media.isVideo ? "Video" : "Photo"} - will be uploaded on save
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {!isEditing && (!photos || photos.length === 0) && (
              <p className="text-gray-400">No photos or videos uploaded</p>
            )}
          </div>
        </div>

        {/* Add Quote Modal */}
        {showAddQuote && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold text-white mb-4">Add Contractor Quote</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Contractor Name *</label>
                  <input
                    type="text"
                    value={newQuote.contractorName}
                    onChange={(e) => setNewQuote({ ...newQuote, contractorName: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Contact Phone</label>
                    <input
                      type="text"
                      value={newQuote.contractorContact}
                      onChange={(e) => setNewQuote({ ...newQuote, contractorContact: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Email</label>
                    <input
                      type="email"
                      value={newQuote.contractorEmail}
                      onChange={(e) => setNewQuote({ ...newQuote, contractorEmail: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Quote Amount ($) *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newQuote.quoteAmount}
                      onChange={(e) => setNewQuote({ ...newQuote, quoteAmount: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Quote Date</label>
                    <input
                      type="date"
                      value={newQuote.quoteDate}
                      onChange={(e) => setNewQuote({ ...newQuote, quoteDate: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Valid Until</label>
                    <input
                      type="date"
                      value={newQuote.validUntil}
                      onChange={(e) => setNewQuote({ ...newQuote, validUntil: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Est. Days to Complete</label>
                    <input
                      type="number"
                      value={newQuote.estimatedDays}
                      onChange={(e) => setNewQuote({ ...newQuote, estimatedDays: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Warranty (months)</label>
                  <input
                    type="number"
                    value={newQuote.warrantyMonths}
                    onChange={(e) => setNewQuote({ ...newQuote, warrantyMonths: e.target.value })}
                    placeholder="e.g., 12"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Description/Scope</label>
                  <textarea
                    value={newQuote.description}
                    onChange={(e) => setNewQuote({ ...newQuote, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowAddQuote(false)}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddQuote}
                  className="flex-1 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg"
                >
                  Add Quote
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Complete Modal */}
        {showCompleteModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg p-6 max-w-lg w-full">
              <h2 className="text-xl font-bold text-white mb-4">Mark as Completed</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Completion Date *</label>
                  <input
                    type="date"
                    value={completeData.completedDate}
                    onChange={(e) => setCompleteData({ ...completeData, completedDate: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">How was completion confirmed? *</label>
                  <select
                    value={completeData.completionNotes}
                    onChange={(e) => setCompleteData({ ...completeData, completionNotes: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                  >
                    <option value="">Select confirmation method</option>
                    <option value="Phone call from contractor">Phone call from contractor</option>
                    <option value="Email confirmation from contractor">Email confirmation from contractor</option>
                    <option value="Photo evidence received">Photo evidence received</option>
                    <option value="On-site inspection verified">On-site inspection verified</option>
                    <option value="Tenant/SIL confirmed completion">Tenant/SIL confirmed completion</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Actual Cost ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={completeData.actualCost}
                      onChange={(e) => setCompleteData({ ...completeData, actualCost: e.target.value })}
                      placeholder={request.quotedAmount?.toString() || ""}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Invoice Number</label>
                    <input
                      type="text"
                      value={completeData.invoiceNumber}
                      onChange={(e) => setCompleteData({ ...completeData, invoiceNumber: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Warranty Period (months)</label>
                  <input
                    type="number"
                    value={completeData.warrantyPeriodMonths}
                    onChange={(e) => setCompleteData({ ...completeData, warrantyPeriodMonths: e.target.value })}
                    placeholder="12"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                  />
                  <p className="text-gray-400 text-xs mt-1">For warranty tracking purposes</p>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowCompleteModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleComplete}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
                >
                  Mark Complete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Request Quote Modal */}
        {showRequestQuoteModal && (
          <RequestQuoteModal
            request={request}
            contractors={contractors || []}
            photos={photos || []}
            quoteRequests={quoteRequests || []}
            onClose={() => setShowRequestQuoteModal(false)}
            onSend={async (contractorId, emailSubject, emailBody, includesPhotos) => {
              await createAndSendQuoteRequest({
                maintenanceRequestId: requestId,
                contractorId: contractorId as Id<"contractors">,
                emailSubject,
                emailBody,
                includesPhotos,
                expiryDays: 7,
                createdBy: user?.id as Id<"users">,
                baseUrl: window.location.origin,
              });
              setShowRequestQuoteModal(false);
            }}
          />
        )}
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

function RequestQuoteModal({
  request,
  contractors,
  photos,
  quoteRequests,
  onClose,
  onSend,
}: {
  request: any;
  contractors: any[];
  photos: any[];
  quoteRequests: any[];
  onClose: () => void;
  onSend: (contractorId: string, subject: string, body: string, includesPhotos: boolean) => Promise<void>;
}) {
  const { organization } = useOrganization();
  const [selectedContractors, setSelectedContractors] = useState<string[]>([]);
  const [includePhotos, setIncludePhotos] = useState(true);
  const [customMessage, setCustomMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [filterSpecialty, setFilterSpecialty] = useState<string>("all");

  // Filter contractors by category match and not already requested
  const alreadyRequestedIds = quoteRequests.map((qr: any) => qr.contractorId);
  const matchingContractors = contractors.filter((c) => {
    if (alreadyRequestedIds.includes(c._id)) return false;
    if (filterSpecialty !== "all" && c.specialty !== filterSpecialty) return false;
    return true;
  });

  const categoryContractors = contractors.filter(
    (c) => c.specialty === request.category || c.specialty === "multi_trade"
  );

  const defaultMessage = `We have a maintenance request that requires attention and would like to request a quote from you.

Job Details:
- Location: ${request.property?.addressLine1}, ${request.property?.suburb}
- Category: ${request.category}
- Priority: ${request.priority.toUpperCase()}

Issue: ${request.title}
${request.description}

Please review the details and submit your quote using the link provided. Include your:
- Total quote amount
- Estimated time to complete
- Earliest availability
- Any warranty offered

We look forward to hearing from you.

Best regards,
${organization?.name || "MySDAManager"}`;

  const toggleContractor = (id: string) => {
    setSelectedContractors((prev) =>
      prev.includes(id) ? prev.filter((cid) => cid !== id) : [...prev, id]
    );
  };

  const handleSend = async () => {
    if (selectedContractors.length === 0) return;
    setIsSending(true);
    try {
      for (const contractorId of selectedContractors) {
        const contractor = contractors.find((c) => c._id === contractorId);
        await onSend(
          contractorId,
          `Quote Request: ${request.title} - ${request.property?.suburb}`,
          customMessage || defaultMessage,
          includePhotos
        );
      }
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-white mb-4">Request Quotes from Contractors</h2>

        <div className="mb-4 p-3 bg-gray-700/50 rounded-lg">
          <p className="text-gray-300 text-sm">
            <strong>Job:</strong> {request.title}
          </p>
          <p className="text-gray-400 text-sm">
            {request.property?.addressLine1}, {request.property?.suburb} | {request.category} | {request.priority.toUpperCase()}
          </p>
        </div>

        {/* Filter */}
        <div className="mb-4">
          <label className="block text-sm text-gray-300 mb-1">Filter by Specialty</label>
          <select
            value={filterSpecialty}
            onChange={(e) => setFilterSpecialty(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
          >
            <option value="all">All Contractors</option>
            <option value={request.category}>{request.category} (Matching)</option>
            <option value="plumbing">Plumbing</option>
            <option value="electrical">Electrical</option>
            <option value="appliances">Appliances</option>
            <option value="building">Building</option>
            <option value="grounds">Grounds</option>
            <option value="safety">Safety</option>
            <option value="general">General</option>
            <option value="multi_trade">Multi-Trade</option>
          </select>
        </div>

        {/* Contractor Selection */}
        <div className="mb-4">
          <label className="block text-sm text-gray-300 mb-2">
            Select Contractors ({selectedContractors.length} selected)
          </label>
          <div className="bg-gray-700 rounded-lg p-3 max-h-48 overflow-y-auto">
            {matchingContractors.length === 0 ? (
              <p className="text-gray-400 text-sm">
                {contractors.length === 0
                  ? "No contractors in system. Add contractors first."
                  : "All matching contractors have already been sent requests."}
              </p>
            ) : (
              <div className="space-y-2">
                {matchingContractors.map((contractor) => (
                  <label
                    key={contractor._id}
                    className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors ${
                      selectedContractors.includes(contractor._id)
                        ? "bg-teal-700/30"
                        : "hover:bg-gray-600"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedContractors.includes(contractor._id)}
                      onChange={() => toggleContractor(contractor._id)}
                      className="rounded bg-gray-600 border-gray-500"
                    />
                    <div className="flex-1">
                      <p className="text-white text-sm">{contractor.companyName}</p>
                      <p className="text-gray-400 text-xs">
                        {contractor.email} | {contractor.specialty}
                      </p>
                    </div>
                    {(contractor.specialty === request.category ||
                      contractor.specialty === "multi_trade") && (
                      <span className="px-2 py-0.5 bg-green-600/30 text-green-400 text-xs rounded">
                        Match
                      </span>
                    )}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Include Photos */}
        <div className="mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includePhotos}
              onChange={(e) => setIncludePhotos(e.target.checked)}
              className="rounded bg-gray-600 border-gray-500"
            />
            <span className="text-gray-300 text-sm">
              Include photos in request ({photos.length} photo{photos.length !== 1 ? "s" : ""})
            </span>
          </label>
        </div>

        {/* Custom Message */}
        <div className="mb-4">
          <label className="block text-sm text-gray-300 mb-1">Message (optional - leave blank for default)</label>
          <textarea
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            rows={6}
            placeholder={defaultMessage}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
          />
        </div>

        {/* Info */}
        <div className="mb-4 p-3 bg-teal-950/30 border border-teal-700 rounded-lg">
          <p className="text-teal-400 text-sm">
            Contractors will receive an email with a unique link to submit their quote. You can track
            responses in the Quotes section above.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={isSending || selectedContractors.length === 0}
            className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg"
          >
            {isSending
              ? "Sending..."
              : `Send to ${selectedContractors.length} Contractor${selectedContractors.length !== 1 ? "s" : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}
