import { action, mutation } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

// Type definitions for extracted data
interface ExtractedParticipant {
  firstName: string;
  lastName: string;
  ndisNumber: string;
  dateOfBirth?: string;
  email?: string;
  phone?: string;
  address?: string;
}

interface ExtractedPlan {
  planStartDate?: string;
  planEndDate?: string;
  sdaDesignCategory?: "improved_liveability" | "fully_accessible" | "robust" | "high_physical_support";
  sdaEligibilityType?: "standard" | "higher_needs";
  fundingManagementType?: "ndia_managed" | "plan_managed" | "self_managed";
  planManagerName?: string;
  planManagerEmail?: string;
  planManagerPhone?: string;
  annualSdaBudget?: number;
  supportItemNumber?: string;
}

interface ExtractedData {
  participant: ExtractedParticipant;
  plan: ExtractedPlan;
  confidence: number;
  warnings: string[];
  rawNotes: string;
}

// Parse NDIS plan document using Claude API
export const parseNdisPlan = action({
  args: {
    documentText: v.string(),
    documentType: v.optional(v.string()), // "pdf_text" or "image_base64"
  },
  handler: async (ctx, args): Promise<ExtractedData> => {
    // Check if Claude API key is configured
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY not configured. Add it to your Convex environment variables.");
    }

    const systemPrompt = `You are an expert at parsing Australian NDIS (National Disability Insurance Scheme) plan documents.
Your task is to extract structured participant and plan information from the document text provided.

IMPORTANT: Only extract information that is clearly stated in the document. Do not guess or make assumptions.

The NDIS plan document typically contains:
- Participant details (name, NDIS number, date of birth, contact info)
- Plan dates (start and end dates)
- SDA (Specialist Disability Accommodation) funding details
- Support categories and budgets
- Plan management type (NDIA managed, plan managed, or self-managed)
- Plan manager details if plan-managed

SDA Design Categories in Australia:
- "improved_liveability" - Improved Liveability
- "fully_accessible" - Fully Accessible
- "robust" - Robust
- "high_physical_support" - High Physical Support (HPS)

Funding Management Types:
- "ndia_managed" - NDIA Managed (Agency managed)
- "plan_managed" - Plan Managed
- "self_managed" - Self Managed

Respond with a JSON object in this exact format:
{
  "participant": {
    "firstName": "string",
    "lastName": "string",
    "ndisNumber": "string (format: typically 9-10 digits)",
    "dateOfBirth": "YYYY-MM-DD or null if not found",
    "email": "string or null",
    "phone": "string or null",
    "address": "string or null"
  },
  "plan": {
    "planStartDate": "YYYY-MM-DD or null",
    "planEndDate": "YYYY-MM-DD or null",
    "sdaDesignCategory": "improved_liveability|fully_accessible|robust|high_physical_support or null",
    "sdaEligibilityType": "standard|higher_needs or null",
    "fundingManagementType": "ndia_managed|plan_managed|self_managed or null",
    "planManagerName": "string or null",
    "planManagerEmail": "string or null",
    "planManagerPhone": "string or null",
    "annualSdaBudget": "number or null (annual SDA funding amount in AUD)",
    "supportItemNumber": "string or null (SDA support item number like 01_052_0115_1_1)"
  },
  "confidence": 0.0-1.0 (your confidence in the extracted data),
  "warnings": ["array of any issues or missing important fields"],
  "rawNotes": "any additional relevant information found that doesn't fit the structure"
}`;

    const userPrompt = `Please extract the participant and plan information from this NDIS plan document:

---
${args.documentText}
---

Remember to:
1. Only extract information clearly stated in the document
2. Use null for any fields you cannot find
3. Format dates as YYYY-MM-DD
4. Include any warnings about missing critical information
5. Return valid JSON only`;

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4096,
          messages: [
            {
              role: "user",
              content: userPrompt,
            },
          ],
          system: systemPrompt,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Claude API error:", errorData);
        throw new Error(`Claude API error: ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      const content = data.content[0]?.text;

      if (!content) {
        throw new Error("No response content from Claude API");
      }

      // Parse the JSON response
      // Find JSON in the response (Claude sometimes adds explanation text)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Could not find JSON in Claude response");
      }

      const extracted = JSON.parse(jsonMatch[0]) as ExtractedData;

      // Validate required fields
      if (!extracted.participant?.firstName || !extracted.participant?.lastName) {
        extracted.warnings = extracted.warnings || [];
        extracted.warnings.push("Could not extract participant name - please verify manually");
      }

      if (!extracted.participant?.ndisNumber) {
        extracted.warnings = extracted.warnings || [];
        extracted.warnings.push("Could not extract NDIS number - this is required");
      }

      return extracted;
    } catch (error) {
      console.error("Error parsing NDIS plan:", error);
      throw new Error(`Failed to parse NDIS plan: ${error}`);
    }
  },
});

// Parse NDIS plan from PDF using Claude's vision (for image/PDF content)
export const parseNdisPlanWithVision = action({
  args: {
    fileBase64: v.string(),
    mediaType: v.string(), // "application/pdf" or "image/jpeg" etc
  },
  handler: async (ctx, args): Promise<ExtractedData> => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY not configured. Add it to your Convex environment variables.");
    }

    const systemPrompt = `You are an expert at parsing Australian NDIS (National Disability Insurance Scheme) plan documents.
Your task is to extract structured participant and plan information from the document image provided.

IMPORTANT: Only extract information that is clearly visible in the document. Do not guess or make assumptions.

The NDIS plan document typically contains:
- Participant details (name, NDIS number, date of birth, contact info)
- Plan dates (start and end dates)
- SDA (Specialist Disability Accommodation) funding details
- Support categories and budgets
- Plan management type (NDIA managed, plan managed, or self-managed)
- Plan manager details if plan-managed

SDA Design Categories in Australia:
- "improved_liveability" - Improved Liveability
- "fully_accessible" - Fully Accessible
- "robust" - Robust
- "high_physical_support" - High Physical Support (HPS)

Funding Management Types:
- "ndia_managed" - NDIA Managed (Agency managed)
- "plan_managed" - Plan Managed
- "self_managed" - Self Managed

Respond with a JSON object in this exact format:
{
  "participant": {
    "firstName": "string",
    "lastName": "string",
    "ndisNumber": "string (format: typically 9-10 digits)",
    "dateOfBirth": "YYYY-MM-DD or null if not found",
    "email": "string or null",
    "phone": "string or null",
    "address": "string or null"
  },
  "plan": {
    "planStartDate": "YYYY-MM-DD or null",
    "planEndDate": "YYYY-MM-DD or null",
    "sdaDesignCategory": "improved_liveability|fully_accessible|robust|high_physical_support or null",
    "sdaEligibilityType": "standard|higher_needs or null",
    "fundingManagementType": "ndia_managed|plan_managed|self_managed or null",
    "planManagerName": "string or null",
    "planManagerEmail": "string or null",
    "planManagerPhone": "string or null",
    "annualSdaBudget": "number or null (annual SDA funding amount in AUD)",
    "supportItemNumber": "string or null (SDA support item number like 01_052_0115_1_1)"
  },
  "confidence": 0.0-1.0 (your confidence in the extracted data),
  "warnings": ["array of any issues or missing important fields"],
  "rawNotes": "any additional relevant information found that doesn't fit the structure"
}`;

    try {
      // For PDFs, we need to use document type
      const isPdf = args.mediaType === "application/pdf";

      const messageContent: any[] = [
        {
          type: "text",
          text: `Please extract the participant and plan information from this NDIS plan document.

Remember to:
1. Only extract information clearly visible in the document
2. Use null for any fields you cannot find
3. Format dates as YYYY-MM-DD
4. Include any warnings about missing critical information
5. Return valid JSON only`,
        },
      ];

      if (isPdf) {
        messageContent.unshift({
          type: "document",
          source: {
            type: "base64",
            media_type: "application/pdf",
            data: args.fileBase64,
          },
        });
      } else {
        messageContent.unshift({
          type: "image",
          source: {
            type: "base64",
            media_type: args.mediaType,
            data: args.fileBase64,
          },
        });
      }

      // Build headers - add PDF beta header when using document content type
      const fetchHeaders: Record<string, string> = {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      };
      if (isPdf) {
        fetchHeaders["anthropic-beta"] = "pdfs-2024-09-25";
      }

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: fetchHeaders,
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4096,
          messages: [
            {
              role: "user",
              content: messageContent,
            },
          ],
          system: systemPrompt,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Claude API error:", errorData);
        throw new Error(`Claude API error: ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      const content = data.content[0]?.text;

      if (!content) {
        throw new Error("No response content from Claude API");
      }

      // Parse the JSON response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Could not find JSON in Claude response");
      }

      const extracted = JSON.parse(jsonMatch[0]) as ExtractedData;

      // Validate required fields
      if (!extracted.participant?.firstName || !extracted.participant?.lastName) {
        extracted.warnings = extracted.warnings || [];
        extracted.warnings.push("Could not extract participant name - please verify manually");
      }

      if (!extracted.participant?.ndisNumber) {
        extracted.warnings = extracted.warnings || [];
        extracted.warnings.push("Could not extract NDIS number - this is required");
      }

      return extracted;
    } catch (error) {
      console.error("Error parsing NDIS plan with vision:", error);
      throw new Error(`Failed to parse NDIS plan: ${error}`);
    }
  },
});

