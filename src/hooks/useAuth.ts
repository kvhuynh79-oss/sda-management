"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

interface StoredUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  expiresAt?: number;
}

interface AuthState {
  user: StoredUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export function useAuth(): AuthState {
  const router = useRouter();
  const [storedUser, setStoredUser] = useState<StoredUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Query to validate user is still active in database
  const dbUser = useQuery(
    api.auth.getUser,
    storedUser ? { userId: storedUser.id as Id<"users"> } : "skip"
  );

  useEffect(() => {
    const checkAuth = () => {
      const stored = localStorage.getItem("sda_user");

      if (!stored) {
        setIsLoading(false);
        router.push("/login");
        return;
      }

      try {
        const userData = JSON.parse(stored) as StoredUser;

        // Check if session has expired
        if (userData.expiresAt && Date.now() > userData.expiresAt) {
          localStorage.removeItem("sda_user");
          setIsLoading(false);
          router.push("/login");
          return;
        }

        setStoredUser(userData);
      } catch {
        localStorage.removeItem("sda_user");
        setIsLoading(false);
        router.push("/login");
      }
    };

    checkAuth();
  }, [router]);

  // Validate user is still active in database
  useEffect(() => {
    if (dbUser === undefined) {
      // Still loading from database
      return;
    }

    if (dbUser === null) {
      // User not found in database - session invalid
      localStorage.removeItem("sda_user");
      setStoredUser(null);
      setIsLoading(false);
      router.push("/login");
      return;
    }

    if (!dbUser.isActive) {
      // User has been disabled
      localStorage.removeItem("sda_user");
      setStoredUser(null);
      setIsLoading(false);
      router.push("/login");
      return;
    }

    // User is valid and active
    setIsLoading(false);
  }, [dbUser, router]);

  return {
    user: storedUser,
    isLoading: isLoading || (storedUser !== null && dbUser === undefined),
    isAuthenticated: !isLoading && storedUser !== null && dbUser !== null && dbUser !== undefined && dbUser.isActive,
  };
}

// Logout function
export function logout() {
  localStorage.removeItem("sda_user");
  window.location.href = "/login";
}
