import { v } from "convex/values";
import { mutation, query, action, internalMutation, internalAction, internalQuery } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// ============================================
// QUERIES
// ============================================

// Get the current Xero connection status
export const getConnection = query({
  args: {},
  handler: async (ctx) => {
    const connection = await ctx.db.query("xeroConnections").first();
    if (!connection) {
      return null;
    }
    // Don't expose tokens to frontend
    return {
      _id: connection._id,
      tenantId: connection.tenantId,
      tenantName: connection.tenantName,
      connectionStatus: connection.connectionStatus,
      lastSyncAt: connection.lastSyncAt,
      lastSyncError: connection.lastSyncError,
      autoSyncEnabled: connection.autoSyncEnabled,
      syncFrequencyMinutes: connection.syncFrequencyMinutes,
      createdAt: connection.createdAt,
      updatedAt: connection.updatedAt,
    };
  },
});

// Get all Xero connections (for future multi-tenant support)
export const getAllConnections = query({
  args: {},
  handler: async (ctx) => {
    const connections = await ctx.db.query("xeroConnections").collect();
    return connections.map((c) => ({
      _id: c._id,
      tenantId: c.tenantId,
      tenantName: c.tenantName,
      connectionStatus: c.connectionStatus,
      lastSyncAt: c.lastSyncAt,
      lastSyncError: c.lastSyncError,
      autoSyncEnabled: c.autoSyncEnabled,
      createdAt: c.createdAt,
    }));
  },
});

// Get bank accounts linked through Xero
export const getXeroBankAccounts = query({
  args: {},
  handler: async (ctx) => {
    // Get bank accounts that have been synced from Xero
    const accounts = await ctx.db
      .query("bankAccounts")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
    return accounts;
  },
});

// ============================================
// MUTATIONS
// ============================================

// Save Xero OAuth tokens after successful authorization
export const saveConnection = mutation({
  args: {
    tenantId: v.string(),
    tenantName: v.string(),
    accessToken: v.string(),
    refreshToken: v.string(),
    expiresIn: v.number(), // seconds until expiry
    scope: v.optional(v.string()),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const tokenExpiresAt = now + args.expiresIn * 1000;

    // Check if connection already exists for this tenant
    const existing = await ctx.db
      .query("xeroConnections")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .first();

    if (existing) {
      // Update existing connection
      await ctx.db.patch(existing._id, {
        accessToken: args.accessToken,
        refreshToken: args.refreshToken,
        tokenExpiresAt,
        scope: args.scope,
        connectionStatus: "connected",
        lastSyncError: undefined,
        updatedAt: now,
      });
      return existing._id;
    }

    // Create new connection
    const connectionId = await ctx.db.insert("xeroConnections", {
      tenantId: args.tenantId,
      tenantName: args.tenantName,
      accessToken: args.accessToken,
      refreshToken: args.refreshToken,
      tokenExpiresAt,
      scope: args.scope,
      connectionStatus: "connected",
      autoSyncEnabled: false,
      createdBy: args.userId,
      createdAt: now,
      updatedAt: now,
    });

    return connectionId;
  },
});

// Update connection status
export const updateConnectionStatus = mutation({
  args: {
    connectionId: v.id("xeroConnections"),
    status: v.union(
      v.literal("connected"),
      v.literal("disconnected"),
      v.literal("error"),
      v.literal("token_expired")
    ),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.connectionId, {
      connectionStatus: args.status,
      lastSyncError: args.error,
      updatedAt: Date.now(),
    });
  },
});

// Update sync settings
export const updateSyncSettings = mutation({
  args: {
    connectionId: v.id("xeroConnections"),
    autoSyncEnabled: v.optional(v.boolean()),
    syncFrequencyMinutes: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.autoSyncEnabled !== undefined) {
      updates.autoSyncEnabled = args.autoSyncEnabled;
    }
    if (args.syncFrequencyMinutes !== undefined) {
      updates.syncFrequencyMinutes = args.syncFrequencyMinutes;
    }
    await ctx.db.patch(args.connectionId, updates);
  },
});

// Disconnect from Xero
export const disconnect = mutation({
  args: {
    connectionId: v.id("xeroConnections"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.connectionId, {
      connectionStatus: "disconnected",
      accessToken: "",
      refreshToken: "",
      updatedAt: Date.now(),
    });
  },
});

