import { query } from "./_generated/server";
import { v } from "convex/values";

// Get compliance report for preventative schedules
export const getComplianceReport = query({
  args: {
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const allSchedules = await ctx.db.query("preventativeSchedule").collect();
    const activeSchedules = allSchedules.filter((s) => s.isActive);

    const today = new Date();
    const startDate = args.startDate ? new Date(args.startDate) : new Date(today.getFullYear(), 0, 1);
    const endDate = args.endDate ? new Date(args.endDate) : today;

    // Get all maintenance records created from preventative schedules
    const maintenanceRecords = await ctx.db.query("maintenanceRequests").collect();
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
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const today = new Date();
    const startDate = args.startDate ? new Date(args.startDate) : new Date(today.getFullYear(), 0, 1);
    const endDate = args.endDate ? new Date(args.endDate) : today;

    // Get completed maintenance from preventative schedules
    const maintenanceRecords = await ctx.db.query("maintenanceRequests").collect();
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
    const allSchedules = await ctx.db.query("preventativeSchedule").collect();
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
  args: {},
  handler: async (ctx) => {
    const maintenanceRecords = await ctx.db.query("maintenanceRequests").collect();
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
