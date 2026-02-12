/**
 * Easy Read Consent PDF Generator (Template-based)
 *
 * Uses pdf-lib to load a pre-designed Canva PDF template and overlay
 * dynamic participant/organization fields at measured coordinates.
 *
 * The template PDF should be placed at:
 *   public/templates/easy-read-consent-template.pdf
 *
 * Design it in Canva following the NDIS Commission Easy Read format:
 *   - 12 pages, A4 portrait
 *   - Two-column layout: images ~35% left, text ~60% right
 *   - Stock photos from Photosymbols, Canva, Pexels, or Unsplash
 *   - Purple accent bars (#6D28D9), 16pt+ body text
 *   - Leave blank spaces where dynamic fields will be overlaid
 *
 * Fallback: If the template cannot be loaded, falls back to the
 * jsPDF-based generator in consentFormPdf.ts.
 */

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { ConsentFormParams } from "./consentFormPdf";
import { mapFieldValues } from "./easyReadFieldMap";

const TEMPLATE_PATH = "/templates/easy-read-consent-template.pdf";

/**
 * Generate an Easy Read Consent PDF by overlaying dynamic fields
 * onto the pre-designed Canva template.
 *
 * @param params - Participant and organization details
 * @returns true if template-based PDF was generated, false if fallback needed
 */
export async function generateEasyReadFromTemplate(
  params: ConsentFormParams
): Promise<boolean> {
  try {
    // Fetch the template PDF
    const response = await fetch(TEMPLATE_PATH);
    if (!response.ok) {
      console.warn(
        `Easy Read template not found at ${TEMPLATE_PATH} (${response.status}). Use fallback.`
      );
      return false;
    }

    const templateBytes = await response.arrayBuffer();
    const pdfDoc = await PDFDocument.load(templateBytes);

    // Embed fonts for dynamic text
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Get all pages
    const pages = pdfDoc.getPages();

    // Map params to field positions with values
    const fields = mapFieldValues(params);

    // Overlay each dynamic field
    for (const field of fields) {
      const { value, position } = field;
      const page = pages[position.page];
      if (!page) continue;

      const color = position.color
        ? rgb(position.color.r, position.color.g, position.color.b)
        : rgb(0.15, 0.15, 0.15);

      // Use bold for names, regular for other fields
      const isBoldField = field.key.includes("Name") || field.key.includes("Org");
      const font = isBoldField ? helveticaBold : helvetica;

      // Handle text wrapping if maxWidth is specified
      if (position.maxWidth && value.length * position.fontSize * 0.5 > position.maxWidth) {
        const words = value.split(" ");
        let line = "";
        let currentY = position.y;
        const lineHeight = position.fontSize * 1.3;

        for (const word of words) {
          const testLine = line ? `${line} ${word}` : word;
          const testWidth = font.widthOfTextAtSize(testLine, position.fontSize);

          if (testWidth > position.maxWidth && line) {
            page.drawText(line, {
              x: position.x,
              y: currentY,
              size: position.fontSize,
              font,
              color,
            });
            line = word;
            currentY -= lineHeight;
          } else {
            line = testLine;
          }
        }
        // Draw remaining text
        if (line) {
          page.drawText(line, {
            x: position.x,
            y: currentY,
            size: position.fontSize,
            font,
            color,
          });
        }
      } else {
        // Single line - check if centered (cover page fields)
        const isCentered =
          field.key.startsWith("cover") || field.key.startsWith("contact");

        let drawX = position.x;
        if (isCentered) {
          const textWidth = font.widthOfTextAtSize(value, position.fontSize);
          drawX = position.x - textWidth / 2;
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

    // Save and trigger download
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    const safeName = params.participantName.replace(/[^a-zA-Z0-9]/g, "_");
    link.download = `Easy_Read_Consent_${safeName}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return true;
  } catch (error) {
    console.error("Error generating Easy Read from template:", error);
    return false;
  }
}
