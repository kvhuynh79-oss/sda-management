import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";

// Create an expected payment
export const create = mutation({
  args: {
    paymentType: v.union(
      v.literal("sda_income"),
      v.literal("rrc_income"),
      v.literal("owner_disbursement")
    ),
    participantId: v.optional(v.id("participants")),
    planId: v.optional(v.id("participantPlans")),
    propertyId: v.optional(v.id("properties")),
    ownerId: v.optional(v.id("owners")),
    expectedAmount: v.number(),
    expectedDate: v.string(),
    periodMonth: v.string(),
    periodStart: v.optional(v.string()),
    periodEnd: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const id = await ctx.db.insert("expectedPayments", {
      paymentType: args.paymentType,
      participantId: args.participantId,
      planId: args.planId,
      propertyId: args.propertyId,
      ownerId: args.ownerId,
      expectedAmount: args.expectedAmount,
      expectedDate: args.expectedDate,
      periodMonth: args.periodMonth,
      periodStart: args.periodStart,
      periodEnd: args.periodEnd,
      status: "pending",
      sourceType: "manual",
      notes: args.notes,
      createdAt: now,
      updatedAt: now,
    });

    return id;
  },
});

// Get expected payments for a month
export const getByMonth = query({
  args: {
    periodMonth: v.string(), // YYYY-MM format
    paymentType: v.optional(
      v.union(
        v.literal("sda_income"),
        v.literal("rrc_income"),
        v.literal("owner_disbursement")
      )
    ),
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("partial"),
        v.literal("received"),
        v.literal("overdue"),
        v.literal("cancelled")
      )
    ),
  },
  handler: async (ctx, args) => {
    let payments = await ctx.db
      .query("expectedPayments")
      .withIndex("by_periodMonth", (q) => q.eq("periodMonth", args.periodMonth))
      .collect();

    if (args.paymentType) {
      payments = payments.filter((p) => p.paymentType === args.paymentType);
    }

    if (args.status) {
      payments = payments.filter((p) => p.status === args.status);
    }

    // Fetch related records
    const paymentsWithDetails = await Promise.all(
      payments.map(async (payment) => {
        const participant = payment.participantId
          ? await ctx.db.get(payment.participantId)
          : null;
        const property = payment.propertyId
          ? await ctx.db.get(payment.propertyId)
          : null;
        const owner = payment.ownerId ? await ctx.db.get(payment.ownerId) : null;
        const plan = payment.planId ? await ctx.db.get(payment.planId) : null;

        return {
          ...payment,
          participant,
          property,
          owner,
          plan,
        };
      })
    );

    return paymentsWithDetails;
  },
});

// Get overdue payments
export const getOverdue = query({
  args: {},
  handler: async (ctx) => {
    const today = new Date().toISOString().split("T")[0];

    const payments = await ctx.db
      .query("expectedPayments")
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "pending"),
          q.lt(q.field("expectedDate"), today)
        )
      )
      .collect();

    // Fetch related records
    const paymentsWithDetails = await Promise.all(
      payments.map(async (payment) => {
        const participant = payment.participantId
          ? await ctx.db.get(payment.participantId)
          : null;
        const property = payment.propertyId
          ? await ctx.db.get(payment.propertyId)
          : null;
        const owner = payment.ownerId ? await ctx.db.get(payment.ownerId) : null;

        return {
          ...payment,
          participant,
          property,
          owner,
        };
      })
    );

    return paymentsWithDetails;
  },
});

