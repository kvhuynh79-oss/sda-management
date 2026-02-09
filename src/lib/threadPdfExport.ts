import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ── Types ──────────────────────────────────────────────────────

interface ThreadExportData {
  thread: {
    subject: string;
    status?: string;
    participantNames?: string[];
    lastContactName?: string;
    messageCount?: number;
  } | null;
  communications: Array<{
    contactName: string;
    type: string; // email, phone_call, sms, meeting, other
    direction: string; // sent, received
    subject?: string;
    content: string; // summary field from communications table
    date: string; // YYYY-MM-DD
    time?: string; // HH:MM
    complianceCategory?: string;
    complianceFlags?: string[];
    contactType?: string;
    contactEmail?: string;
    contactPhone?: string;
    followUpStatus?: string;
    consultationOutcome?: string;
  }>;
  organization: {
    name: string;
    primaryColor?: string;
  } | null;
  exportedAt: string;
}

// ── Constants ──────────────────────────────────────────────────

const TEAL: [number, number, number] = [13, 148, 136]; // #0d9488
const DARK_SLATE: [number, number, number] = [30, 41, 59]; // slate-800
const MEDIUM_GRAY: [number, number, number] = [100, 116, 139]; // slate-500
const LIGHT_GRAY: [number, number, number] = [148, 163, 184]; // slate-400
const RED_CONF: [number, number, number] = [220, 38, 38]; // red-600
const WHITE: [number, number, number] = [255, 255, 255];
const BLACK: [number, number, number] = [0, 0, 0];
const ZEBRA_BG: [number, number, number] = [248, 250, 252]; // slate-50

// Communication type display config
const COMM_TYPE_CONFIG: Record<string, { label: string; color: [number, number, number]; marker: string }> = {
  email: { label: "Email", color: [59, 130, 246], marker: "E" }, // blue-500
  phone_call: { label: "Phone", color: [168, 85, 247], marker: "P" }, // purple-500
  sms: { label: "SMS", color: [34, 197, 94], marker: "S" }, // green-500
  meeting: { label: "Meeting", color: [249, 115, 22], marker: "M" }, // orange-500
  other: { label: "Other", color: MEDIUM_GRAY, marker: "O" },
};

const COMPLIANCE_CATEGORY_LABELS: Record<string, string> = {
  routine: "Routine",
  incident_related: "Incident Related",
  complaint: "Complaint",
  safeguarding: "Safeguarding",
  plan_review: "Plan Review",
  access_request: "Access Request",
  quality_audit: "Quality Audit",
  advocacy: "Advocacy",
  none: "",
};

const COMPLIANCE_FLAG_LABELS: Record<string, string> = {
  requires_documentation: "Documentation Required",
  time_sensitive: "Time Sensitive",
  escalation_required: "Escalation Required",
  ndia_reportable: "NDIA Reportable",
  legal_hold: "Legal Hold",
};

const COMPLIANCE_FLAG_COLORS: Record<string, [number, number, number]> = {
  requires_documentation: [59, 130, 246], // blue
  time_sensitive: [249, 115, 22], // orange
  escalation_required: [239, 68, 68], // red
  ndia_reportable: [220, 38, 38], // dark red
  legal_hold: [139, 92, 246], // violet
};

// ── Helpers ────────────────────────────────────────────────────

