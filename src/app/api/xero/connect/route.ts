import { NextRequest, NextResponse } from "next/server";

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

  // Generate a random state for CSRF protection
  const state = crypto.randomUUID();

  // Store state in a cookie for validation in callback
  const authUrl = new URL(XERO_AUTH_URL);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", SCOPES);
  authUrl.searchParams.set("state", state);

  // Create response with redirect
  const response = NextResponse.redirect(authUrl.toString());

  // Set state cookie for validation
  response.cookies.set("xero_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, // 10 minutes
    path: "/",
  });

  return response;
}
