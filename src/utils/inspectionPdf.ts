import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface PhotoData {
  url: string | null;
  fileName: string;
  description?: string | null;
}

interface InspectionItem {
  category: string;
  itemName: string;
  status: string;
  condition: string | null;
  remarks: string | null;
  hasIssue: boolean;
  photos: PhotoData[];
}

interface CategorySummary {
  name: string;
  total: number;
  passed: number;
  failed: number;
  na: number;
}

interface InspectionReportData {
  inspection: {
    scheduledDate: string;
    completedDate?: string;
    status: string;
    additionalComments?: string;
    location?: string;
    preparedBy?: string;
  };
  property: {
    propertyName?: string;
    addressLine1: string;
    suburb: string;
    state: string;
    postcode: string;
  } | null;
  dwelling: { dwellingName: string } | null;
  inspector: { firstName: string; lastName: string } | null;
  template: { name: string } | null;
  items: InspectionItem[];
  generalPhotos: PhotoData[];
  summary: {
    totalItems: number;
    passedItems: number;
    failedItems: number;
    naItems: number;
    passRate: number;
    categorySummary: CategorySummary[];
  };
}

/** Fetch image URL and convert to base64 data URL for PDF embedding */
async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/** Format status text for display */
function formatStatus(status: string): string {
  switch (status) {
    case "pass": return "PASS";
    case "fail": return "FAIL";
    case "na": return "N/A";
    case "pending": return "Pending";
    default: return status.replace(/_/g, " ").toUpperCase();
  }
}

/** Get RGB color for status */
function getStatusColor(status: string): [number, number, number] {
  switch (status) {
    case "pass": return [34, 197, 94];     // green-500
    case "fail": return [239, 68, 68];     // red-500
    case "na": return [156, 163, 175];     // gray-400
    default: return [156, 163, 175];
  }
}

