import { v } from "convex/values";
import { mutation, query, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { requirePermission, getUserFullName, requireTenant } from "./authHelpers";

// Create a new bank account
export const create = mutation({
  args: {
    userId: v.id("users"),
    accountName: v.string(),
    bankName: v.string(),
    bsb: v.string(),
    accountNumber: v.string(),
    accountType: v.union(v.literal("operating"), v.literal("trust")),
    openingBalance: v.optional(v.number()),
    openingBalanceDate: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Permission check - only admin/accountant can manage bank accounts
    const user = await requirePermission(ctx, args.userId, "payments", "create");
    const { organizationId } = await requireTenant(ctx, args.userId);
    const now = Date.now();

    const bankAccountId = await ctx.db.insert("bankAccounts", {
      organizationId,
      accountName: args.accountName,
      bankName: args.bankName,
      bsb: args.bsb,
      accountNumber: args.accountNumber,
      accountType: args.accountType,
      currency: "AUD",
      isActive: true,
      openingBalance: args.openingBalance,
      openingBalanceDate: args.openingBalanceDate,
      notes: args.notes,
      createdAt: now,
      updatedAt: now,
    });

    // Audit log
    await ctx.runMutation(internal.auditLog.log, {
      userId: args.userId,
      userEmail: user.email,
      userName: getUserFullName(user),
      action: "create",
      entityType: "bankAccount",
      entityId: bankAccountId,
      entityName: args.accountName,
    });

    return bankAccountId;
  },
});

// Get all bank accounts
export const getAll = query({
  args: {
    userId: v.id("users")
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const accounts = await ctx.db
      .query("bankAccounts")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    // Get transaction counts and latest balance for each account
    const accountsWithStats = await Promise.all(
      accounts.map(async (account) => {
        const transactions = await ctx.db
          .query("bankTransactions")
          .withIndex("by_bankAccount", (q) => q.eq("bankAccountId", account._id))
          .collect();

        const latestTransaction = transactions
          .filter((t) => t.balance !== undefined)
          .sort((a, b) => b.transactionDate.localeCompare(a.transactionDate))[0];

        const unmatchedCount = transactions.filter(
          (t) => t.matchStatus === "unmatched"
        ).length;

        return {
          ...account,
          transactionCount: transactions.length,
          unmatchedCount,
          currentBalance: latestTransaction?.balance ?? account.openingBalance ?? 0,
          latestTransactionDate: latestTransaction?.transactionDate,
        };
      })
    );

    return accountsWithStats;
  },
});

// Get a single bank account by ID
export const getById = query({
  args: {
    userId: v.id("users"),
    id: v.id("bankAccounts")
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const account = await ctx.db.get(args.id);
    if (!account) return null;
    if (account.organizationId !== organizationId) {
      throw new Error("Access denied: bank account belongs to different organization");
    }

    // Get transaction stats
    const transactions = await ctx.db
      .query("bankTransactions")
      .withIndex("by_bankAccount", (q) => q.eq("bankAccountId", args.id))
      .collect();

    const unmatchedCount = transactions.filter(
      (t) => t.matchStatus === "unmatched"
    ).length;
    const matchedCount = transactions.filter(
      (t) => t.matchStatus === "matched"
    ).length;

    // Get latest transaction for current balance
    const latestTransaction = transactions
      .filter((t) => t.balance !== undefined)
      .sort((a, b) => b.transactionDate.localeCompare(a.transactionDate))[0];

    // Calculate totals
    const totalCredits = transactions
      .filter((t) => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);
    const totalDebits = transactions
      .filter((t) => t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    return {
      ...account,
      stats: {
        transactionCount: transactions.length,
        unmatchedCount,
        matchedCount,
        totalCredits,
        totalDebits,
        currentBalance: latestTransaction?.balance ?? account.openingBalance ?? 0,
        latestTransactionDate: latestTransaction?.transactionDate,
      },
    };
  },
});

// Update a bank account
export const update = mutation({
  args: {
    userId: v.id("users"),
    id: v.id("bankAccounts"),
    accountName: v.optional(v.string()),
    bankName: v.optional(v.string()),
    bsb: v.optional(v.string()),
    accountNumber: v.optional(v.string()),
    accountType: v.optional(v.union(v.literal("operating"), v.literal("trust"))),
    openingBalance: v.optional(v.number()),
    openingBalanceDate: v.optional(v.string()),
    lastReconciledDate: v.optional(v.string()),
    lastReconciledBalance: v.optional(v.number()),
    notes: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Permission check
    const user = await requirePermission(ctx, args.userId, "payments", "update");
    const { organizationId } = await requireTenant(ctx, args.userId);
    const { id, userId, ...updates } = args;

    const existing = await ctx.db.get(id);
    if (!existing) {
      throw new Error("Bank account not found");
    }
    if (existing.organizationId !== organizationId) {
      throw new Error("Access denied: bank account belongs to different organization");
    }

    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, value]) => value !== undefined)
    );

    await ctx.db.patch(id, {
      ...filteredUpdates,
      updatedAt: Date.now(),
    });

    return id;
  },
});

