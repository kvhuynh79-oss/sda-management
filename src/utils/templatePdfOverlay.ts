/**
 * Template PDF Overlay Generator
 *
 * Uses pdf-lib to load a pre-designed PDF template (e.g., exported from Canva)
 * and overlay dynamic participant/organization text at specified coordinates.
 *
 * This module supports:
 * - Loading templates from a URL (Convex file storage) or local bytes
 * - Overlaying text fields at specified x/y positions per page
 * - Font size, color, alignment, and text wrapping options
 * - Fallback to the jsPDF-based generator when no template is available
 *
 * Coordinate system (pdf-lib):
 * - Origin (0,0) is bottom-left of the page
 * - x increases rightward, y increases upward
 * - A4 page: 595.28 x 841.89 points
 */

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

// ── Types ──────────────────────────────────────────────────

export interface FieldPosition {
  page: number;       // 0-indexed page number
  x: number;          // x position from left edge (points)
  y: number;          // y position from bottom edge (points)
  fontSize: number;   // font size in points
  maxWidth?: number;  // max width before text wrapping (points)
  color?: { r: number; g: number; b: number }; // RGB 0-1 scale
  alignment?: "left" | "center" | "right"; // text alignment (default: left)
  bold?: boolean;     // use bold font variant
}

export interface FieldMapping {
  fieldName: string;     // unique field identifier (e.g., "participantName")
  label: string;         // human-readable label for the editor
  position: FieldPosition;
}

export interface OverlayOptions {
  /** The template PDF as a Uint8Array */
  templateBytes: Uint8Array;
  /** Field mapping definitions with positions */
  fieldMap: FieldMapping[];
  /** Dynamic data: fieldName -> value */
  data: Record<string, string>;
}

// ── Default Field Mappings ─────────────────────────────────

const DARK_TEXT = { r: 0.15, g: 0.15, b: 0.15 };
const PURPLE_TEXT = { r: 0.427, g: 0.157, b: 0.851 };
const A4_WIDTH = 595.28;

/**
 * Default field map for the standard Easy Read Consent PDF template.
 * These positions are calibrated for a 12-page A4 Canva export with
 * a two-column layout (images left, text right).
 *
 * After uploading a new template, use the field editor to adjust positions.
 */
export const DEFAULT_EASY_READ_FIELD_MAP: FieldMapping[] = [
  // Page 1: Cover
  {
    fieldName: "coverOrgName",
    label: "Cover - Organization Name",
    position: { page: 0, x: A4_WIDTH / 2, y: 340, fontSize: 14, maxWidth: 400, color: DARK_TEXT, alignment: "center", bold: true },
  },
  {
    fieldName: "coverSubtitle",
    label: "Cover - Subtitle",
    position: { page: 0, x: A4_WIDTH / 2, y: 300, fontSize: 11, maxWidth: 400, color: DARK_TEXT, alignment: "center" },
  },
  // Page 3: What is this about?
  {
    fieldName: "aboutOrgName",
    label: "About - Organization Name",
    position: { page: 2, x: 230, y: 680, fontSize: 13, maxWidth: 330, color: DARK_TEXT, bold: true },
  },
  {
    fieldName: "aboutParticipantName",
    label: "About - Participant Name",
    position: { page: 2, x: 230, y: 620, fontSize: 13, maxWidth: 330, color: PURPLE_TEXT, bold: true },
  },
  {
    fieldName: "aboutPropertyAddress",
    label: "About - Property Address",
    position: { page: 2, x: 230, y: 560, fontSize: 12, maxWidth: 330, color: DARK_TEXT },
  },
  // Page 4: What we collect
  {
    fieldName: "collectNdisNumber",
    label: "Collect - NDIS Number",
    position: { page: 3, x: 230, y: 640, fontSize: 12, maxWidth: 330, color: DARK_TEXT },
  },
  {
    fieldName: "collectDob",
    label: "Collect - Date of Birth",
    position: { page: 3, x: 230, y: 600, fontSize: 12, maxWidth: 330, color: DARK_TEXT },
  },
  // Page 9: Signature
  {
    fieldName: "signParticipantName",
    label: "Signature - Participant Name",
    position: { page: 8, x: 80, y: 620, fontSize: 12, maxWidth: 250, color: DARK_TEXT, bold: true },
  },
  {
    fieldName: "signNdisNumber",
    label: "Signature - NDIS Number",
    position: { page: 8, x: 80, y: 580, fontSize: 12, maxWidth: 250, color: DARK_TEXT },
  },
  {
    fieldName: "signDate",
    label: "Signature - Date",
    position: { page: 8, x: 80, y: 540, fontSize: 12, maxWidth: 250, color: DARK_TEXT },
  },
  {
    fieldName: "signOrgName",
    label: "Signature - Organization Name",
    position: { page: 8, x: 80, y: 400, fontSize: 12, maxWidth: 250, color: DARK_TEXT, bold: true },
  },
  // Page 10: Complaints
  {
    fieldName: "complaintsOrgName",
    label: "Complaints - Organization Name",
    position: { page: 9, x: 230, y: 600, fontSize: 12, maxWidth: 330, color: DARK_TEXT, bold: true },
  },
  // Page 12: Contact Us
  {
    fieldName: "contactOrgName",
    label: "Contact - Organization Name",
    position: { page: 11, x: A4_WIDTH / 2, y: 580, fontSize: 14, maxWidth: 400, color: DARK_TEXT, alignment: "center", bold: true },
  },
  {
    fieldName: "contactAbn",
    label: "Contact - ABN",
    position: { page: 11, x: A4_WIDTH / 2, y: 550, fontSize: 11, maxWidth: 400, color: DARK_TEXT, alignment: "center" },
  },
];

