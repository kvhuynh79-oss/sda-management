"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { Id } from "../../../convex/_generated/dataModel";

type TabType = "payments" | "claims" | "owner_payments";

export default function FinancialsPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <FinancialsContent />
    </Suspense>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-white">Loading...</div>
    </div>
  );
}

function FinancialsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as TabType) || "claims";

  const [user, setUser] = useState<{ id: string; role: string } | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);

  useEffect(() => {
    const storedUser = localStorage.getItem("sda_user");
    if (!storedUser) {
      router.push("/login");
      return;
    }
    const parsed = JSON.parse(storedUser);
    setUser({
      id: parsed.id || parsed._id,
      role: parsed.role,
    });
  }, [router]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    router.push(`/financials?tab=${tab}`, { scroll: false });
  };

  if (!user) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Header currentPage="financials" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Financials</h2>
            <p className="text-gray-400 mt-1">Manage claims and payment records</p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/financials/bank-accounts"
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Bank Accounts
            </Link>
            <Link
              href="/financials/reconciliation"
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Reconciliation
            </Link>
            {activeTab === "payments" && (
              <>
                <Link
                  href="/payments/ndis-export"
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                >
                  NDIS Export
                </Link>
                <Link
                  href="/payments/distributions"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                >
                  Distributions
                </Link>
                <Link
                  href="/payments/new"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  + Record Payment
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-700 mb-6">
          <nav className="flex gap-4">
            <TabButton
              label="Claims"
              isActive={activeTab === "claims"}
              onClick={() => handleTabChange("claims")}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              }
            />
            <TabButton
              label="Payment History"
              isActive={activeTab === "payments"}
              onClick={() => handleTabChange("payments")}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <TabButton
              label="Owner Disbursements"
              isActive={activeTab === "owner_payments"}
              onClick={() => handleTabChange("owner_payments")}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              }
            />
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === "claims" && <ClaimsTab userId={user.id} />}
        {activeTab === "payments" && <PaymentsTab />}
        {activeTab === "owner_payments" && <OwnerPaymentsTab />}
      </main>
    </div>
  );
}

