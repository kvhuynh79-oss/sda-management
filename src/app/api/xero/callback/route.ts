/**
 * GET /api/xero/callback
 *
 * Xero OAuth2 callback handler. Receives authorization code, exchanges for tokens,
 * and saves Xero connection to Convex.
 *
 * Security posture:
 * - Authentication: HMAC-signed state parameter verification (prevents CSRF)
 * - Rate limiting: NOT NEEDED - OAuth callback, not a data endpoint
 * - CSRF/Origin: Protected via signed state parameter (HMAC-SHA256 with XERO_CLIENT_SECRET)
 * - Env validation: Checks XERO_CLIENT_ID, XERO_CLIENT_SECRET, XERO_REDIRECT_URI
 * - State expiry: 10-minute window prevents replay attacks
 */

import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import crypto from "crypto";

// Xero OAuth2 token endpoint
const XERO_TOKEN_URL = "https://identity.xero.com/connect/token";
const XERO_CONNECTIONS_URL = "https://api.xero.com/connections";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// Verify the signed state parameter
function verifySignedState(state: string): { valid: boolean; userId: string | null; error?: string } {
  try {
    const secret = process.env.XERO_CLIENT_SECRET;
    if (!secret) {
      return { valid: false, userId: null, error: "XERO_CLIENT_SECRET not configured" };
    }

    // Decode from base64url
    const decoded = Buffer.from(state, "base64url").toString("utf-8");
    const parts = decoded.split(":");

    if (parts.length !== 4) {
      return { valid: false, userId: null, error: "Invalid state format" };
    }

    const [timestamp, nonce, userId, signature] = parts;

    // Check if state is expired (10 minutes)
    const stateAge = Date.now() - parseInt(timestamp, 10);
    if (stateAge > 10 * 60 * 1000) {
      return { valid: false, userId: null, error: "State expired - please try again" };
    }

    // Verify signature
    const data = `${timestamp}:${nonce}:${userId}`;
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(data)
      .digest("hex")
      .substring(0, 16);

    if (signature !== expectedSignature) {
      return { valid: false, userId: null, error: "Invalid state signature" };
    }

    return { valid: true, userId: userId || null };
  } catch {
    return { valid: false, userId: null, error: "Failed to verify state" };
  }
}

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

  // Validate signed state (no cookies needed)
  if (!state) {
    return NextResponse.redirect(
      new URL(
        `/settings/integrations/xero?error=${encodeURIComponent("No state parameter received")}`,
        request.url
      )
    );
  }

  const stateResult = verifySignedState(state);
  if (!stateResult.valid) {
    console.error("State verification failed:", stateResult.error);
    return NextResponse.redirect(
      new URL(
        `/settings/integrations/xero?error=${encodeURIComponent(stateResult.error || "Invalid state parameter")}`,
        request.url
      )
    );
  }

  // Get user ID from verified state
  const userId = stateResult.userId;

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

    // If no user ID from state, redirect with error
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

    // Redirect to success
    return NextResponse.redirect(
      new URL("/settings/integrations/xero?success=true", request.url)
    );
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
