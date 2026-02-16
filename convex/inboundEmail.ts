/**
 * Inbound Email Processing Module
 *
 * Processes forwarded emails received via Postmark webhook into the
 * MySDAManager Communications system. Users forward emails from Outlook
 * (or other clients) to a unique org address like:
 *   bls-abc123@inbound.mysdamanager.com
 *
 * Postmark parses the raw email and POSTs structured JSON to our
 * Next.js API route, which calls this mutation via ConvexHttpClient.
 *
 * Supports three major forwarding patterns:
 *   1. Gmail:    "---------- Forwarded message ---------"
 *   2. Outlook:  "-----Original Message-----"
 *   3. Apple:    "Begin forwarded message:"
 *
 * @module inboundEmail
 */

import { mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import {
  findOrCreateThread,
  type CommunicationForThreading,
} from "./lib/threadingEngine";

// ---------------------------------------------------------------------------
// Pure helper functions (no DB access)
// ---------------------------------------------------------------------------

/**
 * Result of parsing a forwarded email body.
 */
export interface ParsedForwardedEmail {
  /** Display name of the original sender (or empty string) */
  originalFrom: string;
  /** Email address of the original sender (or empty string) */
  originalEmail: string;
  /** Subject of the original message (or empty string) */
  originalSubject: string;
  /** Body of the original message */
  originalBody: string;
  /** Whether a forwarding pattern was detected */
  isForwarded: boolean;
}

/**
 * Detect forwarded email patterns and extract original sender information.
 *
 * Pattern 1 -- Gmail / generic:
 *   ---------- Forwarded message ---------
 *   From: John Smith <john@example.com>
 *   Date: Mon, 10 Feb 2026 at 14:00
 *   Subject: Maintenance request
 *   To: admin@bls.com.au
 *
 *   <original body>
 *
 * Pattern 2 -- Outlook:
 *   -----Original Message-----
 *   From: John Smith <john@example.com>
 *   Sent: Monday, 10 February 2026 2:00 PM
 *   To: admin@bls.com.au
 *   Subject: Maintenance request
 *
 *   <original body>
 *
 * Pattern 3 -- Apple Mail:
 *   Begin forwarded message:
 *
 *   From: John Smith <john@example.com>
 *   Subject: Maintenance request
 *   Date: 10 February 2026 at 2:00 PM
 *   To: admin@bls.com.au
 *
 *   <original body>
 *
 * Pattern 4 -- Outlook Web (OWA) inline variant:
 *   ________________________________
 *   From: John Smith <john@example.com>
 *   Sent: Monday, 10 February 2026 2:00 PM
 *   ...
 *
 * If no pattern is detected, the whole email is treated as a direct
 * message (isForwarded = false).
 */
export function parseForwardedEmail(textBody: string): ParsedForwardedEmail {
  if (!textBody || textBody.trim().length === 0) {
    return {
      originalFrom: "",
      originalEmail: "",
      originalSubject: "",
      originalBody: "",
      isForwarded: false,
    };
  }

  // --- Pattern 1: Gmail / generic ---
  // Match "---------- Forwarded message ---------" with flexible dash counts
  const gmailPattern =
    /[-]{3,}\s*Forwarded message\s*[-]{3,}\s*\r?\n([\s\S]*?)(?:\r?\n\r?\n)([\s\S]*)/i;
  const gmailMatch = textBody.match(gmailPattern);
  if (gmailMatch) {
    const headers = gmailMatch[1];
    const body = gmailMatch[2];
    return {
      originalFrom: extractHeaderValue(headers, "From")
        ? extractDisplayName(extractHeaderValue(headers, "From")!)
        : "",
      originalEmail: extractHeaderValue(headers, "From")
        ? extractEmailAddress(extractHeaderValue(headers, "From")!)
        : "",
      originalSubject: extractHeaderValue(headers, "Subject") || "",
      originalBody: body.trim(),
      isForwarded: true,
    };
  }

  // --- Pattern 2: Outlook desktop / classic ---
  // Match "-----Original Message-----" with flexible dash counts
  const outlookPattern =
    /[-]{3,}\s*Original Message\s*[-]{3,}\s*\r?\n([\s\S]*?)(?:\r?\n\r?\n)([\s\S]*)/i;
  const outlookMatch = textBody.match(outlookPattern);
  if (outlookMatch) {
    const headers = outlookMatch[1];
    const body = outlookMatch[2];
    return {
      originalFrom: extractHeaderValue(headers, "From")
        ? extractDisplayName(extractHeaderValue(headers, "From")!)
        : "",
      originalEmail: extractHeaderValue(headers, "From")
        ? extractEmailAddress(extractHeaderValue(headers, "From")!)
        : "",
      originalSubject: extractHeaderValue(headers, "Subject") || "",
      originalBody: body.trim(),
      isForwarded: true,
    };
  }

  // --- Pattern 3: Apple Mail ---
  const applePattern =
    /Begin forwarded message:\s*\r?\n\s*\r?\n([\s\S]*?)(?:\r?\n\r?\n)([\s\S]*)/i;
  const appleMatch = textBody.match(applePattern);
  if (appleMatch) {
    const headers = appleMatch[1];
    const body = appleMatch[2];
    return {
      originalFrom: extractHeaderValue(headers, "From")
        ? extractDisplayName(extractHeaderValue(headers, "From")!)
        : "",
      originalEmail: extractHeaderValue(headers, "From")
        ? extractEmailAddress(extractHeaderValue(headers, "From")!)
        : "",
      originalSubject: extractHeaderValue(headers, "Subject") || "",
      originalBody: body.trim(),
      isForwarded: true,
    };
  }

  // --- Pattern 4: Outlook Web (OWA) inline ---
  // A line of underscores followed by From:
  const owaPattern =
    /[_]{10,}\s*\r?\n\s*From:\s*([\s\S]*?)(?:\r?\n\r?\n)([\s\S]*)/i;
  const owaMatch = textBody.match(owaPattern);
  if (owaMatch) {
    // Re-parse: the first capture starts at "From:" value, reconstruct headers
    const headerBlock = "From: " + owaMatch[1];
    const body = owaMatch[2];
    return {
      originalFrom: extractHeaderValue(headerBlock, "From")
        ? extractDisplayName(extractHeaderValue(headerBlock, "From")!)
        : "",
      originalEmail: extractHeaderValue(headerBlock, "From")
        ? extractEmailAddress(extractHeaderValue(headerBlock, "From")!)
        : "",
      originalSubject: extractHeaderValue(headerBlock, "Subject") || "",
      originalBody: body.trim(),
      isForwarded: true,
    };
  }

  // --- No pattern detected: direct email ---
  return {
    originalFrom: "",
    originalEmail: "",
    originalSubject: "",
    originalBody: textBody.trim(),
    isForwarded: false,
  };
}

/**
 * Extract a header value from a block of "Key: Value" lines.
 * Handles multi-line values where continuation lines start with whitespace.
 *
 * Example input:
 *   "From: John Smith <john@example.com>\nDate: Mon, 10 Feb 2026\nSubject: Hello"
 *   extractHeaderValue(input, "From") => "John Smith <john@example.com>"
 */
function extractHeaderValue(
  headerBlock: string,
  headerName: string
): string | null {
  // Build regex that matches "HeaderName:" at start of line (case-insensitive)
  const regex = new RegExp(
    `^${headerName}\\s*:\\s*(.+?)$`,
    "im"
  );
  const match = headerBlock.match(regex);
  if (!match) return null;
  return match[1].trim();
}

/**
 * Extract email address from a "Name <email@domain.com>" formatted string.
 *
 * Examples:
 *   "John Smith <john@example.com>"  => "john@example.com"
 *   "<john@example.com>"             => "john@example.com"
 *   "john@example.com"               => "john@example.com"
 *   "John Smith"                     => ""
 */
export function extractEmailAddress(fromField: string): string {
  if (!fromField) return "";

  // Try angle-bracket format first: "Name <email>"
  const angleBracketMatch = fromField.match(/<([^>]+)>/);
  if (angleBracketMatch) {
    return angleBracketMatch[1].trim().toLowerCase();
  }

  // Try bare email address
  const bareEmailMatch = fromField.match(
    /([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/
  );
  if (bareEmailMatch) {
    return bareEmailMatch[1].trim().toLowerCase();
  }

  return "";
}

/**
 * Extract display name from a "Name <email@domain.com>" formatted string.
 *
 * Examples:
 *   "John Smith <john@example.com>"  => "John Smith"
 *   "<john@example.com>"             => "john@example.com"
 *   "john@example.com"               => "john@example.com"
 *   "\"John Smith\" <john@ex.com>"   => "John Smith"
 *   ""                               => ""
 */
export function extractDisplayName(fromField: string): string {
  if (!fromField) return "";

  // Try angle-bracket format: "Name <email>"
  const angleBracketMatch = fromField.match(/^(.+?)\s*<[^>]+>/);
  if (angleBracketMatch) {
    let name = angleBracketMatch[1].trim();
    // Remove surrounding quotes
    name = name.replace(/^["']|["']$/g, "");
    if (name.length > 0) {
      return name;
    }
  }

  // If only "<email>" with no name, return the email itself
  const bareAngleMatch = fromField.match(/^<([^>]+)>$/);
  if (bareAngleMatch) {
    return bareAngleMatch[1].trim();
  }

  // Return as-is (might be just an email address or a plain name)
  return fromField.trim();
}

/**
 * Clean an email body by stripping common signatures, forwarding artefacts,
 * and excessive whitespace. Trims to a maximum of 5000 characters.
 *
 * Removes:
 *   - Outlook / Gmail signature blocks ("-- \n", "Sent from my iPhone", etc.)
 *   - Disclaimer blocks ("This email is confidential...")
 *   - Excessive blank lines (more than 2 consecutive)
 *   - Leading/trailing whitespace
 */
export function cleanEmailBody(body: string): string {
  if (!body) return "";

  let cleaned = body;

  // Remove common mobile signatures
  cleaned = cleaned.replace(
    /\r?\n\s*Sent from my (iPhone|iPad|Samsung|Android|Galaxy|Pixel|phone|mobile device)[^\r\n]*/gi,
    ""
  );
  cleaned = cleaned.replace(
    /\r?\n\s*Get Outlook for (iOS|Android)[^\r\n]*/gi,
    ""
  );
  cleaned = cleaned.replace(
    /\r?\n\s*Sent from Mail for Windows[^\r\n]*/gi,
    ""
  );

  // Remove signature separator ("-- " on its own line) and everything after
  const sigSepIndex = cleaned.search(/\r?\n-- \r?\n/);
  if (sigSepIndex !== -1) {
    cleaned = cleaned.substring(0, sigSepIndex);
  }

  // Remove common disclaimer blocks (often multi-line, starts with keywords)
  cleaned = cleaned.replace(
    /\r?\n\s*(DISCLAIMER|CONFIDENTIALITY NOTICE|This email and any attachments are confidential)[^\r\n]*[\s\S]{0,500}$/i,
    ""
  );

  // Remove "Regards," / "Kind regards," / "Thanks," trailing blocks
  // Only if they appear near the end (last 200 chars) to avoid stripping mid-body
  const regardsPattern =
    /\r?\n\s*(Regards|Kind regards|Best regards|Thanks|Thank you|Cheers|Warm regards),?\s*\r?\n[\s\S]{0,200}$/i;
  const regardsMatch = cleaned.match(regardsPattern);
  if (regardsMatch && regardsMatch.index !== undefined) {
    // Only strip if it is in the last 300 characters of the text
    if (cleaned.length - regardsMatch.index < 300) {
      cleaned = cleaned.substring(0, regardsMatch.index);
    }
  }

  // Collapse excessive blank lines (3+ newlines) to 2
  cleaned = cleaned.replace(/(\r?\n){3,}/g, "\n\n");

  // Trim
  cleaned = cleaned.trim();

  // Enforce max length
  const MAX_BODY_LENGTH = 5000;
  if (cleaned.length > MAX_BODY_LENGTH) {
    cleaned = cleaned.substring(0, MAX_BODY_LENGTH);
    // Avoid cutting mid-word
    const lastSpace = cleaned.lastIndexOf(" ");
    if (lastSpace > MAX_BODY_LENGTH - 100) {
      cleaned = cleaned.substring(0, lastSpace);
    }
    cleaned += "\n\n[Truncated - original email exceeded 5000 characters]";
  }

  return cleaned;
}

// ---------------------------------------------------------------------------
// Mutation: processInboundEmail
// ---------------------------------------------------------------------------

/**
 * Process an inbound email forwarded via Postmark webhook.
 *
 * Called from the Next.js API route `/api/mail` using
 * ConvexHttpClient (not useQuery/useMutation). This is a regular
 * mutation, not an internal mutation, so the API route can invoke it.
 *
 * Flow:
 *   1. Verify webhook secret
 *   2. Resolve organization by inbound email address
 *   3. Resolve the forwarding user
 *   4. Parse forwarded email to extract original sender
 *   5. Detect contact type from sender email
 *   6. Auto-thread with existing communications
 *   7. Insert communication record
 *   8. Return result
 */
export const processInboundEmail = mutation({
  args: {
    webhookSecret: v.string(),
    fromEmail: v.string(),
    fromName: v.string(),
    toAddress: v.string(),
    subject: v.string(),
    textBody: v.string(),
    strippedReply: v.optional(v.string()),
    emailDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // -----------------------------------------------------------------------
    // 1. Verify webhook secret
    // -----------------------------------------------------------------------
    const expectedSecret = process.env.INBOUND_EMAIL_WEBHOOK_SECRET;
    if (!expectedSecret || args.webhookSecret !== expectedSecret) {
      throw new Error("Unauthorized: invalid webhook secret");
    }

    // -----------------------------------------------------------------------
    // 2. Resolve organization by inbound email address
    // -----------------------------------------------------------------------
    const toAddr = args.toAddress.toLowerCase().trim();

    // Try custom domain address first, then fallback to Postmark hash address
    let org = await ctx.db
      .query("organizations")
      .withIndex("by_inboundEmailAddress", (q) =>
        q.eq("inboundEmailAddress", toAddr)
      )
      .first();

    if (!org) {
      org = await ctx.db
        .query("organizations")
        .withIndex("by_postmarkHashAddress", (q) =>
          q.eq("postmarkHashAddress", toAddr)
        )
        .first();
    }

    if (!org) {
      throw new Error(
        `No organization found for inbound address: ${args.toAddress}`
      );
    }
    if (!org.inboundEmailEnabled) {
      throw new Error(
        `Inbound email is disabled for organization: ${org.name}`
      );
    }

    const organizationId = org._id;

    // -----------------------------------------------------------------------
    // 3. Resolve the forwarding user
    // -----------------------------------------------------------------------
    const forwarderEmail = args.fromEmail.toLowerCase().trim();
    let forwarderUserId: string | null = null;

    // 3a. Check emailForwarders table first (explicit mapping)
    const forwarder = await ctx.db
      .query("emailForwarders")
      .withIndex("by_email", (q) => q.eq("email", forwarderEmail))
      .first();

    if (forwarder && forwarder.isActive) {
      forwarderUserId = forwarder.userId;
    }

    // 3b. Fall back to users table (match by email within org)
    if (!forwarderUserId) {
      const users = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", forwarderEmail))
        .collect();

      const orgUser = users.find(
        (u) =>
          u.organizationId !== undefined &&
          u.organizationId === organizationId &&
          u.isActive
      );
      if (orgUser) {
        forwarderUserId = orgUser._id;
      }
    }

    // 3c. Fall back to first active admin in the organization
    if (!forwarderUserId) {
      const orgUsers = await ctx.db
        .query("users")
        .withIndex("by_organizationId", (q) =>
          q.eq("organizationId", organizationId)
        )
        .collect();

      const admin = orgUsers.find(
        (u) => u.role === "admin" && u.isActive
      );
      if (admin) {
        forwarderUserId = admin._id;
      } else {
        // Absolute fallback: any active user in the org
        const anyUser = orgUsers.find((u) => u.isActive);
        if (anyUser) {
          forwarderUserId = anyUser._id;
        }
      }
    }

    if (!forwarderUserId) {
      throw new Error(
        `No active user found in organization ${org.name} to attribute this email to`
      );
    }

    // -----------------------------------------------------------------------
    // 4. Parse forwarded email to extract original sender
    // -----------------------------------------------------------------------
    const parsed = parseForwardedEmail(args.textBody);

    let contactName: string;
    let contactEmail: string;
    let subject: string;
    let bodyText: string;

    if (parsed.isForwarded) {
      // Use original sender info from the forwarded content
      contactName =
        parsed.originalFrom || extractDisplayName(args.fromName) || "Unknown";
      contactEmail =
        parsed.originalEmail || args.fromEmail;
      subject = parsed.originalSubject || args.subject || "(No subject)";
      // Prefer the parsed original body; fall back to strippedReply
      bodyText = parsed.originalBody || args.strippedReply || args.textBody;
    } else {
      // Direct email (not forwarded) -- use the actual sender
      contactName =
        args.fromName || extractDisplayName(args.fromEmail) || "Unknown";
      contactEmail = args.fromEmail;
      subject = args.subject || "(No subject)";
      bodyText = args.strippedReply || args.textBody;
    }

    const cleanedBody = cleanEmailBody(bodyText);

    // -----------------------------------------------------------------------
    // 5. Detect contact type and entity from sender's email
    // -----------------------------------------------------------------------
    const detection = await detectContactAndEntity(
      ctx,
      contactEmail,
      organizationId
    );

    // -----------------------------------------------------------------------
    // 6. Auto-thread with existing communications
    // -----------------------------------------------------------------------
    // Fetch recent org communications for threading (last 200, non-deleted)
    const recentComms = await ctx.db
      .query("communications")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", organizationId)
      )
      .order("desc")
      .filter((q) => q.neq(q.field("isDeleted"), true))
      .take(200);

    const now = Date.now();

    // Build the new communication object for threading
    const newCommForThreading: CommunicationForThreading = {
      _id: "", // Not created yet
      contactName: contactName,
      subject: subject,
      communicationType: "email",
      communicationDate: resolveCommunicationDate(args.emailDate),
      createdAt: now,
    };

    // Map existing communications for threading comparison
    const recentCommForThreading: CommunicationForThreading[] =
      recentComms.map((comm) => ({
        _id: comm._id as string,
        contactName: comm.contactName,
        subject: comm.subject,
        communicationType: comm.communicationType,
        communicationDate: comm.communicationDate,
        communicationTime: comm.communicationTime,
        createdAt: comm.createdAt,
        threadId: comm.threadId,
      }));

    const threadResult = findOrCreateThread(
      newCommForThreading,
      recentCommForThreading
    );

    // -----------------------------------------------------------------------
    // 7. Insert communication record
    // -----------------------------------------------------------------------
    const communicationId = await ctx.db.insert("communications", {
      organizationId: organizationId,
      communicationType: "email" as const,
      direction: "received" as const,
      communicationDate: resolveCommunicationDate(args.emailDate),
      contactType: detection.contactType,
      contactName: contactName,
      contactEmail: contactEmail || undefined,
      subject: subject,
      summary: cleanedBody || "(Empty email body)",
      threadId: threadResult.threadId,
      isThreadStarter: threadResult.isNewThread,
      // Stakeholder entity linking (auto-detected from sender email)
      stakeholderEntityType: detection.stakeholderEntityType,
      stakeholderEntityId: detection.stakeholderEntityId,
      // Auto-linked participant from SC/SIL relationship tables
      linkedParticipantId: detection.linkedParticipantId as any, // Schema: v.optional(v.id("participants"))
      createdBy: forwarderUserId as any, // Typed as Id<"users"> in schema
      createdAt: now,
      updatedAt: now,
    });

    // -----------------------------------------------------------------------
    // 8. Return result
    // -----------------------------------------------------------------------
    return {
      communicationId,
      threadId: threadResult.threadId,
      contactName,
      contactEmail,
      contactType: detection.contactType,
      stakeholderEntityType: detection.stakeholderEntityType,
      stakeholderEntityId: detection.stakeholderEntityId,
      linkedParticipantId: detection.linkedParticipantId,
      subject,
      isForwarded: parsed.isForwarded,
      isNewThread: threadResult.isNewThread,
    };
  },
});

// ---------------------------------------------------------------------------
// Internal helpers (DB access)
// ---------------------------------------------------------------------------

/**
 * Result of detecting contact type and associated entity from a sender email.
 */
interface ContactDetectionResult {
  contactType: "ndia" | "support_coordinator" | "sil_provider" | "ot" | "contractor" | "other";
  stakeholderEntityType?: "support_coordinator" | "sil_provider" | "occupational_therapist" | "contractor";
  stakeholderEntityId?: string;
  linkedParticipantId?: string; // Auto-linked from SC/SIL participant relationships
}

/**
 * Detect the contact type of an email sender by checking their address
 * against known entities in the database. Returns the entity ID and
 * stakeholder type for automatic communication linking.
 *
 * Priority order:
 *   1. Support Coordinators (by_email index) + participant lookup
 *   2. SIL Providers (by_email index) + participant lookup
 *   3. Occupational Therapists (by_email index)
 *   4. Contractors (by_email index)
 *   5. Domain pattern: @ndis.gov.au => "ndia"
 *   6. Default: "other"
 */
async function detectContactAndEntity(
  ctx: any,
  email: string,
  organizationId: string
): Promise<ContactDetectionResult> {
  if (!email) return { contactType: "other" };

  const normalizedEmail = email.toLowerCase().trim();

  // 1. Support Coordinators
  const sc = await ctx.db
    .query("supportCoordinators")
    .withIndex("by_email", (q: any) => q.eq("email", normalizedEmail))
    .first();
  if (sc && (sc.organizationId === organizationId || !sc.organizationId)) {
    // Look up linked participant via supportCoordinatorParticipants
    let linkedParticipantId: string | undefined;
    const scParticipant = await ctx.db
      .query("supportCoordinatorParticipants")
      .withIndex("by_coordinator", (q: any) => q.eq("supportCoordinatorId", sc._id))
      .first();
    if (scParticipant) {
      linkedParticipantId = scParticipant.participantId as string;
    }

    return {
      contactType: "support_coordinator",
      stakeholderEntityType: "support_coordinator",
      stakeholderEntityId: sc._id as string,
      linkedParticipantId,
    };
  }

  // 2. SIL Providers
  const sil = await ctx.db
    .query("silProviders")
    .withIndex("by_email", (q: any) => q.eq("email", normalizedEmail))
    .first();
  if (sil && (sil.organizationId === organizationId || !sil.organizationId)) {
    // Look up linked participant via silProviderParticipants
    let linkedParticipantId: string | undefined;
    const silParticipant = await ctx.db
      .query("silProviderParticipants")
      .withIndex("by_provider", (q: any) => q.eq("silProviderId", sil._id))
      .first();
    if (silParticipant) {
      linkedParticipantId = silParticipant.participantId as string;
    }

    return {
      contactType: "sil_provider",
      stakeholderEntityType: "sil_provider",
      stakeholderEntityId: sil._id as string,
      linkedParticipantId,
    };
  }

  // 3. Occupational Therapists
  const ot = await ctx.db
    .query("occupationalTherapists")
    .withIndex("by_email", (q: any) => q.eq("email", normalizedEmail))
    .first();
  if (ot && (ot.organizationId === organizationId || !ot.organizationId)) {
    return {
      contactType: "ot",
      stakeholderEntityType: "occupational_therapist",
      stakeholderEntityId: ot._id as string,
    };
  }

  // 4. Contractors
  const contractor = await ctx.db
    .query("contractors")
    .withIndex("by_email", (q: any) => q.eq("email", normalizedEmail))
    .first();
  if (
    contractor &&
    (contractor.organizationId === organizationId ||
      !contractor.organizationId)
  ) {
    return {
      contactType: "contractor",
      stakeholderEntityType: "contractor",
      stakeholderEntityId: contractor._id as string,
    };
  }

  // 5. Domain-based detection
  const domain = normalizedEmail.split("@")[1];
  if (domain) {
    // NDIS / NDIA government domains
    if (
      domain === "ndis.gov.au" ||
      domain === "ndia.gov.au" ||
      domain.endsWith(".ndis.gov.au")
    ) {
      return { contactType: "ndia" };
    }
  }

  // 6. Default
  return { contactType: "other" };
}

/**
 * Resolve a communication date string from the email date header.
 * Returns an ISO date string (YYYY-MM-DD).
 *
 * If the input is missing or unparseable, returns today's date.
 */
function resolveCommunicationDate(emailDate?: string): string {
  if (!emailDate) {
    return new Date().toISOString().split("T")[0];
  }

  try {
    const parsed = new Date(emailDate);
    if (isNaN(parsed.getTime())) {
      return new Date().toISOString().split("T")[0];
    }
    return parsed.toISOString().split("T")[0];
  } catch {
    return new Date().toISOString().split("T")[0];
  }
}

// ---------------------------------------------------------------------------
// Action: syncInboundEmails
// ---------------------------------------------------------------------------

/**
 * Manually sync inbound emails from Postmark's Messages API.
 * Fetches recent inbound messages and processes any that weren't
 * already captured by the webhook (e.g., if the webhook was down).
 *
 * Requires POSTMARK_SERVER_TOKEN env var.
 */
export const syncInboundEmails = action({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args): Promise<{ synced: number; skipped: number; errors: number }> => {
    const postmarkToken = process.env.POSTMARK_SERVER_TOKEN;
    if (!postmarkToken) {
      throw new Error("POSTMARK_SERVER_TOKEN is not configured. Set it in Convex environment variables.");
    }

    const webhookSecret = process.env.INBOUND_EMAIL_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error("INBOUND_EMAIL_WEBHOOK_SECRET is not configured.");
    }

    // Fetch recent inbound messages from Postmark (last 50)
    const response = await fetch(
      "https://api.postmarkapp.com/messages/inbound?count=50&offset=0",
      {
        headers: {
          Accept: "application/json",
          "X-Postmark-Server-Token": postmarkToken,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Postmark API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const messages = data.InboundMessages || [];

    let synced = 0;
    let skipped = 0;
    let errors = 0;

    for (const msg of messages) {
      const fromEmail = msg.FromFull?.Email || msg.From || "";
      const toAddress = msg.ToFull?.[0]?.Email || msg.To || "";
      const subject = msg.Subject || "(No Subject)";
      const messageId = msg.MessageID || "";

      if (!fromEmail || !toAddress) {
        skipped++;
        continue;
      }

      // Fetch full message details (includes TextBody)
      let textBody = msg.TextBody || "";
      if (!textBody && messageId) {
        try {
          const detailRes = await fetch(
            `https://api.postmarkapp.com/messages/inbound/${messageId}/details`,
            {
              headers: {
                Accept: "application/json",
                "X-Postmark-Server-Token": postmarkToken,
              },
            }
          );
          if (detailRes.ok) {
            const detail = await detailRes.json();
            textBody = detail.TextBody || "";
          }
        } catch {
          // Fall through with empty body
        }
      }

      if (!textBody) {
        skipped++;
        continue;
      }

      try {
        await ctx.runMutation(api.inboundEmail.processInboundEmail, {
          webhookSecret,
          fromEmail,
          fromName: msg.FromFull?.Name || msg.FromName || fromEmail,
          toAddress,
          subject,
          textBody,
          strippedReply: undefined,
          emailDate: msg.Date || undefined,
        });
        synced++;
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        // Duplicates will naturally be handled by threading - they'll join existing threads
        // But if the org isn't found or other config errors, count as skipped
        if (errMsg.includes("No organization found") || errMsg.includes("Unauthorized")) {
          skipped++;
        } else {
          console.error(`[Email Sync] Failed to process message ${messageId}: ${errMsg}`);
          errors++;
        }
      }
    }

    return { synced, skipped, errors };
  },
});
