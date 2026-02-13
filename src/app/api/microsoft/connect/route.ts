import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

// Microsoft OAuth2 authorization endpoint (multi-tenant)
const MS_AUTH_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize";

// Scopes needed for calendar read/write + user profile
const SCOPES = [
  "Calendars.ReadWrite",
  "offline_access",
  "User.Read",
].join(" ");

// Create a signed state parameter that can be verified without cookies
function createSignedState(userId: string | null): string {
  const secret = process.env.MICROSOFT_CLIENT_SECRET;
  if (!secret) {
    throw new Error("MICROSOFT_CLIENT_SECRET environment variable is not configured");
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
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const redirectUri = process.env.MICROSOFT_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.redirect(
      new URL(
        `/settings/integrations/calendar?error=${encodeURIComponent("Outlook Calendar integration is not yet configured. Please ask your administrator to set up OAuth credentials.")}`,
        request.url
      )
    );
  }

  // Get user ID from query param
  const userId = request.nextUrl.searchParams.get("userId");

  try {
    // Generate a signed state for CSRF protection (no cookies needed)
    const state = createSignedState(userId);

    // Build Microsoft auth URL
    const authUrl = new URL(MS_AUTH_URL);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("scope", SCOPES);
    authUrl.searchParams.set("state", state);

    // Redirect to Microsoft
    return NextResponse.redirect(authUrl.toString());
  } catch (err) {
    console.error("Microsoft connect error:", err);
    return NextResponse.redirect(
      new URL(
        `/settings/integrations/calendar?error=${encodeURIComponent("Outlook Calendar integration is not fully configured. Please ask your administrator to set up OAuth credentials.")}`,
        request.url
      )
    );
  }
}
