import { query } from "./_generated/server";
import { v } from "convex/values";
import { requireTenant } from "./authHelpers";

// Get compliance report for preventative schedules
export const getComplianceReport = query({
  args: {
    userId: v.id("users"),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);

    const allSchedules = await ctx.db
      .query("preventativeSchedule")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
      .collect();
    const activeSchedules = allSchedules.filter((s) => s.isActive);

    const today = new Date();
    const startDate = args.startDate ? new Date(args.startDate) : new Date(today.getFullYear(), 0, 1);
    const endDate = args.endDate ? new Date(args.endDate) : today;

    // Get all maintenance records created from preventative schedules
    const maintenanceRecords = await ctx.db
      .query("maintenanceRequests")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
      .collect();
    const preventativeMaintenance = maintenanceRecords.filter(
      (m) => m.requestType === "preventative" && m.status === "completed"
    );

    // Calculate compliance metrics
    const overdue = activeSchedules.filter((s) => {
      const dueDate = new Date(s.nextDueDate);
      return dueDate < today;
    });

    const completedOnTime = preventativeMaintenance.filter((m) => {
      if (!m.completedDate) return false;
      const completed = new Date(m.completedDate);
      return completed >= startDate && completed <= endDate;
    });

    // Group by category
    const byCategory = {
      safety: {
        total: activeSchedules.filter((s) => s.category === "safety").length,
        overdue: overdue.filter((s) => s.category === "safety").length,
      },
      plumbing: {
        total: activeSchedules.filter((s) => s.category === "plumbing").length,
        overdue: overdue.filter((s) => s.category === "plumbing").length,
      },
      electrical: {
        total: activeSchedules.filter((s) => s.category === "electrical").length,
        overdue: overdue.filter((s) => s.category === "electrical").length,
      },
      appliances: {
        total: activeSchedules.filter((s) => s.category === "appliances").length,
        overdue: overdue.filter((s) => s.category === "appliances").length,
      },
      building: {
        total: activeSchedules.filter((s) => s.category === "building").length,
        overdue: overdue.filter((s) => s.category === "building").length,
      },
      grounds: {
        total: activeSchedules.filter((s) => s.category === "grounds").length,
        overdue: overdue.filter((s) => s.category === "grounds").length,
      },
      general: {
        total: activeSchedules.filter((s) => s.category === "general").length,
        overdue: overdue.filter((s) => s.category === "general").length,
      },
    };

    const complianceRate = activeSchedules.length > 0
      ? ((activeSchedules.length - overdue.length) / activeSchedules.length) * 100
      : 100;

    return {
      totalSchedules: activeSchedules.length,
      overdueCount: overdue.length,
      completedInPeriod: completedOnTime.length,
      complianceRate: Math.round(complianceRate * 10) / 10,
      byCategory,
      overdue: await Promise.all(
        overdue.map(async (s) => {
          const property = await ctx.db.get(s.propertyId);
          const dwelling = s.dwellingId ? await ctx.db.get(s.dwellingId) : null;
          const daysOverdue = Math.ceil(
            (today.getTime() - new Date(s.nextDueDate).getTime()) / (1000 * 60 * 60 * 24)
          );
          return { ...s, property, dwelling, daysOverdue };
        })
      ),
    };
  },
});

