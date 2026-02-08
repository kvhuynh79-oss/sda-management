import { mutation, query, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { requirePermission, getUserFullName, requireTenant } from "./authHelpers";
import { encryptField, decryptField, isEncrypted } from "./lib/encryption";

// Decrypt sensitive owner fields (handles both encrypted and plaintext for migration)
async function decryptOwnerFields<T extends Record<string, any>>(o: T): Promise<T> {
  const bankAccountNumber = await decryptField(o.bankAccountNumber);
  return {
    ...o,
    bankAccountNumber: bankAccountNumber ?? o.bankAccountNumber,
  };
}

// Create a new owner
export const create = mutation({
  args: {
    userId: v.id("users"),
    ownerType: v.union(
      v.literal("individual"),
      v.literal("company"),
      v.literal("trust"),
      v.literal("self")
    ),
    companyName: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    email: v.string(),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    state: v.optional(v.string()),
    abn: v.optional(v.string()),
    bankBsb: v.optional(v.string()),
    bankAccountNumber: v.optional(v.string()),
    bankAccountName: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Permission check - requires property create permission (admin/property_manager)
    const user = await requirePermission(ctx, args.userId, "properties", "create");
    const { organizationId } = await requireTenant(ctx, args.userId);
    const { userId, ...ownerData } = args;
    const now = Date.now();

    // Encrypt sensitive fields
    const encBankAccountNumber = await encryptField(ownerData.bankAccountNumber);

    const ownerId = await ctx.db.insert("owners", {
      ...ownerData,
      organizationId,
      bankAccountNumber: encBankAccountNumber ?? ownerData.bankAccountNumber,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    // Audit log
    await ctx.runMutation(internal.auditLog.log, {
      userId: args.userId,
      userEmail: user.email,
      userName: getUserFullName(user),
      action: "create",
      entityType: "owner",
      entityId: ownerId,
      entityName: args.companyName || `${args.firstName} ${args.lastName}`,
    });

    return ownerId;
  },
});

// Get all owners
export const getAll = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const owners = await ctx.db
      .query("owners")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
    return Promise.all(owners.map(decryptOwnerFields));
  },
});

// Get owner by ID
export const getById = query({
  args: { ownerId: v.id("owners"), userId: v.id("users") },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const owner = await ctx.db.get(args.ownerId);
    if (!owner) return null;

    // Verify org ownership
    if (owner.organizationId !== organizationId) {
      throw new Error("Access denied: Owner belongs to different organization");
    }

    return decryptOwnerFields(owner);
  },
});

// Update owner
export const update = mutation({
  args: {
    userId: v.id("users"),
    ownerId: v.id("owners"),
    ownerType: v.optional(v.union(
      v.literal("individual"),
      v.literal("company"),
      v.literal("trust"),
      v.literal("self")
    )),
    companyName: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    state: v.optional(v.string()),
    abn: v.optional(v.string()),
    bankBsb: v.optional(v.string()),
    bankAccountNumber: v.optional(v.string()),
    bankAccountName: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Permission check
    await requirePermission(ctx, args.userId, "properties", "update");
    const { organizationId } = await requireTenant(ctx, args.userId);
    const { ownerId, userId, ...updates } = args;

    // Verify org ownership
    const owner = await ctx.db.get(ownerId);
    if (!owner) {
      throw new Error("Owner not found");
    }
    if (owner.organizationId !== organizationId) {
      throw new Error("Access denied: Owner belongs to different organization");
    }

    const filteredUpdates: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filteredUpdates[key] = value;
      }
    }

    // Encrypt sensitive fields if being updated
    if (filteredUpdates.bankAccountNumber !== undefined) {
      const plain = filteredUpdates.bankAccountNumber as string;
      filteredUpdates.bankAccountNumber = await encryptField(plain) ?? plain;
    }

    await ctx.db.patch(ownerId, filteredUpdates);
    return { success: true };
  },
});

// Delete (soft delete) owner
export const remove = mutation({
  args: {
    userId: v.id("users"),
    ownerId: v.id("owners"),
  },
  handler: async (ctx, args) => {
    // Permission check - only admin can delete
    await requirePermission(ctx, args.userId, "properties", "delete");
    const { organizationId } = await requireTenant(ctx, args.userId);

    // Verify org ownership
    const owner = await ctx.db.get(args.ownerId);
    if (!owner) {
      throw new Error("Owner not found");
    }
    if (owner.organizationId !== organizationId) {
      throw new Error("Access denied: Owner belongs to different organization");
    }

    await ctx.db.patch(args.ownerId, {
      isActive: false,
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});

// Internal raw query for migration (no decryption - returns data as-is)
export const getAllRaw = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("owners").collect();
  },
});