function TabButton({
  label,
  isActive,
  onClick,
  icon,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
        isActive
          ? "border-blue-500 text-blue-400"
          : "border-transparent text-gray-400 hover:text-white hover:border-gray-600"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

// ============================================
// CLAIMS TAB
// ============================================
function ClaimsTab({ userId }: { userId: string }) {
  const [selectedPeriod, setSelectedPeriod] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [filterMethod, setFilterMethod] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [showMarkSubmittedModal, setShowMarkSubmittedModal] = useState(false);
  const [showMarkPaidModal, setShowMarkPaidModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<{
    claimId?: Id<"claims">;
    participantId: Id<"participants">;
    planId: Id<"participantPlans">;
    participantName: string;
    expectedAmount: number;
    claimPeriod?: string;
    claimRef?: string;
  } | null>(null);

  // Bulk selection state
  const [selectedClaims, setSelectedClaims] = useState<Set<string>>(new Set());

  const dashboard = useQuery(api.claims.getDashboard);
  const providerSettings = useQuery(api.providerSettings.get);
  const createClaim = useMutation(api.claims.create);
  const markSubmitted = useMutation(api.claims.markSubmitted);
  const markPaid = useMutation(api.claims.markPaid);
  const markRejected = useMutation(api.claims.markRejected);
  const revertToPending = useMutation(api.claims.revertToPending);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(amount);
  };

  const getStatusBadge = (status: string, isOverdue?: boolean) => {
    if (isOverdue && status === "pending") {
      return <span className="px-2 py-1 text-xs rounded-full bg-red-600 text-white">Overdue</span>;
    }
    const styles: Record<string, string> = {
      pending: "bg-yellow-600 text-white",
      submitted: "bg-orange-500 text-white",
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

  type ClaimItem = NonNullable<typeof filteredClaims>[number];

  const filteredClaims = dashboard?.claims.filter((c: { claimMethod: string; status: string; claimDay: number }) => {
    if (filterMethod !== "all" && c.claimMethod !== filterMethod) return false;
    if (filterStatus !== "all" && c.status !== filterStatus) return false;
    if (selectedDay !== null && c.claimDay !== selectedDay) return false;
    return true;
  });

  type CalendarClaim = { name: string; status: "pending" | "submitted" | "paid" | "overdue" };
  const claimsByDay = dashboard?.claims.reduce<Record<number, CalendarClaim[]>>((acc, claim) => {
    const day = claim.claimDay;
    if (!acc[day]) acc[day] = [];
    const status = claim.isOverdue && claim.status === "pending" ? "overdue" : (claim.status as "pending" | "submitted" | "paid");
    acc[day].push({ name: `${claim.participant.firstName} ${claim.participant.lastName.charAt(0)}.`, status });
    return acc;
  }, {});

  const getCalendarDays = () => {
    const [year, month] = selectedPeriod.split("-").map(Number);
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    const days: (number | null)[] = [];
    for (let i = 0; i < startingDayOfWeek; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  };

  const groupedByDay = filteredClaims?.reduce<Record<number, ClaimItem[]>>((acc, claim) => {
    const day = claim.claimDay;
    if (!acc[day]) acc[day] = [];
    acc[day].push(claim);
    return acc;
  }, {});

  const generateNdisExport = () => {
    const paceClaims = filteredClaims?.filter((c) => c.claimMethod === "pace" && c.status === "pending");
    if (!paceClaims || paceClaims.length === 0) {
      alert("No PACE claims pending for export");
      return;
    }
    const [year, month] = selectedPeriod.split("-");
    const periodStart = `${year}-${month}-01`;
    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
    const periodEnd = `${year}-${month}-${String(lastDay).padStart(2, "0")}`;
    const claimRef = `${month}${year}-01`;

    const headers = ["RegistrationNumber", "NDISNumber", "SupportsDeliveredFrom", "SupportsDeliveredTo", "SupportNumber", "ClaimReference", "Quantity", "Hours", "UnitPrice", "GSTCode", "AuthorisedBy", "ParticipantApproved", "InKindFundingProgram", "ClaimType", "CancellationReason", "ABN of Support Provider"];

    const rows = paceClaims.map((claim) => ({
      RegistrationNumber: providerSettings?.ndisRegistrationNumber || "",
      NDISNumber: claim.participant.ndisNumber,
      SupportsDeliveredFrom: periodStart,
      SupportsDeliveredTo: periodEnd,
      SupportNumber: claim.plan.supportItemNumber || providerSettings?.defaultSupportItemNumber || "",
      ClaimReference: claimRef,
      Quantity: "1",
      Hours: "",
      UnitPrice: claim.expectedAmount.toFixed(2),
      GSTCode: providerSettings?.defaultGstCode || "P2",
      AuthorisedBy: "",
      ParticipantApproved: "",
      InKindFundingProgram: "",
      ClaimType: "",
      CancellationReason: "",
      "ABN of Support Provider": providerSettings?.abn || "",
    }));

    let csvContent = headers.join(",") + "\n";
    rows.forEach((row) => {
      csvContent += headers.map((h) => row[h as keyof typeof row]).join(",") + "\n";
    });

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `NDIS_Claims_${selectedPeriod}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Toggle individual claim selection
  const toggleClaimSelection = (claimKey: string) => {
    setSelectedClaims((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(claimKey)) {
        newSet.delete(claimKey);
      } else {
        newSet.add(claimKey);
      }
      return newSet;
    });
  };

  // Select all visible claims
  const selectAllClaims = () => {
    if (!filteredClaims) return;
    const allKeys = filteredClaims.map((c) => `${c.participant._id}-${c.claimDay}`);
    setSelectedClaims(new Set(allKeys));
  };

  // Clear all selections
  const clearAllSelections = () => {
    setSelectedClaims(new Set());
  };

  // Export selected claims to CSV (PACE format for NDIS portal)
  const exportSelectedClaimsCsv = () => {
    if (selectedClaims.size === 0) {
      alert("Please select at least one claim to export");
      return;
    }

    const selectedClaimsList = filteredClaims?.filter(
      (c) => selectedClaims.has(`${c.participant._id}-${c.claimDay}`)
    );

    if (!selectedClaimsList || selectedClaimsList.length === 0) {
      alert("No claims selected for export");
      return;
    }

    // Calculate previous month's date range (service period is previous month)
    const [year, month] = selectedPeriod.split("-").map(Number);
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const prevMonthLastDay = new Date(prevYear, prevMonth, 0).getDate();
    // NDIS format: YYYY/MM/DD
    const periodStart = `${prevYear}/${String(prevMonth).padStart(2, "0")}/01`;
    const periodEnd = `${prevYear}/${String(prevMonth).padStart(2, "0")}/${String(prevMonthLastDay).padStart(2, "0")}`;
    // ClaimReference format: day + month + year (e.g., 5012026 for 5th Jan 2026)
    const fileRef = `${String(month).padStart(2, "0")}${year}`;

    // NDIS exact headers
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

    const rows = selectedClaimsList.map((claim) => ({
      RegistrationNumber: providerSettings?.ndisRegistrationNumber || "",
      NDISNumber: claim.participant.ndisNumber,
      SupportsDeliveredFrom: periodStart,
      SupportsDeliveredTo: periodEnd,
      SupportNumber: claim.plan.supportItemNumber || providerSettings?.defaultSupportItemNumber || "",
      ClaimReference: `${claim.claimDay}${String(month).padStart(2, "0")}${year}`,
      Quantity: "1",
      Hours: "",
      UnitPrice: claim.expectedAmount.toFixed(2),
      GSTCode: providerSettings?.defaultGstCode || "P2",
      AuthorisedBy: "",
      ParticipantApproved: "",
      InKindFundingProgram: "",
      ClaimType: "",
      CancellationReason: "",
      "ABN of Support Provider": providerSettings?.abn || "",
    }));

    let csvContent = headers.join(",") + "\n";
    rows.forEach((row) => {
      csvContent += headers.map((h) => row[h as keyof typeof row]).join(",") + "\n";
    });

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileRef}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    // Clear selections after export (manual submit required)
    clearAllSelections();
    alert(`CSV exported with ${selectedClaimsList.length} claim(s).\nClick "Submit" on each claim after uploading to NDIS portal.`);
  };

  const handleMarkSubmitted = async (claimId: Id<"claims">, amount: number, notes?: string) => {
    if (!userId) return;
    const today = new Date().toISOString().split("T")[0];
    try {
      await markSubmitted({ claimId, claimDate: today, claimedAmount: amount, notes, userId: userId as Id<"users"> });
      setShowMarkSubmittedModal(false);
      setSelectedClaim(null);
    } catch (error) {
      console.error("Error marking submitted:", error);
      alert("Failed to mark claim as submitted");
    }
  };

  const handleMarkPaid = async (claimId: Id<"claims">, paidAmount: number, reference?: string, notes?: string) => {
    if (!userId) return;
    const today = new Date().toISOString().split("T")[0];
    try {
      await markPaid({ claimId, paidDate: today, paidAmount, paymentReference: reference, notes, userId: userId as Id<"users"> });
      setShowMarkPaidModal(false);
      setSelectedClaim(null);
    } catch (error) {
      console.error("Error marking paid:", error);
      alert("Failed to mark claim as paid");
    }
  };

  const handleReject = async (claimId: Id<"claims">, reason?: string) => {
    if (!userId) return;
    try {
      await markRejected({ claimId, reason, userId: userId as Id<"users"> });
      setShowRejectModal(false);
      setSelectedClaim(null);
    } catch (error) {
      console.error("Error rejecting claim:", error);
      alert("Failed to reject claim");
    }
  };

  const handleRevertToPending = async (claimId: Id<"claims">) => {
    if (!userId) return;
    try {
      await revertToPending({ claimId, userId: userId as Id<"users"> });
    } catch (error) {
      console.error("Error reverting claim:", error);
      alert("Failed to revert claim to pending");
    }
  };

  const handleCreateAndSubmit = async (claim: ClaimItem) => {
    const today = new Date().toISOString().split("T")[0];
    try {
      await createClaim({
        userId: userId as Id<"users">,
        participantId: claim.participant._id,
        planId: claim.plan._id,
        claimPeriod: selectedPeriod,
        claimMethod: claim.claimMethod as "agency_managed" | "pace" | "plan_managed",
        expectedAmount: claim.expectedAmount,
        status: "submitted",
        claimDate: today,
      });
      alert("Claim created and marked as submitted!");
    } catch (error) {
      console.error("Error creating claim:", error);
      alert("Failed to create claim");
    }
  };

  const summary = dashboard?.summary;

  return (
    <div>
      {/* Period Selector & Actions */}
      <div className="flex flex-wrap gap-4 items-center mb-6">
        <input
          type="month"
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(e.target.value)}
          className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
        />
        <button
          onClick={generateNdisExport}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
        >
          Export PACE CSV
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <StatCard label="Monthly Total" value={formatCurrency(filteredClaims?.reduce((sum, c) => sum + c.expectedAmount, 0) || 0)} color="green" />
          <StatCard label="Total Claims" value={summary.total.toString()} color="blue" />
          <StatCard label="Pending" value={summary.pending.toString()} color="yellow" />
          <StatCard label="Submitted" value={summary.submitted.toString()} color="blue" />
          <StatCard label="Paid" value={summary.paid.toString()} color="green" />
        </div>
      )}

      {/* Calendar View */}
      <div className="bg-gray-800 rounded-lg p-4 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-white font-medium">
            Claims Calendar - {(() => {
              const [year, month] = selectedPeriod.split("-");
              const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
              return `${monthNames[parseInt(month) - 1]} ${year}`;
            })()}
          </h3>
          {selectedDay !== null && (
            <button onClick={() => setSelectedDay(null)} className="text-sm text-blue-400 hover:text-blue-300">
              Clear filter (Day {selectedDay})
            </button>
          )}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="text-center text-gray-500 text-xs py-2 font-medium">{day}</div>
          ))}
          {getCalendarDays().map((day, index) => {
            const dayData = day ? claimsByDay?.[day] : null;
            const isSelected = selectedDay === day;
            const isToday = day === dashboard?.currentDay;

            return (
              <div
                key={index}
                onClick={() => day && dayData && dayData.length > 0 && setSelectedDay(isSelected ? null : day)}
                className={`relative min-h-[70px] p-1 rounded-lg border transition-all
                  ${!day ? "bg-transparent border-transparent" : ""}
                  ${day && (!dayData || dayData.length === 0) ? "bg-gray-700 border-gray-700" : ""}
                  ${day && dayData && dayData.length > 0 ? "bg-gray-700 border-gray-600 cursor-pointer hover:border-gray-500" : ""}
                  ${isSelected ? "ring-2 ring-blue-500 border-blue-500" : ""}
                  ${isToday && day ? "ring-2 ring-yellow-500" : ""}`}
              >
                {day && (
                  <>
                    <span className={`text-xs ${isToday ? "text-yellow-400 font-bold" : "text-gray-400"}`}>{day}</span>
                    {dayData && dayData.length > 0 && (
                      <div className="mt-1 space-y-0.5 overflow-hidden">
                        {dayData.slice(0, 3).map((claim, idx) => {
                          const colors = { overdue: "bg-red-500", pending: "bg-yellow-500", submitted: "bg-blue-500", paid: "bg-green-500" };
                          return (
                            <div key={idx} className="flex items-center gap-1">
                              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${colors[claim.status]}`}></div>
                              <span className="text-[10px] text-gray-400 truncate">{claim.name}</span>
                            </div>
                          );
                        })}
                        {dayData.length > 3 && <span className="text-[9px] text-gray-500">+{dayData.length - 3} more</span>}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-4 mt-4 text-xs text-gray-400">
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"></div><span>Overdue</span></div>
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-yellow-500"></div><span>Pending</span></div>
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500"></div><span>Submitted</span></div>
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500"></div><span>Paid</span></div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <select value={filterMethod} onChange={(e) => setFilterMethod(e.target.value)} className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white">
          <option value="all">All Methods</option>
          <option value="agency_managed">Agency Managed</option>
          <option value="pace">PACE</option>
          <option value="plan_managed">Plan Managed</option>
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white">
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="submitted">Submitted</option>
          <option value="paid">Paid</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Bulk Actions Bar */}
      <div className="flex items-center justify-between bg-gray-800 rounded-lg p-3 mb-4">
        <div className="flex items-center gap-4">
          <button
            onClick={selectedClaims.size === filteredClaims?.length ? clearAllSelections : selectAllClaims}
            className="text-sm text-blue-400 hover:text-blue-300"
          >
            {selectedClaims.size === filteredClaims?.length && filteredClaims?.length > 0 ? "Deselect All" : "Select All"}
          </button>
          {selectedClaims.size > 0 && (
            <span className="text-sm text-gray-400">
              {selectedClaims.size} claim{selectedClaims.size !== 1 ? "s" : ""} selected
            </span>
          )}
        </div>
        {selectedClaims.size > 0 && (
          <button
            onClick={exportSelectedClaimsCsv}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export CSV ({selectedClaims.size})
          </button>
        )}
      </div>

      {/* Claims List */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-white">
          {selectedDay !== null ? `Claims for Day ${selectedDay}` : "All Claims by Due Date"}
        </h3>
        <span className="text-gray-400 text-sm">{filteredClaims?.length || 0} claim(s)</span>
      </div>

      <div className="space-y-4">
        {groupedByDay && Object.entries(groupedByDay).sort(([a], [b]) => parseInt(a) - parseInt(b)).map(([day, claims]) => (
          <div key={day} className="bg-gray-800 rounded-lg overflow-hidden">
            <div className="bg-gray-700 px-4 py-3">
              <h4 className="text-white font-medium">Claim Day: {day}{day === "1" ? "st" : day === "2" ? "nd" : day === "3" ? "rd" : "th"}</h4>
            </div>
            <div className="divide-y divide-gray-700">
              {(claims as ClaimItem[]).map((claim) => {
                const claimKey = `${claim.participant._id}-${claim.claimDay}`;
                return (
                  <div key={claimKey} className="p-4 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <input
                        type="checkbox"
                        checked={selectedClaims.has(claimKey)}
                        onChange={() => toggleClaimSelection(claimKey)}
                        className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-800 cursor-pointer"
                      />
                      <div>
                        <p className="text-white font-medium">{claim.participant.firstName} {claim.participant.lastName}</p>
                        <p className="text-gray-400 text-sm">{claim.property?.addressLine1} - {claim.dwelling?.dwellingName}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {getStatusBadge(claim.status, claim.isOverdue)}
                          <span className="text-xs text-gray-500 capitalize">{claim.claimMethod.replace(/_/g, " ")}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-medium">{formatCurrency(claim.expectedAmount)}</p>
                      <div className="flex gap-2 mt-2 justify-end min-w-[280px]">
                        {claim.status === "pending" && !claim.existingClaim && (
                          <button
                            onClick={() => handleCreateAndSubmit(claim)}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded"
                          >
                            Submit
                          </button>
                        )}
                        {claim.status === "pending" && claim.existingClaim && (
                          <button
                            onClick={() => {
                              setSelectedClaim({
                                claimId: claim.existingClaim!._id,
                                participantId: claim.participant._id,
                                planId: claim.plan._id,
                                participantName: `${claim.participant.firstName} ${claim.participant.lastName}`,
                                expectedAmount: claim.expectedAmount,
                              });
                              setShowMarkSubmittedModal(true);
                            }}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded"
                          >
                            Mark Submitted
                          </button>
                        )}
                        {claim.status === "submitted" && claim.existingClaim && (
                          <>
                            <button
                              onClick={() => {
                                const [year, month] = selectedPeriod.split("-").map(Number);
                                const claimRef = `${String(month).padStart(2, "0")}${year}`;
                                setSelectedClaim({
                                  claimId: claim.existingClaim!._id,
                                  participantId: claim.participant._id,
                                  planId: claim.plan._id,
                                  participantName: `${claim.participant.firstName} ${claim.participant.lastName}`,
                                  expectedAmount: claim.expectedAmount,
                                  claimPeriod: selectedPeriod,
                                  claimRef,
                                });
                                setShowMarkPaidModal(true);
                              }}
                              className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded"
                            >
                              Mark Paid
                            </button>
                            <button
                              onClick={() => {
                                setSelectedClaim({
                                  claimId: claim.existingClaim!._id,
                                  participantId: claim.participant._id,
                                  planId: claim.plan._id,
                                  participantName: `${claim.participant.firstName} ${claim.participant.lastName}`,
                                  expectedAmount: claim.expectedAmount,
                                });
                                setShowRejectModal(true);
                              }}
                              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded"
                            >
                              Reject
                            </button>
                            <button
                              onClick={() => handleRevertToPending(claim.existingClaim!._id)}
                              className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded"
                            >
                              Revert
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Mark Submitted Modal */}
      {showMarkSubmittedModal && selectedClaim && (
        <ClaimModal
          title="Mark Claim as Submitted"
          claim={selectedClaim}
          onClose={() => { setShowMarkSubmittedModal(false); setSelectedClaim(null); }}
          onSubmit={(amount, notes) => handleMarkSubmitted(selectedClaim.claimId!, amount, notes)}
          buttonLabel="Mark Submitted"
          buttonColor="blue"
        />
      )}

      {/* Mark Paid Modal */}
      {showMarkPaidModal && selectedClaim && (
        <ClaimModal
          title="Mark Claim as Paid"
          claim={selectedClaim}
          onClose={() => { setShowMarkPaidModal(false); setSelectedClaim(null); }}
          onSubmit={(amount, notes, reference) => handleMarkPaid(selectedClaim.claimId!, amount, reference, notes)}
          buttonLabel="Mark Paid"
          buttonColor="green"
          showReference
          defaultReference={selectedClaim.claimPeriod && selectedClaim.claimRef ? `Claims_${selectedClaim.claimPeriod} / ${selectedClaim.claimRef}` : ""}
        />
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedClaim && (
        <RejectModal
          claim={selectedClaim}
          onClose={() => { setShowRejectModal(false); setSelectedClaim(null); }}
          onReject={(reason) => handleReject(selectedClaim.claimId!, reason)}
        />
      )}
    </div>
  );
}

function ClaimModal({
  title,
  claim,
  onClose,
  onSubmit,
  buttonLabel,
  buttonColor,
  showReference,
  defaultReference,
}: {
  title: string;
  claim: { participantName: string; expectedAmount: number };
  onClose: () => void;
  onSubmit: (amount: number, notes?: string, reference?: string) => void;
  buttonLabel: string;
  buttonColor: "blue" | "green";
  showReference?: boolean;
  defaultReference?: string;
}) {
  const [amount, setAmount] = useState(claim.expectedAmount.toString());
  const [notes, setNotes] = useState("");
  const [reference, setReference] = useState(defaultReference || "");

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
        <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
        <p className="text-gray-400 mb-4">{claim.participantName}</p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Amount</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            />
          </div>
          {showReference && (
            <div>
              <label className="block text-sm text-gray-300 mb-1">Payment Reference</label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              />
            </div>
          )}
          <div>
            <label className="block text-sm text-gray-300 mb-1">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            />
          </div>
        </div>
        <div className="flex gap-3 justify-end mt-6">
          <button onClick={onClose} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg">
            Cancel
          </button>
          <button
            onClick={() => onSubmit(parseFloat(amount), notes || undefined, reference || undefined)}
            className={`px-4 py-2 ${buttonColor === "blue" ? "bg-blue-600 hover:bg-blue-700" : "bg-green-600 hover:bg-green-700"} text-white rounded-lg`}
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

// ============================================
// PAYMENTS TAB
// ============================================
function PaymentsTab() {
  const [filterSource, setFilterSource] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const payments = useQuery(api.payments.getAll);

  const filteredPayments = payments?.filter((payment) => {
    const matchesSource = filterSource === "all" || payment.paymentSource === filterSource;
    const matchesSearch =
      !searchTerm ||
      payment.participant?.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.participant?.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.participant?.ndisNumber.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSource && matchesSearch;
  });

  const totalExpected = filteredPayments?.reduce((sum, p) => sum + p.expectedAmount, 0) || 0;
  const totalActual = filteredPayments?.reduce((sum, p) => sum + p.actualAmount, 0) || 0;
  const totalVariance = totalActual - totalExpected;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(amount);
  };

  return (
    <div>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard label="Total Expected" value={formatCurrency(totalExpected)} color="blue" />
        <StatCard label="Total Received" value={formatCurrency(totalActual)} color="green" />
        <StatCard label="Variance" value={formatCurrency(totalVariance)} color={totalVariance >= 0 ? "green" : "red"} />
      </div>

      {/* Filters */}
      <div className="bg-gray-800 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name or NDIS number..."
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
          />
          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
          >
            <option value="all">All Sources</option>
            <option value="ndia">NDIA Managed</option>
            <option value="plan_manager">Plan Manager</option>
            <option value="self_managed">Self Managed</option>
          </select>
        </div>
      </div>

      {/* Payments Table */}
      {!filteredPayments ? (
        <div className="text-gray-400 text-center py-8">Loading...</div>
      ) : filteredPayments.length === 0 ? (
        <div className="text-center py-12 bg-gray-800 rounded-lg">
          <p className="text-gray-400">No payments found</p>
        </div>
      ) : (
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Participant</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Period</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Expected</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Received</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Variance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredPayments.map((payment) => (
                <tr key={payment._id} className="hover:bg-gray-700">
                  <td className="px-4 py-3 text-white text-sm">{payment.paymentDate}</td>
                  <td className="px-4 py-3">
                    <p className="text-white text-sm">{payment.participant?.firstName} {payment.participant?.lastName}</p>
                    <p className="text-gray-500 text-xs">{payment.participant?.ndisNumber}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-sm">{payment.paymentPeriodStart} - {payment.paymentPeriodEnd}</td>
                  <td className="px-4 py-3 text-right text-white text-sm">{formatCurrency(payment.expectedAmount)}</td>
                  <td className="px-4 py-3 text-right text-green-400 text-sm">{formatCurrency(payment.actualAmount)}</td>
                  <td className={`px-4 py-3 text-right text-sm ${payment.variance >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {formatCurrency(payment.variance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ============================================
// OWNER PAYMENTS TAB
// ============================================
function OwnerPaymentsTab() {
  const [filterProperty, setFilterProperty] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [expandedProperties, setExpandedProperties] = useState<Set<string>>(new Set());
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);

  const ownerPayments = useQuery(api.ownerPayments.getAll, {});
  const properties = useQuery(api.properties.getAll);
  const participants = useQuery(api.participants.getAll);
  const createOwnerPayment = useMutation(api.ownerPayments.create);

  const togglePropertyExpanded = (propertyName: string) => {
    setExpandedProperties(prev => {
      const newSet = new Set(prev);
      if (newSet.has(propertyName)) {
        newSet.delete(propertyName);
      } else {
        newSet.add(propertyName);
      }
      return newSet;
    });
  };

  // Calculate suggested payment amount for a property
  const calculateSuggestedAmount = (propertyId: string) => {
    const property = properties?.find(p => p._id === propertyId);
    if (!property) return { sdaAmount: 0, rrcAmount: 0, managementFee: 0, netAmount: 0 };

    // Get participants at this property
    const propertyParticipants = participants?.filter(p => {
      const dwelling = p.dwelling;
      return dwelling && dwelling.propertyId === propertyId;
    }) || [];

    let totalSda = 0;
    let totalRrc = 0;

    for (const participant of propertyParticipants) {
      const plan = participant.currentPlan;
      if (plan) {
        totalSda += plan.monthlySdaAmount || 0;
        // Convert RRC to monthly if fortnightly
        const rrc = plan.reasonableRentContribution || 0;
        const rrcMonthly = plan.rentContributionFrequency === "fortnightly" ? rrc * 26 / 12 : rrc;
        totalRrc += rrcMonthly;
      }
    }

    const grossAmount = totalSda + totalRrc;
    const managementFeePercent = property.managementFeePercent || 0;
    const managementFee = grossAmount * (managementFeePercent / 100);
    const netAmount = grossAmount - managementFee;

    return { sdaAmount: totalSda, rrcAmount: totalRrc, managementFee, netAmount, managementFeePercent };
  };

  const filteredPayments = ownerPayments?.filter((payment) => {
    const matchesProperty = filterProperty === "all" || payment.propertyId === filterProperty;
    const matchesType = filterType === "all" || payment.paymentType === filterType;
    const matchesDateFrom = !dateFrom || payment.paymentDate >= dateFrom;
    const matchesDateTo = !dateTo || payment.paymentDate <= dateTo;
    return matchesProperty && matchesType && matchesDateFrom && matchesDateTo;
  });

  // Find properties with participants but no payment records
  const propertiesWithPayments = new Set(ownerPayments?.map(p => p.propertyId) || []);
  const propertiesWithParticipantsNoPayments = properties?.filter(property => {
    // Property not in payments list
    if (propertiesWithPayments.has(property._id)) return false;
    // Has at least one participant with a plan
    const propertyParticipants = participants?.filter(p => {
      const dwelling = p.dwelling;
      return dwelling && dwelling.propertyId === property._id;
    }) || [];
    return propertyParticipants.some(p => p.currentPlan?.monthlySdaAmount);
  }) || [];

  const generateOwnerStatement = async (propertyName: string, payments: NonNullable<typeof filteredPayments>) => {
    try {
      // Dynamic imports for PDF generation
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;

      // Use landscape orientation for the wide table
      const doc = new jsPDF({ orientation: "landscape" });
      const owner = payments[0]?.owner;
      const property = payments[0]?.property;
      const ownerName = owner?.companyName || `${owner?.firstName || ""} ${owner?.lastName || ""}`.trim() || "Unknown";

      // Get participants for this property
      const propertyParticipants = participants?.filter(p => {
        const dwelling = p.dwelling;
        return dwelling && dwelling.propertyId === property?._id;
      }) || [];

      // Generate past 12 months (historical, not projection)
      const monthPeriods: { label: string; monthKey: string }[] = [];
      const now = new Date();
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const label = `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
        monthPeriods.push({ label, monthKey });
      }

      // Load logo with correct aspect ratio (positioned in top right)
      try {
        const logoImg = new Image();
        logoImg.crossOrigin = "anonymous";
        await new Promise<void>((resolve) => {
          logoImg.onload = () => {
            try {
              // Logo positioned in top right, maintain natural aspect ratio
              const naturalWidth = logoImg.naturalWidth;
              const naturalHeight = logoImg.naturalHeight;
              const maxWidth = 35;
              const aspectRatio = naturalWidth / naturalHeight;
              const height = maxWidth / aspectRatio;
              doc.addImage(logoImg, "JPEG", 250, 8, maxWidth, height);
            } catch {
              // Logo failed
            }
            resolve();
          };
          logoImg.onerror = () => resolve();
          logoImg.src = "/Logo.jpg";
          setTimeout(resolve, 1000);
        });
      } catch {
        // Continue without logo
      }

      // Owner name header (centered)
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      doc.text(ownerName, 148, 12, { align: "center" });

      // Property address
      const propertyAddress = property?.addressLine1
        ? `${property.addressLine1}${property.suburb ? `, ${property.suburb}` : ""}${property.state ? ` ${property.state}` : ""}${property.postcode ? ` ${property.postcode}` : ""}`
        : propertyName;

      // Statement Title
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text("SDA RENTAL STATEMENT", 148, 20, { align: "center" });

      // Property address
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text(propertyAddress, 148, 28, { align: "center" });

      // Statement period (historical)
      const startMonth = monthPeriods[0].label;
      const endMonth = monthPeriods[11].label;
      doc.setFontSize(10);
      doc.text(`Statement Period: ${startMonth} - ${endMonth}`, 148, 35, { align: "center" });

      let currentY = 45;
      let grandTotalSda = 0;
      let grandTotalRrc = 0;
      let grandTotalFee = 0;
      let grandTotalNet = 0;

      // Get management fee percent from property
      const managementFeePercent = property?.managementFeePercent || 30;

      // Special arrangement: if managementFeePercent is 100%, owner only gets RRC
      const isSpecialArrangement = managementFeePercent === 100;

      // Process each participant
      for (const participant of propertyParticipants) {
        const plan = participant.currentPlan;
        const dwelling = participant.dwelling;
        const participantName = `${participant.firstName} ${participant.lastName}`;
        const sdaCategory = dwelling?.sdaDesignCategory || "SDA";
        const annualSda = plan?.annualSdaBudget || (plan?.monthlySdaAmount ? plan.monthlySdaAmount * 12 : 0);
        const monthlySda = plan?.monthlySdaAmount || annualSda / 12;

        // Calculate RRC (combined, not split)
        const totalRrc = plan?.reasonableRentContribution || 0;
        const rrcFrequency = plan?.rentContributionFrequency || "fortnightly";
        const monthlyRrc = rrcFrequency === "fortnightly" ? totalRrc * 26 / 12 : totalRrc;

        // Check if need new page
        if (currentY > 140) {
          doc.addPage();
          currentY = 20;
        }

        // Participant header box
        doc.setFillColor(240, 240, 240);
        doc.rect(14, currentY, 269, 18, "F");
        doc.setDrawColor(200, 200, 200);
        doc.rect(14, currentY, 269, 18, "S");

        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text(participantName, 18, currentY + 6);

        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.text(`Address: ${propertyAddress}`, 18, currentY + 11);
        doc.text(`Dwelling: ${dwelling?.dwellingName || "Unit"} | SDA Category: ${sdaCategory}`, 18, currentY + 15);

        // Annual funding on right side
        doc.setFont("helvetica", "bold");
        doc.text(`Annual SDA Funding: ${formatCurrency(annualSda)}`, 270, currentY + 10, { align: "right" });

        currentY += 22;

        // Calculate monthly amounts based on arrangement type
        let monthlySubtotal: number;
        let monthlyFee: number;
        let monthlyNet: number;

        if (isSpecialArrangement) {
          // Special arrangement: Owner gets 100% SDA, BLS takes 100% RRC
          monthlySubtotal = monthlySda + monthlyRrc;
          monthlyFee = monthlyRrc; // BLS takes RRC
          monthlyNet = monthlySda; // Owner gets SDA
        } else {
          // Standard arrangement
          monthlySubtotal = monthlySda + monthlyRrc;
          monthlyFee = monthlySubtotal * (managementFeePercent / 100);
          monthlyNet = monthlySubtotal - monthlyFee;
        }

        // Build table data with 12 historical month columns
        // Check plan start date to only show amounts for active months
        const planStartDate = plan?.planStartDate;
        const isMonthActive = (monthKey: string) => {
          if (!planStartDate) return true; // If no start date, assume always active
          // monthKey format: "2025-03", planStartDate format: "YYYY-MM-DD"
          const planYearMonth = planStartDate.substring(0, 7); // "2025-03"
          return monthKey >= planYearMonth;
        };

        // Count active months for grand total calculation
        const activeMonthCount = monthPeriods.filter(m => isMonthActive(m.monthKey)).length;

        const tableHead = [["", ...monthPeriods.map(m => m.label)]];

        let tableBody;
        if (isSpecialArrangement) {
          // Special arrangement table layout: Owner gets SDA, BLS gets RRC
          tableBody = [
            ["SDA Funding", ...monthPeriods.map(m => isMonthActive(m.monthKey) ? formatCurrency(monthlySda) : "-")],
            ["RRC (25% DSP + 100% CRA)", ...monthPeriods.map(m => isMonthActive(m.monthKey) ? formatCurrency(monthlyRrc) : "-")],
            [{ content: "Subtotal Revenue", styles: { fontStyle: "bold" as const } }, ...monthPeriods.map(m => ({ content: isMonthActive(m.monthKey) ? formatCurrency(monthlySubtotal) : "-", styles: { fontStyle: "bold" as const } }))],
            ["Less: RRC to BLS (100%)", ...monthPeriods.map(m => isMonthActive(m.monthKey) ? `(${formatCurrency(monthlyRrc)})` : "-")],
            [{ content: "Owner Share (SDA Only)", styles: { fontStyle: "bold" as const, fillColor: [230, 230, 230] as [number, number, number] } }, ...monthPeriods.map(m => ({ content: isMonthActive(m.monthKey) ? formatCurrency(monthlyNet) : "-", styles: { fontStyle: "bold" as const, fillColor: [230, 230, 230] as [number, number, number] } }))],
          ];
        } else {
          // Standard arrangement table layout
          tableBody = [
            ["SDA Funding", ...monthPeriods.map(m => isMonthActive(m.monthKey) ? formatCurrency(monthlySda) : "-")],
            ["RRC (25% DSP + 100% CRA)", ...monthPeriods.map(m => isMonthActive(m.monthKey) ? formatCurrency(monthlyRrc) : "-")],
            [{ content: "Subtotal Revenue", styles: { fontStyle: "bold" as const } }, ...monthPeriods.map(m => ({ content: isMonthActive(m.monthKey) ? formatCurrency(monthlySubtotal) : "-", styles: { fontStyle: "bold" as const } }))],
            [`Less: Provider Fee (${managementFeePercent}%)`, ...monthPeriods.map(m => isMonthActive(m.monthKey) ? `(${formatCurrency(monthlyFee)})` : "-")],
            [{ content: "Net to Owner", styles: { fontStyle: "bold" as const, fillColor: [230, 230, 230] as [number, number, number] } }, ...monthPeriods.map(m => ({ content: isMonthActive(m.monthKey) ? formatCurrency(monthlyNet) : "-", styles: { fontStyle: "bold" as const, fillColor: [230, 230, 230] as [number, number, number] } }))],
          ];
        }

        autoTable(doc, {
          startY: currentY,
          head: tableHead,
          body: tableBody,
          theme: "grid",
          styles: { fontSize: 7, cellPadding: 1.5, halign: "right" },
          headStyles: { fillColor: [70, 130, 180], textColor: [255, 255, 255], fontStyle: "bold", halign: "center" },
          columnStyles: {
            0: { cellWidth: 45, halign: "left" },
          },
          tableLineColor: [180, 180, 180],
          tableLineWidth: 0.1,
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        currentY = (doc as any).lastAutoTable?.finalY + 8 || currentY + 50;

        // Accumulate grand totals (only active months)
        grandTotalSda += monthlySda * activeMonthCount;
        grandTotalRrc += monthlyRrc * activeMonthCount;
        grandTotalFee += monthlyFee * activeMonthCount;
        grandTotalNet += monthlyNet * activeMonthCount;
      }

      // Check if need new page for grand total
      if (currentY > 130) {
        doc.addPage();
        currentY = 20;
      }

      // Grand Total Section
      doc.setFillColor(50, 50, 50);
      doc.rect(14, currentY, 269, 8, "F");
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text("GRAND TOTAL (12-Month Summary)", 18, currentY + 5.5);
      currentY += 12;

      // Grand total summary table - different for special arrangement
      const grandTotalBody = isSpecialArrangement ? [
        ["Total SDA Funding", formatCurrency(grandTotalSda)],
        ["Total RRC", formatCurrency(grandTotalRrc)],
        ["Gross Revenue", formatCurrency(grandTotalSda + grandTotalRrc)],
        ["Less: RRC to BLS (100%)", `(${formatCurrency(grandTotalRrc)})`],
        [{ content: "NET AMOUNT TO OWNER (SDA)", styles: { fontStyle: "bold" as const } }, { content: formatCurrency(grandTotalNet), styles: { fontStyle: "bold" as const } }],
      ] : [
        ["Total SDA Funding", formatCurrency(grandTotalSda)],
        ["Total RRC", formatCurrency(grandTotalRrc)],
        ["Gross Revenue", formatCurrency(grandTotalSda + grandTotalRrc)],
        [`Less: Provider Fee (${managementFeePercent}%)`, `(${formatCurrency(grandTotalFee)})`],
        [{ content: "NET AMOUNT TO OWNER", styles: { fontStyle: "bold" as const } }, { content: formatCurrency(grandTotalNet), styles: { fontStyle: "bold" as const } }],
      ];

      autoTable(doc, {
        startY: currentY,
        body: grandTotalBody,
        theme: "plain",
        styles: { fontSize: 9, cellPadding: 2 },
        columnStyles: {
          0: { cellWidth: 180 },
          1: { cellWidth: 60, halign: "right" },
        },
        tableLineColor: [200, 200, 200],
        tableLineWidth: 0.1,
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      currentY = (doc as any).lastAutoTable?.finalY + 10 || currentY + 40;

      // Payment History Section - Show actual payments made
      if (payments.length > 0) {
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text("PAYMENTS MADE TO OWNER", 14, currentY);
        currentY += 4;

        const paymentRows = payments
          .sort((a, b) => b.paymentDate.localeCompare(a.paymentDate))
          .map(p => [
            p.paymentDate,
            p.description || p.paymentType.replace("_", " "),
            p.bankReference || "-",
            formatCurrency(p.amount),
          ]);

        const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
        paymentRows.push([
          { content: "TOTAL PAID", styles: { fontStyle: "bold" as const } } as unknown as string,
          "",
          "",
          { content: formatCurrency(totalPaid), styles: { fontStyle: "bold" as const } } as unknown as string,
        ]);

        autoTable(doc, {
          startY: currentY,
          head: [["Date", "Description", "Reference", "Amount"]],
          body: paymentRows,
          theme: "striped",
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [100, 100, 100], textColor: [255, 255, 255], fontStyle: "bold" },
          columnStyles: {
            0: { cellWidth: 30 },
            1: { cellWidth: 100 },
            2: { cellWidth: 50 },
            3: { cellWidth: 40, halign: "right" },
          },
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        currentY = (doc as any).lastAutoTable?.finalY + 10 || currentY + 40;
      }

      // Bank Details Section
      if (owner?.bankBsb && owner?.bankAccountNumber) {
        if (currentY > 170) {
          doc.addPage();
          currentY = 20;
        }

        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text("PAYMENT DETAILS", 14, currentY);
        currentY += 6;

        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text(`Account Name: ${owner.bankAccountName || ownerName}`, 14, currentY);
        doc.text(`BSB: ${owner.bankBsb}`, 14, currentY + 5);
        doc.text(`Account Number: ${owner.bankAccountNumber}`, 14, currentY + 10);
        currentY += 20;
      }

      // Notes Section
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("Notes:", 14, currentY);
      doc.setFont("helvetica", "normal");
      currentY += 4;

      const notes = isSpecialArrangement ? [
        "Special arrangement: SDA funding paid to owner, RRC retained by BLS",
        "RRC comprises 25% of Disability Support Pension + 100% Commonwealth Rent Assistance",
        "All amounts are in Australian Dollars (AUD)",
      ] : [
        "This statement shows historical revenue based on participant plans",
        "RRC comprises 25% of Disability Support Pension + 100% Commonwealth Rent Assistance",
        "All amounts are in Australian Dollars (AUD)",
      ];

      notes.forEach((note, i) => {
        doc.text(`• ${note}`, 14, currentY + (i * 4));
      });

      // Footer with page numbers
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.text(`Page ${i} of ${pageCount} | Generated: ${new Date().toLocaleDateString("en-AU")}`, 148, 200, { align: "center" });
      }

      const fileName = `SDA_Rental_Statement_-_${propertyName.replace(/[^a-zA-Z0-9]/g, "_")}_${new Date().toLocaleDateString("en-AU").replace(/\//g, "-")}.pdf`;
      doc.save(fileName);
    } catch (error) {
      console.error("Error generating statement:", error);
      alert(`Failed to generate statement: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  // Generate statement for property without payment records (using plan data)
  const generateStatementFromPlans = async (property: NonNullable<typeof properties>[0]) => {
    try {
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;

      const doc = new jsPDF({ orientation: "landscape" });
      const owner = property.owner;
      const ownerName = owner?.companyName || `${owner?.firstName || ""} ${owner?.lastName || ""}`.trim() || "Unknown";
      const propertyName = property.propertyName || property.addressLine1;

      // Get participants for this property
      const propertyParticipants = participants?.filter(p => {
        const dwelling = p.dwelling;
        return dwelling && dwelling.propertyId === property._id;
      }) || [];

      // Generate past 12 months
      const monthPeriods: { label: string; monthKey: string }[] = [];
      const now = new Date();
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const label = `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
        monthPeriods.push({ label, monthKey });
      }

      // Load logo
      try {
        const logoImg = new Image();
        logoImg.crossOrigin = "anonymous";
        await new Promise<void>((resolve) => {
          logoImg.onload = () => {
            try {
              const naturalWidth = logoImg.naturalWidth;
              const naturalHeight = logoImg.naturalHeight;
              const maxWidth = 35;
              const aspectRatio = naturalWidth / naturalHeight;
              const height = maxWidth / aspectRatio;
              doc.addImage(logoImg, "JPEG", 250, 8, maxWidth, height);
            } catch {
              // Logo failed
            }
            resolve();
          };
          logoImg.onerror = () => resolve();
          logoImg.src = "/Logo.jpg";
          setTimeout(resolve, 1000);
        });
      } catch {
        // Continue without logo
      }

      // Header
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      doc.text(ownerName, 148, 12, { align: "center" });

      const propertyAddress = `${property.addressLine1}${property.suburb ? `, ${property.suburb}` : ""}${property.state ? ` ${property.state}` : ""}${property.postcode ? ` ${property.postcode}` : ""}`;

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("SDA RENTAL STATEMENT", 148, 20, { align: "center" });

      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text(propertyAddress, 148, 28, { align: "center" });

      const startMonth = monthPeriods[0].label;
      const endMonth = monthPeriods[11].label;
      doc.setFontSize(10);
      doc.text(`Statement Period: ${startMonth} - ${endMonth}`, 148, 35, { align: "center" });

      let currentY = 45;
      let grandTotalSda = 0;
      let grandTotalRrc = 0;
      let grandTotalFee = 0;
      let grandTotalNet = 0;

      const managementFeePercent = property.managementFeePercent || 30;
      const isSpecialArrangement = managementFeePercent === 100;

      for (const participant of propertyParticipants) {
        const plan = participant.currentPlan;
        const dwelling = participant.dwelling;
        const participantName = `${participant.firstName} ${participant.lastName}`;
        const sdaCategory = dwelling?.sdaDesignCategory || "SDA";
        const annualSda = plan?.annualSdaBudget || (plan?.monthlySdaAmount ? plan.monthlySdaAmount * 12 : 0);
        const monthlySda = plan?.monthlySdaAmount || annualSda / 12;

        const totalRrc = plan?.reasonableRentContribution || 0;
        const rrcFrequency = plan?.rentContributionFrequency || "fortnightly";
        const monthlyRrc = rrcFrequency === "fortnightly" ? totalRrc * 26 / 12 : totalRrc;

        if (currentY > 140) {
          doc.addPage();
          currentY = 20;
        }

        doc.setFillColor(240, 240, 240);
        doc.rect(14, currentY, 269, 18, "F");
        doc.setDrawColor(200, 200, 200);
        doc.rect(14, currentY, 269, 18, "S");

        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text(participantName, 18, currentY + 6);

        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.text(`Address: ${propertyAddress}`, 18, currentY + 11);
        doc.text(`Dwelling: ${dwelling?.dwellingName || "Unit"} | SDA Category: ${sdaCategory}`, 18, currentY + 15);

        doc.setFont("helvetica", "bold");
        doc.text(`Annual SDA Funding: ${formatCurrency(annualSda)}`, 270, currentY + 10, { align: "right" });

        currentY += 22;

        let monthlySubtotal: number;
        let monthlyFee: number;
        let monthlyNet: number;

        if (isSpecialArrangement) {
          monthlySubtotal = monthlySda + monthlyRrc;
          monthlyFee = monthlyRrc;
          monthlyNet = monthlySda;
        } else {
          monthlySubtotal = monthlySda + monthlyRrc;
          monthlyFee = monthlySubtotal * (managementFeePercent / 100);
          monthlyNet = monthlySubtotal - monthlyFee;
        }

        // Check plan start date to only show amounts for active months
        const planStartDate = plan?.planStartDate;
        const isMonthActive = (monthKey: string) => {
          if (!planStartDate) return true;
          const planYearMonth = planStartDate.substring(0, 7);
          return monthKey >= planYearMonth;
        };

        const activeMonthCount = monthPeriods.filter(m => isMonthActive(m.monthKey)).length;

        const tableHead = [["", ...monthPeriods.map(m => m.label)]];

        let tableBody;
        if (isSpecialArrangement) {
          tableBody = [
            ["SDA Funding", ...monthPeriods.map(m => isMonthActive(m.monthKey) ? formatCurrency(monthlySda) : "-")],
            ["RRC (25% DSP + 100% CRA)", ...monthPeriods.map(m => isMonthActive(m.monthKey) ? formatCurrency(monthlyRrc) : "-")],
            [{ content: "Subtotal Revenue", styles: { fontStyle: "bold" as const } }, ...monthPeriods.map(m => ({ content: isMonthActive(m.monthKey) ? formatCurrency(monthlySubtotal) : "-", styles: { fontStyle: "bold" as const } }))],
            ["Less: RRC to BLS (100%)", ...monthPeriods.map(m => isMonthActive(m.monthKey) ? `(${formatCurrency(monthlyRrc)})` : "-")],
            [{ content: "Owner Share (SDA Only)", styles: { fontStyle: "bold" as const, fillColor: [230, 230, 230] as [number, number, number] } }, ...monthPeriods.map(m => ({ content: isMonthActive(m.monthKey) ? formatCurrency(monthlyNet) : "-", styles: { fontStyle: "bold" as const, fillColor: [230, 230, 230] as [number, number, number] } }))],
          ];
        } else {
          tableBody = [
            ["SDA Funding", ...monthPeriods.map(m => isMonthActive(m.monthKey) ? formatCurrency(monthlySda) : "-")],
            ["RRC (25% DSP + 100% CRA)", ...monthPeriods.map(m => isMonthActive(m.monthKey) ? formatCurrency(monthlyRrc) : "-")],
            [{ content: "Subtotal Revenue", styles: { fontStyle: "bold" as const } }, ...monthPeriods.map(m => ({ content: isMonthActive(m.monthKey) ? formatCurrency(monthlySubtotal) : "-", styles: { fontStyle: "bold" as const } }))],
            [`Less: Provider Fee (${managementFeePercent}%)`, ...monthPeriods.map(m => isMonthActive(m.monthKey) ? `(${formatCurrency(monthlyFee)})` : "-")],
            [{ content: "Net to Owner", styles: { fontStyle: "bold" as const, fillColor: [230, 230, 230] as [number, number, number] } }, ...monthPeriods.map(m => ({ content: isMonthActive(m.monthKey) ? formatCurrency(monthlyNet) : "-", styles: { fontStyle: "bold" as const, fillColor: [230, 230, 230] as [number, number, number] } }))],
          ];
        }

        autoTable(doc, {
          startY: currentY,
          head: tableHead,
          body: tableBody,
          theme: "grid",
          styles: { fontSize: 7, cellPadding: 1.5, halign: "right" },
          headStyles: { fillColor: [70, 130, 180], textColor: [255, 255, 255], fontStyle: "bold", halign: "center" },
          columnStyles: { 0: { cellWidth: 45, halign: "left" } },
          tableLineColor: [180, 180, 180],
          tableLineWidth: 0.1,
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        currentY = (doc as any).lastAutoTable?.finalY + 8 || currentY + 50;

        grandTotalSda += monthlySda * activeMonthCount;
        grandTotalRrc += monthlyRrc * activeMonthCount;
        grandTotalFee += monthlyFee * activeMonthCount;
        grandTotalNet += monthlyNet * activeMonthCount;
      }

      // Grand Total Section
      if (currentY > 150) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text("ANNUAL SUMMARY", 14, currentY);
      currentY += 6;

      const summaryBody = isSpecialArrangement
        ? [
            ["Total SDA Funding (Annual)", formatCurrency(grandTotalSda)],
            ["Total RRC (Annual)", formatCurrency(grandTotalRrc)],
            ["Total Revenue", formatCurrency(grandTotalSda + grandTotalRrc)],
            ["Less: RRC to BLS", `(${formatCurrency(grandTotalFee)})`],
            [{ content: "NET AMOUNT TO OWNER (SDA)", styles: { fontStyle: "bold" as const, fillColor: [200, 230, 200] as [number, number, number] } }, { content: formatCurrency(grandTotalNet), styles: { fontStyle: "bold" as const, fillColor: [200, 230, 200] as [number, number, number] } }],
          ]
        : [
            ["Total SDA Funding (Annual)", formatCurrency(grandTotalSda)],
            ["Total RRC (Annual)", formatCurrency(grandTotalRrc)],
            ["Total Revenue", formatCurrency(grandTotalSda + grandTotalRrc)],
            [`Less: Provider Fee (${managementFeePercent}%)`, `(${formatCurrency(grandTotalFee)})`],
            [{ content: "NET AMOUNT TO OWNER", styles: { fontStyle: "bold" as const, fillColor: [200, 230, 200] as [number, number, number] } }, { content: formatCurrency(grandTotalNet), styles: { fontStyle: "bold" as const, fillColor: [200, 230, 200] as [number, number, number] } }],
          ];

      autoTable(doc, {
        startY: currentY,
        body: summaryBody,
        theme: "grid",
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: { 0: { cellWidth: 120, halign: "left" }, 1: { cellWidth: 60, halign: "right" } },
        tableLineColor: [180, 180, 180],
        tableLineWidth: 0.1,
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      currentY = (doc as any).lastAutoTable?.finalY + 10 || currentY + 40;

      // Bank Details
      if (owner?.bankBsb && owner?.bankAccountNumber) {
        if (currentY > 170) {
          doc.addPage();
          currentY = 20;
        }

        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("PAYMENT DETAILS", 14, currentY);
        currentY += 6;

        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text(`Account Name: ${owner.bankAccountName || ownerName}`, 14, currentY);
        doc.text(`BSB: ${owner.bankBsb}`, 14, currentY + 5);
        doc.text(`Account Number: ${owner.bankAccountNumber}`, 14, currentY + 10);
        currentY += 20;
      }

      // Notes
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("Notes:", 14, currentY);
      doc.setFont("helvetica", "normal");
      currentY += 4;

      const notes = isSpecialArrangement
        ? [
            "Special arrangement: SDA funding paid to owner, RRC retained by BLS",
            "RRC comprises 25% of Disability Support Pension + 100% Commonwealth Rent Assistance",
            "All amounts are in Australian Dollars (AUD)",
          ]
        : [
            "This statement shows expected revenue based on participant plans",
            "RRC comprises 25% of Disability Support Pension + 100% Commonwealth Rent Assistance",
            "All amounts are in Australian Dollars (AUD)",
          ];

      notes.forEach((note, i) => {
        doc.text(`• ${note}`, 14, currentY + i * 4);
      });

      // Footer
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.text(`Page ${i} of ${pageCount} | Generated: ${new Date().toLocaleDateString("en-AU")}`, 148, 200, { align: "center" });
      }

      const fileName = `SDA_Rental_Statement_-_${propertyName.replace(/[^a-zA-Z0-9]/g, "_")}_${new Date().toLocaleDateString("en-AU").replace(/\//g, "-")}.pdf`;
      doc.save(fileName);
    } catch (error) {
      console.error("Error generating statement:", error);
      alert(`Failed to generate statement: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  const totalAmount = filteredPayments?.reduce((sum, p) => sum + p.amount, 0) || 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(amount);
  };

  const getPaymentTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      interim: "bg-orange-600 text-white",
      sda_share: "bg-blue-600 text-white",
      rent_contribution: "bg-purple-600 text-white",
      other: "bg-gray-600 text-white",
    };
    const labels: Record<string, string> = {
      interim: "Interim",
      sda_share: "SDA Share",
      rent_contribution: "RRC",
      other: "Other",
    };
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${styles[type] || "bg-gray-600 text-white"}`}>
        {labels[type] || type}
      </span>
    );
  };

  // Group payments by property
  const paymentsByProperty = filteredPayments?.reduce<Record<string, typeof filteredPayments>>((acc, payment) => {
    const propertyName = payment.property?.propertyName || payment.property?.addressLine1 || "Unknown";
    if (!acc[propertyName]) acc[propertyName] = [];
    acc[propertyName].push(payment);
    return acc;
  }, {});

  return (
    <div>
      {/* Header with Add Button */}
      <div className="flex justify-between items-center mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 mr-4">
          <StatCard label="Total Disbursements" value={formatCurrency(totalAmount)} color="blue" />
          <StatCard label="Total Payments" value={(filteredPayments?.length || 0).toString()} color="green" />
          <StatCard label="Properties" value={Object.keys(paymentsByProperty || {}).length.toString()} color="yellow" />
        </div>
        <button
          onClick={() => setShowAddPaymentModal(true)}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Payment
        </button>
      </div>

      {/* Filters */}
      <div className="bg-gray-800 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <select
            value={filterProperty}
            onChange={(e) => setFilterProperty(e.target.value)}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
          >
            <option value="all">All Properties</option>
            {properties?.map((property) => (
              <option key={property._id} value={property._id}>
                {property.propertyName || property.addressLine1}
              </option>
            ))}
          </select>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
          >
            <option value="all">All Types</option>
            <option value="interim">Interim</option>
            <option value="sda_share">SDA Share</option>
            <option value="rent_contribution">Rent Contribution</option>
            <option value="other">Other</option>
          </select>
          <div>
            <label className="block text-xs text-gray-400 mb-1">From Date</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">To Date</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            />
          </div>
        </div>
      </div>

      {/* Payments by Property */}
      {!filteredPayments ? (
        <div className="text-gray-400 text-center py-8">Loading...</div>
      ) : filteredPayments.length === 0 ? (
        <div className="text-center py-12 bg-gray-800 rounded-lg">
          <p className="text-gray-400">No owner disbursements found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {paymentsByProperty && Object.entries(paymentsByProperty).map(([propertyName, payments]) => {
            const propertyTotal = payments.reduce((sum, p) => sum + p.amount, 0);
            const owner = payments[0]?.owner;
            const isExpanded = expandedProperties.has(propertyName);
            return (
              <div key={propertyName} className="bg-gray-800 rounded-lg overflow-hidden">
                <div
                  className="bg-gray-700 px-4 py-3 flex justify-between items-center cursor-pointer hover:bg-gray-650"
                  onClick={() => togglePropertyExpanded(propertyName)}
                >
                  <div className="flex items-center gap-3">
                    <svg
                      className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <div>
                      <h4 className="text-white font-medium">{propertyName}</h4>
                      <p className="text-gray-400 text-sm">
                        Owner: {owner?.companyName || `${owner?.firstName || ""} ${owner?.lastName || ""}`.trim() || "Unknown"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-white font-medium">{formatCurrency(propertyTotal)}</p>
                      <p className="text-gray-400 text-sm">{payments.length} payment(s)</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); generateOwnerStatement(propertyName, payments); }}
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg flex items-center gap-2"
                      title="Generate PDF Statement"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Statement
                    </button>
                  </div>
                </div>
                {isExpanded && (
                  <table className="w-full">
                    <thead className="bg-gray-700">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Date</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Type</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Description</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Reference</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-400 uppercase">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {payments.map((payment) => (
                        <tr key={payment._id} className="hover:bg-gray-700">
                          <td className="px-4 py-3 text-white text-sm">{payment.paymentDate}</td>
                          <td className="px-4 py-3">{getPaymentTypeBadge(payment.paymentType)}</td>
                          <td className="px-4 py-3 text-gray-400 text-sm">{payment.description || "-"}</td>
                          <td className="px-4 py-3 text-gray-400 text-sm">{payment.bankReference || "-"}</td>
                          <td className="px-4 py-3 text-right text-green-400 text-sm font-medium">{formatCurrency(payment.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Properties with participants but no payment records */}
      {propertiesWithParticipantsNoPayments.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Properties Awaiting Payment Records
          </h3>
          <div className="space-y-4">
            {propertiesWithParticipantsNoPayments.map((property) => {
              const suggested = calculateSuggestedAmount(property._id);
              const owner = property.owner;
              const propertyName = property.propertyName || property.addressLine1;
              const propertyParticipants = participants?.filter(p => {
                const dwelling = p.dwelling;
                return dwelling && dwelling.propertyId === property._id;
              }) || [];

              return (
                <div key={property._id} className="bg-gray-800 rounded-lg overflow-hidden border border-yellow-600/30">
                  <div className="bg-gray-700 px-4 py-3 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse" />
                      <div>
                        <h4 className="text-white font-medium">{propertyName}</h4>
                        <p className="text-gray-400 text-sm">
                          Owner: {owner?.companyName || `${owner?.firstName || ""} ${owner?.lastName || ""}`.trim() || "Unknown"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-yellow-400 font-medium">{formatCurrency(suggested.netAmount)}/mo expected</p>
                        <p className="text-gray-400 text-sm">{propertyParticipants.length} participant(s)</p>
                      </div>
                      <button
                        onClick={() => generateStatementFromPlans(property)}
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg flex items-center gap-2"
                        title="Generate PDF Statement from Plan Data"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Statement
                      </button>
                    </div>
                  </div>
                  <div className="px-4 py-3 bg-gray-700 text-sm">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-gray-300">
                      <div>
                        <span className="text-gray-500">Monthly SDA:</span> {formatCurrency(suggested.sdaAmount)}
                      </div>
                      <div>
                        <span className="text-gray-500">Monthly RRC:</span> {formatCurrency(suggested.rrcAmount)}
                      </div>
                      <div>
                        <span className="text-gray-500">Mgmt Fee ({suggested.managementFeePercent}%):</span> ({formatCurrency(suggested.managementFee)})
                      </div>
                      <div>
                        <span className="text-gray-500">Net to Owner:</span> <span className="text-green-400 font-medium">{formatCurrency(suggested.netAmount)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add Payment Modal */}
      {showAddPaymentModal && (
        <AddOwnerPaymentModal
          properties={properties || []}
          calculateSuggestedAmount={calculateSuggestedAmount}
          formatCurrency={formatCurrency}
          onClose={() => setShowAddPaymentModal(false)}
          onSubmit={async (data) => {
            try {
              await createOwnerPayment({
                propertyId: data.propertyId as Id<"properties">,
                ownerId: data.ownerId as Id<"owners">,
                paymentType: data.paymentType as "interim" | "sda_share" | "rent_contribution" | "other",
                amount: data.amount,
                paymentDate: data.paymentDate,
                bankReference: data.bankReference || undefined,
                description: data.description || undefined,
                notes: data.notes || undefined,
              });
              setShowAddPaymentModal(false);
            } catch (error) {
              console.error("Error creating payment:", error);
              alert("Failed to create payment");
            }
          }}
        />
      )}
    </div>
  );
}

// Add Owner Payment Modal Component
function AddOwnerPaymentModal({
  properties,
  calculateSuggestedAmount,
  formatCurrency,
  onClose,
  onSubmit,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  properties: Array<any>;
  calculateSuggestedAmount: (propertyId: string) => { sdaAmount: number; rrcAmount: number; managementFee: number; netAmount: number; managementFeePercent?: number };
  formatCurrency: (amount: number) => string;
  onClose: () => void;
  onSubmit: (data: { propertyId: string; ownerId: string; paymentType: string; amount: number; paymentDate: string; bankReference?: string; description?: string; notes?: string }) => void;
}) {
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");
  const [paymentType, setPaymentType] = useState<string>("sda_share");
  const [amount, setAmount] = useState<string>("");
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [bankReference, setBankReference] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const selectedProperty = properties.find(p => p._id === selectedPropertyId);
  const suggested = selectedPropertyId ? calculateSuggestedAmount(selectedPropertyId) : null;

  const handlePropertyChange = (propertyId: string) => {
    setSelectedPropertyId(propertyId);
    if (propertyId) {
      const calc = calculateSuggestedAmount(propertyId);
      setAmount(calc.netAmount.toFixed(2));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPropertyId || !amount) return;

    onSubmit({
      propertyId: selectedPropertyId,
      ownerId: selectedProperty?.ownerId || selectedProperty?.owner?._id || "",
      paymentType,
      amount: parseFloat(amount),
      paymentDate,
      bankReference: bankReference || undefined,
      description: description || undefined,
      notes: notes || undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-white mb-4">Add Owner Payment</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Property Selection */}
          <div>
            <label className="block text-sm text-gray-300 mb-1">Property *</label>
            <select
              value={selectedPropertyId}
              onChange={(e) => handlePropertyChange(e.target.value)}
              required
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            >
              <option value="">Select property...</option>
              {properties.map((property) => (
                <option key={property._id} value={property._id}>
                  {property.propertyName || property.addressLine1}
                </option>
              ))}
            </select>
          </div>

          {/* Suggested Amount Breakdown */}
          {suggested && selectedPropertyId && (
            <div className="bg-gray-700 rounded-lg p-3 text-sm">
              <p className="text-gray-300 font-medium mb-2">Suggested Calculation:</p>
              <div className="space-y-1 text-gray-400">
                <div className="flex justify-between">
                  <span>Monthly SDA:</span>
                  <span className="text-white">{formatCurrency(suggested.sdaAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Monthly RRC:</span>
                  <span className="text-white">{formatCurrency(suggested.rrcAmount)}</span>
                </div>
                <div className="flex justify-between border-t border-gray-600 pt-1">
                  <span>Gross:</span>
                  <span className="text-white">{formatCurrency(suggested.sdaAmount + suggested.rrcAmount)}</span>
                </div>
                <div className="flex justify-between text-red-400">
                  <span>Management Fee ({suggested.managementFeePercent || 0}%):</span>
                  <span>-{formatCurrency(suggested.managementFee)}</span>
                </div>
                <div className="flex justify-between border-t border-gray-600 pt-1 font-medium">
                  <span className="text-green-400">Net to Owner:</span>
                  <span className="text-green-400">{formatCurrency(suggested.netAmount)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Payment Type */}
          <div>
            <label className="block text-sm text-gray-300 mb-1">Payment Type *</label>
            <select
              value={paymentType}
              onChange={(e) => setPaymentType(e.target.value)}
              required
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            >
              <option value="sda_share">SDA Share</option>
              <option value="interim">Interim</option>
              <option value="rent_contribution">Rent Contribution</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm text-gray-300 mb-1">Amount *</label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            />
          </div>

          {/* Payment Date */}
          <div>
            <label className="block text-sm text-gray-300 mb-1">Payment Date *</label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              required
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            />
          </div>

          {/* Bank Reference */}
          <div>
            <label className="block text-sm text-gray-300 mb-1">Bank Reference</label>
            <input
              type="text"
              value={bankReference}
              onChange={(e) => setBankReference(e.target.value)}
              placeholder="Optional"
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm text-gray-300 mb-1">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Month ending January"
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm text-gray-300 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Optional notes"
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedPropertyId || !amount}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg"
            >
              Add Payment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================
// SHARED COMPONENTS
// ============================================
function StatCard({ label, value, color = "blue" }: { label: string; value: string; color?: "blue" | "green" | "yellow" | "red" }) {
  const colorClasses = { blue: "text-blue-400", green: "text-green-400", yellow: "text-yellow-400", red: "text-red-400" };
  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <p className="text-gray-400 text-sm">{label}</p>
      <p className={`text-2xl font-bold ${colorClasses[color]}`}>{value}</p>
    </div>
  );
}