// Get cost analysis report
export const getCostAnalysis = query({
  args: {
    userId: v.id("users"),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);

    const today = new Date();
    const startDate = args.startDate ? new Date(args.startDate) : new Date(today.getFullYear(), 0, 1);
    const endDate = args.endDate ? new Date(args.endDate) : today;

    // Get completed maintenance from preventative schedules
    const maintenanceRecords = await ctx.db
      .query("maintenanceRequests")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
      .collect();
    const preventativeMaintenance = maintenanceRecords.filter(
      (m) =>
        m.requestType === "preventative" &&
        m.status === "completed" &&
        m.completedDate
    );

    const completedInPeriod = preventativeMaintenance.filter((m) => {
      const completed = new Date(m.completedDate!);
      return completed >= startDate && completed <= endDate;
    });

    // Calculate costs
    const totalActualCost = completedInPeriod.reduce(
      (sum, m) => sum + (m.actualCost || 0),
      0
    );

    // Get estimated costs for upcoming schedules
    const allSchedules = await ctx.db
      .query("preventativeSchedule")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
      .collect();
    const activeSchedules = allSchedules.filter((s) => s.isActive);

    const thirtyDaysFromNow = new Date(today);
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    const upcomingSchedules = activeSchedules.filter((s) => {
      const dueDate = new Date(s.nextDueDate);
      return dueDate >= today && dueDate <= thirtyDaysFromNow;
    });

    const projectedCost30Days = upcomingSchedules.reduce(
      (sum, s) => sum + (s.estimatedCost || 0),
      0
    );

    // Calculate annual projection
    const totalEstimatedAnnual = activeSchedules.reduce((sum, s) => {
      const cost = s.estimatedCost || 0;
      let annualOccurrences = 1;

      switch (s.frequencyType) {
        case "weekly":
          annualOccurrences = 52 / s.frequencyInterval;
          break;
        case "monthly":
          annualOccurrences = 12 / s.frequencyInterval;
          break;
        case "quarterly":
          annualOccurrences = 4 / s.frequencyInterval;
          break;
        case "biannually":
          annualOccurrences = 2 / s.frequencyInterval;
          break;
        case "annually":
          annualOccurrences = 1 / s.frequencyInterval;
          break;
      }

      return sum + cost * annualOccurrences;
    }, 0);

    // Cost by category
    const byCategory = {
      safety: activeSchedules
        .filter((s) => s.category === "safety")
        .reduce((sum, s) => sum + (s.estimatedCost || 0), 0),
      plumbing: activeSchedules
        .filter((s) => s.category === "plumbing")
        .reduce((sum, s) => sum + (s.estimatedCost || 0), 0),
      electrical: activeSchedules
        .filter((s) => s.category === "electrical")
        .reduce((sum, s) => sum + (s.estimatedCost || 0), 0),
      appliances: activeSchedules
        .filter((s) => s.category === "appliances")
        .reduce((sum, s) => sum + (s.estimatedCost || 0), 0),
      building: activeSchedules
        .filter((s) => s.category === "building")
        .reduce((sum, s) => sum + (s.estimatedCost || 0), 0),
      grounds: activeSchedules
        .filter((s) => s.category === "grounds")
        .reduce((sum, s) => sum + (s.estimatedCost || 0), 0),
      general: activeSchedules
        .filter((s) => s.category === "general")
        .reduce((sum, s) => sum + (s.estimatedCost || 0), 0),
    };

    return {
      actualCostInPeriod: Math.round(totalActualCost * 100) / 100,
      projectedCost30Days: Math.round(projectedCost30Days * 100) / 100,
      projectedAnnualCost: Math.round(totalEstimatedAnnual * 100) / 100,
      completedInPeriod: completedInPeriod.length,
      upcomingIn30Days: upcomingSchedules.length,
      byCategory,
    };
  },
});

// Get contractor performance report
export const getContractorPerformance = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);

    const maintenanceRecords = await ctx.db
      .query("maintenanceRequests")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
      .collect();
    const preventativeMaintenance = maintenanceRecords.filter(
      (m) => m.requestType === "preventative" && m.contractorName
    );

    // Group by contractor
    const contractorMap = new Map<
      string,
      { completed: number; totalCost: number; tasks: string[] }
    >();

    for (const record of preventativeMaintenance) {
      const contractor = record.contractorName!;
      if (!contractorMap.has(contractor)) {
        contractorMap.set(contractor, {
          completed: 0,
          totalCost: 0,
          tasks: [],
        });
      }

      const data = contractorMap.get(contractor)!;
      if (record.status === "completed") {
        data.completed++;
        data.totalCost += record.actualCost || 0;
      }
      if (!data.tasks.includes(record.title)) {
        data.tasks.push(record.title);
      }
    }

    const contractors = Array.from(contractorMap.entries()).map(
      ([name, data]) => ({
        name,
        completed: data.completed,
        totalCost: Math.round(data.totalCost * 100) / 100,
        tasks: data.tasks,
      })
    );

    return contractors.sort((a, b) => b.completed - a.completed);
  },
});

