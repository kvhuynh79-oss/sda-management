"use client";

import { useQuery, useMutation, useConvex } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { RequireAuth } from "@/components/RequireAuth";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Id } from "../../../convex/_generated/dataModel";

/** Convert an image URL to a base64 data URL for PDF embedding. */
async function loadLogoAsDataUrl(url: string): Promise<string | undefined> {
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    return await new Promise<string>((resolve, reject) => {
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) { reject(new Error("No canvas context")); return; }
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = reject;
      img.src = url;
    });
  } catch {
    return undefined;
  }
}

/** Format a date string (YYYY-MM-DD) into human-readable format (e.g. "19 Jan 2026"). */
function formatInvoiceDate(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

type TabType = "payments" | "claims" | "owner_payments" | "mta_claims";

export default function FinancialsPage() {
  return (
    <RequireAuth>
      <Suspense fallback={<LoadingScreen />}>
        <FinancialsContent />
      </Suspense>
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
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg transition-colors"
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
            <TabButton
              label="MTA Claims"
              isActive={activeTab === "mta_claims"}
              onClick={() => handleTabChange("mta_claims")}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              }
            />
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === "claims" && <ClaimsTab userId={user.id} />}
        {activeTab === "payments" && <PaymentsTab userId={user.id} />}
        {activeTab === "owner_payments" && <OwnerPaymentsTab userId={user.id} />}
        {activeTab === "mta_claims" && <MtaClaimsTab userId={user.id} />}
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
          ? "border-teal-600 text-teal-500"
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
  const { alert: alertDialog } = useConfirmDialog();
  const { organization } = useOrganization();
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

  const convex = useConvex();
  const dashboard = useQuery(api.claims.getDashboard, { userId: userId as Id<"users"> });
  const providerSettings = useQuery(api.providerSettings.get, { userId: userId as Id<"users"> });
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

  const generateNdisExport = async () => {
    const paceClaims = filteredClaims?.filter((c) => c.claimMethod === "pace" && c.status === "pending");
    if (!paceClaims || paceClaims.length === 0) {
      await alertDialog("No PACE claims pending for export");
      return;
    }
    if (!userId) return;

    const [year, month] = selectedPeriod.split("-").map(Number);
    const now = new Date();
    const todayDDMMYY = `${String(now.getDate()).padStart(2, "0")}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getFullYear()).slice(2)}`;
    const todayDDMMYYYY = `${String(now.getDate()).padStart(2, "0")}${String(now.getMonth() + 1).padStart(2, "0")}${now.getFullYear()}`;

    // Decrypt NDIS numbers
    const ndisMap = new Map<string, string>();
    const decryptionErrors: string[] = [];

    await Promise.all(
      paceClaims.map(async (claim) => {
        const pid = claim.participant._id as Id<"participants">;
        if (ndisMap.has(pid)) return;
        try {
          const participant = await convex.query(api.participants.getById, {
            userId: userId as Id<"users">,
            participantId: pid,
          });
          const ndis = participant?.ndisNumber || "";
          if (!ndis || ndis.startsWith("enc:") || ndis === "[encrypted]") {
            decryptionErrors.push(`${claim.participant.firstName} ${claim.participant.lastName}`);
          } else {
            ndisMap.set(pid, ndis);
          }
        } catch {
          decryptionErrors.push(`${claim.participant.firstName} ${claim.participant.lastName}`);
        }
      })
    );

    if (decryptionErrors.length > 0) {
      await alertDialog(
        `Cannot export: NDIS numbers could not be decrypted for: ${decryptionErrors.join(", ")}.\n\n` +
        `Please check that ENCRYPTION_KEY is correctly set in your Convex dashboard.`
      );
      return;
    }

    const headers = ["RegistrationNumber", "NDISNumber", "SupportsDeliveredFrom", "SupportsDeliveredTo", "SupportNumber", "ClaimReference", "Quantity", "Hours", "UnitPrice", "GSTCode", "AuthorisedBy", "ParticipantApproved", "InKindFundingProgram", "ClaimType", "CancellationReason", "ABN of Support Provider"];

    // Validate SupportNumber is not empty before proceeding
    const missingSupport = paceClaims.filter(
      (c) => !(c.plan.supportItemNumber || providerSettings?.defaultSupportItemNumber)
    );
    if (missingSupport.length > 0) {
      const names = missingSupport.map((c) => `${c.participant.firstName} ${c.participant.lastName}`).join(", ");
      await alertDialog(
        `Cannot export: Support Item Number is missing for: ${names}.\n\n` +
        `Please set a Support Item Number on their plan, or configure a default in Provider Settings.`
      );
      return;
    }

    const rows = paceClaims.map((claim) => {
      const claimDay = claim.claimDay || 1;
      // Support period: one day before claim day (prev month) → claim day (current month)
      // e.g. claim day 13, Feb 2026: From = 2026-01-12, To = 2026-02-13
      const fromDate = new Date(year, month - 2, claimDay - 1); // prev month, one day before claim day
      const toDate = new Date(year, month - 1, claimDay); // current month, claim day

      return {
        RegistrationNumber: (providerSettings?.ndisRegistrationNumber || "").replace(/\s/g, ""),
        NDISNumber: ndisMap.get(claim.participant._id as string) || "",
        SupportsDeliveredFrom: toNdisDate(fromDate),
        SupportsDeliveredTo: toNdisDate(toDate),
        SupportNumber: claim.plan.supportItemNumber || providerSettings?.defaultSupportItemNumber || "",
        ClaimReference: sanitizeClaimRef(`${claim.participant.firstName}_${todayDDMMYY}`),
        Quantity: "1",
        Hours: "",
        UnitPrice: claim.expectedAmount.toFixed(2),
        GSTCode: validGstCode(providerSettings?.defaultGstCode),
        AuthorisedBy: "",
        ParticipantApproved: "",
        InKindFundingProgram: "",
        ClaimType: "",
        CancellationReason: "",
        "ABN of Support Provider": (providerSettings?.abn || "").replace(/\s/g, ""),
      };
    });

    let csvContent = headers.join(",") + "\n";
    rows.forEach((row) => {
      csvContent += headers.map((h) => row[h as keyof typeof row]).join(",") + "\n";
    });

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const orgCode = (providerSettings as any)?.orgAbbreviation || providerSettings?.providerName?.substring(0, 3).toUpperCase() || "NDIS";
    a.download = `${orgCode}_${todayDDMMYYYY}.csv`;
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

  // Helper: format Date as YYYY-MM-DD for NDIS portal (mandatory format per spec)
  const toNdisDate = (d: Date): string => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  // Helper: sanitize ClaimReference — only alphanumeric, /, _, - allowed (up to 50 chars)
  const sanitizeClaimRef = (ref: string): string => {
    return ref.replace(/[^a-zA-Z0-9/_-]/g, "").substring(0, 50);
  };

  // Helper: validate GST code — must be P1, P2, or P5 per NDIS spec
  const validGstCode = (code: string | undefined): string => {
    if (code === "P1" || code === "P2" || code === "P5") return code;
    return "P2"; // Default to P2 (GST Free) for SDA
  };

  // Export selected claims to CSV (PACE format for NDIS portal)
  const exportSelectedClaimsCsv = async () => {
    if (selectedClaims.size === 0) {
      await alertDialog("Please select at least one claim to export");
      return;
    }
    if (!userId) return;

    const now = new Date();
    const todayDDMMYY = `${String(now.getDate()).padStart(2, "0")}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getFullYear()).slice(2)}`;
    const todayDDMMYYYY = `${String(now.getDate()).padStart(2, "0")}${String(now.getMonth() + 1).padStart(2, "0")}${now.getFullYear()}`;

    const selectedClaimsList = filteredClaims?.filter(
      (c) => selectedClaims.has(`${c.participant._id}-${c.claimDay}`)
    );

    if (!selectedClaimsList || selectedClaimsList.length === 0) {
      await alertDialog("No claims selected for export");
      return;
    }

    const [year, month] = selectedPeriod.split("-").map(Number);

    // Decrypt NDIS numbers for all selected participants
    const ndisMap = new Map<string, string>();
    const decryptionErrors: string[] = [];

    await Promise.all(
      selectedClaimsList.map(async (claim) => {
        const pid = claim.participant._id as Id<"participants">;
        if (ndisMap.has(pid)) return;
        try {
          const participant = await convex.query(api.participants.getById, {
            userId: userId as Id<"users">,
            participantId: pid,
          });
          const ndis = participant?.ndisNumber || "";
          if (!ndis || ndis.startsWith("enc:") || ndis === "[encrypted]") {
            decryptionErrors.push(`${claim.participant.firstName} ${claim.participant.lastName}`);
          } else {
            ndisMap.set(pid, ndis);
          }
        } catch {
          decryptionErrors.push(`${claim.participant.firstName} ${claim.participant.lastName}`);
        }
      })
    );

    if (decryptionErrors.length > 0) {
      await alertDialog(
        `Cannot export: NDIS numbers could not be decrypted for: ${decryptionErrors.join(", ")}.\n\n` +
        `Please check that ENCRYPTION_KEY is correctly set in your Convex dashboard.`
      );
      return;
    }

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

    // Validate SupportNumber is not empty before proceeding
    const missingSupport = selectedClaimsList.filter(
      (c) => !(c.plan.supportItemNumber || providerSettings?.defaultSupportItemNumber)
    );
    if (missingSupport.length > 0) {
      const names = missingSupport.map((c) => `${c.participant.firstName} ${c.participant.lastName}`).join(", ");
      await alertDialog(
        `Cannot export: Support Item Number is missing for: ${names}.\n\n` +
        `Please set a Support Item Number on their plan, or configure a default in Provider Settings.`
      );
      return;
    }

    const rows = selectedClaimsList.map((claim) => {
      const claimDay = claim.claimDay || 1;
      // Support period: one day before claim day (prev month) → claim day (current month)
      // e.g. claim day 13, Feb 2026: From = 2026-01-12, To = 2026-02-13
      const fromDate = new Date(year, month - 2, claimDay - 1); // prev month, one day before claim day
      const toDate = new Date(year, month - 1, claimDay); // current month, claim day

      return {
        RegistrationNumber: (providerSettings?.ndisRegistrationNumber || "").replace(/\s/g, ""),
        NDISNumber: ndisMap.get(claim.participant._id as string) || "",
        SupportsDeliveredFrom: toNdisDate(fromDate),
        SupportsDeliveredTo: toNdisDate(toDate),
        SupportNumber: claim.plan.supportItemNumber || providerSettings?.defaultSupportItemNumber || "",
        ClaimReference: sanitizeClaimRef(`${claim.participant.firstName}_${todayDDMMYY}`),
        Quantity: "1",
        Hours: "",
        UnitPrice: claim.expectedAmount.toFixed(2),
        GSTCode: validGstCode(providerSettings?.defaultGstCode),
        AuthorisedBy: "",
        ParticipantApproved: "",
        InKindFundingProgram: "",
        ClaimType: "",
        CancellationReason: "",
        "ABN of Support Provider": (providerSettings?.abn || "").replace(/\s/g, ""),
      };
    });

    let csvContent = headers.join(",") + "\n";
    rows.forEach((row) => {
      csvContent += headers.map((h) => row[h as keyof typeof row]).join(",") + "\n";
    });

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const orgCode = (providerSettings as any)?.orgAbbreviation || providerSettings?.providerName?.substring(0, 3).toUpperCase() || "NDIS";
    a.download = `${orgCode}_${todayDDMMYYYY}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    // Clear selections after export (manual submit required)
    clearAllSelections();
    await alertDialog(`CSV exported with ${selectedClaimsList.length} claim(s). Click "Submit" on each claim after uploading to NDIS portal.`);
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
      await alertDialog("Failed to mark claim as submitted");
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
      await alertDialog("Failed to mark claim as paid");
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
      await alertDialog("Failed to reject claim");
    }
  };

  const handleRevertToPending = async (claimId: Id<"claims">) => {
    if (!userId) return;
    try {
      await revertToPending({ claimId, userId: userId as Id<"users"> });
    } catch (error) {
      console.error("Error reverting claim:", error);
      await alertDialog("Failed to revert claim to pending");
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
      await alertDialog("Claim created and marked as submitted!");
    } catch (error) {
      console.error("Error creating claim:", error);
      await alertDialog("Failed to create claim");
    }
  };

  const getNextInvoiceNumber = useMutation(api.mtaClaims.getNextInvoiceNumber);

  const handleGenerateSingleSdaInvoice = async (claim: ClaimItem) => {
    try {
      const { generateInvoicePdf } = await import("@/utils/invoicePdf");

      // Get decrypted participant data
      const participant = await convex.query(api.participants.getById, {
        userId: userId as Id<"users">,
        participantId: claim.participant._id,
      });

      if (!participant) {
        await alertDialog("Could not load participant details");
        return;
      }

      const invoiceNumber = await getNextInvoiceNumber({ userId: userId as Id<"users"> });

      const [year, month] = selectedPeriod.split("-").map(Number);
      const claimDay = claim.claimDay || 1;
      const fromDate = new Date(year, month - 2, claimDay - 1);
      const toDate = new Date(year, month - 1, claimDay);
      const formatDateShort = (d: Date) =>
        `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;

      // Include dwelling number in the address
      const dwellingNum = claim.dwelling?.dwellingName || "";
      const fullAddr = claim.property
        ? `${dwellingNum ? dwellingNum + " " : ""}${claim.property.addressLine1 || ""} ${claim.property.suburb || ""} ${claim.property.state || ""} ${claim.property.postcode || ""}`.trim()
        : "";

      const dob = participant.dateOfBirth
        ? (() => {
            const parts = participant.dateOfBirth.split("-");
            return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : participant.dateOfBirth;
          })()
        : "";

      // Load org logo for the PDF
      let logoDataUrl: string | undefined;
      if (organization?.resolvedLogoUrl) {
        logoDataUrl = await loadLogoAsDataUrl(organization.resolvedLogoUrl);
      }

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
        invoiceNumber,
        invoiceDate: new Date().toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }),
        dueDate: new Date(Date.now() + 30 * 86400000).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }),
        reference: `${participant.firstName} ${participant.lastName} - SDA`,
        customerName: `${participant.firstName} ${participant.lastName}`,
        customerAddress: `${dwellingNum ? dwellingNum + " " : ""}${claim.property?.addressLine1 || ""}\n${(claim.property?.suburb || "").toUpperCase()} ${claim.property?.postcode || ""}\nAUSTRALIA`,
        lineItems: [{
          description: `Participant Name: ${participant.firstName} ${participant.lastName}\nDOB: ${dob}\nNDIS#: ${participant.ndisNumber || ""}\nSupport # ${claim.plan?.supportItemNumber || providerSettings?.defaultSupportItemNumber || ""}\nSpecialist Disability Accommodation\nDates: ${formatDateShort(fromDate)} - ${formatDateShort(toDate)}\n(Yearly SDA funding is $${((claim.expectedAmount * 12) || 0).toLocaleString("en-AU", { minimumFractionDigits: 0 })})\nAddress: SDA address : ${fullAddr}`,
          quantity: 1,
          unitPrice: claim.expectedAmount,
          gst: "GST Free",
          amount: claim.expectedAmount,
        }],
        subtotal: claim.expectedAmount,
        totalAmount: claim.expectedAmount,
        amountDue: claim.expectedAmount,
      });
    } catch (error) {
      console.error("Error generating SDA invoice:", error);
      await alertDialog(`Failed to generate invoice: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  const handleGenerateSdaInvoiceBulk = async (claims: ClaimItem[]) => {
    try {
      let generated = 0;
      for (const claim of claims) {
        await handleGenerateSingleSdaInvoice(claim);
        generated++;
      }
      await alertDialog(`Generated ${generated} invoice(s)`);
    } catch (error) {
      console.error("Error generating bulk invoices:", error);
      await alertDialog(`Failed to generate invoices: ${error instanceof Error ? error.message : "Unknown error"}`);
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
            <button onClick={() => setSelectedDay(null)} className="text-sm text-teal-500 hover:text-teal-400">
              Clear filter (Day {selectedDay})
            </button>
          )}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="text-center text-gray-400 text-xs py-2 font-medium">{day}</div>
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
                  ${isSelected ? "ring-2 ring-teal-600 border-teal-600" : ""}
                  ${isToday && day ? "ring-2 ring-yellow-500" : ""}`}
              >
                {day && (
                  <>
                    <span className={`text-xs ${isToday ? "text-yellow-400 font-bold" : "text-gray-400"}`}>{day}</span>
                    {dayData && dayData.length > 0 && (
                      <div className="mt-1 space-y-0.5 overflow-hidden">
                        {dayData.slice(0, 3).map((claim, idx) => {
                          const colors = { overdue: "bg-red-500", pending: "bg-yellow-500", submitted: "bg-teal-600", paid: "bg-green-500" };
                          return (
                            <div key={idx} className="flex items-center gap-1">
                              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${colors[claim.status]}`}></div>
                              <span className="text-[10px] text-gray-400 truncate">{claim.name}</span>
                            </div>
                          );
                        })}
                        {dayData.length > 3 && <span className="text-[9px] text-gray-400">+{dayData.length - 3} more</span>}
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
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-teal-600"></div><span>Submitted</span></div>
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
            className="text-sm text-teal-500 hover:text-teal-400"
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
          <div className="flex items-center gap-2">
            <button
              onClick={exportSelectedClaimsCsv}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export CSV ({selectedClaims.size})
            </button>
            {(() => {
              const planManagedSelected = filteredClaims?.filter(
                (c) => selectedClaims.has(`${c.participant._id}-${c.claimDay}`) && c.claimMethod === "plan_managed"
              ) || [];
              if (planManagedSelected.length === 0) return null;
              return (
                <button
                  onClick={() => handleGenerateSdaInvoiceBulk(planManagedSelected)}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Generate Invoice ({planManagedSelected.length})
                </button>
              );
            })()}
          </div>
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
                        className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-teal-700 focus:ring-teal-600 focus:ring-offset-gray-800 cursor-pointer"
                      />
                      <div>
                        <p className="text-white font-medium">{claim.participant.firstName} {claim.participant.lastName}</p>
                        <p className="text-gray-400 text-sm">{claim.property?.addressLine1} - {claim.dwelling?.dwellingName}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {getStatusBadge(claim.status, claim.isOverdue)}
                          <span className="text-xs text-gray-400 capitalize">{claim.claimMethod.replace(/_/g, " ")}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-medium">{formatCurrency(claim.expectedAmount)}</p>
                      <div className="flex gap-2 mt-2 justify-end min-w-[280px]">
                        {claim.status === "pending" && !claim.existingClaim && (
                          <button
                            onClick={() => handleCreateAndSubmit(claim)}
                            className="px-3 py-1 bg-teal-700 hover:bg-teal-800 text-white text-sm rounded"
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
                            className="px-3 py-1 bg-teal-700 hover:bg-teal-800 text-white text-sm rounded"
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
                        {claim.claimMethod === "plan_managed" && (
                          <button
                            onClick={() => handleGenerateSingleSdaInvoice(claim)}
                            className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded"
                          >
                            Invoice
                          </button>
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
            className={`px-4 py-2 ${buttonColor === "blue" ? "bg-teal-700 hover:bg-teal-800" : "bg-green-600 hover:bg-green-700"} text-white rounded-lg`}
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
function PaymentsTab({ userId }: { userId: string }) {
  const [filterSource, setFilterSource] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const payments = useQuery(api.payments.getAll, { userId: userId as Id<"users"> });

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
                    <p className="text-gray-400 text-xs">{payment.participant?.ndisNumber}</p>
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
function OwnerPaymentsTab({ userId }: { userId: string }) {
  const { alert: alertDialog } = useConfirmDialog();
  const [filterProperty, setFilterProperty] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [expandedProperties, setExpandedProperties] = useState<Set<string>>(new Set());
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);

  const ownerPayments = useQuery(api.ownerPayments.getAll, { userId: userId as Id<"users"> });
  const properties = useQuery(api.properties.getAll, { userId: userId as Id<"users"> });
  const participants = useQuery(
    api.participants.getAll,
    { userId: userId as Id<"users"> }
  );
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
      await alertDialog(`Failed to generate statement: ${error instanceof Error ? error.message : "Unknown error"}`);
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
      await alertDialog(`Failed to generate statement: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  const totalAmount = filteredPayments?.reduce((sum, p) => sum + p.amount, 0) || 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(amount);
  };

  const getPaymentTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      interim: "bg-orange-600 text-white",
      sda_share: "bg-teal-700 text-white",
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
                      className="px-3 py-2 bg-teal-700 hover:bg-teal-800 text-white text-sm rounded-lg flex items-center gap-2"
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
                      <div className="w-3 h-3 bg-yellow-500 rounded-full ring-2 ring-yellow-500/40 ring-offset-1 ring-offset-gray-700" />
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
                        className="px-3 py-2 bg-teal-700 hover:bg-teal-800 text-white text-sm rounded-lg flex items-center gap-2"
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
                        <span className="text-gray-400">Monthly SDA:</span> {formatCurrency(suggested.sdaAmount)}
                      </div>
                      <div>
                        <span className="text-gray-400">Monthly RRC:</span> {formatCurrency(suggested.rrcAmount)}
                      </div>
                      <div>
                        <span className="text-gray-400">Mgmt Fee ({suggested.managementFeePercent}%):</span> ({formatCurrency(suggested.managementFee)})
                      </div>
                      <div>
                        <span className="text-gray-400">Net to Owner:</span> <span className="text-green-400 font-medium">{formatCurrency(suggested.netAmount)}</span>
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
                userId: userId as Id<"users">,
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
              await alertDialog("Failed to create payment");
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
// MTA CLAIMS TAB
// ============================================
function MtaClaimsTab({ userId }: { userId: string }) {
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
      console.error("Error marking MTA submitted:", error);
      await alertDialog("Failed to mark claim as submitted");
    }
  };

  const handleMtaMarkPaid = async (claimId: Id<"mtaClaims">, paidAmount: number, reference?: string, notes?: string) => {
    try {
      await mtaMarkPaid({ userId: userId as Id<"users">, claimId, paidAmount, paymentReference: reference, notes });
      setShowMarkPaidModal(false);
      setSelectedMtaClaim(null);
    } catch (error) {
      console.error("Error marking MTA paid:", error);
      await alertDialog("Failed to mark claim as paid");
    }
  };

  const handleMtaReject = async (claimId: Id<"mtaClaims">, reason?: string) => {
    try {
      await mtaMarkRejected({ userId: userId as Id<"users">, claimId, reason });
      setShowRejectModal(false);
      setSelectedMtaClaim(null);
    } catch (error) {
      console.error("Error rejecting MTA claim:", error);
      await alertDialog("Failed to reject claim");
    }
  };

  const handleMtaRevert = async (claimId: Id<"mtaClaims">) => {
    try {
      await mtaRevertToPending({ userId: userId as Id<"users">, claimId });
    } catch (error) {
      console.error("Error reverting MTA claim:", error);
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
        console.error("Error deleting MTA claim:", error);
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
      console.error("Error generating MTA invoice:", error);
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

// ============================================
// CREATE MTA CLAIM MODAL
// ============================================
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
      console.error("Error creating MTA claim:", error);
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
      console.error("Error bulk creating MTA claims:", error);
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

// ============================================
// SHARED COMPONENTS
// ============================================
function StatCard({ label, value, color = "blue" }: { label: string; value: string; color?: "blue" | "green" | "yellow" | "red" }) {
  const colorClasses = { blue: "text-teal-500", green: "text-green-400", yellow: "text-yellow-400", red: "text-red-400" };
  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <p className="text-gray-400 text-sm">{label}</p>
      <p className={`text-2xl font-bold ${colorClasses[color]}`}>{value}</p>
    </div>
  );
}
