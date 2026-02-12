import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ============================================================
// TYPE DEFINITIONS
// ============================================================

interface CertificationRow {
  certificationType: string;
  status: string; // "current" | "expiring_soon" | "expired" | "pending_renewal"
  expiryDate: string;
  certifyingBody?: string | null;
  lastAuditDate?: string | null;
  propertyName?: string | null;
  scope?: string; // "org_wide" | "property"
}

interface IncidentRow {
  incidentDate: string;
  incidentType: string;
  severity: string;
  title: string;
  isNdisReportable?: boolean;
  ndisCommissionNotified?: boolean;
  ndisCommissionNotificationDate?: string | null;
  ndisNotificationTimeframe?: string | null; // "24_hours" | "5_business_days"
  reportedToNdis?: boolean;
  status: string;
  createdAt: number;
  resolvedAt?: number | null;
}

interface ComplaintRow {
  referenceNumber?: string;
  receivedDate: string;
  source?: string;
  status: string;
  severity: string;
  acknowledgedDate?: string | null;
  resolutionDate?: string | null;
  escalatedToNdisCommission?: boolean;
  category: string;
}

interface ParticipantPlanRow {
  participantName: string;
  ndisNumber?: string | null;
  planEndDate?: string | null;
  planStatus: string; // "active" | "expiring_soon" | "expired" | "no_plan"
  daysUntilExpiry: number;
  propertyName?: string | null;
}

interface ExpiringDocumentRow {
  name: string;
  documentType: string;
  entityName?: string | null; // property or participant name
  expiryDate: string;
  daysUntilExpiry: number;
  isExpired: boolean;
}

interface AuditLogIntegrity {
  totalLogs: number;
  verifiedLogs: number;
  unverifiedLogs: number;
  integrityPercentage: string;
  lastVerificationTimestamp?: number | null;
}

export interface AuditComplianceData {
  organizationName: string;
  startDate: string;
  endDate: string;
  totalProperties: number;
  totalParticipants: number;
  totalDwellings: number;
  certifications: CertificationRow[];
  incidents: IncidentRow[];
  complaints: ComplaintRow[];
  participantPlans: ParticipantPlanRow[];
  expiringDocuments: ExpiringDocumentRow[];
  auditLogIntegrity: AuditLogIntegrity | null;
}

// ============================================================
// HELPERS
// ============================================================

const TEAL: [number, number, number] = [13, 148, 136]; // #0d9488
const SLATE_800: [number, number, number] = [30, 41, 59];
const WHITE: [number, number, number] = [255, 255, 255];
const GRAY_100: [number, number, number] = [241, 245, 249];
const GRAY_400: [number, number, number] = [156, 163, 175];
const GREEN: [number, number, number] = [34, 197, 94];
const YELLOW: [number, number, number] = [234, 179, 8];
const RED: [number, number, number] = [239, 68, 68];
const ORANGE: [number, number, number] = [249, 115, 22];

function formatDate(dateStr: string): string {
  if (!dateStr) return "\u2014";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return dateStr;
  }
}

