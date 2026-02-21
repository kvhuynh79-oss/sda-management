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
 * REST API - Properties Endpoint
 *
 * GET  /api/v1/properties - List properties (requires read:properties)
 * POST /api/v1/properties - Create a property (requires write:properties)
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
 * GET /api/v1/properties
 *
 * Query parameters:
 * - status: Filter by property status (active, under_construction, planning, sil_property)
 * - search: Search by address or property name
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

  if (!hasPermission(auth, "read:properties")) {
    return NextResponse.json(
      { error: "Insufficient permissions. Required: read:properties" },
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

    const properties = await convex.query(api.apiQueries.listProperties, {
      organizationId: auth.organizationId as Id<"organizations">,
      status,
      search,
      limit,
    });

    return NextResponse.json(
      {
        data: properties,
        meta: {
          count: properties.length,
          timestamp: new Date().toISOString(),
        },
      },
      { status: 200, headers: API_CORS_HEADERS }
    );
  } catch (err) {
    console.error("[REST API] GET /api/v1/properties error:", err);
    return NextResponse.json(
      { error: "Failed to fetch properties" },
      { status: 500, headers: API_CORS_HEADERS }
    );
  }
}

/**
 * POST /api/v1/properties
 *
 * Request body (JSON):
 * - addressLine1: string (required)
 * - suburb: string (required)
 * - state: string (required - NSW, VIC, QLD, SA, WA, TAS, NT, ACT)
 * - postcode: string (required)
 * - propertyName?: string
 * - addressLine2?: string
 * - propertyStatus?: string (active, under_construction, planning, sil_property)
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

  if (!hasPermission(auth, "write:properties")) {
    return NextResponse.json(
      { error: "Insufficient permissions. Required: write:properties" },
      { status: 403, headers: API_CORS_HEADERS }
    );
  }

  try {
    const body = await request.json();

    // Validate required fields
    if (!body.addressLine1 || !body.suburb || !body.state || !body.postcode) {
      return NextResponse.json(
        {
          error: "Missing required fields: addressLine1, suburb, state, postcode",
        },
        { status: 400, headers: API_CORS_HEADERS }
      );
    }

    // Validate state
    const validStates = ["NSW", "VIC", "QLD", "SA", "WA", "TAS", "NT", "ACT"];
    if (!validStates.includes(body.state)) {
      return NextResponse.json(
        {
          error: `Invalid state. Must be one of: ${validStates.join(", ")}`,
        },
        { status: 400, headers: API_CORS_HEADERS }
      );
    }

    // Validate propertyStatus if provided
    const validStatuses = ["active", "under_construction", "planning", "sil_property"];
    if (body.propertyStatus && !validStatuses.includes(body.propertyStatus)) {
      return NextResponse.json(
        {
          error: `Invalid propertyStatus. Must be one of: ${validStatuses.join(", ")}`,
        },
        { status: 400, headers: API_CORS_HEADERS }
      );
    }

    const convex = getConvex();
    const result = await convex.mutation(api.apiQueries.createProperty, {
      organizationId: auth.organizationId as Id<"organizations">,
      propertyName: body.propertyName || undefined,
      addressLine1: String(body.addressLine1).substring(0, 500),
      addressLine2: body.addressLine2 ? String(body.addressLine2).substring(0, 500) : undefined,
      suburb: String(body.suburb).substring(0, 200),
      state: body.state,
      postcode: String(body.postcode).substring(0, 10),
      propertyStatus: body.propertyStatus || undefined,
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
    console.error("[REST API] POST /api/v1/properties error:", err);
    return NextResponse.json(
      { error: "Failed to create property" },
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
