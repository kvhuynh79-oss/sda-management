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
 * REST API - Maintenance Requests Endpoint
 *
 * GET  /api/v1/maintenance - List maintenance requests (requires read:maintenance)
 * POST /api/v1/maintenance - Create a maintenance request (requires write:maintenance)
 *
 * Security posture:
 * - Authentication: Bearer API key (msd_live_*) validated via Convex
 * - Rate limiting: NOT NEEDED - API key auth + Convex rate limits provide protection
 * - CSRF/Origin: EXEMPT - API key authentication replaces Origin checks;
 *   API keys are not browser-accessible credentials
 * - Input validation: YES - required fields, enum validation, date format, max lengths
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
 * GET /api/v1/maintenance
 *
 * Query parameters:
 * - status: Filter by status (reported, awaiting_quotes, quoted, approved, scheduled, in_progress, completed, cancelled)
 * - priority: Filter by priority (urgent, high, medium, low)
 * - search: Search by title or description
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

  if (!hasPermission(auth, "read:maintenance")) {
    return NextResponse.json(
      { error: "Insufficient permissions. Required: read:maintenance" },
      { status: 403, headers: API_CORS_HEADERS }
    );
  }

  try {
    const convex = getConvex();
    const { searchParams } = new URL(request.url);

    const status = searchParams.get("status") || undefined;
    const priority = searchParams.get("priority") || undefined;
    const search = searchParams.get("search") || undefined;
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 100, 1), 100) : undefined;

    const requests = await convex.query(
      api.apiQueries.listMaintenanceRequests,
      {
        organizationId: auth.organizationId as Id<"organizations">,
        status,
        priority,
        search,
        limit,
      }
    );

    return NextResponse.json(
      {
        data: requests,
        meta: {
          count: requests.length,
          timestamp: new Date().toISOString(),
        },
      },
      { status: 200, headers: API_CORS_HEADERS }
    );
  } catch (err) {
    console.error("[REST API] GET /api/v1/maintenance error:", err);
    return NextResponse.json(
      { error: "Failed to fetch maintenance requests" },
      { status: 500, headers: API_CORS_HEADERS }
    );
  }
}

/**
 * POST /api/v1/maintenance
 *
 * Request body (JSON):
 * - dwellingId: string (required - Convex dwelling ID)
 * - title: string (required)
 * - description: string (required)
 * - reportedDate: string (required - YYYY-MM-DD)
 * - createdBy: string (required - Convex user ID)
 * - requestType?: string (reactive, preventative) - defaults to "reactive"
 * - category?: string (plumbing, electrical, appliances, building, grounds, safety, general) - defaults to "general"
 * - priority?: string (urgent, high, medium, low) - defaults to "medium"
 * - reportedBy?: string (name of person reporting)
 * - contractorName?: string
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

  if (!hasPermission(auth, "write:maintenance")) {
    return NextResponse.json(
      { error: "Insufficient permissions. Required: write:maintenance" },
      { status: 403, headers: API_CORS_HEADERS }
    );
  }

  try {
    const body = await request.json();

    // Validate required fields
    if (
      !body.dwellingId ||
      !body.title ||
      !body.description ||
      !body.reportedDate ||
      !body.createdBy
    ) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: dwellingId, title, description, reportedDate, createdBy",
        },
        { status: 400, headers: API_CORS_HEADERS }
      );
    }

    // Validate requestType if provided
    const validRequestTypes = ["reactive", "preventative"];
    const requestType = body.requestType || "reactive";
    if (!validRequestTypes.includes(requestType)) {
      return NextResponse.json(
        {
          error: `Invalid requestType. Must be one of: ${validRequestTypes.join(", ")}`,
        },
        { status: 400, headers: API_CORS_HEADERS }
      );
    }

    // Validate category if provided
    const validCategories = [
      "plumbing",
      "electrical",
      "appliances",
      "building",
      "grounds",
      "safety",
      "general",
    ];
    const category = body.category || "general";
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        {
          error: `Invalid category. Must be one of: ${validCategories.join(", ")}`,
        },
        { status: 400, headers: API_CORS_HEADERS }
      );
    }

    // Validate priority if provided
    const validPriorities = ["urgent", "high", "medium", "low"];
    const priority = body.priority || "medium";
    if (!validPriorities.includes(priority)) {
      return NextResponse.json(
        {
          error: `Invalid priority. Must be one of: ${validPriorities.join(", ")}`,
        },
        { status: 400, headers: API_CORS_HEADERS }
      );
    }

    // Validate reportedDate format (basic YYYY-MM-DD check)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(body.reportedDate)) {
      return NextResponse.json(
        { error: "Invalid reportedDate format. Expected: YYYY-MM-DD" },
        { status: 400, headers: API_CORS_HEADERS }
      );
    }

    const convex = getConvex();
    const result = await convex.mutation(
      api.apiQueries.createMaintenanceRequest,
      {
        organizationId: auth.organizationId as Id<"organizations">,
        dwellingId: body.dwellingId as Id<"dwellings">,
        requestType: requestType as "reactive" | "preventative",
        category: category as
          | "plumbing"
          | "electrical"
          | "appliances"
          | "building"
          | "grounds"
          | "safety"
          | "general",
        priority: priority as "urgent" | "high" | "medium" | "low",
        title: String(body.title).substring(0, 500),
        description: String(body.description).substring(0, 5000),
        reportedBy: body.reportedBy
          ? String(body.reportedBy).substring(0, 200)
          : undefined,
        reportedDate: body.reportedDate,
        contractorName: body.contractorName
          ? String(body.contractorName).substring(0, 200)
          : undefined,
        notes: body.notes
          ? String(body.notes).substring(0, 2000)
          : undefined,
        createdBy: body.createdBy as Id<"users">,
      }
    );

    return NextResponse.json(
      {
        data: result,
        meta: { timestamp: new Date().toISOString() },
      },
      { status: 201, headers: API_CORS_HEADERS }
    );
  } catch (err) {
    console.error("[REST API] POST /api/v1/maintenance error:", err);
    const message =
      err instanceof Error ? err.message : "Failed to create maintenance request";
    if (message.includes("does not belong to this organization")) {
      return NextResponse.json(
        { error: message },
        { status: 400, headers: API_CORS_HEADERS }
      );
    }
    return NextResponse.json(
      { error: "Failed to create maintenance request" },
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
