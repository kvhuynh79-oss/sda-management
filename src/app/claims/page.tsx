"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useConvex } from "convex/react";
import { api } from "../../../convex/_generated/api";
import Header from "@/components/Header";
import { RequireAuth } from "@/components/RequireAuth";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Id } from "../../../convex/_generated/dataModel";

export default function ClaimsPage() {
  const router = useRouter();
  const { alert: alertDialog } = useConfirmDialog();
  const [user, setUser] = useState<{ id: string; role: string } | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [filterMethod, setFilterMethod] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
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

  const convex = useConvex();
  const userId = user ? (user.id as Id<"users">) : undefined;
  const dashboard = useQuery(api.claims.getDashboard, userId ? { userId } : "skip");
  const summary = useQuery(api.claims.getMonthlySummary, userId ? { userId, claimPeriod: selectedPeriod } : "skip");
  const providerSettings = useQuery(api.ndisClaimExport.getProviderSettings, userId ? { userId } : "skip");
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
      submitted: "bg-teal-700 text-white",
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

  // Filter and group claims - define types here so they can be used in generateNdisExport
  const filteredClaims = dashboard?.claims.filter((c: { claimMethod: string; status: string; claimDay: number }) => {
    if (filterMethod !== "all" && c.claimMethod !== filterMethod) return false;
    if (filterStatus !== "all" && c.status !== filterStatus) return false;
    if (selectedDay !== null && c.claimDay !== selectedDay) return false;
    return true;
  });

  // Get claims grouped by day for calendar display (unfiltered by day selection)
  type CalendarClaim = {
    name: string;
    status: "pending" | "submitted" | "paid" | "overdue";
  };
  const claimsByDay = dashboard?.claims.reduce<Record<number, CalendarClaim[]>>((acc, claim) => {
    const day = claim.claimDay;
    if (!acc[day]) {
      acc[day] = [];
    }
    const status = claim.isOverdue && claim.status === "pending"
      ? "overdue"
      : claim.status as "pending" | "submitted" | "paid";
    acc[day].push({
      name: `${claim.participant.firstName} ${claim.participant.lastName.charAt(0)}.`,
      status,
    });
    return acc;
  }, {});

  // Generate calendar days for the selected month
  const getCalendarDays = () => {
    const [year, month] = selectedPeriod.split("-").map(Number);
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay(); // 0 = Sunday

    const days: (number | null)[] = [];
    // Add empty cells for days before the first of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    // Add the days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };

  type ClaimItem = NonNullable<typeof filteredClaims>[number];
  type ClaimsGrouped = Record<number, ClaimItem[]>;

  const groupedByDay = filteredClaims?.reduce<ClaimsGrouped>((acc: ClaimsGrouped, claim: ClaimItem) => {
    const day = claim.claimDay;
    if (!acc[day]) acc[day] = [];
    acc[day].push(claim);
    return acc;
  }, {});

  const generateNdisExport = async (claim: ClaimItem) => {
    if (!providerSettings) {
      await alertDialog("Please configure provider settings first (go to Payments > NDIS Export > Provider Settings)");
      return;
    }
    if (!userId) return;

    // Fetch decrypted NDIS number via participants.getById (proven working path)
    let ndisNumber = "";

    try {
      const participant = await convex.query(api.participants.getById, {
        userId,
        participantId: claim.participant._id,
      });
      ndisNumber = participant?.ndisNumber || "";
    } catch (err) {
      console.error("Failed to fetch participant for NDIS number:", err);
    }

    // Safety check: NEVER put encrypted values into CSV
    if (!ndisNumber || ndisNumber.startsWith("enc:") || ndisNumber === "[encrypted]") {
      await alertDialog(
        `Cannot export: NDIS number for ${claim.participant.firstName} ${claim.participant.lastName} could not be decrypted.\n\n` +
        `Please check that ENCRYPTION_KEY is correctly set in your Convex dashboard.`
      );
      return;
    }

    // Support period: day after previous claim day → current claim day
    // e.g. claim day 13, Feb 2026: From = 2026-01-14, To = 2026-02-13
    const [yearStr, monthStr] = selectedPeriod.split("-");
    const year = parseInt(yearStr);
    const month = parseInt(monthStr);
    const claimDay = claim.claimDay || 1;
    const fromDate = new Date(year, month - 2, claimDay + 1); // prev month, day after claim day
    const toDate = new Date(year, month - 1, claimDay); // current month, claim day
    const formatNdisDate = (d: Date) => {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    };
    const periodStart = formatNdisDate(fromDate);
    const periodEnd = formatNdisDate(toDate);

    // Claim reference: FirstName_DDMMYY (today's date)
    const now = new Date();
    const todayDDMMYY = `${String(now.getDate()).padStart(2, "0")}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getFullYear()).slice(2)}`;
    const claimRef = `${claim.participant.firstName}_${todayDDMMYY}`.replace(/[^a-zA-Z0-9/_-]/g, "").substring(0, 50);

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

    // Validate SupportNumber is not empty
    const supportNumber = claim.plan.supportItemNumber || providerSettings.defaultSupportItemNumber || "";
    if (!supportNumber) {
      await alertDialog(
        `Cannot export: Support Item Number is missing for ${claim.participant.firstName} ${claim.participant.lastName}.\n\n` +
        `Please set a Support Item Number on their plan, or configure a default in Provider Settings.`
      );
      return;
    }

    // Validate GST code - must be P1, P2, or P5
    const gstCode = ((): string => {
      const code = providerSettings.defaultGstCode;
      if (code === "P1" || code === "P2" || code === "P5") return code;
      return "P2"; // Default to P2 (GST Free) for SDA
    })();

    // Build the row data
    const row = {
      RegistrationNumber: (providerSettings.ndisRegistrationNumber || "").replace(/\s/g, ""),
      NDISNumber: ndisNumber,
      SupportsDeliveredFrom: periodStart,
      SupportsDeliveredTo: periodEnd,
      SupportNumber: supportNumber,
      ClaimReference: claimRef,
      Quantity: "1",
      Hours: "",
      UnitPrice: claim.expectedAmount.toFixed(2),
      GSTCode: gstCode,
      AuthorisedBy: "",
      ParticipantApproved: "",
      InKindFundingProgram: "",
      ClaimType: "",
      CancellationReason: "",
      "ABN of Support Provider": (providerSettings.abn || "").replace(/\s/g, ""),
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
      `BLS_${todayDDMMYY}.csv`
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
        userId: user.id as Id<"users">,
      });
      await alertDialog(`Created ${result.created} claims, skipped ${result.skipped}`);
    } catch (err) {
      console.error("Failed to initialize claims:", err);
      await alertDialog("Failed to initialize claims");
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
          userId: user?.id as Id<"users">,
        });
      } else {
        await markSubmitted({
          claimId: selectedClaim.claimId,
          claimDate: formData.claimDate,
          claimedAmount: formData.claimedAmount ? parseFloat(formData.claimedAmount) : undefined,
          notes: formData.notes || undefined,
          userId: user?.id as Id<"users">,
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
      await alertDialog("Failed to mark as submitted");
    }
  };

  const handleMarkPaid = async () => {
    if (!selectedClaim?.claimId || !user) return;

    try {
      await markPaid({
        claimId: selectedClaim.claimId,
        paidDate: formData.paidDate,
        paidAmount: parseFloat(formData.paidAmount) || selectedClaim.expectedAmount,
        paymentReference: formData.paymentReference || undefined,
        notes: formData.notes || undefined,
        userId: user.id as Id<"users">,
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
      await alertDialog("Failed to mark as paid");
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <RequireAuth>
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
              className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg"
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
              <p className="text-2xl font-bold text-teal-500">{dashboard.summary.submitted}</p>
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
              <button
                onClick={() => setSelectedDay(null)}
                className="text-sm text-teal-500 hover:text-teal-400"
              >
                Clear filter (Day {selectedDay})
              </button>
            )}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {/* Day headers */}
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="text-center text-gray-400 text-xs py-2 font-medium">
                {day}
              </div>
            ))}
            {/* Calendar days */}
            {getCalendarDays().map((day, index) => {
              const dayData = day ? claimsByDay?.[day] : null;
              const isSelected = selectedDay === day;
              const isToday = day === dashboard?.currentDay;

              return (
                <div
                  key={index}
                  onClick={() => day && dayData && dayData.length > 0 && setSelectedDay(isSelected ? null : day)}
                  className={`
                    relative min-h-[70px] p-1 rounded-lg border transition-all
                    ${!day ? "bg-transparent border-transparent" : ""}
                    ${day && (!dayData || dayData.length === 0) ? "bg-gray-700 border-gray-700 cursor-default" : ""}
                    ${day && dayData && dayData.length > 0 ? "bg-gray-700 border-gray-600 cursor-pointer hover:border-gray-500" : ""}
                    ${isSelected ? "ring-2 ring-teal-600 border-teal-600" : ""}
                    ${isToday && day ? "ring-2 ring-yellow-500" : ""}
                  `}
                >
                  {day && (
                    <>
                      <span className={`text-xs ${isToday ? "text-yellow-400 font-bold" : "text-gray-400"}`}>
                        {day}
                      </span>
                      {dayData && dayData.length > 0 && (
                        <div className="mt-1 space-y-0.5 overflow-hidden">
                          {dayData.slice(0, 4).map((claim, idx) => {
                            const statusColors = {
                              overdue: "text-red-400",
                              pending: "text-yellow-400",
                              submitted: "text-teal-500",
                              paid: "text-green-400",
                            };
                            const dotColors = {
                              overdue: "bg-red-500",
                              pending: "bg-yellow-500",
                              submitted: "bg-teal-600",
                              paid: "bg-green-500",
                            };
                            return (
                              <div key={idx} className="flex items-center gap-1">
                                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColors[claim.status]}`}></div>
                                <span className={`text-[10px] truncate ${statusColors[claim.status]}`}>
                                  {claim.name}
                                </span>
                              </div>
                            );
                          })}
                          {dayData.length > 4 && (
                            <span className="text-[9px] text-gray-400">+{dayData.length - 4} more</span>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-4 text-xs text-gray-400">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              <span>Overdue</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
              <span>Pending</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-teal-600"></div>
              <span>Submitted</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span>Paid</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded border-2 border-yellow-500 bg-transparent"></div>
              <span>Today</span>
            </div>
            <span className="text-gray-400 ml-auto">Click a day to filter claims</span>
          </div>
        </div>

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
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium text-white">
            {selectedDay !== null ? `Claims for Day ${selectedDay}` : "All Claims by Due Date"}
          </h2>
          <span className="text-gray-400 text-sm">
            {filteredClaims?.length || 0} claim(s)
          </span>
        </div>
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
                    <div key={claim.participant._id} className="p-4 hover:bg-gray-700">
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
                          <p className="text-gray-400 text-xs mt-1">
                            NDIS: {claim.participant.ndisNumber}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-green-400 font-medium">{formatCurrency(claim.expectedAmount)}</p>
                          <p className="text-gray-400 text-xs">Monthly SDA</p>
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
                              className="px-3 py-1 bg-teal-700 hover:bg-teal-800 text-white text-sm rounded"
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
            <p className="text-gray-400 text-sm mt-2">
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
                className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg"
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
    </RequireAuth>
  );
}
