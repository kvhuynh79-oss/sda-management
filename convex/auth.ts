import { mutation, query, action, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import bcrypt from "bcryptjs";

// Secure password hashing using bcryptjs
const SALT_ROUNDS = 12;

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Create a new user (for initial setup or admin creating users)
export const createUser = action({
  args: {
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
    // Hash password with bcrypt (secure)
    const passwordHash = await hashPassword(args.password);

    // Call internal mutation to create the user
    const userId: Id<"users"> = await ctx.runMutation(internal.auth.createUserInternal, {
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

// Internal mutation for creating user (called from action)
export const createUserInternal = internalMutation({
  args: {
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

    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      email: args.email.toLowerCase(),
      passwordHash: args.passwordHash,
      firstName: args.firstName,
      lastName: args.lastName,
      role: args.role,
      phone: args.phone,
      silProviderId: args.silProviderId,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

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
      throw new Error("Invalid email or password");
    }

    if (!userData.isActive) {
      throw new Error("Account is disabled. Contact your administrator.");
    }

    // Verify password with bcrypt
    const isValid = await verifyPassword(args.password, userData.passwordHash);
    if (!isValid) {
      throw new Error("Invalid email or password");
    }

    // Update last login and log via internal mutation
    const result: LoginResult = await ctx.runMutation(internal.auth.processLogin, {
      userId: userData._id,
    });

    return result;
  },
});

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
    };
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
export const getUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;
    
    // Return user without password hash
    return {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      phone: user.phone,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
    };
  },
});

// Get all users (admin only in UI)
export const getAllUsers = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();

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

// Update user
export const updateUser = mutation({
  args: {
    userId: v.id("users"),
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
    const { userId, ...updates } = args;
    
    const filteredUpdates: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filteredUpdates[key] = value;
      }
    }

    await ctx.db.patch(userId, filteredUpdates);
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
export const resetPassword = action({
  args: {
    userId: v.id("users"),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    // Hash new password with bcrypt
    const newHash = await hashPassword(args.newPassword);

    // Update via internal mutation
    await ctx.runMutation(internal.auth.updatePasswordHash, {
      userId: args.userId,
      passwordHash: newHash,
    });

    return { success: true };
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
    await ctx.db.patch(args.userId, {
      passwordHash: args.passwordHash,
      updatedAt: Date.now(),
    });
  },
});

// Update user email (for testing)
export const updateUserEmail = mutation({
  args: {
    userId: v.id("users"),
    newEmail: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      email: args.newEmail.toLowerCase(),
      updatedAt: Date.now(),
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