// ── Core Overlay Function ──────────────────────────────────

/**
 * Generate a PDF by overlaying dynamic text onto a pre-designed template.
 *
 * @param options - Template bytes, field mappings, and data values
 * @returns The completed PDF as a Uint8Array
 * @throws Error if the template cannot be loaded or is invalid
 */
export async function generateFromTemplate(
  options: OverlayOptions
): Promise<Uint8Array> {
  const { templateBytes, fieldMap, data } = options;

  // Load the template PDF
  const pdfDoc = await PDFDocument.load(templateBytes);

  // Embed standard fonts
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pages = pdfDoc.getPages();

  // Overlay each field
  for (const mapping of fieldMap) {
    const value = data[mapping.fieldName];
    if (!value) continue;

    const { position } = mapping;
    const page = pages[position.page];
    if (!page) continue;

    const color = position.color
      ? rgb(position.color.r, position.color.g, position.color.b)
      : rgb(0.15, 0.15, 0.15);

    const font = position.bold ? helveticaBold : helvetica;
    const alignment = position.alignment || "left";

    // Check if text wrapping is needed
    if (position.maxWidth && font.widthOfTextAtSize(value, position.fontSize) > position.maxWidth) {
      drawWrappedText(page, value, position, font, color, alignment);
    } else {
      // Single line
      let drawX = position.x;

      if (alignment === "center") {
        const textWidth = font.widthOfTextAtSize(value, position.fontSize);
        drawX = position.x - textWidth / 2;
      } else if (alignment === "right") {
        const textWidth = font.widthOfTextAtSize(value, position.fontSize);
        drawX = position.x - textWidth;
      }

      page.drawText(value, {
        x: drawX,
        y: position.y,
        size: position.fontSize,
        font,
        color,
      });
    }
  }

  const pdfBytes = await pdfDoc.save();
  return new Uint8Array(pdfBytes);
}

/**
 * Draw text with word wrapping within a max width constraint.
 */
function drawWrappedText(
  page: ReturnType<typeof PDFDocument.prototype.getPages>[0],
  text: string,
  position: FieldPosition,
  font: Awaited<ReturnType<typeof PDFDocument.prototype.embedFont>>,
  color: ReturnType<typeof rgb>,
  alignment: "left" | "center" | "right"
): void {
  const words = text.split(" ");
  let line = "";
  let currentY = position.y;
  const lineHeight = position.fontSize * 1.3;
  const maxWidth = position.maxWidth || 300;

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    const testWidth = font.widthOfTextAtSize(testLine, position.fontSize);

    if (testWidth > maxWidth && line) {
      drawAlignedLine(page, line, position.x, currentY, position.fontSize, font, color, alignment, maxWidth);
      line = word;
      currentY -= lineHeight;
    } else {
      line = testLine;
    }
  }

  // Draw remaining text
  if (line) {
    drawAlignedLine(page, line, position.x, currentY, position.fontSize, font, color, alignment, maxWidth);
  }
}

/**
 * Draw a single line of text with alignment.
 */
function drawAlignedLine(
  page: ReturnType<typeof PDFDocument.prototype.getPages>[0],
  text: string,
  x: number,
  y: number,
  fontSize: number,
  font: Awaited<ReturnType<typeof PDFDocument.prototype.embedFont>>,
  color: ReturnType<typeof rgb>,
  alignment: "left" | "center" | "right",
  _maxWidth: number
): void {
  let drawX = x;

  if (alignment === "center") {
    const textWidth = font.widthOfTextAtSize(text, fontSize);
    drawX = x - textWidth / 2;
  } else if (alignment === "right") {
    const textWidth = font.widthOfTextAtSize(text, fontSize);
    drawX = x - textWidth;
  }

  page.drawText(text, {
    x: drawX,
    y,
    size: fontSize,
    font,
    color,
  });
}

// ── Data Mapping Helper ────────────────────────────────────

/**
 * Map consent form parameters to field data values.
 * Used to convert ConsentFormParams into the data record expected by generateFromTemplate.
 */
export function mapConsentParamsToData(params: {
  orgName: string;
  orgAbn?: string;
  participantName: string;
  ndisNumber: string;
  dob: string;
  propertyAddress: string;
}): Record<string, string> {
  const today = new Date().toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const data: Record<string, string> = {
    coverOrgName: params.orgName,
    coverSubtitle: "Easy Read Consent Form",
    aboutOrgName: params.orgName,
    aboutParticipantName: params.participantName,
    aboutPropertyAddress: params.propertyAddress,
    collectNdisNumber: `NDIS Number: ${params.ndisNumber}`,
    collectDob: `Date of Birth: ${params.dob}`,
    signParticipantName: params.participantName,
    signNdisNumber: params.ndisNumber,
    signDate: today,
    signOrgName: params.orgName,
    complaintsOrgName: params.orgName,
    contactOrgName: params.orgName,
  };

  if (params.orgAbn) {
    data.contactAbn = `ABN: ${params.orgAbn}`;
  }

  return data;
}

// ── Download Helper ────────────────────────────────────────

/**
 * Trigger a browser download of the generated PDF.
 */
export function downloadPdf(pdfBytes: Uint8Array, fileName: string): void {
  const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
