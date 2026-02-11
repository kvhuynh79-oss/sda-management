import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ── Types ──────────────────────────────────────────────────

interface KeyPersonnel {
  name: string;
  role: string;
  phone: string;
  email?: string;
  responsibilities?: string;
}

interface CriticalService {
  service: string;
  provider: string;
  contactPhone?: string;
  contactEmail?: string;
  alternativeProvider?: string;
}

interface InsuranceDetail {
  type: string;
  provider: string;
  policyNumber?: string;
  coverage?: string;
  expiryDate?: string;
}

interface RiskScenario {
  scenario: string;
  likelihood: string;
  impact: string;
  riskLevel: string;
  mitigationSteps?: string;
  recoverySteps?: string;
  rto?: string;
}

interface RecoveryStep {
  step: string;
  description?: string;
  responsible?: string;
  completed?: boolean;
}

interface BusinessContinuityPlanData {
  status: string;
  version: string;
  lastReviewedDate?: string;
  nextReviewDate?: string;
  businessName: string;
  abn: string;
  address: string;
  phone: string;
  email: string;
  keyPersonnel: KeyPersonnel[];
  criticalServices: CriticalService[];
  insuranceDetails: InsuranceDetail[];
  riskScenarios: RiskScenario[];
  dataBackup: {
    method: string;
    frequency: string;
    storageLocation: string;
    responsiblePerson: string;
    lastTestedDate: string;
  };
  communicationPlan: {
    internalProcedure: string;
    externalProcedure: string;
    mediaResponsePlan: string;
  };
  recoveryChecklist: RecoveryStep[];
}

// ── Risk Level Calculation ─────────────────────────────────

function calculateRiskLevel(likelihood: string, impact: string): string {
  const likelihoodScores: Record<string, number> = {
    rare: 1,
    unlikely: 2,
    possible: 3,
    likely: 4,
    almost_certain: 5,
  };
  const impactScores: Record<string, number> = {
    insignificant: 1,
    minor: 2,
    moderate: 3,
    major: 4,
    catastrophic: 5,
  };
  const score =
    (likelihoodScores[likelihood] || 1) * (impactScores[impact] || 1);
  if (score <= 4) return "low";
  if (score <= 9) return "medium";
  if (score <= 15) return "high";
  return "extreme";
}

// ── Color Helpers ──────────────────────────────────────────

function getRiskLevelColor(level: string): [number, number, number] {
  switch (level) {
    case "low":
      return [34, 197, 94]; // green
    case "medium":
      return [234, 179, 8]; // yellow
    case "high":
      return [249, 115, 22]; // orange
    case "extreme":
      return [239, 68, 68]; // red
    default:
      return [156, 163, 175]; // gray
  }
}

