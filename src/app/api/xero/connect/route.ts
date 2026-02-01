import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

// Xero OAuth2 authorization endpoint
const XERO_AUTH_URL = "https://login.xero.com/identity/connect/authorize";

// Scopes needed for bank feed access
const SCOPES = [
  "openid",
  "profile",
  "email",
  "accounting.transactions.read",
  "accounting.settings.read",
  "accounting.contacts.read",
  "offline_access", // Required for refresh tokens
].join(" ");

// Create a signed state parameter that can be verified without cookies
function createSignedState(userId: string | null): string {
  const secret = process.env.XERO_CLIENT_SECRET || "fallback-secret";
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
  const clientId = process.env.XERO_CLIENT_ID;
  const redirectUri = process.env.XERO_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      {
        error: "Xero credentials not configured",
        details:
          "Please set XERO_CLIENT_ID and XERO_REDIRECT_URI environment variables",
      },
      { status: 500 }
    );
  }

  // Get user ID from query param
  const userId = request.nextUrl.searchParams.get("userId");

  // Generate a signed state for CSRF protection (no cookies needed)
  const state = createSignedState(userId);

  // Build Xero auth URL
  const authUrl = new URL(XERO_AUTH_URL);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", SCOPES);
  authUrl.searchParams.set("state", state);

  // Redirect to Xero
  return NextResponse.redirect(authUrl.toString());
}
