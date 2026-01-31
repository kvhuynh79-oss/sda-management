"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import Header from "@/components/Header";
import { Id } from "../../../convex/_generated/dataModel";

export default function ClaimsPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; role: string } | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [filterMethod, setFilterMethod] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showMarkSubmittedModal, setShowMarkSubmittedModal] = useState(false);
  const [showMarkPaidModal, setShowMarkPaidModal] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<{
    claimId?: Id<"claims">;
    participantId: Id<"participants">;
    planId: Id<"participantPlans">;
    participantName: string;
    expectedAmount: number;
    claimMethod: string;
  } | null>(null);
  const [formData, setFormData] = useState({
    claimDate: new Date().toISOString().split("T")[0],
    claimedAmount: "",
    paidDate: new Date().toISOString().split("T")[0],
    paidAmount: "",
    paymentReference: "",
    notes: "",
  });

  const dashboard = useQuery(api.claims.getDashboard);
  const summary = useQuery(api.claims.getMonthlySummary, { claimPeriod: selectedPeriod });
  const providerSettings = useQuery(api.ndisClaimExport.getProviderSettings);
  const createClaim = useMutation(api.claims.create);
  const markSubmitted = useMutation(api.claims.markSubmitted);
  const markPaid = useMutation(api.claims.markPaid);
  const bulkCreate = useMutation(api.claims.bulkCreateForPeriod);

  useEffect(() => {
    const storedUser = localStorage.getItem("sda_user");
    if (!storedUser) {
      router.push("/login");
      return;
    }
    setUser(JSON.parse(storedUser));
  }, [router]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
    }).format(amount);
  };

  const formatClaimMethod = (method: string) => {
    const methods: Record<string, string> = {
      agency_managed: "Agency Managed",
      pace: "PACE",
      plan_managed: "Plan Managed",
    };
    return methods[method] || method;
  };

  const getStatusBadge = (status: string, isOverdue?: boolean) => {
    if (isOverdue && status === "pending") {
      return (
        <span className="px-2 py-1 text-xs rounded-full bg-red-600 text-white">
          Overdue
        </span>
      );
    }
    const styles: Record<string, string> = {
      pending: "bg-yellow-600 text-white",
      submitted: "bg-blue-600 text-white",
      paid: "bg-green-600 text-white",
      rejected: "bg-red-600 text-white",
      partial: "bg-orange-600 text-white",
    };
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${styles[status] || "bg-gray-600 text-white"}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const generateNdisExport = (claim: ClaimItem) => {
    if (!providerSettings) {
      alert("Please configure provider settings first (go to Payments > NDIS Export > Provider Settings)");
      return;
    }

    // Get the first and last day of the selected period
    const [year, month] = selectedPeriod.split("-");
    const periodStart = `${year}-${month}-01`;
    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
    const periodEnd = `${year}-${month}-${String(lastDay).padStart(2, "0")}`;

    // Generate claim reference
    const claimRef = `SDA-${claim.participant.ndisNumber}-${selectedPeriod}`;

    // CSV headers (exact NDIS format)
    const headers = [
      "RegistrationNumber",
      "NDISNumber",
      "SupportsDeliveredFrom",
      "SupportsDeliveredTo",
      "SupportNumber",
      "ClaimReference",
      "Quantity",
      "Hours",
      "UnitPrice",
      "GSTCode",
      "AuthorisedBy",
      "ParticipantApproved",
      "InKindFundingProgram",
      "ClaimType",
      "CancellationReason",
      "ABN of Support Provider",
    ];

    // Build the row data
    const row = {
      RegistrationNumber: providerSettings.ndisRegistrationNumber || "",
      NDISNumber: claim.participant.ndisNumber || "",
      SupportsDeliveredFrom: periodStart,
      SupportsDeliveredTo: periodEnd,
      SupportNumber: claim.plan.supportItemNumber || providerSettings.defaultSupportItemNumber || "",
      ClaimReference: claimRef,
      Quantity: "1",
      Hours: "",
      UnitPrice: claim.expectedAmount.toFixed(2),
      GSTCode: providerSettings.defaultGstCode || "P2",
      AuthorisedBy: "",
      ParticipantApproved: "Y",
      InKindFundingProgram: "",
      ClaimType: "",
      CancellationReason: "",
      "ABN of Support Provider": providerSettings.abn || "",
    };

    // Build CSV content
    let csvContent = headers.join(",") + "\n";
    const rowValues = headers.map((header) => {
      const value = row[header as keyof typeof row] ?? "";
      if (typeof value === "string" && (value.includes(",") || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    });
    csvContent += rowValues.join(",") + "\n";

    // Download the file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `NDIS_${claim.participant.lastName}_${claim.participant.firstName}_${selectedPeriod}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleInitializeClaims = async () => {
    if (!user) return;
    try {
      const result = await bulkCreate({
        claimPeriod: selectedPeriod,
        createdBy: user.id as Id<"users">,
      });
      alert(`Created ${result.created} claims, skipped ${result.skipped}`);
    } catch (err) {
      console.error("Failed to initialize claims:", err);
      alert("Failed to initialize claims");
    }
  };

  const handleMarkSubmitted = async () => {
    if (!selectedClaim) return;

    try {
      // If no claim exists, create one first
      if (!selectedClaim.claimId) {
        const claimId = await createClaim({
          participantId: selectedClaim.participantId,
          planId: selectedClaim.planId,
          claimPeriod: selectedPeriod,
          claimMethod: selectedClaim.claimMethod as "agency_managed" | "pace" | "plan_managed",
          expectedAmount: selectedClaim.expectedAmount,
          status: "submitted",
          claimDate: formData.claimDate,
          createdBy: user?.id as Id<"users">,
        });
      } else {
        await markSubmitted({
          claimId: selectedClaim.claimId,
          claimDate: formData.claimDate,
          claimedAmount: formData.claimedAmount ? parseFloat(formData.claimedAmount) : undefined,
          notes: formData.notes || undefined,
        });
      }
      setShowMarkSubmittedModal(false);
      setSelectedClaim(null);
      setFormData({
        ...formData,
        claimedAmount: "",
        notes: "",
      });
    } catch (err) {
      console.error("Failed to mark submitted:", err);
      alert("Failed to mark as submitted");
    }
  };

  const handleMarkPaid = async () => {
    if (!selectedClaim?.claimId) return;

    try {
      await markPaid({
        claimId: selectedClaim.claimId,
        paidDate: formData.paidDate,
        paidAmount: parseFloat(formData.paidAmount) || selectedClaim.expectedAmount,
        paymentReference: formData.paymentReference || undefined,
        notes: formData.notes || undefined,
      });
      setShowMarkPaidModal(false);
      setSelectedClaim(null);
      setFormData({
        ...formData,
        paidAmount: "",
        paymentReference: "",
        notes: "",
      });
    } catch (err) {
      console.error("Failed to mark paid:", err);
      alert("Failed to mark as paid");
    }
  };

  const filteredClaims = dashboard?.claims.filter((c: { claimMethod: string; status: string }) => {
    if (filterMethod !== "all" && c.claimMethod !== filterMethod) return false;
    if (filterStatus !== "all" && c.status !== filterStatus) return false;
    return true;
  });

  // Group claims by claim day
  type ClaimItem = NonNullable<typeof filteredClaims>[number];
  type ClaimsGrouped = Record<number, ClaimItem[]>;
  const groupedByDay = filteredClaims?.reduce<ClaimsGrouped>((acc: ClaimsGrouped, claim: ClaimItem) => {
    const day = claim.claimDay;
    if (!acc[day]) acc[day] = [];
    acc[day].push(claim);
    return acc;
  }, {});

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Header currentPage="payments" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">SDA Claims Dashboard</h1>
            <p className="text-gray-400 mt-1">Track and manage monthly SDA funding claims</p>
          </div>
          <div className="flex gap-3">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            >
              {Array.from({ length: 12 }, (_, i) => {
                const date = new Date();
                date.setMonth(date.getMonth() - i);
                const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
                const label = date.toLocaleDateString("en-AU", { year: "numeric", month: "long" });
                return (
                  <option key={period} value={period}>
                    {label}
                  </option>
                );
              })}
            </select>
            <button
              onClick={handleInitializeClaims}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              Initialize Claims
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        {dashboard && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
            <div className="bg-gray-800 rounded-lg p-4">
              <p className="text-gray-400 text-sm">Total Participants</p>
              <p className="text-2xl font-bold text-white">{dashboard.summary.total}</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <p className="text-gray-400 text-sm">Pending</p>
              <p className="text-2xl font-bold text-yellow-400">{dashboard.summary.pending}</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <p className="text-gray-400 text-sm">Submitted</p>
              <p className="text-2xl font-bold text-blue-400">{dashboard.summary.submitted}</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <p className="text-gray-400 text-sm">Paid</p>
              <p className="text-2xl font-bold text-green-400">{dashboard.summary.paid}</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <p className="text-gray-400 text-sm">Overdue</p>
              <p className="text-2xl font-bold text-red-400">{dashboard.summary.overdue}</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <p className="text-gray-400 text-sm">Expected Total</p>
              <p className="text-xl font-bold text-white">{formatCurrency(dashboard.summary.totalExpected)}</p>
            </div>
          </div>
        )}

        {/* Method Summary */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-800 rounded-lg p-4 border-l-4 border-purple-500">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-gray-400 text-sm">Agency Managed</p>
                  <p className="text-lg font-bold text-white">{summary.byMethod.agency_managed.count} claims</p>
                </div>
                <p className="text-purple-400 font-medium">{formatCurrency(summary.byMethod.agency_managed.total)}</p>
              </div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 border-l-4 border-cyan-500">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-gray-400 text-sm">PACE</p>
                  <p className="text-lg font-bold text-white">{summary.byMethod.pace.count} claims</p>
                </div>
                <p className="text-cyan-400 font-medium">{formatCurrency(summary.byMethod.pace.total)}</p>
              </div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 border-l-4 border-orange-500">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-gray-400 text-sm">Plan Managed</p>
                  <p className="text-lg font-bold text-white">{summary.byMethod.plan_managed.count} claims</p>
                </div>
                <p className="text-orange-400 font-medium">{formatCurrency(summary.byMethod.plan_managed.total)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <select
            value={filterMethod}
            onChange={(e) => setFilterMethod(e.target.value)}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
          >
            <option value="all">All Methods</option>
            <option value="agency_managed">Agency Managed</option>
            <option value="pace">PACE</option>
            <option value="plan_managed">Plan Managed</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="submitted">Submitted</option>
            <option value="paid">Paid</option>
          </select>
        </div>

        {/* Claims List Grouped by Day */}
        <div className="space-y-6">
          {groupedByDay && (Object.entries(groupedByDay) as [string, ClaimItem[]][])
            .sort(([a], [b]) => parseInt(a) - parseInt(b))
            .map(([day, claims]) => (
              <div key={day} className="bg-gray-800 rounded-lg overflow-hidden">
                <div className="bg-gray-700 px-4 py-3 flex justify-between items-center">
                  <h3 className="text-white font-medium">
                    Claim Day: {day}{day === "1" ? "st" : day === "2" ? "nd" : day === "3" ? "rd" : "th"} of month
                  </h3>
                  <span className="text-gray-400 text-sm">{claims?.length} participant(s)</span>
                </div>
                <div className="divide-y divide-gray-700">
                  {claims?.map((claim) => (
                    <div key={claim.participant._id} className="p-4 hover:bg-gray-750">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h4 className="text-white font-medium">
                              {claim.participant.firstName} {claim.participant.lastName}
                            </h4>
                            {getStatusBadge(claim.status, claim.isOverdue)}
                            <span className={`px-2 py-0.5 text-xs rounded ${
                              claim.claimMethod === "pace" ? "bg-cyan-900 text-cyan-300" :
                              claim.claimMethod === "plan_managed" ? "bg-orange-900 text-orange-300" :
                              "bg-purple-900 text-purple-300"
                            }`}>
                              {formatClaimMethod(claim.claimMethod)}
                            </span>
                          </div>
                          <p className="text-gray-400 text-sm mt-1">
                            {claim.property?.addressLine1} - {claim.dwelling?.dwellingName}
                          </p>
                          <p className="text-gray-500 text-xs mt-1">
                            NDIS: {claim.participant.ndisNumber}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-green-400 font-medium">{formatCurrency(claim.expectedAmount)}</p>
                          <p className="text-gray-500 text-xs">Monthly SDA</p>
                        </div>
                        <div className="ml-4 flex gap-2">
                          {claim.status === "pending" && (
                            <button
                              onClick={() => {
                                setSelectedClaim({
                                  claimId: claim.existingClaim?._id,
                                  participantId: claim.participant._id,
                                  planId: claim.plan._id,
                                  participantName: `${claim.participant.firstName} ${claim.participant.lastName}`,
                                  expectedAmount: claim.expectedAmount,
                                  claimMethod: claim.claimMethod,
                                });
                                setFormData({
                                  ...formData,
                                  claimedAmount: String(claim.expectedAmount),
                                });
                                setShowMarkSubmittedModal(true);
                              }}
                              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded"
                            >
                              Mark Submitted
                            </button>
                          )}
                          {claim.status === "submitted" && (
                            <button
                              onClick={() => {
                                setSelectedClaim({
                                  claimId: claim.existingClaim?._id,
                                  participantId: claim.participant._id,
                                  planId: claim.plan._id,
                                  participantName: `${claim.participant.firstName} ${claim.participant.lastName}`,
                                  expectedAmount: claim.existingClaim?.claimedAmount || claim.expectedAmount,
                                  claimMethod: claim.claimMethod,
                                });
                                setFormData({
                                  ...formData,
                                  paidAmount: String(claim.existingClaim?.claimedAmount || claim.expectedAmount),
                                });
                                setShowMarkPaidModal(true);
                              }}
                              className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded"
                            >
                              Mark Paid
                            </button>
                          )}
                          {claim.status === "paid" && claim.existingClaim && (
                            <div className="text-right text-xs text-gray-400">
                              <p>Paid: {formatCurrency(claim.existingClaim.paidAmount || 0)}</p>
                              {claim.existingClaim.paidDate && (
                                <p>{new Date(claim.existingClaim.paidDate).toLocaleDateString("en-AU")}</p>
                              )}
                            </div>
                          )}
                          <button
                            onClick={() => generateNdisExport(claim)}
                            className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded"
                            title="Download NDIS CSV"
                          >
                            Export
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>

        {(!groupedByDay || Object.keys(groupedByDay).length === 0) && (
          <div className="text-center py-12 bg-gray-800 rounded-lg">
            <p className="text-gray-400">No claims data available.</p>
            <p className="text-gray-500 text-sm mt-2">
              Make sure participants have active plans with claim days set.
            </p>
          </div>
        )}
      </main>

      {/* Mark Submitted Modal */}
      {showMarkSubmittedModal && selectedClaim && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-white mb-4">Mark Claim as Submitted</h2>
            <p className="text-gray-400 mb-4">{selectedClaim.participantName}</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Claim Date</label>
                <input
                  type="date"
                  value={formData.claimDate}
                  onChange={(e) => setFormData({ ...formData, claimDate: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Claimed Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.claimedAmount}
                  onChange={(e) => setFormData({ ...formData, claimedAmount: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder={String(selectedClaim.expectedAmount)}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Notes (optional)</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  rows={2}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowMarkSubmittedModal(false)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleMarkSubmitted}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                Mark Submitted
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mark Paid Modal */}
      {showMarkPaidModal && selectedClaim && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-white mb-4">Mark Claim as Paid</h2>
            <p className="text-gray-400 mb-4">{selectedClaim.participantName}</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Payment Date</label>
                <input
                  type="date"
                  value={formData.paidDate}
                  onChange={(e) => setFormData({ ...formData, paidDate: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Paid Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.paidAmount}
                  onChange={(e) => setFormData({ ...formData, paidAmount: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder={String(selectedClaim.expectedAmount)}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Payment Reference</label>
                <input
                  type="text"
                  value={formData.paymentReference}
                  onChange={(e) => setFormData({ ...formData, paymentReference: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="e.g., NDIS-12345"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Notes (optional)</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  rows={2}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowMarkPaidModal(false)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleMarkPaid}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
              >
                Mark Paid
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