function formatLabel(str: string): string {
  return str
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function maskNdisNumber(ndis?: string | null): string {
  if (!ndis) return "\u2014";
  // If the value is encrypted, show placeholder
  if (ndis.startsWith("enc:") || ndis === "[encrypted]") return "****";
  if (ndis.length <= 4) return ndis;
  return "\u2022\u2022\u2022\u2022" + ndis.slice(-4);
}

function getScoreColor(score: number): [number, number, number] {
  if (score >= 90) return GREEN;
  if (score >= 70) return YELLOW;
  return RED;
}

function getStatusColor(status: string): [number, number, number] {
  switch (status) {
    case "current":
    case "active":
    case "resolved":
    case "closed":
      return GREEN;
    case "expiring_soon":
      return YELLOW;
    case "expired":
    case "no_plan":
      return RED;
    case "pending_renewal":
    case "received":
    case "acknowledged":
      return ORANGE;
    case "under_investigation":
    case "escalated":
      return [139, 92, 246]; // purple
    default:
      return GRAY_400;
  }
}

function generatedTimestamp(): string {
  return new Date().toLocaleString("en-AU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

function calcComplianceScore(data: AuditComplianceData): number {
  let totalChecks = 0;
  let passedChecks = 0;

  // Certification score (weight: 40%)
  const certTotal = data.certifications.length;
  const certCurrent = data.certifications.filter((c) => c.status === "current").length;
  if (certTotal > 0) {
    totalChecks += 40;
    passedChecks += (certCurrent / certTotal) * 40;
  }

  // Incident compliance score (weight: 20%) - how many reportable incidents were properly reported
  const reportableIncidents = data.incidents.filter((i) => i.isNdisReportable);
  const reportedOnTime = reportableIncidents.filter(
    (i) => i.ndisCommissionNotified || i.reportedToNdis
  );
  if (reportableIncidents.length > 0) {
    totalChecks += 20;
    passedChecks += (reportedOnTime.length / reportableIncidents.length) * 20;
  } else {
    // No reportable incidents is good
    totalChecks += 20;
    passedChecks += 20;
  }

  // Complaints handling score (weight: 20%)
  const totalComplaints = data.complaints.length;
  if (totalComplaints > 0) {
    const acknowledged = data.complaints.filter((c) => c.acknowledgedDate).length;
    totalChecks += 20;
    passedChecks += (acknowledged / totalComplaints) * 20;
  } else {
    totalChecks += 20;
    passedChecks += 20;
  }

  // Participant plan coverage (weight: 20%)
  const totalPlans = data.participantPlans.length;
  const activePlans = data.participantPlans.filter(
    (p) => p.planStatus === "active" || p.planStatus === "expiring_soon"
  ).length;
  if (totalPlans > 0) {
    totalChecks += 20;
    passedChecks += (activePlans / totalPlans) * 20;
  } else {
    totalChecks += 20;
    passedChecks += 20;
  }

  return totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 0;
}

// ============================================================
// MAIN PDF GENERATOR
// ============================================================

export function generateAuditCompliancePdf(data: AuditComplianceData): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth(); // 210
  const pageHeight = doc.internal.pageSize.getHeight(); // 297
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  const timestamp = generatedTimestamp();
  const complianceScore = calcComplianceScore(data);

  // ================================================================
  // SECTION 1: COVER PAGE
  // ================================================================

  // Teal header bar
  doc.setFillColor(...TEAL);
  doc.rect(0, 0, pageWidth, 55, "F");

  // Organization name
  doc.setTextColor(...WHITE);
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text(data.organizationName, pageWidth / 2, 22, { align: "center" });

  // Title
  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.text("Audit-Ready Compliance Pack", pageWidth / 2, 35, { align: "center" });

  // Date range
  doc.setFontSize(10);
  doc.text(
    `Report Period: ${formatDate(data.startDate)} to ${formatDate(data.endDate)}`,
    pageWidth / 2,
    47,
    { align: "center" }
  );

  // CONFIDENTIAL watermark (diagonal, light)
  doc.setTextColor(200, 200, 200);
  doc.setFontSize(60);
  doc.setFont("helvetica", "bold");
  // Save and apply rotation
  const centerX = pageWidth / 2;
  const centerY = pageHeight / 2;
  doc.text("CONFIDENTIAL", centerX, centerY, {
    align: "center",
    angle: 45,
  });

  // Compliance score box
  let yPos = 80;
  const scoreColor = getScoreColor(complianceScore);

  doc.setFillColor(...GRAY_100);
  doc.roundedRect(margin, yPos, contentWidth, 50, 4, 4, "F");

  doc.setTextColor(...SLATE_800);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Overall Compliance Score", pageWidth / 2, yPos + 12, { align: "center" });

  // Large score number
  doc.setTextColor(...scoreColor);
  doc.setFontSize(36);
  doc.setFont("helvetica", "bold");
  doc.text(`${complianceScore}%`, pageWidth / 2, yPos + 35, { align: "center" });

  // Score label
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  const scoreLabel =
    complianceScore >= 90
      ? "Excellent - Audit Ready"
      : complianceScore >= 70
        ? "Good - Minor Improvements Needed"
        : "Attention Required - Significant Gaps";
  doc.text(scoreLabel, pageWidth / 2, yPos + 45, { align: "center" });

  // Summary counts
  yPos = 145;
  doc.setFillColor(...GRAY_100);
  doc.roundedRect(margin, yPos, contentWidth, 35, 4, 4, "F");

  doc.setTextColor(...SLATE_800);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Portfolio Overview", margin + 8, yPos + 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  const col1 = margin + 8;
  const col2 = margin + contentWidth / 3;
  const col3 = margin + (contentWidth * 2) / 3;

  doc.text(`Properties: ${data.totalProperties}`, col1, yPos + 24);
  doc.text(`Participants: ${data.totalParticipants}`, col2, yPos + 24);
  doc.text(`Dwellings: ${data.totalDwellings}`, col3, yPos + 24);

  // Generated timestamp
  yPos = 195;
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(9);
  doc.text(`Generated: ${timestamp}`, pageWidth / 2, yPos, { align: "center" });

  // Table of contents
  yPos = 215;
  doc.setTextColor(...SLATE_800);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Contents", margin, yPos);
  yPos += 8;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  const tocItems = [
    "1. Compliance Certifications",
    "2. NDIS Incident Report",
    "3. Complaints Summary",
    "4. Participant Plan Status",
    "5. Document Expiry Report",
    "6. Audit Log Integrity",
  ];
  for (const item of tocItems) {
    doc.text(item, margin + 4, yPos);
    yPos += 6;
  }

  // ================================================================
  // SECTION 2: CERTIFICATIONS TABLE
  // ================================================================
  doc.addPage();
  yPos = margin;

  // Section header
  yPos = drawSectionHeader(doc, "1. Compliance Certifications", yPos, pageWidth, margin);

  const certTypeNames: Record<string, string> = {
    sda_registration: "SDA Registration",
    ndis_practice_standards: "NDIS Practice Standards",
    worker_screening: "Worker Screening",
    fire_safety: "Fire Safety Certificate",
    building_compliance: "Building Compliance",
    sda_design_standard: "SDA Design Standard",
  };

  const certBody = data.certifications.map((cert) => [
    certTypeNames[cert.certificationType] || formatLabel(cert.certificationType),
    formatLabel(cert.status),
    formatDate(cert.expiryDate),
    cert.certifyingBody || "\u2014",
    cert.lastAuditDate ? formatDate(cert.lastAuditDate) : "\u2014",
  ]);

  // Summary row
  const certCurrent = data.certifications.filter((c) => c.status === "current").length;
  const certTotal = data.certifications.length;

  autoTable(doc, {
    startY: yPos,
    head: [["Certification Type", "Status", "Expiry Date", "Certifying Body", "Last Audit"]],
    body: certBody,
    theme: "grid",
    headStyles: {
      fillColor: TEAL,
      textColor: WHITE,
      fontSize: 8,
      fontStyle: "bold",
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [51, 65, 85],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 42 },
      1: { cellWidth: 28, halign: "center" },
      2: { cellWidth: 28 },
      3: { cellWidth: 40 },
      4: { cellWidth: 28 },
    },
    didParseCell: (hookData) => {
      if (hookData.section === "body" && hookData.column.index === 1) {
        const cert = data.certifications[hookData.row.index];
        if (cert) {
          const color = getStatusColor(cert.status);
          hookData.cell.styles.textColor = color;
          hookData.cell.styles.fontStyle = "bold";
        }
      }
    },
    margin: { left: margin, right: margin },
  });

  yPos = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  // Summary box
  doc.setFillColor(...GRAY_100);
  doc.roundedRect(margin, yPos, contentWidth, 14, 3, 3, "F");
  doc.setTextColor(...SLATE_800);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(
    `Summary: ${certCurrent} of ${certTotal} certifications are current`,
    margin + 6,
    yPos + 9
  );

  if (certCurrent < certTotal) {
    const expired = data.certifications.filter((c) => c.status === "expired").length;
    const expiring = data.certifications.filter((c) => c.status === "expiring_soon").length;
    doc.setTextColor(...RED);
    doc.setFont("helvetica", "normal");
    doc.text(
      `  |  ${expired} expired, ${expiring} expiring soon`,
      margin + 6 + doc.getTextWidth(`Summary: ${certCurrent} of ${certTotal} certifications are current`),
      yPos + 9
    );
  }

  // ================================================================
  // SECTION 3: NDIS INCIDENT REPORT
  // ================================================================
  doc.addPage();
  yPos = margin;
  yPos = drawSectionHeader(doc, "2. NDIS Incident Report", yPos, pageWidth, margin);

  // Filter incidents within date range
  const rangeIncidents = data.incidents.filter((i) => {
    return i.incidentDate >= data.startDate && i.incidentDate <= data.endDate;
  });

  const reportableIncidents = rangeIncidents.filter((i) => i.isNdisReportable);

  // Summary stats
  doc.setFillColor(...GRAY_100);
  doc.roundedRect(margin, yPos, contentWidth, 20, 3, 3, "F");

  doc.setTextColor(...SLATE_800);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");

  const avgResolutionDays = rangeIncidents.length > 0
    ? rangeIncidents
        .filter((i) => i.resolvedAt && i.createdAt)
        .reduce((sum, i) => {
          const days = Math.ceil(((i.resolvedAt || 0) - i.createdAt) / (1000 * 60 * 60 * 24));
          return sum + days;
        }, 0) /
      Math.max(rangeIncidents.filter((i) => i.resolvedAt).length, 1)
    : 0;

  doc.text(`Total Incidents: ${rangeIncidents.length}`, margin + 6, yPos + 8);
  doc.text(`NDIS Reportable: ${reportableIncidents.length}`, margin + 55, yPos + 8);
  doc.text(`Avg Resolution: ${Math.round(avgResolutionDays)} days`, margin + 110, yPos + 8);

  yPos += 26;

  if (rangeIncidents.length > 0) {
    const incidentBody = rangeIncidents.map((inc) => {
      const notified = inc.ndisCommissionNotified || inc.reportedToNdis;

      // Determine if reported within required timeframe
      let reportedWithin24h = "\u2014";
      let fiveDayReport = "\u2014";

      if (inc.isNdisReportable) {
        if (inc.ndisNotificationTimeframe === "24_hours") {
          reportedWithin24h = notified ? "Yes" : "No";
        } else if (inc.ndisNotificationTimeframe === "5_business_days") {
          fiveDayReport = notified ? "Yes" : "No";
        }
        // If timeframe not set, use generic
        if (!inc.ndisNotificationTimeframe && notified) {
          reportedWithin24h = "Yes";
        }
      }

      return [
        formatDate(inc.incidentDate),
        formatLabel(inc.incidentType),
        formatLabel(inc.severity),
        inc.title.length > 35 ? inc.title.substring(0, 33) + "..." : inc.title,
        notified ? "Notified" : inc.isNdisReportable ? "PENDING" : "N/A",
        reportedWithin24h,
        fiveDayReport,
      ];
    });

    autoTable(doc, {
      startY: yPos,
      head: [["Date", "Type", "Severity", "Title", "NDIS Status", "24hr", "5-Day"]],
      body: incidentBody,
      theme: "grid",
      headStyles: {
        fillColor: TEAL,
        textColor: WHITE,
        fontSize: 7,
        fontStyle: "bold",
      },
      bodyStyles: {
        fontSize: 7,
        textColor: [51, 65, 85],
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 28 },
        2: { cellWidth: 18 },
        3: { cellWidth: 50 },
        4: { cellWidth: 22, halign: "center" },
        5: { cellWidth: 16, halign: "center" },
        6: { cellWidth: 16, halign: "center" },
      },
      didParseCell: (hookData) => {
        if (hookData.section === "body") {
          // Severity column
          if (hookData.column.index === 2) {
            const inc = rangeIncidents[hookData.row.index];
            if (inc) {
              const sevColors: Record<string, [number, number, number]> = {
                critical: RED,
                major: ORANGE,
                moderate: YELLOW,
                minor: GREEN,
              };
              hookData.cell.styles.textColor = sevColors[inc.severity] || GRAY_400;
              hookData.cell.styles.fontStyle = "bold";
            }
          }
          // NDIS Status column
          if (hookData.column.index === 4) {
            const cellText = hookData.cell.text.join("");
            if (cellText === "PENDING") {
              hookData.cell.styles.textColor = RED;
              hookData.cell.styles.fontStyle = "bold";
            } else if (cellText === "Notified") {
              hookData.cell.styles.textColor = GREEN;
            }
          }
          // 24hr / 5-Day columns - highlight "No" in red
          if (hookData.column.index === 5 || hookData.column.index === 6) {
            const cellText = hookData.cell.text.join("");
            if (cellText === "No") {
              hookData.cell.styles.textColor = RED;
              hookData.cell.styles.fontStyle = "bold";
            } else if (cellText === "Yes") {
              hookData.cell.styles.textColor = GREEN;
            }
          }
        }
      },
      margin: { left: margin, right: margin },
    });
  } else {
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(9);
    doc.text("No incidents recorded in the selected period.", margin, yPos + 6);
  }

  // ================================================================
  // SECTION 4: COMPLAINTS SUMMARY
  // ================================================================
  doc.addPage();
  yPos = margin;
  yPos = drawSectionHeader(doc, "3. Complaints Summary", yPos, pageWidth, margin);

  // Filter complaints within date range
  const rangeComplaints = data.complaints.filter((c) => {
    return c.receivedDate >= data.startDate && c.receivedDate <= data.endDate;
  });

  // Summary stats
  const resolvedComplaints = rangeComplaints.filter(
    (c) => c.status === "resolved" || c.status === "closed"
  );
  const resolutionRate =
    rangeComplaints.length > 0
      ? Math.round((resolvedComplaints.length / rangeComplaints.length) * 100)
      : 0;

  const complaintsWithAck = rangeComplaints.filter((c) => c.acknowledgedDate);
  const avgAckDays =
    complaintsWithAck.length > 0
      ? Math.round(
          complaintsWithAck.reduce((sum, c) => {
            const received = new Date(c.receivedDate);
            const acked = new Date(c.acknowledgedDate!);
            return sum + Math.ceil((acked.getTime() - received.getTime()) / (1000 * 60 * 60 * 24));
          }, 0) / complaintsWithAck.length
        )
      : 0;

  const avgResolveDays =
    resolvedComplaints.length > 0
      ? Math.round(
          resolvedComplaints
            .filter((c) => c.resolutionDate)
            .reduce((sum, c) => {
              const received = new Date(c.receivedDate);
              const resolved = new Date(c.resolutionDate!);
              return sum + Math.ceil((resolved.getTime() - received.getTime()) / (1000 * 60 * 60 * 24));
            }, 0) / Math.max(resolvedComplaints.filter((c) => c.resolutionDate).length, 1)
        )
      : 0;

  doc.setFillColor(...GRAY_100);
  doc.roundedRect(margin, yPos, contentWidth, 20, 3, 3, "F");

  doc.setTextColor(...SLATE_800);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Total: ${rangeComplaints.length}`, margin + 6, yPos + 8);
  doc.text(`Resolution Rate: ${resolutionRate}%`, margin + 40, yPos + 8);
  doc.text(`Avg Ack: ${avgAckDays}d`, margin + 85, yPos + 8);
  doc.text(`Avg Resolution: ${avgResolveDays}d`, margin + 115, yPos + 8);
  yPos += 26;

  if (rangeComplaints.length > 0) {
    const complaintBody = rangeComplaints.map((c) => {
      const daysToAck = c.acknowledgedDate
        ? Math.ceil(
            (new Date(c.acknowledgedDate).getTime() - new Date(c.receivedDate).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : null;
      const daysToResolve = c.resolutionDate
        ? Math.ceil(
            (new Date(c.resolutionDate).getTime() - new Date(c.receivedDate).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : null;

      return [
        c.referenceNumber || "\u2014",
        formatDate(c.receivedDate),
        c.source ? formatLabel(c.source) : "\u2014",
        formatLabel(c.status),
        formatLabel(c.severity),
        daysToAck !== null ? (daysToAck <= 1 ? "Yes" : "No") : "\u2014",
        daysToResolve !== null ? (daysToResolve <= 21 ? "Yes" : "No") : "\u2014",
        c.escalatedToNdisCommission ? "Yes" : "No",
      ];
    });

    autoTable(doc, {
      startY: yPos,
      head: [["Ref #", "Received", "Source", "Status", "Severity", "Ack <24h", "Res <21d", "Escalated"]],
      body: complaintBody,
      theme: "grid",
      headStyles: {
        fillColor: TEAL,
        textColor: WHITE,
        fontSize: 7,
        fontStyle: "bold",
      },
      bodyStyles: {
        fontSize: 7,
        textColor: [51, 65, 85],
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { cellWidth: 24 },
        1: { cellWidth: 22 },
        2: { cellWidth: 20 },
        3: { cellWidth: 26, halign: "center" },
        4: { cellWidth: 20, halign: "center" },
        5: { cellWidth: 18, halign: "center" },
        6: { cellWidth: 20, halign: "center" },
        7: { cellWidth: 20, halign: "center" },
      },
      didParseCell: (hookData) => {
        if (hookData.section === "body") {
          // Status column
          if (hookData.column.index === 3) {
            const complaint = rangeComplaints[hookData.row.index];
            if (complaint) {
              hookData.cell.styles.textColor = getStatusColor(complaint.status);
              hookData.cell.styles.fontStyle = "bold";
            }
          }
          // Severity column
          if (hookData.column.index === 4) {
            const complaint = rangeComplaints[hookData.row.index];
            if (complaint) {
              const sevColors: Record<string, [number, number, number]> = {
                critical: RED,
                high: ORANGE,
                medium: YELLOW,
                low: GRAY_400,
              };
              hookData.cell.styles.textColor = sevColors[complaint.severity] || GRAY_400;
              hookData.cell.styles.fontStyle = "bold";
            }
          }
          // Ack/Resolution/Escalated columns - highlight issues
          if (hookData.column.index === 5 || hookData.column.index === 6) {
            const cellText = hookData.cell.text.join("");
            if (cellText === "No") {
              hookData.cell.styles.textColor = RED;
              hookData.cell.styles.fontStyle = "bold";
            } else if (cellText === "Yes") {
              hookData.cell.styles.textColor = GREEN;
            }
          }
          if (hookData.column.index === 7) {
            const cellText = hookData.cell.text.join("");
            if (cellText === "Yes") {
              hookData.cell.styles.textColor = RED;
              hookData.cell.styles.fontStyle = "bold";
            }
          }
        }
      },
      margin: { left: margin, right: margin },
    });
  } else {
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(9);
    doc.text("No complaints recorded in the selected period.", margin, yPos + 6);
  }

  // ================================================================
  // SECTION 5: PARTICIPANT PLAN STATUS
  // ================================================================
  doc.addPage();
  yPos = margin;
  yPos = drawSectionHeader(doc, "4. Participant Plan Status", yPos, pageWidth, margin);

  // Summary stats
  const activePlans = data.participantPlans.filter((p) => p.planStatus === "active").length;
  const expiringPlans = data.participantPlans.filter((p) => p.planStatus === "expiring_soon").length;
  const expiredPlans = data.participantPlans.filter((p) => p.planStatus === "expired").length;
  const noPlans = data.participantPlans.filter((p) => p.planStatus === "no_plan").length;

  doc.setFillColor(...GRAY_100);
  doc.roundedRect(margin, yPos, contentWidth, 20, 3, 3, "F");

  doc.setTextColor(...SLATE_800);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Active: ${activePlans}`, margin + 6, yPos + 8);

  doc.setTextColor(...YELLOW);
  doc.text(`Expiring (30d): ${expiringPlans}`, margin + 40, yPos + 8);

  doc.setTextColor(...RED);
  doc.text(`Expired: ${expiredPlans}`, margin + 85, yPos + 8);
  doc.text(`No Plan: ${noPlans}`, margin + 120, yPos + 8);

  yPos += 26;

  if (data.participantPlans.length > 0) {
    const planBody = data.participantPlans.map((p) => [
      p.participantName,
      maskNdisNumber(p.ndisNumber),
      p.planEndDate ? formatDate(p.planEndDate) : "No Plan",
      formatLabel(p.planStatus),
      p.planStatus === "no_plan" ? "\u2014" : p.daysUntilExpiry.toString(),
      p.propertyName || "\u2014",
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [["Participant", "NDIS Number", "Plan End", "Status", "Days Left", "Property"]],
      body: planBody,
      theme: "grid",
      headStyles: {
        fillColor: TEAL,
        textColor: WHITE,
        fontSize: 8,
        fontStyle: "bold",
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [51, 65, 85],
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 28 },
        2: { cellWidth: 25 },
        3: { cellWidth: 28, halign: "center" },
        4: { cellWidth: 20, halign: "center" },
        5: { cellWidth: 35 },
      },
      didParseCell: (hookData) => {
        if (hookData.section === "body") {
          // Status column
          if (hookData.column.index === 3) {
            const plan = data.participantPlans[hookData.row.index];
            if (plan) {
              hookData.cell.styles.textColor = getStatusColor(plan.planStatus);
              hookData.cell.styles.fontStyle = "bold";
            }
          }
          // Days left column - color code
          if (hookData.column.index === 4) {
            const plan = data.participantPlans[hookData.row.index];
            if (plan && plan.planStatus !== "no_plan") {
              if (plan.daysUntilExpiry < 0) {
                hookData.cell.styles.textColor = RED;
                hookData.cell.styles.fontStyle = "bold";
              } else if (plan.daysUntilExpiry <= 30) {
                hookData.cell.styles.textColor = YELLOW;
                hookData.cell.styles.fontStyle = "bold";
              }
            }
          }
        }
      },
      margin: { left: margin, right: margin },
    });
  } else {
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(9);
    doc.text("No participant plan data available.", margin, yPos + 6);
  }

  // ================================================================
  // SECTION 6: DOCUMENT EXPIRY REPORT
  // ================================================================
  doc.addPage();
  yPos = margin;
  yPos = drawSectionHeader(doc, "5. Document Expiry Report (Next 90 Days)", yPos, pageWidth, margin);

  if (data.expiringDocuments.length > 0) {
    // Group by document type
    const docsByType = new Map<string, ExpiringDocumentRow[]>();
    for (const d of data.expiringDocuments) {
      const type = d.documentType || "other";
      if (!docsByType.has(type)) docsByType.set(type, []);
      docsByType.get(type)!.push(d);
    }

    for (const [type, docs] of docsByType) {
      if (yPos > pageHeight - 60) {
        doc.addPage();
        yPos = margin;
      }

      // Type sub-header
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(margin, yPos, contentWidth, 8, 2, 2, "F");
      doc.setTextColor(...TEAL);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text(formatLabel(type), margin + 4, yPos + 5.5);
      yPos += 12;

      const docBody = docs.map((d) => [
        d.name.length > 40 ? d.name.substring(0, 38) + "..." : d.name,
        d.entityName || "\u2014",
        formatDate(d.expiryDate),
        d.isExpired ? `${Math.abs(d.daysUntilExpiry)}d overdue` : `${d.daysUntilExpiry}d`,
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [["Document Name", "Property / Entity", "Expiry Date", "Days Remaining"]],
        body: docBody,
        theme: "grid",
        headStyles: {
          fillColor: SLATE_800,
          textColor: WHITE,
          fontSize: 7,
          fontStyle: "bold",
        },
        bodyStyles: {
          fontSize: 7,
          textColor: [51, 65, 85],
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        columnStyles: {
          0: { cellWidth: 60 },
          1: { cellWidth: 45 },
          2: { cellWidth: 28 },
          3: { cellWidth: 30, halign: "center" },
        },
        didParseCell: (hookData) => {
          if (hookData.section === "body" && hookData.column.index === 3) {
            const docItem = docs[hookData.row.index];
            if (docItem) {
              if (docItem.isExpired) {
                hookData.cell.styles.textColor = RED;
                hookData.cell.styles.fontStyle = "bold";
              } else if (docItem.daysUntilExpiry <= 30) {
                hookData.cell.styles.textColor = YELLOW;
                hookData.cell.styles.fontStyle = "bold";
              } else {
                hookData.cell.styles.textColor = GREEN;
              }
            }
          }
        },
        margin: { left: margin, right: margin },
      });

      yPos = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
    }
  } else {
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(9);
    doc.text("No documents expiring within the next 90 days.", margin, yPos + 6);
  }

  // ================================================================
  // SECTION 7: AUDIT LOG INTEGRITY
  // ================================================================
  doc.addPage();
  yPos = margin;
  yPos = drawSectionHeader(doc, "6. Audit Log Integrity", yPos, pageWidth, margin);

  if (data.auditLogIntegrity) {
    const integrity = data.auditLogIntegrity;
    const intPercentage = parseFloat(integrity.integrityPercentage);

    // Integrity score box
    doc.setFillColor(...GRAY_100);
    doc.roundedRect(margin, yPos, contentWidth, 55, 4, 4, "F");

    // Integrity percentage (large)
    const intColor = intPercentage >= 99 ? GREEN : intPercentage >= 90 ? YELLOW : RED;
    doc.setTextColor(...intColor);
    doc.setFontSize(28);
    doc.setFont("helvetica", "bold");
    doc.text(`${integrity.integrityPercentage}%`, margin + 20, yPos + 22);

    doc.setTextColor(...SLATE_800);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Hash Chain Integrity", margin + 65, yPos + 15);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);

    doc.text(`Total audit log entries: ${integrity.totalLogs.toLocaleString()}`, margin + 65, yPos + 25);
    doc.text(`Verified entries: ${integrity.verifiedLogs.toLocaleString()}`, margin + 65, yPos + 33);
    doc.text(`Unverified entries: ${integrity.unverifiedLogs.toLocaleString()}`, margin + 65, yPos + 41);

    if (integrity.lastVerificationTimestamp) {
      doc.text(
        `Last verification: ${new Date(integrity.lastVerificationTimestamp).toLocaleString("en-AU")}`,
        margin + 65,
        yPos + 49
      );
    }

    yPos += 65;

    // Technical note
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, yPos, contentWidth, 24, 3, 3, "F");

    doc.setTextColor(...TEAL);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("Technical Note", margin + 6, yPos + 8);

    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    const techNote =
      "The audit trail uses SHA-256 hash chaining for tamper detection. Each log entry includes " +
      "a cryptographic hash of the previous entry, ensuring any modification to historical records " +
      "can be detected. Integrity verification is performed daily at 3:00 AM UTC.";
    const noteLines = doc.splitTextToSize(techNote, contentWidth - 12);
    doc.text(noteLines, margin + 6, yPos + 14);
  } else {
    // No integrity data available - display note
    doc.setFillColor(...GRAY_100);
    doc.roundedRect(margin, yPos, contentWidth, 30, 4, 4, "F");

    doc.setTextColor(100, 116, 139);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(
      "Audit log integrity data is only available to administrators.",
      margin + 6,
      yPos + 12
    );
    doc.text(
      "The system uses SHA-256 hash chaining for tamper detection with daily verification.",
      margin + 6,
      yPos + 22
    );
  }

  // ================================================================
  // FOOTER ON ALL PAGES
  // ================================================================
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Footer bar
    doc.setFillColor(248, 250, 252);
    doc.rect(0, pageHeight - 12, pageWidth, 12, "F");

    doc.setDrawColor(220, 220, 220);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

    doc.setTextColor(100, 116, 139);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(
      `MySDAManager - Audit-Ready Compliance Pack | Generated ${timestamp} | Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 5,
      { align: "center" }
    );
  }

  return doc;
}

// ============================================================
// SHARED DRAWING HELPERS
// ============================================================

function drawSectionHeader(
  doc: jsPDF,
  title: string,
  yPos: number,
  pageWidth: number,
  margin: number
): number {
  const contentWidth = pageWidth - margin * 2;

  // Teal header bar
  doc.setFillColor(...TEAL);
  doc.roundedRect(margin, yPos, contentWidth, 12, 2, 2, "F");

  doc.setTextColor(...WHITE);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(title, margin + 6, yPos + 8.5);

  return yPos + 18;
}