function formatLabel(str: string): string {
  if (!str) return "";
  return str
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
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

// ── PDF Generation ─────────────────────────────────────────

export function generateBusinessContinuityPdf(
  plan: BusinessContinuityPlanData,
  orgName: string
): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  // ── COVER PAGE ───────────────────────────────────────────

  // Header bar
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(0, 0, pageWidth, 50, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(orgName || "MySDAManager", margin, 16);

  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("BUSINESS CONTINUITY PLAN", margin, 32);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Version ${plan.version || "1.0"}  |  Status: ${formatLabel(plan.status || "draft")}`,
    margin,
    43
  );

  // Plan metadata
  let yPos = 62;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);

  const metaRows = [
    ["Business Name", plan.businessName || "N/A"],
    ["ABN", plan.abn || "N/A"],
    ["Last Reviewed", formatDateForPdf(plan.lastReviewedDate)],
    ["Next Review Due", formatDateForPdf(plan.nextReviewDate)],
  ];

  autoTable(doc, {
    startY: yPos,
    body: metaRows,
    theme: "plain",
    styles: { fontSize: 10, cellPadding: 2 },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 40 },
      1: { cellWidth: contentWidth - 40 },
    },
    margin: { left: margin, right: margin },
  });

  yPos = (doc as any).lastAutoTable.finalY + 12;

  // ── TABLE OF CONTENTS ────────────────────────────────────

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text("TABLE OF CONTENTS", margin, yPos);
  yPos += 8;

  const tocItems = [
    "1. Business Details",
    "2. Key Personnel",
    "3. Critical Services & Providers",
    "4. Insurance Details",
    "5. Risk Assessment",
    "6. Data Backup Procedures",
    "7. Communication Plan",
    "8. Recovery Checklist",
  ];

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);
  for (const item of tocItems) {
    doc.text(item, margin + 4, yPos);
    yPos += 6;
  }

  // ── HELPER: Section Header ───────────────────────────────

  function addSectionHeader(title: string): number {
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    yPos += 8;
    doc.setFillColor(241, 245, 249); // slate-100
    doc.roundedRect(margin, yPos - 5, contentWidth, 10, 2, 2, "F");
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text(title, margin + 4, yPos + 2);
    yPos += 12;
    return yPos;
  }

  // ── SECTION 1: Business Details ──────────────────────────

  yPos = addSectionHeader("1. BUSINESS DETAILS");

  const businessRows = [
    ["Business Name", plan.businessName || "N/A"],
    ["ABN", plan.abn || "N/A"],
    ["Address", plan.address || "N/A"],
    ["Phone", plan.phone || "N/A"],
    ["Email", plan.email || "N/A"],
  ];

  autoTable(doc, {
    startY: yPos,
    body: businessRows,
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 40 },
      1: { cellWidth: contentWidth - 40 },
    },
    margin: { left: margin, right: margin },
  });

  yPos = (doc as any).lastAutoTable.finalY + 6;

  // ── SECTION 2: Key Personnel ─────────────────────────────

  yPos = addSectionHeader("2. KEY PERSONNEL");

  if (plan.keyPersonnel && plan.keyPersonnel.length > 0) {
    const personnelBody = plan.keyPersonnel.map((p) => [
      p.name || "-",
      p.role || "-",
      p.phone || "-",
      p.email || "-",
      p.responsibilities || "-",
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [["Name", "Role", "Phone", "Email", "Responsibilities"]],
      body: personnelBody,
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      columnStyles: {
        0: { cellWidth: contentWidth * 0.15 },
        1: { cellWidth: contentWidth * 0.15 },
        2: { cellWidth: contentWidth * 0.15 },
        3: { cellWidth: contentWidth * 0.2 },
        4: { cellWidth: contentWidth * 0.35 },
      },
      margin: { left: margin, right: margin },
    });

    yPos = (doc as any).lastAutoTable.finalY + 6;
  } else {
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(100, 100, 100);
    doc.text("No key personnel defined.", margin, yPos);
    yPos += 8;
  }

  // ── SECTION 3: Critical Services ─────────────────────────

  yPos = addSectionHeader("3. CRITICAL SERVICES & PROVIDERS");

  if (plan.criticalServices && plan.criticalServices.length > 0) {
    const servicesBody = plan.criticalServices.map((s) => [
      s.service || "-",
      s.provider || "-",
      s.contactPhone || "-",
      s.contactEmail || "-",
      s.alternativeProvider || "-",
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [["Service", "Provider", "Phone", "Email", "Alternative"]],
      body: servicesBody,
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      margin: { left: margin, right: margin },
    });

    yPos = (doc as any).lastAutoTable.finalY + 6;
  } else {
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(100, 100, 100);
    doc.text("No critical services defined.", margin, yPos);
    yPos += 8;
  }

  // ── SECTION 4: Insurance Details ─────────────────────────

  yPos = addSectionHeader("4. INSURANCE DETAILS");

  if (plan.insuranceDetails && plan.insuranceDetails.length > 0) {
    const insuranceBody = plan.insuranceDetails.map((ins) => [
      formatLabel(ins.type) || "-",
      ins.provider || "-",
      ins.policyNumber || "-",
      ins.coverage || "-",
      formatDateForPdf(ins.expiryDate),
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [["Type", "Provider", "Policy #", "Coverage", "Expiry"]],
      body: insuranceBody,
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      margin: { left: margin, right: margin },
    });

    yPos = (doc as any).lastAutoTable.finalY + 6;
  } else {
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(100, 100, 100);
    doc.text("No insurance details defined.", margin, yPos);
    yPos += 8;
  }

  // ── SECTION 5: Risk Assessment ───────────────────────────

  yPos = addSectionHeader("5. RISK ASSESSMENT");

  // 5x5 Risk Matrix summary
  if (yPos > 200) {
    doc.addPage();
    yPos = 20;
  }

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text("Risk Matrix", margin, yPos);
  yPos += 6;

  const matrixLikelihoods = [
    "Almost Certain",
    "Likely",
    "Possible",
    "Unlikely",
    "Rare",
  ];
  const matrixImpacts = [
    "Insignificant",
    "Minor",
    "Moderate",
    "Major",
    "Catastrophic",
  ];
  const matrixLikelihoodKeys = [
    "almost_certain",
    "likely",
    "possible",
    "unlikely",
    "rare",
  ];
  const matrixImpactKeys = [
    "insignificant",
    "minor",
    "moderate",
    "major",
    "catastrophic",
  ];

  const matrixBody = matrixLikelihoods.map((lLabel, li) => {
    const row = [lLabel];
    for (let ii = 0; ii < matrixImpacts.length; ii++) {
      const level = calculateRiskLevel(
        matrixLikelihoodKeys[li],
        matrixImpactKeys[ii]
      );
      row.push(formatLabel(level));
    }
    return row;
  });

  autoTable(doc, {
    startY: yPos,
    head: [
      ["Likelihood \\ Impact", ...matrixImpacts],
    ],
    body: matrixBody,
    theme: "grid",
    styles: { fontSize: 7, cellPadding: 2, halign: "center" },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: "center",
    },
    columnStyles: {
      0: { halign: "left", fontStyle: "bold", cellWidth: 30 },
    },
    margin: { left: margin, right: margin },
    didParseCell: (hookData) => {
      if (hookData.section === "body" && hookData.column.index > 0) {
        const cellText = String(hookData.cell.raw).toLowerCase();
        if (cellText === "low") {
          hookData.cell.styles.fillColor = [220, 252, 231]; // green-100
          hookData.cell.styles.textColor = [22, 101, 52]; // green-800
        } else if (cellText === "medium") {
          hookData.cell.styles.fillColor = [254, 249, 195]; // yellow-100
          hookData.cell.styles.textColor = [133, 77, 14]; // yellow-800
        } else if (cellText === "high") {
          hookData.cell.styles.fillColor = [255, 237, 213]; // orange-100
          hookData.cell.styles.textColor = [154, 52, 18]; // orange-800
        } else if (cellText === "extreme") {
          hookData.cell.styles.fillColor = [254, 226, 226]; // red-100
          hookData.cell.styles.textColor = [153, 27, 27]; // red-800
        }
      }
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 8;

  // Individual risk scenarios table
  if (plan.riskScenarios && plan.riskScenarios.length > 0) {
    if (yPos > 230) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text("Risk Scenarios", margin, yPos);
    yPos += 4;

    const riskBody = plan.riskScenarios.map((r) => {
      const level = r.riskLevel || calculateRiskLevel(r.likelihood, r.impact);
      return [
        r.scenario || "-",
        formatLabel(r.likelihood) || "-",
        formatLabel(r.impact) || "-",
        formatLabel(level),
        r.mitigationSteps || "-",
        r.recoverySteps || "-",
        r.rto || "-",
      ];
    });

    autoTable(doc, {
      startY: yPos,
      head: [
        [
          "Scenario",
          "Likelihood",
          "Impact",
          "Risk Level",
          "Mitigation",
          "Recovery",
          "RTO",
        ],
      ],
      body: riskBody,
      theme: "grid",
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      columnStyles: {
        0: { cellWidth: contentWidth * 0.14 },
        1: { cellWidth: contentWidth * 0.1 },
        2: { cellWidth: contentWidth * 0.1 },
        3: { cellWidth: contentWidth * 0.1 },
        4: { cellWidth: contentWidth * 0.22 },
        5: { cellWidth: contentWidth * 0.22 },
        6: { cellWidth: contentWidth * 0.12 },
      },
      margin: { left: margin, right: margin },
      didParseCell: (hookData) => {
        // Color the Risk Level column
        if (hookData.column.index === 3 && hookData.section === "body") {
          const cellText = String(hookData.cell.raw).toLowerCase();
          if (cellText === "low") {
            hookData.cell.styles.textColor = [22, 101, 52];
            hookData.cell.styles.fontStyle = "bold";
          } else if (cellText === "medium") {
            hookData.cell.styles.textColor = [133, 77, 14];
            hookData.cell.styles.fontStyle = "bold";
          } else if (cellText === "high") {
            hookData.cell.styles.textColor = [154, 52, 18];
            hookData.cell.styles.fontStyle = "bold";
          } else if (cellText === "extreme") {
            hookData.cell.styles.textColor = [153, 27, 27];
            hookData.cell.styles.fontStyle = "bold";
          }
        }
      },
    });

    yPos = (doc as any).lastAutoTable.finalY + 6;
  } else {
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(100, 100, 100);
    doc.text("No risk scenarios defined.", margin, yPos);
    yPos += 8;
  }

  // ── SECTION 6: Data Backup Procedures ────────────────────

  yPos = addSectionHeader("6. DATA BACKUP PROCEDURES");

  const backupRows = [
    ["Method", plan.dataBackup?.method || "N/A"],
    ["Frequency", formatLabel(plan.dataBackup?.frequency || "N/A")],
    ["Storage Location", plan.dataBackup?.storageLocation || "N/A"],
    ["Responsible Person", plan.dataBackup?.responsiblePerson || "N/A"],
    [
      "Last Tested",
      formatDateForPdf(plan.dataBackup?.lastTestedDate),
    ],
  ];

  autoTable(doc, {
    startY: yPos,
    body: backupRows,
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 40 },
      1: { cellWidth: contentWidth - 40 },
    },
    margin: { left: margin, right: margin },
  });

  yPos = (doc as any).lastAutoTable.finalY + 6;

  // ── SECTION 7: Communication Plan ────────────────────────

  yPos = addSectionHeader("7. COMMUNICATION PLAN");

  const commSections = [
    {
      title: "Internal Notification Procedure",
      text: plan.communicationPlan?.internalProcedure,
    },
    {
      title: "External Notification Procedure",
      text: plan.communicationPlan?.externalProcedure,
    },
    {
      title: "Media Response Plan",
      text: plan.communicationPlan?.mediaResponsePlan,
    },
  ];

  for (const section of commSections) {
    if (yPos > 255) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text(section.title, margin, yPos);
    yPos += 5;

    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);
    const text = section.text || "Not defined.";
    const lines = doc.splitTextToSize(text, contentWidth - 4);
    doc.text(lines, margin + 2, yPos);
    yPos += lines.length * 4.5 + 4;
  }

  // ── SECTION 8: Recovery Checklist ────────────────────────

  yPos = addSectionHeader("8. RECOVERY CHECKLIST");

  if (plan.recoveryChecklist && plan.recoveryChecklist.length > 0) {
    const checklistBody = plan.recoveryChecklist.map((step, idx) => [
      String(idx + 1),
      step.step || "-",
      step.description || "-",
      step.responsible || "-",
      step.completed ? "Complete" : "Pending",
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [["#", "Step", "Description", "Responsible", "Status"]],
      body: checklistBody,
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      columnStyles: {
        0: { cellWidth: 10, halign: "center" },
        1: { cellWidth: contentWidth * 0.2 },
        2: { cellWidth: contentWidth * 0.35 },
        3: { cellWidth: contentWidth * 0.2 },
        4: { cellWidth: contentWidth * 0.15, halign: "center" },
      },
      margin: { left: margin, right: margin },
      didParseCell: (hookData) => {
        if (hookData.column.index === 4 && hookData.section === "body") {
          const val = String(hookData.cell.raw);
          if (val === "Complete") {
            hookData.cell.styles.textColor = [22, 101, 52];
            hookData.cell.styles.fontStyle = "bold";
          } else {
            hookData.cell.styles.textColor = [133, 77, 14];
          }
        }
      },
    });

    yPos = (doc as any).lastAutoTable.finalY + 6;
  } else {
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(100, 100, 100);
    doc.text("No recovery checklist steps defined.", margin, yPos);
    yPos += 8;
  }

  // ── FOOTER ON EVERY PAGE ─────────────────────────────────

  const totalPages = doc.getNumberOfPages();

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const ph = doc.internal.pageSize.getHeight();

    doc.setDrawColor(200, 200, 200);
    doc.line(margin, ph - 15, pageWidth - margin, ph - 15);

    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.setFont("helvetica", "normal");

    const footerLeft = `CONFIDENTIAL | Version ${plan.version || "1.0"} | Last Reviewed: ${formatDateForPdf(plan.lastReviewedDate)}`;
    doc.text(footerLeft, margin, ph - 8);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, ph - 8, {
      align: "right",
    });
  }

  // ── DOWNLOAD ─────────────────────────────────────────────

  const version = (plan.version || "1.0").replace(/\./g, "_");
  doc.save(`Business_Continuity_Plan_v${version}.pdf`);
}

// Re-export the risk level calculation for use in UI
export { calculateRiskLevel };
