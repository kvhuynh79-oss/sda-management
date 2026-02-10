"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { RequireAuth } from "@/components/RequireAuth";
import CommunicationsHistory from "@/components/CommunicationsHistory";
import GlobalUploadModal from "@/components/GlobalUploadModal";
import Badge from "@/components/ui/Badge";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Id } from "../../../../convex/_generated/dataModel";

export default function ParticipantDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [user, setUser] = useState<{ id: string; role: string } | null>(null);
  const [showMoveInModal, setShowMoveInModal] = useState(false);
  const [showRevertModal, setShowRevertModal] = useState(false);
  const [moveInDate, setMoveInDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [isMovingIn, setIsMovingIn] = useState(false);
  const [isReverting, setIsReverting] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const { confirm: confirmDialog, alert: alertDialog } = useConfirmDialog();

  const participantId = params.id as Id<"participants">;
  const userIdTyped = user ? (user.id as Id<"users">) : undefined;
  const participant = useQuery(api.participants.getById, userIdTyped ? { participantId, userId: userIdTyped } : "skip");
  const documents = useQuery(api.documents.getByParticipant, userIdTyped ? { participantId, userId: userIdTyped } : "skip");
  const moveInMutation = useMutation(api.participants.moveIn);
  const revertToPendingMutation = useMutation(api.participants.revertToPending);
  const removeDocument = useMutation(api.documents.remove);

  useEffect(() => {
    const storedUser = localStorage.getItem("sda_user");
    if (!storedUser) {
      router.push("/login");
      return;
    }
    setUser(JSON.parse(storedUser));
  }, [router]);

  if (!user) {
    return <LoadingScreen />;
  }

  if (participant === undefined) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header currentPage="participants" />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-gray-400 text-center py-12">Loading participant details...</div>
        </main>
      </div>
    );
  }

  if (participant === null) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header currentPage="participants" />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-red-400 text-center py-12">Participant not found</div>
        </main>
      </div>
    );
  }

  const currentPlan = participant.plans?.find((p) => p.planStatus === "current");
  const pastPlans = participant.plans?.filter((p) => p.planStatus !== "current") || [];

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: "bg-green-600",
      inactive: "bg-gray-600",
      pending_move_in: "bg-yellow-600",
      moved_out: "bg-red-600",
    };
    return colors[status] || "bg-gray-600";
  };

  const handleMoveIn = async () => {
    if (!user) return;
    if (!moveInDate) {
      await alertDialog("Please select a move-in date");
      return;
    }
    setIsMovingIn(true);
    try {
      await moveInMutation({ userId: user.id as Id<"users">, participantId, moveInDate });
      setShowMoveInModal(false);
    } catch (error) {
      console.error("Error moving in participant:", error);
      await alertDialog("Failed to move in participant. Please try again.");
    } finally {
      setIsMovingIn(false);
    }
  };

  const handleRevertToPending = async () => {
    if (!user) return;
    setIsReverting(true);
    try {
      await revertToPendingMutation({ userId: user.id as Id<"users">, participantId });
      setShowRevertModal(false);
    } catch (error) {
      console.error("Error reverting participant:", error);
      await alertDialog("Failed to revert participant status. Please try again.");
    } finally {
      setIsReverting(false);
    }
  };

  return (
    <RequireAuth>
    <div className="min-h-screen bg-gray-900">
      <Header currentPage="participants" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
              <Link href="/participants" className="text-gray-400 hover:text-white">
                Participants
              </Link>
            </li>
            <li className="text-gray-400">/</li>
            <li className="text-white">
              {participant.firstName} {participant.lastName}
            </li>
          </ol>
        </nav>

        {/* Participant Header */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                {participant.firstName} {participant.lastName}
              </h1>
              <p className="text-gray-400 text-lg">NDIS: {participant.ndisNumber}</p>
              <div className="mt-2">
                <span
                  className={`inline-block px-3 py-1 rounded-full text-sm text-white ${getStatusColor(
                    participant.status
                  )}`}
                >
                  {participant.status.replace(/_/g, " ").toUpperCase()}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              {participant.status === "pending_move_in" && (
                <button
                  onClick={() => setShowMoveInModal(true)}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                >
                  Move In
                </button>
              )}
              {participant.status === "active" && (
                <button
                  onClick={() => setShowRevertModal(true)}
                  className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors"
                >
                  Revert to Pending
                </button>
              )}
              <Link
                href={`/participants/${participantId}/edit`}
                className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg transition-colors"
              >
                Edit Participant
              </Link>
              {participant.status === "active" && (
                <button className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors">
                  Move Out
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Participant Details */}
          <div className="lg:col-span-1 space-y-6">
            {/* Personal Information */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Personal Information</h2>
              <div className="space-y-3">
                {participant.dateOfBirth && (
                  <DetailRow label="Date of Birth" value={participant.dateOfBirth} />
                )}
                {participant.email && <DetailRow label="Email" value={participant.email} />}
                {participant.phone && <DetailRow label="Phone" value={participant.phone} />}
              </div>
            </div>

            {/* Current Accommodation */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Current Accommodation</h2>
              <div className="space-y-3">
                {participant.dwelling && (
                  <>
                    <DetailRow label="Dwelling" value={participant.dwelling.dwellingName} />
                    {participant.property && (
                      <DetailRow
                        label="Property"
                        value={`${participant.property.addressLine1}, ${participant.property.suburb}`}
                      />
                    )}
                    <DetailRow
                      label="Move In Date"
                      value={participant.moveInDate || "Pending"}
                    />
                    {participant.property && (
                      <Link
                        href={`/properties/${participant.property._id}`}
                        className="inline-block mt-2 text-teal-500 hover:text-teal-400 text-sm"
                      >
                        View Property Details →
                      </Link>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Emergency Contact */}
            {(participant.emergencyContactName ||
              participant.emergencyContactPhone ||
              participant.emergencyContactRelation) && (
              <div className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Emergency Contact</h2>
                <div className="space-y-3">
                  {participant.emergencyContactName && (
                    <DetailRow label="Name" value={participant.emergencyContactName} />
                  )}
                  {participant.emergencyContactPhone && (
                    <DetailRow label="Phone" value={participant.emergencyContactPhone} />
                  )}
                  {participant.emergencyContactRelation && (
                    <DetailRow label="Relationship" value={participant.emergencyContactRelation} />
                  )}
                </div>
              </div>
            )}

            {/* Support Coordination */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Support Services</h2>
              <div className="space-y-4">
                {participant.silProviderName && (
                  <div>
                    <p className="text-gray-400 text-sm mb-1">SIL Provider</p>
                    <p className="text-white">{participant.silProviderName}</p>
                  </div>
                )}
                {participant.supportCoordinatorName && (
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Support Coordinator</p>
                    <p className="text-white">{participant.supportCoordinatorName}</p>
                    {participant.supportCoordinatorEmail && (
                      <p className="text-gray-400 text-sm">{participant.supportCoordinatorEmail}</p>
                    )}
                    {participant.supportCoordinatorPhone && (
                      <p className="text-gray-400 text-sm">{participant.supportCoordinatorPhone}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            {participant.notes && (
              <div className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Notes</h2>
                <p className="text-gray-300 whitespace-pre-wrap">{participant.notes}</p>
              </div>
            )}
          </div>

          {/* Right Column - Plans and Payments */}
          <div className="lg:col-span-2 space-y-6">
            {/* Current Plan */}
            {currentPlan ? (
              <div className="bg-gray-800 rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold text-white">Current NDIS Plan</h2>
                  <span className="px-3 py-1 bg-green-600 text-white text-xs rounded-full">
                    CURRENT
                  </span>
                </div>
                <PlanCard plan={currentPlan} />
              </div>
            ) : (
              <div className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Current NDIS Plan</h2>
                <div className="text-center py-8">
                  <p className="text-gray-400 mb-4">No current plan on file</p>
                  <button className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg transition-colors">
                    + Add Plan
                  </button>
                </div>
              </div>
            )}

            {/* Plan History */}
            {pastPlans.length > 0 && (
              <div className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Plan History</h2>
                <div className="space-y-4">
                  {pastPlans.map((plan) => (
                    <div key={plan._id} className="border-l-4 border-gray-600 pl-4">
                      <PlanCard plan={plan} compact />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Related Documents */}
            <RelatedDocuments
              documents={documents || []}
              onUploadClick={() => setUploadModalOpen(true)}
              onDelete={async (docId) => {
                const confirmed = await confirmDialog({
                  title: "Delete Document?",
                  message: "This will permanently delete this document. This action cannot be undone.",
                  confirmLabel: "Delete",
                  cancelLabel: "Cancel",
                  variant: "danger",
                });
                if (confirmed) {
                  await removeDocument({ id: docId, userId: user!.id as Id<"users"> });
                }
              }}
              userRole={user?.role || ""}
            />

            {/* Payment History */}
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-white">Payment History</h2>
                <button className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg transition-colors text-sm">
                  + Record Payment
                </button>
              </div>
              {participant.payments && participant.payments.length > 0 ? (
                <div className="space-y-3">
                  {participant.payments.slice(0, 5).map((payment) => (
                    <PaymentCard key={payment._id} payment={payment} />
                  ))}
                  {participant.payments.length > 5 && (
                    <p className="text-center text-gray-400 text-sm pt-2">
                      Showing 5 of {participant.payments.length} payments
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  No payment records yet
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Communications History */}
        <div className="mt-6">
          <CommunicationsHistory participantId={participantId} />
        </div>
      </main>

      {/* Upload Modal */}
      <GlobalUploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        prefillCategory="participant"
        prefillEntityId={participantId}
      />

      <div>
        {/* Move In Modal */}
        {showMoveInModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold text-white mb-4">
                Move In Participant
              </h3>
              <p className="text-gray-400 mb-4">
                Confirm move-in for {participant.firstName} {participant.lastName}
              </p>
              <div className="mb-6">
                <label className="block text-sm text-gray-300 mb-2">
                  Move-In Date
                </label>
                <input
                  type="date"
                  value={moveInDate}
                  onChange={(e) => setMoveInDate(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowMoveInModal(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
                  disabled={isMovingIn}
                >
                  Cancel
                </button>
                <button
                  onClick={handleMoveIn}
                  disabled={isMovingIn}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg"
                >
                  {isMovingIn ? "Moving In..." : "Confirm Move In"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Revert to Pending Modal */}
        {showRevertModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold text-white mb-4">
                Revert to Pending Move-In
              </h3>
              <p className="text-gray-400 mb-4">
                Are you sure you want to change {participant.firstName} {participant.lastName} back to pending move-in status?
              </p>
              <p className="text-yellow-400 text-sm mb-6">
                This will remove them from Financials until they are moved in again.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowRevertModal(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
                  disabled={isReverting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleRevertToPending}
                  disabled={isReverting}
                  className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 text-white rounded-lg"
                >
                  {isReverting ? "Reverting..." : "Confirm Revert"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    </RequireAuth>
  );
}

function RelatedDocuments({
  documents,
  onUploadClick,
  onDelete,
  userRole,
}: {
  documents: any[];
  onUploadClick: () => void;
  onDelete: (docId: Id<"documents">) => Promise<void>;
  userRole: string;
}) {
  const [deletingId, setDeletingId] = useState<Id<"documents"> | null>(null);

  const canDelete = userRole === "admin" || userRole === "property_manager";

  // Group documents by category
  const invoiceDocs = documents.filter(d => ['invoice', 'receipt', 'quote'].includes(d.documentType)) || [];
  const certDocs = documents.filter(d => [
    'fire_safety_certificate', 'building_compliance_certificate',
    'ndis_practice_standards_cert', 'sda_design_certificate',
    'sda_registration_cert', 'ndis_worker_screening'
  ].includes(d.documentType)) || [];
  const planDocs = documents.filter(d => ['ndis_plan', 'accommodation_agreement'].includes(d.documentType)) || [];
  const otherDocs = documents.filter(d =>
    !invoiceDocs.includes(d) && !certDocs.includes(d) && !planDocs.includes(d)
  ) || [];

  const invoiceTotal = invoiceDocs.reduce((sum, doc) => sum + (doc.invoiceAmount || 0), 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
    }).format(amount);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getDocTypeLabel = (type: string) => {
    return type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const handleDelete = async (docId: Id<"documents">) => {
    setDeletingId(docId);
    try {
      await onDelete(docId);
    } catch (error) {
      console.error("Error deleting document:", error);
    } finally {
      setDeletingId(null);
    }
  };

  const DocumentCard = ({ doc }: { doc: any }) => {
    const isExpired = doc.expiryDate && new Date(doc.expiryDate) < new Date();
    const isExpiringSoon =
      doc.expiryDate &&
      !isExpired &&
      new Date(doc.expiryDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const truncateFilename = (name: string) => {
      if (name.length <= 40) return name;
      const ext = name.split('.').pop();
      return `${name.substring(0, 37)}...${ext}`;
    };

    return (
      <div className="bg-gray-700 rounded-lg p-4 border border-gray-700 hover:bg-gray-700/50 transition-colors">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="neutral" size="xs">
                {getDocTypeLabel(doc.documentType)}
              </Badge>
              {doc.invoiceAmount && (
                <span className="text-green-400 text-sm font-medium">
                  {formatCurrency(doc.invoiceAmount)}
                </span>
              )}
            </div>
            <p className="text-white text-sm font-medium truncate" title={doc.fileName}>
              {truncateFilename(doc.fileName)}
            </p>
            <p className="text-gray-400 text-xs mt-1">
              Uploaded {formatDate(doc._creationTime)}
              {doc.expiryDate && (
                <span className={isExpired ? "text-red-400" : isExpiringSoon ? "text-yellow-400" : ""}>
                  {" "}| Expires: {doc.expiryDate}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {doc.downloadUrl && (
              <a
                href={doc.downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white text-xs rounded-lg transition-colors"
              >
                Download
              </a>
            )}
            {canDelete && (
              <button
                onClick={() => handleDelete(doc._id)}
                disabled={deletingId === doc._id}
                className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-600 rounded transition-colors disabled:opacity-50"
                title="Delete document"
              >
                {deletingId === doc._id ? (
                  <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const DocumentGroup = ({ title, docs, showTotal }: { title: string; docs: any[]; showTotal?: boolean }) => {
    if (docs.length === 0) return null;

    return (
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          {showTotal && (
            <span className="text-green-400 font-semibold">
              Total: {formatCurrency(invoiceTotal)}
            </span>
          )}
        </div>
        <div className="space-y-3">
          {docs.map((doc) => (
            <DocumentCard key={doc._id} doc={doc} />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-white">Related Documents</h2>
        <button
          onClick={onUploadClick}
          className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg transition-colors text-sm"
        >
          + Upload
        </button>
      </div>

      {documents.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-700 rounded-lg">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          <p className="text-gray-400 mb-4">No documents uploaded yet. Click Upload to add one.</p>
        </div>
      ) : (
        <>
          <DocumentGroup title="Invoices" docs={invoiceDocs} showTotal={invoiceDocs.length > 0} />
          <DocumentGroup title="Certificates" docs={certDocs} />
          <DocumentGroup title="Plans" docs={planDocs} />
          <DocumentGroup title="Other" docs={otherDocs} />
        </>
      )}
    </div>
  );
}


function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-gray-400 text-sm">{label}</p>
      <p className="text-white">{value}</p>
    </div>
  );
}

function PlanCard({ plan, compact = false }: { plan: any; compact?: boolean }) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
    }).format(amount);
  };

  const getOrdinalSuffix = (day: number) => {
    if (day >= 11 && day <= 13) return "th";
    switch (day % 10) {
      case 1: return "st";
      case 2: return "nd";
      case 3: return "rd";
      default: return "th";
    }
  };

  const formatCategory = (category: string) => {
    return category.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const getPlanStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      current: "text-green-400",
      expired: "text-red-400",
      pending: "text-yellow-400",
    };
    return colors[status] || "text-gray-400";
  };

  return (
    <div className={compact ? "space-y-2" : "space-y-4"}>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-gray-400 text-xs">Plan Period</p>
          <p className="text-white text-sm">
            {plan.planStartDate} to {plan.planEndDate}
          </p>
        </div>
        <div>
          <p className="text-gray-400 text-xs">Status</p>
          <p className={`text-sm font-medium ${getPlanStatusColor(plan.planStatus)}`}>
            {plan.planStatus.toUpperCase()}
          </p>
        </div>
      </div>

      {!compact && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-700">
            <div>
              <p className="text-gray-400 text-xs">Monthly Amount</p>
              <p className="text-white text-sm">{formatCurrency(plan.monthlySdaAmount || 0)}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Annual Budget</p>
              <p className="text-white text-sm">{formatCurrency(plan.annualSdaBudget)}</p>
            </div>
            {plan.claimDay && (
              <div>
                <p className="text-gray-400 text-xs">Claim Day</p>
                <p className="text-white text-sm">{plan.claimDay}{getOrdinalSuffix(plan.claimDay)} of month</p>
              </div>
            )}
            {plan.reasonableRentContribution && (
              <div>
                <p className="text-gray-400 text-xs">RRC</p>
                <p className="text-white text-sm">
                  {formatCurrency(plan.reasonableRentContribution)}
                  {plan.rentContributionFrequency && (
                    <span className="text-gray-400 text-xs ml-1">
                      / {plan.rentContributionFrequency}
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-700">
            <div>
              <p className="text-gray-400 text-xs">Design Category</p>
              <p className="text-white text-sm">{formatCategory(plan.sdaDesignCategory)}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Building Type</p>
              <p className="text-white text-sm capitalize">
                {plan.sdaBuildingType.replace("_", " ")}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-700">
            <div>
              <p className="text-gray-400 text-xs">Funding Management</p>
              <p className="text-white text-sm capitalize">
                {plan.fundingManagementType.replace(/_/g, " ")}
              </p>
            </div>
            {plan.planManagerName && (
              <div>
                <p className="text-gray-400 text-xs">Plan Manager</p>
                <p className="text-white text-sm">{plan.planManagerName}</p>
                {plan.planManagerEmail && (
                  <p className="text-gray-400 text-xs">{plan.planManagerEmail}</p>
                )}
              </div>
            )}
          </div>

          {plan.notes && (
            <div className="pt-4 border-t border-gray-700">
              <p className="text-gray-400 text-xs mb-1">Notes</p>
              <p className="text-gray-300 text-sm">{plan.notes}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PaymentCard({ payment }: { payment: any }) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
    }).format(amount);
  };

  const getVarianceColor = (variance: number) => {
    if (variance === 0) return "text-gray-400";
    if (variance > 0) return "text-green-400";
    return "text-red-400";
  };

  return (
    <div className="bg-gray-700 rounded-lg p-4">
      <div className="flex justify-between items-start mb-2">
        <div>
          <p className="text-white font-medium">{payment.paymentDate}</p>
          <p className="text-gray-400 text-sm">
            Period: {payment.paymentPeriodStart} to {payment.paymentPeriodEnd}
          </p>
        </div>
        <div className="text-right">
          <p className="text-white font-medium">{formatCurrency(payment.actualAmount)}</p>
          <p className={`text-sm ${getVarianceColor(payment.variance)}`}>
            {payment.variance === 0
              ? "On target"
              : `${payment.variance > 0 ? "+" : ""}${formatCurrency(payment.variance)}`}
          </p>
        </div>
      </div>
      <div className="flex gap-4 text-xs text-gray-400">
        <span className="capitalize">{payment.paymentSource.replace(/_/g, " ")}</span>
        {payment.paymentReference && <span>Ref: {payment.paymentReference}</span>}
      </div>
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