export async function generateInspectionPDF(data: InspectionReportData, organizationName?: string): Promise<void> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  // ── PAGE 1: COVER ──────────────────────────────────────
  // Header bar
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(0, 0, pageWidth, 40, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("PROPERTY INSPECTION REPORT", margin, 18);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(organizationName || "MySDAManager", margin, 28);
  doc.text(data.template?.name || "Inspection Report", margin, 34);

  // Property details
  let yPos = 52;
  doc.setTextColor(0, 0, 0);

  const address = data.property
    ? `${data.property.addressLine1}, ${data.property.suburb} ${data.property.state} ${data.property.postcode}`
    : "Unknown Property";
  const propertyName = data.property?.propertyName || "Unknown Property";

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(propertyName, margin, yPos);
  yPos += 7;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(address, margin, yPos);
  yPos += 6;

  if (data.dwelling) {
    doc.text(`Dwelling: ${data.dwelling.dwellingName}`, margin, yPos);
    yPos += 6;
  }

  yPos += 4;

  // Info grid
  doc.setTextColor(0, 0, 0);
  const infoRows = [
    ["Inspector", data.inspector ? `${data.inspector.firstName} ${data.inspector.lastName}` : "Unassigned"],
    ["Scheduled Date", data.inspection.scheduledDate],
    ["Completed Date", data.inspection.completedDate || "Not yet completed"],
    ["Status", formatStatus(data.inspection.status)],
  ];
  if (data.inspection.location) {
    infoRows.push(["Location", data.inspection.location]);
  }
  if (data.inspection.preparedBy) {
    infoRows.push(["Prepared By", data.inspection.preparedBy]);
  }

  autoTable(doc, {
    startY: yPos,
    body: infoRows,
    theme: "plain",
    styles: { fontSize: 10, cellPadding: 2 },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 40 },
      1: { cellWidth: contentWidth - 40 },
    },
    margin: { left: margin, right: margin },
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  // ── SUMMARY BOX ────────────────────────────────────────
  const s = data.summary;
  const boxHeight = 30;
  doc.setFillColor(241, 245, 249); // slate-100
  doc.roundedRect(margin, yPos, contentWidth, boxHeight, 3, 3, "F");

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text("INSPECTION SUMMARY", margin + 6, yPos + 8);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const summaryText = `Total: ${s.totalItems}  |  Passed: ${s.passedItems}  |  Failed: ${s.failedItems}  |  N/A: ${s.naItems}  |  Pass Rate: ${s.passRate}%`;
  doc.text(summaryText, margin + 6, yPos + 18);

  // Color indicator for pass rate
  const prColor: [number, number, number] = s.passRate >= 80 ? [34, 197, 94] : s.passRate >= 50 ? [234, 179, 8] : [239, 68, 68];
  doc.setFillColor(...prColor);
  doc.circle(contentWidth + margin - 10, yPos + 13, 5, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text(`${s.passRate}%`, contentWidth + margin - 10, yPos + 14.5, { align: "center" });

  yPos += boxHeight + 10;

  // ── CATEGORY BAR CHART ─────────────────────────────────
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("CATEGORY BREAKDOWN", margin, yPos);
  yPos += 6;

  const barMaxWidth = contentWidth - 70;
  const maxCatTotal = Math.max(...s.categorySummary.map((c) => c.total), 1);

  for (const cat of s.categorySummary) {
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);

    // Category name (truncate if needed)
    const catLabel = cat.name.length > 20 ? cat.name.substring(0, 18) + "..." : cat.name;
    doc.text(catLabel, margin, yPos + 3);

    const barX = margin + 62;
    const barWidth = (cat.total / maxCatTotal) * barMaxWidth;
    const barH = 5;

    // Background bar
    doc.setFillColor(229, 231, 235); // gray-200
    doc.rect(barX, yPos - 1, barMaxWidth, barH, "F");

    // Pass portion (green)
    if (cat.passed > 0) {
      const passW = (cat.passed / cat.total) * barWidth;
      doc.setFillColor(34, 197, 94);
      doc.rect(barX, yPos - 1, passW, barH, "F");
    }

    // Fail portion (red)
    if (cat.failed > 0) {
      const passW = (cat.passed / cat.total) * barWidth;
      const failW = (cat.failed / cat.total) * barWidth;
      doc.setFillColor(239, 68, 68);
      doc.rect(barX + passW, yPos - 1, failW, barH, "F");
    }

    // Count label
    doc.setFontSize(7);
    doc.text(`${cat.passed}/${cat.total}`, barX + barMaxWidth + 3, yPos + 3);

    yPos += 9;
  }

  // ── PAGE 2+: CATEGORY TABLES ───────────────────────────
  // Group items by category
  const categories = new Map<string, InspectionItem[]>();
  for (const item of data.items) {
    if (!categories.has(item.category)) categories.set(item.category, []);
    categories.get(item.category)!.push(item);
  }

  for (const [catName, catItems] of categories) {
    const catSummary = s.categorySummary.find((c) => c.name === catName);
    const headerText = `${catName.toUpperCase()} (${catSummary?.passed || 0} passed, ${catSummary?.failed || 0} failed)`;

    // Check if we need a new page
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }

    yPos += 6;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text(headerText, margin, yPos);
    yPos += 2;

    const tableBody = catItems.map((item) => [
      item.itemName,
      formatStatus(item.status),
      item.condition || "-",
      item.remarks || "-",
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [["Item", "Status", "Condition", "Notes"]],
      body: tableBody,
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: "bold" },
      columnStyles: {
        0: { cellWidth: contentWidth * 0.35 },
        1: { cellWidth: 20, halign: "center" },
        2: { cellWidth: contentWidth * 0.2 },
        3: { cellWidth: contentWidth * 0.25 },
      },
      margin: { left: margin, right: margin },
      didParseCell: (hookData) => {
        // Color the Status column
        if (hookData.column.index === 1 && hookData.section === "body") {
          const status = catItems[hookData.row.index]?.status;
          if (status) {
            const color = getStatusColor(status);
            hookData.cell.styles.textColor = color;
            hookData.cell.styles.fontStyle = "bold";
          }
        }
      },
    });

    yPos = (doc as any).lastAutoTable.finalY + 4;
  }

  // ── FAILED ITEMS SUMMARY ───────────────────────────────
  const failedItems = data.items.filter((i) => i.status === "fail");

  if (failedItems.length > 0) {
    if (yPos > 230) {
      doc.addPage();
      yPos = 20;
    }

    yPos += 8;
    doc.setFillColor(254, 242, 242); // red-50
    doc.roundedRect(margin, yPos - 4, contentWidth, 10, 2, 2, "F");
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(185, 28, 28); // red-700
    doc.text(`FAILED ITEMS (${failedItems.length})`, margin + 4, yPos + 3);
    yPos += 12;

    for (const item of failedItems) {
      if (yPos > 265) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text(`${item.category} > ${item.itemName}`, margin, yPos);
      yPos += 5;

      if (item.condition) {
        doc.setFont("helvetica", "normal");
        doc.setTextColor(80, 80, 80);
        doc.text(`Condition: ${item.condition}`, margin + 4, yPos);
        yPos += 5;
      }

      if (item.remarks) {
        doc.setFont("helvetica", "normal");
        doc.setTextColor(80, 80, 80);
        const lines = doc.splitTextToSize(`Remarks: ${item.remarks}`, contentWidth - 8);
        doc.text(lines, margin + 4, yPos);
        yPos += lines.length * 4.5;
      }

      yPos += 3;
    }
  }

  // ── PHOTOS ─────────────────────────────────────────────
  // Collect failed item photos + general photos
  const failedPhotos: { label: string; url: string }[] = [];
  for (const item of failedItems) {
    for (const photo of item.photos) {
      if (photo.url) {
        failedPhotos.push({
          label: `${item.category} > ${item.itemName}`,
          url: photo.url,
        });
      }
    }
  }

  const allPhotos = [
    ...failedPhotos.map((p) => ({ ...p, section: "Failed Items" })),
    ...data.generalPhotos
      .filter((p) => p.url)
      .map((p) => ({
        label: p.description || p.fileName,
        url: p.url!,
        section: "General Photos",
      })),
  ];

  if (allPhotos.length > 0) {
    doc.addPage();
    yPos = 20;

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text("INSPECTION PHOTOS", margin, yPos);
    yPos += 10;

    let currentSection = "";
    const photoWidth = (contentWidth - 8) / 2;
    const photoHeight = 60;
    let col = 0;

    for (const photo of allPhotos) {
      if (photo.section !== currentSection) {
        currentSection = photo.section;
        if (col === 1) {
          yPos += photoHeight + 14;
          col = 0;
        }
        if (yPos > 240) {
          doc.addPage();
          yPos = 20;
        }
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text(currentSection, margin, yPos);
        yPos += 6;
      }

      if (col === 0 && yPos > 220) {
        doc.addPage();
        yPos = 20;
      }

      const xPos = margin + col * (photoWidth + 8);

      // Fetch and embed image
      const base64 = await fetchImageAsBase64(photo.url);
      if (base64) {
        try {
          doc.addImage(base64, "JPEG", xPos, yPos, photoWidth, photoHeight);
        } catch {
          // Image format not supported - draw placeholder
          doc.setFillColor(229, 231, 235);
          doc.rect(xPos, yPos, photoWidth, photoHeight, "F");
          doc.setFontSize(8);
          doc.setTextColor(100, 100, 100);
          doc.text("Image unavailable", xPos + photoWidth / 2, yPos + photoHeight / 2, { align: "center" });
        }
      } else {
        doc.setFillColor(229, 231, 235);
        doc.rect(xPos, yPos, photoWidth, photoHeight, "F");
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text("Image unavailable", xPos + photoWidth / 2, yPos + photoHeight / 2, { align: "center" });
      }

      // Photo label
      doc.setFontSize(7);
      doc.setTextColor(80, 80, 80);
      doc.setFont("helvetica", "normal");
      const labelText = photo.label.length > 35 ? photo.label.substring(0, 33) + "..." : photo.label;
      doc.text(labelText, xPos, yPos + photoHeight + 4);

      col++;
      if (col >= 2) {
        col = 0;
        yPos += photoHeight + 14;
      }
    }
  }

  // ── ADDITIONAL COMMENTS ────────────────────────────────
  if (data.inspection.additionalComments) {
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("ADDITIONAL COMMENTS", margin, yPos);
    yPos += 6;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);
    const commentLines = doc.splitTextToSize(data.inspection.additionalComments, contentWidth);
    doc.text(commentLines, margin, yPos);
  }

  // ── FOOTER ON EVERY PAGE ───────────────────────────────
  const totalPages = doc.getNumberOfPages();
  const generatedDate = new Date().toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const pageHeight = doc.internal.pageSize.getHeight();

    doc.setDrawColor(200, 200, 200);
    doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);

    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.setFont("helvetica", "normal");
    doc.text(`Page ${i} of ${totalPages}`, margin, pageHeight - 8);
    doc.text(`Generated by MySDAManager on ${generatedDate}`, pageWidth - margin, pageHeight - 8, { align: "right" });
  }

  // ── DOWNLOAD ───────────────────────────────────────────
  const propertyAddress = data.property?.addressLine1?.replace(/[^a-zA-Z0-9]/g, "_") || "Unknown";
  const date = data.inspection.completedDate || data.inspection.scheduledDate;
  doc.save(`Inspection_${propertyAddress}_${date}.pdf`);
}
