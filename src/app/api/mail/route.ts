import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";

/**
 * Postmark Inbound Email Webhook Handler
 *
 * Receives parsed emails from Postmark and creates communication records
 * in MySDAManager. Users forward emails from Outlook to a unique org
 * address; Postmark parses them and POSTs the JSON payload here.
 *
 * Security:
 * - Webhook secret verification (INBOUND_EMAIL_WEBHOOK_SECRET)
 * - Organization routing by unique inbound email address
 *
 * Always returns 200 to prevent Postmark retries on application errors.
 */

let _convex: ConvexHttpClient | null = null;

function getConvex(): ConvexHttpClient {
  if (!_convex) {
    const url = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!url) throw new Error("NEXT_PUBLIC_CONVEX_URL is not configured");
    _convex = new ConvexHttpClient(url);
  }
  return _convex;
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();

    const webhookSecret = process.env.INBOUND_EMAIL_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("[Inbound Email] INBOUND_EMAIL_WEBHOOK_SECRET not configured");
      return NextResponse.json({ success: false, error: "Not configured" }, { status: 200 });
    }

    // Extract email fields from Postmark JSON payload
    const fromEmail =
      payload.FromFull?.Email || extractEmailFromString(payload.From || "");
    const fromName =
      payload.FromFull?.Name || extractNameFromString(payload.From || "");
    const toAddress =
      payload.ToFull?.[0]?.Email || payload.To || "";
    const subject = payload.Subject || "(No Subject)";
    const textBody = payload.TextBody || "";
    const strippedReply = payload.StrippedTextReply || undefined;
    const emailDate = payload.Date || undefined;

    if (!fromEmail || !toAddress) {
      console.error("[Inbound Email] Missing From or To address");
      return NextResponse.json(
        { success: false, error: "Missing From or To" },
        { status: 200 }
      );
    }

    console.log(
      `[Inbound Email] Processing: From=${fromEmail}, To=${toAddress}, Subject=${subject}`
    );

    const convex = getConvex();
    const result = await convex.mutation(api.inboundEmail.processInboundEmail, {
      webhookSecret,
      fromEmail,
      fromName: fromName || fromEmail,
      toAddress,
      subject,
      textBody,
      strippedReply,
      emailDate,
    });

    console.log(
      `[Inbound Email] Created communication ${result.communicationId} in thread ${result.threadId}`
    );

    return NextResponse.json(
      {
        success: true,
        communicationId: result.communicationId,
        threadId: result.threadId,
      },
      { status: 200 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[Inbound Email] Error: ${message}`);

    // Always return 200 to prevent Postmark retries on app errors
    return NextResponse.json(
      { success: false, error: message },
      { status: 200 }
    );
  }
}

/**
 * Extract email address from a "Name <email>" string.
 */
function extractEmailFromString(from: string): string {
  const match = from.match(/<([^>]+)>/);
  if (match) return match[1].trim().toLowerCase();
  if (from.includes("@")) return from.trim().toLowerCase();
  return "";
}

/**
 * Extract display name from a "Name <email>" string.
 */
function extractNameFromString(from: string): string {
  const match = from.match(/^"?([^"<]+)"?\s*</);
  if (match) return match[1].trim();
  if (from.includes("<")) return from.split("<")[0].trim().replace(/"/g, "");
  return "";
}
