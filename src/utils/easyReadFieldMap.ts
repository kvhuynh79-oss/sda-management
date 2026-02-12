/**
 * Field coordinate map for the Easy Read Consent PDF template.
 *
 * Coordinates use pdf-lib's coordinate system:
 *   - Origin (0,0) is bottom-left of the page
 *   - x increases to the right, y increases upward
 *   - A4 page size: 595.28 x 841.89 points
 *
 * Each field specifies the page number (0-indexed), x/y position,
 * font size, and optional max width for text wrapping.
 *
 * After exporting the Canva template PDF, use the coordinate measurement
 * helper (measurePdfCoordinates.ts) to fine-tune these positions.
 */

export interface FieldPosition {
  page: number; // 0-indexed page number
  x: number; // x position from left edge (points)
  y: number; // y position from bottom edge (points)
  fontSize: number;
  maxWidth?: number; // max width for text wrapping (points)
  color?: { r: number; g: number; b: number }; // RGB 0-1 scale
}

// A4 dimensions in points
export const A4_WIDTH = 595.28;
export const A4_HEIGHT = 841.89;

// Standard text column (right side of two-column layout)
// Images occupy ~35% left, text occupies ~60% right with gutters
const TEXT_COL_X = 230; // Start of text column
const TEXT_COL_WIDTH = 330; // Width of text column
const DARK_TEXT = { r: 0.15, g: 0.15, b: 0.15 };
const PURPLE_TEXT = { r: 0.427, g: 0.157, b: 0.851 }; // #6D28D9

/**
 * Dynamic field positions in the Easy Read Consent PDF template.
 *
 * These coordinates must be calibrated against the actual Canva export.
 * Use `measurePdfCoordinates()` to overlay a grid on the template
 * and read exact positions for each placeholder.
 *
 * IMPORTANT: After exporting a new template from Canva, re-measure
 * any fields that may have shifted.
 */
export const EASY_READ_FIELDS: Record<string, FieldPosition> = {
  // ── PAGE 1: COVER PAGE ──────────────────────────────
  coverOrgName: {
    page: 0,
    x: A4_WIDTH / 2, // centered
    y: 340,
    fontSize: 14,
    maxWidth: 400,
    color: DARK_TEXT,
  },
  coverSubtitle: {
    page: 0,
    x: A4_WIDTH / 2,
    y: 300,
    fontSize: 11,
    maxWidth: 400,
    color: DARK_TEXT,
  },

  // ── PAGE 2: HOW TO USE THIS DOCUMENT ────────────────
  // No dynamic fields on this page (static instructions)

  // ── PAGE 3: WHAT IS THIS ABOUT? ─────────────────────
  aboutOrgName: {
    page: 2,
    x: TEXT_COL_X,
    y: 680,
    fontSize: 13,
    maxWidth: TEXT_COL_WIDTH,
    color: DARK_TEXT,
  },
  aboutParticipantName: {
    page: 2,
    x: TEXT_COL_X,
    y: 620,
    fontSize: 13,
    maxWidth: TEXT_COL_WIDTH,
    color: PURPLE_TEXT,
  },
  aboutPropertyAddress: {
    page: 2,
    x: TEXT_COL_X,
    y: 560,
    fontSize: 12,
    maxWidth: TEXT_COL_WIDTH,
    color: DARK_TEXT,
  },

  // ── PAGE 4: WHAT WE COLLECT ─────────────────────────
  collectNdisNumber: {
    page: 3,
    x: TEXT_COL_X,
    y: 640,
    fontSize: 12,
    maxWidth: TEXT_COL_WIDTH,
    color: DARK_TEXT,
  },
  collectDob: {
    page: 3,
    x: TEXT_COL_X,
    y: 600,
    fontSize: 12,
    maxWidth: TEXT_COL_WIDTH,
    color: DARK_TEXT,
  },

  // ── PAGE 5: WHO WE SHARE WITH ──────────────────────
  // No dynamic fields (static content about sharing)

  // ── PAGE 6: YOUR RIGHTS ─────────────────────────────
  // No dynamic fields (static content about rights)

  // ── PAGE 7: HOW LONG WE KEEP INFO ──────────────────
  // No dynamic fields (static content about retention)

  // ── PAGE 8: KEEPING YOUR INFO SAFE ─────────────────
  // No dynamic fields (static content about security)

  // ── PAGE 9: SIGNATURE PAGE ──────────────────────────
  signParticipantName: {
    page: 8,
    x: 80,
    y: 620,
    fontSize: 12,
    maxWidth: 250,
    color: DARK_TEXT,
  },
  signNdisNumber: {
    page: 8,
    x: 80,
    y: 580,
    fontSize: 12,
    maxWidth: 250,
    color: DARK_TEXT,
  },
  signDate: {
    page: 8,
    x: 80,
    y: 540,
    fontSize: 12,
    maxWidth: 250,
    color: DARK_TEXT,
  },
  signOrgName: {
    page: 8,
    x: 80,
    y: 400,
    fontSize: 12,
    maxWidth: 250,
    color: DARK_TEXT,
  },

  // ── PAGE 10: COMPLAINTS ─────────────────────────────
  complaintsOrgName: {
    page: 9,
    x: TEXT_COL_X,
    y: 600,
    fontSize: 12,
    maxWidth: TEXT_COL_WIDTH,
    color: DARK_TEXT,
  },

  // ── PAGE 11: WORD LIST ──────────────────────────────
  // No dynamic fields (static glossary)

  // ── PAGE 12: CONTACT US ─────────────────────────────
  contactOrgName: {
    page: 11,
    x: A4_WIDTH / 2,
    y: 580,
    fontSize: 14,
    maxWidth: 400,
    color: DARK_TEXT,
  },
  contactAbn: {
    page: 11,
    x: A4_WIDTH / 2,
    y: 550,
    fontSize: 11,
    maxWidth: 400,
    color: DARK_TEXT,
  },
};

/**
 * Returns all fields mapped with actual values from ConsentFormParams.
 */
export function mapFieldValues(params: {
  orgName: string;
  orgAbn?: string;
  participantName: string;
  ndisNumber: string;
  dob: string;
  propertyAddress: string;
}): Array<{ key: string; value: string; position: FieldPosition }> {
  const today = new Date().toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const valueMap: Record<string, string> = {
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
    contactAbn: params.orgAbn ? `ABN: ${params.orgAbn}` : "",
  };

  return Object.entries(EASY_READ_FIELDS)
    .filter(([key]) => valueMap[key] !== undefined && valueMap[key] !== "")
    .map(([key, position]) => ({
      key,
      value: valueMap[key],
      position,
    }));
}