// ============================================
// OWNER / FOLIO SUMMARY REPORT
// ============================================

export const getOwnerStatement = query({
  args: {
    userId: v.id("users"),
    propertyId: v.optional(v.id("properties")),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);

    let properties;
    if (args.propertyId) {
      const prop = await ctx.db.get(args.propertyId);
      // Verify property belongs to this organization
      properties = prop && prop.organizationId === organizationId ? [prop] : [];
    } else {
      properties = await ctx.db
        .query("properties")
        .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
        .collect();
      properties = properties.filter((p) => p.isActive);
    }

    const results = await Promise.all(
      properties.map(async (property) => {
        if (!property) return null;

        const owner = property.ownerId ? await ctx.db.get(property.ownerId) : null;
        const dwellings = await ctx.db
          .query("dwellings")
          .withIndex("by_property", (q) => q.eq("propertyId", property._id))
          .collect();

        const dwellingRevenue = await Promise.all(
          dwellings.map(async (dwelling) => {
            const participants = await ctx.db
              .query("participants")
              .withIndex("by_dwelling", (q) => q.eq("dwellingId", dwelling._id))
              .filter((q) => q.eq(q.field("status"), "active"))
              .collect();

            const participantRevenue = await Promise.all(
              participants.map(async (participant) => {
                const plans = await ctx.db
                  .query("participantPlans")
                  .withIndex("by_participant", (q) => q.eq("participantId", participant._id))
                  .filter((q) => q.eq(q.field("planStatus"), "current"))
                  .collect();

                const plan = plans[0];
                if (!plan) return null;

                const monthlySda = plan.monthlySdaAmount || (plan.annualSdaBudget / 12);
                const monthlyRrc = plan.reasonableRentContribution || 0;
                const managementFeePercent = plan.managementFeePercent || property.managementFeePercent || 15;
                const totalRevenue = monthlySda + monthlyRrc;
                const managementFee = totalRevenue * (managementFeePercent / 100);
                const netToOwner = totalRevenue - managementFee;

                return {
                  participantId: participant._id,
                  participantName: `${participant.firstName} ${participant.lastName}`,
                  ndisNumber: participant.ndisNumber,
                  monthlySda,
                  monthlyRrc,
                  totalRevenue,
                  managementFeePercent,
                  managementFee,
                  netToOwner,
                };
              })
            );

            return {
              dwellingId: dwelling._id,
              dwellingName: dwelling.dwellingName,
              participants: participantRevenue.filter(Boolean),
              totalRevenue: participantRevenue.reduce((sum, p) => sum + (p?.totalRevenue || 0), 0),
              totalNetToOwner: participantRevenue.reduce((sum, p) => sum + (p?.netToOwner || 0), 0),
            };
          })
        );

        // Build owner info if owner exists
        let ownerInfo = null;
        if (owner && "ownerType" in owner) {
          ownerInfo = {
            name: owner.ownerType === "company" ? owner.companyName || "" : `${owner.firstName || ""} ${owner.lastName || ""}`,
            email: owner.email,
            bankBsb: owner.bankBsb,
            bankAccountNumber: owner.bankAccountNumber,
            bankAccountName: owner.bankAccountName,
          };
        }

        return {
          propertyId: property._id,
          propertyName: property.propertyName || property.addressLine1,
          address: `${property.addressLine1}, ${property.suburb} ${property.state} ${property.postcode}`,
          owner: ownerInfo,
          dwellings: dwellingRevenue,
          totalMonthlyRevenue: dwellingRevenue.reduce((sum, d) => sum + d.totalRevenue, 0),
          totalMonthlyNetToOwner: dwellingRevenue.reduce((sum, d) => sum + d.totalNetToOwner, 0),
        };
      })
    );

    return results.filter(Boolean);
  },
});

