import { action, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import {
  callClaudeAPI,
  extractJSON,
  createVisionMessage,
} from "./aiUtils";

// Type definitions
interface ClassificationResult {
  documentType:
    | "ndis_plan"
    | "accommodation_agreement"
    | "service_agreement"
    | "lease"
    | "insurance"
    | "compliance"
    | "csv_claims"
    | "other";
  confidence: number;
  extractedExpiry: string | null;
  suggestedCategory: "participant" | "property" | "dwelling" | "owner";
  summary: string;
}

interface AccommodationAgreementData {
  participantFirstName: string;
  participantLastName: string;
  ndisNumber: string;
  moveInDate: string;
  agreementEndDate: string | null;
  rrcAmount: number;
  rrcFrequency: "weekly" | "fortnightly" | "monthly";
  dspComponent: number | null;
  craComponent: number | null;
  bankBsb: string | null;
  bankAccountNumber: string | null;
  bankAccountName: string | null;
  propertyAddress: string;
  sdaCategory: string | null;
  silProviderName: string | null;
  confidence: number;
  warnings: string[];
}

interface ParsedClaimRecord {
  ndisNumber: string;
  supportsDeliveredFrom: string;
  supportsDeliveredTo: string;
  claimReference: string;
  amount: number;
  supportNumber: string;
}

// Classify a document using AI
export const classifyDocument = action({
  args: {
    fileBase64: v.string(),
    mediaType: v.string(),
    fileName: v.string(),
  },
  handler: async (ctx, args): Promise<ClassificationResult> => {
    const systemPrompt = `You are a document classification expert for Australian NDIS (National Disability Insurance Scheme) and Specialist Disability Accommodation (SDA) documents.

Your task is to analyze the document and determine its type and extract any expiry dates.

Document Types:
- "ndis_plan" - NDIS participant plan documents showing funding
- "accommodation_agreement" - SDA accommodation agreements between providers and participants
- "service_agreement" - Service agreements with support providers
- "lease" - Property lease agreements
- "insurance" - Insurance certificates or policies
- "compliance" - Compliance certificates (fire safety, electrical, etc.)
- "csv_claims" - CSV files containing NDIS claim data (unlikely for images/PDFs)
- "other" - Any other document type

Categories (who the document relates to):
- "participant" - Documents related to NDIS participants
- "property" - Documents related to properties
- "dwelling" - Documents related to specific dwellings/units
- "owner" - Documents related to property owners

Respond with JSON only:
{
  "documentType": "type",
  "confidence": 0.0-1.0,
  "extractedExpiry": "YYYY-MM-DD or null",
  "suggestedCategory": "category",
  "summary": "Brief description of what this document is"
}`;

    const userPrompt = `Analyze this document (filename: ${args.fileName}) and classify it. Extract any expiry date if present.`;

    const message = createVisionMessage(userPrompt, args.fileBase64, args.mediaType);

    const response = await callClaudeAPI(systemPrompt, [message], 1024);
    return extractJSON<ClassificationResult>(response);
  },
});

// Parse an accommodation agreement document
export const parseAccommodationAgreement = action({
  args: {
    fileBase64: v.string(),
    mediaType: v.string(),
  },
  handler: async (ctx, args): Promise<AccommodationAgreementData> => {
    const systemPrompt = `You are an expert at parsing Australian SDA (Specialist Disability Accommodation) Accommodation Agreements.

Extract the following information from the document:
- Participant name and NDIS number
- Move-in/start date and agreement end date
- Reasonable Rent Contribution (RRC) details:
  - Total RRC amount
  - Frequency (weekly/fortnightly/monthly)
  - DSP component (25% of Disability Support Pension)
  - CRA component (Commonwealth Rent Assistance)
- Bank account details for payments (BSB, account number, account name)
- Property address
- SDA design category (Improved Liveability, Fully Accessible, Robust, High Physical Support)
- SIL Provider name (if mentioned)

Respond with JSON only:
{
  "participantFirstName": "string",
  "participantLastName": "string",
  "ndisNumber": "string (digits only)",
  "moveInDate": "YYYY-MM-DD",
  "agreementEndDate": "YYYY-MM-DD or null",
  "rrcAmount": number,
  "rrcFrequency": "weekly|fortnightly|monthly",
  "dspComponent": number or null,
  "craComponent": number or null,
  "bankBsb": "string or null",
  "bankAccountNumber": "string or null",
  "bankAccountName": "string or null",
  "propertyAddress": "string",
  "sdaCategory": "improved_liveability|fully_accessible|robust|high_physical_support or null",
  "silProviderName": "string or null",
  "confidence": 0.0-1.0,
  "warnings": ["array of any issues or missing fields"]
}`;

    const userPrompt = `Extract all participant, rent contribution, and payment details from this SDA Accommodation Agreement.`;

    const message = createVisionMessage(userPrompt, args.fileBase64, args.mediaType);

    const response = await callClaudeAPI(systemPrompt, [message], 2048);
    return extractJSON<AccommodationAgreementData>(response);
  },
});

// Parse CSV claim files
export const parseCsvClaims = action({
  args: {
    csvContent: v.string(),
  },
  handler: async (ctx, args): Promise<ParsedClaimRecord[]> => {
    const systemPrompt = `You are an expert at parsing Australian NDIS claim CSV files.

The CSV typically has these columns:
- RegistrationNumber (provider number)
- NDISNumber (participant NDIS number)
- SupportsDeliveredFrom (start date)
- SupportsDeliveredTo (end date)
- SupportNumber (e.g., 06_431_0131_2_2)
- ClaimReference
- Quantity
- UnitPrice (the claim amount)
- GSTCode
- ABN of Support Provider

Extract each claim record from the CSV. Parse dates in various formats (YYYY-MM-DD, DD/MM/YYYY, etc.) and convert to YYYY-MM-DD format.

Respond with a JSON array:
[
  {
    "ndisNumber": "string (digits only)",
    "supportsDeliveredFrom": "YYYY-MM-DD",
    "supportsDeliveredTo": "YYYY-MM-DD",
    "claimReference": "string",
    "amount": number,
    "supportNumber": "string"
  }
]`;

    const response = await callClaudeAPI(
      systemPrompt,
      [{ role: "user", content: `Parse these NDIS claims from CSV:\n\n${args.csvContent}` }],
      4096
    );

    // Extract JSON array from response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error("Could not find JSON array in Claude response");
    }

    return JSON.parse(jsonMatch[0]) as ParsedClaimRecord[];
  },
});

