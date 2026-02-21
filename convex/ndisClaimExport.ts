import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireTenant } from "./authHelpers";
import { decryptField } from "./lib/encryption";

// Get provider settings
export const getProviderSettings = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);

    const allSettings = await ctx.db
      .query("providerSettings")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
      .collect();

    return allSettings[0] ?? null;
  },
});

// Save provider settings (create or update)
export const saveProviderSettings = mutation({
  args: {
    userId: v.id("users"),
    providerName: v.string(),
    ndisRegistrationNumber: v.string(),
    abn: v.string(),
    defaultGstCode: v.string(),
    defaultSupportItemNumber: v.string(),
    orgAbbreviation: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    address: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const { userId, ...settingsData } = args;

    const allSettings = await ctx.db
      .query("providerSettings")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
      .collect();

    const existing = allSettings[0];

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...settingsData,
        updatedAt: Date.now(),
      });
      return existing._id;
    } else {
      return await ctx.db.insert("providerSettings", {
        organizationId,
        ...settingsData,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  },
});

// Generate NDIS claim data for export
export const generateClaimData = query({
  args: {
    userId: v.id("users"),
    periodStart: v.string(),
    periodEnd: v.string(),
    participantIds: v.optional(v.array(v.id("participants"))),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);

    // Get provider settings for this organization
    const allSettings = await ctx.db
      .query("providerSettings")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
      .collect();
    const providerSettings = allSettings[0] ?? null;

    if (!providerSettings) {
      return { error: "Provider settings not configured", claims: [] };
    }

    // Get all active participants for this organization, or filter by IDs
    let participants;
    if (args.participantIds && args.participantIds.length > 0) {
      const fetched = await Promise.all(
        args.participantIds.map((id) => ctx.db.get(id))
      );
      // Filter to only participants belonging to this organization
      participants = fetched.filter((p) => p !== null && p.organizationId === organizationId);
    } else {
      const allParticipants = await ctx.db
        .query("participants")
        .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
        .collect();
      participants = allParticipants.filter((p) => p.status === "active");
    }

    // Validate and sanitize GSTCode — must be P1, P2, or P5 per NDIS spec
    const validGstCode = (code: string | undefined): string => {
      if (code === "P1" || code === "P2" || code === "P5") return code;
      return "P2"; // Default to P2 (GST Free) for SDA
    };

    // SDA design category → valid support item prefixes mapping
    // NDIS SDA support items follow a pattern where the category is encoded in the item number
    const SDA_CATEGORY_SUPPORT_ITEM_PREFIXES: Record<string, string[]> = {
      high_physical_support: ["01_011_0107_5_1_4", "01_011_0107"],
      fully_accessible: ["01_010_0107_5_1_4", "01_010_0107"],
      robust: ["01_013_0107_5_1_4", "01_013_0107"],
      improved_liveability: ["01_012_0107_5_1_4", "01_012_0107"],
    };

    // Today's date for ClaimReference format: FirstName_DDMMYY
    const now = new Date();
    const todayDDMMYY = `${String(now.getDate()).padStart(2, "0")}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getFullYear()).slice(2)}`;

    const claims = [];
    const warnings: Array<{ participantName: string; issue: string }> = [];

    for (const participant of participants) {
      if (!participant) continue;

      // Get the current plan for this participant
      const plan = await ctx.db
        .query("participantPlans")
        .withIndex("by_participant", (q) => q.eq("participantId", participant._id))
        .filter((q) => q.eq(q.field("planStatus"), "current"))
        .first();

      if (!plan) continue;

      // Look up dwelling's SDA design category for cross-validation
      let dwellingCategory: string | null = null;
      if (participant.dwellingId) {
        const dwelling = await ctx.db.get(participant.dwellingId);
        dwellingCategory = dwelling?.sdaDesignCategory || null;
      }

      // Use the monthly SDA amount directly (not calculated from daily rate)
      const unitPrice = plan.monthlySdaAmount || (plan.dailySdaRate ? plan.dailySdaRate * 30 : 0);

      // ClaimReference format: FirstName_DDMMYY (alphanumeric, /, _, - only, max 50 chars)
      const claimRef = `${participant.firstName}_${todayDDMMYY}`.replace(/[^a-zA-Z0-9/_-]/g, "").substring(0, 50);

      // SupportNumber — must not be empty
      const supportNumber = plan.supportItemNumber || providerSettings.defaultSupportItemNumber || "";

      // SDA category vs support item cross-validation (N14)
      let sdaCategoryMismatch = false;
      if (dwellingCategory && supportNumber && SDA_CATEGORY_SUPPORT_ITEM_PREFIXES[dwellingCategory]) {
        const validPrefixes = SDA_CATEGORY_SUPPORT_ITEM_PREFIXES[dwellingCategory];
        const matchesAny = validPrefixes.some(prefix => supportNumber.startsWith(prefix));
        if (!matchesAny) {
          sdaCategoryMismatch = true;
          const categoryLabel = dwellingCategory.replace(/_/g, " ");
          warnings.push({
            participantName: `${participant.firstName} ${participant.lastName}`,
            issue: `Dwelling SDA category "${categoryLabel}" may not match support item "${supportNumber}". Please verify.`,
          });
        }
      }

      claims.push({
        // Strip spaces from RegistrationNumber (stored as "405 005 2336", must be "4050052336")
        RegistrationNumber: (providerSettings.ndisRegistrationNumber || "").replace(/\s/g, ""),
        NDISNumber: await (async () => {
          const decrypted = await decryptField(participant.ndisNumber);
          // Never leak encrypted values - return empty string if decryption fails
          if (!decrypted || decrypted === "[encrypted]" || decrypted.startsWith("enc:")) {
            console.error(`[NDIS Export] Decryption failed for participant ${participant._id}. Check ENCRYPTION_KEY env var.`);
            return "";
          }
          return decrypted;
        })(),
        SupportsDeliveredFrom: args.periodStart,
        SupportsDeliveredTo: args.periodEnd,
        SupportNumber: supportNumber,
        ClaimReference: claimRef,
        Quantity: 1,
        Hours: "",
        UnitPrice: unitPrice.toFixed(2),
        GSTCode: validGstCode(providerSettings.defaultGstCode),
        AuthorisedBy: "",
        ParticipantApproved: "",
        InKindFundingProgram: "",
        ClaimType: "",
        CancellationReason: "",
        // Strip spaces from ABN (stored as "87 630 237 277", must be "87630237277")
        "ABN of Support Provider": (providerSettings.abn || "").replace(/\s/g, ""),
        // Additional metadata for display (not in CSV)
        _participantName: `${participant.firstName} ${participant.lastName}`,
        _monthlyAmount: plan.monthlySdaAmount || 0,
        _annualBudget: plan.annualSdaBudget,
        _claimDay: plan.claimDay || null,
        _sdaCategoryMismatch: sdaCategoryMismatch,
      });
    }

    return {
      claims,
      warnings, // SDA category vs support item mismatch warnings (N14)
      providerSettings: {
        ...providerSettings,
        // Return sanitized values so client-side doesn't need to re-strip
        ndisRegistrationNumber: (providerSettings.ndisRegistrationNumber || "").replace(/\s/g, ""),
        abn: (providerSettings.abn || "").replace(/\s/g, ""),
        defaultGstCode: validGstCode(providerSettings.defaultGstCode),
        orgAbbreviation: (providerSettings as any).orgAbbreviation || "",
      },
    };
  },
});

// Get active participants for selection
export const getActiveParticipantsForClaim = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);

    const allParticipants = await ctx.db
      .query("participants")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
      .collect();
    const participants = allParticipants.filter((p) => p.status === "active");

    // Get their current plans
    const participantsWithPlans = await Promise.all(
      participants.map(async (p) => {
        const plan = await ctx.db
          .query("participantPlans")
          .withIndex("by_participant", (q) => q.eq("participantId", p._id))
          .filter((q) => q.eq(q.field("planStatus"), "current"))
          .first();

        return {
          ...p,
          hasPlan: !!plan,
          monthlyAmount: plan?.monthlySdaAmount || 0,
          annualBudget: plan?.annualSdaBudget || 0,
          claimDay: plan?.claimDay || null,
          supportItemNumber: plan?.supportItemNumber || null,
          planStartDate: plan?.planStartDate || null,
        };
      })
    );

    return participantsWithPlans;
  },
});