// ============================================
// PAYMENT SUMMARY REPORT
// ============================================

export const getPaymentSummary = query({
  args: {
    userId: v.id("users"),
    startDate: v.string(),
    endDate: v.string(),
    propertyId: v.optional(v.id("properties")),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);

    const payments = await ctx.db
      .query("payments")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
      .collect();

    const filteredPayments = payments.filter((p) => {
      return p.paymentDate >= args.startDate && p.paymentDate <= args.endDate;
    });

    const enrichedPayments = await Promise.all(
      filteredPayments.map(async (payment) => {
        const participant = await ctx.db.get(payment.participantId);
        if (!participant) return null;

        const dwelling = participant.dwellingId ? await ctx.db.get(participant.dwellingId) : null;
        const property = dwelling ? await ctx.db.get(dwelling.propertyId) : null;

        if (args.propertyId && property?._id !== args.propertyId) return null;

        return {
          ...payment,
          participantName: `${participant.firstName} ${participant.lastName}`,
          propertyName: property?.propertyName || property?.addressLine1,
          dwellingName: dwelling?.dwellingName,
        };
      })
    );

    const validPayments = enrichedPayments.filter(Boolean);

    return {
      payments: validPayments,
      totalExpected: validPayments.reduce((sum, p) => sum + (p?.expectedAmount || 0), 0),
      totalReceived: validPayments.reduce((sum, p) => sum + (p?.actualAmount || 0), 0),
      totalVariance: validPayments.reduce((sum, p) => sum + (p?.variance || 0), 0),
      count: validPayments.length,
    };
  },
});

// ============================================
// OUTSTANDING PAYMENTS REPORT
// ============================================

export const getOutstandingPayments = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);

    const claims = await ctx.db
      .query("claims")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
      .collect();

    const outstandingClaims = claims.filter((c) =>
      ["pending", "submitted", "rejected", "partial"].includes(c.status)
    );

    const enrichedClaims = await Promise.all(
      outstandingClaims.map(async (claim) => {
        const participant = await ctx.db.get(claim.participantId);
        if (!participant) return null;

        const dwelling = participant.dwellingId ? await ctx.db.get(participant.dwellingId) : null;
        const property = dwelling ? await ctx.db.get(dwelling.propertyId) : null;

        const today = new Date();
        const claimDate = new Date(claim.claimPeriod + "-01");
        const daysOverdue = Math.floor((today.getTime() - claimDate.getTime()) / (1000 * 60 * 60 * 24));

        return {
          ...claim,
          participantName: `${participant.firstName} ${participant.lastName}`,
          ndisNumber: participant.ndisNumber,
          propertyName: property?.propertyName || property?.addressLine1,
          dwellingName: dwelling?.dwellingName,
          daysOverdue: daysOverdue > 30 ? daysOverdue - 30 : 0,
        };
      })
    );

    const validClaims = enrichedClaims.filter(Boolean);

    return {
      claims: validClaims.sort((a, b) => (b?.daysOverdue || 0) - (a?.daysOverdue || 0)),
      totalOutstanding: validClaims.reduce((sum, c) => sum + (c?.expectedAmount || 0), 0),
      count: validClaims.length,
    };
  },
});

// ============================================
// INSPECTION SUMMARY REPORT
// ============================================

