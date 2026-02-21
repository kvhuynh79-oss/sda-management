import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { requirePermission, requireTenant, requireActiveSubscription } from "./authHelpers";

// ============================================================================
// N4: Staff Training & Competency Tracking
// ============================================================================

// Mandatory training categories for NDIS workers
const MANDATORY_TRAINING = [
  "ndis_orientation",
  "first_aid",
  "manual_handling",
  "fire_safety",
  "infection_control",
];

const CATEGORY_LABELS: Record<string, string> = {
  ndis_orientation: "NDIS Worker Orientation",
  first_aid: "First Aid & CPR",
  manual_handling: "Manual Handling",
  medication_management: "Medication Management",
  behaviour_support: "Behaviour Support",
  fire_safety: "Fire Safety",
  infection_control: "Infection Control",
  restrictive_practices: "Restrictive Practices",
  cultural_competency: "Cultural Competency",
  other: "Other",
};

const TRAINING_TYPE_LABELS: Record<string, string> = {
  mandatory: "Mandatory",
  recommended: "Recommended",
  specialised: "Specialised",
};

const RATING_LABELS: Record<string, string> = {
  not_competent: "Not Competent",
  developing: "Developing",
  competent: "Competent",
  advanced: "Advanced",
};

// ── Training Queries ─────────────────────────────────────────────────────────

export const getAll = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    await requirePermission(ctx, args.userId, "staffTraining", "view");

    const records = await ctx.db
      .query("staffTraining")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
      .collect();

    // Enrich with staff names
    const staffIds = [...new Set(records.map((r) => r.staffId))];
    const staffMembers = await Promise.all(staffIds.map((id) => ctx.db.get(id)));
    const staffMap = new Map(staffMembers.map((s, i) => [staffIds[i], s]));

    return records.map((r) => {
      const staff = staffMap.get(r.staffId);
      return {
        ...r,
        staffName: staff ? `${staff.firstName} ${staff.lastName}` : "Unknown",
        categoryLabel: CATEGORY_LABELS[r.category] || r.category,
        trainingTypeLabel: TRAINING_TYPE_LABELS[r.trainingType] || r.trainingType,
      };
    });
  },
});

export const getByStaff = query({
  args: {
    staffId: v.id("users"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireTenant(ctx, args.userId);
    await requirePermission(ctx, args.userId, "staffTraining", "view");

    const records = await ctx.db
      .query("staffTraining")
      .withIndex("by_staffId", (q) => q.eq("staffId", args.staffId))
      .collect();

    return records.map((r) => ({
      ...r,
      categoryLabel: CATEGORY_LABELS[r.category] || r.category,
      trainingTypeLabel: TRAINING_TYPE_LABELS[r.trainingType] || r.trainingType,
    }));
  },
});

export const getDashboardStats = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    await requirePermission(ctx, args.userId, "staffTraining", "view");

    const records = await ctx.db
      .query("staffTraining")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
      .collect();

    // Get all active staff in org
    const orgUsers = await ctx.db
      .query("users")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
      .collect();
    const activeStaff = orgUsers.filter((u) => u.isActive && u.role !== "sil_provider");
    const staffCount = activeStaff.length;

    const today = new Date().toISOString().split("T")[0];
    const thirtyDays = new Date();
    thirtyDays.setDate(thirtyDays.getDate() + 30);
    const thirtyDaysStr = thirtyDays.toISOString().split("T")[0];

    const completed = records.filter((r) => r.status === "completed").length;
    const expired = records.filter((r) => r.status === "expired" || (r.expiryDate && r.expiryDate < today && r.status === "completed")).length;
    const expiring = records.filter(
      (r) => r.status === "completed" && r.expiryDate && r.expiryDate >= today && r.expiryDate <= thirtyDaysStr
    ).length;

    // Calculate compliance: how many staff have ALL mandatory training current
    let compliantStaff = 0;
    for (const staff of activeStaff) {
      const staffRecords = records.filter((r) => r.staffId === staff._id);
      const allMandatoryComplete = MANDATORY_TRAINING.every((cat) => {
        const record = staffRecords.find((r) => r.category === cat && r.status === "completed");
        if (!record) return false;
        if (record.expiryDate && record.expiryDate < today) return false;
        return true;
      });
      if (allMandatoryComplete) compliantStaff++;
    }

    const compliancePercentage = staffCount > 0
      ? Math.round((compliantStaff / staffCount) * 100)
      : 0;

    return {
      totalRecords: records.length,
      completed,
      expired,
      expiring,
      staffCount,
      compliantStaff,
      compliancePercentage,
    };
  },
});

/**
 * Training matrix: all staff x mandatory training categories
 */
