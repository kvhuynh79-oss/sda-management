"use client";

import { ReactNode } from "react";
import { useAuth } from "../hooks/useAuth";
import { LoadingScreen } from "./ui/LoadingScreen";

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
  const { user, isLoading, isAuthenticated } = useAuth();

  // Show loading state while checking auth
  if (isLoading) {
    return <LoadingScreen message={loadingMessage} />;
  }

  // If not authenticated, useAuth hook handles redirect to login
  if (!isAuthenticated || !user) {
    return <LoadingScreen message="Redirecting to login..." />;
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
