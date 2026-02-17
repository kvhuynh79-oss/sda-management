import jsPDF from "jspdf";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface InvoiceLineItem {
  description: string; // Multi-line text (use \n for line breaks)
  quantity: number;
  unitPrice: number;
  gst: string; // e.g. "GST Free"
  amount: number;
}

export interface InvoiceParams {
  // Provider details
  providerName: string; // "Better Living Solutions PTY LTD"
  providerAbn: string; // "87 630 237 277"
  providerAddress: string; // Registered office (for footer)
  providerBillingAddress: string; // Billing address (right column, multi-line with \n)
  providerPhone: string;
  logoUrl?: string; // Base64 data URL of org logo

  // Bank details
  bankAccountName: string;
  bankBsb: string;
  bankAccountNumber: string;

  // Invoice details
  invoiceNumber: string;
  invoiceDate: string; // "19 Jan 2026" format
  dueDate: string;
  reference: string; // "SDA payments" or "Faith Tofilau - MTA"

  // Customer (participant)
  customerName: string;
  customerAddress: string; // Multi-line with \n

  // Line items
  lineItems: InvoiceLineItem[];

  // Totals
  subtotal: number;
  totalAmount: number;
  amountPaid?: number;
  amountDue: number;
}

// ---------------------------------------------------------------------------
// Layout constants
// ---------------------------------------------------------------------------

const PW = 210; // page width (A4 portrait)
const PH = 297; // page height
const ML = 15; // margin left
const MR = 15; // margin right
const CW = PW - ML - MR; // content width

// Three-column header X positions
const LEFT_COL_X = ML;
const CENTER_COL_X = 78;
const RIGHT_COL_X = 145;

// Line-items table column layout
const COL_DESC_X = ML;
const COL_DESC_W = 88;
const COL_QTY_X = COL_DESC_X + COL_DESC_W;
const COL_QTY_W = 22;
const COL_PRICE_X = COL_QTY_X + COL_QTY_W;
const COL_PRICE_W = 25;
const COL_GST_X = COL_PRICE_X + COL_PRICE_W;
const TABLE_RIGHT = PW - MR;

