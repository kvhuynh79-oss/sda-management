"use client";

import { useState } from "react";
import { useQuery, useMutation, useConvex } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useOrganization } from "@/contexts/OrganizationContext";
import { StatCard } from "./StatCard";
import { loadLogoAsDataUrl, formatInvoiceDate } from "../_utils";

export function ClaimsTab({ userId }: { userId: string }) {
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
      const fromDate = new Date(year, month - 2, claimDay - 1);
      const toDate = new Date(year, month - 1, claimDay);

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
      const fromDate = new Date(year, month - 2, claimDay - 1);
      const toDate = new Date(year, month - 1, claimDay);

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
      await alertDialog("Failed to reject claim");
    }
  };

  const handleRevertToPending = async (claimId: Id<"claims">) => {
    if (!userId) return;
    try {
      await revertToPending({ claimId, userId: userId as Id<"users"> });
    } catch (error) {
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
