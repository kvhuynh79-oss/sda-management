import { mutation, query, action, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import bcrypt from "bcryptjs";
import { enforcePlanLimit, requireActiveSubscription } from "./authHelpers";
import { requirePasswordComplexity } from "./lib/passwordValidation";

// Secure password hashing using bcryptjs
const SALT_ROUNDS = 12;

// S14: Dummy hash for timing-safe login (prevents user enumeration)
const DUMMY_BCRYPT_HASH = "$2b$12$LJ3m4ys3Sg8L7uXfPp0dReKMSHNQMqHzJDFGHNjI8vOaXfJ5WXkWe";

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Create a new user (admin only - prevents unauthorized account creation)
// SECURITY: Requires admin verification to prevent non-admins from creating admin accounts
export const createUser = action({
  args: {
    actingUserId: v.optional(v.id("users")), // User performing the action (must be admin, optional for initial setup)
    email: v.string(),
    password: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    role: v.union(
      v.literal("admin"),
      v.literal("property_manager"),
      v.literal("staff"),
      v.literal("accountant"),
      v.literal("sil_provider")
    ),
    phone: v.optional(v.string()),
    silProviderId: v.optional(v.id("silProviders")), // For SIL provider users
  },
  handler: async (ctx, args): Promise<Id<"users">> => {
    // Check if any users exist (for initial setup)
    const hasUsers = await ctx.runMutation(internal.auth.checkUsersExist, {});

    // If users exist, require admin verification
    let actingUser: { email: string; firstName: string; lastName: string } | null = null;
    if (hasUsers) {
      if (!args.actingUserId) {
        throw new Error("Admin access required to create users. Please provide actingUserId.");
      }
      // SECURITY: Verify acting user is an admin via internal mutation
      actingUser = await ctx.runMutation(internal.auth.verifyAdminInternal, {
        userId: args.actingUserId,
      });
      // SECURITY (S2): Verify admin has MFA enabled for sensitive operations
      await ctx.runMutation(internal.auth.verifyAdminMfaInternal, {
        userId: args.actingUserId,
      });
    }

    // SECURITY (S5): Validate password complexity before hashing
    requirePasswordComplexity(args.password);

    // Hash password with bcrypt (secure)
    const passwordHash = await hashPassword(args.password);

    // Call internal mutation to create the user
    const userId: Id<"users"> = await ctx.runMutation(internal.auth.createUserInternal, {
      actingUserId: args.actingUserId,
      actingUserEmail: actingUser?.email,
      actingUserName: actingUser ? `${actingUser.firstName} ${actingUser.lastName}` : undefined,
      email: args.email,
      passwordHash,
      firstName: args.firstName,
      lastName: args.lastName,
      role: args.role,
      phone: args.phone,
      silProviderId: args.silProviderId,
    });

    return userId;
  },
});

// Internal mutation to verify admin access (used by actions that can't directly call requireAdmin)
export const verifyAdminInternal = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("Authentication required. User not found.");
    }
    if (!user.isActive) {
      throw new Error("Account is disabled. Please contact your administrator.");
    }
    if (user.role !== "admin") {
      throw new Error("Admin access required. Your role: " + user.role);
    }
    return {
      _id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    };
  },
});

// SECURITY (S2): Internal mutation to verify admin has MFA enabled
// Used by actions that cannot directly call requireAdminMfa (which needs MutationCtx)
export const verifyAdminMfaInternal = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("Authentication required. User not found.");
    }
    if (user.role === "admin" && !user.mfaEnabled) {
      throw new Error(
        "MFA required. Admin accounts must have multi-factor authentication enabled to perform this action. " +
        "Go to Settings > Security to set up MFA."
      );
    }
  },
});

// Internal mutation to verify two users belong to the same organization
export const verifySameOrganization = internalMutation({
  args: {
    actingUserId: v.id("users"),
    targetUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const actingUser = await ctx.db.get(args.actingUserId);
    const targetUser = await ctx.db.get(args.targetUserId);
    if (!actingUser || !targetUser) {
      throw new Error("User not found");
    }
    if (actingUser.organizationId && targetUser.organizationId !== actingUser.organizationId) {
      throw new Error("Access denied: Cannot modify users from another organization");
    }
  },
});