export const getInspectionSummary = query({
  args: {
    userId: v.id("users"),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    propertyId: v.optional(v.id("properties")),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);

    let inspections = await ctx.db
      .query("inspections")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
      .collect();

    if (args.propertyId) {
      inspections = inspections.filter((i) => i.propertyId === args.propertyId);
    }

    if (args.startDate && args.endDate) {
      inspections = inspections.filter(
        (i) => i.scheduledDate >= args.startDate! && i.scheduledDate <= args.endDate!
      );
    }

    const enrichedInspections = await Promise.all(
      inspections.map(async (inspection) => {
        const property = await ctx.db.get(inspection.propertyId);
        const dwelling = inspection.dwellingId ? await ctx.db.get(inspection.dwellingId) : null;
        const inspector = await ctx.db.get(inspection.inspectorId);

        const items = await ctx.db
          .query("inspectionItems")
          .withIndex("by_inspection", (q) => q.eq("inspectionId", inspection._id))
          .filter((q) => q.eq(q.field("status"), "fail"))
          .collect();

        return {
          ...inspection,
          propertyName: property?.propertyName || property?.addressLine1,
          dwellingName: dwelling?.dwellingName,
          inspectorName: inspector ? `${inspector.firstName} ${inspector.lastName}` : "Unknown",
          failedItems: items.map((i) => ({ category: i.category, itemName: i.itemName, remarks: i.remarks })),
          passRate: inspection.totalItems > 0
            ? Math.round((inspection.passedItems / inspection.totalItems) * 100)
            : 0,
        };
      })
    );

    const completed = enrichedInspections.filter((i) => i.status === "completed");
    const scheduled = enrichedInspections.filter((i) => i.status === "scheduled");
    const inProgress = enrichedInspections.filter((i) => i.status === "in_progress");

    return {
      inspections: enrichedInspections,
      summary: {
        total: enrichedInspections.length,
        completed: completed.length,
        scheduled: scheduled.length,
        inProgress: inProgress.length,
        averagePassRate: completed.length > 0
          ? Math.round(completed.reduce((sum, i) => sum + i.passRate, 0) / completed.length)
          : 0,
        totalFailedItems: completed.reduce((sum, i) => sum + i.failedItems.length, 0),
      },
    };
  },
});

// ============================================
// DOCUMENT EXPIRY REPORT
// ============================================

export const getDocumentExpiryReport = query({
  args: {
    userId: v.id("users"),
    daysAhead: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);

    const daysAhead = args.daysAhead || 90;
    const today = new Date();
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + daysAhead);

    const documents = await ctx.db
      .query("documents")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
      .collect();

    const expiringDocs = await Promise.all(
      documents
        .filter((doc) => doc.expiryDate)
        .filter((doc) => {
          const expiry = new Date(doc.expiryDate!);
          return expiry <= futureDate;
        })
        .map(async (doc) => {
          const participant = doc.linkedParticipantId ? await ctx.db.get(doc.linkedParticipantId) : null;
          const property = doc.linkedPropertyId ? await ctx.db.get(doc.linkedPropertyId) : null;
          const dwelling = doc.linkedDwellingId ? await ctx.db.get(doc.linkedDwellingId) : null;

          const expiry = new Date(doc.expiryDate!);
          const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

          return {
            ...doc,
            participantName: participant ? `${participant.firstName} ${participant.lastName}` : null,
            propertyName: property?.propertyName || property?.addressLine1,
            dwellingName: dwelling?.dwellingName,
            daysUntilExpiry,
            isExpired: daysUntilExpiry < 0,
          };
        })
    );

    const expired = expiringDocs.filter((d) => d.isExpired);
    const expiringSoon = expiringDocs.filter((d) => !d.isExpired && d.daysUntilExpiry <= 30);
    const expiringLater = expiringDocs.filter((d) => d.daysUntilExpiry > 30);

    return {
      documents: expiringDocs.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry),
      summary: {
        expired: expired.length,
        expiringSoon: expiringSoon.length,
        expiringLater: expiringLater.length,
      },
      byType: {
        ndis_plan: expiringDocs.filter((d) => d.documentType === "ndis_plan").length,
        insurance: expiringDocs.filter((d) => d.documentType === "insurance").length,
        compliance: expiringDocs.filter((d) => d.documentType === "compliance").length,
        lease: expiringDocs.filter((d) => d.documentType === "lease").length,
        service_agreement: expiringDocs.filter((d) => d.documentType === "service_agreement").length,
      },
    };
  },
});

