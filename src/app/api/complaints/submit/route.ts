/**
 * POST /api/complaints/submit
 *
 * PUBLIC endpoint for receiving complaints from the BLS website and
 * the MySDAManager complaint form.
 *
 * Security posture:
 * - Authentication: NONE (public endpoint for external complaint submission)
 * - Rate limiting: YES - 3 per IP per hour, 10 per IP per 24 hours
 * - CSRF/Origin: YES - validates Origin header against allowed domains
 * - Bot protection: YES - honeypot field + submission timing check
 * - Input validation: YES - required fields, enum validation, HTML stripping, max lengths
 * - CORS: YES - restricted to BLS website + MySDAManager domains
 *
 * EXEMPT from API key auth since complaints must be submittable by
 * anyone (NDIS participants, families, external parties).
 */

import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import { checkRateLimit, getClientIp } from "../../_lib/rateLimit";
import { validateOriginWithExtras } from "../../_lib/csrf";
import {
  sanitizeTextField,
  isValidEmail,
  isBlank,
  isHoneypotFilled,
  isSubmissionTooFast,
} from "../../_lib/sanitize";
import { validateRequiredEnvVars } from "../../_lib/envValidation";

// Lazy-initialize ConvexHttpClient to avoid build-time errors
let _convex: ConvexHttpClient | null = null;

function getConvex(): ConvexHttpClient {
  if (!_convex) {
    const url = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!url) throw new Error("NEXT_PUBLIC_CONVEX_URL is not configured");
    _convex = new ConvexHttpClient(url);
  }
  return _convex;
}

const ALLOWED_CORS_ORIGINS = [
  "https://betterlivingsolutions.com.au",
  "https://www.betterlivingsolutions.com.au",
  "https://mysdamanager.com",
  "https://www.mysdamanager.com",
];