// Internal mutation to check if any users exist (for initial setup)
export const checkUsersExist = internalMutation({
  args: {},
  handler: async (ctx) => {
    const user = await ctx.db.query("users").first();
    return user !== null;
  },
});

// Internal mutation for creating user (called from action)
export const createUserInternal = internalMutation({
  args: {
    actingUserId: v.optional(v.id("users")),
    actingUserEmail: v.optional(v.string()),
    actingUserName: v.optional(v.string()),
    email: v.string(),
    passwordHash: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    role: v.union(
      v.literal("admin"),
      v.literal("property_manager"),
      v.literal("staff"),
      v.literal("accountant"),
      v.literal("sil_provider")
    ),
    phone: v.optional(v.string()),
    silProviderId: v.optional(v.id("silProviders")),
  },
  handler: async (ctx, args) => {
    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();

    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    // Inherit organizationId from the acting user (admin creating the new user)
    let organizationId: Id<"organizations"> | undefined;
    if (args.actingUserId) {
      const actingUser = await ctx.db.get(args.actingUserId);
      if (actingUser?.organizationId) {
        organizationId = actingUser.organizationId;
      }
    }

    // B2 FIX: Enforce plan limits on user creation
    if (organizationId) {
      const auditUser = args.actingUserId && args.actingUserEmail && args.actingUserName
        ? { userId: args.actingUserId, userEmail: args.actingUserEmail, userName: args.actingUserName }
        : undefined;
      await enforcePlanLimit(ctx, organizationId, "users", auditUser);
      // B5 FIX: Require active subscription for write operations
      await requireActiveSubscription(ctx, organizationId, auditUser);
    }

    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      email: args.email.toLowerCase(),
      passwordHash: args.passwordHash,
      firstName: args.firstName,
      lastName: args.lastName,
      role: args.role,
      phone: args.phone,
      silProviderId: args.silProviderId,
      organizationId,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    // Audit log the user creation (if acting user is provided, i.e., not initial setup)
    if (args.actingUserId && args.actingUserEmail && args.actingUserName) {
      await ctx.runMutation(internal.auditLog.log, {
        userId: args.actingUserId,
        userEmail: args.actingUserEmail,
        userName: args.actingUserName,
        action: "create",
        entityType: "user",
        entityId: userId,
        entityName: args.email.toLowerCase(),
        changes: JSON.stringify({
          email: args.email.toLowerCase(),
          firstName: args.firstName,
          lastName: args.lastName,
          role: args.role,
        }),
      });
    }

    return userId;
  },
});

// Login result type
interface LoginResult {
  _id: Id<"users">;
  id: Id<"users">;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  silProviderId?: Id<"silProviders">;
  providerName?: string;
}

// Login function - uses action for bcrypt password verification
export const login = action({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args): Promise<LoginResult> => {
    // Get user data via internal query
    const userData = await ctx.runMutation(internal.auth.getUserForLogin, {
      email: args.email,
    });

    if (!userData) {
      // S14: Timing-safe rejection - do a dummy bcrypt compare
      await verifyPassword(args.password, DUMMY_BCRYPT_HASH);
      throw new Error("Invalid email or password");
    }

    if (!userData.isActive) {
      await verifyPassword(args.password, DUMMY_BCRYPT_HASH);
      throw new Error("Invalid email or password");
    }

    // Check login rate limiting
    if (userData.loginLockedUntil && userData.loginLockedUntil > Date.now()) {
      const remainingMin = Math.ceil((userData.loginLockedUntil - Date.now()) / 60000);
      throw new Error(`Account temporarily locked. Try again in ${remainingMin} minute${remainingMin !== 1 ? "s" : ""}.`);
    }

    // Verify password with bcrypt
    const isValid = await verifyPassword(args.password, userData.passwordHash);
    if (!isValid) {
      await ctx.runMutation(internal.auth.trackFailedLogin, { userId: userData._id });
      throw new Error("Invalid email or password");
    }

    // Reset failed attempts on successful login
    if (userData.loginFailedAttempts && userData.loginFailedAttempts > 0) {
      await ctx.runMutation(internal.auth.resetLoginAttempts, { userId: userData._id });
    }

    // Update last login and log via internal mutation
    const result: LoginResult = await ctx.runMutation(internal.auth.processLogin, {
      userId: userData._id,
    });

    return result;
  },
});