// ============================================
// MAINTENANCE OVERVIEW REPORT
// ============================================

export const getMaintenanceOverview = query({
  args: {
    userId: v.id("users"),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    propertyId: v.optional(v.id("properties")),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);

    const maintenanceRequests = await ctx.db
      .query("maintenanceRequests")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
      .collect();
    const today = new Date().toISOString().split("T")[0];

    const enrichedRequests = await Promise.all(
      maintenanceRequests.map(async (request) => {
        const dwelling = await ctx.db.get(request.dwellingId);
        const property = dwelling ? await ctx.db.get(dwelling.propertyId) : null;

        if (args.propertyId && property?._id !== args.propertyId) return null;

        if (args.startDate && args.endDate) {
          if (request.reportedDate < args.startDate || request.reportedDate > args.endDate) {
            return null;
          }
        }

        const isOverdue = request.scheduledDate && request.scheduledDate < today &&
          !["completed", "cancelled"].includes(request.status);

        return {
          ...request,
          propertyName: property?.propertyName || property?.addressLine1,
          dwellingName: dwelling?.dwellingName,
          isOverdue,
        };
      })
    );

    const validRequests = enrichedRequests.filter(Boolean);

    const open = validRequests.filter((r) =>
      ["reported", "awaiting_quotes", "quoted", "approved", "scheduled", "in_progress"].includes(r?.status || "")
    );
    const completed = validRequests.filter((r) => r?.status === "completed");
    const overdue = validRequests.filter((r) => r?.isOverdue);

    return {
      requests: validRequests,
      summary: {
        total: validRequests.length,
        open: open.length,
        completed: completed.length,
        overdue: overdue.length,
        totalCost: completed.reduce((sum, r) => sum + (r?.actualCost || 0), 0),
      },
      byCategory: {
        plumbing: validRequests.filter((r) => r?.category === "plumbing").length,
        electrical: validRequests.filter((r) => r?.category === "electrical").length,
        appliances: validRequests.filter((r) => r?.category === "appliances").length,
        building: validRequests.filter((r) => r?.category === "building").length,
        grounds: validRequests.filter((r) => r?.category === "grounds").length,
        safety: validRequests.filter((r) => r?.category === "safety").length,
        general: validRequests.filter((r) => r?.category === "general").length,
      },
      byPriority: {
        urgent: validRequests.filter((r) => r?.priority === "urgent").length,
        high: validRequests.filter((r) => r?.priority === "high").length,
        medium: validRequests.filter((r) => r?.priority === "medium").length,
        low: validRequests.filter((r) => r?.priority === "low").length,
      },
    };
  },
});

// ============================================
// VACANCY REPORT
// ============================================

