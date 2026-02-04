import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { requirePermission } from "./authHelpers";

// Generate upload URL for attachments
export const generateUploadUrl = mutation(async (ctx) => {
  return await ctx.storage.generateUploadUrl();
});

// Create a new communication log entry
export const create = mutation({
  args: {
    communicationType: v.union(
      v.literal("email"),
      v.literal("sms"),
      v.literal("phone_call"),
      v.literal("meeting"),
      v.literal("other")
    ),
    direction: v.union(v.literal("sent"), v.literal("received")),
    communicationDate: v.string(),
    communicationTime: v.optional(v.string()),
    contactType: v.union(
      v.literal("ndia"),
      v.literal("support_coordinator"),
      v.literal("sil_provider"),
      v.literal("participant"),
      v.literal("family"),
      v.literal("plan_manager"),
      v.literal("ot"),
      v.literal("contractor"),
      v.literal("other")
    ),
    contactName: v.string(),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    subject: v.optional(v.string()),
    summary: v.string(),
    linkedParticipantId: v.optional(v.id("participants")),
    linkedPropertyId: v.optional(v.id("properties")),
    attachmentStorageId: v.optional(v.id("_storage")),
    attachmentFileName: v.optional(v.string()),
    attachmentFileType: v.optional(v.string()),
    createdBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, args.createdBy, "communications", "create");

    const now = Date.now();
    const communicationId = await ctx.db.insert("communications", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });

    // Audit log
    await ctx.runMutation(internal.auditLog.log, {
      userId: user._id,
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`,
      action: "create",
      entityType: "communication",
      entityId: communicationId,
      entityName: `${args.communicationType} - ${args.contactName}`,
      metadata: JSON.stringify({
        communicationType: args.communicationType,
        direction: args.direction,
        contactType: args.contactType,
        linkedParticipantId: args.linkedParticipantId,
      }),
    });

    return communicationId;
  },
});

// Update a communication
export const update = mutation({
  args: {
    id: v.id("communications"),
    communicationType: v.optional(
      v.union(
        v.literal("email"),
        v.literal("sms"),
        v.literal("phone_call"),
        v.literal("meeting"),
        v.literal("other")
      )
    ),
    direction: v.optional(v.union(v.literal("sent"), v.literal("received"))),
    communicationDate: v.optional(v.string()),
    communicationTime: v.optional(v.string()),
    contactType: v.optional(
      v.union(
        v.literal("ndia"),
        v.literal("support_coordinator"),
        v.literal("sil_provider"),
        v.literal("participant"),
        v.literal("family"),
        v.literal("plan_manager"),
        v.literal("ot"),
        v.literal("contractor"),
        v.literal("other")
      )
    ),
    contactName: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    subject: v.optional(v.string()),
    summary: v.optional(v.string()),
    linkedParticipantId: v.optional(v.id("participants")),
    linkedPropertyId: v.optional(v.id("properties")),
    attachmentStorageId: v.optional(v.id("_storage")),
    attachmentFileName: v.optional(v.string()),
    attachmentFileType: v.optional(v.string()),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { id, userId, ...updates } = args;
    const user = await requirePermission(ctx, userId, "communications", "update");

    const existing = await ctx.db.get(id);
    if (!existing) {
      throw new Error("Communication not found");
    }

    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });

    // Audit log
    await ctx.runMutation(internal.auditLog.log, {
      userId: user._id,
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`,
      action: "update",
      entityType: "communication",
      entityId: id,
      entityName: updates.contactName || existing.contactName,
      changes: JSON.stringify(updates),
    });

    return id;
  },
});

