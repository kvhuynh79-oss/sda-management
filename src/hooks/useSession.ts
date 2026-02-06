"use client";

import { useEffect, useState } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

interface User {
  id: Id<"users">;
  email: string;
  firstName: string;
  lastName: string;
  role: "admin" | "property_manager" | "staff" | "accountant" | "sil_provider";
  silProviderId?: Id<"silProviders">;
  providerName?: string;
  sessionExpiresAt?: number;
}

interface SessionData {
  user: User | null;
  loading: boolean;
  token: string | null;
  error: string | null;
}

const SESSION_STORAGE_KEY = "sda_session_token";
const REFRESH_STORAGE_KEY = "sda_refresh_token";

export function useSession(): SessionData {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load token from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem(SESSION_STORAGE_KEY);
    setToken(storedToken);
  }, []);

  // Validate session when token changes using query
  const sessionData = useQuery(
    api.auth.validateSession,
    token ? { token } : "skip"
  );

  // Process session data
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (sessionData === undefined) {
      // Still loading
      setLoading(true);
      return;
    }

    if (!token) {
      setLoading(false);
      setUser(null);
      return;
    }

    if (sessionData) {
      // Session valid - sessionData is the user object
      setUser({
        id: sessionData._id,
        email: sessionData.email,
        firstName: sessionData.firstName,
        lastName: sessionData.lastName,
        role: sessionData.role,
        silProviderId: sessionData.silProviderId,
        providerName: sessionData.providerName,
        sessionExpiresAt: sessionData.sessionExpiresAt,
      });
      setError(null);
      setLoading(false);
    } else {
      // Session invalid - clear tokens
      localStorage.removeItem(SESSION_STORAGE_KEY);
      localStorage.removeItem(REFRESH_STORAGE_KEY);
      setToken(null);
      setUser(null);
      setError("Session expired. Please login again.");
      setLoading(false);
    }
  }, [sessionData, token]);

  return {
    user,
    loading,
    token,
    error,
  };
}

/**
 * Get stored tokens from localStorage
 */
export function getStoredTokens() {
  return {
    token: localStorage.getItem(SESSION_STORAGE_KEY),
    refreshToken: localStorage.getItem(REFRESH_STORAGE_KEY),
  };
}

/**
 * Store tokens in localStorage
 */
export function storeTokens(token: string, refreshToken: string) {
  localStorage.setItem(SESSION_STORAGE_KEY, token);
  localStorage.setItem(REFRESH_STORAGE_KEY, refreshToken);

  // Remove old localStorage key if it exists
  localStorage.removeItem("sda_user");
}

/**
 * Clear all auth tokens
 */
export function clearTokens() {
  localStorage.removeItem(SESSION_STORAGE_KEY);
  localStorage.removeItem(REFRESH_STORAGE_KEY);
  localStorage.removeItem("sda_user"); // Clean up old key
}
