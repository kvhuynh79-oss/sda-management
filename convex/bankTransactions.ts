import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// CSV Row type for imports
interface ANZRow {
  Date: string;
  Amount: string;
  Description: string;
  Balance?: string;
}

interface WestpacRow {
  Date: string;
  Narration: string;
  Debit?: string;
  Credit?: string;
  Balance?: string;
}

// Import bank transactions from CSV data
export const importCSV = mutation({
  args: {
    bankAccountId: v.id("bankAccounts"),
    bankFormat: v.union(v.literal("anz"), v.literal("westpac")),
    transactions: v.array(
      v.object({
        date: v.string(),
        description: v.string(),
        amount: v.number(),
        reference: v.optional(v.string()),
        balance: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const importBatchId = `import_${now}`;
    let imported = 0;
    let duplicates = 0;

    // Get existing transactions for this account to check for duplicates
    const existingTransactions = await ctx.db
      .query("bankTransactions")
      .withIndex("by_bankAccount", (q) => q.eq("bankAccountId", args.bankAccountId))
      .collect();

    for (const tx of args.transactions) {
      // Check for duplicates (same date, amount, description)
      const isDuplicate = existingTransactions.some(
        (existing) =>
          existing.transactionDate === tx.date &&
          existing.amount === tx.amount &&
          existing.description === tx.description
      );

      if (isDuplicate) {
        duplicates++;
        continue;
      }

      await ctx.db.insert("bankTransactions", {
        bankAccountId: args.bankAccountId,
        transactionDate: tx.date,
        description: tx.description,
        reference: tx.reference,
        amount: tx.amount,
        balance: tx.balance,
        transactionType: tx.amount >= 0 ? "credit" : "debit",
        matchStatus: "unmatched",
        importSource: args.bankFormat === "anz" ? "csv_anz" : "csv_westpac",
        importBatchId,
        createdAt: now,
        updatedAt: now,
      });

      imported++;
    }

    return {
      success: true,
      imported,
      duplicates,
      importBatchId,
    };
  },
});

// Get all transactions for a bank account
export const getAll = query({
  args: {
    bankAccountId: v.optional(v.id("bankAccounts")),
    matchStatus: v.optional(
      v.union(
        v.literal("unmatched"),
        v.literal("matched"),
        v.literal("partially_matched"),
        v.literal("excluded")
      )
    ),
    category: v.optional(v.string()),
    dateFrom: v.optional(v.string()),
    dateTo: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let transactions;

    if (args.bankAccountId) {
      transactions = await ctx.db
        .query("bankTransactions")
        .withIndex("by_bankAccount", (q) =>
          q.eq("bankAccountId", args.bankAccountId!)
        )
        .collect();
    } else {
      transactions = await ctx.db.query("bankTransactions").collect();
    }

    // Apply filters
    if (args.matchStatus) {
      transactions = transactions.filter((t) => t.matchStatus === args.matchStatus);
    }

    if (args.category) {
      transactions = transactions.filter((t) => t.category === args.category);
    }

    if (args.dateFrom) {
      transactions = transactions.filter((t) => t.transactionDate >= args.dateFrom!);
    }

    if (args.dateTo) {
      transactions = transactions.filter((t) => t.transactionDate <= args.dateTo!);
    }

    // Sort by date descending
    transactions.sort((a, b) => b.transactionDate.localeCompare(a.transactionDate));

    // Limit results
    if (args.limit) {
      transactions = transactions.slice(0, args.limit);
    }

    // Get bank account details
    const accountIds = [...new Set(transactions.map((t) => t.bankAccountId))];
    const accounts = await Promise.all(accountIds.map((id) => ctx.db.get(id)));
    const accountMap = new Map(
      accounts.filter(Boolean).map((a) => [a!._id, a!])
    );

    // Get matched payment details
    return await Promise.all(
      transactions.map(async (tx) => {
        let matchedPayment = null;
        let matchedOwnerPayment = null;
        let matchedParticipant = null;

        if (tx.matchedPaymentId) {
          matchedPayment = await ctx.db.get(tx.matchedPaymentId);
        }
        if (tx.matchedOwnerPaymentId) {
          matchedOwnerPayment = await ctx.db.get(tx.matchedOwnerPaymentId);
        }
        if (tx.matchedParticipantId) {
          matchedParticipant = await ctx.db.get(tx.matchedParticipantId);
        }

        return {
          ...tx,
          bankAccount: accountMap.get(tx.bankAccountId),
          matchedPayment,
          matchedOwnerPayment,
          matchedParticipant,
        };
      })
    );
  },
});

// Get unmatched transactions
export const getUnmatched = query({
  args: {
    bankAccountId: v.optional(v.id("bankAccounts")),
  },
  handler: async (ctx, args) => {
    let transactions;

    if (args.bankAccountId) {
      transactions = await ctx.db
        .query("bankTransactions")
        .withIndex("by_bankAccount", (q) => q.eq("bankAccountId", args.bankAccountId!))
        .filter((q) => q.eq(q.field("matchStatus"), "unmatched"))
        .collect();
    } else {
      transactions = await ctx.db
        .query("bankTransactions")
        .withIndex("by_matchStatus", (q) => q.eq("matchStatus", "unmatched"))
        .collect();
    }

    // Sort by date descending
    transactions.sort((a, b) => b.transactionDate.localeCompare(a.transactionDate));

    // Get bank account details
    const accountIds = [...new Set(transactions.map((t) => t.bankAccountId))];
    const accounts = await Promise.all(accountIds.map((id) => ctx.db.get(id)));
    const accountMap = new Map(
      accounts.filter(Boolean).map((a) => [a!._id, a!])
    );

    return transactions.map((tx) => ({
      ...tx,
      bankAccount: accountMap.get(tx.bankAccountId),
    }));
  },
});

// Manually match a transaction
export const manualMatch = mutation({
  args: {
    transactionId: v.id("bankTransactions"),
    matchType: v.union(
      v.literal("payment"),
      v.literal("ownerPayment"),
      v.literal("claim"),
      v.literal("participant"),
      v.literal("expectedPayment")
    ),
    matchId: v.string(),
    category: v.optional(
      v.union(
        v.literal("sda_income"),
        v.literal("rrc_income"),
        v.literal("owner_payment"),
        v.literal("maintenance"),
        v.literal("other_income"),
        v.literal("other_expense"),
        v.literal("transfer"),
        v.literal("uncategorized")
      )
    ),
  },
  handler: async (ctx, args) => {
    const updates: Record<string, unknown> = {
      matchStatus: "matched" as const,
      updatedAt: Date.now(),
    };

    if (args.category) {
      updates.category = args.category;
    }

    switch (args.matchType) {
      case "payment":
        updates.matchedPaymentId = args.matchId as Id<"payments">;
        updates.category = updates.category ?? "sda_income";
        break;
      case "ownerPayment":
        updates.matchedOwnerPaymentId = args.matchId as Id<"ownerPayments">;
        updates.category = updates.category ?? "owner_payment";
        break;
      case "claim":
        updates.matchedClaimId = args.matchId as Id<"claims">;
        updates.category = updates.category ?? "sda_income";
        break;
      case "participant":
        updates.matchedParticipantId = args.matchId as Id<"participants">;
        updates.category = updates.category ?? "rrc_income";
        break;
      case "expectedPayment":
        updates.matchedExpectedPaymentId = args.matchId as Id<"expectedPayments">;
        break;
    }

    await ctx.db.patch(args.transactionId, updates);

    return args.transactionId;
  },
});

// Unmatch a transaction
export const unmatch = mutation({
  args: {
    transactionId: v.id("bankTransactions"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.transactionId, {
      matchStatus: "unmatched",
      matchedPaymentId: undefined,
      matchedOwnerPaymentId: undefined,
      matchedClaimId: undefined,
      matchedParticipantId: undefined,
      matchedExpectedPaymentId: undefined,
      matchConfidence: undefined,
      updatedAt: Date.now(),
    });

    return args.transactionId;
  },
});

// Categorize a transaction without matching
export const categorize = mutation({
  args: {
    transactionId: v.id("bankTransactions"),
    category: v.union(
      v.literal("sda_income"),
      v.literal("rrc_income"),
      v.literal("owner_payment"),
      v.literal("maintenance"),
      v.literal("other_income"),
      v.literal("other_expense"),
      v.literal("transfer"),
      v.literal("uncategorized")
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.transactionId, {
      category: args.category,
      updatedAt: Date.now(),
    });

    return args.transactionId;
  },
});

// Bulk categorize transactions
export const bulkCategorize = mutation({
  args: {
    transactionIds: v.array(v.id("bankTransactions")),
    category: v.union(
      v.literal("sda_income"),
      v.literal("rrc_income"),
      v.literal("owner_payment"),
      v.literal("maintenance"),
      v.literal("other_income"),
      v.literal("other_expense"),
      v.literal("transfer"),
      v.literal("uncategorized")
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    for (const id of args.transactionIds) {
      await ctx.db.patch(id, {
        category: args.category,
        updatedAt: now,
      });
    }

    return { updated: args.transactionIds.length };
  },
});

// Exclude transaction from reconciliation
export const exclude = mutation({
  args: {
    transactionId: v.id("bankTransactions"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.transactionId, {
      matchStatus: "excluded",
      notes: args.notes,
      updatedAt: Date.now(),
    });

    return args.transactionId;
  },
});

// Auto-match transactions (internal mutation called after import)
export const autoMatchTransactions = internalMutation({
  args: {
    bankAccountId: v.id("bankAccounts"),
  },
  handler: async (ctx, args) => {
    // Get unmatched transactions
    const transactions = await ctx.db
      .query("bankTransactions")
      .withIndex("by_bankAccount", (q) => q.eq("bankAccountId", args.bankAccountId))
      .filter((q) => q.eq(q.field("matchStatus"), "unmatched"))
      .collect();

    // Get all participants for matching
    const participants = await ctx.db
      .query("participants")
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    // Get expected payments for matching
    const expectedPayments = await ctx.db
      .query("expectedPayments")
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    let matched = 0;

    for (const tx of transactions) {
      const description = tx.description.toLowerCase();
      let bestMatch = null;
      let bestConfidence = 0;

      // Try to match credits to expected SDA/RRC income
      if (tx.amount > 0) {
        // Check for NDIS-related keywords
        const isNdisPayment =
          description.includes("ndis") ||
          description.includes("ndia") ||
          description.includes("plan manager") ||
          description.includes("sda");

        if (isNdisPayment) {
          // Look for matching expected payment by amount
          const matchingExpected = expectedPayments.find(
            (ep) =>
              ep.paymentType === "sda_income" &&
              Math.abs(ep.expectedAmount - tx.amount) < ep.expectedAmount * 0.01 // Within 1%
          );

          if (matchingExpected) {
            bestMatch = { type: "expectedPayment", id: matchingExpected._id };
            bestConfidence = 85;
          }
        }

        // Check for participant names (RRC)
        for (const participant of participants) {
          const fullName = `${participant.firstName} ${participant.lastName}`.toLowerCase();
          const ndisNumber = participant.ndisNumber;

          if (
            description.includes(fullName) ||
            description.includes(ndisNumber) ||
            description.includes("centrepay")
          ) {
            const matchingRRC = expectedPayments.find(
              (ep) =>
                ep.paymentType === "rrc_income" &&
                ep.participantId === participant._id &&
                Math.abs(ep.expectedAmount - tx.amount) < ep.expectedAmount * 0.05 // Within 5%
            );

            if (matchingRRC && bestConfidence < 80) {
              bestMatch = { type: "expectedPayment", id: matchingRRC._id };
              bestConfidence = 80;
            } else if (bestConfidence < 60) {
              bestMatch = { type: "participant", id: participant._id };
              bestConfidence = 60;
            }
          }
        }
      }

      // Auto-match if confidence is high enough
      if (bestMatch && bestConfidence >= 80) {
        const updates: Record<string, unknown> = {
          matchStatus: "matched" as const,
          matchConfidence: bestConfidence,
          updatedAt: Date.now(),
        };

        if (bestMatch.type === "expectedPayment") {
          updates.matchedExpectedPaymentId = bestMatch.id;
          updates.category = "sda_income";
        } else if (bestMatch.type === "participant") {
          updates.matchedParticipantId = bestMatch.id;
          updates.category = "rrc_income";
        }

        await ctx.db.patch(tx._id, updates);
        matched++;
      }
    }

    return { matched };
  },
});

// Get transaction summary by category
export const getSummaryByCategory = query({
  args: {
    bankAccountId: v.optional(v.id("bankAccounts")),
    dateFrom: v.optional(v.string()),
    dateTo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let transactions;

    if (args.bankAccountId) {
      transactions = await ctx.db
        .query("bankTransactions")
        .withIndex("by_bankAccount", (q) => q.eq("bankAccountId", args.bankAccountId!))
        .collect();
    } else {
      transactions = await ctx.db.query("bankTransactions").collect();
    }

    // Apply date filters
    if (args.dateFrom) {
      transactions = transactions.filter((t) => t.transactionDate >= args.dateFrom!);
    }
    if (args.dateTo) {
      transactions = transactions.filter((t) => t.transactionDate <= args.dateTo!);
    }

    // Group by category
    const summary: Record<string, { count: number; total: number }> = {};

    for (const tx of transactions) {
      const category = tx.category ?? "uncategorized";
      if (!summary[category]) {
        summary[category] = { count: 0, total: 0 };
      }
      summary[category].count++;
      summary[category].total += tx.amount;
    }

    return summary;
  },
});

// Delete all transactions for a batch (undo import)
export const deleteImportBatch = mutation({
  args: {
    importBatchId: v.string(),
  },
  handler: async (ctx, args) => {
    const transactions = await ctx.db
      .query("bankTransactions")
      .withIndex("by_importBatch", (q) => q.eq("importBatchId", args.importBatchId))
      .collect();

    let deleted = 0;

    for (const tx of transactions) {
      // Only delete unmatched transactions
      if (tx.matchStatus === "unmatched") {
        await ctx.db.delete(tx._id);
        deleted++;
      }
    }

    return { deleted, skipped: transactions.length - deleted };
  },
});

// Public mutation to trigger auto-matching
export const runAutoMatch = mutation({
  args: {
    bankAccountId: v.id("bankAccounts"),
  },
  handler: async (ctx, args) => {
    // Get unmatched transactions
    const transactions = await ctx.db
      .query("bankTransactions")
      .withIndex("by_bankAccount", (q) => q.eq("bankAccountId", args.bankAccountId))
      .filter((q) => q.eq(q.field("matchStatus"), "unmatched"))
      .collect();

    // Get all participants for matching
    const participants = await ctx.db
      .query("participants")
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    // Get expected payments for matching
    const expectedPayments = await ctx.db
      .query("expectedPayments")
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    let matched = 0;

    for (const tx of transactions) {
      const description = tx.description.toLowerCase();
      let bestMatch = null;
      let bestConfidence = 0;

      // Try to match credits to expected SDA/RRC income
      if (tx.amount > 0) {
        // Check for NDIS-related keywords
        const isNdisPayment =
          description.includes("ndis") ||
          description.includes("ndia") ||
          description.includes("plan manager") ||
          description.includes("sda");

        if (isNdisPayment) {
          // Look for matching expected payment by amount
          const matchingExpected = expectedPayments.find(
            (ep) =>
              ep.paymentType === "sda_income" &&
              Math.abs(ep.expectedAmount - tx.amount) < ep.expectedAmount * 0.01 // Within 1%
          );

          if (matchingExpected) {
            bestMatch = { type: "expectedPayment" as const, id: matchingExpected._id };
            bestConfidence = 85;
          }
        }

        // Check for participant names (RRC)
        for (const participant of participants) {
          const fullName = `${participant.firstName} ${participant.lastName}`.toLowerCase();
          const ndisNumber = participant.ndisNumber;

          if (
            description.includes(fullName) ||
            description.includes(ndisNumber) ||
            description.includes("centrepay")
          ) {
            const matchingRRC = expectedPayments.find(
              (ep) =>
                ep.paymentType === "rrc_income" &&
                ep.participantId === participant._id &&
                Math.abs(ep.expectedAmount - tx.amount) < ep.expectedAmount * 0.05 // Within 5%
            );

            if (matchingRRC && bestConfidence < 80) {
              bestMatch = { type: "expectedPayment" as const, id: matchingRRC._id };
              bestConfidence = 80;
            } else if (bestConfidence < 60) {
              bestMatch = { type: "participant" as const, id: participant._id };
              bestConfidence = 60;
            }
          }
        }
      }

      // Auto-match if confidence is high enough
      if (bestMatch && bestConfidence >= 80) {
        const updates: Record<string, unknown> = {
          matchStatus: "matched" as const,
          matchConfidence: bestConfidence,
          updatedAt: Date.now(),
        };

        if (bestMatch.type === "expectedPayment") {
          updates.matchedExpectedPaymentId = bestMatch.id;
          updates.category = "sda_income";
        } else if (bestMatch.type === "participant") {
          updates.matchedParticipantId = bestMatch.id;
          updates.category = "rrc_income";
        }

        await ctx.db.patch(tx._id, updates);
        matched++;
      }
    }

    return { matched };
  },
});

// Include/uninclude a transaction from reconciliation
export const setExcluded = mutation({
  args: {
    transactionId: v.id("bankTransactions"),
    excluded: v.boolean(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.transactionId, {
      matchStatus: args.excluded ? "excluded" : "unmatched",
      updatedAt: Date.now(),
    });

    return args.transactionId;
  },
});

// Get suggested matches for a transaction
export const getSuggestedMatches = query({
  args: {
    transactionId: v.id("bankTransactions"),
  },
  handler: async (ctx, args) => {
    const transaction = await ctx.db.get(args.transactionId);
    if (!transaction) return { suggestions: [] };

    const suggestions: Array<{
      type: string;
      id: string;
      description: string;
      amount: number;
      confidence: number;
    }> = [];

    const description = transaction.description.toLowerCase();
    const amount = transaction.amount;
    const txDate = transaction.transactionDate;

    // For credits (income)
    if (amount > 0) {
      // Check expected payments
      const expectedPayments = await ctx.db
        .query("expectedPayments")
        .filter((q) => q.eq(q.field("status"), "pending"))
        .collect();

      for (const ep of expectedPayments) {
        let confidence = 0;

        // Amount match (within 5%)
        const amountDiff = Math.abs(ep.expectedAmount - amount) / ep.expectedAmount;
        if (amountDiff < 0.01) confidence += 50; // Exact match
        else if (amountDiff < 0.05) confidence += 30;

        // Date proximity (within 7 days)
        const daysDiff = Math.abs(
          new Date(ep.expectedDate).getTime() - new Date(txDate).getTime()
        ) / (1000 * 60 * 60 * 24);
        if (daysDiff < 1) confidence += 30;
        else if (daysDiff < 7) confidence += 15;

        if (confidence > 30) {
          let desc = `Expected ${ep.paymentType.replace("_", " ")}`;
          if (ep.participantId) {
            const participant = await ctx.db.get(ep.participantId);
            if (participant) {
              desc = `${participant.firstName} ${participant.lastName} - ${ep.paymentType.replace("_", " ")}`;
            }
          }

          suggestions.push({
            type: "expectedPayment",
            id: ep._id,
            description: desc,
            amount: ep.expectedAmount,
            confidence,
          });
        }
      }

      // Check participants for RRC
      const participants = await ctx.db
        .query("participants")
        .filter((q) => q.eq(q.field("status"), "active"))
        .collect();

      for (const p of participants) {
        const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
        if (description.includes(fullName) || description.includes(p.ndisNumber)) {
          suggestions.push({
            type: "participant",
            id: p._id,
            description: `${p.firstName} ${p.lastName} (RRC)`,
            amount: 0, // Unknown expected amount
            confidence: 70,
          });
        }
      }
    }

    // For debits (expenses)
    if (amount < 0) {
      // Check owner payments
      const ownerPayments = await ctx.db
        .query("ownerPayments")
        .filter((q) => q.eq(q.field("status"), "pending"))
        .collect();

      for (const op of ownerPayments) {
        const amountDiff = Math.abs(op.amount - Math.abs(amount)) / op.amount;
        if (amountDiff < 0.01) {
          const owner = await ctx.db.get(op.ownerId);
          const ownerName = owner?.companyName || `${owner?.firstName} ${owner?.lastName}`;

          suggestions.push({
            type: "ownerPayment",
            id: op._id,
            description: `Payment to ${ownerName}`,
            amount: op.amount,
            confidence: 80,
          });
        }
      }
    }

    // Sort by confidence
    suggestions.sort((a, b) => b.confidence - a.confidence);

    return { suggestions: suggestions.slice(0, 5) };
  },
});
