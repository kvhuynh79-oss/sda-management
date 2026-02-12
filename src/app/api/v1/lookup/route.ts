import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import {
  authenticateApiRequest,
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
 * GET /api/v1/lookup
 *
 * Lightweight lookup endpoint for Outlook add-in dropdowns.
 *
 * Query parameters:
 * - type: "participants" | "properties" (required)
 * - search: Search filter (optional)
 * - limit: Maximum results (1-100, default 50)
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateApiRequest(request);
  if ("error" in auth) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.status, headers: API_CORS_HEADERS }
    );
  }

  // Accept any read permission for lookup
  const hasAnyRead = auth.permissions.some((p) => p.startsWith("read:"));
  if (!hasAnyRead) {
    return NextResponse.json(
      { error: "Insufficient permissions. Required: any read:* permission" },
      { status: 403, headers: API_CORS_HEADERS }
    );
  }

  try {
    const convex = getConvex();
    const { searchParams } = new URL(request.url);

    const type = searchParams.get("type");
    const search = searchParams.get("search") || undefined;
    const limitParam = searchParams.get("limit");
    const limit = limitParam
      ? Math.min(Math.max(parseInt(limitParam, 10) || 50, 1), 100)
      : undefined;

    if (!type || !["participants", "properties"].includes(type)) {
      return NextResponse.json(
        { error: "Missing or invalid 'type' parameter. Must be 'participants' or 'properties'" },
        { status: 400, headers: API_CORS_HEADERS }
      );
    }

    if (type === "participants") {
      const data = await convex.query(api.apiQueries.listParticipantsSimple, {
        organizationId: auth.organizationId as Id<"organizations">,
        search,
        limit,
      });

      return NextResponse.json(
        {
          data,
          meta: { count: data.length, timestamp: new Date().toISOString() },
        },
        { status: 200, headers: API_CORS_HEADERS }
      );
    }

    // type === "properties"
    const data = await convex.query(api.apiQueries.listPropertiesSimple, {
      organizationId: auth.organizationId as Id<"organizations">,
      search,
      limit,
    });

    return NextResponse.json(
      {
        data,
        meta: { count: data.length, timestamp: new Date().toISOString() },
      },
      { status: 200, headers: API_CORS_HEADERS }
    );
  } catch (err) {
    console.error("[REST API] GET /api/v1/lookup error:", err);
    return NextResponse.json(
      { error: "Failed to fetch lookup data" },
      { status: 500, headers: API_CORS_HEADERS }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: API_CORS_HEADERS });
}
