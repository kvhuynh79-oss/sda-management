import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface ManagementContact {
  name: string;
  role: string;
  phone: string;
  email?: string;
}

interface EmergencyContact {
  service: string;
  phone: string;
  notes?: string;
}

interface EmergencyKitItem {
  item: string;
  location?: string;
  lastChecked?: string;
}

interface EmergencyTeamMember {
  name: string;
  role: string;
  responsibilities?: string;
  phone: string;
}

interface EmergencyProcedure {
  type: string;
  steps: string;
}

interface EmergencyPlanData {
  version: string;
  status: string;
  lastReviewedDate?: string;
  nextReviewDate?: string;
  managementContacts: ManagementContact[];
  emergencyContacts: EmergencyContact[];
  assemblyPoint?: string;
  evacuationProcedure?: string;
  emergencyKit: EmergencyKitItem[];
  emergencyTeam: EmergencyTeamMember[];
  procedures: EmergencyProcedure[];
  participantNotes?: string;
}

interface PropertyData {
  propertyName?: string;
  addressLine1: string;
  suburb?: string;
  state?: string;
  postcode?: string;
}

function formatDateForPdf(dateStr: string | undefined): string {
  if (!dateStr) return "N/A";
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-AU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formatProcedureType(type: string): string {
  const labels: Record<string, string> = {
    fire: "Fire",
    flood: "Flood",
    storm: "Storm",
    medical_emergency: "Medical Emergency",
    power_outage: "Power Outage",
    gas_leak: "Gas Leak",
    security_threat: "Security Threat",
    other: "Other",
  };
  return labels[type] || type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

export function generateEmergencyPlanPdf(
  plan: EmergencyPlanData,
  property: PropertyData,
  orgName: string
): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  // -- PAGE 1: COVER / HEADER --
  // Header bar
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(0, 0, pageWidth, 50, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(orgName || "MySDAManager", margin, 14);

  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("EMERGENCY MANAGEMENT PLAN", margin, 28);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("For use by residents and staff", margin, 36);

  // Property address in header
  const address = [
    property.addressLine1,
    property.suburb,
    property.state,
    property.postcode,
  ]
    .filter(Boolean)
    .join(", ");
  doc.text(address || "Unknown Property", margin, 44);

  // Version and review dates
  let yPos = 60;
  doc.setTextColor(0, 0, 0);

  const propertyName = property.propertyName || property.addressLine1 || "Unknown Property";
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(propertyName, margin, yPos);
  yPos += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);

  const versionInfoRows = [
    ["Document Version", plan.version || "1.0"],
    ["Status", (plan.status || "draft").replace(/_/g, " ").toUpperCase()],
    ["Last Reviewed", formatDateForPdf(plan.lastReviewedDate)],
    ["Next Review", formatDateForPdf(plan.nextReviewDate)],
  ];

  autoTable(doc, {
    startY: yPos,
    body: versionInfoRows,
    theme: "plain",
    styles: { fontSize: 10, cellPadding: 2 },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 45 },
      1: { cellWidth: contentWidth - 45 },
    },
    margin: { left: margin, right: margin },
  });

  yPos = (doc as any).lastAutoTable.finalY + 12;

  // -- SECTION 1: MANAGEMENT CONTACTS --
  if (plan.managementContacts && plan.managementContacts.length > 0) {
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margin, yPos - 4, contentWidth, 10, 2, 2, "F");
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text("MANAGEMENT CONTACTS", margin + 4, yPos + 3);
    yPos += 10;

    const contactBody = plan.managementContacts.map((c) => [
      c.name || "-",
      c.role || "-",
      c.phone || "-",
      c.email || "-",
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [["Name", "Role", "Phone", "Email"]],
      body: contactBody,
      theme: "grid",
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: "bold" },
      margin: { left: margin, right: margin },
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // -- SECTION 2: EMERGENCY CONTACTS --
  if (plan.emergencyContacts && plan.emergencyContacts.length > 0) {
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFillColor(254, 242, 242);
    doc.roundedRect(margin, yPos - 4, contentWidth, 10, 2, 2, "F");
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(185, 28, 28);
    doc.text("EMERGENCY CONTACTS", margin + 4, yPos + 3);
    yPos += 10;

    const emergencyBody = plan.emergencyContacts.map((c) => [
      c.service || "-",
      c.phone || "-",
      c.notes || "-",
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [["Service", "Phone", "Notes"]],
      body: emergencyBody,
      theme: "grid",
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [185, 28, 28], textColor: [255, 255, 255], fontStyle: "bold" },
      columnStyles: {
        0: { cellWidth: contentWidth * 0.35 },
        1: { cellWidth: contentWidth * 0.2 },
        2: { cellWidth: contentWidth * 0.45 },
      },
      margin: { left: margin, right: margin },
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // -- SECTION 3: EVACUATION PROCEDURE --
  if (plan.assemblyPoint || plan.evacuationProcedure) {
    if (yPos > 230) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margin, yPos - 4, contentWidth, 10, 2, 2, "F");
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text("EVACUATION PROCEDURE", margin + 4, yPos + 3);
    yPos += 14;

    if (plan.assemblyPoint) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text("Assembly Point:", margin, yPos);
      yPos += 5;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(60, 60, 60);
      const assemblyLines = doc.splitTextToSize(plan.assemblyPoint, contentWidth);
      doc.text(assemblyLines, margin, yPos);
      yPos += assemblyLines.length * 5 + 4;
    }

    if (plan.evacuationProcedure) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text("Procedure:", margin, yPos);
      yPos += 5;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(60, 60, 60);
      const procLines = doc.splitTextToSize(plan.evacuationProcedure, contentWidth);
      doc.text(procLines, margin, yPos);
      yPos += procLines.length * 5 + 6;
    }
  }

  // -- SECTION 4: EMERGENCY KIT --
  if (plan.emergencyKit && plan.emergencyKit.length > 0) {
    if (yPos > 230) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margin, yPos - 4, contentWidth, 10, 2, 2, "F");
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text("EMERGENCY KIT", margin + 4, yPos + 3);
    yPos += 10;

    const kitBody = plan.emergencyKit.map((k) => [
      k.item || "-",
      k.location || "-",
      k.lastChecked ? formatDateForPdf(k.lastChecked) : "-",
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [["Item", "Location", "Last Checked"]],
      body: kitBody,
      theme: "grid",
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: "bold" },
      columnStyles: {
        0: { cellWidth: contentWidth * 0.4 },
        1: { cellWidth: contentWidth * 0.35 },
        2: { cellWidth: contentWidth * 0.25 },
      },
      margin: { left: margin, right: margin },
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // -- SECTION 5: EMERGENCY TEAM --
  if (plan.emergencyTeam && plan.emergencyTeam.length > 0) {
    if (yPos > 230) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margin, yPos - 4, contentWidth, 10, 2, 2, "F");
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text("EMERGENCY TEAM", margin + 4, yPos + 3);
    yPos += 10;

    const teamBody = plan.emergencyTeam.map((t) => [
      t.name || "-",
      t.role || "-",
      t.responsibilities || "-",
      t.phone || "-",
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [["Name", "Role", "Responsibilities", "Phone"]],
      body: teamBody,
      theme: "grid",
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: "bold" },
      margin: { left: margin, right: margin },
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // -- SECTION 6: EMERGENCY PROCEDURES --
  if (plan.procedures && plan.procedures.length > 0) {
    if (yPos > 220) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margin, yPos - 4, contentWidth, 10, 2, 2, "F");
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text("EMERGENCY PROCEDURES", margin + 4, yPos + 3);
    yPos += 14;

    for (const proc of plan.procedures) {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      // Procedure type heading
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 41, 59);
      doc.text(formatProcedureType(proc.type), margin, yPos);
      yPos += 5;

      // Procedure steps
      if (proc.steps) {
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(60, 60, 60);
        const stepLines = doc.splitTextToSize(proc.steps, contentWidth - 4);
        doc.text(stepLines, margin + 4, yPos);
        yPos += stepLines.length * 4.5 + 6;
      } else {
        yPos += 4;
      }
    }
  }

  // -- SECTION 7: PARTICIPANT-SPECIFIC NOTES --
  if (plan.participantNotes) {
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margin, yPos - 4, contentWidth, 10, 2, 2, "F");
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text("PARTICIPANT-SPECIFIC NOTES", margin + 4, yPos + 3);
    yPos += 14;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);
    const noteLines = doc.splitTextToSize(plan.participantNotes, contentWidth);
    doc.text(noteLines, margin, yPos);
  }

  // -- FOOTER ON EVERY PAGE --
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
    doc.line(margin, pageHeight - 18, pageWidth - margin, pageHeight - 18);

    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Document Version: ${plan.version || "1.0"} | Last Reviewed: ${formatDateForPdf(plan.lastReviewedDate)} | Next Review: ${formatDateForPdf(plan.nextReviewDate)}`,
      margin,
      pageHeight - 12
    );
    doc.text(`Page ${i} of ${totalPages}`, margin, pageHeight - 7);
    doc.text(`Generated by ${orgName || "MySDAManager"} on ${generatedDate}`, pageWidth - margin, pageHeight - 7, {
      align: "right",
    });
  }

  // -- DOWNLOAD --
  const safePropertyName = (property.propertyName || property.addressLine1 || "Unknown")
    .replace(/[^a-zA-Z0-9]/g, "_");
  const version = (plan.version || "1.0").replace(/\./g, "_");
  doc.save(`Emergency_Plan_${safePropertyName}_v${version}.pdf`);
}
