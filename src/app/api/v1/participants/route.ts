import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import {
  authenticateApiRequest,
  hasPermission,
  API_CORS_HEADERS,
} from "../_lib/auth";

/**
 * REST API - Participants Endpoint
 *
 * GET  /api/v1/participants - List participants (requires read:participants)
 * POST /api/v1/participants - Create a participant (requires write:participants)
 *
 * Security posture:
 * - Authentication: Bearer API key (msd_live_*) validated via Convex
 * - Rate limiting: NOT NEEDED - API key auth + Convex rate limits provide protection
 * - CSRF/Origin: EXEMPT - API key authentication replaces Origin checks;
 *   API keys are not browser-accessible credentials
 * - Input validation: YES - required fields, enum validation, max lengths
 * - Tenant isolation: Automatic via organizationId from API key
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

/**
 * GET /api/v1/participants
 *
 * Query parameters:
 * - status: Filter by participant status (active, inactive, pending_move_in, moved_out)
 * - search: Search by name or NDIS number
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

  if (!hasPermission(auth, "read:participants")) {
    return NextResponse.json(
      { error: "Insufficient permissions. Required: read:participants" },
      { status: 403, headers: API_CORS_HEADERS }
    );
  }

  try {
    const convex = getConvex();
    const { searchParams } = new URL(request.url);

    const status = searchParams.get("status") || undefined;
    const search = searchParams.get("search") || undefined;
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 100, 1), 100) : undefined;

    const participants = await convex.query(api.apiQueries.listParticipants, {
      organizationId: auth.organizationId as Id<"organizations">,
      status,
      search,
      limit,
    });

    return NextResponse.json(
      {
        data: participants,
        meta: {
          count: participants.length,
          timestamp: new Date().toISOString(),
        },
      },
      { status: 200, headers: API_CORS_HEADERS }
    );
  } catch (err) {
    console.error("[REST API] GET /api/v1/participants error:", err);
    return NextResponse.json(
      { error: "Failed to fetch participants" },
      { status: 500, headers: API_CORS_HEADERS }
    );
  }
}

/**
 * POST /api/v1/participants
 *
 * Request body (JSON):
 * - ndisNumber: string (required)
 * - firstName: string (required)
 * - lastName: string (required)
 * - dwellingId: string (required - Convex dwelling ID)
 * - dateOfBirth?: string (YYYY-MM-DD)
 * - email?: string
 * - phone?: string
 * - emergencyContactName?: string
 * - emergencyContactPhone?: string
 * - emergencyContactRelation?: string
 * - moveInDate?: string (YYYY-MM-DD)
 * - status?: string (active, pending_move_in) - defaults to "active"
 * - silProviderName?: string
 * - supportCoordinatorName?: string
 * - supportCoordinatorEmail?: string
 * - supportCoordinatorPhone?: string
 * - notes?: string
 */
export async function POST(request: NextRequest) {
  const auth = await authenticateApiRequest(request);
  if ("error" in auth) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.status, headers: API_CORS_HEADERS }
    );
  }

  if (!hasPermission(auth, "write:participants")) {
    return NextResponse.json(
      { error: "Insufficient permissions. Required: write:participants" },
      { status: 403, headers: API_CORS_HEADERS }
    );
  }

  try {
    const body = await request.json();

    // Validate required fields
    if (!body.ndisNumber || !body.firstName || !body.lastName || !body.dwellingId) {
      return NextResponse.json(
        {
          error: "Missing required fields: ndisNumber, firstName, lastName, dwellingId",
        },
        { status: 400, headers: API_CORS_HEADERS }
      );
    }

    // Validate status if provided
    const validStatuses = ["active", "pending_move_in"];
    if (body.status && !validStatuses.includes(body.status)) {
      return NextResponse.json(
        {
          error: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
        },
        { status: 400, headers: API_CORS_HEADERS }
      );
    }

    const convex = getConvex();
    const result = await convex.mutation(api.apiQueries.createParticipant, {
      organizationId: auth.organizationId as Id<"organizations">,
      ndisNumber: String(body.ndisNumber).substring(0, 20),
      firstName: String(body.firstName).substring(0, 100),
      lastName: String(body.lastName).substring(0, 100),
      dwellingId: body.dwellingId as Id<"dwellings">,
      dateOfBirth: body.dateOfBirth || undefined,
      email: body.email ? String(body.email).substring(0, 255) : undefined,
      phone: body.phone ? String(body.phone).substring(0, 20) : undefined,
      emergencyContactName: body.emergencyContactName ? String(body.emergencyContactName).substring(0, 200) : undefined,
      emergencyContactPhone: body.emergencyContactPhone ? String(body.emergencyContactPhone).substring(0, 20) : undefined,
      emergencyContactRelation: body.emergencyContactRelation ? String(body.emergencyContactRelation).substring(0, 100) : undefined,
      moveInDate: body.moveInDate || undefined,
      status: body.status || undefined,
      silProviderName: body.silProviderName ? String(body.silProviderName).substring(0, 200) : undefined,
      supportCoordinatorName: body.supportCoordinatorName ? String(body.supportCoordinatorName).substring(0, 200) : undefined,
      supportCoordinatorEmail: body.supportCoordinatorEmail ? String(body.supportCoordinatorEmail).substring(0, 255) : undefined,
      supportCoordinatorPhone: body.supportCoordinatorPhone ? String(body.supportCoordinatorPhone).substring(0, 20) : undefined,
      notes: body.notes ? String(body.notes).substring(0, 2000) : undefined,
    });

    return NextResponse.json(
      {
        data: result,
        meta: { timestamp: new Date().toISOString() },
      },
      { status: 201, headers: API_CORS_HEADERS }
    );
  } catch (err) {
    console.error("[REST API] POST /api/v1/participants error:", err);
    const message = err instanceof Error ? err.message : "Failed to create participant";
    // Surface dwelling ownership errors to the client
    if (message.includes("does not belong to this organization")) {
      return NextResponse.json(
        { error: message },
        { status: 400, headers: API_CORS_HEADERS }
      );
    }
    return NextResponse.json(
      { error: "Failed to create participant" },
      { status: 500, headers: API_CORS_HEADERS }
    );
  }
}

/**
 * OPTIONS handler for CORS preflight requests.
 */
export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: API_CORS_HEADERS });
}