// Colors
const DARK_TEXT: [number, number, number] = [40, 40, 40];
const GRAY_LABEL: [number, number, number] = [110, 110, 110];
const HEADER_BG: [number, number, number] = [80, 80, 80];
const LIGHT_LINE: [number, number, number] = [200, 200, 200];
const FOOTER_GRAY: [number, number, number] = [130, 130, 130];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format a number as currency without the $ sign (e.g. "3,758.42"). */
function fmt(amount: number): string {
  return new Intl.NumberFormat("en-AU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Format quantity with 2 decimal places. */
function fmtQty(n: number): string {
  return n.toFixed(2);
}

/** Draw a thin horizontal line. */
function hline(
  doc: jsPDF,
  y: number,
  color: [number, number, number] = LIGHT_LINE,
  width = 0.3,
  x1 = ML,
  x2 = PW - MR
): void {
  doc.setDrawColor(...color);
  doc.setLineWidth(width);
  doc.line(x1, y, x2, y);
}

/** Draw the footer that appears on every page. */
function drawFooter(doc: jsPDF, abn: string, address: string): void {
  const fy = PH - 10;
  hline(doc, fy - 3, [180, 180, 180], 0.2);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...FOOTER_GRAY);
  const txt = abn
    ? `ABN: ${abn}.  Registered Office: ${address}`
    : `Registered Office: ${address}`;
  doc.text(txt, PW / 2, fy, { align: "center" });
}

/** Draw the dark table header bar. Returns the y after the header. */
function drawTableHeader(doc: jsPDF, y: number): number {
  const hh = 9; // header height

  // 2-pass: draw filled rect first, then all text on top
  doc.setFillColor(...HEADER_BG);
  doc.rect(COL_DESC_X, y, CW, hh, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  const ty = y + 6;
  doc.text("Description", COL_DESC_X + 3, ty);
  doc.text("Quantity", COL_QTY_X + COL_QTY_W - 2, ty, { align: "right" });
  doc.text("Unit Price", COL_PRICE_X + COL_PRICE_W - 2, ty, { align: "right" });
  doc.text("GST", COL_GST_X + 2, ty);
  doc.text("Amount AUD", TABLE_RIGHT - 2, ty, { align: "right" });

  return y + hh;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Generate a Xero-style Tax Invoice PDF and trigger a browser download.
 *
 * Page 1: Tax Invoice with header info, line items table, totals, payment details.
 * Page 2: Payment Advice tear-off slip.
 */
export async function generateInvoicePdf(params: InvoiceParams): Promise<void> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  // =========================================================================
  // PAGE 1 - TAX INVOICE
  // =========================================================================

  // --- Logo (top-right corner, ~35x25mm) ---
  if (params.logoUrl) {
    try {
      doc.addImage(params.logoUrl, "PNG", PW - MR - 38, 10, 38, 25);
    } catch {
      // Logo failed to load - continue without it
    }
  }

  // --- "TAX INVOICE" title (top-left, large bold) ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.setTextColor(50, 50, 50);
  doc.text("TAX INVOICE", ML, 25);

  // =========================================================================
  // THREE-COLUMN HEADER AREA (y ~ 42 to ~110)
  // =========================================================================

  const headerStartY = 42;

  // ----- LEFT COLUMN: Customer / participant address -----
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...DARK_TEXT);
  let leftY = headerStartY;

  // Customer name
  if (params.customerName) {
    doc.text(params.customerName, LEFT_COL_X, leftY);
    leftY += 6;
  }
  // Address lines
  const addrLines = params.customerAddress
    ? params.customerAddress.split("\n").filter(Boolean)
    : [];
  for (const line of addrLines) {
    doc.text(line.trim(), LEFT_COL_X, leftY);
    leftY += 5.5;
  }

  // ----- CENTER COLUMN: Invoice metadata (label + value pairs) -----
  let centerY = headerStartY;
  const metaFields: [string, string][] = [
    ["Invoice Date", params.invoiceDate],
    ["Invoice Number", params.invoiceNumber],
    ["Reference", params.reference],
    ["ABN", params.providerAbn],
  ];

  for (const [label, value] of metaFields) {
    // Label (small, bold, gray)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...GRAY_LABEL);
    doc.text(label, CENTER_COL_X, centerY);
    centerY += 4.5;

    // Value (normal, dark, slightly larger)
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...DARK_TEXT);
    doc.text(value || "", CENTER_COL_X, centerY);
    centerY += 10;
  }

  // ----- RIGHT COLUMN: Provider name and address -----
  let rightY = headerStartY;
  const rightColMaxW = PW - MR - RIGHT_COL_X; // available width for right column

  const provLines = params.providerBillingAddress
    ? params.providerBillingAddress.split("\n").filter(Boolean)
    : [];

  // First line = provider name (bold), remaining lines = address (normal)
  for (let i = 0; i < provLines.length; i++) {
    const line = provLines[i].trim();
    if (!line) continue;

    if (i === 0) {
      // Provider name - bold, may need wrapping if long
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...DARK_TEXT);
      const nameWrapped: string[] = doc.splitTextToSize(line, rightColMaxW);
      for (const nl of nameWrapped) {
        doc.text(nl, RIGHT_COL_X, rightY);
        rightY += 5;
      }
    } else {
      // Address lines - normal, wrap if needed
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...DARK_TEXT);
      const addrWrapped: string[] = doc.splitTextToSize(line, rightColMaxW);
      for (const al of addrWrapped) {
        doc.text(al, RIGHT_COL_X, rightY);
        rightY += 5;
      }
    }
  }

  // Phone below address
  if (params.providerPhone) {
    rightY += 1;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...DARK_TEXT);
    doc.text(params.providerPhone, RIGHT_COL_X, rightY);
    rightY += 5;
  }

  // =========================================================================
  // LINE ITEMS TABLE
  // =========================================================================

  // Start table below the tallest column with some padding
  let y = Math.max(leftY, centerY, rightY) + 10;

  // Ensure minimum starting position so table doesn't overlap headers
  y = Math.max(y, 115);

  // Draw table header
  y = drawTableHeader(doc, y);

  // --- Table rows ---
  const rowPadTop = 4;
  const rowPadBot = 4;
  const descFontSize = 9;
  const lineH = 4; // vertical space per line of description

  for (let i = 0; i < params.lineItems.length; i++) {
    const item = params.lineItems[i];

    // Wrap description text
    doc.setFont("helvetica", "normal");
    doc.setFontSize(descFontSize);
    const descLines: string[] = [];
    const rawLines = item.description.split("\n");
    for (const rawLine of rawLines) {
      const wrapped = doc.splitTextToSize(rawLine, COL_DESC_W - 6);
      descLines.push(...wrapped);
    }

    // Row height
    const descHeight = descLines.length * lineH;
    const rowH = Math.max(descHeight + rowPadTop + rowPadBot, 12);

    // Page overflow check: leave ~80mm for totals + payment + footer
    if (y + rowH > PH - 80) {
      drawFooter(doc, params.providerAbn, params.providerAddress);
      doc.addPage();
      y = 18;
      y = drawTableHeader(doc, y);
    }

    // Alternate row background
    if (i % 2 === 0) {
      doc.setFillColor(248, 248, 248);
      doc.rect(COL_DESC_X, y, CW, rowH, "F");
    }

    // Row bottom border
    hline(doc, y + rowH, [220, 220, 220], 0.15);

    // Description text
    doc.setFont("helvetica", "normal");
    doc.setFontSize(descFontSize);
    doc.setTextColor(...DARK_TEXT);
    let textY = y + rowPadTop + 3;
    for (const line of descLines) {
      doc.text(line, COL_DESC_X + 3, textY);
      textY += lineH;
    }

    // Vertically centered Y for numeric columns
    const midY = y + rowH / 2 + 1;

    // Quantity
    doc.setFontSize(descFontSize);
    doc.text(fmtQty(item.quantity), COL_QTY_X + COL_QTY_W - 2, midY, { align: "right" });

    // Unit Price
    doc.text(fmt(item.unitPrice), COL_PRICE_X + COL_PRICE_W - 2, midY, { align: "right" });

    // GST
    doc.setFontSize(8);
    doc.text(item.gst, COL_GST_X + 2, midY);

    // Amount
    doc.setFontSize(descFontSize);
    doc.text(fmt(item.amount), TABLE_RIGHT - 2, midY, { align: "right" });

    y += rowH;
  }

  // Bottom border of table
  hline(doc, y, [80, 80, 80], 0.5);

  // =========================================================================
  // TOTALS SECTION (right-aligned below table)
  // =========================================================================

  y += 8;
  const totalsLabelX = COL_GST_X - 5;
  const totalsValueX = TABLE_RIGHT - 2;

  // Subtotal
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...GRAY_LABEL);
  doc.text("Subtotal", totalsLabelX, y);
  doc.setTextColor(...DARK_TEXT);
  doc.text(fmt(params.subtotal), totalsValueX, y, { align: "right" });
  y += 7;

  // Gap above total
  y += 2;

  // TOTAL AUD
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(50, 50, 50);
  doc.text("TOTAL AUD", totalsLabelX, y);
  doc.text(fmt(params.totalAmount), totalsValueX, y, { align: "right" });
  y += 7;

  // Less Amount Paid (optional)
  if (params.amountPaid !== undefined && params.amountPaid > 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...GRAY_LABEL);
    doc.text("Less Amount Paid", totalsLabelX, y);
    doc.setTextColor(...DARK_TEXT);
    doc.text(fmt(params.amountPaid), totalsValueX, y, { align: "right" });
    y += 7;

    // Gap above amount due
    y += 2;

    // AMOUNT DUE AUD
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(50, 50, 50);
    doc.text("AMOUNT DUE AUD", totalsLabelX, y);
    doc.text(fmt(params.amountDue), totalsValueX, y, { align: "right" });
    y += 7;
  }

  // =========================================================================
  // PAYMENT DETAILS (bottom-left of page 1)
  // =========================================================================

  // Position payment section: either below totals with spacing, or at a
  // fixed position if there's lots of empty space
  y = Math.max(y + 12, PH - 62);

  hline(doc, y, [180, 180, 180], 0.3);
  y += 7;

  // Due Date (bold, prominent)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(50, 50, 50);
  doc.text(`Due Date: ${params.dueDate}`, ML, y);
  y += 7;

  // EFT label
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("EFT:", ML, y);
  y += 6;

  // Bank details - measure ALL label widths while STILL in bold to avoid
  // the jsPDF getTextWidth font mismatch issue
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  const lbl1 = "Account Name: ";
  const lbl2 = "BSB: ";
  const lbl3 = "ACC: ";
  const lbl1w = doc.getTextWidth(lbl1);
  const lbl2w = doc.getTextWidth(lbl2);
  const lbl3w = doc.getTextWidth(lbl3);

  // Account Name
  doc.setFont("helvetica", "bold");
  doc.text(lbl1, ML, y);
  doc.setFont("helvetica", "normal");
  doc.text(params.bankAccountName || "", ML + lbl1w, y);
  y += 5;

  // BSB
  doc.setFont("helvetica", "bold");
  doc.text(lbl2, ML, y);
  doc.setFont("helvetica", "normal");
  doc.text(params.bankBsb || "", ML + lbl2w, y);
  y += 5;

  // ACC
  doc.setFont("helvetica", "bold");
  doc.text(lbl3, ML, y);
  doc.setFont("helvetica", "normal");
  doc.text(params.bankAccountNumber || "", ML + lbl3w, y);

  // --- Page 1 footer ---
  drawFooter(doc, params.providerAbn, params.providerAddress);

  // =========================================================================
  // PAGE 2 - PAYMENT ADVICE
  // =========================================================================

  doc.addPage();
  y = 15;

  // --- Dashed cut line with scissors ---
  doc.setDrawColor(150, 150, 150);
  doc.setLineWidth(0.3);
  doc.setLineDashPattern([3, 2], 0);
  doc.line(ML, y, PW - MR, y);
  doc.setLineDashPattern([], 0);

  // Scissors symbol
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(150, 150, 150);
  doc.text("\u2702", ML - 3, y + 1);

  y += 14;

  // --- "PAYMENT ADVICE" title ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(50, 50, 50);
  doc.text("PAYMENT ADVICE", ML, y);
  y += 16;

  // --- "To:" block (left side) ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...GRAY_LABEL);
  doc.text("To:", ML, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...DARK_TEXT);
  let toY = y + 6;
  // providerBillingAddress already includes the provider name as its first line,
  // so we don't prepend providerName separately to avoid duplication.
  const toLines = [
    ...params.providerBillingAddress.split("\n").filter(Boolean),
    params.providerPhone,
  ].filter(Boolean);
  for (const line of toLines) {
    doc.text(line, ML + 4, toY);
    toY += 5;
  }

  // --- Info table (right side) with alternating row backgrounds ---
  const infoX = 115;
  const infoValX = 165;
  let infoY = y;
  const infoRowH = 9;

  const infoRows: [string, string][] = [
    ["Customer", params.customerName],
    ["Invoice Number", params.invoiceNumber],
    ["Amount Due", fmt(params.amountDue)],
    ["Due Date", params.dueDate],
  ];

  for (let ri = 0; ri < infoRows.length; ri++) {
    const [label, value] = infoRows[ri];

    // Alternating background
    if (ri % 2 === 0) {
      doc.setFillColor(245, 245, 245);
      doc.rect(infoX - 2, infoY - 4.5, 82, infoRowH, "F");
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...GRAY_LABEL);
    doc.text(label, infoX, infoY);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(...DARK_TEXT);
    doc.text(value || "", infoValX, infoY);

    infoY += infoRowH;
  }

  // "Amount Enclosed" row
  doc.setFillColor(245, 245, 245);
  doc.rect(infoX - 2, infoY - 4.5, 82, infoRowH, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...GRAY_LABEL);
  doc.text("Amount Enclosed", infoX, infoY);

  // Underline for manual writing
  hline(doc, infoY + 1.5, [180, 180, 180], 0.3, infoValX, infoValX + 28);
  infoY += 6;

  // Helper text
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.setTextColor(140, 140, 140);
  doc.text("Enter the amount you are paying above", infoValX, infoY);

  // --- Page 2 footer ---
  drawFooter(doc, params.providerAbn, params.providerAddress);

  // =========================================================================
  // SAVE
  // =========================================================================

  const customerLastName = params.customerName.split(" ").pop() || "Customer";
  const safeInvoiceNum = params.invoiceNumber.replace(/[^a-zA-Z0-9-]/g, "");
  doc.save(`Invoice_${safeInvoiceNum}_${customerLastName}.pdf`);
}
