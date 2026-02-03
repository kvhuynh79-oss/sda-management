import { QueryCtx, MutationCtx, ActionCtx } from "./_generated/server";
import { Id, Doc } from "./_generated/dataModel";

// User roles
export type UserRole = "admin" | "property_manager" | "staff" | "accountant";

// Authenticated user type
export interface AuthenticatedUser {
  _id: Id<"users">;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
}

// Permission definitions for each role
export const rolePermissions: Record<UserRole, {
  properties: { view: boolean; create: boolean; update: boolean; delete: boolean };
  participants: { view: boolean; create: boolean; update: boolean; delete: boolean };
  payments: { view: boolean; create: boolean; update: boolean; delete: boolean };
  maintenance: { view: boolean; create: boolean; update: boolean; delete: boolean };
  documents: { view: boolean; create: boolean; update: boolean; delete: boolean };
  reports: { view: boolean; export: boolean };
  users: { view: boolean; create: boolean; update: boolean; delete: boolean };
  incidents: { view: boolean; create: boolean; update: boolean; delete: boolean };
  contractors: { view: boolean; create: boolean; update: boolean; delete: boolean };
  auditLogs: { view: boolean };
}> = {
  admin: {
    properties: { view: true, create: true, update: true, delete: true },
    participants: { view: true, create: true, update: true, delete: true },
    payments: { view: true, create: true, update: true, delete: true },
    maintenance: { view: true, create: true, update: true, delete: true },
    documents: { view: true, create: true, update: true, delete: true },
    reports: { view: true, export: true },
    users: { view: true, create: true, update: true, delete: true },
    incidents: { view: true, create: true, update: true, delete: true },
    contractors: { view: true, create: true, update: true, delete: true },
    auditLogs: { view: true },
  },
  property_manager: {
    properties: { view: true, create: true, update: true, delete: false },
    participants: { view: true, create: true, update: true, delete: false },
    payments: { view: true, create: true, update: true, delete: false },
    maintenance: { view: true, create: true, update: true, delete: true },
    documents: { view: true, create: true, update: true, delete: true },
    reports: { view: true, export: true },
    users: { view: false, create: false, update: false, delete: false },
    incidents: { view: true, create: true, update: true, delete: false },
    contractors: { view: true, create: true, update: true, delete: false },
    auditLogs: { view: false },
  },
  staff: {
    properties: { view: true, create: false, update: false, delete: false },
    participants: { view: true, create: false, update: false, delete: false },
    payments: { view: false, create: false, update: false, delete: false },
    maintenance: { view: true, create: true, update: true, delete: false },
    documents: { view: true, create: true, update: false, delete: false },
    reports: { view: false, export: false },
    users: { view: false, create: false, update: false, delete: false },
    incidents: { view: true, create: true, update: true, delete: false },
    contractors: { view: true, create: false, update: false, delete: false },
    auditLogs: { view: false },
  },
  accountant: {
    properties: { view: true, create: false, update: false, delete: false },
    participants: { view: true, create: false, update: false, delete: false },
    payments: { view: true, create: true, update: true, delete: false },
    maintenance: { view: true, create: false, update: false, delete: false },
    documents: { view: true, create: true, update: false, delete: false },
    reports: { view: true, export: true },
    users: { view: false, create: false, update: false, delete: false },
    incidents: { view: true, create: false, update: false, delete: false },
    contractors: { view: true, create: false, update: false, delete: false },
    auditLogs: { view: false },
  },
};

/**
 * Verify user is authenticated and active
 */
export async function requireAuth(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">
): Promise<AuthenticatedUser> {
  const user = await ctx.db.get(userId);

  if (!user) {
    throw new Error("Authentication required. User not found.");
  }

  if (!user.isActive) {
    throw new Error("Account is disabled. Please contact your administrator.");
  }

  return {
    _id: user._id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role as UserRole,
    isActive: user.isActive,
  };
}

/**
 * Verify user has one of the allowed roles
 */
export async function requireRole(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  allowedRoles: UserRole[]
): Promise<AuthenticatedUser> {
  const user = await requireAuth(ctx, userId);

  if (!allowedRoles.includes(user.role)) {
    throw new Error(
      `Access denied. This action requires one of these roles: ${allowedRoles.join(", ")}. Your role: ${user.role}`
    );
  }

  return user;
}

/**
 * Verify user is an admin
 */
export async function requireAdmin(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">
): Promise<AuthenticatedUser> {
  return requireRole(ctx, userId, ["admin"]);
}

/**
 * Check if user has permission for a specific action
 */
export function hasPermission(
  role: UserRole,
  resource: keyof typeof rolePermissions.admin,
  action: "view" | "create" | "update" | "delete" | "export"
): boolean {
  const permissions = rolePermissions[role][resource];
  return (permissions as Record<string, boolean>)[action] ?? false;
}

/**
 * Verify user has permission for a specific action, throw if not
 */
export async function requirePermission(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  resource: keyof typeof rolePermissions.admin,
  action: "view" | "create" | "update" | "delete" | "export"
): Promise<AuthenticatedUser> {
  const user = await requireAuth(ctx, userId);

  if (!hasPermission(user.role, resource, action)) {
    throw new Error(
      `Access denied. You don't have permission to ${action} ${resource}. Your role: ${user.role}`
    );
  }

  return user;
}

// Convenience functions for common permission checks

export function canViewPayments(role: UserRole): boolean {
  return hasPermission(role, "payments", "view");
}

export function canEditPayments(role: UserRole): boolean {
  return hasPermission(role, "payments", "update");
}

export function canManageUsers(role: UserRole): boolean {
  return hasPermission(role, "users", "update");
}

export function canDeleteProperties(role: UserRole): boolean {
  return hasPermission(role, "properties", "delete");
}

export function canDeleteParticipants(role: UserRole): boolean {
  return hasPermission(role, "participants", "delete");
}

export function canViewAuditLogs(role: UserRole): boolean {
  return hasPermission(role, "auditLogs", "view");
}

export function canExportReports(role: UserRole): boolean {
  return hasPermission(role, "reports", "export");
}

/**
 * Get user's full name for audit logging
 */
export function getUserFullName(user: AuthenticatedUser | Doc<"users">): string {
  return `${user.firstName} ${user.lastName}`;
}

/**
 * Sanitize user object for client (remove sensitive fields)
 */
export function sanitizeUser(user: Doc<"users">): Omit<Doc<"users">, "passwordHash"> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}