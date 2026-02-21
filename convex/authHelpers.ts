import { QueryCtx, MutationCtx, ActionCtx } from "./_generated/server";
import { Id, Doc } from "./_generated/dataModel";
import { internal } from "./_generated/api";

// Audit context for logging security events from helper functions.
// Pass this from mutation handlers to enable audit trail logging.
interface AuditUserContext {
  userId: Id<"users">;
  userEmail: string;
  userName: string;
}

// Type guard: MutationCtx has scheduler, QueryCtx does not.
function isMutationCtx(ctx: QueryCtx | MutationCtx): ctx is MutationCtx {
  return "scheduler" in ctx;
}

// User roles
export type UserRole = "admin" | "property_manager" | "staff" | "accountant" | "sil_provider";

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
  communications: { view: boolean; create: boolean; update: boolean; delete: boolean };
  tasks: { view: boolean; create: boolean; update: boolean; delete: boolean };
  leads: { view: boolean; create: boolean; update: boolean; delete: boolean };
  staffMembers: { view: boolean; create: boolean; update: boolean; delete: boolean };
  policies: { view: boolean; create: boolean; update: boolean; delete: boolean };
  calendar: { view: boolean; create: boolean; update: boolean; delete: boolean };
  inspections: { view: boolean; create: boolean; update: boolean; delete: boolean };
  restrictivePractices: { view: boolean; create: boolean; update: boolean; delete: boolean };
  ndisPriceGuide: { view: boolean; create: boolean; update: boolean; delete: boolean };
  staffTraining: { view: boolean; create: boolean; update: boolean; delete: boolean };
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
    communications: { view: true, create: true, update: true, delete: true },
    tasks: { view: true, create: true, update: true, delete: true },
    leads: { view: true, create: true, update: true, delete: true },
    staffMembers: { view: true, create: true, update: true, delete: true },
    policies: { view: true, create: true, update: true, delete: true },
    calendar: { view: true, create: true, update: true, delete: true },
    inspections: { view: true, create: true, update: true, delete: true },
    restrictivePractices: { view: true, create: true, update: true, delete: true },
    ndisPriceGuide: { view: true, create: true, update: true, delete: true },
    staffTraining: { view: true, create: true, update: true, delete: true },
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
    communications: { view: true, create: true, update: true, delete: true },
    tasks: { view: true, create: true, update: true, delete: true },
    leads: { view: true, create: true, update: true, delete: false },
    staffMembers: { view: false, create: false, update: false, delete: false },
    policies: { view: true, create: true, update: true, delete: false },
    calendar: { view: true, create: true, update: true, delete: true },
    inspections: { view: true, create: true, update: true, delete: true },
    restrictivePractices: { view: true, create: true, update: true, delete: false },
    ndisPriceGuide: { view: true, create: false, update: false, delete: false },
    staffTraining: { view: true, create: true, update: true, delete: false },
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
    communications: { view: true, create: true, update: true, delete: false },
    tasks: { view: true, create: true, update: true, delete: false },
    leads: { view: true, create: true, update: true, delete: false },
    staffMembers: { view: false, create: false, update: false, delete: false },
    policies: { view: true, create: false, update: false, delete: false },
    calendar: { view: true, create: true, update: true, delete: true },
    inspections: { view: true, create: true, update: true, delete: false },
    restrictivePractices: { view: true, create: true, update: true, delete: false },
    ndisPriceGuide: { view: true, create: false, update: false, delete: false },
    staffTraining: { view: true, create: false, update: false, delete: false },
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
    communications: { view: true, create: true, update: false, delete: false },
    tasks: { view: true, create: true, update: false, delete: false },
    leads: { view: true, create: false, update: false, delete: false },
    staffMembers: { view: false, create: false, update: false, delete: false },
    policies: { view: true, create: false, update: false, delete: false },
    calendar: { view: true, create: false, update: false, delete: false },
    inspections: { view: true, create: false, update: false, delete: false },
    restrictivePractices: { view: false, create: false, update: false, delete: false },
    ndisPriceGuide: { view: true, create: false, update: false, delete: false },
    staffTraining: { view: false, create: false, update: false, delete: false },
  },
  sil_provider: {
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
    communications: { view: true, create: true, update: true, delete: false },
    tasks: { view: true, create: true, update: true, delete: false },
    leads: { view: true, create: false, update: false, delete: false },
    staffMembers: { view: false, create: false, update: false, delete: false },
    policies: { view: true, create: false, update: false, delete: false },
    calendar: { view: false, create: false, update: false, delete: false },
    inspections: { view: true, create: false, update: false, delete: false },
    restrictivePractices: { view: false, create: false, update: false, delete: false },
    ndisPriceGuide: { view: false, create: false, update: false, delete: false },
    staffTraining: { view: false, create: false, update: false, delete: false },
  },
};

