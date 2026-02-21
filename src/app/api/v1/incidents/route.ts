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
 * REST API - Incidents Endpoint
 *
 * GET  /api/v1/incidents - List incidents (requires read:incidents)
 * POST /api/v1/incidents - Create an incident (requires write:incidents)
 *
 * Security posture:
 * - Authentication: Bearer API key (msd_live_*) validated via Convex
 * - Rate limiting: NOT NEEDED - API key auth + Convex rate limits provide protection
 * - CSRF/Origin: EXEMPT - API key authentication replaces Origin checks;
 *   API keys are not browser-accessible credentials
 * - Input validation: YES - required fields, enum validation, date format, boolean type checks, max lengths
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
 * GET /api/v1/incidents
 *
 * Query parameters:
 * - status: Filter by status (reported, under_investigation, resolved, closed)
 * - severity: Filter by severity (minor, moderate, major, critical)
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

  if (!hasPermission(auth, "read:incidents")) {
    return NextResponse.json(
      { error: "Insufficient permissions. Required: read:incidents" },
      { status: 403, headers: API_CORS_HEADERS }
    );
  }

  try {
    const convex = getConvex();
    const { searchParams } = new URL(request.url);

    const status = searchParams.get("status") || undefined;
    const severity = searchParams.get("severity") || undefined;
    const search = searchParams.get("search") || undefined;
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 100, 1), 100) : undefined;

    const incidents = await convex.query(api.apiQueries.listIncidents, {
      organizationId: auth.organizationId as Id<"organizations">,
      status,
      severity,
      search,
      limit,
    });

    return NextResponse.json(
      {
        data: incidents,
        meta: {
          count: incidents.length,
          timestamp: new Date().toISOString(),
        },
      },
      { status: 200, headers: API_CORS_HEADERS }
    );
  } catch (err) {
    console.error("[REST API] GET /api/v1/incidents error:", err);
    return NextResponse.json(
      { error: "Failed to fetch incidents" },
      { status: 500, headers: API_CORS_HEADERS }
    );
  }
}

/**
 * POST /api/v1/incidents
 *
 * Request body (JSON):
 * - propertyId: string (required - Convex property ID)
 * - incidentType: string (required)
 * - severity: string (required - minor, moderate, major, critical)
 * - title: string (required)
 * - description: string (required)
 * - incidentDate: string (required - YYYY-MM-DD)
 * - followUpRequired: boolean (required)
 * - reportedBy: string (required - Convex user ID)
 * - dwellingId?: string (Convex dwelling ID)
 * - participantId?: string (Convex participant ID)
 * - incidentTime?: string (HH:MM)
 * - location?: string
 * - witnessNames?: string
 * - immediateActionTaken?: string
 * - followUpNotes?: string
 */
export async function POST(request: NextRequest) {
  const auth = await authenticateApiRequest(request);
  if ("error" in auth) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.status, headers: API_CORS_HEADERS }
    );
  }

  if (!hasPermission(auth, "write:incidents")) {
    return NextResponse.json(
      { error: "Insufficient permissions. Required: write:incidents" },
      { status: 403, headers: API_CORS_HEADERS }
    );
  }

  try {
    const body = await request.json();

    // Validate required fields
    if (
      !body.propertyId ||
      !body.incidentType ||
      !body.severity ||
      !body.title ||
      !body.description ||
      !body.incidentDate ||
      body.followUpRequired === undefined ||
      !body.reportedBy
    ) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: propertyId, incidentType, severity, title, description, incidentDate, followUpRequired, reportedBy",
        },
        { status: 400, headers: API_CORS_HEADERS }
      );
    }

    // Validate incident type
    const validIncidentTypes = [
      "injury",
      "near_miss",
      "property_damage",
      "behavioral",
      "medication",
      "abuse_neglect",
      "complaint",
      "death",
      "serious_injury",
      "unauthorized_restrictive_practice",
      "sexual_assault",
      "sexual_misconduct",
      "staff_assault",
      "unlawful_conduct",
      "unexplained_injury",
      "missing_participant",
      "other",
    ];
    if (!validIncidentTypes.includes(body.incidentType)) {
      return NextResponse.json(
        {
          error: `Invalid incidentType. Must be one of: ${validIncidentTypes.join(", ")}`,
        },
        { status: 400, headers: API_CORS_HEADERS }
      );
    }

    // Validate severity
    const validSeverities = ["minor", "moderate", "major", "critical"];
    if (!validSeverities.includes(body.severity)) {
      return NextResponse.json(
        {
          error: `Invalid severity. Must be one of: ${validSeverities.join(", ")}`,
        },
        { status: 400, headers: API_CORS_HEADERS }
      );
    }

    // Validate incidentDate format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(body.incidentDate)) {
      return NextResponse.json(
        { error: "Invalid incidentDate format. Expected: YYYY-MM-DD" },
        { status: 400, headers: API_CORS_HEADERS }
      );
    }

    // Validate followUpRequired is boolean
    if (typeof body.followUpRequired !== "boolean") {
      return NextResponse.json(
        { error: "followUpRequired must be a boolean" },
        { status: 400, headers: API_CORS_HEADERS }
      );
    }

    const convex = getConvex();
    const result = await convex.mutation(api.apiQueries.createIncident, {
      organizationId: auth.organizationId as Id<"organizations">,
      propertyId: body.propertyId as Id<"properties">,
      dwellingId: body.dwellingId
        ? (body.dwellingId as Id<"dwellings">)
        : undefined,
      participantId: body.participantId
        ? (body.participantId as Id<"participants">)
        : undefined,
      incidentType: body.incidentType as
        | "injury"
        | "near_miss"
        | "property_damage"
        | "behavioral"
        | "medication"
        | "abuse_neglect"
        | "complaint"
        | "death"
        | "serious_injury"
        | "unauthorized_restrictive_practice"
        | "sexual_assault"
        | "sexual_misconduct"
        | "staff_assault"
        | "unlawful_conduct"
        | "unexplained_injury"
        | "missing_participant"
        | "other",
      severity: body.severity as "minor" | "moderate" | "major" | "critical",
      title: String(body.title).substring(0, 500),
      description: String(body.description).substring(0, 5000),
      incidentDate: body.incidentDate,
      incidentTime: body.incidentTime || undefined,
      location: body.location
        ? String(body.location).substring(0, 500)
        : undefined,
      witnessNames: body.witnessNames
        ? String(body.witnessNames).substring(0, 1000)
        : undefined,
      immediateActionTaken: body.immediateActionTaken
        ? String(body.immediateActionTaken).substring(0, 2000)
        : undefined,
      followUpRequired: body.followUpRequired,
      followUpNotes: body.followUpNotes
        ? String(body.followUpNotes).substring(0, 2000)
        : undefined,
      reportedBy: body.reportedBy as Id<"users">,
    });

    return NextResponse.json(
      {
        data: result,
        meta: { timestamp: new Date().toISOString() },
      },
      { status: 201, headers: API_CORS_HEADERS }
    );
  } catch (err) {
    console.error("[REST API] POST /api/v1/incidents error:", err);
    const message =
      err instanceof Error ? err.message : "Failed to create incident";
    if (message.includes("does not belong to this organization")) {
      return NextResponse.json(
        { error: message },
        { status: 400, headers: API_CORS_HEADERS }
      );
    }
    return NextResponse.json(
      { error: "Failed to create incident" },
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