function formatDateAU(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-AU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formatDateLong(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-AU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formatTime(time?: string): string {
  if (!time) return "";
  return time;
}

function formatStatus(status?: string): string {
  if (!status) return "Active";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatContactType(type?: string): string {
  if (!type) return "";
  const labels: Record<string, string> = {
    ndia: "NDIA",
    support_coordinator: "Support Coordinator",
    sil_provider: "SIL Provider",
    participant: "Participant",
    family: "Family/Guardian",
    plan_manager: "Plan Manager",
    ot: "Occupational Therapist",
    contractor: "Contractor",
    other: "Other",
  };
  return labels[type] || type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── PDF Header (repeated on every page) ────────────────────────

function drawPageHeader(
  doc: jsPDF,
  orgName: string,
  exportDate: string,
  pageWidth: number,
  marginLeft: number,
  marginRight: number
): number {
  const contentRight = pageWidth - marginRight;

  // Organization name (left, bold, large)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...DARK_SLATE);
  doc.text(orgName, marginLeft, 20);

  // Subtitle (left, smaller, gray)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MEDIUM_GRAY);
  doc.text("MySDAManager - Communication Record", marginLeft, 26);

  // Export date (right)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MEDIUM_GRAY);
  doc.text(exportDate, contentRight, 20, { align: "right" });

  // CONFIDENTIAL (right, red, small caps)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...RED_CONF);
  doc.text("CONFIDENTIAL", contentRight, 26, { align: "right" });

  // Teal divider line (2pt)
  doc.setDrawColor(...TEAL);
  doc.setLineWidth(0.7);
  doc.line(marginLeft, 30, contentRight, 30);

  // Reset line width
  doc.setLineWidth(0.2);

  return 35; // Y position below header
}

// ── PDF Footer (repeated on every page) ────────────────────────

function drawPageFooters(doc: jsPDF, pageWidth: number, marginLeft: number, marginRight: number): void {
  const totalPages = doc.getNumberOfPages();
  const contentRight = pageWidth - marginRight;
  const now = new Date();
  const generatedText = `Generated by MySDAManager on ${now.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })} at ${now.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" })}`;

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const pageHeight = doc.internal.pageSize.getHeight();
    const footerY = pageHeight - 10;

    // Gray divider line above footer
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(marginLeft, footerY - 4, contentRight, footerY - 4);

    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...LIGHT_GRAY);

    // Left: Page X of Y
    doc.text(`Page ${i} of ${totalPages}`, marginLeft, footerY);

    // Center: Generated timestamp
    doc.text(generatedText, pageWidth / 2, footerY, { align: "center" });

    // Right: Confidential notice
    doc.text("CONFIDENTIAL - For authorized use only", contentRight, footerY, { align: "right" });
  }
}

// ── Thread Summary Section (page 1 only) ───────────────────────

function drawThreadSummary(
  doc: jsPDF,
  data: ThreadExportData,
  yPos: number,
  marginLeft: number,
  contentWidth: number
): number {
  const { thread, communications } = data;
  if (!thread) return yPos;

  const boxPadding = 8;
  const boxX = marginLeft;

  // Calculate date range
  const dates = communications
    .map((c) => c.date)
    .filter(Boolean)
    .sort();
  const firstDate = dates.length > 0 ? formatDateAU(dates[0]) : "N/A";
  const lastDate = dates.length > 0 ? formatDateAU(dates[dates.length - 1]) : "N/A";

  // Determine box height based on content
  const lines: string[] = [];
  lines.push(`Subject: ${thread.subject}`);
  if (thread.lastContactName) lines.push(`Contact: ${thread.lastContactName}`);
  if (thread.participantNames && thread.participantNames.length > 0) {
    lines.push(`Participants: ${thread.participantNames.join(", ")}`);
  }
  lines.push(`Date Range: ${firstDate} - ${lastDate}`);
  lines.push(`Total Entries: ${communications.length}`);
  lines.push(`Status: ${formatStatus(thread.status)}`);

  const lineHeight = 6;
  const boxHeight = boxPadding * 2 + 10 + lines.length * lineHeight;

  // Gray background box
  doc.setFillColor(241, 245, 249); // slate-100
  doc.roundedRect(boxX, yPos, contentWidth, boxHeight, 3, 3, "F");

  // Teal left accent bar
  doc.setFillColor(...TEAL);
  doc.rect(boxX, yPos, 3, boxHeight, "F");

  let textY = yPos + boxPadding;

  // Thread Subject (bold, larger)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...DARK_SLATE);
  const subjectLines = doc.splitTextToSize(thread.subject, contentWidth - boxPadding * 2 - 6);
  doc.text(subjectLines, boxX + boxPadding + 4, textY + 5);
  textY += subjectLines.length * 5 + 6;

  // Detail rows
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  const detailRows: Array<{ label: string; value: string }> = [];

  if (thread.lastContactName) {
    detailRows.push({ label: "Contact", value: thread.lastContactName });
  }
  if (thread.participantNames && thread.participantNames.length > 0) {
    detailRows.push({ label: "Participants", value: thread.participantNames.join(", ") });
  }
  detailRows.push({ label: "Date Range", value: `${firstDate}  --  ${lastDate}` });
  detailRows.push({ label: "Total Entries", value: String(communications.length) });
  detailRows.push({ label: "Thread Status", value: formatStatus(thread.status) });

  for (const row of detailRows) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...MEDIUM_GRAY);
    doc.text(`${row.label}:`, boxX + boxPadding + 4, textY);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(...DARK_SLATE);
    doc.text(row.value, boxX + boxPadding + 40, textY);
    textY += lineHeight;
  }

  return yPos + boxHeight + 10;
}

