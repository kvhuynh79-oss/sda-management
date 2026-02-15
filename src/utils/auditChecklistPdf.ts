import jsPDF from "jspdf";

/** Render the shield-house logo SVG to a PNG data URL via canvas. */
function renderLogoToDataUrl(): Promise<string> {
  return new Promise((resolve, reject) => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 48" width="132" height="144" fill="none">
      <path d="M22 2L4 10v12c0 11 7.7 21.3 18 24 10.3-2.7 18-13 18-24V10L22 2z" fill="white" opacity="0.3"/>
      <path d="M22 2L4 10v12c0 11 7.7 21.3 18 24 10.3-2.7 18-13 18-24V10L22 2z" stroke="white" stroke-width="2.5" fill="none" stroke-linejoin="round"/>
      <path d="M22 14l-10 8h3v8h5v-5h4v5h5v-8h3L22 14z" fill="white"/>
    </svg>`;
    const img = new Image();
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 132;
      canvas.height = 144;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("No canvas context")); return; }
      ctx.drawImage(img, 0, 0, 132, 144);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Logo render failed"));
    };
    img.src = url;
  });
}

/**
 * Generate a branded 12-point NDIS SDA Audit Readiness Checklist PDF.
 * Used as a lead magnet on the landing page.
 */
export async function generateAuditChecklistPdf(leadName: string): Promise<void> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = 0;

  // --- Header band ---
  doc.setFillColor(13, 148, 136); // teal-600
  doc.rect(0, 0, pageWidth, 42, "F");

  // Logo icon
  const textX = margin;
  let logoOffset = 0;
  try {
    const logoDataUrl = await renderLogoToDataUrl();
    doc.addImage(logoDataUrl, "PNG", margin, 5, 11, 12);
    logoOffset = 14;
  } catch {
    // Fallback: no logo icon, just text
  }

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("MySDAManager", textX + logoOffset, 18);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("NDIS SDA Compliance & Property Management Software", textX + logoOffset, 26);

  doc.setFontSize(9);
  doc.text("mysdamanager.com", textX + logoOffset, 34);

  // --- Title ---
  y = 56;
  doc.setTextColor(17, 24, 39); // gray-900
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("2026 NDIS SDA Audit", margin, y);
  y += 8;
  doc.text("Readiness Checklist", margin, y);

  y += 10;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(107, 114, 128); // gray-500
  doc.text(`Prepared for: ${leadName}`, margin, y);
  y += 5;
  doc.text(`Generated: ${new Date().toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}`, margin, y);

  // --- Intro paragraph ---
  y += 12;
  doc.setTextColor(55, 65, 81); // gray-700
  doc.setFontSize(10);
  const intro = "This checklist covers the 12 key evidence areas the NDIS Quality & Safeguards Commission will assess during an SDA provider audit. Use it to identify gaps in your compliance posture before an auditor does.";
  const introLines = doc.splitTextToSize(intro, contentWidth);
  doc.text(introLines, margin, y);
  y += introLines.length * 5 + 6;

  // --- Checklist items ---
  const items = [
    {
      title: "1. Participant Consent Forms",
      desc: "Current, signed consent forms for every participant covering data collection, sharing, and service delivery. Must comply with Australian Privacy Principle (APP) 3.",
    },
    {
      title: "2. Fire Safety Statements (FP1500)",
      desc: "Current Annual Fire Safety Statements for every property. Expired certificates are an immediate non-compliance finding.",
    },
    {
      title: "3. Incident Register & Chain of Custody",
      desc: "Timestamped incident reports with documented notification chain: who was notified, when, and what actions were taken within 24-hour and 5-day windows.",
    },
    {
      title: "4. Complaints Register",
      desc: "Written complaints handling procedure aligned with NDIS Commission guidelines. Every complaint acknowledged within required timeframes with documented resolution.",
    },
    {
      title: "5. Maintenance Logs & Evidence",
      desc: "Documented reactive and preventative maintenance with dated photos, contractor details, completion evidence, and costs.",
    },
    {
      title: "6. Participant Plans & Funding",
      desc: "Current NDIS plan details for every participant including plan dates, SDA funding levels, and plan review dates.",
    },
    {
      title: "7. Staff Screening & Worker Checks",
      desc: "Current NDIS Worker Screening Check clearances for all staff. Documented training records and compliance with NDIS Practice Standards.",
    },
    {
      title: "8. Insurance Certificates",
      desc: "Current public liability, professional indemnity, and building insurance certificates with renewal dates tracked.",
    },
    {
      title: "9. Privacy Policy & Data Handling",
      desc: "Written privacy policy compliant with the Australian Privacy Act 1988 and the 13 Australian Privacy Principles. Accessible to all participants.",
    },
    {
      title: "10. Emergency Plans (EMP & BCP)",
      desc: "Emergency Management Plans for each property and a Business Continuity Plan. Documented testing and drill records.",
    },
    {
      title: "11. Audit Log Integrity",
      desc: "Immutable, timestamped records of all system changes: who accessed what, when, and what was modified. Essential for chain of custody evidence.",
    },
    {
      title: "12. Document Expiry Tracking",
      desc: "Systematic tracking of every document with an expiry date: certifications, plans, insurance, screening checks. Automated alerts before expiry.",
    },
  ];

  for (const item of items) {
    // Check if we need a new page
    if (y > 255) {
      doc.addPage();
      y = 20;
    }

    // Checkbox
    doc.setDrawColor(209, 213, 219); // gray-300
    doc.setLineWidth(0.4);
    doc.rect(margin, y - 3.5, 4, 4);

    // Title
    doc.setTextColor(17, 24, 39);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(item.title, margin + 7, y);
    y += 5;

    // Description
    doc.setFont("helvetica", "normal");
    doc.setTextColor(75, 85, 99); // gray-600
    doc.setFontSize(9);
    const descLines = doc.splitTextToSize(item.desc, contentWidth - 7);
    doc.text(descLines, margin + 7, y);
    y += descLines.length * 4.2 + 5;
  }

  // --- Footer CTA ---
  if (y > 240) {
    doc.addPage();
    y = 20;
  }

  y += 5;
  doc.setDrawColor(13, 148, 136);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  doc.setTextColor(17, 24, 39);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Can you prove all 12 in 15 minutes?", margin, y);
  y += 7;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(75, 85, 99);
  const cta = "MySDAManager automates evidence collection, expiry tracking, and audit pack generation for SDA and SIL providers. Start your free trial at mysdamanager.com";
  const ctaLines = doc.splitTextToSize(cta, contentWidth);
  doc.text(ctaLines, margin, y);
  y += ctaLines.length * 5 + 8;

  doc.setTextColor(13, 148, 136);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("mysdamanager.com/register", margin, y);

  // --- Page footer ---
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(156, 163, 175);
    doc.text(
      `MySDAManager — 2026 NDIS SDA Audit Readiness Checklist — Page ${i} of ${pageCount}`,
      pageWidth / 2,
      287,
      { align: "center" }
    );
  }

  doc.save("MySDAManager-2026-NDIS-Audit-Checklist.pdf");
}