export const getVacancyReport = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);

    const dwellings = await ctx.db
      .query("dwellings")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
      .collect();
    const activeDwellings = dwellings.filter((d) => d.isActive);

    const enrichedDwellings = await Promise.all(
      activeDwellings.map(async (dwelling) => {
        const property = await ctx.db.get(dwelling.propertyId);

        const participants = await ctx.db
          .query("participants")
          .withIndex("by_dwelling", (q) => q.eq("dwellingId", dwelling._id))
          .filter((q) => q.eq(q.field("status"), "active"))
          .collect();

        const vacantSpots = dwelling.maxParticipants - participants.length;
        const isVacant = vacantSpots > 0;

        const avgMonthlySda = dwelling.sdaRegisteredAmount
          ? dwelling.sdaRegisteredAmount / 12 / dwelling.maxParticipants
          : 5000;

        return {
          dwellingId: dwelling._id,
          dwellingName: dwelling.dwellingName,
          propertyName: property?.propertyName || property?.addressLine1,
          address: property ? `${property.addressLine1}, ${property.suburb}` : "",
          maxParticipants: dwelling.maxParticipants,
          currentOccupancy: participants.length,
          vacantSpots,
          isVacant,
          occupancyRate: Math.round((participants.length / dwelling.maxParticipants) * 100),
          potentialMonthlyLoss: vacantSpots * avgMonthlySda,
          sdaCategory: dwelling.sdaDesignCategory,
        };
      })
    );

    const vacantDwellings = enrichedDwellings.filter((d) => d.isVacant);
    const fullyOccupied = enrichedDwellings.filter((d) => !d.isVacant);

    return {
      dwellings: enrichedDwellings,
      vacantDwellings,
      summary: {
        totalDwellings: enrichedDwellings.length,
        fullyOccupied: fullyOccupied.length,
        partiallyOccupied: vacantDwellings.filter((d) => d.currentOccupancy > 0).length,
        completelyVacant: vacantDwellings.filter((d) => d.currentOccupancy === 0).length,
        totalVacantSpots: vacantDwellings.reduce((sum, d) => sum + d.vacantSpots, 0),
        totalPotentialMonthlyLoss: vacantDwellings.reduce((sum, d) => sum + d.potentialMonthlyLoss, 0),
        overallOccupancyRate: enrichedDwellings.length > 0 ? Math.round(
          (enrichedDwellings.reduce((sum, d) => sum + d.currentOccupancy, 0) /
            enrichedDwellings.reduce((sum, d) => sum + d.maxParticipants, 0)) *
            100
        ) : 0,
      },
    };
  },
});

// ============================================
// INCIDENT SUMMARY REPORT
// ============================================

export const getIncidentSummary = query({
  args: {
    userId: v.id("users"),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    propertyId: v.optional(v.id("properties")),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);

    let incidents = await ctx.db
      .query("incidents")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
      .collect();

    if (args.propertyId) {
      incidents = incidents.filter((i) => i.propertyId === args.propertyId);
    }

    if (args.startDate && args.endDate) {
      incidents = incidents.filter(
        (i) => i.incidentDate >= args.startDate! && i.incidentDate <= args.endDate!
      );
    }

    const enrichedIncidents = await Promise.all(
      incidents.map(async (incident) => {
        const property = await ctx.db.get(incident.propertyId);
        const dwelling = incident.dwellingId ? await ctx.db.get(incident.dwellingId) : null;
        const participant = incident.participantId ? await ctx.db.get(incident.participantId) : null;

        return {
          ...incident,
          propertyName: property?.propertyName || property?.addressLine1,
          dwellingName: dwelling?.dwellingName,
          participantName: participant ? `${participant.firstName} ${participant.lastName}` : null,
        };
      })
    );

    return {
      incidents: enrichedIncidents.sort((a, b) =>
        new Date(b.incidentDate).getTime() - new Date(a.incidentDate).getTime()
      ),
      summary: {
        total: enrichedIncidents.length,
        open: enrichedIncidents.filter((i) => ["reported", "under_investigation"].includes(i.status)).length,
        resolved: enrichedIncidents.filter((i) => ["resolved", "closed"].includes(i.status)).length,
        reportedToNdis: enrichedIncidents.filter((i) => i.reportedToNdis).length,
      },
      byType: {
        injury: enrichedIncidents.filter((i) => i.incidentType === "injury").length,
        near_miss: enrichedIncidents.filter((i) => i.incidentType === "near_miss").length,
        property_damage: enrichedIncidents.filter((i) => i.incidentType === "property_damage").length,
        behavioral: enrichedIncidents.filter((i) => i.incidentType === "behavioral").length,
        medication: enrichedIncidents.filter((i) => i.incidentType === "medication").length,
        abuse_neglect: enrichedIncidents.filter((i) => i.incidentType === "abuse_neglect").length,
        complaint: enrichedIncidents.filter((i) => i.incidentType === "complaint").length,
        other: enrichedIncidents.filter((i) => i.incidentType === "other").length,
      },
      bySeverity: {
        critical: enrichedIncidents.filter((i) => i.severity === "critical").length,
        major: enrichedIncidents.filter((i) => i.severity === "major").length,
        moderate: enrichedIncidents.filter((i) => i.severity === "moderate").length,
        minor: enrichedIncidents.filter((i) => i.severity === "minor").length,
      },
    };
  },
});

