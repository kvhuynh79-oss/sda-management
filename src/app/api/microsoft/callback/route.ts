/**
 * GET /api/microsoft/callback
 *
 * Microsoft/Outlook Calendar OAuth2 callback handler. Receives authorization code,
 * exchanges for tokens, and saves Outlook Calendar connection to Convex.
 *
 * Security posture:
 * - Authentication: HMAC-signed state parameter verification (prevents CSRF)
 * - Rate limiting: NOT NEEDED - OAuth callback, not a data endpoint
 * - CSRF/Origin: Protected via signed state parameter (HMAC-SHA256 with MICROSOFT_CLIENT_SECRET)
 * - Env validation: Checks MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, MICROSOFT_REDIRECT_URI
 * - State expiry: 10-minute window prevents replay attacks
 */

import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import crypto from "crypto";

// Microsoft OAuth2 token endpoint (multi-tenant)
const MS_TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token";
const MS_GRAPH_ME_URL = "https://graph.microsoft.com/v1.0/me";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// Scopes must match the connect route exactly
const SCOPES = [
  "Calendars.ReadWrite",
  "offline_access",
  "User.Read",
].join(" ");

// Verify the signed state parameter
function verifySignedState(state: string): { valid: boolean; userId: string | null; error?: string } {
  try {
    const secret = process.env.MICROSOFT_CLIENT_SECRET;
    if (!secret) {
      return { valid: false, userId: null, error: "MICROSOFT_CLIENT_SECRET not configured" };
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

  // Check for errors from Microsoft
  if (error) {
    console.error("Microsoft OAuth error:", error, errorDescription);
    return NextResponse.redirect(
      new URL(
        `/settings/integrations/calendar?error=${encodeURIComponent(errorDescription || error)}`,
        request.url
      )
    );
  }

  // Validate signed state (no cookies needed)
  if (!state) {
    return NextResponse.redirect(
      new URL(
        `/settings/integrations/calendar?error=${encodeURIComponent("No state parameter received")}`,
        request.url
      )
    );
  }

  const stateResult = verifySignedState(state);
  if (!stateResult.valid) {
    console.error("State verification failed:", stateResult.error);
    return NextResponse.redirect(
      new URL(
        `/settings/integrations/calendar?error=${encodeURIComponent(stateResult.error || "Invalid state parameter")}`,
        request.url
      )
    );
  }

  // Get user ID from verified state
  const userId = stateResult.userId;

  if (!code) {
    return NextResponse.redirect(
      new URL(
        `/settings/integrations/calendar?error=${encodeURIComponent("No authorization code received")}`,
        request.url
      )
    );
  }

  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  const redirectUri = process.env.MICROSOFT_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.redirect(
      new URL(
        `/settings/integrations/calendar?error=${encodeURIComponent("Microsoft credentials not configured")}`,
        request.url
      )
    );
  }

  try {
    // Exchange code for tokens (Microsoft uses form-urlencoded, no Basic auth)
    const tokenResponse = await fetch(MS_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
        scope: SCOPES,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Token exchange failed:", tokenResponse.status, errorText);
      return NextResponse.redirect(
        new URL(
          `/settings/integrations/calendar?error=${encodeURIComponent("Failed to exchange authorization code")}`,
          request.url
        )
      );
    }

    const tokenData = await tokenResponse.json();
    const { access_token, refresh_token, expires_in } = tokenData;

    if (!access_token || !refresh_token) {
      console.error("Missing tokens in response:", Object.keys(tokenData));
      return NextResponse.redirect(
        new URL(
          `/settings/integrations/calendar?error=${encodeURIComponent("Incomplete token response from Microsoft")}`,
          request.url
        )
      );
    }

    // Get user email from Microsoft Graph
    let userEmail: string | undefined;
    try {
      const meResponse = await fetch(MS_GRAPH_ME_URL, {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      });

      if (meResponse.ok) {
        const meData = await meResponse.json();
        userEmail = meData.mail || meData.userPrincipalName;
      } else {
        console.warn("Failed to get Microsoft user profile:", meResponse.status);
      }
    } catch (meError) {
      console.warn("Error fetching Microsoft user profile:", meError);
    }

    // If no user ID from state, redirect with error
    if (!userId) {
      return NextResponse.redirect(
        new URL(
          `/settings/integrations/calendar?error=${encodeURIComponent("Please log in to connect Microsoft Calendar")}`,
          request.url
        )
      );
    }

    // Save connection to Convex
    await convex.mutation(api.calendar.saveOutlookConnection, {
      userId: userId as Id<"users">,
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresIn: expires_in,
      userEmail,
    });

    // Redirect to success
    return NextResponse.redirect(
      new URL("/settings/integrations/calendar?success=outlook", request.url)
    );
  } catch (err) {
    console.error("Microsoft OAuth callback error:", err);
    return NextResponse.redirect(
      new URL(
        `/settings/integrations/calendar?error=${encodeURIComponent("An unexpected error occurred")}`,
        request.url
      )
    );
  }
}
