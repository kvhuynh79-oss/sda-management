"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import Link from "next/link";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Id } from "../../../convex/_generated/dataModel";

type ReportTab = "financial" | "compliance" | "operational" | "owner";

export default function ReportsPage() {
  const router = useRouter();
  const { alert: alertDialog } = useConfirmDialog();
  const [user, setUser] = useState<{ id: string; role: string } | null>(null);
  const [activeTab, setActiveTab] = useState<ReportTab>("financial");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");

  const userId = user?.id as Id<"users"> | undefined;

  // Existing reports
  const complianceReport = useQuery(
    api.reports.getComplianceReport,
    userId && startDate && endDate ? { userId, startDate, endDate } : "skip"
  );
  const costAnalysis = useQuery(
    api.reports.getCostAnalysis,
    userId && startDate && endDate ? { userId, startDate, endDate } : "skip"
  );
  const contractorPerformance = useQuery(api.reports.getContractorPerformance, userId ? { userId } : "skip");

  // New reports
  const ownerStatement = useQuery(
    api.reports.getOwnerStatement,
    userId && startDate && endDate
      ? {
          userId,
          startDate,
          endDate,
          propertyId: selectedPropertyId ? (selectedPropertyId as Id<"properties">) : undefined,
        }
      : "skip"
  );
  const paymentSummary = useQuery(
    api.reports.getPaymentSummary,
    userId && startDate && endDate
      ? {
          userId,
          startDate,
          endDate,
          propertyId: selectedPropertyId ? (selectedPropertyId as Id<"properties">) : undefined,
        }
      : "skip"
  );
  const outstandingPayments = useQuery(api.reports.getOutstandingPayments, userId ? { userId } : "skip");
  const inspectionSummary = useQuery(
    api.reports.getInspectionSummary,
    userId && startDate && endDate
      ? {
          userId,
          startDate,
          endDate,
          propertyId: selectedPropertyId ? (selectedPropertyId as Id<"properties">) : undefined,
        }
      : "skip"
  );
  const documentExpiry = useQuery(api.reports.getDocumentExpiryReport, userId ? { userId, daysAhead: 90 } : "skip");
  const maintenanceOverview = useQuery(
    api.reports.getMaintenanceOverview,
    userId && startDate && endDate
      ? {
          userId,
          startDate,
          endDate,
          propertyId: selectedPropertyId ? (selectedPropertyId as Id<"properties">) : undefined,
        }
      : "skip"
  );
  const vacancyReport = useQuery(api.reports.getVacancyReport, userId ? { userId } : "skip");
  const incidentSummary = useQuery(
    api.reports.getIncidentSummary,
    userId && startDate && endDate
      ? {
          userId,
          startDate,
          endDate,
          propertyId: selectedPropertyId ? (selectedPropertyId as Id<"properties">) : undefined,
        }
      : "skip"
  );
  const participantPlanStatus = useQuery(api.reports.getParticipantPlanStatus, userId ? { userId, daysAhead: 90 } : "skip");
  const certStats = useQuery(api.complianceCertifications.getDashboardStats, userId ? { userId } : "skip");

  // Properties for filter
  const properties = useQuery(api.properties.getAll, userId ? { userId } : "skip");

  useEffect(() => {
    const storedUser = localStorage.getItem("sda_user");
    if (!storedUser) {
      router.push("/login");
      return;
    }
    const parsed = JSON.parse(storedUser);
    setUser({ id: parsed.id || parsed._id, role: parsed.role });

    const today = new Date();
    const yearStart = new Date(today.getFullYear(), 0, 1);
    setStartDate(yearStart.toISOString().split("T")[0]);
    setEndDate(today.toISOString().split("T")[0]);
  }, [router]);

  if (!user) {
    return <LoadingScreen />;
  }

  const tabs: { id: ReportTab; label: string }[] = [
    { id: "financial", label: "Financial" },
    { id: "compliance", label: "Compliance" },
    { id: "operational", label: "Operational" },
    { id: "owner", label: "Owner Reports" },
  ];

  // PDF Export for Owner Statement
  const exportOwnerStatementPDF = async () => {
    if (!ownerStatement || ownerStatement.length === 0) {
      await alertDialog("No owner statement data available");
      return;
    }

    const doc = new jsPDF();
    let yPos = 20;

    ownerStatement.forEach((property, idx) => {
      if (idx > 0) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(18);
      doc.text("Owner Statement / Folio Summary", 14, yPos);
      yPos += 10;

      doc.setFontSize(12);
      doc.text(`Property: ${property?.propertyName}`, 14, yPos);
      yPos += 6;
      doc.text(`Address: ${property?.address}`, 14, yPos);
      yPos += 6;
      doc.text(`Period: ${startDate} to ${endDate}`, 14, yPos);
      yPos += 10;

      if (property?.owner) {
        doc.text(`Owner: ${property.owner.name}`, 14, yPos);
        yPos += 6;
        if (property.owner.bankAccountName) {
          doc.text(`Bank: ${property.owner.bankAccountName}`, 14, yPos);
          yPos += 6;
          doc.text(`BSB: ${property.owner.bankBsb} | Account: ${property.owner.bankAccountNumber}`, 14, yPos);
          yPos += 10;
        }
      }

      const tableData: string[][] = [];
      property?.dwellings.forEach((dwelling) => {
        dwelling.participants.forEach((p) => {
          if (p) {
            tableData.push([
              dwelling.dwellingName,
              p.participantName,
              `$${p.monthlySda.toLocaleString()}`,
              `$${p.monthlyRrc.toLocaleString()}`,
              `$${p.totalRevenue.toLocaleString()}`,
              `${p.managementFeePercent}%`,
              `$${p.managementFee.toLocaleString()}`,
              `$${p.netToOwner.toLocaleString()}`,
            ]);
          }
        });
      });

      autoTable(doc, {
        startY: yPos,
        head: [["Dwelling", "Participant", "SDA", "RRC", "Total", "Fee %", "Fee $", "Net"]],
        body: tableData,
        theme: "grid",
        styles: { fontSize: 8 },
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;

      doc.setFontSize(12);
      doc.text(`Total Monthly Revenue: $${property?.totalMonthlyRevenue.toLocaleString()}`, 14, yPos);
      yPos += 6;
      doc.text(`Total Net to Owner: $${property?.totalMonthlyNetToOwner.toLocaleString()}`, 14, yPos);
    });

    doc.save(`owner-statement-${startDate}-to-${endDate}.pdf`);
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <Header currentPage="reports" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white">Reports & Analytics</h2>
          <p className="text-gray-400 mt-1">
            Comprehensive reporting for financial, compliance, and operational metrics
          </p>
        </div>

        {/* Filters */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-teal-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-teal-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Property</label>
              <select
                value={selectedPropertyId}
                onChange={(e) => setSelectedPropertyId(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-teal-600"
              >
                <option value="">All Properties</option>
                {properties?.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.propertyName || p.addressLine1}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-700 mb-6">
          <div className="flex gap-4 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? "text-teal-500 border-b-2 border-teal-500"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Financial Tab */}
        {activeTab === "financial" && (
          <div className="space-y-6">
            {/* Payment Summary */}
            <ReportSection title="Payment Summary">
              {paymentSummary ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <StatCard label="Total Expected" value={`$${paymentSummary.totalExpected.toLocaleString()}`} color="blue" />
                  <StatCard label="Total Received" value={`$${paymentSummary.totalReceived.toLocaleString()}`} color="green" />
                  <StatCard label="Variance" value={`$${paymentSummary.totalVariance.toLocaleString()}`} color={paymentSummary.totalVariance >= 0 ? "green" : "red"} />
                  <StatCard label="Payments" value={paymentSummary.count.toString()} color="blue" />
                </div>
              ) : (
                <LoadingPlaceholder />
              )}
            </ReportSection>

            {/* Outstanding Payments */}
            <ReportSection title="Outstanding Payments">
              {outstandingPayments ? (
                <>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <StatCard label="Total Outstanding" value={`$${outstandingPayments.totalOutstanding.toLocaleString()}`} color="red" />
                    <StatCard label="Outstanding Claims" value={outstandingPayments.count.toString()} color="yellow" />
                  </div>
                  {outstandingPayments.claims.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-gray-400 border-b border-gray-700">
                            <th className="text-left py-2">Participant</th>
                            <th className="text-left py-2">Property</th>
                            <th className="text-left py-2">Period</th>
                            <th className="text-right py-2">Amount</th>
                            <th className="text-left py-2">Status</th>
                            <th className="text-right py-2">Days Overdue</th>
                          </tr>
                        </thead>
                        <tbody>
                          {outstandingPayments.claims.slice(0, 10).map((claim) => (
                            <tr key={claim?._id} className="border-b border-gray-700/50">
                              <td className="py-2 text-white">{claim?.participantName}</td>
                              <td className="py-2 text-gray-400">{claim?.propertyName}</td>
                              <td className="py-2 text-gray-400">{claim?.claimPeriod}</td>
                              <td className="py-2 text-right text-white">${claim?.expectedAmount.toLocaleString()}</td>
                              <td className="py-2">
                                <span className={`px-2 py-1 rounded text-xs ${
                                  claim?.status === "pending" ? "bg-yellow-600" :
                                  claim?.status === "rejected" ? "bg-red-600" : "bg-teal-700"
                                }`}>
                                  {claim?.status}
                                </span>
                              </td>
                              <td className="py-2 text-right text-red-400">{claim?.daysOverdue}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              ) : (
                <LoadingPlaceholder />
              )}
            </ReportSection>

            {/* Cost Analysis */}
            {costAnalysis && (
              <ReportSection title="Cost Analysis">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <StatCard label="Actual Cost (Period)" value={`$${costAnalysis.actualCostInPeriod.toLocaleString()}`} color="blue" />
                  <StatCard label="Projected (30 Days)" value={`$${costAnalysis.projectedCost30Days.toLocaleString()}`} color="yellow" />
                  <StatCard label="Projected (Annual)" value={`$${costAnalysis.projectedAnnualCost.toLocaleString()}`} color="green" />
                </div>
              </ReportSection>
            )}
          </div>
        )}

        {/* Compliance Tab */}
        {activeTab === "compliance" && (
          <div className="space-y-6">
            {/* Compliance Certifications */}
            <ReportSection title="Compliance Certifications">
              {certStats ? (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                    <StatCard label="Total Certifications" value={certStats.total.toString()} color="blue" />
                    <StatCard label="Expired" value={certStats.expired.toString()} color="red" />
                    <StatCard label="Expiring Soon (30d)" value={certStats.expiringSoon.toString()} color="yellow" />
                  </div>
                  <Link
                    href="/compliance/certifications"
                    className="inline-flex items-center gap-2 text-teal-500 hover:text-teal-400 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 rounded"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    View All Certifications &rarr;
                  </Link>
                </>
              ) : (
                <LoadingPlaceholder />
              )}
            </ReportSection>

            {/* Inspection Summary */}
            <ReportSection title="Inspection Summary">
              {inspectionSummary ? (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                    <StatCard label="Total Inspections" value={inspectionSummary.summary.total.toString()} color="blue" />
                    <StatCard label="Completed" value={inspectionSummary.summary.completed.toString()} color="green" />
                    <StatCard label="Scheduled" value={inspectionSummary.summary.scheduled.toString()} color="yellow" />
                    <StatCard label="Avg Pass Rate" value={`${inspectionSummary.summary.averagePassRate}%`} color={inspectionSummary.summary.averagePassRate >= 90 ? "green" : "yellow"} />
                    <StatCard label="Failed Items" value={inspectionSummary.summary.totalFailedItems.toString()} color="red" />
                  </div>
                </>
              ) : (
                <LoadingPlaceholder />
              )}
            </ReportSection>

            {/* Document Expiry */}
            <ReportSection title="Document Expiry (Next 90 Days)">
              {documentExpiry ? (
                <>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <StatCard label="Expired" value={documentExpiry.summary.expired.toString()} color="red" />
                    <StatCard label="Expiring Soon (30d)" value={documentExpiry.summary.expiringSoon.toString()} color="yellow" />
                    <StatCard label="Expiring Later" value={documentExpiry.summary.expiringLater.toString()} color="green" />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
                    <div className="bg-gray-700 p-3 rounded">
                      <p className="text-gray-400">NDIS Plans</p>
                      <p className="text-white font-semibold">{documentExpiry.byType.ndis_plan}</p>
                    </div>
                    <div className="bg-gray-700 p-3 rounded">
                      <p className="text-gray-400">Insurance</p>
                      <p className="text-white font-semibold">{documentExpiry.byType.insurance}</p>
                    </div>
                    <div className="bg-gray-700 p-3 rounded">
                      <p className="text-gray-400">Compliance</p>
                      <p className="text-white font-semibold">{documentExpiry.byType.compliance}</p>
                    </div>
                    <div className="bg-gray-700 p-3 rounded">
                      <p className="text-gray-400">Leases</p>
                      <p className="text-white font-semibold">{documentExpiry.byType.lease}</p>
                    </div>
                    <div className="bg-gray-700 p-3 rounded">
                      <p className="text-gray-400">Service Agreements</p>
                      <p className="text-white font-semibold">{documentExpiry.byType.service_agreement}</p>
                    </div>
                  </div>
                </>
              ) : (
                <LoadingPlaceholder />
              )}
            </ReportSection>

            {/* Participant Plan Status */}
            <ReportSection title="NDIS Plan Status">
              {participantPlanStatus ? (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                    <StatCard label="Total Participants" value={participantPlanStatus.summary.total.toString()} color="blue" />
                    <StatCard label="Expired Plans" value={participantPlanStatus.summary.expired.toString()} color="red" />
                    <StatCard label="Expiring Soon" value={participantPlanStatus.summary.expiringSoon.toString()} color="yellow" />
                    <StatCard label="Active Plans" value={participantPlanStatus.summary.active.toString()} color="green" />
                    <StatCard label="No Plan" value={participantPlanStatus.summary.noPlan.toString()} color="red" />
                  </div>
                  {participantPlanStatus.participants.filter((p) => p.planStatus !== "active").length > 0 && (
                    <div className="overflow-x-auto">
                      <h4 className="text-white font-medium mb-2">Attention Required</h4>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-gray-400 border-b border-gray-700">
                            <th className="text-left py-2">Participant</th>
                            <th className="text-left py-2">Property</th>
                            <th className="text-left py-2">Plan Ends</th>
                            <th className="text-left py-2">Status</th>
                            <th className="text-right py-2">Days</th>
                          </tr>
                        </thead>
                        <tbody>
                          {participantPlanStatus.participants
                            .filter((p) => p.planStatus !== "active")
                            .slice(0, 10)
                            .map((p) => (
                              <tr key={p.participantId} className="border-b border-gray-700/50">
                                <td className="py-2 text-white">{p.participantName}</td>
                                <td className="py-2 text-gray-400">{p.propertyName}</td>
                                <td className="py-2 text-gray-400">{p.planEndDate || "No plan"}</td>
                                <td className="py-2">
                                  <span className={`px-2 py-1 rounded text-xs ${
                                    p.planStatus === "expired" ? "bg-red-600" :
                                    p.planStatus === "expiring_soon" ? "bg-yellow-600" :
                                    p.planStatus === "no_plan" ? "bg-red-600" : "bg-green-600"
                                  }`}>
                                    {p.planStatus.replace("_", " ")}
                                  </span>
                                </td>
                                <td className="py-2 text-right text-white">{p.daysUntilExpiry}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              ) : (
                <LoadingPlaceholder />
              )}
            </ReportSection>

            {/* Preventative Maintenance Compliance */}
            {complianceReport && (
              <ReportSection title="Preventative Maintenance Compliance">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard label="Total Schedules" value={complianceReport.totalSchedules.toString()} color="blue" />
                  <StatCard label="Overdue" value={complianceReport.overdueCount.toString()} color="red" />
                  <StatCard label="Completed (Period)" value={complianceReport.completedInPeriod.toString()} color="green" />
                  <StatCard label="Compliance Rate" value={`${complianceReport.complianceRate}%`} color={complianceReport.complianceRate >= 90 ? "green" : "yellow"} />
                </div>
              </ReportSection>
            )}
          </div>
        )}

        {/* Operational Tab */}
        {activeTab === "operational" && (
          <div className="space-y-6">
            {/* Vacancy Report */}
            <ReportSection title="Vacancy Report">
              {vacancyReport ? (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <StatCard label="Total Dwellings" value={vacancyReport.summary.totalDwellings.toString()} color="blue" />
                    <StatCard label="Fully Occupied" value={vacancyReport.summary.fullyOccupied.toString()} color="green" />
                    <StatCard label="Vacant Spots" value={vacancyReport.summary.totalVacantSpots.toString()} color="yellow" />
                    <StatCard label="Occupancy Rate" value={`${vacancyReport.summary.overallOccupancyRate}%`} color={vacancyReport.summary.overallOccupancyRate >= 90 ? "green" : "yellow"} />
                  </div>
                  <div className="bg-gray-700 p-4 rounded-lg mb-4">
                    <p className="text-gray-400 text-sm">Potential Monthly Revenue Loss</p>
                    <p className="text-2xl font-bold text-red-400">
                      ${vacancyReport.summary.totalPotentialMonthlyLoss.toLocaleString()}
                    </p>
                  </div>
                  {vacancyReport.vacantDwellings.length > 0 && (
                    <div className="overflow-x-auto">
                      <h4 className="text-white font-medium mb-2">Vacant Dwellings</h4>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-gray-400 border-b border-gray-700">
                            <th className="text-left py-2">Dwelling</th>
                            <th className="text-left py-2">Property</th>
                            <th className="text-left py-2">SDA Category</th>
                            <th className="text-center py-2">Occupancy</th>
                            <th className="text-right py-2">Vacant Spots</th>
                          </tr>
                        </thead>
                        <tbody>
                          {vacancyReport.vacantDwellings.map((d) => (
                            <tr key={d.dwellingId} className="border-b border-gray-700/50">
                              <td className="py-2 text-white">{d.dwellingName}</td>
                              <td className="py-2 text-gray-400">{d.propertyName}</td>
                              <td className="py-2 text-gray-400">{d.sdaCategory?.replace("_", " ")}</td>
                              <td className="py-2 text-center text-white">{d.currentOccupancy}/{d.maxParticipants}</td>
                              <td className="py-2 text-right text-yellow-400">{d.vacantSpots}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              ) : (
                <LoadingPlaceholder />
              )}
            </ReportSection>

            {/* Maintenance Overview */}
            <ReportSection title="Maintenance Overview">
              {maintenanceOverview ? (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                    <StatCard label="Total Requests" value={maintenanceOverview.summary.total.toString()} color="blue" />
                    <StatCard label="Open" value={maintenanceOverview.summary.open.toString()} color="yellow" />
                    <StatCard label="Completed" value={maintenanceOverview.summary.completed.toString()} color="green" />
                    <StatCard label="Overdue" value={maintenanceOverview.summary.overdue.toString()} color="red" />
                    <StatCard label="Total Cost" value={`$${maintenanceOverview.summary.totalCost.toLocaleString()}`} color="blue" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-700 p-4 rounded-lg">
                      <h4 className="text-white font-medium mb-3">By Category</h4>
                      <div className="space-y-2 text-sm">
                        {Object.entries(maintenanceOverview.byCategory).map(([cat, count]) => (
                          <div key={cat} className="flex justify-between">
                            <span className="text-gray-400 capitalize">{cat}</span>
                            <span className="text-white">{count as number}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="bg-gray-700 p-4 rounded-lg">
                      <h4 className="text-white font-medium mb-3">By Priority</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-red-400">Urgent</span>
                          <span className="text-white">{maintenanceOverview.byPriority.urgent}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-orange-400">High</span>
                          <span className="text-white">{maintenanceOverview.byPriority.high}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-yellow-400">Medium</span>
                          <span className="text-white">{maintenanceOverview.byPriority.medium}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-green-400">Low</span>
                          <span className="text-white">{maintenanceOverview.byPriority.low}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <LoadingPlaceholder />
              )}
            </ReportSection>

            {/* Incident Summary */}
            <ReportSection title="Incident Summary">
              {incidentSummary ? (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <StatCard label="Total Incidents" value={incidentSummary.summary.total.toString()} color="blue" />
                    <StatCard label="Open" value={incidentSummary.summary.open.toString()} color="yellow" />
                    <StatCard label="Resolved" value={incidentSummary.summary.resolved.toString()} color="green" />
                    <StatCard label="Reported to NDIS" value={incidentSummary.summary.reportedToNdis.toString()} color="blue" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-700 p-4 rounded-lg">
                      <h4 className="text-white font-medium mb-3">By Type</h4>
                      <div className="space-y-2 text-sm">
                        {Object.entries(incidentSummary.byType)
                          .filter(([, count]) => (count as number) > 0)
                          .map(([type, count]) => (
                            <div key={type} className="flex justify-between">
                              <span className="text-gray-400 capitalize">{type.replace("_", " ")}</span>
                              <span className="text-white">{count as number}</span>
                            </div>
                          ))}
                        {Object.values(incidentSummary.byType).every((c) => c === 0) && (
                          <p className="text-gray-400">No incidents</p>
                        )}
                      </div>
                    </div>
                    <div className="bg-gray-700 p-4 rounded-lg">
                      <h4 className="text-white font-medium mb-3">By Severity</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-red-400">Critical</span>
                          <span className="text-white">{incidentSummary.bySeverity.critical}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-orange-400">Major</span>
                          <span className="text-white">{incidentSummary.bySeverity.major}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-yellow-400">Moderate</span>
                          <span className="text-white">{incidentSummary.bySeverity.moderate}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-green-400">Minor</span>
                          <span className="text-white">{incidentSummary.bySeverity.minor}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <LoadingPlaceholder />
              )}
            </ReportSection>

            {/* Contractor Performance */}
            {contractorPerformance && contractorPerformance.length > 0 && (
              <ReportSection title="Contractor Performance">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-400 border-b border-gray-700">
                        <th className="text-left py-2">Contractor</th>
                        <th className="text-center py-2">Completed</th>
                        <th className="text-right py-2">Total Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contractorPerformance.map((c) => (
                        <tr key={c.name} className="border-b border-gray-700/50">
                          <td className="py-2 text-white">{c.name}</td>
                          <td className="py-2 text-center text-gray-400">{c.completed}</td>
                          <td className="py-2 text-right text-green-400">${c.totalCost.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </ReportSection>
            )}
          </div>
        )}

        {/* Owner Reports Tab */}
        {activeTab === "owner" && (
          <div className="space-y-6">
            <ReportSection title="Owner Statement / Folio Summary">
              {ownerStatement && ownerStatement.length > 0 ? (
                <>
                  <div className="flex justify-end mb-4">
                    <button
                      onClick={exportOwnerStatementPDF}
                      className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-sm"
                    >
                      Export to PDF
                    </button>
                  </div>
                  {ownerStatement.map((property) => (
                    <div key={property?.propertyId} className="bg-gray-700 rounded-lg p-4 mb-4">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="text-white font-medium">{property?.propertyName}</h4>
                          <p className="text-gray-400 text-sm">{property?.address}</p>
                        </div>
                        {property?.owner && (
                          <div className="text-right text-sm">
                            <p className="text-gray-400">Owner: {property.owner.name}</p>
                            {property.owner.bankAccountName && (
                              <p className="text-gray-400">
                                {property.owner.bankAccountName} | BSB: {property.owner.bankBsb}
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-gray-400 border-b border-gray-600">
                              <th className="text-left py-2">Dwelling</th>
                              <th className="text-left py-2">Participant</th>
                              <th className="text-right py-2">SDA</th>
                              <th className="text-right py-2">RRC</th>
                              <th className="text-right py-2">Total</th>
                              <th className="text-right py-2">Fee %</th>
                              <th className="text-right py-2">Fee</th>
                              <th className="text-right py-2">Net</th>
                            </tr>
                          </thead>
                          <tbody>
                            {property?.dwellings.map((dwelling) =>
                              dwelling.participants.map((p) =>
                                p ? (
                                  <tr key={p.participantId} className="border-b border-gray-600/50">
                                    <td className="py-2 text-white">{dwelling.dwellingName}</td>
                                    <td className="py-2 text-gray-300">{p.participantName}</td>
                                    <td className="py-2 text-right text-gray-300">${p.monthlySda.toLocaleString()}</td>
                                    <td className="py-2 text-right text-gray-300">${p.monthlyRrc.toLocaleString()}</td>
                                    <td className="py-2 text-right text-white">${p.totalRevenue.toLocaleString()}</td>
                                    <td className="py-2 text-right text-gray-400">{p.managementFeePercent}%</td>
                                    <td className="py-2 text-right text-red-400">-${p.managementFee.toLocaleString()}</td>
                                    <td className="py-2 text-right text-green-400 font-medium">${p.netToOwner.toLocaleString()}</td>
                                  </tr>
                                ) : null
                              )
                            )}
                          </tbody>
                        </table>
                      </div>

                      <div className="flex justify-end gap-8 mt-4 pt-4 border-t border-gray-600">
                        <div className="text-right">
                          <p className="text-gray-400 text-sm">Total Monthly Revenue</p>
                          <p className="text-white font-semibold">${property?.totalMonthlyRevenue.toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-gray-400 text-sm">Net to Owner</p>
                          <p className="text-green-400 font-bold text-lg">${property?.totalMonthlyNetToOwner.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              ) : ownerStatement === undefined ? (
                <LoadingPlaceholder />
              ) : (
                <p className="text-gray-400">Select a date range to generate owner statements</p>
              )}
            </ReportSection>
          </div>
        )}
      </main>
    </div>
  );
}

function ReportSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
      {children}
    </div>
  );
}

function StatCard({
  label,
  value,
  subtitle,
  color,
}: {
  label: string;
  value: string;
  subtitle?: string;
  color: "blue" | "green" | "yellow" | "red";
}) {
  const colorClasses = {
    blue: "text-teal-500",
    green: "text-green-400",
    yellow: "text-yellow-400",
    red: "text-red-400",
  };

  return (
    <div className="bg-gray-700 rounded-lg p-4">
      <p className="text-gray-400 text-sm mb-2">{label}</p>
      <p className={`text-2xl font-bold ${colorClasses[color]}`}>{value}</p>
      {subtitle && <p className="text-gray-400 text-sm mt-1">{subtitle}</p>}
    </div>
  );
}

function LoadingPlaceholder() {
  return (
    <div className="animate-pulse">
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-gray-700 rounded-lg p-4 h-20"></div>
        ))}
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