// Login rate limiting
const LOGIN_RATE_LIMIT = {
  MAX_ATTEMPTS: 5,
  LOCKOUT_MS: 15 * 60 * 1000, // 15 minutes
};

// User data type returned by getUserForLogin
interface UserForLogin {
  _id: Id<"users">;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  passwordHash: string;
  isActive: boolean;
  silProviderId?: Id<"silProviders">;
  // MFA fields
  mfaEnabled?: boolean;
  mfaSecret?: string;
  // Login rate limiting
  loginFailedAttempts?: number;
  loginLockedUntil?: number;
}

// Internal query to get user for login (includes password hash)
export const getUserForLogin = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, args): Promise<UserForLogin | null> => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();

    if (!user) return null;

    return {
      _id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      passwordHash: user.passwordHash,
      isActive: user.isActive,
      silProviderId: user.silProviderId,
      mfaEnabled: user.mfaEnabled,
      mfaSecret: user.mfaSecret,
      loginFailedAttempts: user.loginFailedAttempts,
      loginLockedUntil: user.loginLockedUntil,
    };
  },
});

// Internal mutation to track failed login attempt
export const trackFailedLogin = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return;

    const attempts = (user.loginFailedAttempts || 0) + 1;
    const patch: Record<string, any> = {
      loginFailedAttempts: attempts,
      updatedAt: Date.now(),
    };

    if (attempts >= LOGIN_RATE_LIMIT.MAX_ATTEMPTS) {
      patch.loginLockedUntil = Date.now() + LOGIN_RATE_LIMIT.LOCKOUT_MS;
    }

    await ctx.db.patch(args.userId, patch);
  },
});

// Internal mutation to reset login attempts on success
export const resetLoginAttempts = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      loginFailedAttempts: 0,
      loginLockedUntil: undefined,
    });
  },
});