// ── Direction Arrow Drawing ────────────────────────────────────

function drawDirectionIndicator(
  doc: jsPDF,
  direction: string,
  type: string,
  x: number,
  y: number
): void {
  const config = COMM_TYPE_CONFIG[type] || COMM_TYPE_CONFIG.other;

  if (direction === "sent") {
    // Upward-right arrow indicator in teal
    doc.setFillColor(...TEAL);
    doc.circle(x + 6, y + 6, 6, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...WHITE);
    doc.text(String.fromCharCode(8599), x + 3.2, y + 8.8); // ↗
  } else {
    // Downward-left arrow indicator in type color
    doc.setFillColor(...config.color);
    doc.circle(x + 6, y + 6, 6, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...WHITE);
    doc.text(String.fromCharCode(8601), x + 3.2, y + 8.8); // ↙
  }
}

// ── Type Badge Drawing ─────────────────────────────────────────

function drawTypeBadge(
  doc: jsPDF,
  type: string,
  x: number,
  y: number
): number {
  const config = COMM_TYPE_CONFIG[type] || COMM_TYPE_CONFIG.other;
  const label = config.label;
  const labelWidth = doc.getTextWidth(label) + 6;

  // Rounded pill background
  doc.setFillColor(...config.color);
  doc.roundedRect(x, y - 3.5, labelWidth, 5, 2, 2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...WHITE);
  doc.text(label, x + 3, y);

  return x + labelWidth + 3; // return next x position
}

// ── Direction Badge Drawing ────────────────────────────────────

function drawDirectionBadge(
  doc: jsPDF,
  direction: string,
  x: number,
  y: number
): number {
  const label = direction === "sent" ? "Sent" : "Received";
  const color: [number, number, number] = direction === "sent" ? TEAL : [107, 114, 128]; // gray-500
  const labelWidth = doc.getTextWidth(label) + 6;

  // Outline badge
  doc.setDrawColor(...color);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y - 3.5, labelWidth, 5, 2, 2, "S");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...color);
  doc.text(label, x + 3, y);

  doc.setLineWidth(0.2); // reset
  return x + labelWidth + 3;
}

// ── Compliance Flag Badges ─────────────────────────────────────

function drawComplianceFlags(
  doc: jsPDF,
  category?: string,
  flags?: string[],
  x?: number,
  y?: number,
  maxWidth?: number
): number {
  if (!x || !y || !maxWidth) return y || 0;

  let currentX = x;
  const startY = y;
  let rowY = y;

  // Compliance category
  if (category && category !== "none" && COMPLIANCE_CATEGORY_LABELS[category]) {
    const label = COMPLIANCE_CATEGORY_LABELS[category];
    if (label) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      const labelWidth = doc.getTextWidth(label) + 5;

      if (currentX + labelWidth > x + maxWidth) {
        currentX = x;
        rowY += 5;
      }

      doc.setFillColor(226, 232, 240); // slate-200
      doc.roundedRect(currentX, rowY - 2.8, labelWidth, 4.5, 1.5, 1.5, "F");
      doc.setTextColor(71, 85, 105); // slate-600
      doc.text(label, currentX + 2.5, rowY);
      currentX += labelWidth + 2;
    }
  }

  // Compliance flags
  if (flags && flags.length > 0) {
    for (const flag of flags) {
      const label = COMPLIANCE_FLAG_LABELS[flag];
      if (!label) continue;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(6);
      const labelWidth = doc.getTextWidth(label) + 5;

      if (currentX + labelWidth > x + maxWidth) {
        currentX = x;
        rowY += 5;
      }

      const flagColor = COMPLIANCE_FLAG_COLORS[flag] || MEDIUM_GRAY;
      doc.setFillColor(...flagColor);
      doc.roundedRect(currentX, rowY - 2.8, labelWidth, 4.5, 1.5, 1.5, "F");
      doc.setTextColor(...WHITE);
      doc.text(label, currentX + 2.5, rowY);
      currentX += labelWidth + 2;
    }
  }

  // Return the Y position after all flag rows
  return currentX > x ? rowY + 5 : startY;
}