// Delete Xero connection entirely
export const deleteConnection = mutation({
  args: {
    connectionId: v.id("xeroConnections"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.connectionId);
  },
});

// Internal mutation to update tokens after refresh
export const updateTokensInternal = internalMutation({
  args: {
    connectionId: v.id("xeroConnections"),
    accessToken: v.string(),
    refreshToken: v.string(),
    expiresIn: v.number(),
  },
  handler: async (ctx, args) => {
    const tokenExpiresAt = Date.now() + args.expiresIn * 1000;
    await ctx.db.patch(args.connectionId, {
      accessToken: args.accessToken,
      refreshToken: args.refreshToken,
      tokenExpiresAt,
      connectionStatus: "connected",
      updatedAt: Date.now(),
    });
  },
});

// Internal mutation to update sync timestamp
export const updateLastSync = internalMutation({
  args: {
    connectionId: v.id("xeroConnections"),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const updates: Record<string, unknown> = {
      lastSyncAt: Date.now(),
      updatedAt: Date.now(),
    };
    if (args.error) {
      updates.lastSyncError = args.error;
      updates.connectionStatus = "error";
    } else {
      updates.lastSyncError = undefined;
      updates.connectionStatus = "connected";
    }
    await ctx.db.patch(args.connectionId, updates);
  },
});

// Internal mutation to save bank transactions from Xero
export const saveBankTransactionsInternal = internalMutation({
  args: {
    bankAccountId: v.id("bankAccounts"),
    transactions: v.array(
      v.object({
        transactionDate: v.string(),
        description: v.string(),
        reference: v.optional(v.string()),
        amount: v.number(),
        balance: v.optional(v.number()),
        xeroTransactionId: v.string(),
      })
    ),
    importBatchId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    let imported = 0;
    let skipped = 0;

    for (const tx of args.transactions) {
      // Check if transaction already exists (by xeroTransactionId)
      const existing = await ctx.db
        .query("bankTransactions")
        .filter((q) =>
          q.and(
            q.eq(q.field("bankAccountId"), args.bankAccountId),
            q.eq(q.field("xeroTransactionId"), tx.xeroTransactionId)
          )
        )
        .first();

      if (existing) {
        skipped++;
        continue;
      }

      // Insert new transaction
      await ctx.db.insert("bankTransactions", {
        bankAccountId: args.bankAccountId,
        transactionDate: tx.transactionDate,
        description: tx.description,
        reference: tx.reference,
        amount: tx.amount,
        balance: tx.balance,
        transactionType: tx.amount >= 0 ? "credit" : "debit",
        category: "uncategorized",
        matchStatus: "unmatched",
        importSource: "xero_sync",
        importBatchId: args.importBatchId,
        xeroTransactionId: tx.xeroTransactionId,
        xeroSyncStatus: "synced",
        createdAt: now,
        updatedAt: now,
      });
      imported++;
    }

    return { imported, skipped };
  },
});