function getCorsHeaders(origin: string | null) {
  // Include localhost in development
  const allOrigins =
    process.env.NODE_ENV === "development"
      ? [...ALLOWED_CORS_ORIGINS, "http://localhost:3000", "http://localhost:3001"]
      : ALLOWED_CORS_ORIGINS;

  const allowedOrigin =
    origin && allOrigins.includes(origin) ? origin : allOrigins[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

const VALID_COMPLAINANT_TYPES = [
  "participant",
  "family_carer",
  "support_coordinator",
  "sil_provider",
  "staff",
  "anonymous",
  "other",
] as const;

const VALID_CATEGORIES = [
  "service_delivery",
  "staff_conduct",
  "property_condition",
  "communication",
  "billing",
  "privacy",
  "safety",
  "other",
] as const;

const VALID_SEVERITIES = ["low", "medium", "high", "critical"] as const;
const VALID_CONTACT_METHODS = ["email", "phone", "letter", "sms"] as const;

// Field length limits
const MAX_NAME_LENGTH = 200;
const MAX_EMAIL_LENGTH = 254;
const MAX_DESCRIPTION_LENGTH = 5000;
const MAX_ADDRESS_LENGTH = 500;
const MAX_CONTACT_LENGTH = 200;

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  // ─── FAIL-FAST: Environment validation ─────────────────────────────
  const envCheck = validateRequiredEnvVars(["NEXT_PUBLIC_CONVEX_URL"]);
  if (!envCheck.valid) {
    console.error(`[CRITICAL] Complaints endpoint: ${envCheck.error}`);
    return NextResponse.json(
      { error: "Service temporarily unavailable" },
      { status: 500, headers: corsHeaders }
    );
  }

  // ─── CSRF: Origin validation ───────────────────────────────────────
  // The complaints form is submitted from the BLS website and MySDAManager.
  // We validate the Origin header to prevent cross-site forgery.
  const originCheck = validateOriginWithExtras(request, ALLOWED_CORS_ORIGINS);
  if (!originCheck.valid) {
    console.warn(
      `[Security] Complaints: Origin rejected - ${originCheck.origin || "missing"} from IP ${getClientIp(request)}`
    );
    return NextResponse.json(
      { error: "Forbidden: request origin not allowed" },
      { status: 403, headers: corsHeaders }
    );
  }

  // ─── RATE LIMITING: IP-based ───────────────────────────────────────
  // Hourly limit: 3 submissions per IP per hour
  const hourlyLimit = checkRateLimit(request, {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3,
    keyPrefix: "complaints_hourly",
  });
  if (!hourlyLimit.allowed) {
    console.warn(
      `[Security] Complaints: Hourly rate limit exceeded for IP ${getClientIp(request)}`
    );
    return NextResponse.json(
      { error: hourlyLimit.error },
      { status: 429, headers: { ...corsHeaders, ...hourlyLimit.headers } }
    );
  }

  // Daily limit: 10 submissions per IP per 24 hours
  const dailyLimit = checkRateLimit(request, {
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    maxRequests: 10,
    keyPrefix: "complaints_daily",
  });
  if (!dailyLimit.allowed) {
    console.warn(
      `[Security] Complaints: Daily rate limit exceeded for IP ${getClientIp(request)}`
    );
    return NextResponse.json(
      { error: dailyLimit.error },
      { status: 429, headers: { ...corsHeaders, ...dailyLimit.headers } }
    );
  }

  try {
    const body = await request.json();

    // ─── BOT PROTECTION: Honeypot field ──────────────────────────────
    // The form includes a hidden "company_url" field. Real users never see
    // or fill it. Bots typically fill all fields, triggering this check.
    if (isHoneypotFilled(body.company_url)) {
      console.warn(
        `[Security] Complaints: Honeypot triggered from IP ${getClientIp(request)}`
      );
      // Return a fake success to not tip off the bot
      return NextResponse.json(
        {
          success: true,
          referenceNumber: "CMP-RECEIVED",
          message: "Your complaint has been received.",
        },
        { status: 201, headers: corsHeaders }
      );
    }

    // ─── BOT PROTECTION: Submission timing ───────────────────────────
    // Reject submissions that happen less than 3 seconds after the form loaded.
    // The frontend should include a `_formLoadedAt` timestamp in the request body.
    if (isSubmissionTooFast(body._formLoadedAt, 3)) {
      console.warn(
        `[Security] Complaints: Suspiciously fast submission from IP ${getClientIp(request)} (loaded ${body._formLoadedAt})`
      );
      // Return a fake success to not tip off the bot
      return NextResponse.json(
        {
          success: true,
          referenceNumber: "CMP-RECEIVED",
          message: "Your complaint has been received.",
        },
        { status: 201, headers: corsHeaders }
      );
    }

    // ─── INPUT VALIDATION: Required fields ───────────────────────────
    if (isBlank(body.complainantType) || isBlank(body.description) || isBlank(body.category)) {
      return NextResponse.json(
        { error: "Missing required fields: complainantType, description, category" },
        { status: 400, headers: corsHeaders }
      );
    }

    // ─── INPUT VALIDATION: Enum values ───────────────────────────────
    if (!VALID_COMPLAINANT_TYPES.includes(body.complainantType)) {
      return NextResponse.json(
        {
          error: `Invalid complainantType. Must be one of: ${VALID_COMPLAINANT_TYPES.join(", ")}`,
        },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!VALID_CATEGORIES.includes(body.category)) {
      return NextResponse.json(
        {
          error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(", ")}`,
        },
        { status: 400, headers: corsHeaders }
      );
    }

    if (body.severity && !VALID_SEVERITIES.includes(body.severity)) {
      return NextResponse.json(
        {
          error: `Invalid severity. Must be one of: ${VALID_SEVERITIES.join(", ")}`,
        },
        { status: 400, headers: corsHeaders }
      );
    }

    if (
      body.preferredContactMethod &&
      !VALID_CONTACT_METHODS.includes(body.preferredContactMethod)
    ) {
      return NextResponse.json(
        {
          error: `Invalid preferredContactMethod. Must be one of: ${VALID_CONTACT_METHODS.join(", ")}`,
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // ─── INPUT VALIDATION: Email format ──────────────────────────────
    if (body.complainantContact && body.preferredContactMethod === "email") {
      const contactStr = String(body.complainantContact).trim();
      if (contactStr.includes("@") && !isValidEmail(contactStr)) {
        return NextResponse.json(
          { error: "Invalid email address format" },
          { status: 400, headers: corsHeaders }
        );
      }
    }

    // ─── INPUT SANITIZATION: Strip HTML, enforce max lengths ─────────
    const description = sanitizeTextField(body.description, MAX_DESCRIPTION_LENGTH);
    const complainantName = body.complainantName
      ? sanitizeTextField(body.complainantName, MAX_NAME_LENGTH)
      : undefined;
    const complainantContact = body.complainantContact
      ? sanitizeTextField(body.complainantContact, MAX_CONTACT_LENGTH)
      : undefined;
    const participantName = body.participantName
      ? sanitizeTextField(body.participantName, MAX_NAME_LENGTH)
      : undefined;
    const propertyAddress = body.propertyAddress
      ? sanitizeTextField(body.propertyAddress, MAX_ADDRESS_LENGTH)
      : undefined;

    // ─── SUBMIT TO CONVEX ────────────────────────────────────────────
    const result = await getConvex().mutation(api.complaints.submitFromWebsite, {
      complainantType: body.complainantType,
      complainantName: complainantName || undefined,
      complainantContact: complainantContact || undefined,
      preferredContactMethod: body.preferredContactMethod || undefined,
      description,
      category: body.category,
      severity: body.severity || undefined,
      participantName: participantName || undefined,
      propertyAddress: propertyAddress || undefined,
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
      {
        error:
          "Failed to submit complaint. Please try again or contact us directly.",
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}