// ── Communication Entry Rendering ──────────────────────────────

function drawCommunicationEntry(
  doc: jsPDF,
  comm: ThreadExportData["communications"][0],
  threadSubject: string | undefined,
  index: number,
  yPos: number,
  marginLeft: number,
  contentWidth: number,
  pageHeight: number
): { newY: number; needsNewPage: boolean } {
  const leftColWidth = 24;
  const rightColX = marginLeft + leftColWidth + 4;
  const rightColWidth = contentWidth - leftColWidth - 4;
  const isEven = index % 2 === 0;

  // Pre-calculate the full height of this entry to decide on page break
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const contentLines = doc.splitTextToSize(comm.content || "", rightColWidth - 4);
  const hasSubject = comm.subject && comm.subject !== threadSubject;
  const hasCompliance =
    (comm.complianceCategory && comm.complianceCategory !== "none") ||
    (comm.complianceFlags && comm.complianceFlags.length > 0);

  // Estimate entry height
  let estimatedHeight = 8; // Row 1: contact + badges
  if (hasSubject) estimatedHeight += 5; // Row 2: subject
  estimatedHeight += contentLines.length * 3.8 + 2; // Row 3: content
  if (hasCompliance) estimatedHeight += 7; // Row 4: compliance
  estimatedHeight += 4; // padding

  // Check if this entry would overflow the page (leave room for footer)
  if (yPos + estimatedHeight > pageHeight - 20) {
    return { newY: yPos, needsNewPage: true };
  }

  const entryStartY = yPos;

  // Alternate background shading
  if (!isEven) {
    doc.setFillColor(...ZEBRA_BG);
    doc.rect(marginLeft, yPos - 2, contentWidth, estimatedHeight + 2, "F");
  }

  // ── Left column: Direction indicator + date/time ──

  drawDirectionIndicator(doc, comm.direction, comm.type, marginLeft + 2, yPos);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...MEDIUM_GRAY);
  doc.text(formatDateAU(comm.date), marginLeft + 2, yPos + 17);

  const timeStr = formatTime(comm.time);
  if (timeStr) {
    doc.text(timeStr, marginLeft + 2, yPos + 21);
  }

  // ── Right column ──

  let rightY = yPos + 4;

  // Row 1: Contact name (bold) | Type badge | Direction badge
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...DARK_SLATE);

  const contactLabel = comm.contactName || "Unknown";
  doc.text(contactLabel, rightColX, rightY);

  // Badges after contact name
  const contactNameWidth = doc.getTextWidth(contactLabel);
  let badgeX = rightColX + contactNameWidth + 4;

  // Type badge
  doc.setFontSize(7);
  badgeX = drawTypeBadge(doc, comm.type, badgeX, rightY);

  // Direction badge
  drawDirectionBadge(doc, comm.direction, badgeX, rightY);

  rightY += 6;

  // Row 2: Subject line (if different from thread)
  if (hasSubject) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105); // slate-600
    const subjectText = `Re: ${comm.subject}`;
    const truncatedSubject = subjectText.length > 80
      ? subjectText.substring(0, 78) + "..."
      : subjectText;
    doc.text(truncatedSubject, rightColX, rightY);
    rightY += 5;
  }

  // Row 3: Message content (word-wrapped)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85); // slate-700
  doc.text(contentLines, rightColX, rightY);
  rightY += contentLines.length * 3.8;

  // Row 4: Compliance flags
  if (hasCompliance) {
    rightY += 2;
    rightY = drawComplianceFlags(
      doc,
      comm.complianceCategory,
      comm.complianceFlags,
      rightColX,
      rightY,
      rightColWidth
    );
  }

  rightY += 3;

  // Light gray divider line between entries
  const finalY = Math.max(rightY, entryStartY + 24);
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.2);
  doc.line(marginLeft, finalY, marginLeft + contentWidth, finalY);

  return { newY: finalY + 2, needsNewPage: false };
}