// ============================================
// PARTICIPANT NDIS PLAN STATUS REPORT
// ============================================

export const getParticipantPlanStatus = query({
  args: {
    userId: v.id("users"),
    daysAhead: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);

    const daysAhead = args.daysAhead || 90;
    const today = new Date();
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + daysAhead);
    const todayStr = today.toISOString().split("T")[0];
    const futureDateStr = futureDate.toISOString().split("T")[0];

    const participants = await ctx.db
      .query("participants")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
      .collect();
    const activeParticipants = participants.filter((p) => p.status === "active");

    const enrichedParticipants = await Promise.all(
      activeParticipants.map(async (participant) => {
        const dwelling = participant.dwellingId ? await ctx.db.get(participant.dwellingId) : null;
        const property = dwelling ? await ctx.db.get(dwelling.propertyId) : null;

        const plans = await ctx.db
          .query("participantPlans")
          .withIndex("by_participant", (q) => q.eq("participantId", participant._id))
          .collect();

        const currentPlan = plans.find((p) => p.planStatus === "current");
        const pendingPlan = plans.find((p) => p.planStatus === "pending");

        let planStatus = "no_plan";
        let daysUntilExpiry = 0;

        if (currentPlan) {
          const endDate = new Date(currentPlan.planEndDate);
          daysUntilExpiry = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

          if (currentPlan.planEndDate < todayStr) {
            planStatus = "expired";
          } else if (currentPlan.planEndDate <= futureDateStr) {
            planStatus = "expiring_soon";
          } else {
            planStatus = "active";
          }
        }

        return {
          participantId: participant._id,
          participantName: `${participant.firstName} ${participant.lastName}`,
          ndisNumber: participant.ndisNumber,
          propertyName: property?.propertyName || property?.addressLine1,
          dwellingName: dwelling?.dwellingName,
          planStatus,
          planEndDate: currentPlan?.planEndDate,
          daysUntilExpiry,
          hasPendingPlan: !!pendingPlan,
          annualBudget: currentPlan?.annualSdaBudget || 0,
          fundingType: currentPlan?.fundingManagementType,
        };
      })
    );

    const expired = enrichedParticipants.filter((p) => p.planStatus === "expired");
    const expiringSoon = enrichedParticipants.filter((p) => p.planStatus === "expiring_soon");
    const active = enrichedParticipants.filter((p) => p.planStatus === "active");
    const noPlan = enrichedParticipants.filter((p) => p.planStatus === "no_plan");

    return {
      participants: enrichedParticipants.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry),
      summary: {
        total: enrichedParticipants.length,
        expired: expired.length,
        expiringSoon: expiringSoon.length,
        active: active.length,
        noPlan: noPlan.length,
      },
      byFundingType: {
        ndia_managed: enrichedParticipants.filter((p) => p.fundingType === "ndia_managed").length,
        plan_managed: enrichedParticipants.filter((p) => p.fundingType === "plan_managed").length,
        self_managed: enrichedParticipants.filter((p) => p.fundingType === "self_managed").length,
      },
    };
  },
});