// Mark expected payment as received
export const markReceived = mutation({
  args: {
    id: v.id("expectedPayments"),
    receivedAmount: v.number(),
    receivedDate: v.string(),
    matchedTransactionId: v.optional(v.id("bankTransactions")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const payment = await ctx.db.get(args.id);
    if (!payment) throw new Error("Expected payment not found");

    const variance = args.receivedAmount - payment.expectedAmount;
    const isPartial = args.receivedAmount < payment.expectedAmount * 0.95; // More than 5% short

    await ctx.db.patch(args.id, {
      status: isPartial ? "partial" : "received",
      receivedAmount: args.receivedAmount,
      receivedDate: args.receivedDate,
      variance,
      matchedTransactionId: args.matchedTransactionId,
      notes: args.notes,
      updatedAt: Date.now(),
    });

    // If matched to a transaction, update the transaction too
    if (args.matchedTransactionId) {
      await ctx.db.patch(args.matchedTransactionId, {
        matchStatus: "matched",
        matchedExpectedPaymentId: args.id,
        updatedAt: Date.now(),
      });
    }

    return args.id;
  },
});

// Generate expected SDA income payments for a month
export const generateSdaExpected = mutation({
  args: {
    periodMonth: v.string(), // YYYY-MM format
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    let created = 0;

    // Get all active participants with current plans
    const participants = await ctx.db
      .query("participants")
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    for (const participant of participants) {
      // Get current plan
      const plan = await ctx.db
        .query("participantPlans")
        .withIndex("by_participant", (q) => q.eq("participantId", participant._id))
        .filter((q) => q.eq(q.field("planStatus"), "current"))
        .first();

      if (!plan) continue;

      const monthlySdaAmount = plan.monthlySdaAmount || plan.annualSdaBudget / 12;
      if (!monthlySdaAmount) continue;

      // Check if expected payment already exists
      const existing = await ctx.db
        .query("expectedPayments")
        .withIndex("by_participant", (q) => q.eq("participantId", participant._id))
        .filter((q) =>
          q.and(
            q.eq(q.field("periodMonth"), args.periodMonth),
            q.eq(q.field("paymentType"), "sda_income")
          )
        )
        .first();

      if (existing) continue;

      // Get dwelling and property info
      const dwelling = await ctx.db.get(participant.dwellingId);
      const propertyId = dwelling?.propertyId;

      // Calculate expected date (claim day or end of month)
      const claimDay = plan.claimDay || 15;
      const [year, month] = args.periodMonth.split("-").map(Number);
      const expectedDate = `${args.periodMonth}-${String(claimDay).padStart(2, "0")}`;

      // Calculate period dates
      const periodStart = `${args.periodMonth}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const periodEnd = `${args.periodMonth}-${String(lastDay).padStart(2, "0")}`;

      await ctx.db.insert("expectedPayments", {
        paymentType: "sda_income",
        participantId: participant._id,
        planId: plan._id,
        propertyId,
        expectedAmount: monthlySdaAmount,
        expectedDate,
        periodMonth: args.periodMonth,
        periodStart,
        periodEnd,
        status: "pending",
        sourceType: "auto_generated",
        createdAt: now,
        updatedAt: now,
      });

      created++;
    }

    return { created };
  },
});

// Generate expected RRC income for a month
export const generateRrcExpected = mutation({
  args: {
    periodMonth: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    let created = 0;

    // Get all active participants with current plans
    const participants = await ctx.db
      .query("participants")
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    for (const participant of participants) {
      // Get current plan
      const plan = await ctx.db
        .query("participantPlans")
        .withIndex("by_participant", (q) => q.eq("participantId", participant._id))
        .filter((q) => q.eq(q.field("planStatus"), "current"))
        .first();

      if (!plan || !plan.reasonableRentContribution) continue;

      // Check if expected payment already exists
      const existing = await ctx.db
        .query("expectedPayments")
        .withIndex("by_participant", (q) => q.eq("participantId", participant._id))
        .filter((q) =>
          q.and(
            q.eq(q.field("periodMonth"), args.periodMonth),
            q.eq(q.field("paymentType"), "rrc_income")
          )
        )
        .first();

      if (existing) continue;

      // Convert RRC to monthly
      let monthlyRrc = plan.reasonableRentContribution;
      if (plan.rentContributionFrequency === "fortnightly") {
        monthlyRrc = (plan.reasonableRentContribution * 26) / 12;
      } else if (plan.rentContributionFrequency === "weekly") {
        monthlyRrc = (plan.reasonableRentContribution * 52) / 12;
      }

      // Get dwelling and property
      const dwelling = await ctx.db.get(participant.dwellingId);
      const propertyId = dwelling?.propertyId;

      // RRC typically comes throughout the month (Centrepay)
      const [year, month] = args.periodMonth.split("-").map(Number);
      const lastDay = new Date(year, month, 0).getDate();
      const periodStart = `${args.periodMonth}-01`;
      const periodEnd = `${args.periodMonth}-${String(lastDay).padStart(2, "0")}`;

      await ctx.db.insert("expectedPayments", {
        paymentType: "rrc_income",
        participantId: participant._id,
        planId: plan._id,
        propertyId,
        expectedAmount: monthlyRrc,
        expectedDate: periodEnd, // End of month
        periodMonth: args.periodMonth,
        periodStart,
        periodEnd,
        status: "pending",
        sourceType: "auto_generated",
        createdAt: now,
        updatedAt: now,
      });

      created++;
    }

    return { created };
  },
});

// Generate expected owner payments for a month
export const generateOwnerExpected = mutation({
  args: {
    periodMonth: v.string(),
    paymentDay: v.optional(v.number()), // Default: 5
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const paymentDay = args.paymentDay || 5;
    let created = 0;

    // Get all active properties with owners
    const properties = await ctx.db
      .query("properties")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    for (const property of properties) {
      // Check if expected payment already exists
      const existing = await ctx.db
        .query("expectedPayments")
        .withIndex("by_property", (q) => q.eq("propertyId", property._id))
        .filter((q) =>
          q.and(
            q.eq(q.field("periodMonth"), args.periodMonth),
            q.eq(q.field("paymentType"), "owner_disbursement")
          )
        )
        .first();

      if (existing) continue;

      // Get all participants at this property
      const dwellings = await ctx.db
        .query("dwellings")
        .withIndex("by_property", (q) => q.eq("propertyId", property._id))
        .collect();

      let totalOwnerPayment = 0;

      for (const dwelling of dwellings) {
        const participants = await ctx.db
          .query("participants")
          .withIndex("by_dwelling", (q) => q.eq("dwellingId", dwelling._id))
          .filter((q) => q.eq(q.field("status"), "active"))
          .collect();

        for (const participant of participants) {
          const plan = await ctx.db
            .query("participantPlans")
            .withIndex("by_participant", (q) => q.eq("participantId", participant._id))
            .filter((q) => q.eq(q.field("planStatus"), "current"))
            .first();

          if (!plan) continue;

          const monthlySda = plan.monthlySdaAmount || plan.annualSdaBudget / 12 || 0;

          // Convert RRC to monthly
          let monthlyRrc = plan.reasonableRentContribution || 0;
          if (plan.rentContributionFrequency === "fortnightly") {
            monthlyRrc = (monthlyRrc * 26) / 12;
          } else if (plan.rentContributionFrequency === "weekly") {
            monthlyRrc = (monthlyRrc * 52) / 12;
          }

          const totalIncome = monthlySda + monthlyRrc;
          const managementFeePercent = property.managementFeePercent || 0;
          const managementFee = totalIncome * (managementFeePercent / 100);
          const ownerPayment = totalIncome - managementFee;

          totalOwnerPayment += ownerPayment;
        }
      }

      if (totalOwnerPayment <= 0) continue;

      // Expected payment date (5th of month)
      const expectedDate = `${args.periodMonth}-${String(paymentDay).padStart(2, "0")}`;

      await ctx.db.insert("expectedPayments", {
        paymentType: "owner_disbursement",
        propertyId: property._id,
        ownerId: property.ownerId,
        expectedAmount: totalOwnerPayment,
        expectedDate,
        periodMonth: args.periodMonth,
        status: "pending",
        sourceType: "auto_generated",
        createdAt: now,
        updatedAt: now,
      });

      created++;
    }

    return { created };
  },
});

// Generate all expected payments for a month
export const generateForMonth = mutation({
  args: {
    periodMonth: v.string(),
    paymentDay: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const paymentDay = args.paymentDay || 5;
    let sdaCreated = 0;
    let rrcCreated = 0;
    let ownerCreated = 0;

    // Get all active participants with current plans
    const participants = await ctx.db
      .query("participants")
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    // 1. Generate SDA expected payments
    for (const participant of participants) {
      const plan = await ctx.db
        .query("participantPlans")
        .withIndex("by_participant", (q) => q.eq("participantId", participant._id))
        .filter((q) => q.eq(q.field("planStatus"), "current"))
        .first();

      if (!plan) continue;

      const monthlySdaAmount = plan.monthlySdaAmount || plan.annualSdaBudget / 12;
      if (monthlySdaAmount) {
        const existingSda = await ctx.db
          .query("expectedPayments")
          .withIndex("by_participant", (q) => q.eq("participantId", participant._id))
          .filter((q) =>
            q.and(
              q.eq(q.field("periodMonth"), args.periodMonth),
              q.eq(q.field("paymentType"), "sda_income")
            )
          )
          .first();

        if (!existingSda) {
          const dwelling = await ctx.db.get(participant.dwellingId);
          const propertyId = dwelling?.propertyId;
          const claimDay = plan.claimDay || 15;
          const expectedDate = `${args.periodMonth}-${String(claimDay).padStart(2, "0")}`;
          const [year, month] = args.periodMonth.split("-").map(Number);
          const periodStart = `${args.periodMonth}-01`;
          const lastDay = new Date(year, month, 0).getDate();
          const periodEnd = `${args.periodMonth}-${String(lastDay).padStart(2, "0")}`;

          await ctx.db.insert("expectedPayments", {
            paymentType: "sda_income",
            participantId: participant._id,
            planId: plan._id,
            propertyId,
            expectedAmount: monthlySdaAmount,
            expectedDate,
            periodMonth: args.periodMonth,
            periodStart,
            periodEnd,
            status: "pending",
            sourceType: "auto_generated",
            createdAt: now,
            updatedAt: now,
          });

          sdaCreated++;
        }
      }

      // 2. Generate RRC expected payments
      if (plan.reasonableRentContribution) {
        const existingRrc = await ctx.db
          .query("expectedPayments")
          .withIndex("by_participant", (q) => q.eq("participantId", participant._id))
          .filter((q) =>
            q.and(
              q.eq(q.field("periodMonth"), args.periodMonth),
              q.eq(q.field("paymentType"), "rrc_income")
            )
          )
          .first();

        if (!existingRrc) {
          let monthlyRrc = plan.reasonableRentContribution;
          if (plan.rentContributionFrequency === "fortnightly") {
            monthlyRrc = (plan.reasonableRentContribution * 26) / 12;
          } else if (plan.rentContributionFrequency === "weekly") {
            monthlyRrc = (plan.reasonableRentContribution * 52) / 12;
          }

          const dwelling = await ctx.db.get(participant.dwellingId);
          const propertyId = dwelling?.propertyId;
          const [year, month] = args.periodMonth.split("-").map(Number);
          const lastDay = new Date(year, month, 0).getDate();
          const periodStart = `${args.periodMonth}-01`;
          const periodEnd = `${args.periodMonth}-${String(lastDay).padStart(2, "0")}`;

          await ctx.db.insert("expectedPayments", {
            paymentType: "rrc_income",
            participantId: participant._id,
            planId: plan._id,
            propertyId,
            expectedAmount: monthlyRrc,
            expectedDate: periodEnd,
            periodMonth: args.periodMonth,
            periodStart,
            periodEnd,
            status: "pending",
            sourceType: "auto_generated",
            createdAt: now,
            updatedAt: now,
          });

          rrcCreated++;
        }
      }
    }

    // 3. Generate owner expected payments
    const properties = await ctx.db
      .query("properties")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    for (const property of properties) {
      const existingOwner = await ctx.db
        .query("expectedPayments")
        .withIndex("by_property", (q) => q.eq("propertyId", property._id))
        .filter((q) =>
          q.and(
            q.eq(q.field("periodMonth"), args.periodMonth),
            q.eq(q.field("paymentType"), "owner_disbursement")
          )
        )
        .first();

      if (existingOwner) continue;

      const dwellings = await ctx.db
        .query("dwellings")
        .withIndex("by_property", (q) => q.eq("propertyId", property._id))
        .collect();

      let totalOwnerPayment = 0;

      for (const dwelling of dwellings) {
        const dwellingParticipants = await ctx.db
          .query("participants")
          .withIndex("by_dwelling", (q) => q.eq("dwellingId", dwelling._id))
          .filter((q) => q.eq(q.field("status"), "active"))
          .collect();

        for (const p of dwellingParticipants) {
          const pPlan = await ctx.db
            .query("participantPlans")
            .withIndex("by_participant", (q) => q.eq("participantId", p._id))
            .filter((q) => q.eq(q.field("planStatus"), "current"))
            .first();

          if (!pPlan) continue;

          const monthlySda = pPlan.monthlySdaAmount || pPlan.annualSdaBudget / 12 || 0;
          let monthlyRrc = pPlan.reasonableRentContribution || 0;
          if (pPlan.rentContributionFrequency === "fortnightly") {
            monthlyRrc = (monthlyRrc * 26) / 12;
          } else if (pPlan.rentContributionFrequency === "weekly") {
            monthlyRrc = (monthlyRrc * 52) / 12;
          }

          const totalIncome = monthlySda + monthlyRrc;
          const managementFeePercent = property.managementFeePercent || 0;
          const managementFee = totalIncome * (managementFeePercent / 100);
          const ownerPayment = totalIncome - managementFee;

          totalOwnerPayment += ownerPayment;
        }
      }

      if (totalOwnerPayment > 0) {
        const expectedDate = `${args.periodMonth}-${String(paymentDay).padStart(2, "0")}`;

        await ctx.db.insert("expectedPayments", {
          paymentType: "owner_disbursement",
          propertyId: property._id,
          ownerId: property.ownerId,
          expectedAmount: totalOwnerPayment,
          expectedDate,
          periodMonth: args.periodMonth,
          status: "pending",
          sourceType: "auto_generated",
          createdAt: now,
          updatedAt: now,
        });

        ownerCreated++;
      }
    }

    return {
      sdaCreated,
      rrcCreated,
      ownerCreated,
      totalCreated: sdaCreated + rrcCreated + ownerCreated,
    };
  },
});

// Internal mutation to generate expected payments for current month (called by cron)
export const generateMonthlyExpectedInternal = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = new Date();
    const periodMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const paymentDay = 5; // Default owner payment day

    let sdaCreated = 0;
    let rrcCreated = 0;
    let ownerCreated = 0;
    const dbNow = Date.now();

    // Get all active participants with current plans
    const participants = await ctx.db
      .query("participants")
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    // 1. Generate SDA expected payments
    for (const participant of participants) {
      const plan = await ctx.db
        .query("participantPlans")
        .withIndex("by_participant", (q) => q.eq("participantId", participant._id))
        .filter((q) => q.eq(q.field("planStatus"), "current"))
        .first();

      if (!plan) continue;

      const monthlySdaAmount = plan.monthlySdaAmount || plan.annualSdaBudget / 12;
      if (monthlySdaAmount) {
        const existingSda = await ctx.db
          .query("expectedPayments")
          .withIndex("by_participant", (q) => q.eq("participantId", participant._id))
          .filter((q) =>
            q.and(
              q.eq(q.field("periodMonth"), periodMonth),
              q.eq(q.field("paymentType"), "sda_income")
            )
          )
          .first();

        if (!existingSda) {
          const dwelling = await ctx.db.get(participant.dwellingId);
          const propertyId = dwelling?.propertyId;
          const claimDay = plan.claimDay || 15;
          const expectedDate = `${periodMonth}-${String(claimDay).padStart(2, "0")}`;
          const [year, month] = periodMonth.split("-").map(Number);
          const periodStart = `${periodMonth}-01`;
          const lastDay = new Date(year, month, 0).getDate();
          const periodEnd = `${periodMonth}-${String(lastDay).padStart(2, "0")}`;

          await ctx.db.insert("expectedPayments", {
            paymentType: "sda_income",
            participantId: participant._id,
            planId: plan._id,
            propertyId,
            expectedAmount: monthlySdaAmount,
            expectedDate,
            periodMonth,
            periodStart,
            periodEnd,
            status: "pending",
            sourceType: "auto_generated",
            createdAt: dbNow,
            updatedAt: dbNow,
          });

          sdaCreated++;
        }
      }

      // 2. Generate RRC expected payments
      if (plan.reasonableRentContribution) {
        const existingRrc = await ctx.db
          .query("expectedPayments")
          .withIndex("by_participant", (q) => q.eq("participantId", participant._id))
          .filter((q) =>
            q.and(
              q.eq(q.field("periodMonth"), periodMonth),
              q.eq(q.field("paymentType"), "rrc_income")
            )
          )
          .first();

        if (!existingRrc) {
          let monthlyRrc = plan.reasonableRentContribution;
          if (plan.rentContributionFrequency === "fortnightly") {
            monthlyRrc = (plan.reasonableRentContribution * 26) / 12;
          } else if (plan.rentContributionFrequency === "weekly") {
            monthlyRrc = (plan.reasonableRentContribution * 52) / 12;
          }

          const dwelling = await ctx.db.get(participant.dwellingId);
          const propertyId = dwelling?.propertyId;
          const [year, month] = periodMonth.split("-").map(Number);
          const lastDay = new Date(year, month, 0).getDate();
          const periodStart = `${periodMonth}-01`;
          const periodEnd = `${periodMonth}-${String(lastDay).padStart(2, "0")}`;

          await ctx.db.insert("expectedPayments", {
            paymentType: "rrc_income",
            participantId: participant._id,
            planId: plan._id,
            propertyId,
            expectedAmount: monthlyRrc,
            expectedDate: periodEnd,
            periodMonth,
            periodStart,
            periodEnd,
            status: "pending",
            sourceType: "auto_generated",
            createdAt: dbNow,
            updatedAt: dbNow,
          });

          rrcCreated++;
        }
      }
    }

    // 3. Generate owner expected payments
    const properties = await ctx.db
      .query("properties")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    for (const property of properties) {
      const existingOwner = await ctx.db
        .query("expectedPayments")
        .withIndex("by_property", (q) => q.eq("propertyId", property._id))
        .filter((q) =>
          q.and(
            q.eq(q.field("periodMonth"), periodMonth),
            q.eq(q.field("paymentType"), "owner_disbursement")
          )
        )
        .first();

      if (existingOwner) continue;

      const dwellings = await ctx.db
        .query("dwellings")
        .withIndex("by_property", (q) => q.eq("propertyId", property._id))
        .collect();

      let totalOwnerPayment = 0;

      for (const dwelling of dwellings) {
        const dwellingParticipants = await ctx.db
          .query("participants")
          .withIndex("by_dwelling", (q) => q.eq("dwellingId", dwelling._id))
          .filter((q) => q.eq(q.field("status"), "active"))
          .collect();

        for (const p of dwellingParticipants) {
          const pPlan = await ctx.db
            .query("participantPlans")
            .withIndex("by_participant", (q) => q.eq("participantId", p._id))
            .filter((q) => q.eq(q.field("planStatus"), "current"))
            .first();

          if (!pPlan) continue;

          const monthlySda = pPlan.monthlySdaAmount || pPlan.annualSdaBudget / 12 || 0;
          let monthlyRrc = pPlan.reasonableRentContribution || 0;
          if (pPlan.rentContributionFrequency === "fortnightly") {
            monthlyRrc = (monthlyRrc * 26) / 12;
          } else if (pPlan.rentContributionFrequency === "weekly") {
            monthlyRrc = (monthlyRrc * 52) / 12;
          }

          const totalIncome = monthlySda + monthlyRrc;
          const managementFeePercent = property.managementFeePercent || 0;
          const managementFee = totalIncome * (managementFeePercent / 100);
          const ownerPayment = totalIncome - managementFee;

          totalOwnerPayment += ownerPayment;
        }
      }

      if (totalOwnerPayment > 0) {
        const expectedDate = `${periodMonth}-${String(paymentDay).padStart(2, "0")}`;

        await ctx.db.insert("expectedPayments", {
          paymentType: "owner_disbursement",
          propertyId: property._id,
          ownerId: property.ownerId,
          expectedAmount: totalOwnerPayment,
          expectedDate,
          periodMonth,
          status: "pending",
          sourceType: "auto_generated",
          createdAt: dbNow,
          updatedAt: dbNow,
        });

        ownerCreated++;
      }
    }

    return {
      periodMonth,
      sdaCreated,
      rrcCreated,
      ownerCreated,
      totalCreated: sdaCreated + rrcCreated + ownerCreated,
    };
  },
});

// Check for overdue payments and update status (called by cron)
export const checkOverdue = internalMutation({
  args: {},
  handler: async (ctx) => {
    const today = new Date().toISOString().split("T")[0];

    const pendingPayments = await ctx.db
      .query("expectedPayments")
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    let updated = 0;

    for (const payment of pendingPayments) {
      if (payment.expectedDate < today) {
        await ctx.db.patch(payment._id, {
          status: "overdue",
          updatedAt: Date.now(),
        });
        updated++;
      }
    }

    return { updated };
  },
});

// Get summary stats
export const getSummary = query({
  args: {
    periodMonth: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let payments;

    if (args.periodMonth) {
      payments = await ctx.db
        .query("expectedPayments")
        .withIndex("by_periodMonth", (q) => q.eq("periodMonth", args.periodMonth!))
        .collect();
    } else {
      payments = await ctx.db.query("expectedPayments").collect();
    }

    const summary = {
      total: payments.length,
      pending: 0,
      received: 0,
      partial: 0,
      overdue: 0,
      cancelled: 0,
      expectedTotal: 0,
      receivedTotal: 0,
      byType: {
        sda_income: { count: 0, expected: 0, received: 0 },
        rrc_income: { count: 0, expected: 0, received: 0 },
        owner_disbursement: { count: 0, expected: 0, received: 0 },
      },
    };

    for (const payment of payments) {
      summary[payment.status as keyof typeof summary]++;
      summary.expectedTotal += payment.expectedAmount;
      summary.receivedTotal += payment.receivedAmount || 0;

      const typeKey = payment.paymentType as keyof typeof summary.byType;
      summary.byType[typeKey].count++;
      summary.byType[typeKey].expected += payment.expectedAmount;
      summary.byType[typeKey].received += payment.receivedAmount || 0;
    }

    return summary;
  },
});

// Cancel an expected payment
export const cancel = mutation({
  args: {
    id: v.id("expectedPayments"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: "cancelled",
      notes: args.reason,
      updatedAt: Date.now(),
    });

    return args.id;
  },
});