// ── Empty Thread Handling ──────────────────────────────────────

function drawEmptyState(
  doc: jsPDF,
  yPos: number,
  marginLeft: number,
  contentWidth: number
): number {
  const boxHeight = 30;

  doc.setFillColor(241, 245, 249); // slate-100
  doc.roundedRect(marginLeft, yPos, contentWidth, boxHeight, 3, 3, "F");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...MEDIUM_GRAY);
  doc.text(
    "No communications found in this thread.",
    marginLeft + contentWidth / 2,
    yPos + boxHeight / 2 + 2,
    { align: "center" }
  );

  return yPos + boxHeight + 10;
}

// ── Summary Statistics Table ───────────────────────────────────

function drawSummaryTable(
  doc: jsPDF,
  communications: ThreadExportData["communications"],
  yPos: number,
  marginLeft: number,
  contentWidth: number,
  pageHeight: number
): number {
  if (communications.length === 0) return yPos;

  // Check if we need a new page for the summary
  if (yPos > pageHeight - 60) {
    doc.addPage();
    yPos = 35;
  }

  // Section heading
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...DARK_SLATE);
  doc.text("COMMUNICATION SUMMARY", marginLeft, yPos);
  yPos += 6;

  // Count by type
  const typeCounts: Record<string, number> = {};
  const directionCounts: Record<string, number> = { sent: 0, received: 0 };
  const categoryCounts: Record<string, number> = {};

  for (const comm of communications) {
    typeCounts[comm.type] = (typeCounts[comm.type] || 0) + 1;
    directionCounts[comm.direction] = (directionCounts[comm.direction] || 0) + 1;
    if (comm.complianceCategory && comm.complianceCategory !== "none") {
      categoryCounts[comm.complianceCategory] = (categoryCounts[comm.complianceCategory] || 0) + 1;
    }
  }

  // Build summary table rows
  const summaryRows: string[][] = [];
  summaryRows.push(["Total Communications", String(communications.length)]);
  summaryRows.push(["Sent", String(directionCounts.sent)]);
  summaryRows.push(["Received", String(directionCounts.received)]);
  summaryRows.push(["", ""]); // spacer row

  for (const [type, count] of Object.entries(typeCounts)) {
    const config = COMM_TYPE_CONFIG[type] || COMM_TYPE_CONFIG.other;
    summaryRows.push([config.label, String(count)]);
  }

  if (Object.keys(categoryCounts).length > 0) {
    summaryRows.push(["", ""]); // spacer row
    summaryRows.push(["Compliance Categories", ""]);
    for (const [cat, count] of Object.entries(categoryCounts)) {
      const label = COMPLIANCE_CATEGORY_LABELS[cat] || cat;
      summaryRows.push([`  ${label}`, String(count)]);
    }
  }

  autoTable(doc, {
    startY: yPos,
    body: summaryRows,
    theme: "plain",
    styles: {
      fontSize: 8.5,
      cellPadding: { top: 1.5, right: 4, bottom: 1.5, left: 4 },
      textColor: DARK_SLATE,
    },
    columnStyles: {
      0: { fontStyle: "normal", cellWidth: 60 },
      1: { fontStyle: "bold", cellWidth: 30, halign: "right" },
    },
    margin: { left: marginLeft, right: marginLeft },
    tableWidth: 90,
    didParseCell: (hookData) => {
      // Bold the header-like rows
      const cellText = String(hookData.cell.raw);
      if (
        cellText === "Total Communications" ||
        cellText === "Compliance Categories"
      ) {
        hookData.cell.styles.fontStyle = "bold";
      }
      // Dim the spacer rows
      if (cellText === "") {
        hookData.cell.styles.minCellHeight = 2;
      }
    },
  });

  return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
}

