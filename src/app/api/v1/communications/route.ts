import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import {
  authenticateApiRequest,
  hasPermission,
  API_CORS_HEADERS,
} from "../_lib/auth";

let _convex: ConvexHttpClient | null = null;

function getConvex(): ConvexHttpClient {
  if (!_convex) {
    const url = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!url) throw new Error("NEXT_PUBLIC_CONVEX_URL is not configured");
    _convex = new ConvexHttpClient(url);
  }
  return _convex;
}

/**
 * GET /api/v1/communications
 *
 * Query parameters:
 * - contactType: Filter by contact type
 * - contactName: Filter by contact name
 * - search: Search in name, subject, summary
 * - limit: Maximum results (1-100, default 100)
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateApiRequest(request);
  if ("error" in auth) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.status, headers: API_CORS_HEADERS }
    );
  }

  if (!hasPermission(auth, "read:communications")) {
    return NextResponse.json(
      { error: "Insufficient permissions. Required: read:communications" },
      { status: 403, headers: API_CORS_HEADERS }
    );
  }

  try {
    const convex = getConvex();
    const { searchParams } = new URL(request.url);

    const contactType = searchParams.get("contactType") || undefined;
    const contactName = searchParams.get("contactName") || undefined;
    const search = searchParams.get("search") || undefined;
    const limitParam = searchParams.get("limit");
    const limit = limitParam
      ? Math.min(Math.max(parseInt(limitParam, 10) || 100, 1), 100)
      : undefined;

    const communications = await convex.query(
      api.apiQueries.listCommunications,
      {
        organizationId: auth.organizationId as Id<"organizations">,
        contactType,
        contactName,
        search,
        limit,
      }
    );

    return NextResponse.json(
      {
        data: communications,
        meta: {
          count: communications.length,
          timestamp: new Date().toISOString(),
        },
      },
      { status: 200, headers: API_CORS_HEADERS }
    );
  } catch (err) {
    console.error("[REST API] GET /api/v1/communications error:", err);
    return NextResponse.json(
      { error: "Failed to fetch communications" },
      { status: 500, headers: API_CORS_HEADERS }
    );
  }
}

/**
 * POST /api/v1/communications
 *
 * Request body (JSON):
 * - direction: "sent" | "received" (required)
 * - contactName: string (required)
 * - summary: string (required)
 * - communicationDate: string YYYY-MM-DD (required)
 * - communicationType?: "email" | "sms" | "phone_call" | "meeting" | "other"
 * - contactEmail?: string
 * - contactType?: string (default: "support_coordinator")
 * - subject?: string
 * - communicationTime?: string HH:MM
 * - existingThreadId?: string
 * - linkedParticipantId?: string (Convex participant ID)
 * - linkedPropertyId?: string (Convex property ID)
 * - stakeholderEntityType?: string
 * - stakeholderEntityId?: string
 */
export async function POST(request: NextRequest) {
  const auth = await authenticateApiRequest(request);
  if ("error" in auth) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.status, headers: API_CORS_HEADERS }
    );
  }

  if (!hasPermission(auth, "write:communications")) {
    return NextResponse.json(
      { error: "Insufficient permissions. Required: write:communications" },
      { status: 403, headers: API_CORS_HEADERS }
    );
  }

  try {
    const body = await request.json();

    // Validate required fields
    if (!body.direction || !body.contactName || !body.summary || !body.communicationDate) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: direction, contactName, summary, communicationDate",
        },
        { status: 400, headers: API_CORS_HEADERS }
      );
    }

    // Validate direction
    if (!["sent", "received"].includes(body.direction)) {
      return NextResponse.json(
        { error: "Invalid direction. Must be 'sent' or 'received'" },
        { status: 400, headers: API_CORS_HEADERS }
      );
    }

    // Validate communicationDate format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(body.communicationDate)) {
      return NextResponse.json(
        { error: "Invalid communicationDate format. Expected: YYYY-MM-DD" },
        { status: 400, headers: API_CORS_HEADERS }
      );
    }

    // Validate communicationType if provided
    const validCommTypes = ["email", "sms", "phone_call", "meeting", "other"];
    if (body.communicationType && !validCommTypes.includes(body.communicationType)) {
      return NextResponse.json(
        { error: `Invalid communicationType. Must be one of: ${validCommTypes.join(", ")}` },
        { status: 400, headers: API_CORS_HEADERS }
      );
    }

    // Validate contactType if provided
    const validContactTypes = [
      "ndia", "support_coordinator", "sil_provider", "participant",
      "family", "plan_manager", "ot", "contractor", "other",
    ];
    if (body.contactType && !validContactTypes.includes(body.contactType)) {
      return NextResponse.json(
        { error: `Invalid contactType. Must be one of: ${validContactTypes.join(", ")}` },
        { status: 400, headers: API_CORS_HEADERS }
      );
    }

    const convex = getConvex();
    const result = await convex.mutation(api.apiQueries.createCommunication, {
      organizationId: auth.organizationId as Id<"organizations">,
      createdByUserId: auth.createdBy as Id<"users">,
      communicationType: body.communicationType as "email" | "sms" | "phone_call" | "meeting" | "other" | undefined,
      direction: body.direction as "sent" | "received",
      contactName: String(body.contactName).substring(0, 500),
      contactEmail: body.contactEmail ? String(body.contactEmail).substring(0, 500) : undefined,
      contactType: body.contactType as "ndia" | "support_coordinator" | "sil_provider" | "participant" | "family" | "plan_manager" | "ot" | "contractor" | "other" | undefined,
      subject: body.subject ? String(body.subject).substring(0, 500) : undefined,
      summary: String(body.summary).substring(0, 10000),
      communicationDate: body.communicationDate,
      communicationTime: body.communicationTime || undefined,
      existingThreadId: body.existingThreadId || undefined,
      linkedParticipantId: body.linkedParticipantId
        ? (body.linkedParticipantId as Id<"participants">)
        : undefined,
      linkedPropertyId: body.linkedPropertyId
        ? (body.linkedPropertyId as Id<"properties">)
        : undefined,
      stakeholderEntityType: body.stakeholderEntityType || undefined,
      stakeholderEntityId: body.stakeholderEntityId || undefined,
    });

    return NextResponse.json(
      {
        data: result,
        meta: { timestamp: new Date().toISOString() },
      },
      { status: 201, headers: API_CORS_HEADERS }
    );
  } catch (err) {
    console.error("[REST API] POST /api/v1/communications error:", err);
    return NextResponse.json(
      { error: "Failed to create communication" },
      { status: 500, headers: API_CORS_HEADERS }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: API_CORS_HEADERS });
}
