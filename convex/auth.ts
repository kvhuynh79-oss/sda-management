import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// Simple hash function for password (demo purposes - use proper hashing in production)
function hashPassword(password: string): string {
  // Use a simple but Convex-compatible hash
  let hash = 0;
  const str = password + "_sda_salt_2025";
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(36) + str.length.toString(36);
}

// Create a new user (for initial setup or admin creating users)
export const createUser = mutation({
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
  handler: async (ctx, args) => {
    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();

    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    // Simple hash for demo - in production use proper bcrypt on server
    const passwordHash = hashPassword(args.password);

    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      email: args.email.toLowerCase(),
      passwordHash,
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

// Login function
export const login = mutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();

    if (!user) {
      throw new Error("Invalid email or password");
    }

    if (!user.isActive) {
      throw new Error("Account is disabled. Contact your administrator.");
    }

    // Verify password
    const passwordHash = hashPassword(args.password);
    if (user.passwordHash !== passwordHash) {
      throw new Error("Invalid email or password");
    }

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
    let silProviderId = user.silProviderId;
    let providerName = undefined;
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
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
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
        v.literal("accountant")
      )
    ),
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

// Change password
export const changePassword = mutation({
  args: {
    userId: v.id("users"),
    currentPassword: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Verify current password
    const currentHash = hashPassword(args.currentPassword);
    if (user.passwordHash !== currentHash) {
      throw new Error("Current password is incorrect");
    }

    // Update password
    const newHash = hashPassword(args.newPassword);
    await ctx.db.patch(args.userId, {
      passwordHash: newHash,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Reset password (admin function)
export const resetPassword = mutation({
  args: {
    userId: v.id("users"),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    const newHash = hashPassword(args.newPassword);
    await ctx.db.patch(args.userId, {
      passwordHash: newHash,
      updatedAt: Date.now(),
    });

    return { success: true };
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
