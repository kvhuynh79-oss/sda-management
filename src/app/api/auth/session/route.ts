/**
 * HttpOnly Cookie Session Management API (S11)
 *
 * This endpoint manages session tokens as HttpOnly cookies, preventing
 * client-side JavaScript (and XSS attacks) from accessing session tokens.
 *
 * Endpoints:
 *   POST   /api/auth/session  — Set session token cookie after login
 *   DELETE /api/auth/session  — Clear session cookie on logout
 *   GET    /api/auth/session  — Check if session cookie exists (no token exposed)
 *
 * Cookie configuration:
 *   - HttpOnly: true (not accessible via document.cookie)
 *   - Secure: true in production (HTTPS only)
 *   - SameSite: lax (allows navigation but blocks cross-site POST)
 *   - Path: / (available on all routes)
 *   - MaxAge: 7 days (refresh token handles longer sessions)
 *
 * CSRF Protection:
 *   - Phase 2 already added Origin/Referer validation (csrf.ts)
 *   - SameSite=lax provides additional CSRF protection for POST requests
 *   - The login flow uses Convex actions (not cookies) for initial auth,
 *     so CSRF on login is not a concern
 *   - POST to this endpoint validates Origin header
 *
 * Migration Strategy (S11):
 *   During migration, both cookie-based and header-based auth are supported.
 *   The auth middleware (sessionAuth.ts, useSession.ts) will check:
 *   1. HttpOnly cookie first (new mechanism)
 *   2. Authorization header as fallback (legacy mechanism, with deprecation warning)
 *   Once all clients are updated, header-based auth can be removed.
 */

import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE_NAME = "sda_session";
const REFRESH_COOKIE_NAME = "sda_refresh";
const USER_DATA_COOKIE_NAME = "sda_user_meta";

const isProduction = process.env.NODE_ENV === "production";

/**
 * Cookie options for the session token (HttpOnly, not accessible via JS).
 */
function sessionCookieOptions(maxAge: number): string {
  const parts = [
    `${SESSION_COOKIE_NAME}`,
    `Path=/`,
    `HttpOnly`,
    `SameSite=Lax`,
    `Max-Age=${maxAge}`,
  ];
  if (isProduction) {
    parts.push("Secure");
  }
  return parts.join("; ");
}

/**
 * Cookie options for the refresh token (HttpOnly, longer lived).
 */
function refreshCookieOptions(maxAge: number): string {
  const parts = [
    `${REFRESH_COOKIE_NAME}`,
    `Path=/api/auth`,
    `HttpOnly`,
    `SameSite=Lax`,
    `Max-Age=${maxAge}`,
  ];
  if (isProduction) {
    parts.push("Secure");
  }
  return parts.join("; ");
}

/**
 * Cookie options for user metadata (NOT HttpOnly - accessible by JS for UI).
 * Contains non-sensitive data: name, role, email (no tokens).
 */
function userMetaCookieOptions(maxAge: number): string {
  const parts = [
    `${USER_DATA_COOKIE_NAME}`,
    `Path=/`,
    `SameSite=Lax`,
    `Max-Age=${maxAge}`,
  ];
  if (isProduction) {
    parts.push("Secure");
  }
  return parts.join("; ");
}

/**
 * Validate Origin header for CSRF protection on POST requests.
 */
function validatePostOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  const allowedOrigins = [
    "https://mysdamanager.com",
    "https://www.mysdamanager.com",
  ];

  if (!isProduction) {
    allowedOrigins.push("http://localhost:3000");
    allowedOrigins.push("http://localhost:3001");
    allowedOrigins.push("http://127.0.0.1:3000");
  }

  const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) {
    try {
      allowedOrigins.push(new URL(appUrl).origin);
    } catch {
      // Invalid URL, skip
    }
  }

  return allowedOrigins.includes(origin);
}

/**
 * POST /api/auth/session
 *
 * Called after successful Convex login to set HttpOnly cookies.
 * Body: { token: string, refreshToken: string, user?: { ... } }
 */
export async function POST(request: NextRequest) {
  // CSRF protection: validate origin
  if (!validatePostOrigin(request)) {
    return NextResponse.json(
      { error: "Forbidden: invalid origin" },
      { status: 403 }
    );
  }

  let body: {
    token?: string;
    refreshToken?: string;
    user?: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      role: string;
      isSuperAdmin?: boolean;
    };
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const { token, refreshToken, user } = body;

  if (!token) {
    return NextResponse.json(
      { error: "Missing session token" },
      { status: 400 }
    );
  }

  const response = NextResponse.json({ success: true });

  // Set session token cookie (24 hours, matches Convex session expiry)
  const sessionMaxAge = 24 * 60 * 60; // 24 hours in seconds
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: sessionMaxAge,
  });

  // Set refresh token cookie (30 days, restricted path)
  if (refreshToken) {
    const refreshMaxAge = 30 * 24 * 60 * 60; // 30 days in seconds
    response.cookies.set(REFRESH_COOKIE_NAME, refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/api/auth",
      maxAge: refreshMaxAge,
    });
  }

  // Set user metadata cookie (NOT HttpOnly, for UI rendering)
  // Contains ONLY non-sensitive display data
  if (user) {
    const userMeta = JSON.stringify({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isSuperAdmin: user.isSuperAdmin ?? false,
    });
    response.cookies.set(USER_DATA_COOKIE_NAME, userMeta, {
      httpOnly: false, // Accessible by JS for UI
      secure: isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: sessionMaxAge,
    });
  }

  return response;
}

/**
 * DELETE /api/auth/session
 *
 * Clear all auth cookies on logout.
 */
export async function DELETE() {
  const response = NextResponse.json({ success: true });

  // Clear all auth cookies by setting maxAge to 0
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  response.cookies.set(REFRESH_COOKIE_NAME, "", {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/api/auth",
    maxAge: 0,
  });

  response.cookies.set(USER_DATA_COOKIE_NAME, "", {
    httpOnly: false,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}

/**
 * GET /api/auth/session
 *
 * Check if a session cookie exists (for client-side auth state).
 * Does NOT expose the token value — only confirms presence.
 */
export async function GET(request: NextRequest) {
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
  const hasSession = !!sessionCookie?.value;

  return NextResponse.json({
    authenticated: hasSession,
  });
}