// Create participant and plan from extracted data
export const createFromExtracted = mutation({
  args: {
    participant: v.object({
      firstName: v.string(),
      lastName: v.string(),
      ndisNumber: v.string(),
      dateOfBirth: v.optional(v.string()),
      email: v.optional(v.string()),
      phone: v.optional(v.string()),
    }),
    plan: v.object({
      planStartDate: v.string(),
      planEndDate: v.string(),
      sdaDesignCategory: v.union(
        v.literal("improved_liveability"),
        v.literal("fully_accessible"),
        v.literal("robust"),
        v.literal("high_physical_support")
      ),
      sdaEligibilityType: v.union(v.literal("standard"), v.literal("higher_needs")),
      fundingManagementType: v.union(
        v.literal("ndia_managed"),
        v.literal("plan_managed"),
        v.literal("self_managed")
      ),
      planManagerName: v.optional(v.string()),
      planManagerEmail: v.optional(v.string()),
      planManagerPhone: v.optional(v.string()),
      annualSdaBudget: v.number(),
      supportItemNumber: v.optional(v.string()),
      claimDay: v.optional(v.number()),
    }),
    dwellingId: v.id("dwellings"),
    moveInDate: v.string(),
    documentStorageId: v.optional(v.id("_storage")),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check for existing participant with same NDIS number
    const existing = await ctx.db
      .query("participants")
      .withIndex("by_ndisNumber", (q) => q.eq("ndisNumber", args.participant.ndisNumber))
      .first();

    if (existing) {
      throw new Error(`Participant with NDIS number ${args.participant.ndisNumber} already exists`);
    }

    // Create the participant
    const participantId = await ctx.db.insert("participants", {
      ...args.participant,
      dwellingId: args.dwellingId,
      moveInDate: args.moveInDate,
      status: "pending_move_in",
      createdAt: now,
      updatedAt: now,
    });

    // Create the plan
    const planId = await ctx.db.insert("participantPlans", {
      participantId,
      planStartDate: args.plan.planStartDate,
      planEndDate: args.plan.planEndDate,
      planStatus: "current",
      sdaEligibilityType: args.plan.sdaEligibilityType,
      sdaDesignCategory: args.plan.sdaDesignCategory,
      sdaBuildingType: "new_build",
      fundingManagementType: args.plan.fundingManagementType,
      planManagerName: args.plan.planManagerName,
      planManagerEmail: args.plan.planManagerEmail,
      planManagerPhone: args.plan.planManagerPhone,
      annualSdaBudget: args.plan.annualSdaBudget,
      monthlySdaAmount: args.plan.annualSdaBudget / 12,
      claimDay: args.plan.claimDay || 1,
      supportItemNumber: args.plan.supportItemNumber,
      createdAt: now,
      updatedAt: now,
    });

    // If document was uploaded, create a document record linked to the participant
    if (args.documentStorageId) {
      await ctx.db.insert("documents", {
        fileName: `NDIS_Plan_${args.participant.firstName}_${args.participant.lastName}.pdf`,
        fileSize: 0,
        fileType: "application/pdf",
        storageId: args.documentStorageId,
        documentType: "ndis_plan",
        documentCategory: "participant",
        linkedParticipantId: participantId,
        description: "Automatically uploaded via AI Import",
        uploadedBy: args.userId,
        createdAt: now,
        updatedAt: now,
      });
    }

    return {
      participantId,
      planId,
      success: true,
    };
  },
});