// Delete a communication
export const remove = mutation({
  args: {
    id: v.id("communications"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, args.userId, "communications", "delete");

    const communication = await ctx.db.get(args.id);
    if (!communication) {
      throw new Error("Communication not found");
    }

    // Delete attachment if exists
    if (communication.attachmentStorageId) {
      await ctx.storage.delete(communication.attachmentStorageId);
    }

    await ctx.db.delete(args.id);

    // Audit log
    await ctx.runMutation(internal.auditLog.log, {
      userId: user._id,
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`,
      action: "delete",
      entityType: "communication",
      entityId: args.id,
      entityName: `${communication.communicationType} - ${communication.contactName}`,
    });
  },
});

// Get all communications with enriched data
export const getAll = query({
  handler: async (ctx) => {
    const communications = await ctx.db
      .query("communications")
      .order("desc")
      .collect();

    // Collect unique IDs for batch fetching
    const participantIds = [...new Set(communications.map((c) => c.linkedParticipantId).filter(Boolean))];
    const propertyIds = [...new Set(communications.map((c) => c.linkedPropertyId).filter(Boolean))];
    const userIds = [...new Set(communications.map((c) => c.createdBy))];

    // Batch fetch related entities
    const [participants, properties, users] = await Promise.all([
      Promise.all(participantIds.map((id) => ctx.db.get(id!))),
      Promise.all(propertyIds.map((id) => ctx.db.get(id!))),
      Promise.all(userIds.map((id) => ctx.db.get(id))),
    ]);

    // Create lookup maps
    const participantMap = new Map(participants.filter(Boolean).map((p) => [p!._id, p]));
    const propertyMap = new Map(properties.filter(Boolean).map((p) => [p!._id, p]));
    const userMap = new Map(users.filter(Boolean).map((u) => [u!._id, u]));

    // Enrich communications with related data
    const enrichedCommunications = await Promise.all(
      communications.map(async (comm) => {
        let attachmentUrl = null;
        if (comm.attachmentStorageId) {
          attachmentUrl = await ctx.storage.getUrl(comm.attachmentStorageId);
        }

        return {
          ...comm,
          participant: comm.linkedParticipantId ? participantMap.get(comm.linkedParticipantId) : null,
          property: comm.linkedPropertyId ? propertyMap.get(comm.linkedPropertyId) : null,
          createdByUser: userMap.get(comm.createdBy),
          attachmentUrl,
        };
      })
    );

    return enrichedCommunications;
  },
});

// Get communication by ID
export const getById = query({
  args: { id: v.id("communications") },
  handler: async (ctx, args) => {
    const communication = await ctx.db.get(args.id);
    if (!communication) return null;

    const [participant, property, createdByUser] = await Promise.all([
      communication.linkedParticipantId ? ctx.db.get(communication.linkedParticipantId) : null,
      communication.linkedPropertyId ? ctx.db.get(communication.linkedPropertyId) : null,
      ctx.db.get(communication.createdBy),
    ]);

    let attachmentUrl = null;
    if (communication.attachmentStorageId) {
      attachmentUrl = await ctx.storage.getUrl(communication.attachmentStorageId);
    }

    return {
      ...communication,
      participant,
      property,
      createdByUser,
      attachmentUrl,
    };
  },
});

// Get communications by participant
export const getByParticipant = query({
  args: { participantId: v.id("participants") },
  handler: async (ctx, args) => {
    const communications = await ctx.db
      .query("communications")
      .withIndex("by_participant", (q) => q.eq("linkedParticipantId", args.participantId))
      .order("desc")
      .collect();

    return communications;
  },
});

// Get communications by property
export const getByProperty = query({
  args: { propertyId: v.id("properties") },
  handler: async (ctx, args) => {
    const communications = await ctx.db
      .query("communications")
      .withIndex("by_property", (q) => q.eq("linkedPropertyId", args.propertyId))
      .order("desc")
      .collect();

    return communications;
  },
});

// Get recent communications (for dashboard)
export const getRecent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;

    const communications = await ctx.db
      .query("communications")
      .order("desc")
      .take(limit);

    // Batch fetch participants
    const participantIds = [...new Set(communications.map((c) => c.linkedParticipantId).filter(Boolean))];
    const participants = await Promise.all(participantIds.map((id) => ctx.db.get(id!)));
    const participantMap = new Map(participants.filter(Boolean).map((p) => [p!._id, p]));

    return communications.map((comm) => ({
      ...comm,
      participant: comm.linkedParticipantId ? participantMap.get(comm.linkedParticipantId) : null,
    }));
  },
});

// Get communications stats
export const getStats = query({
  handler: async (ctx) => {
    const communications = await ctx.db.query("communications").collect();

    const today = new Date().toISOString().split("T")[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const stats = {
      total: communications.length,
      thisWeek: communications.filter((c) => c.communicationDate >= weekAgo).length,
      byType: {
        email: communications.filter((c) => c.communicationType === "email").length,
        sms: communications.filter((c) => c.communicationType === "sms").length,
        phone_call: communications.filter((c) => c.communicationType === "phone_call").length,
        meeting: communications.filter((c) => c.communicationType === "meeting").length,
        other: communications.filter((c) => c.communicationType === "other").length,
      },
      byContactType: {
        ndia: communications.filter((c) => c.contactType === "ndia").length,
        support_coordinator: communications.filter((c) => c.contactType === "support_coordinator").length,
        plan_manager: communications.filter((c) => c.contactType === "plan_manager").length,
        participant: communications.filter((c) => c.contactType === "participant").length,
        family: communications.filter((c) => c.contactType === "family").length,
        sil_provider: communications.filter((c) => c.contactType === "sil_provider").length,
        ot: communications.filter((c) => c.contactType === "ot").length,
        contractor: communications.filter((c) => c.contactType === "contractor").length,
        other: communications.filter((c) => c.contactType === "other").length,
      },
    };

    return stats;
  },
});