// Internal mutation to create/update bank account from Xero
export const upsertBankAccountInternal = internalMutation({
  args: {
    xeroAccountId: v.string(),
    accountName: v.string(),
    bankName: v.string(),
    bsb: v.string(),
    accountNumber: v.string(),
    accountType: v.union(v.literal("operating"), v.literal("trust")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if bank account exists (by account number)
    const existing = await ctx.db
      .query("bankAccounts")
      .filter((q) =>
        q.and(
          q.eq(q.field("bsb"), args.bsb),
          q.eq(q.field("accountNumber"), args.accountNumber)
        )
      )
      .first();

    if (existing) {
      // Update existing
      await ctx.db.patch(existing._id, {
        accountName: args.accountName,
        bankName: args.bankName,
        updatedAt: now,
      });
      return existing._id;
    }

    // Create new
    const accountId = await ctx.db.insert("bankAccounts", {
      accountName: args.accountName,
      bankName: args.bankName,
      bsb: args.bsb,
      accountNumber: args.accountNumber,
      accountType: args.accountType,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    return accountId;
  },
});

// ============================================
// ACTIONS (for external API calls)
// ============================================

// Type for sync result
type SyncResult = {
  success: boolean;
  imported: number;
  skipped: number;
  total: number;
  fromDate: string;
  toDate: string;
};

// Type for Xero bank account
type XeroBankAccount = {
  xeroAccountId: string;
  name: string;
  code: string;
  bankAccountNumber: string;
  bankAccountType: string;
  currencyCode: string;
};

// Action to sync bank transactions from Xero
export const syncBankTransactions = action({
  args: {
    bankAccountId: v.id("bankAccounts"),
    xeroAccountId: v.string(),
    fromDate: v.optional(v.string()),
    toDate: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<SyncResult> => {
    // Get the Xero connection
    const connection = await ctx.runQuery(internal.xero.getConnectionInternal);
    if (!connection) {
      throw new Error("No Xero connection found");
    }

    if (connection.connectionStatus !== "connected") {
      throw new Error(`Xero connection status: ${connection.connectionStatus}`);
    }

    // Check if token needs refresh
    if (Date.now() >= connection.tokenExpiresAt - 60000) {
      // Token expires in less than 1 minute, refresh it
      await ctx.runAction(internal.xero.refreshAccessToken, {
        connectionId: connection._id,
      });
    }

    // Get fresh connection after potential token refresh
    const freshConnection = await ctx.runQuery(internal.xero.getConnectionInternal);
    if (!freshConnection) {
      throw new Error("Connection lost after token refresh");
    }

    // Default date range: last 30 days
    const now = new Date();
    const defaultFromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const fromDate = args.fromDate || defaultFromDate.toISOString().split("T")[0];
    const toDate = args.toDate || now.toISOString().split("T")[0];

    // Fetch transactions from Xero Bank Transactions API
    const xeroApiUrl = `https://api.xero.com/api.xro/2.0/BankTransactions`;
    const params = new URLSearchParams({
      where: `BankAccount.AccountID=guid("${args.xeroAccountId}") && Date>=DateTime(${fromDate.replace(/-/g, ",")}) && Date<=DateTime(${toDate.replace(/-/g, ",")})`,
    });

    const response: Response = await fetch(`${xeroApiUrl}?${params}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${freshConnection.accessToken}`,
        "Xero-Tenant-Id": freshConnection.tenantId,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      await ctx.runMutation(internal.xero.updateLastSync, {
        connectionId: freshConnection._id,
        error: `Xero API error: ${response.status} - ${errorText}`,
      });
      throw new Error(`Xero API error: ${response.status} - ${errorText}`);
    }

    const data: { BankTransactions?: Array<Record<string, unknown>> } = await response.json();
    const bankTransactions = data.BankTransactions || [];

    // Transform Xero transactions to our format
    const transactions: Array<{
      transactionDate: string;
      description: string;
      reference: string | undefined;
      amount: number;
      balance: undefined;
      xeroTransactionId: string;
    }> = bankTransactions.map((tx: Record<string, unknown>) => ({
      transactionDate: tx.Date ? String(tx.Date).split("T")[0] : "",
      description: String((tx.Contact as Record<string, unknown>)?.Name || tx.Reference || (tx.LineItems as Array<Record<string, unknown>>)?.[0]?.Description || "Unknown"),
      reference: tx.Reference as string | undefined,
      amount: tx.Type === "RECEIVE" ? Math.abs(Number(tx.Total)) : -Math.abs(Number(tx.Total)),
      balance: undefined, // Xero doesn't provide running balance in this endpoint
      xeroTransactionId: String(tx.BankTransactionID),
    }));

    // Save transactions
    const importBatchId = `xero_${Date.now()}`;
    const result: { imported: number; skipped: number } = await ctx.runMutation(internal.xero.saveBankTransactionsInternal, {
      bankAccountId: args.bankAccountId,
      transactions,
      importBatchId,
    });

    // Update sync timestamp
    await ctx.runMutation(internal.xero.updateLastSync, {
      connectionId: freshConnection._id,
    });

    return {
      success: true,
      imported: result.imported,
      skipped: result.skipped,
      total: transactions.length,
      fromDate,
      toDate,
    };
  },
});

// Action to refresh the Xero access token
export const refreshAccessToken = internalAction({
  args: {
    connectionId: v.id("xeroConnections"),
  },
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    const connection = await ctx.runQuery(internal.xero.getConnectionInternal);
    if (!connection || connection._id !== args.connectionId) {
      throw new Error("Connection not found");
    }

    const clientId = process.env.XERO_CLIENT_ID;
    const clientSecret = process.env.XERO_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error("Xero credentials not configured");
    }

    const response: Response = await fetch("https://identity.xero.com/connect/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: connection.refreshToken,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      await ctx.runMutation(internal.xero.updateLastSync, {
        connectionId: args.connectionId,
        error: `Token refresh failed: ${response.status} - ${errorText}`,
      });
      throw new Error(`Token refresh failed: ${response.status}`);
    }

    const data: { access_token: string; refresh_token: string; expires_in: number } = await response.json();

    await ctx.runMutation(internal.xero.updateTokensInternal, {
      connectionId: args.connectionId,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
    });

    return { success: true };
  },
});

