import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { requireTenant, requireAdmin } from "./authHelpers";

/**
 * API Keys Module - Sprint 7 REST API Key Management
 *
 * Provides CRUD operations for managing API keys per organization.
 * Keys are hashed with SHA-256 before storage; the plaintext key
 * is returned only once at creation time.
 *
 * Key format: msd_live_<32 hex chars> (44 chars total)
 */

// ============================================================================
// Available API Permissions
// ============================================================================

export const AVAILABLE_PERMISSIONS = [
  "read:properties",
  "write:properties",
  "read:participants",
  "write:participants",
  "read:maintenance",
  "write:maintenance",
  "read:incidents",
  "write:incidents",
  "read:communications",
  "write:communications",
] as const;

// ============================================================================
// Hash Helper
// ============================================================================

/**
 * SHA-256 hash a string using the Web Crypto API (available in Convex runtime).
 */
async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * List all API keys for the current organization.
 * Returns keys with masked values (keyPrefix only) - never the full key hash.
 */
export const getByOrganization = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);

    const keys = await ctx.db
      .query("apiKeys")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", organizationId)
      )
      .order("desc")
      .collect();

    // Never return the key hash - only safe display fields
    return keys.map((k) => ({
      _id: k._id,
      name: k.name,
      keyPrefix: k.keyPrefix,
      permissions: k.permissions,
      rateLimit: k.rateLimit,
      isActive: k.isActive,
      lastUsedAt: k.lastUsedAt,
      expiresAt: k.expiresAt,
      createdBy: k.createdBy,
      createdAt: k.createdAt,
    }));
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a new API key.
 * Generates a random key, stores the SHA-256 hash, and returns the
 * plaintext key exactly ONCE. The caller must copy it immediately.
 */
export const create = mutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    permissions: v.array(v.string()),
    rateLimit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    // Only admins can create API keys
    await requireAdmin(ctx, args.userId);

    // Validate permissions
    for (const perm of args.permissions) {
      if (!(AVAILABLE_PERMISSIONS as readonly string[]).includes(perm)) {
        throw new Error(`Invalid permission: ${perm}`);
      }
    }
    if (args.permissions.length === 0) {
      throw new Error("At least one permission must be selected");
    }

    // Generate a cryptographically random key
    // Format: msd_live_<32 random hex chars>
    const randomBytes = new Uint8Array(16);
    crypto.getRandomValues(randomBytes);
    const hexString = Array.from(randomBytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const fullKey = `msd_live_${hexString}`;

    // Store the first 12 chars as a human-readable prefix for display
    const keyPrefix = fullKey.substring(0, 12);

    // Hash the key with SHA-256 for storage (never store plaintext)
    const keyHash = await sha256(fullKey);

    const rateLimit = args.rateLimit ?? 100;

    const keyId = await ctx.db.insert("apiKeys", {
      organizationId,
      key: keyHash,
      keyPrefix,
      name: args.name,
      permissions: args.permissions,
      isActive: true,
      rateLimit,
      createdBy: args.userId,
      createdAt: Date.now(),
    });

    // Return the full key once - this is the only time it will be visible
    return { keyId, fullKey, keyPrefix };
  },
});

/**
 * Revoke (deactivate) an API key.
 * The key can no longer be used for API access after revocation.
 */
export const revoke = mutation({
  args: {
    userId: v.id("users"),
    keyId: v.id("apiKeys"),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    // Only admins can revoke API keys
    await requireAdmin(ctx, args.userId);

    const key = await ctx.db.get(args.keyId);
    if (!key) {
      throw new Error("API key not found");
    }

    // Ensure the key belongs to this organization
    if (key.organizationId !== organizationId) {
      throw new Error("API key not found");
    }

    if (!key.isActive) {
      throw new Error("API key is already revoked");
    }

    await ctx.db.patch(args.keyId, {
      isActive: false,
    });

    return { success: true };
  },
});

/**
 * Update lastUsedAt timestamp on an API key.
 * Called internally from API route handlers after successful authentication.
 */
export const updateLastUsed = internalMutation({
  args: {
    keyId: v.id("apiKeys"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.keyId, {
      lastUsedAt: Date.now(),
    });
  },
});

/**
 * Validate an API key from a raw key string.
 *
 * This is a regular mutation (not internal) because it is called from
 * Next.js API routes via ConvexHttpClient. The raw API key itself serves
 * as the authentication credential - no userId is needed.
 *
 * Hashes the incoming key, looks it up in the DB, checks active status
 * and expiration. Updates lastUsedAt on success.
 *
 * Returns { valid: true, organizationId, permissions, keyId } on success,
 * or { valid: false } on failure.
 */
export const validateApiKey = mutation({
  args: {
    key: v.string(),
  },
  handler: async (
    ctx,
    args
  ): Promise<
    | {
        valid: true;
        organizationId: string;
        permissions: string[];
        keyId: string;
        createdBy: string;
        subscriptionStatus: string;
        accessLevel: string;
      }
    | { valid: false }
  > => {
    // Hash the incoming key to match stored hash
    const keyHash = await sha256(args.key);

    // Look up by hash
    const apiKey = await ctx.db
      .query("apiKeys")
      .withIndex("by_key", (q) => q.eq("key", keyHash))
      .first();

    if (!apiKey) {
      return { valid: false };
    }

    // Check if key is active
    if (!apiKey.isActive) {
      return { valid: false };
    }

    // Check expiration
    if (apiKey.expiresAt && apiKey.expiresAt < Date.now()) {
      return { valid: false };
    }

    // Update lastUsedAt timestamp
    await ctx.db.patch(apiKey._id, {
      lastUsedAt: Date.now(),
    });

    // B7 FIX: Include subscription status for API access level checks
    const org = await ctx.db.get(apiKey.organizationId);
    const subscriptionStatus = org?.subscriptionStatus ?? "active";
    const accessLevel = org?.accessLevel ?? "full";

    return {
      valid: true,
      organizationId: apiKey.organizationId as string,
      permissions: apiKey.permissions,
      keyId: apiKey._id as string,
      createdBy: apiKey.createdBy as string,
      subscriptionStatus,
      accessLevel,
    };
  },
});
