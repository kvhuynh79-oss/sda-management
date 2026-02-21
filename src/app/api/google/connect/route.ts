/**
 * GET /api/google/connect
 *
 * Initiates Google Calendar OAuth2 authorization flow. Redirects user to Google login.
 *
 * Security posture:
 * - Authentication: Implicit (user must be logged in; userId passed as query param)
 * - Rate limiting: NOT NEEDED - OAuth redirect, not a data endpoint
 * - CSRF/Origin: EXEMPT - uses HMAC-signed state parameter for CSRF protection
 *   (state is verified in the callback route)
 * - Env validation: Checks GOOGLE_CLIENT_ID, GOOGLE_REDIRECT_URI, GOOGLE_CLIENT_SECRET at runtime
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

// Google OAuth2 authorization endpoint
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";

// Scopes needed for calendar read/write
const SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");

// Create a signed state parameter that can be verified without cookies
function createSignedState(userId: string | null): string {
  const secret = process.env.GOOGLE_CLIENT_SECRET;
  if (!secret) {
    throw new Error("GOOGLE_CLIENT_SECRET environment variable is not configured");
  }
  const timestamp = Date.now();
  const nonce = crypto.randomUUID();
  const data = `${timestamp}:${nonce}:${userId || ""}`;

  // Create HMAC signature
  const signature = crypto
    .createHmac("sha256", secret)
    .update(data)
    .digest("hex")
    .substring(0, 16); // Truncate for shorter URL

  // Encode as base64 URL-safe string
  const state = Buffer.from(`${data}:${signature}`).toString("base64url");
  return state;
}

export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.redirect(
      new URL(
        `/settings/integrations/calendar?error=${encodeURIComponent("Google Calendar integration is not yet configured. Please ask your administrator to set up OAuth credentials.")}`,
        request.url
      )
    );
  }

  // Get user ID from query param
  const userId = request.nextUrl.searchParams.get("userId");

  try {
    // Generate a signed state for CSRF protection (no cookies needed)
    const state = createSignedState(userId);

    // Build Google auth URL
    const authUrl = new URL(GOOGLE_AUTH_URL);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("scope", SCOPES);
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("access_type", "offline"); // Required for refresh tokens
    authUrl.searchParams.set("prompt", "consent"); // Force consent to always get refresh_token

    // Redirect to Google
    return NextResponse.redirect(authUrl.toString());
  } catch (err) {
    console.error("Google connect error:", err);
    return NextResponse.redirect(
      new URL(
        `/settings/integrations/calendar?error=${encodeURIComponent("Google Calendar integration is not fully configured. Please ask your administrator to set up OAuth credentials.")}`,
        request.url
      )
    );
  }
}
