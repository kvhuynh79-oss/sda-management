"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useConvex } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useOrganization } from "@/contexts/OrganizationContext";
import { StatCard } from "./StatCard";
import { loadLogoAsDataUrl, formatInvoiceDate } from "../_utils";

export function MtaClaimsTab({ userId }: { userId: string }) {
  const { alert: alertDialog, confirm: confirmDialog } = useConfirmDialog();
  const { organization } = useOrganization();
  const convex = useConvex();
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMarkSubmittedModal, setShowMarkSubmittedModal] = useState(false);
  const [showMarkPaidModal, setShowMarkPaidModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedMtaClaim, setSelectedMtaClaim] = useState<{
    claimId: Id<"mtaClaims">;
    participantName: string;
    claimAmount: number;
  } | null>(null);

  const mtaDashboard = useQuery(api.mtaClaims.getDashboard, { userId: userId as Id<"users"> });
  const providerSettings = useQuery(api.providerSettings.get, { userId: userId as Id<"users"> });
  const participants = useQuery(api.participants.getAll, { userId: userId as Id<"users"> });
  const mtaMarkSubmitted = useMutation(api.mtaClaims.markSubmitted);
  const mtaMarkPaid = useMutation(api.mtaClaims.markPaid);
  const mtaMarkRejected = useMutation(api.mtaClaims.markRejected);
  const mtaRevertToPending = useMutation(api.mtaClaims.revertToPending);
  const removeMtaClaim = useMutation(api.mtaClaims.remove);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-yellow-600 text-white",
      submitted: "bg-teal-600 text-white",
      paid: "bg-green-600 text-white",
      rejected: "bg-red-600 text-white",
      partial: "bg-purple-600 text-white",
    };
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${styles[status] || "bg-gray-600 text-white"}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const filteredClaims = mtaDashboard?.claims.filter((c) => {
    if (filterStatus !== "all" && c.status !== filterStatus) return false;
    return true;
  });

  const summary = mtaDashboard?.summary;

  // Month counts
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const claimsThisMonth = mtaDashboard?.claims.filter(
    (c) => c.claimPeriodStart.substring(0, 7) === currentMonth || c.claimPeriodEnd.substring(0, 7) === currentMonth
  ).length || 0;

  const handleMtaMarkSubmitted = async (claimId: Id<"mtaClaims">, notes?: string) => {
    try {
      await mtaMarkSubmitted({ userId: userId as Id<"users">, claimId, notes });
      setShowMarkSubmittedModal(false);
      setSelectedMtaClaim(null);
    } catch (error) {
      await alertDialog("Failed to mark claim as submitted");
    }
  };

  const handleMtaMarkPaid = async (claimId: Id<"mtaClaims">, paidAmount: number, reference?: string, notes?: string) => {
    try {
      await mtaMarkPaid({ userId: userId as Id<"users">, claimId, paidAmount, paymentReference: reference, notes });
      setShowMarkPaidModal(false);
      setSelectedMtaClaim(null);
    } catch (error) {
      await alertDialog("Failed to mark claim as paid");
    }
  };

  const handleMtaReject = async (claimId: Id<"mtaClaims">, reason?: string) => {
    try {
      await mtaMarkRejected({ userId: userId as Id<"users">, claimId, reason });
      setShowRejectModal(false);
      setSelectedMtaClaim(null);
    } catch (error) {
      await alertDialog("Failed to reject claim");
    }
  };

  const handleMtaRevert = async (claimId: Id<"mtaClaims">) => {
    try {
      await mtaRevertToPending({ userId: userId as Id<"users">, claimId });
    } catch (error) {
      await alertDialog("Failed to revert claim to pending");
    }
  };

  const handleDeleteMtaClaim = async (claimId: Id<"mtaClaims">, participantName: string) => {
    const confirmed = await confirmDialog({
      title: "Delete MTA Claim",
      message: `Are you sure you want to delete this MTA claim for ${participantName}?`,
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (confirmed) {
      try {
        await removeMtaClaim({ userId: userId as Id<"users">, claimId });
      } catch (error) {
        await alertDialog("Failed to delete MTA claim");
      }
    }
  };

  const handleGenerateMtaInvoice = async (claim: NonNullable<typeof mtaDashboard>["claims"][number]) => {
    try {
      const { generateInvoicePdf } = await import("@/utils/invoicePdf");

      const participant = claim.participant;
      if (!participant) {
        await alertDialog("Could not load participant details");
        return;
      }

      const property = claim.property;
      const dwelling = claim.dwelling;
      const dwellingNum = dwelling?.dwellingName || "";
      const fullAddr = property
        ? `${dwellingNum ? dwellingNum + " " : ""}${property.addressLine1 || ""} ${property.suburb || ""} ${property.state || ""} ${property.postcode || ""}`.trim()
        : "";

      const dob = participant.dateOfBirth
        ? (() => {
            const parts = (participant.dateOfBirth as string).split("-");
            return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : (participant.dateOfBirth as string);
          })()
        : "";

      // Load org logo for the PDF
      let logoDataUrl: string | undefined;
      if (organization?.resolvedLogoUrl) {
        logoDataUrl = await loadLogoAsDataUrl(organization.resolvedLogoUrl);
      }

      // Format invoice and due dates from stored YYYY-MM-DD to human-readable
      const invoiceDate = claim.invoiceDate
        ? formatInvoiceDate(claim.invoiceDate)
        : new Date().toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
      const dueDate = claim.dueDate
        ? formatInvoiceDate(claim.dueDate)
        : new Date(Date.now() + 30 * 86400000).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });

      await generateInvoicePdf({
        providerName: providerSettings?.providerName || "",
        providerAbn: providerSettings?.abn || "",
        providerAddress: providerSettings?.address || "",
        providerBillingAddress: `${providerSettings?.providerName || ""}\n${providerSettings?.address || ""}`,
        providerPhone: providerSettings?.contactPhone || "",
        logoUrl: logoDataUrl,
        bankAccountName: providerSettings?.bankAccountName || "",
        bankBsb: providerSettings?.bankBsb || "",
        bankAccountNumber: providerSettings?.bankAccountNumber || "",
        invoiceNumber: claim.invoiceNumber,
        invoiceDate,
        dueDate,
        reference: `${participant.firstName} ${participant.lastName} - MTA`,
        customerName: `${participant.firstName} ${participant.lastName}`,
        customerAddress: `${dwellingNum ? dwellingNum + " " : ""}${property?.addressLine1 || ""}\n${(property?.suburb || "").toUpperCase()} ${property?.postcode || ""}\nAUSTRALIA`,
        lineItems: [{
          description: `Participant Name: ${participant.firstName} ${participant.lastName}\nDOB: ${dob}\nNDIS#: ${participant.ndisNumber || ""}\nSupport # ${claim.supportItemNumber}\nMedium Term Accommodation\nDates: ${formatDate(claim.claimPeriodStart)} - ${formatDate(claim.claimPeriodEnd)}\nAddress: ${fullAddr}`,
          quantity: claim.numberOfDays,
          unitPrice: claim.dailyRate,
          gst: "GST Free",
          amount: claim.claimAmount,
        }],
        subtotal: claim.claimAmount,
        totalAmount: claim.claimAmount,
        amountDue: claim.claimAmount,
      });
    } catch (error) {
      await alertDialog(`Failed to generate invoice: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  return (
    <div>
      {/* Bank Details Warning - show when missing */}
      {providerSettings && (!providerSettings.bankBsb || !providerSettings.bankAccountNumber || !providerSettings.bankAccountName) && (
        <div className="mb-6 p-4 bg-yellow-900/30 border border-yellow-700/50 rounded-lg flex items-start gap-3">
          <svg className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.27 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <div>
            <div className="text-yellow-400 text-sm font-medium">Bank Details Missing</div>
            <div className="text-gray-400 text-xs mt-1">
              Your invoices will not include payment details until you configure bank information.{" "}
              <a href="/settings/organization" className="text-teal-400 hover:text-teal-300 underline">
                Update in Settings
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Action Bar */}
      <div className="flex justify-between items-center mb-6">
        <div />
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New MTA Claim
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <StatCard label="Active Agreements" value={summary.activeAgreements.toString()} color="blue" />
          <StatCard label="Total MTA Amount" value={formatCurrency(summary.totalAmount)} color="green" />
          <StatCard label="Claims This Month" value={claimsThisMonth.toString()} color="blue" />
          <StatCard label="Pending" value={summary.pending.toString()} color="yellow" />
          <StatCard label="Paid" value={formatCurrency(summary.totalPaid)} color="green" />
        </div>
      )}

      {/* Status Filter */}
      <div className="flex gap-4 mb-6">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="submitted">Submitted</option>
          <option value="paid">Paid</option>
          <option value="rejected">Rejected</option>
        </select>
        <span className="text-gray-400 text-sm flex items-center">{filteredClaims?.length || 0} claim(s)</span>
      </div>

      {/* Claims List */}
      {!filteredClaims ? (
        <div className="text-gray-400 text-center py-8">Loading...</div>
      ) : filteredClaims.length === 0 ? (
        <div className="text-center py-12 bg-gray-800 rounded-lg">
          <p className="text-gray-400">No MTA claims found</p>
          <p className="text-gray-400 text-sm mt-2">Click &quot;New MTA Claim&quot; to create one</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredClaims.map((claim) => (
            <div key={claim._id} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-white font-medium">
                    {claim.participant?.firstName} {claim.participant?.lastName}
                  </p>
                  <p className="text-gray-400 text-sm">
                    MTA: {formatDate(claim.mtaAgreementStart)} - {formatDate(claim.mtaAgreementEnd)}
                  </p>
                  <p className="text-teal-500 text-sm">
                    Claiming: {formatDate(claim.claimPeriodStart)} - {formatDate(claim.claimPeriodEnd)}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {getStatusBadge(claim.status)}
                    <span className="text-xs text-gray-400">{claim.invoiceNumber}</span>
                    {claim.planManagerName && (
                      <span className="text-xs text-gray-400">PM: {claim.planManagerName}</span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-gray-400 text-sm">
                    {claim.numberOfDays} days x ${claim.dailyRate.toFixed(2)}
                  </p>
                  <p className="text-white font-medium text-lg">{formatCurrency(claim.claimAmount)}</p>
                  <div className="flex gap-2 mt-2 justify-end flex-wrap">
                    {claim.status === "pending" && (
                      <button
                        onClick={() => {
                          setSelectedMtaClaim({
                            claimId: claim._id,
                            participantName: `${claim.participant?.firstName} ${claim.participant?.lastName}`,
                            claimAmount: claim.claimAmount,
                          });
                          setShowMarkSubmittedModal(true);
                        }}
                        className="px-3 py-1 bg-teal-700 hover:bg-teal-800 text-white text-sm rounded"
                      >
                        Submit
                      </button>
                    )}
                    {claim.status === "submitted" && (
                      <>
                        <button
                          onClick={() => {
                            setSelectedMtaClaim({
                              claimId: claim._id,
                              participantName: `${claim.participant?.firstName} ${claim.participant?.lastName}`,
                              claimAmount: claim.claimAmount,
                            });
                            setShowMarkPaidModal(true);
                          }}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded"
                        >
                          Mark Paid
                        </button>
                        <button
                          onClick={() => {
                            setSelectedMtaClaim({
                              claimId: claim._id,
                              participantName: `${claim.participant?.firstName} ${claim.participant?.lastName}`,
                              claimAmount: claim.claimAmount,
                            });
                            setShowRejectModal(true);
                          }}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleMtaRevert(claim._id)}
                          className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded"
                        >
                          Revert
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleGenerateMtaInvoice(claim)}
                      className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded"
                    >
                      Invoice
                    </button>
                    {(claim.status === "pending" || claim.status === "rejected") && (
                      <button
                        onClick={() => handleDeleteMtaClaim(claim._id, `${claim.participant?.firstName} ${claim.participant?.lastName}`)}
                        className="px-3 py-1 bg-red-600/20 hover:bg-red-600/40 text-red-400 text-sm rounded"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* NDIS Bulk Upload Resources */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-5 mt-6">
        <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
          <svg className="w-5 h-5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          NDIS Bulk Upload Resources
        </h3>
        <p className="text-gray-400 text-sm mb-4">Official NDIS templates for bulk payment claims</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <a href="/resources/Bulk_File_Upload_Information.pdf" download
             className="flex items-center gap-3 p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors">
            <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <div>
              <div className="text-white text-sm font-medium">Bulk File Upload Information</div>
              <div className="text-gray-400 text-xs">PDF - Field format reference guide</div>
            </div>
          </a>
          <a href="/resources/Bulk_Payment_Reference_Upload_Template.csv" download
             className="flex items-center gap-3 p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors">
            <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <div>
              <div className="text-white text-sm font-medium">Bulk Payment Upload Template</div>
              <div className="text-gray-400 text-xs">CSV - Header template for NDIS portal</div>
            </div>
          </a>
        </div>
      </div>

      {/* Create MTA Claim Modal */}
      {showCreateModal && (
        <CreateMtaClaimModal
          userId={userId}
          participants={participants || []}
          providerSettings={providerSettings}
          onClose={() => setShowCreateModal(false)}
          onCreated={async (count) => {
            setShowCreateModal(false);
            await alertDialog(`${count} MTA claim(s) created successfully`);
          }}
        />
      )}

      {/* Mark Submitted Modal */}
      {showMarkSubmittedModal && selectedMtaClaim && (
        <MtaClaimModal
          title="Mark MTA Claim as Submitted"
          participantName={selectedMtaClaim.participantName}
          amount={selectedMtaClaim.claimAmount}
          onClose={() => { setShowMarkSubmittedModal(false); setSelectedMtaClaim(null); }}
          onSubmit={(_, notes) => handleMtaMarkSubmitted(selectedMtaClaim.claimId, notes)}
          buttonLabel="Mark Submitted"
          buttonColor="teal"
        />
      )}

      {/* Mark Paid Modal */}
      {showMarkPaidModal && selectedMtaClaim && (
        <MtaClaimModal
          title="Mark MTA Claim as Paid"
          participantName={selectedMtaClaim.participantName}
          amount={selectedMtaClaim.claimAmount}
          onClose={() => { setShowMarkPaidModal(false); setSelectedMtaClaim(null); }}
          onSubmit={(amount, notes, reference) => handleMtaMarkPaid(selectedMtaClaim.claimId, amount, reference, notes)}
          buttonLabel="Mark Paid"
          buttonColor="green"
          showReference
        />
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedMtaClaim && (
        <RejectModal
          claim={{ participantName: selectedMtaClaim.participantName, expectedAmount: selectedMtaClaim.claimAmount }}
          onClose={() => { setShowRejectModal(false); setSelectedMtaClaim(null); }}
          onReject={(reason) => handleMtaReject(selectedMtaClaim.claimId, reason)}
        />
      )}
    </div>
  );
}

// MTA Claim Action Modal (Submit / Paid)
function MtaClaimModal({
  title,
  participantName,
  amount: defaultAmount,
  onClose,
  onSubmit,
  buttonLabel,
  buttonColor,
  showReference,
}: {
  title: string;
  participantName: string;
  amount: number;
  onClose: () => void;
  onSubmit: (amount: number, notes?: string, reference?: string) => void;
  buttonLabel: string;
  buttonColor: "teal" | "green";
  showReference?: boolean;
}) {
  const [amount, setAmount] = useState(defaultAmount.toString());
  const [notes, setNotes] = useState("");
  const [reference, setReference] = useState("");

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
        <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
        <p className="text-gray-400 mb-4">{participantName}</p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Amount</label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            />
          </div>
          {showReference && (
            <div>
              <label className="block text-sm text-gray-300 mb-1">Payment Reference</label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              />
            </div>
          )}
          <div>
            <label className="block text-sm text-gray-300 mb-1">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            />
          </div>
        </div>
        <div className="flex gap-3 justify-end mt-6">
          <button onClick={onClose} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg">
            Cancel
          </button>
          <button
            onClick={() => onSubmit(parseFloat(amount), notes || undefined, reference || undefined)}
            className={`px-4 py-2 ${buttonColor === "teal" ? "bg-teal-700 hover:bg-teal-800" : "bg-green-600 hover:bg-green-700"} text-white rounded-lg`}
          >
            {buttonLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function RejectModal({
  claim,
  onClose,
  onReject,
}: {
  claim: { participantName: string; expectedAmount: number };
  onClose: () => void;
  onReject: (reason?: string) => void;
}) {
  const [reason, setReason] = useState("");

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
        <h3 className="text-lg font-semibold text-white mb-4">Reject Claim</h3>
        <p className="text-gray-400 mb-4">{claim.participantName}</p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Rejection Reason</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            >
              <option value="">Select a reason...</option>
              <option value="Insufficient funds">Insufficient funds</option>
              <option value="CSV format error">CSV format error</option>
              <option value="Invalid NDIS number">Invalid NDIS number</option>
              <option value="Plan expired">Plan expired</option>
              <option value="Duplicate claim">Duplicate claim</option>
              <option value="Other">Other</option>
            </select>
          </div>
          {reason === "Other" && (
            <div>
              <label className="block text-sm text-gray-300 mb-1">Custom Reason</label>
              <textarea
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                placeholder="Enter rejection reason..."
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              />
            </div>
          )}
        </div>
        <div className="flex gap-3 justify-end mt-6">
          <button onClick={onClose} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg">
            Cancel
          </button>
          <button
            onClick={() => onReject(reason || undefined)}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
          >
            Reject Claim
          </button>
        </div>
      </div>
    </div>
  );
}

// Create MTA Claim Modal
function CreateMtaClaimModal({
  userId,
  participants,
  providerSettings,
  onClose,
  onCreated,
}: {
  userId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  participants: Array<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  providerSettings: any;
  onClose: () => void;
  onCreated: (count: number) => void;
}) {
  const { alert: alertDialog } = useConfirmDialog();
  const createMtaClaim = useMutation(api.mtaClaims.create);
  const bulkCreate = useMutation(api.mtaClaims.bulkCreateForAgreement);

  const [participantId, setParticipantId] = useState("");
  const [agreementStart, setAgreementStart] = useState("");
  const [agreementEnd, setAgreementEnd] = useState("");
  const [claimFrequency, setClaimFrequency] = useState<"weekly" | "fortnightly" | "monthly">("monthly");
  const [claimPeriodStart, setClaimPeriodStart] = useState("");
  const [claimPeriodEnd, setClaimPeriodEnd] = useState("");
  const [dailyRate, setDailyRate] = useState(
    providerSettings?.mtaDailyRate?.toString() || "152.03"
  );
  const [planManagerName, setPlanManagerName] = useState("");
  const [planManagerEmail, setPlanManagerEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-calculate claim period end based on frequency
  useEffect(() => {
    if (claimPeriodStart && claimFrequency) {
      const start = new Date(claimPeriodStart + "T00:00:00Z");
      let end: Date;
      if (claimFrequency === "weekly") {
        end = new Date(start.getTime() + 7 * 86400000);
      } else if (claimFrequency === "fortnightly") {
        end = new Date(start.getTime() + 14 * 86400000);
      } else {
        // Monthly: go to same day next month
        end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, start.getUTCDate()));
      }
      // Cap at agreement end
      if (agreementEnd) {
        const agEnd = new Date(agreementEnd + "T00:00:00Z");
        if (end > agEnd) end = agEnd;
      }
      setClaimPeriodEnd(end.toISOString().split("T")[0]);
    }
  }, [claimPeriodStart, claimFrequency, agreementEnd]);

  // Default claim period start to agreement start
  useEffect(() => {
    if (agreementStart && !claimPeriodStart) {
      setClaimPeriodStart(agreementStart);
    }
  }, [agreementStart, claimPeriodStart]);

  // Auto-cap agreement end to max 90 days from start
  useEffect(() => {
    if (agreementStart && agreementEnd) {
      const startMs = new Date(agreementStart + "T00:00:00Z").getTime();
      const endMs = new Date(agreementEnd + "T00:00:00Z").getTime();
      const maxMs = startMs + 90 * 86400000;
      if (endMs > maxMs) {
        setAgreementEnd(new Date(maxMs).toISOString().split("T")[0]);
      }
    }
  }, [agreementStart, agreementEnd]);

  // Pre-fill plan manager from participant's plan
  useEffect(() => {
    if (participantId) {
      const participant = participants.find((p) => p._id === participantId);
      if (participant?.currentPlan) {
        if (participant.currentPlan.planManagerName && !planManagerName) {
          setPlanManagerName(participant.currentPlan.planManagerName);
        }
        if (participant.currentPlan.planManagerEmail && !planManagerEmail) {
          setPlanManagerEmail(participant.currentPlan.planManagerEmail);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participantId]);

  // Calculate number of days and amount
  const numberOfDays = (() => {
    if (!claimPeriodStart || !claimPeriodEnd) return 0;
    const start = new Date(claimPeriodStart + "T00:00:00Z").getTime();
    const end = new Date(claimPeriodEnd + "T00:00:00Z").getTime();
    return Math.max(0, Math.ceil((end - start) / 86400000));
  })();
  const rate = parseFloat(dailyRate) || 0;
  const calculatedAmount = numberOfDays * rate;

  const activeParticipants = participants.filter(
    (p) => p.status === "active" || p.status === "incomplete"
  );

  const handleCreateSingle = async () => {
    if (!participantId || !agreementStart || !agreementEnd || !claimPeriodStart || !claimPeriodEnd) {
      await alertDialog("Please fill in all required fields");
      return;
    }
    setIsSubmitting(true);
    try {
      await createMtaClaim({
        userId: userId as Id<"users">,
        participantId: participantId as Id<"participants">,
        mtaAgreementStart: agreementStart,
        mtaAgreementEnd: agreementEnd,
        claimPeriodStart: claimPeriodStart,
        claimPeriodEnd: claimPeriodEnd,
        claimFrequency,
        dailyRate: rate || undefined,
        planManagerName: planManagerName || undefined,
        planManagerEmail: planManagerEmail || undefined,
        notes: notes || undefined,
      });
      onCreated(1);
    } catch (error) {
      await alertDialog(`Failed to create claim: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateAll = async () => {
    if (!participantId || !agreementStart || !agreementEnd) {
      await alertDialog("Please select a participant and set the agreement dates");
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await bulkCreate({
        userId: userId as Id<"users">,
        participantId: participantId as Id<"participants">,
        mtaAgreementStart: agreementStart,
        mtaAgreementEnd: agreementEnd,
        claimFrequency,
        dailyRate: rate || undefined,
        planManagerName: planManagerName || undefined,
        planManagerEmail: planManagerEmail || undefined,
      });
      if (result.skipped > 0) {
        await alertDialog(`Created ${result.created} claim(s), skipped ${result.skipped} (overlapping periods)`);
      }
      onCreated(result.created);
    } catch (error) {
      await alertDialog(`Failed to generate claims: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">New MTA Claim</h3>

        <div className="space-y-4">
          {/* Participant */}
          <div>
            <label className="block text-sm text-gray-300 mb-1">Participant *</label>
            <select
              value={participantId}
              onChange={(e) => setParticipantId(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            >
              <option value="">Select participant...</option>
              {activeParticipants.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.firstName} {p.lastName}
                </option>
              ))}
            </select>
          </div>

          {/* Agreement Period */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Agreement Start *</label>
              <input
                type="date"
                value={agreementStart}
                onChange={(e) => setAgreementStart(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Agreement End * (max 90 days)</label>
              <input
                type="date"
                value={agreementEnd}
                onChange={(e) => setAgreementEnd(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              />
            </div>
          </div>

          {/* Claim Frequency */}
          <div>
            <label className="block text-sm text-gray-300 mb-1">Claim Frequency</label>
            <div className="flex gap-4">
              {(["weekly", "fortnightly", "monthly"] as const).map((freq) => (
                <label key={freq} className="flex items-center gap-2 text-gray-300 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="claimFrequency"
                    value={freq}
                    checked={claimFrequency === freq}
                    onChange={(e) => setClaimFrequency(e.target.value as typeof claimFrequency)}
                    className="text-teal-600 focus:ring-teal-600 bg-gray-700 border-gray-600"
                  />
                  {freq.charAt(0).toUpperCase() + freq.slice(1)}
                </label>
              ))}
            </div>
          </div>

          {/* Claim Period */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Claim Period Start</label>
              <input
                type="date"
                value={claimPeriodStart}
                onChange={(e) => setClaimPeriodStart(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Claim Period End</label>
              <input
                type="date"
                value={claimPeriodEnd}
                onChange={(e) => setClaimPeriodEnd(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              />
            </div>
          </div>

          {/* Daily Rate */}
          <div>
            <label className="block text-sm text-gray-300 mb-1">Daily Rate ($)</label>
            <input
              type="number"
              step="0.01"
              value={dailyRate}
              onChange={(e) => setDailyRate(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            />
          </div>

          {/* Calculated Amount */}
          {numberOfDays > 0 && (
            <div className="bg-gray-700 rounded-lg p-3">
              <p className="text-gray-300 text-sm">
                <span className="font-medium text-white">{numberOfDays} days</span> x{" "}
                <span className="font-medium text-white">${rate.toFixed(2)}</span> ={" "}
                <span className="font-bold text-teal-400 text-lg">
                  {new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(calculatedAmount)}
                </span>
              </p>
            </div>
          )}

          {/* Plan Manager */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Plan Manager Name</label>
              <input
                type="text"
                value={planManagerName}
                onChange={(e) => setPlanManagerName(e.target.value)}
                placeholder="Optional"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Plan Manager Email</label>
              <input
                type="email"
                value={planManagerEmail}
                onChange={(e) => setPlanManagerEmail(e.target.value)}
                placeholder="Optional"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm text-gray-300 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Optional notes"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleCreateSingle}
            disabled={isSubmitting || !participantId || !agreementStart || !agreementEnd || !claimPeriodStart || !claimPeriodEnd}
            className="px-4 py-2 bg-teal-700 hover:bg-teal-800 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg"
          >
            {isSubmitting ? "Creating..." : "Create Single Claim"}
          </button>
          <button
            onClick={handleGenerateAll}
            disabled={isSubmitting || !participantId || !agreementStart || !agreementEnd}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg"
          >
            {isSubmitting ? "Generating..." : "Generate All Claims"}
          </button>
        </div>
      </div>
    </div>
  );
}
