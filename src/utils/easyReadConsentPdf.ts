/**
 * Easy Read Consent PDF Generator (Template-based)
 *
 * Supports two template sources:
 * 1. Custom template uploaded via Settings > PDF Templates (stored in Convex)
 *    - Uses org-specific field map positions from providerSettings
 * 2. Local template at public/templates/easy-read-consent-template.pdf
 *    - Uses default field positions from easyReadFieldMap.ts
 *
 * Fallback: If neither template is available, returns false so the caller
 * can fall back to the jsPDF-based generator in consentFormPdf.ts.
 *
 * Design template in Canva following the NDIS Commission Easy Read format:
 *   - 12 pages, A4 portrait
 *   - Two-column layout: images ~35% left, text ~60% right
 *   - Stock photos from Photosymbols, Canva, Pexels, or Unsplash
 *   - Purple accent bars (#6D28D9), 16pt+ body text
 *   - Leave blank spaces where dynamic fields will be overlaid
 */

import type { ConsentFormParams } from "./consentFormPdf";
import { mapFieldValues } from "./easyReadFieldMap";
import {
  generateFromTemplate,
  mapConsentParamsToData,
  downloadPdf,
  DEFAULT_EASY_READ_FIELD_MAP,
  type FieldMapping,
} from "./templatePdfOverlay";

const LOCAL_TEMPLATE_PATH = "/templates/easy-read-consent-template.pdf";

/**
 * Options for the template-based Easy Read generator.
 * When templateUrl and fieldMapJson are provided, the Convex-stored
 * template is used. Otherwise, falls back to the local template file.
 */
export interface EasyReadTemplateOptions {
  /** URL to a custom PDF template stored in Convex (from providerSettings) */
  templateUrl?: string | null;
  /** JSON string of FieldMapping[] for the custom template */
  fieldMapJson?: string | null;
}

/**
 * Generate an Easy Read Consent PDF by overlaying dynamic fields
 * onto a pre-designed template.
 *
 * Priority:
 * 1. Custom org template (templateUrl from Convex) + custom field map
 * 2. Local template at public/templates/ + default field map
 * 3. Return false (caller should use jsPDF fallback)
 *
 * @param params - Participant and organization details
 * @param options - Optional template URL and field map from org settings
 * @returns true if template-based PDF was generated, false if fallback needed
 */
export async function generateEasyReadFromTemplate(
  params: ConsentFormParams,
  options?: EasyReadTemplateOptions
): Promise<boolean> {
  // Strategy 1: Use custom Convex-stored template with custom field map
  if (options?.templateUrl) {
    try {
      const templateBytes = await fetchTemplateBytes(options.templateUrl);
      if (templateBytes) {
        const fieldMap = parseFieldMap(options.fieldMapJson);
        const data = mapConsentParamsToData(params);

        const pdfBytes = await generateFromTemplate({
          templateBytes,
          fieldMap,
          data,
        });

        const safeName = params.participantName.replace(/[^a-zA-Z0-9]/g, "_");
        downloadPdf(pdfBytes, `Easy_Read_Consent_${safeName}.pdf`);
        return true;
      }
    } catch (error) {
      console.error("Error generating from custom template:", error);
      // Fall through to local template
    }
  }

  // Strategy 2: Use local template file with legacy field map
  try {
    const templateBytes = await fetchTemplateBytes(LOCAL_TEMPLATE_PATH);
    if (templateBytes) {
      // Use the legacy mapFieldValues which maps to the old FieldPosition format
      const legacyFields = mapFieldValues(params);
      const data: Record<string, string> = {};
      const fieldMap: FieldMapping[] = [];

      for (const field of legacyFields) {
        data[field.key] = field.value;
        fieldMap.push({
          fieldName: field.key,
          label: field.key,
          position: {
            ...field.position,
            bold: field.key.includes("Name") || field.key.includes("Org"),
            alignment: field.key.startsWith("cover") || field.key.startsWith("contact")
              ? "center" as const
              : "left" as const,
          },
        });
      }

      const pdfBytes = await generateFromTemplate({
        templateBytes,
        fieldMap,
        data,
      });

      const safeName = params.participantName.replace(/[^a-zA-Z0-9]/g, "_");
      downloadPdf(pdfBytes, `Easy_Read_Consent_${safeName}.pdf`);
      return true;
    }
  } catch (error) {
    console.error("Error generating from local template:", error);
  }

  // Strategy 3: Return false - caller should use jsPDF fallback
  return false;
}

/**
 * Fetch PDF template bytes from a URL.
 * Returns null if the fetch fails or the URL is unreachable.
 */
async function fetchTemplateBytes(url: string): Promise<Uint8Array | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`Template not available at ${url} (${response.status})`);
      return null;
    }
    const arrayBuffer = await response.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  } catch (error) {
    console.warn(`Failed to fetch template from ${url}:`, error);
    return null;
  }
}

/**
 * Parse field map JSON string into FieldMapping array.
 * Falls back to DEFAULT_EASY_READ_FIELD_MAP if JSON is invalid or empty.
 */
function parseFieldMap(fieldMapJson?: string | null): FieldMapping[] {
  if (!fieldMapJson) return DEFAULT_EASY_READ_FIELD_MAP;

  try {
    const parsed = JSON.parse(fieldMapJson);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed as FieldMapping[];
    }
  } catch {
    console.warn("Invalid field map JSON, using defaults");
  }

  return DEFAULT_EASY_READ_FIELD_MAP;
}