export const getTrainingMatrix = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    await requirePermission(ctx, args.userId, "staffTraining", "view");

    const orgUsers = await ctx.db
      .query("users")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
      .collect();
    const activeStaff = orgUsers.filter((u) => u.isActive && u.role !== "sil_provider");

    const allRecords = await ctx.db
      .query("staffTraining")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
      .collect();

    const today = new Date().toISOString().split("T")[0];
    const thirtyDays = new Date();
    thirtyDays.setDate(thirtyDays.getDate() + 30);
    const thirtyDaysStr = thirtyDays.toISOString().split("T")[0];

    const matrix = activeStaff.map((staff) => {
      const staffRecords = allRecords.filter((r) => r.staffId === staff._id);
      const categories: Record<string, { status: string; expiryDate?: string; completedDate?: string }> = {};

      for (const cat of MANDATORY_TRAINING) {
        const record = staffRecords.find((r) => r.category === cat);
        if (!record) {
          categories[cat] = { status: "missing" };
        } else if (record.status === "completed" && record.expiryDate) {
          if (record.expiryDate < today) {
            categories[cat] = { status: "expired", expiryDate: record.expiryDate, completedDate: record.completedDate };
          } else if (record.expiryDate <= thirtyDaysStr) {
            categories[cat] = { status: "expiring", expiryDate: record.expiryDate, completedDate: record.completedDate };
          } else {
            categories[cat] = { status: "current", expiryDate: record.expiryDate, completedDate: record.completedDate };
          }
        } else if (record.status === "completed") {
          categories[cat] = { status: "current", completedDate: record.completedDate };
        } else {
          categories[cat] = { status: record.status };
        }
      }

      return {
        staffId: staff._id,
        staffName: `${staff.firstName} ${staff.lastName}`,
        role: staff.role,
        categories,
      };
    });

    return {
      matrix,
      mandatoryCategories: MANDATORY_TRAINING.map((cat) => ({
        key: cat,
        label: CATEGORY_LABELS[cat] || cat,
      })),
    };
  },
});

// ── Training Mutations ───────────────────────────────────────────────────────

export const create = mutation({
  args: {
    userId: v.id("users"),
    staffId: v.id("users"),
    trainingName: v.string(),
    trainingType: v.union(v.literal("mandatory"), v.literal("recommended"), v.literal("specialised")),
    category: v.union(
      v.literal("ndis_orientation"),
      v.literal("first_aid"),
      v.literal("manual_handling"),
      v.literal("medication_management"),
      v.literal("behaviour_support"),
      v.literal("fire_safety"),
      v.literal("infection_control"),
      v.literal("restrictive_practices"),
      v.literal("cultural_competency"),
      v.literal("other")
    ),
    provider: v.optional(v.string()),
    completedDate: v.optional(v.string()),
    expiryDate: v.optional(v.string()),
    status: v.union(v.literal("not_started"), v.literal("in_progress"), v.literal("completed"), v.literal("expired")),
    certificateStorageId: v.optional(v.id("_storage")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, args.userId, "staffTraining", "create");
    const { organizationId } = await requireTenant(ctx, args.userId);
    const auditUser = { userId: user._id, userEmail: user.email, userName: `${user.firstName} ${user.lastName}` };
    await requireActiveSubscription(ctx, organizationId, auditUser);

    const now = Date.now();
    const id = await ctx.db.insert("staffTraining", {
      organizationId,
      staffId: args.staffId,
      trainingName: args.trainingName,
      trainingType: args.trainingType,
      category: args.category,
      provider: args.provider,
      completedDate: args.completedDate,
      expiryDate: args.expiryDate,
      status: args.status,
      certificateStorageId: args.certificateStorageId,
      notes: args.notes,
      createdBy: args.userId,
      createdAt: now,
      updatedAt: now,
    });

    // Audit log
    await ctx.runMutation(internal.auditLog.log, {
      organizationId,
      userId: user._id,
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`,
      action: "create",
      entityType: "staff_training",
      entityId: id,
      entityName: args.trainingName,
      metadata: JSON.stringify({ staffId: args.staffId, category: args.category }),
    });

    return id;
  },
});

export const update = mutation({
  args: {
    id: v.id("staffTraining"),
    userId: v.id("users"),
    trainingName: v.optional(v.string()),
    provider: v.optional(v.string()),
    completedDate: v.optional(v.string()),
    expiryDate: v.optional(v.string()),
    status: v.optional(v.union(v.literal("not_started"), v.literal("in_progress"), v.literal("completed"), v.literal("expired"))),
    certificateStorageId: v.optional(v.id("_storage")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, args.userId, "staffTraining", "update");
    const { organizationId } = await requireTenant(ctx, args.userId);
    const auditUser = { userId: user._id, userEmail: user.email, userName: `${user.firstName} ${user.lastName}` };
    await requireActiveSubscription(ctx, organizationId, auditUser);

    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error("Training record not found");
    }

    const { id, userId, ...updates } = args;
    const filteredUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filteredUpdates[key] = value;
      }
    }
    filteredUpdates.updatedAt = Date.now();

    await ctx.db.patch(args.id, filteredUpdates);

    await ctx.runMutation(internal.auditLog.log, {
      organizationId,
      userId: user._id,
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`,
      action: "update",
      entityType: "staff_training",
      entityId: args.id,
      entityName: existing.trainingName,
      changes: JSON.stringify(filteredUpdates),
    });

    return args.id;
  },
});