/**
 * Validate that a userId corresponds to a real, active user with a valid organization.
 * This is the core identity validation function - all auth flows should go through this.
 *
 * Checks:
 * 1. User exists in the database
 * 2. User is active (not disabled/deactivated)
 * 3. User has an organizationId set (post-migration requirement)
 * 4. Organization exists and is active
 *
 * Returns the full validated user document for further checks.
 */
export async function validateUserIdentity(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">
): Promise<Doc<"users">> {
  const user = await ctx.db.get(userId);

  if (!user) {
    throw new Error("Authentication required. User not found.");
  }

  if (!user.isActive) {
    throw new Error("Account is disabled. Please contact your administrator.");
  }

  // Validate organization membership (required post-migration)
  if (!user.organizationId) {
    throw new Error("Account configuration error. No organization assigned. Contact your administrator.");
  }

  // Verify the organization exists and is active
  const org = await ctx.db.get(user.organizationId);
  if (!org) {
    throw new Error("Organization not found. Contact your administrator.");
  }
  if (!org.isActive) {
    throw new Error("Organization has been deactivated. Contact support.");
  }

  return user;
}

/**
 * Verify user is authenticated and active
 */
export async function requireAuth(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">
): Promise<AuthenticatedUser> {
  const user = await validateUserIdentity(ctx, userId);

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
 * Get tenant context for multi-tenant queries (Sprint 1)
 * Returns the user's organizationId for row-level tenant isolation
 *
 * During migration, organizationId is optional. This function:
 * - Returns organizationId if user has one (normal flow)
 * - Throws error if organizationId is required but missing (post-migration)
 *
 * Usage in queries:
 * ```
 * const { organizationId } = await requireTenant(ctx, args.userId);
 * const properties = await ctx.db
 *   .query("properties")
 *   .withIndex("by_organizationId", q => q.eq("organizationId", organizationId))
 *   .collect();
 * ```
 */
export async function requireTenant(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">
): Promise<{ organizationId: Id<"organizations">; user: AuthenticatedUser }> {
  // validateUserIdentity (called inside requireAuth) already verifies:
  // - user exists and is active
  // - user has an organizationId
  // - organization exists and is active
  const user = await requireAuth(ctx, userId);

  // Re-fetch user doc to get organizationId (requireAuth returns AuthenticatedUser without it)
  const userDoc = await ctx.db.get(userId);
  if (!userDoc) {
    throw new Error("User not found");
  }

  // SECURITY: organizationId is now mandatory (migration complete).
  // validateUserIdentity already checked this, but double-check here for defense-in-depth.
  if (!userDoc.organizationId) {
    throw new Error("Account configuration error. No organization assigned. Contact your administrator.");
  }

  return {
    organizationId: userDoc.organizationId,
    user,
  };
}

// ============================================================================
// PLAN LIMIT ENFORCEMENT (B2 FIX)
// ============================================================================

type PlanTier = "starter" | "professional" | "enterprise";

interface PlanConfig {
  maxProperties: number;
  maxUsers: number;
  maxDwellings: number;
}

const PLAN_LIMITS: Record<PlanTier, PlanConfig> = {
  starter: { maxProperties: 10, maxUsers: 5, maxDwellings: 20 },
  professional: { maxProperties: 25, maxUsers: 15, maxDwellings: 75 },
  enterprise: { maxProperties: 50, maxUsers: 50, maxDwellings: 200 },
};

type PlanResource = "properties" | "users" | "dwellings";

/**
 * Enforce plan limits on resource creation (B2 FIX).
 * Checks the organization's plan tier and counts existing resources.
 * Throws a clear, actionable error if the limit would be exceeded.
 * When auditUser is provided, logs plan_limit_exceeded to the audit trail.
 *
 * Usage:
 * ```
 * await enforcePlanLimit(ctx, organizationId, "properties", { userId: user._id, userEmail: user.email, userName: `${user.firstName} ${user.lastName}` });
 * // ... then proceed with insert
 * ```
 */
export async function enforcePlanLimit(
  ctx: QueryCtx | MutationCtx,
  organizationId: Id<"organizations">,
  resource: PlanResource,
  auditUser?: AuditUserContext
): Promise<void> {
  // Defense-in-depth: requireTenant() now throws on missing orgId (B6 fix),
  // but guard here too in case this helper is called from a context that
  // doesn't go through requireTenant (e.g., internal mutations).
  if (!organizationId) {
    return;
  }

  const org = await ctx.db.get(organizationId);
  if (!org) {
    throw new Error("Organization not found. Cannot verify plan limits.");
  }

  const plan = org.plan as PlanTier;
  const limits = PLAN_LIMITS[plan];
  if (!limits) {
    // Unknown plan tier - allow but log warning
    console.warn(`[PlanLimit] Unknown plan tier "${plan}" for org ${organizationId}. Skipping limit check.`);
    return;
  }

  // Count current resources for this organization
  let currentCount: number;
  let limit: number;
  let resourceLabel: string;

  switch (resource) {
    case "properties": {
      const items = await ctx.db
        .query("properties")
        .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
        .collect();
      currentCount = items.filter((p) => p.isActive).length;
      limit = limits.maxProperties;
      resourceLabel = "properties";
      break;
    }
    case "dwellings": {
      const items = await ctx.db
        .query("dwellings")
        .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
        .collect();
      currentCount = items.filter((d) => d.isActive).length;
      limit = limits.maxDwellings;
      resourceLabel = "dwellings";
      break;
    }
    case "users": {
      const items = await ctx.db
        .query("users")
        .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
        .collect();
      currentCount = items.filter((u) => u.isActive).length;
      limit = limits.maxUsers;
      resourceLabel = "users";
      break;
    }
  }

  if (currentCount >= limit) {
    // Audit log: plan limit exceeded (before throwing)
    if (auditUser && isMutationCtx(ctx)) {
      await ctx.scheduler.runAfter(0, internal.auditLog.log, {
        organizationId,
        userId: auditUser.userId,
        userEmail: auditUser.userEmail,
        userName: auditUser.userName,
        action: "plan_limit_exceeded" as const,
        entityType: "system",
        metadata: JSON.stringify({
          resourceType: resource,
          currentCount,
          limit,
          plan,
        }),
      });
    }

    throw new Error(
      `Plan limit reached: Your ${plan} plan allows ${limit} ${resourceLabel}. ` +
      `You currently have ${currentCount}. Please upgrade your plan to add more.`
    );
  }
}

// ============================================================================
// SUBSCRIPTION STATUS ENFORCEMENT (B5 FIX)
// ============================================================================

/**
 * Check that an organization has an active subscription (or valid trial).
 * Call this from write mutations to block data modification when subscription is inactive.
 * Read queries should NOT call this (let users view their data even if expired).
 * When auditUser is provided, logs trial_expired_access_blocked to the audit trail.
 *
 * B5 FIX: Enforces trial expiry, canceled, and inactive org status.
 */
export async function requireActiveSubscription(
  ctx: QueryCtx | MutationCtx,
  organizationId: Id<"organizations">,
  auditUser?: AuditUserContext
): Promise<void> {
  // Defense-in-depth: requireTenant() now throws on missing orgId (B6 fix),
  // but guard here too in case this helper is called from internal mutations
  // that don't go through requireTenant.
  if (!organizationId) {
    return;
  }

  const org = await ctx.db.get(organizationId);
  if (!org) {
    throw new Error("Organization not found. Cannot verify subscription status.");
  }

  // Check if org is deactivated
  if (!org.isActive) {
    throw new Error(
      "Your organisation's account is inactive. Please contact support to reactivate."
    );
  }

  // Helper to log blocked access attempts to audit trail
  const logBlockedAccess = async (reason: string) => {
    if (auditUser && isMutationCtx(ctx)) {
      await ctx.scheduler.runAfter(0, internal.auditLog.log, {
        organizationId,
        userId: auditUser.userId,
        userEmail: auditUser.userEmail,
        userName: auditUser.userName,
        action: "trial_expired_access_blocked" as const,
        entityType: "system",
        metadata: JSON.stringify({
          reason,
          subscriptionStatus: org.subscriptionStatus,
          trialEndsAt: org.trialEndsAt ?? null,
        }),
      });
    }
  };

  // Check subscription status
  switch (org.subscriptionStatus) {
    case "active":
      // All good
      return;

    case "trialing": {
      // Check if trial has expired
      if (org.trialEndsAt && org.trialEndsAt < Date.now()) {
        await logBlockedAccess("trial_expired");
        throw new Error(
          "Your free trial has ended. Please subscribe to a plan to continue using MySDAManager."
        );
      }
      // Trial still valid (or no expiry set = indefinite trial from super-admin)
      return;
    }

    case "past_due": {
      // B4 FIX: Enforce grace period access levels
      const accessLevel = org.accessLevel ?? "full";
      if (accessLevel === "suspended") {
        await logBlockedAccess("grace_period_suspended");
        throw new Error(
          "Your account has been suspended due to unpaid subscription. Please update your payment method to restore access."
        );
      }
      if (accessLevel === "read_only") {
        await logBlockedAccess("grace_period_read_only");
        throw new Error(
          "Your account is in read-only mode due to an overdue payment. Please update your payment method to restore full access."
        );
      }
      // accessLevel === "full" — within first 7 days of grace period, allow writes
      return;
    }

    case "canceled":
      await logBlockedAccess("subscription_canceled");
      throw new Error(
        "Your subscription has been cancelled. Please resubscribe to continue making changes."
      );

    case "trial_expired":
      await logBlockedAccess("trial_expired");
      throw new Error(
        "Your free trial has ended. Please subscribe to a plan to continue using MySDAManager."
      );

    default:
      // Unknown status - allow but log
      console.warn(
        `[Subscription] Org ${organizationId} has unknown subscription status: ${org.subscriptionStatus}`
      );
      return;
  }
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
 * Verify that admin users have MFA enabled before allowing sensitive operations.
 * NDIS APP-5 compliance: high-risk accounts must use multi-factor authentication.
 *
 * This guard should be applied to sensitive admin mutations like:
 * - User management (create, update, delete users)
 * - Password resets
 * - Organization settings changes
 * - Data exports
 *
 * Non-admin roles are not affected by this check.
 */
export async function requireAdminMfa(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">
): Promise<void> {
  const user = await ctx.db.get(userId);
  if (!user) {
    throw new Error("Authentication required. User not found.");
  }

  // Only enforce MFA requirement for admin accounts
  if (user.role === "admin" && !user.mfaEnabled) {
    throw new Error(
      "MFA required. Admin accounts must have multi-factor authentication enabled to perform this action. " +
      "Go to Settings > Security to set up MFA."
    );
  }
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