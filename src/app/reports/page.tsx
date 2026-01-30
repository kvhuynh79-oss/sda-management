"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function ReportsPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ role: string } | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const complianceReport = useQuery(
    api.reports.getComplianceReport,
    startDate && endDate ? { startDate, endDate } : {}
  );
  const costAnalysis = useQuery(
    api.reports.getCostAnalysis,
    startDate && endDate ? { startDate, endDate } : {}
  );
  const contractorPerformance = useQuery(api.reports.getContractorPerformance);

  useEffect(() => {
    const storedUser = localStorage.getItem("sda_user");
    if (!storedUser) {
      router.push("/login");
      return;
    }
    setUser(JSON.parse(storedUser));

    // Set default date range to current year
    const today = new Date();
    const yearStart = new Date(today.getFullYear(), 0, 1);
    setStartDate(yearStart.toISOString().split("T")[0]);
    setEndDate(today.toISOString().split("T")[0]);
  }, [router]);

  if (!user) {
    return <LoadingScreen />;
  }

  // CSV Export Function
  const exportToCSV = () => {
    if (!complianceReport || !costAnalysis || !contractorPerformance) {
      alert("Please wait for data to load");
      return;
    }

    // Build CSV content
    let csvContent = "Better Living Solutions - Reports Export\n\n";

    // Compliance Report Section
    csvContent += "COMPLIANCE REPORT\n";
    csvContent += `Date Range,${startDate} to ${endDate}\n\n`;
    csvContent += "Metric,Value\n";
    csvContent += `Total Schedules,${complianceReport.totalSchedules}\n`;
    csvContent += `Overdue Count,${complianceReport.overdueCount}\n`;
    csvContent += `Completed in Period,${complianceReport.completedInPeriod}\n`;
    csvContent += `Compliance Rate,${complianceReport.complianceRate}%\n\n`;

    csvContent += "Category,Total,Overdue\n";
    Object.entries(complianceReport.byCategory).forEach(([category, data]) => {
      csvContent += `${category},${data.total},${data.overdue}\n`;
    });

    // Cost Analysis Section
    csvContent += "\n\nCOST ANALYSIS\n";
    csvContent += "Metric,Value\n";
    csvContent += `Actual Cost (Period),$${costAnalysis.actualCostInPeriod.toLocaleString()}\n`;
    csvContent += `Projected Cost (30 Days),$${costAnalysis.projectedCost30Days.toLocaleString()}\n`;
    csvContent += `Projected Annual Cost,$${costAnalysis.projectedAnnualCost.toLocaleString()}\n\n`;

    csvContent += "Category,Estimated Cost\n";
    Object.entries(costAnalysis.byCategory).forEach(([category, cost]) => {
      csvContent += `${category},$${(cost as number).toLocaleString()}\n`;
    });

    // Contractor Performance Section
    csvContent += "\n\nCONTRACTOR PERFORMANCE\n";
    csvContent += "Contractor,Completed Tasks,Total Cost,Tasks\n";
    contractorPerformance.forEach((contractor) => {
      csvContent += `${contractor.name},${contractor.completed},$${contractor.totalCost.toLocaleString()},"${contractor.tasks.join(", ")}"\n`;
    });

    // Create and download CSV file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `sda-reports-${startDate}-to-${endDate}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // PDF Export Function
  const exportToPDF = () => {
    if (!complianceReport || !costAnalysis || !contractorPerformance) {
      alert("Please wait for data to load");
      return;
    }

    const doc = new jsPDF();

    // Title
    doc.setFontSize(20);
    doc.text("Better Living Solutions - Reports", 14, 20);
    doc.setFontSize(12);
    doc.text(`Date Range: ${startDate} to ${endDate}`, 14, 28);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 34);

    let yPos = 45;

    // Compliance Report Section
    doc.setFontSize(16);
    doc.text("Compliance Report", 14, yPos);
    yPos += 8;

    // Compliance Summary Table
    autoTable(doc, {
      startY: yPos,
      head: [["Metric", "Value"]],
      body: [
        ["Total Schedules", complianceReport.totalSchedules.toString()],
        ["Overdue Count", complianceReport.overdueCount.toString()],
        ["Completed in Period", complianceReport.completedInPeriod.toString()],
        ["Compliance Rate", `${complianceReport.complianceRate}%`],
      ],
      theme: "grid",
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;

    // Compliance by Category Table
    doc.setFontSize(14);
    doc.text("Compliance by Category", 14, yPos);
    yPos += 6;

    autoTable(doc, {
      startY: yPos,
      head: [["Category", "Total", "Overdue"]],
      body: Object.entries(complianceReport.byCategory).map(([category, data]) => [
        category.charAt(0).toUpperCase() + category.slice(1),
        data.total.toString(),
        data.overdue.toString(),
      ]),
      theme: "grid",
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    // Cost Analysis Section
    doc.setFontSize(16);
    doc.text("Cost Analysis", 14, yPos);
    yPos += 8;

    autoTable(doc, {
      startY: yPos,
      head: [["Metric", "Value"]],
      body: [
        ["Actual Cost (Period)", `$${costAnalysis.actualCostInPeriod.toLocaleString()}`],
        ["Projected Cost (30 Days)", `$${costAnalysis.projectedCost30Days.toLocaleString()}`],
        ["Projected Annual Cost", `$${costAnalysis.projectedAnnualCost.toLocaleString()}`],
      ],
      theme: "grid",
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;

    // Cost by Category Table
    doc.setFontSize(14);
    doc.text("Cost by Category", 14, yPos);
    yPos += 6;

    autoTable(doc, {
      startY: yPos,
      head: [["Category", "Estimated Cost"]],
      body: Object.entries(costAnalysis.byCategory).map(([category, cost]) => [
        category.charAt(0).toUpperCase() + category.slice(1),
        `$${(cost as number).toLocaleString()}`,
      ]),
      theme: "grid",
    });

    // Add new page for contractor performance if needed
    if ((doc as any).lastAutoTable.finalY > 250) {
      doc.addPage();
      yPos = 20;
    } else {
      yPos = (doc as any).lastAutoTable.finalY + 15;
    }

    // Contractor Performance Section
    doc.setFontSize(16);
    doc.text("Contractor Performance", 14, yPos);
    yPos += 8;

    autoTable(doc, {
      startY: yPos,
      head: [["Contractor", "Completed", "Total Cost", "Sample Tasks"]],
      body: contractorPerformance.map((contractor) => [
        contractor.name,
        contractor.completed.toString(),
        `$${contractor.totalCost.toLocaleString()}`,
        contractor.tasks.slice(0, 2).join(", ") + (contractor.tasks.length > 2 ? "..." : ""),
      ]),
      theme: "grid",
      columnStyles: {
        3: { cellWidth: 60 },
      },
    });

    // Save the PDF
    doc.save(`sda-reports-${startDate}-to-${endDate}.pdf`);
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <Header currentPage="reports" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white">Reports & Analytics</h2>
          <p className="text-gray-400 mt-1">
            Compliance tracking, cost analysis, and performance metrics
          </p>
        </div>

        {/* Date Range Filter */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Compliance Report */}
        {complianceReport && (
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Compliance Report
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <StatCard
                label="Total Schedules"
                value={complianceReport.totalSchedules.toString()}
                color="blue"
              />
              <StatCard
                label="Overdue"
                value={complianceReport.overdueCount.toString()}
                color="red"
              />
              <StatCard
                label="Completed (Period)"
                value={complianceReport.completedInPeriod.toString()}
                color="green"
              />
              <StatCard
                label="Compliance Rate"
                value={`${complianceReport.complianceRate}%`}
                color={
                  complianceReport.complianceRate >= 90
                    ? "green"
                    : complianceReport.complianceRate >= 75
                    ? "yellow"
                    : "red"
                }
              />
            </div>

            <h4 className="text-md font-semibold text-white mb-3">
              Compliance by Category
            </h4>
            <div className="space-y-2">
              {Object.entries(complianceReport.byCategory).map(
                ([category, data]) => (
                  <div
                    key={category}
                    className="flex justify-between items-center p-3 bg-gray-700 rounded"
                  >
                    <span className="text-white capitalize">{category}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-gray-400">
                        {data.total} total
                      </span>
                      <span
                        className={`px-2 py-1 rounded text-sm ${
                          data.overdue > 0
                            ? "bg-red-600 text-white"
                            : "bg-green-600 text-white"
                        }`}
                      >
                        {data.overdue} overdue
                      </span>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {/* Cost Analysis */}
        {costAnalysis && (
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Cost Analysis
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <StatCard
                label="Actual Cost (Period)"
                value={`$${costAnalysis.actualCostInPeriod.toLocaleString()}`}
                subtitle={`${costAnalysis.completedInPeriod} tasks`}
                color="blue"
              />
              <StatCard
                label="Projected (30 Days)"
                value={`$${costAnalysis.projectedCost30Days.toLocaleString()}`}
                subtitle={`${costAnalysis.upcomingIn30Days} tasks`}
                color="yellow"
              />
              <StatCard
                label="Projected (Annual)"
                value={`$${costAnalysis.projectedAnnualCost.toLocaleString()}`}
                subtitle="All active schedules"
                color="green"
              />
            </div>

            <h4 className="text-md font-semibold text-white mb-3">
              Estimated Cost by Category
            </h4>
            <div className="space-y-2">
              {Object.entries(costAnalysis.byCategory).map(
                ([category, cost]) => (
                  <div
                    key={category}
                    className="flex justify-between items-center p-3 bg-gray-700 rounded"
                  >
                    <span className="text-white capitalize">{category}</span>
                    <span className="text-green-400 font-semibold">
                      ${(cost as number).toLocaleString()}
                    </span>
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {/* Contractor Performance */}
        {contractorPerformance && contractorPerformance.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Contractor Performance
            </h3>
            <div className="space-y-3">
              {contractorPerformance.map((contractor) => (
                <div
                  key={contractor.name}
                  className="p-4 bg-gray-700 rounded-lg"
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-white font-medium">
                      {contractor.name}
                    </span>
                    <div className="flex items-center gap-4">
                      <span className="text-gray-400">
                        {contractor.completed} completed
                      </span>
                      <span className="text-green-400 font-semibold">
                        ${contractor.totalCost.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="text-sm text-gray-400">
                    Tasks: {contractor.tasks.join(", ")}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Export Actions */}
        <div className="flex gap-4">
          <button
            onClick={exportToPDF}
            disabled={!complianceReport || !costAnalysis || !contractorPerformance}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            Export to PDF
          </button>
          <button
            onClick={exportToCSV}
            disabled={!complianceReport || !costAnalysis || !contractorPerformance}
            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            Export to CSV
          </button>
        </div>
      </main>
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
    blue: "text-blue-400",
    green: "text-green-400",
    yellow: "text-yellow-400",
    red: "text-red-400",
  };

  return (
    <div className="bg-gray-700 rounded-lg p-4">
      <p className="text-gray-400 text-sm mb-2">{label}</p>
      <p className={`text-2xl font-bold ${colorClasses[color]}`}>{value}</p>
      {subtitle && <p className="text-gray-500 text-sm mt-1">{subtitle}</p>}
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