export const remove = mutation({
  args: {
    id: v.id("staffTraining"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, args.userId, "staffTraining", "delete");
    const { organizationId } = await requireTenant(ctx, args.userId);
    const auditUser = { userId: user._id, userEmail: user.email, userName: `${user.firstName} ${user.lastName}` };
    await requireActiveSubscription(ctx, organizationId, auditUser);

    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error("Training record not found");
    }

    await ctx.db.delete(args.id);

    await ctx.runMutation(internal.auditLog.log, {
      organizationId,
      userId: user._id,
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`,
      action: "delete",
      entityType: "staff_training",
      entityId: args.id,
      entityName: existing.trainingName,
    });
  },
});

// ── Competency Queries ───────────────────────────────────────────────────────

export const getCompetencies = query({
  args: {
    staffId: v.id("users"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireTenant(ctx, args.userId);
    await requirePermission(ctx, args.userId, "staffTraining", "view");

    const competencies = await ctx.db
      .query("staffCompetencies")
      .withIndex("by_staffId", (q) => q.eq("staffId", args.staffId))
      .collect();

    const enriched = await Promise.all(
      competencies.map(async (c) => {
        const assessor = await ctx.db.get(c.assessedBy);
        return {
          ...c,
          assessorName: assessor ? `${assessor.firstName} ${assessor.lastName}` : "Unknown",
          ratingLabel: RATING_LABELS[c.rating] || c.rating,
        };
      })
    );

    return enriched;
  },
});

export const createCompetency = mutation({
  args: {
    userId: v.id("users"),
    staffId: v.id("users"),
    competencyName: v.string(),
    assessedDate: v.string(),
    rating: v.union(v.literal("not_competent"), v.literal("developing"), v.literal("competent"), v.literal("advanced")),
    nextAssessmentDate: v.string(),
    evidence: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, args.userId, "staffTraining", "create");
    const { organizationId } = await requireTenant(ctx, args.userId);
    const auditUser = { userId: user._id, userEmail: user.email, userName: `${user.firstName} ${user.lastName}` };
    await requireActiveSubscription(ctx, organizationId, auditUser);

    const id = await ctx.db.insert("staffCompetencies", {
      organizationId,
      staffId: args.staffId,
      competencyName: args.competencyName,
      assessedBy: args.userId,
      assessedDate: args.assessedDate,
      rating: args.rating,
      nextAssessmentDate: args.nextAssessmentDate,
      evidence: args.evidence,
      notes: args.notes,
      createdAt: Date.now(),
    });

    await ctx.runMutation(internal.auditLog.log, {
      organizationId,
      userId: user._id,
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`,
      action: "create",
      entityType: "staff_competency",
      entityId: id,
      entityName: args.competencyName,
      metadata: JSON.stringify({ staffId: args.staffId, rating: args.rating }),
    });

    return id;
  },
});

export const updateCompetency = mutation({
  args: {
    id: v.id("staffCompetencies"),
    userId: v.id("users"),
    rating: v.optional(v.union(v.literal("not_competent"), v.literal("developing"), v.literal("competent"), v.literal("advanced"))),
    nextAssessmentDate: v.optional(v.string()),
    evidence: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, args.userId, "staffTraining", "update");
    const { organizationId } = await requireTenant(ctx, args.userId);

    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error("Competency record not found");
    }

    const { id, userId, ...updates } = args;
    const filteredUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filteredUpdates[key] = value;
      }
    }

    // Update assessedBy and assessedDate on re-assessment
    if (args.rating) {
      filteredUpdates.assessedBy = args.userId;
      filteredUpdates.assessedDate = new Date().toISOString().split("T")[0];
    }

    await ctx.db.patch(args.id, filteredUpdates);

    await ctx.runMutation(internal.auditLog.log, {
      organizationId,
      userId: user._id,
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`,
      action: "update",
      entityType: "staff_competency",
      entityId: args.id,
      entityName: existing.competencyName,
      changes: JSON.stringify(filteredUpdates),
    });

    return args.id;
  },
});