// Extract expiry date from any document
export const extractExpiryDate = action({
  args: {
    fileBase64: v.string(),
    mediaType: v.string(),
    documentType: v.string(),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ expiryDate: string | null; confidence: number }> => {
    const systemPrompt = `You are an expert at finding expiry dates in documents.

Look for:
- Expiry date
- Valid until date
- End date
- Renewal date
- Plan end date

For insurance and compliance documents, look for certificate expiry.
For NDIS plans, look for plan end date.

Respond with JSON only:
{
  "expiryDate": "YYYY-MM-DD or null if not found",
  "confidence": 0.0-1.0
}`;

    const userPrompt = `Find the expiry or end date in this ${args.documentType} document.`;

    const message = createVisionMessage(userPrompt, args.fileBase64, args.mediaType);

    const response = await callClaudeAPI(systemPrompt, [message], 512);
    return extractJSON<{ expiryDate: string | null; confidence: number }>(response);
  },
});

// Add item to processing queue
export const addToProcessingQueue = mutation({
  args: {
    storageId: v.id("_storage"),
    fileName: v.string(),
    processingType: v.union(
      v.literal("classification"),
      v.literal("ndis_plan"),
      v.literal("accommodation_agreement"),
      v.literal("csv_claims")
    ),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("aiProcessingQueue", {
      storageId: args.storageId,
      fileName: args.fileName,
      processingType: args.processingType,
      status: "pending",
      createdBy: args.userId,
      createdAt: Date.now(),
    });
  },
});

// Update processing queue item status
export const updateQueueItemStatus = mutation({
  args: {
    queueItemId: v.id("aiProcessingQueue"),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
    result: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const updates: Record<string, unknown> = {
      status: args.status,
    };

    if (args.result !== undefined) {
      updates.result = args.result;
    }

    if (args.error !== undefined) {
      updates.error = args.error;
    }

    if (args.status === "completed" || args.status === "failed") {
      updates.completedAt = Date.now();
    }

    await ctx.db.patch(args.queueItemId, updates);
  },
});

// Get pending queue items
export const getPendingQueueItems = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("aiProcessingQueue")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();
  },
});

// Get queue items by user
export const getQueueItemsByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("aiProcessingQueue")
      .withIndex("by_createdBy", (q) => q.eq("createdBy", args.userId))
      .order("desc")
      .take(50);
  },
});
