import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface ComplaintData {
  _id: string;
  referenceNumber?: string;
  complainantType: string;
  complainantName?: string;
  category: string;
  severity: string;
  status: string;
  source?: string;
  receivedDate: string;
  acknowledgedDate?: string;
  acknowledgmentMethod?: string;
  resolutionDate?: string;
  resolutionDescription?: string;
  resolutionOutcome?: string;
  complainantSatisfied?: boolean;
  escalatedToNdisCommission?: boolean;
  escalationDate?: string;
  systemicIssueIdentified?: boolean;
  correctiveActionsTaken?: string;
  description: string;
  daysOpen: number;
  daysToAcknowledge: number | null;
  daysToResolve: number | null;
  participant?: { firstName: string; lastName: string } | null;
  property?: { addressLine1?: string; suburb?: string } | null;
  receivedByUser?: { firstName: string; lastName: string } | null;
  assignedToUser?: { firstName: string; lastName: string } | null;
}

interface ComplaintStats {
  total: number;
  byStatus: Record<string, number>;
  bySeverity: Record<string, number>;
  overdueAcknowledgments: number;
  escalatedToCommission: number;
}

interface ChainOfCustodyEntry {
  timestamp: number;
  userName: string;
  action: string;
  entityName?: string;
  metadata?: string;
}

function formatLabel(str: string): string {
  return str.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return dateStr;
  }
}

const SEVERITY_COLORS: Record<string, [number, number, number]> = {
  critical: [239, 68, 68],
  high: [249, 115, 22],
  medium: [234, 179, 8],
  low: [107, 114, 128],
};

const STATUS_COLORS: Record<string, [number, number, number]> = {
  received: [234, 179, 8],
  acknowledged: [59, 130, 246],
  under_investigation: [139, 92, 246],
  resolved: [34, 197, 94],
  closed: [107, 114, 128],
  escalated: [239, 68, 68],
};

