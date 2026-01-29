import { v } from "convex/values";
import { query } from "./_generated/server";

// Calculate owner distributions for a given month
export const calculateDistributions = query({
  args: {
    month: v.string(), // Format: YYYY-MM
  },
  handler: async (ctx, args) => {
    // Get all active participants
    const participants = await ctx.db
      .query("participants")
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    // Get all properties and owners
    const properties = await ctx.db.query("properties").collect();
    const owners = await ctx.db.query("owners").collect();
    const dwellings = await ctx.db.query("dwellings").collect();

    // Build distribution data grouped by owner
    const ownerDistributions: Record<string, {
      owner: typeof owners[0];
      properties: {
        property: typeof properties[0];
        participants: {
          participant: typeof participants[0];
          plan: any;
          dwelling: typeof dwellings[0] | null;
          monthlySda: number;
          monthlyRrc: number;
          totalIncome: number;
          managementFee: number;
          ownerPayment: number;
          managementFeePercent: number;
        }[];
        totalSda: number;
        totalRrc: number;
        totalIncome: number;
        totalManagementFee: number;
        totalOwnerPayment: number;
      }[];
      grandTotalSda: number;
      grandTotalRrc: number;
      grandTotalIncome: number;
      grandTotalManagementFee: number;
      grandTotalOwnerPayment: number;
    }> = {};

    for (const participant of participants) {
      // Get current plan
      const plan = await ctx.db
        .query("participantPlans")
        .withIndex("by_participant", (q) => q.eq("participantId", participant._id))
        .filter((q) => q.eq(q.field("planStatus"), "current"))
        .first();

      if (!plan) continue;

      // Get dwelling and property
      const dwelling = dwellings.find((d) => d._id === participant.dwellingId);
      if (!dwelling) continue;

      const property = properties.find((p) => p._id === dwelling.propertyId);
      if (!property) continue;

      const owner = owners.find((o) => o._id === property.ownerId);
      if (!owner) continue;

      // Calculate amounts
      const monthlySda = plan.monthlySdaAmount || 0;

      // Convert RRC to monthly if needed
      let monthlyRrc = 0;
      if (plan.reasonableRentContribution) {
        switch (plan.rentContributionFrequency) {
          case "weekly":
            monthlyRrc = plan.reasonableRentContribution * 4.33; // Average weeks per month
            break;
          case "fortnightly":
            monthlyRrc = plan.reasonableRentContribution * 2.17; // Average fortnights per month
            break;
          case "monthly":
          default:
            monthlyRrc = plan.reasonableRentContribution;
        }
      }

      const totalIncome = monthlySda + monthlyRrc;
      // Get management fee from property (same for all participants at this property)
      const managementFeePercent = property.managementFeePercent ?? 0;
      const managementFee = totalIncome * (managementFeePercent / 100);
      const ownerPayment = totalIncome - managementFee;

      // Initialize owner entry if needed
      const ownerId = owner._id.toString();
      if (!ownerDistributions[ownerId]) {
        ownerDistributions[ownerId] = {
          owner,
          properties: [],
          grandTotalSda: 0,
          grandTotalRrc: 0,
          grandTotalIncome: 0,
          grandTotalManagementFee: 0,
          grandTotalOwnerPayment: 0,
        };
      }

      // Find or create property entry
      const propertyId = property._id.toString();
      let propertyEntry = ownerDistributions[ownerId].properties.find(
        (p) => p.property._id.toString() === propertyId
      );

      if (!propertyEntry) {
        propertyEntry = {
          property,
          participants: [],
          totalSda: 0,
          totalRrc: 0,
          totalIncome: 0,
          totalManagementFee: 0,
          totalOwnerPayment: 0,
        };
        ownerDistributions[ownerId].properties.push(propertyEntry);
      }

      // Add participant to property
      propertyEntry.participants.push({
        participant,
        plan,
        dwelling,
        monthlySda,
        monthlyRrc,
        totalIncome,
        managementFee,
        ownerPayment,
        managementFeePercent,
      });

      // Update property totals
      propertyEntry.totalSda += monthlySda;
      propertyEntry.totalRrc += monthlyRrc;
      propertyEntry.totalIncome += totalIncome;
      propertyEntry.totalManagementFee += managementFee;
      propertyEntry.totalOwnerPayment += ownerPayment;

      // Update owner grand totals
      ownerDistributions[ownerId].grandTotalSda += monthlySda;
      ownerDistributions[ownerId].grandTotalRrc += monthlyRrc;
      ownerDistributions[ownerId].grandTotalIncome += totalIncome;
      ownerDistributions[ownerId].grandTotalManagementFee += managementFee;
      ownerDistributions[ownerId].grandTotalOwnerPayment += ownerPayment;
    }

    // Convert to array and calculate company totals
    const distributions = Object.values(ownerDistributions);

    const companyTotals = {
      totalSda: distributions.reduce((sum, d) => sum + d.grandTotalSda, 0),
      totalRrc: distributions.reduce((sum, d) => sum + d.grandTotalRrc, 0),
      totalIncome: distributions.reduce((sum, d) => sum + d.grandTotalIncome, 0),
      totalManagementFee: distributions.reduce((sum, d) => sum + d.grandTotalManagementFee, 0),
      totalOwnerPayment: distributions.reduce((sum, d) => sum + d.grandTotalOwnerPayment, 0),
    };

    return {
      month: args.month,
      distributions,
      companyTotals,
    };
  },
});
