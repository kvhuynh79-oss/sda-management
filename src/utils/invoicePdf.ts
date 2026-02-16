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
  invoiceDate: string; // "10 Nov 2025" format
  dueDate: string;
  reference: string; // "Faith Tofilau - SDA" or "Faith Tofilau - MTA"

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
// Helpers
// ---------------------------------------------------------------------------

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN_LEFT = 15;
const MARGIN_RIGHT = 15;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

/** Format a number as AUD currency without the $ sign (e.g. "3,670.33"). */
function fmtCurrency(amount: number): string {
  return new Intl.NumberFormat("en-AU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Format quantity with 2 decimal places. */
function fmtQty(n: number): string {
  return n.toFixed(2);
}

/** Draw a thin horizontal line across the content area. */
function drawHLine(
  doc: jsPDF,
  y: number,
  color: [number, number, number] = [200, 200, 200],
  lineWidth = 0.3,
  x1 = MARGIN_LEFT,
  x2 = PAGE_WIDTH - MARGIN_RIGHT
): void {
  doc.setDrawColor(...color);
  doc.setLineWidth(lineWidth);
  doc.line(x1, y, x2, y);
}

/** Draw the footer line that appears on every page. */
function drawPageFooter(doc: jsPDF, providerAbn: string, providerAddress: string): void {
  const footerY = PAGE_HEIGHT - 10;
  drawHLine(doc, footerY - 3, [180, 180, 180], 0.2);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  const footerText = `ABN: ${providerAbn}.  Registered Office: ${providerAddress}`;
  doc.text(footerText, PAGE_WIDTH / 2, footerY, { align: "center" });
}

// ---------------------------------------------------------------------------
// Column layout constants for the line-items table
// ---------------------------------------------------------------------------

// Column positions (x) and widths
const COL_DESC_X = MARGIN_LEFT;
const COL_DESC_W = 90;
const COL_QTY_X = COL_DESC_X + COL_DESC_W;
const COL_QTY_W = 20;
const COL_PRICE_X = COL_QTY_X + COL_QTY_W;
const COL_PRICE_W = 25;
const COL_GST_X = COL_PRICE_X + COL_PRICE_W;
const COL_GST_W = 22;
const TABLE_RIGHT = PAGE_WIDTH - MARGIN_RIGHT;

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Generate a Xero-style Tax Invoice PDF and trigger a browser download.
 *
 * Page 1: Tax Invoice with header info, line items table, totals, and payment details.
 * Page 2: Payment Advice tear-off slip.
 */
export async function generateInvoicePdf(params: InvoiceParams): Promise<void> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  // =========================================================================
  // PAGE 1 - TAX INVOICE
  // =========================================================================

  let y = 18;

  // --- Logo (top-right) ---
  if (params.logoUrl) {
    try {
      doc.addImage(params.logoUrl, "PNG", PAGE_WIDTH - MARGIN_RIGHT - 40, 10, 40, 20);
    } catch {
      // Logo failed to load - continue without it
    }
  }

  // --- "TAX INVOICE" title (top-left) ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.setTextColor(50, 50, 50);
  doc.text("TAX INVOICE", MARGIN_LEFT, y);
  y += 12;

  // --- Customer address block (left column) ---
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(40, 40, 40);
  const customerLines = params.customerName
    ? [params.customerName, ...params.customerAddress.split("\n")]
    : params.customerAddress.split("\n");
  for (const line of customerLines) {
    doc.text(line, MARGIN_LEFT, y);
    y += 4;
  }

  // --- Centre column: Invoice metadata ---
  const centreX = 80;
  let metaY = 30;

  const metaFields: [string, string][] = [
    ["Invoice Date", params.invoiceDate],
    ["Invoice Number", params.invoiceNumber],
    ["Reference", params.reference],
    ["ABN", params.providerAbn],
  ];

  doc.setFontSize(8);
  for (const [label, value] of metaFields) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 100, 100);
    doc.text(label, centreX, metaY);
    metaY += 4;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(40, 40, 40);
    doc.text(value, centreX, metaY);
    metaY += 7;
  }

  // --- Right column: Provider address ---
  const rightX = 140;
  let provY = 30;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(40, 40, 40);
  const providerAddrLines = params.providerBillingAddress.split("\n");
  for (const line of providerAddrLines) {
    doc.text(line, rightX, provY);
    provY += 4;
  }
  // Phone below address
  provY += 1;
  doc.text(params.providerPhone, rightX, provY);

  // Move y past the three-column header area
  y = Math.max(y, metaY, provY) + 8;

  // =========================================================================
  // LINE ITEMS TABLE
  // =========================================================================

  // --- Table header ---
  const headerH = 8;
  const headerY = y;

  // 2-pass: first draw all header fill rects, then draw all header text
  doc.setFillColor(80, 80, 80);
  doc.rect(COL_DESC_X, headerY, CONTENT_WIDTH, headerH, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  const headerTextY = headerY + 5.5;
  doc.text("Description", COL_DESC_X + 2, headerTextY);
  doc.text("Quantity", COL_QTY_X + COL_QTY_W - 2, headerTextY, { align: "right" });
  doc.text("Unit Price", COL_PRICE_X + COL_PRICE_W - 2, headerTextY, { align: "right" });
  doc.text("GST", COL_GST_X + 2, headerTextY);
  doc.text("Amount AUD", TABLE_RIGHT - 2, headerTextY, { align: "right" });

  y = headerY + headerH;

  // --- Table rows ---
  doc.setTextColor(40, 40, 40);
  const lineItemTopPad = 3;
  const lineItemBottomPad = 3;
  const lineItemFontSize = 8;
  const lineSpacing = 3.5; // vertical space per line of description text

  for (let i = 0; i < params.lineItems.length; i++) {
    const item = params.lineItems[i];

    // Split description into wrapped lines
    doc.setFont("helvetica", "normal");
    doc.setFontSize(lineItemFontSize);
    const descLines: string[] = [];
    const rawLines = item.description.split("\n");
    for (const rawLine of rawLines) {
      const wrapped = doc.splitTextToSize(rawLine, COL_DESC_W - 4);
      descLines.push(...wrapped);
    }

    // Calculate row height
    const descHeight = descLines.length * lineSpacing;
    const rowH = Math.max(descHeight + lineItemTopPad + lineItemBottomPad, 10);

    // Check for page overflow: leave space for totals + payment + footer (~80mm)
    if (y + rowH > PAGE_HEIGHT - 80) {
      drawPageFooter(doc, params.providerAbn, params.providerAddress);
      doc.addPage();
      y = 18;

      // Redraw table header on new page
      doc.setFillColor(80, 80, 80);
      doc.rect(COL_DESC_X, y, CONTENT_WIDTH, headerH, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      const hTextY = y + 5.5;
      doc.text("Description", COL_DESC_X + 2, hTextY);
      doc.text("Quantity", COL_QTY_X + COL_QTY_W - 2, hTextY, { align: "right" });
      doc.text("Unit Price", COL_PRICE_X + COL_PRICE_W - 2, hTextY, { align: "right" });
      doc.text("GST", COL_GST_X + 2, hTextY);
      doc.text("Amount AUD", TABLE_RIGHT - 2, hTextY, { align: "right" });
      y += headerH;
      doc.setTextColor(40, 40, 40);
    }

    // Alternate row background
    if (i % 2 === 0) {
      doc.setFillColor(248, 248, 248);
      doc.rect(COL_DESC_X, y, CONTENT_WIDTH, rowH, "F");
    }

    // Row border (bottom)
    drawHLine(doc, y + rowH, [220, 220, 220], 0.15);

    // Description text
    doc.setFont("helvetica", "normal");
    doc.setFontSize(lineItemFontSize);
    doc.setTextColor(40, 40, 40);
    let textY = y + lineItemTopPad + 3;
    for (const line of descLines) {
      doc.text(line, COL_DESC_X + 2, textY);
      textY += lineSpacing;
    }

    // Quantity (vertically centred in row)
    const midY = y + rowH / 2 + 1;
    doc.text(fmtQty(item.quantity), COL_QTY_X + COL_QTY_W - 2, midY, { align: "right" });

    // Unit Price
    doc.text(fmtCurrency(item.unitPrice), COL_PRICE_X + COL_PRICE_W - 2, midY, {
      align: "right",
    });

    // GST
    doc.setFontSize(7.5);
    doc.text(item.gst, COL_GST_X + 2, midY);

    // Amount
    doc.setFontSize(lineItemFontSize);
    doc.text(fmtCurrency(item.amount), TABLE_RIGHT - 2, midY, { align: "right" });

    y += rowH;
  }

  // --- Bottom border of table ---
  drawHLine(doc, y, [80, 80, 80], 0.4);

  // =========================================================================
  // TOTALS SECTION (right-aligned below table)
  // =========================================================================

  y += 6;
  const totalsLabelX = COL_GST_X;
  const totalsValueX = TABLE_RIGHT - 2;
  const totalsLineH = 6;

  // Subtotal
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text("Subtotal", totalsLabelX, y);
  doc.setTextColor(40, 40, 40);
  doc.text(fmtCurrency(params.subtotal), totalsValueX, y, { align: "right" });
  y += totalsLineH;

  // TOTAL AUD
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(50, 50, 50);
  doc.text("TOTAL AUD", totalsLabelX, y);
  doc.text(fmtCurrency(params.totalAmount), totalsValueX, y, { align: "right" });
  y += totalsLineH;

  // Less Amount Paid (optional)
  if (params.amountPaid !== undefined && params.amountPaid > 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text("Less Amount Paid", totalsLabelX, y);
    doc.setTextColor(40, 40, 40);
    doc.text(fmtCurrency(params.amountPaid), totalsValueX, y, { align: "right" });
    y += totalsLineH;
  }

  // Amount Due
  if (params.amountPaid !== undefined && params.amountPaid > 0) {
    drawHLine(doc, y - 2, [150, 150, 150], 0.3, totalsLabelX, TABLE_RIGHT);
    y += 2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(50, 50, 50);
    doc.text("AMOUNT DUE AUD", totalsLabelX, y);
    doc.text(fmtCurrency(params.amountDue), totalsValueX, y, { align: "right" });
    y += totalsLineH;
  }

  // =========================================================================
  // PAYMENT DETAILS (bottom-left of page 1)
  // =========================================================================

  // Ensure enough space; if not, the payment section stays above the footer
  y = Math.max(y + 10, PAGE_HEIGHT - 60);

  drawHLine(doc, y, [180, 180, 180], 0.3);
  y += 6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(50, 50, 50);
  doc.text(`Due Date: ${params.dueDate}`, MARGIN_LEFT, y);
  y += 6;

  doc.text("EFT:", MARGIN_LEFT, y);
  y += 5;

  // Measure label widths while STILL bold, before switching
  doc.setFontSize(8.5);
  const accountNameLabel = "Account Name: ";
  const bsbLabel = "BSB: ";
  const accLabel = "ACC: ";
  const accountNameLabelW = doc.getTextWidth(accountNameLabel);
  const bsbLabelW = doc.getTextWidth(bsbLabel);
  const accLabelW = doc.getTextWidth(accLabel);

  // Account Name
  doc.setFont("helvetica", "bold");
  doc.text(accountNameLabel, MARGIN_LEFT, y);
  doc.setFont("helvetica", "normal");
  doc.text(params.bankAccountName, MARGIN_LEFT + accountNameLabelW, y);
  y += 4.5;

  // BSB
  doc.setFont("helvetica", "bold");
  doc.text(bsbLabel, MARGIN_LEFT, y);
  doc.setFont("helvetica", "normal");
  doc.text(params.bankBsb, MARGIN_LEFT + bsbLabelW, y);
  y += 4.5;

  // ACC
  doc.setFont("helvetica", "bold");
  doc.text(accLabel, MARGIN_LEFT, y);
  doc.setFont("helvetica", "normal");
  doc.text(params.bankAccountNumber, MARGIN_LEFT + accLabelW, y);

  // --- Page 1 footer ---
  drawPageFooter(doc, params.providerAbn, params.providerAddress);

  // =========================================================================
  // PAGE 2 - PAYMENT ADVICE
  // =========================================================================

  doc.addPage();
  y = 15;

  // --- Dashed cut line with scissors indicator ---
  doc.setDrawColor(150, 150, 150);
  doc.setLineWidth(0.3);
  doc.setLineDashPattern([3, 2], 0);
  doc.line(MARGIN_LEFT, y, PAGE_WIDTH - MARGIN_RIGHT, y);
  doc.setLineDashPattern([], 0); // reset dash

  // Scissors symbol
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(150, 150, 150);
  doc.text("\u2702", MARGIN_LEFT - 2, y + 1);

  y += 12;

  // --- "PAYMENT ADVICE" title ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(50, 50, 50);
  doc.text("PAYMENT ADVICE", MARGIN_LEFT, y);
  y += 14;

  // --- "To:" block (left side) ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text("To:", MARGIN_LEFT, y);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(40, 40, 40);
  let toY = y + 5;
  const toLines = [params.providerName, ...params.providerBillingAddress.split("\n"), params.providerPhone];
  for (const line of toLines) {
    doc.text(line, MARGIN_LEFT + 4, toY);
    toY += 4.5;
  }

  // --- Info table (right side) ---
  const infoX = 115;
  const infoValX = 165;
  let infoY = y;

  const infoRows: [string, string][] = [
    ["Customer", params.customerName],
    ["Invoice Number", params.invoiceNumber],
    ["Amount Due", fmtCurrency(params.amountDue)],
    ["Due Date", params.dueDate],
  ];

  for (let ri = 0; ri < infoRows.length; ri++) {
    const [label, value] = infoRows[ri];

    // Alternate row background
    if (ri % 2 === 0) {
      doc.setFillColor(245, 245, 245);
      doc.rect(infoX - 2, infoY - 4, 82, 8, "F");
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(80, 80, 80);
    doc.text(label, infoX, infoY);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(40, 40, 40);
    doc.text(value, infoValX, infoY);

    infoY += 8;
  }

  // "Amount Enclosed" line (blank for manual entry)
  doc.setFillColor(245, 245, 245);
  doc.rect(infoX - 2, infoY - 4, 82, 8, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(80, 80, 80);
  doc.text("Amount Enclosed", infoX, infoY);

  // Underline for writing
  drawHLine(doc, infoY + 1, [180, 180, 180], 0.3, infoValX, infoValX + 28);
  infoY += 5;

  // Small helper text
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.setTextColor(140, 140, 140);
  doc.text("Enter the amount you are paying above", infoValX, infoY);

  // --- Page 2 footer ---
  drawPageFooter(doc, params.providerAbn, params.providerAddress);

  // =========================================================================
  // SAVE
  // =========================================================================

  const customerLastName = params.customerName.split(" ").pop() || "Customer";
  const safeInvoiceNum = params.invoiceNumber.replace(/[^a-zA-Z0-9-]/g, "");
  doc.save(`Invoice_${safeInvoiceNum}_${customerLastName}.pdf`);
}