// Internal mutation to process successful login
export const processLogin = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args): Promise<LoginResult> => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    // Update last login
    await ctx.db.patch(user._id, {
      lastLogin: Date.now(),
    });

    // Audit log the login
    await ctx.runMutation(internal.auditLog.log, {
      userId: user._id,
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`,
      action: "login",
      entityType: "user",
      entityId: user._id,
      entityName: user.email,
    });

    // For SIL provider users, get their provider info
    let silProviderId: Id<"silProviders"> | undefined = user.silProviderId;
    let providerName: string | undefined = undefined;
    if (user.role === "sil_provider" && user.silProviderId) {
      const provider = await ctx.db.get(user.silProviderId);
      if (provider) {
        providerName = provider.companyName;
      }
    }

    // Return user info (without password)
    return {
      _id: user._id,
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      silProviderId,
      providerName,
    };
  },
});

// Get user by ID
// SECURITY: This query is called by useAuth hook to validate the user stored in localStorage.
// It validates the user exists, is active, and has a valid organization.
// It does NOT expose sensitive fields (password hash, MFA secrets, etc.).
export const getUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;

    // SECURITY: If user is inactive, return null (forces re-login)
    if (!user.isActive) return null;

    // SECURITY: Validate organization exists and is active
    if (user.organizationId) {
      const org = await ctx.db.get(user.organizationId);
      if (!org || !org.isActive) return null;
    }

    // Return user without password hash or sensitive fields
    return {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      phone: user.phone,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
      isSuperAdmin: user.isSuperAdmin ?? false,
      organizationId: user.organizationId,
    };
  },
});

// Get all users (admin only)
export const getAllUsers = query({
  args: {
    userId: v.id("users"), // Required for permission check
  },
  handler: async (ctx, args) => {
    // Admin-only permission check
    const requestingUser = await ctx.db.get(args.userId);
    if (!requestingUser) {
      throw new Error("User not found");
    }
    if (requestingUser.role !== "admin") {
      throw new Error("Access denied: Admin permission required to view all users");
    }

    // SECURITY: Filter by organizationId for tenant isolation
    const orgId = requestingUser.organizationId;
    let users;
    if (orgId) {
      users = await ctx.db
        .query("users")
        .withIndex("by_organizationId", (q) => q.eq("organizationId", orgId))
        .collect();
    } else {
      // Fallback for users without org (shouldn't happen in production)
      users = await ctx.db.query("users").collect();
    }

    return users.map((user) => ({
      _id: user._id,
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
      silProviderId: user.silProviderId,
    }));
  },
});

// Update user (admin only - prevents privilege escalation)
export const updateUser = mutation({
  args: {
    actingUserId: v.id("users"), // User performing the action (must be admin)
    targetUserId: v.id("users"), // User being updated
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    phone: v.optional(v.string()),
    role: v.optional(
      v.union(
        v.literal("admin"),
        v.literal("property_manager"),
        v.literal("staff"),
        v.literal("accountant"),
        v.literal("sil_provider")
      )
    ),
    silProviderId: v.optional(v.id("silProviders")),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // SECURITY: Verify acting user is an admin to prevent privilege escalation
    const actingUser = await ctx.db.get(args.actingUserId);
    if (!actingUser) {
      throw new Error("Authentication required. User not found.");
    }
    if (!actingUser.isActive) {
      throw new Error("Account is disabled. Please contact your administrator.");
    }
    if (actingUser.role !== "admin") {
      throw new Error("Admin access required to update users. Your role: " + actingUser.role);
    }

    // SECURITY (S2): Verify admin has MFA enabled for sensitive operations
    if (actingUser.role === "admin" && !actingUser.mfaEnabled) {
      throw new Error(
        "MFA required. Admin accounts must have multi-factor authentication enabled to perform this action. " +
        "Go to Settings > Security to set up MFA."
      );
    }

    // Get target user for audit logging
    const targetUser = await ctx.db.get(args.targetUserId);
    if (!targetUser) {
      throw new Error("Target user not found");
    }

    // SECURITY: Verify target user belongs to same organization
    if (actingUser.organizationId && targetUser.organizationId !== actingUser.organizationId) {
      throw new Error("Access denied: Cannot modify users from another organization");
    }

    const { actingUserId, targetUserId, ...updates } = args;

    const filteredUpdates: Record<string, unknown> = { updatedAt: Date.now() };
    const changedFields: Record<string, { from: unknown; to: unknown }> = {};

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filteredUpdates[key] = value;
        // Track changes for audit log
        if ((targetUser as Record<string, unknown>)[key] !== value) {
          changedFields[key] = {
            from: (targetUser as Record<string, unknown>)[key],
            to: value,
          };
        }
      }
    }

    await ctx.db.patch(targetUserId, filteredUpdates);

    // Audit log the update
    await ctx.runMutation(internal.auditLog.log, {
      userId: actingUserId,
      userEmail: actingUser.email,
      userName: `${actingUser.firstName} ${actingUser.lastName}`,
      action: "update",
      entityType: "user",
      entityId: targetUserId,
      entityName: targetUser.email,
      changes: JSON.stringify(changedFields),
      previousValues: JSON.stringify(
        Object.fromEntries(
          Object.keys(changedFields).map((k) => [k, changedFields[k].from])
        )
      ),
    });

    return { success: true };
  },
});

// Change password - uses action for bcrypt
export const changePassword = action({
  args: {
    userId: v.id("users"),
    currentPassword: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    // Get current user's password hash
    const userData = await ctx.runMutation(internal.auth.getUserPasswordHash, {
      userId: args.userId,
    });

    if (!userData) {
      throw new Error("User not found");
    }

    // Verify current password
    const isValid = await verifyPassword(args.currentPassword, userData.passwordHash);
    if (!isValid) {
      throw new Error("Current password is incorrect");
    }

    // SECURITY (S5): Validate new password complexity
    requirePasswordComplexity(args.newPassword);

    // Hash new password
    const newHash = await hashPassword(args.newPassword);

    // Update password via internal mutation
    await ctx.runMutation(internal.auth.updatePasswordHash, {
      userId: args.userId,
      passwordHash: newHash,
    });

    return { success: true };
  },
});

// Reset password (admin function) - uses action for bcrypt
// SECURITY: Requires admin verification to prevent unauthorized password resets
export const resetPassword = action({
  args: {
    actingUserId: v.id("users"), // User performing the action (must be admin)
    targetUserId: v.id("users"), // User whose password is being reset
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    // SECURITY: Verify acting user is an admin via internal mutation
    const actingUser = await ctx.runMutation(internal.auth.verifyAdminInternal, {
      userId: args.actingUserId,
    });

    // SECURITY (S2): Verify admin has MFA enabled for sensitive operations
    await ctx.runMutation(internal.auth.verifyAdminMfaInternal, {
      userId: args.actingUserId,
    });

    // SECURITY: Verify target user belongs to same organization
    await ctx.runMutation(internal.auth.verifySameOrganization, {
      actingUserId: args.actingUserId,
      targetUserId: args.targetUserId,
    });

    // SECURITY (S5): Validate new password complexity
    requirePasswordComplexity(args.newPassword);

    // Hash new password with bcrypt
    const newHash = await hashPassword(args.newPassword);

    // Update password and log via internal mutation
    await ctx.runMutation(internal.auth.resetPasswordInternal, {
      actingUserId: args.actingUserId,
      actingUserEmail: actingUser.email,
      actingUserName: `${actingUser.firstName} ${actingUser.lastName}`,
      targetUserId: args.targetUserId,
      passwordHash: newHash,
    });

    return { success: true };
  },
});

// Internal mutation to reset password with audit logging
export const resetPasswordInternal = internalMutation({
  args: {
    actingUserId: v.id("users"),
    actingUserEmail: v.string(),
    actingUserName: v.string(),
    targetUserId: v.id("users"),
    passwordHash: v.string(),
  },
  handler: async (ctx, args) => {
    // Get target user for audit log
    const targetUser = await ctx.db.get(args.targetUserId);
    if (!targetUser) {
      throw new Error("Target user not found");
    }

    // Update password
    await ctx.db.patch(args.targetUserId, {
      passwordHash: args.passwordHash,
      updatedAt: Date.now(),
    });

    // Audit log the password reset
    await ctx.runMutation(internal.auditLog.log, {
      userId: args.actingUserId,
      userEmail: args.actingUserEmail,
      userName: args.actingUserName,
      action: "update",
      entityType: "user",
      entityId: args.targetUserId,
      entityName: targetUser.email,
      changes: JSON.stringify({ passwordReset: true }),
      metadata: JSON.stringify({ action: "password_reset" }),
    });

    // S20: Send password change notification email
    await ctx.scheduler.runAfter(0, internal.notifications.sendPasswordChangeNotification, {
      userEmail: targetUser.email,
      userName: targetUser.firstName,
      changedBy: args.actingUserName,
    });
  },
});

// Internal query to get user's password hash
export const getUserPasswordHash = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;
    return { passwordHash: user.passwordHash };
  },
});

// Internal mutation to update password hash
export const updatePasswordHash = internalMutation({
  args: {
    userId: v.id("users"),
    passwordHash: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    await ctx.db.patch(args.userId, {
      passwordHash: args.passwordHash,
      updatedAt: Date.now(),
    });

    // S20: Send password change notification email
    if (user) {
      await ctx.scheduler.runAfter(0, internal.notifications.sendPasswordChangeNotification, {
        userEmail: user.email,
        userName: user.firstName,
        changedBy: "self",
      });
    }
  },
});

// Update user email (admin only)
export const updateUserEmail = mutation({
  args: {
    actingUserId: v.id("users"),
    userId: v.id("users"),
    newEmail: v.string(),
  },
  handler: async (ctx, args) => {
    const actingUser = await ctx.db.get(args.actingUserId);
    if (!actingUser || actingUser.role !== "admin") {
      throw new Error("Unauthorized: Only admins can update user emails");
    }

    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) {
      throw new Error("User not found");
    }

    // SECURITY: Verify target user belongs to same organization
    if (actingUser.organizationId && targetUser.organizationId !== actingUser.organizationId) {
      throw new Error("Access denied: Cannot modify users from another organization");
    }

    await ctx.db.patch(args.userId, {
      email: args.newEmail.toLowerCase(),
      updatedAt: Date.now(),
    });

    await ctx.runMutation(internal.auditLog.log, {
      userId: args.actingUserId,
      userEmail: actingUser.email,
      userName: `${actingUser.firstName} ${actingUser.lastName}`,
      action: "update",
      entityType: "user",
      entityId: args.userId,
      entityName: targetUser.email,
      metadata: JSON.stringify({ newEmail: args.newEmail.toLowerCase() }),
    });

    return { success: true };
  },
});

// Logout function - logs the logout action
export const logout = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      return { success: true }; // User already gone, just return
    }

    // Audit log the logout
    await ctx.runMutation(internal.auditLog.log, {
      userId: user._id,
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`,
      action: "logout",
      entityType: "user",
      entityId: user._id,
      entityName: user.email,
    });

    return { success: true };
  },
});

