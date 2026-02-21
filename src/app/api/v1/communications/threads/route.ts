import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";
import {
  authenticateApiRequest,
  hasPermission,
  API_CORS_HEADERS,
} from "../../_lib/auth";

/**
 * REST API - Communication Threads Endpoint
 *
 * GET /api/v1/communications/threads - List communication threads (requires read:communications)
 *
 * Security posture:
 * - Authentication: Bearer API key (msd_live_*) validated via Convex
 * - Rate limiting: NOT NEEDED - API key auth + Convex rate limits provide protection
 * - CSRF/Origin: EXEMPT - API key authentication replaces Origin checks
 * - Input validation: YES - search, limit parameters validated
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
 * GET /api/v1/communications/threads
 *
 * Query parameters:
 * - contactName: Filter threads by contact name
 * - search: Search in contact names and subjects
 * - limit: Maximum results (1-50, default 20)
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

    const contactName = searchParams.get("contactName") || undefined;
    const search = searchParams.get("search") || undefined;
    const limitParam = searchParams.get("limit");
    const limit = limitParam
      ? Math.min(Math.max(parseInt(limitParam, 10) || 20, 1), 50)
      : undefined;

    const threads = await convex.query(api.apiQueries.findThreads, {
      organizationId: auth.organizationId as Id<"organizations">,
      contactName,
      search,
      limit,
    });

    return NextResponse.json(
      {
        data: threads,
        meta: {
          count: threads.length,
          timestamp: new Date().toISOString(),
        },
      },
      { status: 200, headers: API_CORS_HEADERS }
    );
  } catch (err) {
    console.error("[REST API] GET /api/v1/communications/threads error:", err);
    return NextResponse.json(
      { error: "Failed to fetch threads" },
      { status: 500, headers: API_CORS_HEADERS }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: API_CORS_HEADERS });
}
