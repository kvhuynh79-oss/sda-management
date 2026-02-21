import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import { storeTokenNative, clearTokensNative } from './capacitorBridge';

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || "";
const SESSION_STORAGE_KEY = "sda_session_token";
const REFRESH_STORAGE_KEY = "sda_refresh_token";

/**
 * Store tokens in localStorage
 */
export function storeTokens(token: string, refreshToken: string) {
  localStorage.setItem(SESSION_STORAGE_KEY, token);
  localStorage.setItem(REFRESH_STORAGE_KEY, refreshToken);

  // Also store in native secure storage for widget access (no-op in browser)
  storeTokenNative(token, refreshToken).catch(() => {});

  // NOTE: We no longer remove "sda_user" here because some pages still use useAuth hook
  // It will be removed during the logout process
}

// Token expiry time (23 hours - refresh before 24h expiry)
const TOKEN_REFRESH_THRESHOLD = 23 * 60 * 60 * 1000; // 23 hours in ms

/**
 * Check if token needs refresh
 */
function shouldRefreshToken(tokenIssuedAt: number): boolean {
  const now = Date.now();
  const tokenAge = now - tokenIssuedAt;
  return tokenAge > TOKEN_REFRESH_THRESHOLD;
}

/**
 * Refresh authentication token
 */
export async function refreshAuthToken(): Promise<{
  success: boolean;
  token?: string;
  refreshToken?: string;
  error?: string;
}> {
  try {
    const currentRefreshToken = localStorage.getItem(REFRESH_STORAGE_KEY);

    if (!currentRefreshToken) {
      return {
        success: false,
        error: "No refresh token available",
      };
    }

    // Create Convex client for HTTP requests
    const client = new ConvexHttpClient(CONVEX_URL);

    // Call refresh action
    const result = await client.action(api.auth.refreshSession, {
      refreshToken: currentRefreshToken,
    });

    if (result.token && result.refreshToken) {
      // Store new tokens
      localStorage.setItem(SESSION_STORAGE_KEY, result.token);
      localStorage.setItem(REFRESH_STORAGE_KEY, result.refreshToken);
      // Also store refreshed tokens in native storage for widget access (no-op in browser)
      storeTokenNative(result.token, result.refreshToken).catch(() => {});

      return {
        success: true,
        token: result.token,
        refreshToken: result.refreshToken,
      };
    } else {
      return {
        success: false,
        error: "Token refresh failed",
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Token refresh failed",
    };
  }
}

/**
 * Start automatic token refresh interval
 * Checks every hour and refreshes if token is older than 23 hours
 */
export function startTokenRefreshInterval(): () => void {
  // Check immediately on start
  checkAndRefreshToken();

  // Then check every hour
  const intervalId = setInterval(checkAndRefreshToken, 60 * 60 * 1000); // 1 hour

  // Return cleanup function
  return () => clearInterval(intervalId);
}

/**
 * Check token age and refresh if needed
 */
async function checkAndRefreshToken() {
  const token = localStorage.getItem(SESSION_STORAGE_KEY);

  if (!token) {
    return; // No token to refresh
  }

  try {
    // Tokens are UUIDs (not JWTs) so we can't decode them for issue time.
    // Instead, attempt a refresh on each interval. The server tracks expiry.
    const result = await refreshAuthToken();

    if (result.success) {
    } else if (result.error === "No refresh token available") {
      // No refresh token - user is using legacy auth, skip
      return;
    } else {
      // Clear tokens and force re-login
      localStorage.removeItem(SESSION_STORAGE_KEY);
      localStorage.removeItem(REFRESH_STORAGE_KEY);
      window.location.href = "/login";
    }
  } catch (error) {
  }
}

/**
 * Logout user - clear tokens and redirect to login
 */
export function logout() {
  localStorage.removeItem(SESSION_STORAGE_KEY);
  localStorage.removeItem(REFRESH_STORAGE_KEY);
  localStorage.removeItem("sda_user"); // Clean up old key
  // Clear native tokens too (no-op in browser)
  clearTokensNative().catch(() => {});
  window.location.href = "/login";
}

/**
 * Check if user is authenticated (has valid token)
 */
export function isAuthenticated(): boolean {
  const token = localStorage.getItem(SESSION_STORAGE_KEY);
  return !!token;
}