// ============================================
// SESSION-BASED AUTHENTICATION (Server-Side)
// ============================================

// Login result with session tokens
interface SessionLoginResult {
  // MFA flow fields
  requiresMfa?: boolean; // If true, client must call completeMfaLogin
  requiresMfaSetup?: boolean; // If true, admin must set up MFA before gaining full access
  userId?: Id<"users">; // Provided when requiresMfa or requiresMfaSetup is true

  // Regular login fields (when MFA not required or after MFA verification)
  user?: {
    _id: Id<"users">;
    id: Id<"users">;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    silProviderId?: Id<"silProviders">;
    providerName?: string;
    isSuperAdmin?: boolean;
  };
  token?: string;
  refreshToken?: string;
  expiresAt?: number;
}

// Login with session - creates server-side session tokens
export const loginWithSession = action({
  args: {
    email: v.string(),
    password: v.string(),
    userAgent: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<SessionLoginResult> => {
    // Get user data via internal query
    const userData = await ctx.runMutation(internal.auth.getUserForLogin, {
      email: args.email,
    });

    if (!userData) {
      // S14: Timing-safe rejection
      await verifyPassword(args.password, DUMMY_BCRYPT_HASH);
      throw new Error("Invalid email or password");
    }

    if (!userData.isActive) {
      await verifyPassword(args.password, DUMMY_BCRYPT_HASH);
      throw new Error("Invalid email or password");
    }

    // Check login rate limiting
    if (userData.loginLockedUntil && userData.loginLockedUntil > Date.now()) {
      const remainingMin = Math.ceil((userData.loginLockedUntil - Date.now()) / 60000);
      throw new Error(`Account temporarily locked. Try again in ${remainingMin} minute${remainingMin !== 1 ? "s" : ""}.`);
    }

    // Verify password with bcrypt
    const isValid = await verifyPassword(args.password, userData.passwordHash);
    if (!isValid) {
      await ctx.runMutation(internal.auth.trackFailedLogin, { userId: userData._id });
      throw new Error("Invalid email or password");
    }

    // Reset failed attempts on successful login
    if (userData.loginFailedAttempts && userData.loginFailedAttempts > 0) {
      await ctx.runMutation(internal.auth.resetLoginAttempts, { userId: userData._id });
    }

    // Check if MFA is enabled for this user
    if (userData.mfaEnabled) {
      // Return MFA required response (don't create session yet)
      return {
        requiresMfa: true,
        userId: userData._id,
      };
    }

    // SECURITY (S2): Admin accounts MUST have MFA enabled (NDIS APP-5 compliance)
    // If admin has not set up MFA, require them to do so before granting full access
    if (userData.role === "admin" && !userData.mfaEnabled) {
      return {
        requiresMfaSetup: true,
        userId: userData._id,
      };
    }

    // MFA not required for non-admin roles - proceed with normal login
    // Generate tokens using crypto.randomUUID (secure random)
    const token = crypto.randomUUID();
    const refreshToken = crypto.randomUUID();

    // Calculate expiration times
    const now = Date.now();
    const expiresAt = now + (24 * 60 * 60 * 1000); // 24 hours
    const refreshTokenExpiresAt = now + (30 * 24 * 60 * 60 * 1000); // 30 days

    // Create session and process login via internal mutation
    const result = await ctx.runMutation(internal.auth.createSessionAndProcessLogin, {
      userId: userData._id,
      token,
      refreshToken,
      expiresAt,
      refreshTokenExpiresAt,
      userAgent: args.userAgent,
      ipAddress: args.ipAddress,
    });

    return result;
  },
});

// Complete MFA login - verify MFA code and create session
export const completeMfaLogin = action({
  args: {
    userId: v.id("users"),
    mfaCode: v.string(),
    userAgent: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<SessionLoginResult> => {
    // Verify MFA code via mfa module
    const verification = await ctx.runMutation(internal.mfa.verifyMfaLogin, {
      userId: args.userId,
      code: args.mfaCode,
    });

    if (!verification.success) {
      throw new Error("Invalid MFA code");
    }

    // MFA verified - now create session
    // Generate tokens
    const token = crypto.randomUUID();
    const refreshToken = crypto.randomUUID();

    // Calculate expiration times
    const now = Date.now();
    const expiresAt = now + (24 * 60 * 60 * 1000); // 24 hours
    const refreshTokenExpiresAt = now + (30 * 24 * 60 * 60 * 1000); // 30 days

    // Create session and process login via internal mutation
    const result = await ctx.runMutation(internal.auth.createSessionAndProcessLogin, {
      userId: args.userId,
      token,
      refreshToken,
      expiresAt,
      refreshTokenExpiresAt,
      userAgent: args.userAgent,
      ipAddress: args.ipAddress,
    });

    return result;
  },
});

// Internal mutation to create session and process login
export const createSessionAndProcessLogin = internalMutation({
  args: {
    userId: v.id("users"),
    token: v.string(),
    refreshToken: v.string(),
    expiresAt: v.number(),
    refreshTokenExpiresAt: v.number(),
    userAgent: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<SessionLoginResult> => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    const now = Date.now();

    // Create session in database
    await ctx.db.insert("sessions", {
      userId: args.userId,
      token: args.token,
      refreshToken: args.refreshToken,
      expiresAt: args.expiresAt,
      refreshTokenExpiresAt: args.refreshTokenExpiresAt,
      userAgent: args.userAgent,
      ipAddress: args.ipAddress,
      createdAt: now,
      updatedAt: now,
    });

    // Update last login
    await ctx.db.patch(user._id, {
      lastLogin: now,
    });

    // Audit log the login
    await ctx.runMutation(internal.auditLog.log, {
      userId: user._id,
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`,
      action: "login",
      entityType: "user",
      entityId: user._id,
      entityName: user.email,
      metadata: JSON.stringify({
        sessionCreated: true,
        userAgent: args.userAgent,
        ipAddress: args.ipAddress,
      }),
    });

    // For SIL provider users, get their provider info
    let silProviderId: Id<"silProviders"> | undefined = user.silProviderId;
    let providerName: string | undefined = undefined;
    if (user.role === "sil_provider" && user.silProviderId) {
      const provider = await ctx.db.get(user.silProviderId);
      if (provider) {
        providerName = provider.companyName;
      }
    }

    // Return user info and tokens
    return {
      user: {
        _id: user._id,
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        silProviderId,
        providerName,
        isSuperAdmin: user.isSuperAdmin ?? false,
      },
      token: args.token,
      refreshToken: args.refreshToken,
      expiresAt: args.expiresAt,
    };
  },
});

// Validate session - check if token is valid and not expired
export const validateSession = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    // Look up session by token
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session) {
      return null; // Session not found
    }

    // Check if token is expired
    const now = Date.now();
    if (session.expiresAt < now) {
      return null; // Token expired
    }

    // Get user details
    const user = await ctx.db.get(session.userId);
    if (!user || !user.isActive) {
      return null; // User not found or inactive
    }

    // For SIL provider users, get their provider info
    let silProviderId: Id<"silProviders"> | undefined = user.silProviderId;
    let providerName: string | undefined = undefined;
    if (user.role === "sil_provider" && user.silProviderId) {
      const provider = await ctx.db.get(user.silProviderId);
      if (provider) {
        providerName = provider.companyName;
      }
    }

    // Return user info (session is valid)
    return {
      _id: user._id,
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      silProviderId,
      providerName,
      sessionExpiresAt: session.expiresAt,
    };
  },
});

// Refresh session - generate new tokens using refresh token
export const refreshSession = action({
  args: {
    refreshToken: v.string(),
  },
  handler: async (ctx, args): Promise<SessionLoginResult> => {
    // Look up session by refresh token via internal mutation
    const sessionData = await ctx.runMutation(internal.auth.getSessionByRefreshToken, {
      refreshToken: args.refreshToken,
    });

    if (!sessionData) {
      throw new Error("Invalid refresh token");
    }

    // Check if refresh token is expired
    const now = Date.now();
    if (sessionData.refreshTokenExpiresAt < now) {
      throw new Error("Refresh token expired. Please log in again.");
    }

    // Generate new tokens
    const newToken = crypto.randomUUID();
    const newRefreshToken = crypto.randomUUID();
    const newExpiresAt = now + (24 * 60 * 60 * 1000); // 24 hours
    const newRefreshTokenExpiresAt = now + (30 * 24 * 60 * 60 * 1000); // 30 days

    // Update session with new tokens
    const result = await ctx.runMutation(internal.auth.updateSessionTokens, {
      sessionId: sessionData.sessionId,
      userId: sessionData.userId,
      token: newToken,
      refreshToken: newRefreshToken,
      expiresAt: newExpiresAt,
      refreshTokenExpiresAt: newRefreshTokenExpiresAt,
    });

    return result;
  },
});

// Internal mutation to get session by refresh token
export const getSessionByRefreshToken = internalMutation({
  args: { refreshToken: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_refreshToken", (q) => q.eq("refreshToken", args.refreshToken))
      .first();

    if (!session) return null;

    return {
      sessionId: session._id,
      userId: session.userId,
      refreshTokenExpiresAt: session.refreshTokenExpiresAt,
    };
  },
});

// Internal mutation to update session tokens
export const updateSessionTokens = internalMutation({
  args: {
    sessionId: v.id("sessions"),
    userId: v.id("users"),
    token: v.string(),
    refreshToken: v.string(),
    expiresAt: v.number(),
    refreshTokenExpiresAt: v.number(),
  },
  handler: async (ctx, args): Promise<SessionLoginResult> => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    // Update session with new tokens
    await ctx.db.patch(args.sessionId, {
      token: args.token,
      refreshToken: args.refreshToken,
      expiresAt: args.expiresAt,
      refreshTokenExpiresAt: args.refreshTokenExpiresAt,
      updatedAt: Date.now(),
    });

    // For SIL provider users, get their provider info
    let silProviderId: Id<"silProviders"> | undefined = user.silProviderId;
    let providerName: string | undefined = undefined;
    if (user.role === "sil_provider" && user.silProviderId) {
      const provider = await ctx.db.get(user.silProviderId);
      if (provider) {
        providerName = provider.companyName;
      }
    }

    return {
      user: {
        _id: user._id,
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        silProviderId,
        providerName,
        isSuperAdmin: user.isSuperAdmin ?? false,
      },
      token: args.token,
      refreshToken: args.refreshToken,
      expiresAt: args.expiresAt,
    };
  },
});

// Logout with session - delete session from database
export const logoutWithSession = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    // Find session by token
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session) {
      return { success: true }; // Session already gone
    }

    // Get user for audit log
    const user = await ctx.db.get(session.userId);
    if (user) {
      // Audit log the logout
      await ctx.runMutation(internal.auditLog.log, {
        userId: user._id,
        userEmail: user.email,
        userName: `${user.firstName} ${user.lastName}`,
        action: "logout",
        entityType: "user",
        entityId: user._id,
        entityName: user.email,
        metadata: JSON.stringify({ sessionDeleted: true }),
      });
    }

    // Delete session from database
    await ctx.db.delete(session._id);

    return { success: true };
  },
});

// Accept Terms of Service
export const acceptTerms = mutation({
  args: {
    userId: v.id("users"),
    version: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    await ctx.db.patch(args.userId, {
      termsAcceptedAt: Date.now(),
      termsVersion: args.version,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});
