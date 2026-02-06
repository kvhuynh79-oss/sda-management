import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || "";
const SESSION_STORAGE_KEY = "sda_session_token";
const REFRESH_STORAGE_KEY = "sda_refresh_token";

/**
 * Store tokens in localStorage
 */
export function storeTokens(token: string, refreshToken: string) {
  localStorage.setItem(SESSION_STORAGE_KEY, token);
  localStorage.setItem(REFRESH_STORAGE_KEY, refreshToken);

  // Remove old localStorage key if it exists
  localStorage.removeItem("sda_user");
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
    console.error("Token refresh error:", error);
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
    // Decode JWT to get issued date (simple base64 decode)
    const payload = JSON.parse(atob(token.split(".")[1]));
    const issuedAt = payload.iat * 1000; // Convert to milliseconds

    if (shouldRefreshToken(issuedAt)) {
      console.log("Token needs refresh, refreshing...");
      const result = await refreshAuthToken();

      if (result.success) {
        console.log("Token refreshed successfully");
      } else {
        console.warn("Token refresh failed:", result.error);
        // Clear tokens and force re-login
        localStorage.removeItem(SESSION_STORAGE_KEY);
        localStorage.removeItem(REFRESH_STORAGE_KEY);
        window.location.href = "/login";
      }
    }
  } catch (error) {
    console.error("Error checking token:", error);
  }
}

/**
 * Logout user - clear tokens and redirect to login
 */
export function logout() {
  localStorage.removeItem(SESSION_STORAGE_KEY);
  localStorage.removeItem(REFRESH_STORAGE_KEY);
  localStorage.removeItem("sda_user"); // Clean up old key
  window.location.href = "/login";
}

/**
 * Check if user is authenticated (has valid token)
 */
export function isAuthenticated(): boolean {
  const token = localStorage.getItem(SESSION_STORAGE_KEY);
  return !!token;
}
