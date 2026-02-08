import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

const ALLOWED_ORIGINS = [
  "https://betterlivingsolutions.com.au",
  "https://www.betterlivingsolutions.com.au",
  "http://localhost:3000",
];

function getCorsHeaders(origin: string | null) {
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

const VALID_COMPLAINANT_TYPES = [
  "participant", "family_carer", "support_coordinator",
  "sil_provider", "staff", "anonymous", "other",
] as const;

const VALID_CATEGORIES = [
  "service_delivery", "staff_conduct", "property_condition",
  "communication", "billing", "privacy", "safety", "other",
] as const;

const VALID_SEVERITIES = ["low", "medium", "high", "critical"] as const;
const VALID_CONTACT_METHODS = ["email", "phone", "letter", "sms"] as const;

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    const body = await request.json();

    // Validate required fields
    if (!body.complainantType || !body.description || !body.category) {
      return NextResponse.json(
        { error: "Missing required fields: complainantType, description, category" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate enums
    if (!VALID_COMPLAINANT_TYPES.includes(body.complainantType)) {
      return NextResponse.json(
        { error: `Invalid complainantType. Must be one of: ${VALID_COMPLAINANT_TYPES.join(", ")}` },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!VALID_CATEGORIES.includes(body.category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(", ")}` },
        { status: 400, headers: corsHeaders }
      );
    }

    if (body.severity && !VALID_SEVERITIES.includes(body.severity)) {
      return NextResponse.json(
        { error: `Invalid severity. Must be one of: ${VALID_SEVERITIES.join(", ")}` },
        { status: 400, headers: corsHeaders }
      );
    }

    if (body.preferredContactMethod && !VALID_CONTACT_METHODS.includes(body.preferredContactMethod)) {
      return NextResponse.json(
        { error: `Invalid preferredContactMethod. Must be one of: ${VALID_CONTACT_METHODS.join(", ")}` },
        { status: 400, headers: corsHeaders }
      );
    }

    // Sanitize description length
    const description = String(body.description).substring(0, 5000);

    // Call Convex mutation
    const result = await convex.mutation(api.complaints.submitFromWebsite, {
      complainantType: body.complainantType,
      complainantName: body.complainantName ? String(body.complainantName).substring(0, 200) : undefined,
      complainantContact: body.complainantContact ? String(body.complainantContact).substring(0, 200) : undefined,
      preferredContactMethod: body.preferredContactMethod || undefined,
      description,
      category: body.category,
      severity: body.severity || undefined,
      participantName: body.participantName ? String(body.participantName).substring(0, 200) : undefined,
      propertyAddress: body.propertyAddress ? String(body.propertyAddress).substring(0, 500) : undefined,
    });

    return NextResponse.json(
      {
        success: true,
        referenceNumber: result.referenceNumber,
        message: `Your complaint has been received. Reference number: ${result.referenceNumber}. We will acknowledge your complaint within 24 hours.`,
      },
      { status: 201, headers: corsHeaders }
    );
  } catch (error) {
    console.error("Complaint submission error:", error);
    return NextResponse.json(
      { error: "Failed to submit complaint. Please try again or contact us directly." },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}
