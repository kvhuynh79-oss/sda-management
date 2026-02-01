import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";

// Xero OAuth2 token endpoint
const XERO_TOKEN_URL = "https://identity.xero.com/connect/token";
const XERO_CONNECTIONS_URL = "https://api.xero.com/connections";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // Check for errors from Xero
  if (error) {
    console.error("Xero OAuth error:", error, errorDescription);
    return NextResponse.redirect(
      new URL(
        `/settings/integrations/xero?error=${encodeURIComponent(errorDescription || error)}`,
        request.url
      )
    );
  }

  // Validate state from cookie
  const storedState = request.cookies.get("xero_oauth_state")?.value;
  if (!state || state !== storedState) {
    console.error("State mismatch:", { received: state, stored: storedState });
    return NextResponse.redirect(
      new URL(
        `/settings/integrations/xero?error=${encodeURIComponent("Invalid state parameter")}`,
        request.url
      )
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL(
        `/settings/integrations/xero?error=${encodeURIComponent("No authorization code received")}`,
        request.url
      )
    );
  }

  const clientId = process.env.XERO_CLIENT_ID;
  const clientSecret = process.env.XERO_CLIENT_SECRET;
  const redirectUri = process.env.XERO_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.redirect(
      new URL(
        `/settings/integrations/xero?error=${encodeURIComponent("Xero credentials not configured")}`,
        request.url
      )
    );
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch(XERO_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Token exchange failed:", tokenResponse.status, errorText);
      return NextResponse.redirect(
        new URL(
          `/settings/integrations/xero?error=${encodeURIComponent("Failed to exchange authorization code")}`,
          request.url
        )
      );
    }

    const tokenData = await tokenResponse.json();
    const { access_token, refresh_token, expires_in, scope } = tokenData;

    // Get Xero tenant (organization) info
    const connectionsResponse = await fetch(XERO_CONNECTIONS_URL, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json",
      },
    });

    if (!connectionsResponse.ok) {
      console.error("Failed to get Xero connections:", connectionsResponse.status);
      return NextResponse.redirect(
        new URL(
          `/settings/integrations/xero?error=${encodeURIComponent("Failed to get Xero organization info")}`,
          request.url
        )
      );
    }

    const connections = await connectionsResponse.json();
    if (!connections || connections.length === 0) {
      return NextResponse.redirect(
        new URL(
          `/settings/integrations/xero?error=${encodeURIComponent("No Xero organizations found")}`,
          request.url
        )
      );
    }

    // Use the first connected organization
    const tenant = connections[0];

    // Get user ID from cookie/session (simplified - in production use proper auth)
    const userIdCookie = request.cookies.get("sda_user_id")?.value;
    const userId = userIdCookie || null;

    // If no user ID, redirect with error
    if (!userId) {
      return NextResponse.redirect(
        new URL(
          `/settings/integrations/xero?error=${encodeURIComponent("Please log in to connect Xero")}`,
          request.url
        )
      );
    }

    // Save connection to Convex
    await convex.mutation(api.xero.saveConnection, {
      tenantId: tenant.tenantId,
      tenantName: tenant.tenantName,
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresIn: expires_in,
      scope,
      userId: userId as Id<"users">,
    });

    // Clear state cookie and redirect to success
    const response = NextResponse.redirect(
      new URL("/settings/integrations/xero?success=true", request.url)
    );
    response.cookies.delete("xero_oauth_state");

    return response;
  } catch (error) {
    console.error("Xero OAuth callback error:", error);
    return NextResponse.redirect(
      new URL(
        `/settings/integrations/xero?error=${encodeURIComponent("An unexpected error occurred")}`,
        request.url
      )
    );
  }
}