export function generateComplaintsRegisterPdf(
  complaints: ComplaintData[],
  stats: ComplaintStats,
  chainOfCustody?: Record<string, ChainOfCustodyEntry[]>
): void {
  const doc = new jsPDF({ orientation: "landscape" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let yPos = margin;

  // ==================== COVER PAGE ====================
  // Header bar
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(0, 0, pageWidth, 45, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("Complaints Register", margin, 25);

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text("Better Living Solutions - NDIS Compliance Document", margin, 38);

  // Generation info
  yPos = 60;
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleDateString("en-AU", { dateStyle: "full" })} at ${new Date().toLocaleTimeString("en-AU", { timeStyle: "short" })}`, margin, yPos);
  doc.text(`Total Records: ${stats.total}`, margin, yPos + 7);

  // Summary stats box
  yPos = 85;
  doc.setFillColor(241, 245, 249); // slate-100
  doc.roundedRect(margin, yPos, contentWidth, 55, 3, 3, "F");

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Summary", margin + 8, yPos + 15);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  const summaryCol1X = margin + 8;
  const summaryCol2X = margin + contentWidth / 3;
  const summaryCol3X = margin + (contentWidth * 2) / 3;
  const summaryRowY = yPos + 28;

  // Column 1 - Status
  doc.setFont("helvetica", "bold");
  doc.text("By Status", summaryCol1X, summaryRowY);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text(`Received: ${stats.byStatus.received || 0}`, summaryCol1X, summaryRowY + 7);
  doc.text(`Acknowledged: ${stats.byStatus.acknowledged || 0}`, summaryCol1X, summaryRowY + 14);
  doc.text(`Under Investigation: ${stats.byStatus.under_investigation || 0}`, summaryCol1X, summaryRowY + 21);

  // Column 2 - More Status
  doc.setTextColor(30, 41, 59);
  doc.setFont("helvetica", "bold");
  doc.text("Resolution", summaryCol2X, summaryRowY);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text(`Resolved: ${stats.byStatus.resolved || 0}`, summaryCol2X, summaryRowY + 7);
  doc.text(`Closed: ${stats.byStatus.closed || 0}`, summaryCol2X, summaryRowY + 14);
  doc.text(`Escalated: ${stats.byStatus.escalated || 0}`, summaryCol2X, summaryRowY + 21);

  // Column 3 - Severity + Alerts
  doc.setTextColor(30, 41, 59);
  doc.setFont("helvetica", "bold");
  doc.text("Alerts", summaryCol3X, summaryRowY);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text(`Overdue Ack: ${stats.overdueAcknowledgments}`, summaryCol3X, summaryRowY + 7);
  doc.text(`Escalated to Commission: ${stats.escalatedToCommission}`, summaryCol3X, summaryRowY + 14);

  // Calculate average resolution time
  const resolvedComplaints = complaints.filter((c) => c.daysToResolve !== null);
  const avgResolution = resolvedComplaints.length > 0
    ? Math.round(resolvedComplaints.reduce((sum, c) => sum + (c.daysToResolve || 0), 0) / resolvedComplaints.length)
    : 0;
  doc.text(`Avg Resolution: ${avgResolution} days`, summaryCol3X, summaryRowY + 21);

  // ==================== REGISTER TABLE ====================
  doc.addPage();

  // Header bar
  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, pageWidth, 25, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Complaints Register - Detailed Records", margin, 17);

  const tableBody = complaints.map((c) => [
    c.referenceNumber || "—",
    formatDate(c.receivedDate),
    formatLabel(c.complainantType),
    c.complainantName || "Anonymous",
    formatLabel(c.category),
    formatLabel(c.severity),
    formatLabel(c.status),
    c.acknowledgedDate ? formatDate(c.acknowledgedDate) : "—",
    c.daysToAcknowledge !== null ? `${c.daysToAcknowledge}d` : "—",
    c.resolutionDate ? formatDate(c.resolutionDate) : "—",
    c.daysToResolve !== null ? `${c.daysToResolve}d` : "—",
    c.resolutionOutcome ? formatLabel(c.resolutionOutcome) : "—",
  ]);

  autoTable(doc, {
    startY: 35,
    head: [["Ref #", "Received", "Type", "Complainant", "Category", "Severity", "Status", "Ack Date", "Days to Ack", "Resolved", "Days to Resolve", "Outcome"]],
    body: tableBody,
    theme: "grid",
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 7,
      fontStyle: "bold",
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [51, 65, 85],
    },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 18 },
      2: { cellWidth: 20 },
      3: { cellWidth: 25 },
      4: { cellWidth: 22 },
      5: { cellWidth: 16 },
      6: { cellWidth: 22 },
      7: { cellWidth: 18 },
      8: { cellWidth: 16 },
      9: { cellWidth: 18 },
      10: { cellWidth: 20 },
      11: { cellWidth: 20 },
    },
    didParseCell: (data) => {
      // Color-code severity column
      if (data.section === "body" && data.column.index === 5) {
        const severity = complaints[data.row.index]?.severity;
        if (severity && SEVERITY_COLORS[severity]) {
          data.cell.styles.textColor = SEVERITY_COLORS[severity];
          data.cell.styles.fontStyle = "bold";
        }
      }
      // Color-code status column
      if (data.section === "body" && data.column.index === 6) {
        const status = complaints[data.row.index]?.status;
        if (status && STATUS_COLORS[status]) {
          data.cell.styles.textColor = STATUS_COLORS[status];
          data.cell.styles.fontStyle = "bold";
        }
      }
    },
    margin: { left: margin, right: margin },
  });

  // ==================== CHAIN OF CUSTODY (if provided) ====================
  if (chainOfCustody && Object.keys(chainOfCustody).length > 0) {
    doc.addPage();

    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, pageWidth, 25, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Chain of Custody - Audit Trail", margin, 17);

    let custodyY = 35;

    for (const [complaintId, entries] of Object.entries(chainOfCustody)) {
      if (custodyY > pageHeight - 60) {
        doc.addPage();
        custodyY = margin;
      }

      const complaint = complaints.find((c) => c._id === complaintId);
      const refLabel = complaint?.referenceNumber || complaintId;

      doc.setTextColor(30, 41, 59);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(`Complaint: ${refLabel}`, margin, custodyY);
      custodyY += 5;

      const custodyBody = entries.map((entry) => [
        new Date(entry.timestamp).toLocaleString("en-AU", { dateStyle: "short", timeStyle: "short" }),
        entry.userName,
        formatLabel(entry.action),
        entry.entityName || "—",
      ]);

      autoTable(doc, {
        startY: custodyY,
        head: [["Timestamp", "User", "Action", "Details"]],
        body: custodyBody,
        theme: "grid",
        headStyles: {
          fillColor: [71, 85, 105],
          textColor: [255, 255, 255],
          fontSize: 8,
        },
        bodyStyles: { fontSize: 8, textColor: [51, 65, 85] },
        columnStyles: {
          0: { cellWidth: 40 },
          1: { cellWidth: 40 },
          2: { cellWidth: 30 },
          3: { cellWidth: contentWidth - 110 },
        },
        margin: { left: margin, right: margin },
      });

      // Get the final Y position after the table
      custodyY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
    }
  }

  // ==================== FOOTER ON ALL PAGES ====================
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFillColor(241, 245, 249);
    doc.rect(0, pageHeight - 15, pageWidth, 15, "F");
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8);
    doc.text(
      `Generated by MySDAManager for NDIS Audit Purposes | Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 6,
      { align: "center" }
    );
  }

  // Save
  const dateStr = new Date().toISOString().split("T")[0];
  doc.save(`Complaints_Register_${dateStr}.pdf`);
}