// Soft delete (deactivate) a bank account
export const remove = mutation({
  args: {
    userId: v.id("users"),
    id: v.id("bankAccounts"),
  },
  handler: async (ctx, args) => {
    // Permission check - only admin can delete
    const user = await requirePermission(ctx, args.userId, "payments", "delete");
    const { organizationId } = await requireTenant(ctx, args.userId);

    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error("Bank account not found");
    }
    if (existing.organizationId !== organizationId) {
      throw new Error("Access denied: bank account belongs to different organization");
    }

    // Check if there are unreconciled transactions
    const unreconciledTransactions = await ctx.db
      .query("bankTransactions")
      .withIndex("by_bankAccount", (q) => q.eq("bankAccountId", args.id))
      .filter((q) => q.eq(q.field("matchStatus"), "unmatched"))
      .first();

    if (unreconciledTransactions) {
      throw new Error(
        "Cannot delete account with unmatched transactions. Please reconcile all transactions first."
      );
    }

    await ctx.db.patch(args.id, {
      isActive: false,
      updatedAt: Date.now(),
    });

    return args.id;
  },
});

// Mark account as reconciled
export const markReconciled = mutation({
  args: {
    userId: v.id("users"),
    id: v.id("bankAccounts"),
    reconciledDate: v.string(),
    reconciledBalance: v.number(),
  },
  handler: async (ctx, args) => {
    // Permission check
    const user = await requirePermission(ctx, args.userId, "payments", "update");
    await ctx.db.patch(args.id, {
      lastReconciledDate: args.reconciledDate,
      lastReconciledBalance: args.reconciledBalance,
      updatedAt: Date.now(),
    });

    return args.id;
  },
});

// Get accounts by type
export const getByType = query({
  args: {
    userId: v.id("users"),
    accountType: v.union(v.literal("operating"), v.literal("trust")),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    return await ctx.db
      .query("bankAccounts")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
      .filter((q) => q.and(
        q.eq(q.field("isActive"), true),
        q.eq(q.field("accountType"), args.accountType)
      ))
      .collect();
  },
});

// Internal query for Xero sync (no auth required - used by actions)
export const getAllInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("bankAccounts")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});

// Get summary stats for all accounts
export const getSummary = query({
  args: {
    userId: v.id("users")
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const accounts = await ctx.db
      .query("bankAccounts")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    let totalBalance = 0;
    let totalUnmatched = 0;

    for (const account of accounts) {
      // Get latest balance
      const latestTransaction = await ctx.db
        .query("bankTransactions")
        .withIndex("by_bankAccount", (q) => q.eq("bankAccountId", account._id))
        .order("desc")
        .first();

      totalBalance += latestTransaction?.balance ?? account.openingBalance ?? 0;

      // Count unmatched
      const unmatched = await ctx.db
        .query("bankTransactions")
        .withIndex("by_bankAccount", (q) => q.eq("bankAccountId", account._id))
        .filter((q) => q.eq(q.field("matchStatus"), "unmatched"))
        .collect();

      totalUnmatched += unmatched.length;
    }

    return {
      accountCount: accounts.length,
      totalBalance,
      totalUnmatched,
      operatingAccounts: accounts.filter((a) => a.accountType === "operating").length,
      trustAccounts: accounts.filter((a) => a.accountType === "trust").length,
    };
  },
});