// Action to fetch Xero bank accounts
export const fetchXeroBankAccounts = action({
  args: {},
  handler: async (ctx): Promise<XeroBankAccount[]> => {
    const connection = await ctx.runQuery(internal.xero.getConnectionInternal);
    if (!connection) {
      throw new Error("No Xero connection found");
    }

    if (connection.connectionStatus !== "connected") {
      throw new Error(`Xero connection status: ${connection.connectionStatus}`);
    }

    // Check if token needs refresh
    if (Date.now() >= connection.tokenExpiresAt - 60000) {
      await ctx.runAction(internal.xero.refreshAccessToken, {
        connectionId: connection._id,
      });
    }

    const freshConnection = await ctx.runQuery(internal.xero.getConnectionInternal);
    if (!freshConnection) {
      throw new Error("Connection lost after token refresh");
    }

    // Fetch bank accounts from Xero
    const response: Response = await fetch(
      "https://api.xero.com/api.xro/2.0/Accounts?where=Type==\"BANK\"",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${freshConnection.accessToken}`,
          "Xero-Tenant-Id": freshConnection.tenantId,
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Xero API error: ${response.status} - ${errorText}`);
    }

    const data: { Accounts?: Array<Record<string, unknown>> } = await response.json();
    const accounts = data.Accounts || [];

    return accounts.map((acc: Record<string, unknown>): XeroBankAccount => ({
      xeroAccountId: String(acc.AccountID || ""),
      name: String(acc.Name || ""),
      code: String(acc.Code || ""),
      bankAccountNumber: String(acc.BankAccountNumber || ""),
      bankAccountType: String(acc.BankAccountType || ""),
      currencyCode: String(acc.CurrencyCode || ""),
    }));
  },
});

// Internal query to get connection with tokens (not exposed to frontend)
export const getConnectionInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("xeroConnections").first();
  },
});

// Type for sync all result
type SyncAllResult = {
  success: boolean;
  error?: string;
  results?: Array<{
    accountId: Id<"bankAccounts">;
    accountName: string;
    status: string;
    message: string;
  }>;
};

// Action to manually trigger sync for all linked bank accounts
export const syncAllBankAccounts = action({
  args: {},
  handler: async (ctx): Promise<SyncAllResult> => {
    const connection = await ctx.runQuery(internal.xero.getConnectionInternal);
    if (!connection || connection.connectionStatus !== "connected") {
      return { success: false, error: "Xero not connected" };
    }

    // Get all bank accounts
    const bankAccounts: Array<{
      _id: Id<"bankAccounts">;
      accountName: string;
      bankName: string;
      bsb: string;
      accountNumber: string;
      accountType: "operating" | "trust";
      isActive: boolean;
    }> = await ctx.runQuery(api.bankAccounts.getAll);

    const results: Array<{
      accountId: Id<"bankAccounts">;
      accountName: string;
      status: string;
      message: string;
    }> = [];
    for (const account of bankAccounts) {
      // For now, we'd need to store xeroAccountId mapping
      // This is a simplified version - in production you'd map accounts
      results.push({
        accountId: account._id,
        accountName: account.accountName,
        status: "skipped",
        message: "Xero account mapping not configured",
      });
    }

    return { success: true, results };
  },
});
