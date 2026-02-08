"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import Anthropic from "@anthropic-ai/sdk";

export const analyzeDocument = action({
  args: {
    storageId: v.id("_storage"),
    fileName: v.string(),
    fileType: v.string(),
  },
  handler: async (ctx, args): Promise<{
    documentType: string;
    category: string;
    linkedEntityType?: "property" | "participant";
    linkedEntityIdentifier?: string;
    description?: string;
    invoiceNumber?: string;
    invoiceDate?: string;
    invoiceAmount?: number;
    vendor?: string;
    expiryDate?: string;
    confidence?: "high" | "medium" | "low";
  }> => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY not configured. Please add it to your environment variables.");
    }

    const anthropic = new Anthropic({ apiKey });

    // Get file URL from storage
    const fileUrl = await ctx.storage.getUrl(args.storageId);
    if (!fileUrl) throw new Error("File not found in storage");

    // Only support images for now (PDFs would need conversion)
    const isImage = args.fileType.startsWith("image/");
    const isPDF = args.fileType === "application/pdf";

    if (!isImage && !isPDF) {
      throw new Error("Only image and PDF files are supported for AI analysis. Please upload a JPG, PNG, or PDF.");
    }

    // Fetch the file
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    // Determine media type
    let mediaType = args.fileType as "image/jpeg" | "image/png" | "image/gif" | "image/webp";
    if (isPDF) {
      // For PDFs, we'll need to note that full PDF support requires conversion
      // For now, we'll try to process it as an image (may work for single-page PDFs)
      mediaType = "image/png";
    }

    try {
      const message = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mediaType,
                  data: base64,
                },
              },
              {
                type: "text",
                text: `Analyze this document image and extract key information. Return ONLY valid JSON with no markdown code blocks or formatting:

{
  "documentType": "one of: invoice, receipt, quote, ndis_plan, lease, service_agreement, fire_safety_certificate, building_compliance_certificate, sda_design_certificate, sda_registration_cert, ndis_practice_standards_cert, ndis_worker_screening, insurance, report, other",
  "category": "one of: property, participant, organisation, dwelling, owner",
  "linkedEntityType": "property or participant (only if clearly mentioned)",
  "linkedEntityIdentifier": "exact property address or participant full name if found",
  "description": "brief 1-2 sentence description of the document",
  "invoiceNumber": "invoice/receipt number if present",
  "invoiceDate": "YYYY-MM-DD format if date present",
  "invoiceAmount": "numeric amount only (no currency symbols)",
  "vendor": "vendor/supplier/company name if present",
  "expiryDate": "YYYY-MM-DD format if expiry/valid until date present",
  "confidence": "high if document is clear and readable, medium if partially readable, low if unclear"
}

Analysis Guidelines:
- For invoices/receipts: Extract invoice number, date, total amount, vendor name
- For certificates: Extract issue date, expiry date, certifying body
- For NDIS plans: Category is "participant", extract participant name and plan dates
- For property documents (leases, compliance certs): Category is "property", extract address
- For organization-wide docs (insurance, NDIS registration): Category is "organisation"
- Use "other" for documentType if document type is ambiguous
- Leave fields empty (null or empty string) if information is not visible in the document
- For dates, always use YYYY-MM-DD format
- For amounts, extract only the number (e.g., 450.00, not $450.00)`,
              },
            ],
          },
        ],
      });

      // Extract JSON from Claude's response
      const content = message.content[0];
      if (content.type !== "text") {
        throw new Error("Unexpected response format from Claude API");
      }

      const jsonText = content.text.trim();
      // Remove markdown code blocks if present
      const cleanJson = jsonText.replace(/```json\n?/g, "").replace(/```\n?/g, "");
      const extracted = JSON.parse(cleanJson);

      // Convert invoiceAmount from string to number if present
      if (extracted.invoiceAmount) {
        extracted.invoiceAmount = parseFloat(extracted.invoiceAmount);
      }

      // Ensure confidence is set
      if (!extracted.confidence) {
        extracted.confidence = "medium";
      }

      return extracted;
    } catch (error) {
      console.error("Error analyzing document with Claude:", error);
      if (error instanceof Error) {
        throw new Error(`AI analysis failed: ${error.message}`);
      }
      throw new Error("AI analysis failed. Please try again or fill in the fields manually.");
    }
  },
});
