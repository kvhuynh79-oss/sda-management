/**
 * GET /api/google/callback
 *
 * Google Calendar OAuth2 callback handler. Receives authorization code, exchanges for tokens,
 * and saves Google Calendar connection to Convex.
 *
 * Security posture:
 * - Authentication: HMAC-signed state parameter verification (prevents CSRF)
 * - Rate limiting: NOT NEEDED - OAuth callback, not a data endpoint
 * - CSRF/Origin: Protected via signed state parameter (HMAC-SHA256 with GOOGLE_CLIENT_SECRET)
 * - Env validation: Checks GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI
 * - State expiry: 10-minute window prevents replay attacks
 */

import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import crypto from "crypto";

// Google OAuth2 token endpoint
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// Verify the signed state parameter
function verifySignedState(state: string): { valid: boolean; userId: string | null; error?: string } {
  try {
    const secret = process.env.GOOGLE_CLIENT_SECRET;
    if (!secret) {
      return { valid: false, userId: null, error: "GOOGLE_CLIENT_SECRET not configured" };
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

  const redirectBase = "/settings/integrations/calendar";

  // Check for errors from Google
  if (error) {
    console.error("Google OAuth error:", error, errorDescription);
    return NextResponse.redirect(
      new URL(
        `${redirectBase}?error=${encodeURIComponent(errorDescription || error)}`,
        request.url
      )
    );
  }

  // Validate signed state (no cookies needed)
  if (!state) {
    return NextResponse.redirect(
      new URL(
        `${redirectBase}?error=${encodeURIComponent("No state parameter received")}`,
        request.url
      )
    );
  }

  const stateResult = verifySignedState(state);
  if (!stateResult.valid) {
    console.error("State verification failed:", stateResult.error);
    return NextResponse.redirect(
      new URL(
        `${redirectBase}?error=${encodeURIComponent(stateResult.error || "Invalid state parameter")}`,
        request.url
      )
    );
  }

  // Get user ID from verified state
  const userId = stateResult.userId;

  if (!code) {
    return NextResponse.redirect(
      new URL(
        `${redirectBase}?error=${encodeURIComponent("No authorization code received")}`,
        request.url
      )
    );
  }

  if (!userId) {
    return NextResponse.redirect(
      new URL(
        `${redirectBase}?error=${encodeURIComponent("Please log in to connect Google Calendar")}`,
        request.url
      )
    );
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.redirect(
      new URL(
        `${redirectBase}?error=${encodeURIComponent("Google credentials not configured")}`,
        request.url
      )
    );
  }

  try {
    // Exchange code for tokens (Google requires application/x-www-form-urlencoded)
    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Google token exchange failed:", tokenResponse.status, errorText);
      return NextResponse.redirect(
        new URL(
          `${redirectBase}?error=${encodeURIComponent("Failed to exchange authorization code")}`,
          request.url
        )
      );
    }

    const tokenData = await tokenResponse.json();
    const { access_token, refresh_token, expires_in } = tokenData;

    if (!access_token) {
      console.error("Google token response missing access_token:", tokenData);
      return NextResponse.redirect(
        new URL(
          `${redirectBase}?error=${encodeURIComponent("No access token received from Google")}`,
          request.url
        )
      );
    }

    if (!refresh_token) {
      console.error("Google token response missing refresh_token - user may have previously authorized");
      // This can happen if the user has previously authorized and Google
      // does not return a new refresh_token. The prompt=consent param
      // should prevent this, but log it for debugging.
    }

    // Get the user's email address from Google
    let userEmail: string | undefined;
    try {
      const userInfoResponse = await fetch(GOOGLE_USERINFO_URL, {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      });

      if (userInfoResponse.ok) {
        const userInfo = await userInfoResponse.json();
        userEmail = userInfo.email;
      } else {
        console.warn("Failed to get Google user info:", userInfoResponse.status);
      }
    } catch (userInfoError) {
      console.warn("Error fetching Google user info:", userInfoError);
      // Non-fatal: continue without email
    }

    // Save connection to Convex
    await convex.mutation(api.calendar.saveGoogleConnection, {
      userId: userId as Id<"users">,
      accessToken: access_token,
      refreshToken: refresh_token || "",
      expiresIn: expires_in || 3600,
      userEmail,
    });

    // Redirect to success
    return NextResponse.redirect(
      new URL(`${redirectBase}?success=google`, request.url)
    );
  } catch (err) {
    console.error("Google OAuth callback error:", err);
    return NextResponse.redirect(
      new URL(
        `${redirectBase}?error=${encodeURIComponent("An unexpected error occurred")}`,
        request.url
      )
    );
  }
}
