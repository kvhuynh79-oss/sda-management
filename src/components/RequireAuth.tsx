"use client";

import { ReactNode, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "../hooks/useAuth";
import { LoadingScreen } from "./ui/LoadingScreen";
import { useInactivityLock } from "../hooks/useInactivityLock";
import { LockScreen } from "./LockScreen";
import { logout } from "../lib/auth";

/** Routes that restricted roles (sil_provider) are allowed to access outside /portal */
const SIL_PROVIDER_ALLOWED_PATHS = ["/settings", "/login"];

interface RequireAuthProps {
  /** Page content to render when authenticated */
  children: ReactNode;
  /** Optional roles that are allowed (if not specified, any authenticated user is allowed) */
  allowedRoles?: string[];
  /** Custom loading message */
  loadingMessage?: string;
}

/**
 * Wrapper component that protects routes requiring authentication.
 * Use this instead of manually checking auth in every page.
 *
 * @example
 * ```tsx
 * export default function ProtectedPage() {
 *   return (
 *     <RequireAuth>
 *       <PageContent />
 *     </RequireAuth>
 *   );
 * }
 * ```
 *
 * @example With role restriction
 * ```tsx
 * export default function AdminPage() {
 *   return (
 *     <RequireAuth allowedRoles={["admin"]}>
 *       <AdminContent />
 *     </RequireAuth>
 *   );
 * }
 * ```
 */
export function RequireAuth({
  children,
  allowedRoles,
  loadingMessage = "Loading...",
}: RequireAuthProps) {
  // Use useAuth to match Dashboard's auth mechanism (uses sda_user localStorage key)
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { isLocked, unlock, lockNow } = useInactivityLock(user?.role);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [isLoading, user, router]);

  // Redirect SIL Provider users to portal if they access non-portal routes
  useEffect(() => {
    if (!isLoading && user && user.role === "sil_provider" && pathname) {
      const isPortalRoute = pathname.startsWith("/portal");
      const isAllowedRoute = SIL_PROVIDER_ALLOWED_PATHS.some(p => pathname.startsWith(p));
      if (!isPortalRoute && !isAllowedRoute) {
        router.replace("/portal/dashboard");
      }
    }
  }, [isLoading, user, pathname, router]);

  // Show loading state while checking auth
  if (isLoading) {
    return <LoadingScreen message={loadingMessage} />;
  }

  // If not authenticated, show loading while redirecting
  if (!user) {
    return <LoadingScreen message="Redirecting to login..." />;
  }

  // Show lock screen if inactive
  if (isLocked) {
    return <LockScreen onUnlock={unlock} onLogout={logout} />;
  }

  // Block render for SIL providers on non-portal routes (redirect in progress)
  if (user.role === "sil_provider" && pathname) {
    const isPortalRoute = pathname.startsWith("/portal");
    const isAllowedRoute = SIL_PROVIDER_ALLOWED_PATHS.some(p => pathname.startsWith(p));
    if (!isPortalRoute && !isAllowedRoute) {
      return <LoadingScreen message="Redirecting to portal..." />;
    }
  }

  // Check role restrictions if specified
  if (allowedRoles && allowedRoles.length > 0) {
    if (!allowedRoles.includes(user.role)) {
      return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
            <p className="text-gray-400">
              You do not have permission to view this page.
            </p>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}

export default RequireAuth;