// ── Main Export Function ───────────────────────────────────────

export async function exportThreadToPdf(data: ThreadExportData): Promise<void> {
  const doc = new jsPDF("p", "mm", "a4");
  const pageWidth = 210;
  const pageHeight = 297;
  const marginLeft = 20;
  const marginRight = 20;
  const contentWidth = pageWidth - marginLeft - marginRight;

  const orgName = data.organization?.name || "Better Living Solutions";
  const exportDate = formatDateLong(data.exportedAt);

  // Sort communications chronologically
  const sortedComms = [...data.communications].sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) return dateCompare;
    return (a.time || "00:00").localeCompare(b.time || "00:00");
  });

  // ── PAGE 1 ─────────────────────────────────────────────────

  // Header
  let yPos = drawPageHeader(doc, orgName, exportDate, pageWidth, marginLeft, marginRight);

  // Thread Summary Section
  yPos = drawThreadSummary(doc, data, yPos, marginLeft, contentWidth);

  // Section heading for entries
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...DARK_SLATE);
  doc.text("COMMUNICATION TIMELINE", marginLeft, yPos);

  // Teal underline for section heading
  doc.setDrawColor(...TEAL);
  doc.setLineWidth(0.5);
  doc.line(marginLeft, yPos + 1.5, marginLeft + 50, yPos + 1.5);
  doc.setLineWidth(0.2);

  yPos += 8;

  // ── Communication Entries ──────────────────────────────────

  if (sortedComms.length === 0) {
    yPos = drawEmptyState(doc, yPos, marginLeft, contentWidth);
  } else {
    for (let i = 0; i < sortedComms.length; i++) {
      const comm = sortedComms[i];
      const result = drawCommunicationEntry(
        doc,
        comm,
        data.thread?.subject,
        i,
        yPos,
        marginLeft,
        contentWidth,
        pageHeight
      );

      if (result.needsNewPage) {
        // Add new page and redraw header
        doc.addPage();
        yPos = drawPageHeader(doc, orgName, exportDate, pageWidth, marginLeft, marginRight);

        // Re-render entry on new page
        const retryResult = drawCommunicationEntry(
          doc,
          comm,
          data.thread?.subject,
          i,
          yPos,
          marginLeft,
          contentWidth,
          pageHeight
        );
        yPos = retryResult.newY;
      } else {
        yPos = result.newY;
      }
    }
  }

  // ── Summary Statistics ─────────────────────────────────────

  yPos = drawSummaryTable(doc, sortedComms, yPos, marginLeft, contentWidth, pageHeight);

  // ── Disclaimer ─────────────────────────────────────────────

  if (yPos > pageHeight - 35) {
    doc.addPage();
    yPos = drawPageHeader(doc, orgName, exportDate, pageWidth, marginLeft, marginRight);
  }

  doc.setFillColor(254, 242, 242); // red-50
  doc.roundedRect(marginLeft, yPos, contentWidth, 16, 2, 2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...RED_CONF);
  doc.text("CONFIDENTIALITY NOTICE", marginLeft + 4, yPos + 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(107, 114, 128); // gray-500
  const disclaimerText =
    "This document contains confidential information relating to NDIS participants and service delivery. " +
    "It is intended solely for the use of authorized personnel. Unauthorized disclosure, copying, or distribution " +
    "of this document is prohibited and may constitute a breach of the NDIS Act 2013.";
  const disclaimerLines = doc.splitTextToSize(disclaimerText, contentWidth - 8);
  doc.text(disclaimerLines, marginLeft + 4, yPos + 9);

  // ── Add Footers to All Pages ───────────────────────────────

  drawPageFooters(doc, pageWidth, marginLeft, marginRight);

  // ── Save ───────────────────────────────────────────────────

  const safeSubject = (data.thread?.subject || "Communication-Record")
    .replace(/[^a-zA-Z0-9\-_ ]/g, "")
    .replace(/\s+/g, "-")
    .substring(0, 50);
  const dateStamp = new Date().toISOString().split("T")[0];
  doc.save(`${safeSubject}-${dateStamp}.pdf`);
}
