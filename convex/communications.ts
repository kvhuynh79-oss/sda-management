import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { requirePermission } from "./authHelpers";
import {
  findOrCreateThread,
  THREADING_THRESHOLDS,
  type CommunicationForThreading
} from "./lib/threadingEngine";
import {
  checkConsultationGate,
  getGateTriggerSummary,
  type CommunicationForGate
} from "./lib/consultationGate";

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
    linkedIncidentId: v.optional(v.id("incidents")),
    attachmentStorageId: v.optional(v.id("_storage")),
    attachmentFileName: v.optional(v.string()),
    attachmentFileType: v.optional(v.string()),
    // Stakeholder linking (DB record)
    stakeholderEntityType: v.optional(v.union(
      v.literal("support_coordinator"),
      v.literal("sil_provider"),
      v.literal("occupational_therapist"),
      v.literal("contractor"),
      v.literal("participant")
    )),
    stakeholderEntityId: v.optional(v.string()),
    // NDIS Compliance
    complianceCategory: v.optional(v.union(
      v.literal("routine"),
      v.literal("incident_related"),
      v.literal("complaint"),
      v.literal("safeguarding"),
      v.literal("plan_review"),
      v.literal("access_request"),
      v.literal("quality_audit"),
      v.literal("advocacy"),
      v.literal("none")
    )),
    complianceFlags: v.optional(v.array(v.union(
      v.literal("requires_documentation"),
      v.literal("time_sensitive"),
      v.literal("escalation_required"),
      v.literal("ndia_reportable"),
      v.literal("legal_hold")
    ))),
    createdBy: v.id("users"),
    skipConsultationGate: v.optional(v.boolean()), // Admin/property_manager can bypass gate
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, args.createdBy, "communications", "create");

    const now = Date.now();

    // THREADING: Find or create thread for this communication
    let threadResult: { threadId: string; isNewThread: boolean; matchScore: number; reason: string };

    if (args.linkedParticipantId) {
      // Fetch recent communications (12-hour window) for same participant
      const twelveHoursAgo = now - THREADING_THRESHOLDS.TIME_WINDOW_MS;
      const recentComms = await ctx.db
        .query("communications")
        .withIndex("by_participant", (q) => q.eq("linkedParticipantId", args.linkedParticipantId))
        .filter((q) => q.gte(q.field("createdAt"), twelveHoursAgo))
        .collect();

      // Map to threading interface
      const recentCommForThreading: CommunicationForThreading[] = recentComms.map(comm => ({
        _id: comm._id,
        contactName: comm.contactName,
        subject: comm.subject,
        communicationType: comm.communicationType,
        communicationDate: comm.communicationDate,
        communicationTime: comm.communicationTime,
        createdAt: comm.createdAt,
        threadId: comm.threadId,
        participantId: comm.participantId || comm.linkedParticipantId,
      }));

      // Find matching thread or create new one
      threadResult = findOrCreateThread(
        {
          _id: "",  // Not created yet
          contactName: args.contactName,
          subject: args.subject,
          communicationType: args.communicationType,
          communicationDate: args.communicationDate,
          communicationTime: args.communicationTime,
          createdAt: now,
          participantId: args.linkedParticipantId,
        },
        recentCommForThreading
      );
    } else {
      // No participant linked - create new thread
      threadResult = {
        threadId: `thread_${now}_${Math.random().toString(36).substring(2, 9)}`,
        isNewThread: true,
        matchScore: 0,
        reason: "No participant linked - new thread created"
      };
    }

    // Create communication with thread assignment
    const communicationId = await ctx.db.insert("communications", {
      ...args,
      // NDIS Compliance fields (from form or defaults)
      complianceCategory: args.complianceCategory || ("none" as const),
      complianceFlags: args.complianceFlags || undefined,
      // Stakeholder linking
      stakeholderEntityType: args.stakeholderEntityType || undefined,
      stakeholderEntityId: args.stakeholderEntityId || undefined,
      // Threading fields
      isThreadStarter: threadResult.isNewThread, // True if new thread
      requiresFollowUp: false, // Default, will be updated if gate triggers
      isParticipantInvolved: args.linkedParticipantId != null, // True if participant linked
      threadId: threadResult.threadId, // Thread ID from threading engine
      participantId: args.linkedParticipantId, // Copy to new field for migration compatibility
      createdAt: now,
      updatedAt: now,
    });

    // CONSULTATION GATE CHECK (Task 3.2)
    // Fetch the created communication
    const createdCommunication = await ctx.db.get(communicationId);
    if (!createdCommunication) {
      throw new Error("Failed to retrieve created communication");
    }

    // Fetch thread communications for stakeholder analysis
    const threadComms = await ctx.db
      .query("communications")
      .withIndex("by_thread", (q: any) => q.eq("threadId", threadResult.threadId))
      .filter((q: any) => q.neq(q.field("_id"), communicationId)) // Exclude current
      .collect();

    // Map to gate interface
    const threadCommsForGate: CommunicationForGate[] = threadComms.map(comm => ({
      _id: comm._id,
      threadId: comm.threadId,
      complianceCategory: comm.complianceCategory,
      complianceFlags: comm.complianceFlags,
      isParticipantInvolved: comm.isParticipantInvolved,
      contactType: comm.contactType,
      stakeholderEntityType: comm.stakeholderEntityType,
      participantId: comm.participantId || comm.linkedParticipantId,
    }));

    const currentCommForGate: CommunicationForGate = {
      _id: createdCommunication._id,
      threadId: createdCommunication.threadId,
      complianceCategory: createdCommunication.complianceCategory,
      complianceFlags: createdCommunication.complianceFlags,
      isParticipantInvolved: createdCommunication.isParticipantInvolved,
      contactType: createdCommunication.contactType,
      stakeholderEntityType: createdCommunication.stakeholderEntityType,
      participantId: createdCommunication.participantId || createdCommunication.linkedParticipantId,
    };

    // CONSULTATION GATE CHECK (Task 3.2, 3.5)
    let consultationGateTriggered = false;
    let taskId: string | undefined;
    let gateSkipped = false;

    // Task 3.5: Skip gate if requested (admin/property_manager only)
    if (args.skipConsultationGate) {
      if (user.role !== "admin" && user.role !== "property_manager") {
        throw new Error("Only admins and property managers can skip consultation gate");
      }

      gateSkipped = true;

      // Audit log for skip
      await ctx.runMutation(internal.auditLog.log, {
        userId: user._id,
        userEmail: user.email,
        userName: `${user.firstName} ${user.lastName}`,
        action: "consultation_gate",
        entityType: "communication",
        entityId: communicationId,
        entityName: `Gate skipped: ${args.contactName}`,
        metadata: JSON.stringify({
          skipped: true,
          reason: "Manually skipped by user",
        }),
      });
    } else {
      // Check consultation gate
      const gateResult = checkConsultationGate(currentCommForGate, threadCommsForGate);

      // If gate triggered, update communication, log, and create follow-up task
      if (gateResult.triggered) {
        consultationGateTriggered = true;

        // Update communication to require follow-up
        await ctx.db.patch(communicationId, {
          requiresFollowUp: true,
          updatedAt: now,
        });

        // Audit log for gate trigger
        await ctx.runMutation(internal.auditLog.log, {
          userId: user._id,
          userEmail: user.email,
          userName: `${user.firstName} ${user.lastName}`,
          action: "consultation_gate",
          entityType: "communication",
          entityId: communicationId,
          entityName: `Gate triggered: ${args.contactName}`,
          metadata: JSON.stringify({
            reasons: gateResult.reasons,
            recommendedPriority: gateResult.recommendedPriority,
            recommendedDueDateOffset: gateResult.recommendedDueDateOffset,
            summary: getGateTriggerSummary(gateResult),
          }),
        });

        // Auto-create follow-up task (Task 3.3)
        taskId = await ctx.runMutation(internal.tasks.createFollowUpTask, {
          communicationId,
          userId: user._id,
          participantId: args.linkedParticipantId,
          propertyId: args.linkedPropertyId,
          subject: args.subject,
          priority: gateResult.recommendedPriority,
          dueDateOffset: gateResult.recommendedDueDateOffset,
          category: "follow_up",
        });
      }
    }

    // Update or create threadSummaries
    if (args.linkedParticipantId) {
      const existingSummary = await ctx.db
        .query("threadSummaries")
        .withIndex("by_thread", (q) => q.eq("threadId", threadResult.threadId))
        .first();

      if (existingSummary) {
        // Update existing thread summary
        await ctx.db.patch(existingSummary._id, {
          lastActivityAt: now,
          messageCount: existingSummary.messageCount + 1,
          hasUnread: true, // New message is unread
        });
      } else {
        // Create new thread summary
        await ctx.db.insert("threadSummaries", {
          threadId: threadResult.threadId,
          participantId: args.linkedParticipantId,
          startedAt: now,
          lastActivityAt: now,
          messageCount: 1,
          participantNames: [args.contactName],
          subject: args.subject || `${args.communicationType} with ${args.contactName}`,
          previewText: args.summary.substring(0, 100),
          hasUnread: true,
          complianceCategories: ["none"],
          requiresAction: false,
        });
      }
    }

    // Audit log for creation
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
        threadId: threadResult.threadId,
        isNewThread: threadResult.isNewThread,
        threadMatchScore: threadResult.matchScore,
        threadMatchReason: threadResult.reason,
        consultationGateTriggered,
      }),
    });

    return {
      communicationId,
      threadId: threadResult.threadId,
      consultationGateTriggered,
      gateSkipped,
      taskId: consultationGateTriggered ? taskId : undefined,
    };
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

// Soft-delete a communication (preserves data for audit trail)
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

    if (communication.isDeleted) {
      throw new Error("Communication already deleted");
    }

    // Soft delete - mark as deleted but preserve data
    await ctx.db.patch(args.id, {
      isDeleted: true,
      deletedAt: Date.now(),
      deletedBy: args.userId,
      updatedAt: Date.now(),
    });

    // Regenerate thread summary if part of a thread
    if (communication.threadId) {
      await regenerateThreadSummary(ctx, communication.threadId);
    }

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

// MANUAL THREAD MANAGEMENT (Task 2.4)

/**
 * Helper: Regenerate thread summary from all communications in thread
 * Task 2.6: Regenerate Thread Summary
 */
async function regenerateThreadSummary(
  ctx: any,
  threadId: string
): Promise<void> {
  // Fetch all non-deleted communications in thread
  const threadComms = await ctx.db
    .query("communications")
    .withIndex("by_thread", (q: any) => q.eq("threadId", threadId))
    .collect();
  const activeThreadComms = threadComms.filter((c: any) => !c.isDeleted);

  if (activeThreadComms.length === 0) {
    // Thread has no active communications - delete summary if exists
    const existingSummary = await ctx.db
      .query("threadSummaries")
      .withIndex("by_thread", (q: any) => q.eq("threadId", threadId))
      .first();

    if (existingSummary) {
      await ctx.db.delete(existingSummary._id);
    }
    return;
  }

  // Calculate summary data from active (non-deleted) communications
  const sortedComms = activeThreadComms.sort((a: any, b: any) => a.createdAt - b.createdAt);
  const firstComm = sortedComms[0];
  const lastComm = sortedComms[sortedComms.length - 1];

  // Collect unique participant names
  const participantNames = [...new Set(activeThreadComms.map((c: any) => c.contactName))];

  // Collect compliance categories
  const complianceCategories = [...new Set(
    activeThreadComms
      .map((c: any) => c.complianceCategory)
      .filter(Boolean)
  )];

  // Check if any communication requires action
  const requiresAction = activeThreadComms.some((c: any) => c.requiresFollowUp === true);

  // Update or create summary
  const existingSummary = await ctx.db
    .query("threadSummaries")
    .withIndex("by_thread", (q: any) => q.eq("threadId", threadId))
    .first();

  const summaryData = {
    threadId,
    participantId: firstComm.participantId || firstComm.linkedParticipantId,
    startedAt: firstComm.createdAt,
    lastActivityAt: lastComm.createdAt,
    messageCount: activeThreadComms.length,
    participantNames,
    subject: firstComm.subject || `${firstComm.communicationType} with ${firstComm.contactName}`,
    previewText: lastComm.summary.substring(0, 100),
    hasUnread: false, // Reset to false on regeneration
    complianceCategories: complianceCategories.length > 0 ? complianceCategories : ["none"],
    requiresAction,
  };

  if (existingSummary) {
    await ctx.db.patch(existingSummary._id, summaryData);
  } else {
    await ctx.db.insert("threadSummaries", summaryData);
  }
}

/**
 * Merge two threads - move all communications from source to target
 * Task 2.4: Manual Thread Management (Part 1)
 */
export const mergeThreads = mutation({
  args: {
    sourceThreadId: v.string(),
    targetThreadId: v.string(),
    actingUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Permission check - admin or property_manager only
    const user = await requirePermission(ctx, args.actingUserId, "communications", "update");
    if (user.role !== "admin" && user.role !== "property_manager") {
      throw new Error("Only admins and property managers can merge threads");
    }

    // Validate thread IDs
    if (args.sourceThreadId === args.targetThreadId) {
      throw new Error("Cannot merge a thread with itself");
    }

    // Fetch all communications from source thread
    const sourceComms = await ctx.db
      .query("communications")
      .withIndex("by_thread", (q) => q.eq("threadId", args.sourceThreadId))
      .collect();

    if (sourceComms.length === 0) {
      throw new Error("Source thread not found or empty");
    }

    // Move all communications to target thread
    let movedCount = 0;
    for (const comm of sourceComms) {
      await ctx.db.patch(comm._id, {
        threadId: args.targetThreadId,
        isThreadStarter: false, // No longer thread starters
        updatedAt: Date.now(),
      });
      movedCount++;
    }

    // Regenerate target thread summary
    await regenerateThreadSummary(ctx, args.targetThreadId);

    // Delete source thread summary
    const sourceSummary = await ctx.db
      .query("threadSummaries")
      .withIndex("by_thread", (q) => q.eq("threadId", args.sourceThreadId))
      .first();

    if (sourceSummary) {
      await ctx.db.delete(sourceSummary._id);
    }

    // Audit log
    await ctx.runMutation(internal.auditLog.log, {
      userId: user._id,
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`,
      action: "thread_merge",
      entityType: "communication",
      entityId: sourceComms[0]._id, // Reference first communication from source thread
      entityName: `Thread merge: ${args.sourceThreadId} → ${args.targetThreadId}`,
      metadata: JSON.stringify({
        sourceThreadId: args.sourceThreadId,
        targetThreadId: args.targetThreadId,
        communicationsMoved: movedCount,
      }),
    });

    return {
      success: true,
      movedCount,
      targetThreadId: args.targetThreadId,
    };
  },
});

/**
 * Split a communication into its own thread
 * Task 2.4: Manual Thread Management (Part 2)
 */
export const splitThread = mutation({
  args: {
    communicationId: v.id("communications"),
    actingUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Permission check - admin or property_manager only
    const user = await requirePermission(ctx, args.actingUserId, "communications", "update");
    if (user.role !== "admin" && user.role !== "property_manager") {
      throw new Error("Only admins and property managers can split threads");
    }

    // Fetch the communication
    const communication = await ctx.db.get(args.communicationId);
    if (!communication) {
      throw new Error("Communication not found");
    }

    const oldThreadId = communication.threadId;

    // Generate new thread ID using crypto.randomUUID() pattern
    const newThreadId = `thread_${Date.now()}_${crypto.randomUUID().substring(0, 8)}`;

    // Update communication - move to new thread and mark as thread starter
    await ctx.db.patch(args.communicationId, {
      threadId: newThreadId,
      isThreadStarter: true,
      updatedAt: Date.now(),
    });

    // Create new thread summary for the split thread (skip if no participant)
    const participantId = communication.participantId || communication.linkedParticipantId;
    if (participantId) {
      await ctx.db.insert("threadSummaries", {
        threadId: newThreadId,
        participantId,
        startedAt: communication.createdAt,
        lastActivityAt: communication.createdAt,
        messageCount: 1,
        participantNames: [communication.contactName],
        subject: communication.subject || `${communication.communicationType} with ${communication.contactName}`,
        previewText: communication.summary.substring(0, 100),
        hasUnread: true,
        complianceCategories: communication.complianceCategory ? [communication.complianceCategory] : ["none"],
        requiresAction: communication.requiresFollowUp || false,
      });
    }

    // Regenerate old thread summary (if thread still has other communications)
    if (oldThreadId) {
      await regenerateThreadSummary(ctx, oldThreadId);
    }

    // Audit log
    await ctx.runMutation(internal.auditLog.log, {
      userId: user._id,
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`,
      action: "thread_split",
      entityType: "communication",
      entityId: args.communicationId,
      entityName: `Thread split: ${communication.contactName}`,
      metadata: JSON.stringify({
        oldThreadId,
        newThreadId,
        communicationType: communication.communicationType,
        subject: communication.subject,
      }),
    });

    return {
      success: true,
      newThreadId,
      oldThreadId,
    };
  },
});

// Get all communications with enriched data
export const getAll = query({
  handler: async (ctx) => {
    const communications = await ctx.db
      .query("communications")
      .order("desc")
      .filter((q) => q.neq(q.field("isDeleted"), true))
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
      .filter((q) => q.neq(q.field("isDeleted"), true))
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
      .filter((q) => q.neq(q.field("isDeleted"), true))
      .order("desc")
      .collect();

    return communications;
  },
});

// Get communications by stakeholder (for cross-linking on SC/SIL/OT/Contractor detail pages)
export const getByStakeholder = query({
  args: {
    stakeholderEntityType: v.union(
      v.literal("support_coordinator"),
      v.literal("sil_provider"),
      v.literal("occupational_therapist"),
      v.literal("contractor"),
      v.literal("participant")
    ),
    stakeholderEntityId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const maxResults = args.limit || 20;

    const communications = await ctx.db
      .query("communications")
      .withIndex("by_stakeholder", (q) =>
        q.eq("stakeholderEntityType", args.stakeholderEntityType)
         .eq("stakeholderEntityId", args.stakeholderEntityId)
      )
      .filter((q) => q.neq(q.field("isDeleted"), true))
      .order("desc")
      .take(maxResults);

    // Batch fetch participant names for display
    const participantIds = [...new Set(
      communications.map((c) => c.linkedParticipantId || c.participantId).filter(Boolean)
    )];
    const participants = await Promise.all(participantIds.map((id) => ctx.db.get(id!)));
    const participantMap = new Map(
      participants.filter(Boolean).map((p) => [p!._id, `${p!.firstName} ${p!.lastName}`])
    );

    return communications.map((c) => {
      const pid = c.linkedParticipantId || c.participantId;
      return {
        ...c,
        participantName: pid ? participantMap.get(pid) || null : null,
      };
    });
  },
});

// Get communications linked to an incident
export const getByIncident = query({
  args: { incidentId: v.id("incidents") },
  handler: async (ctx, args) => {
    const communications = await ctx.db
      .query("communications")
      .withIndex("by_linked_incident", (q) => q.eq("linkedIncidentId", args.incidentId))
      .filter((q) => q.neq(q.field("isDeleted"), true))
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
      .filter((q) => q.neq(q.field("isDeleted"), true))
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

// THREAD SUGGESTIONS (Task 2.5)

/**
 * Suggest potential thread merges for manual review
 * Returns thread pairs with match scores between SUGGESTION (0.5) and THREAD_MATCH (0.6)
 */
export const suggestThreadMerges = query({
  args: {
    participantId: v.optional(v.id("participants")),
    timeWindowDays: v.optional(v.number()), // Default: 7 days for suggestions
  },
  handler: async (ctx, args) => {
    const timeWindow = (args.timeWindowDays || 7) * 24 * 60 * 60 * 1000; // Convert days to ms
    const cutoffTime = Date.now() - timeWindow;

    // Fetch communications in time window
    let communications;
    if (args.participantId) {
      communications = await ctx.db
        .query("communications")
        .withIndex("by_participant", (q: any) => q.eq("linkedParticipantId", args.participantId))
        .filter((q: any) => q.gte(q.field("createdAt"), cutoffTime))
        .collect();
    } else {
      communications = await ctx.db
        .query("communications")
        .filter((q: any) => q.gte(q.field("createdAt"), cutoffTime))
        .collect();
    }

    // Group by threadId
    const threadGroups = new Map<string, any[]>();
    for (const comm of communications) {
      if (comm.threadId) {
        if (!threadGroups.has(comm.threadId)) {
          threadGroups.set(comm.threadId, []);
        }
        threadGroups.get(comm.threadId)!.push(comm);
      }
    }

    const threadIds = Array.from(threadGroups.keys());
    const suggestions: Array<{
      sourceThreadId: string;
      targetThreadId: string;
      matchScore: number;
      sourcePreview: string;
      targetPreview: string;
      sourceMessageCount: number;
      targetMessageCount: number;
      reason: string;
    }> = [];

    // Compare each thread pair
    for (let i = 0; i < threadIds.length; i++) {
      for (let j = i + 1; j < threadIds.length; j++) {
        const thread1 = threadGroups.get(threadIds[i])!;
        const thread2 = threadGroups.get(threadIds[j])!;

        // Use most recent communication from each thread
        const comm1 = thread1.sort((a: any, b: any) => b.createdAt - a.createdAt)[0];
        const comm2 = thread2.sort((a: any, b: any) => b.createdAt - a.createdAt)[0];

        // Map to threading interface
        const mappedComm1: CommunicationForThreading = {
          _id: comm1._id,
          contactName: comm1.contactName,
          subject: comm1.subject,
          communicationType: comm1.communicationType,
          communicationDate: comm1.communicationDate,
          communicationTime: comm1.communicationTime,
          createdAt: comm1.createdAt,
          threadId: comm1.threadId,
          participantId: comm1.participantId || comm1.linkedParticipantId,
        };

        const mappedComm2: CommunicationForThreading = {
          _id: comm2._id,
          contactName: comm2.contactName,
          subject: comm2.subject,
          communicationType: comm2.communicationType,
          communicationDate: comm2.communicationDate,
          communicationTime: comm2.communicationTime,
          createdAt: comm2.createdAt,
          threadId: comm2.threadId,
          participantId: comm2.participantId || comm2.linkedParticipantId,
        };

        // Calculate match score using the threading engine's algorithm
        const { levenshteinSimilarity, jaccardSimilarity, normalizeContactName, THREADING_THRESHOLDS, SCORING_WEIGHTS } = await import("./lib/threadingEngine");

        const contactScore = levenshteinSimilarity(
          normalizeContactName(mappedComm1.contactName),
          normalizeContactName(mappedComm2.contactName)
        );

        const subjectScore = jaccardSimilarity(
          mappedComm1.subject || "",
          mappedComm2.subject || ""
        );

        const timeDiff = Math.abs(mappedComm1.createdAt - mappedComm2.createdAt);
        const timeScore = Math.max(0, 1 - (timeDiff / THREADING_THRESHOLDS.TIME_WINDOW_MS));

        const typeScore = mappedComm1.communicationType === mappedComm2.communicationType ? 1.0 : 0.0;

        const matchScore =
          (contactScore * SCORING_WEIGHTS.CONTACT) +
          (subjectScore * SCORING_WEIGHTS.SUBJECT) +
          (timeScore * SCORING_WEIGHTS.TIME) +
          (typeScore * SCORING_WEIGHTS.TYPE);

        // Only suggest if score is in suggestion range (0.5 - 0.6)
        if (matchScore >= THREADING_THRESHOLDS.SUGGESTION && matchScore < THREADING_THRESHOLDS.THREAD_MATCH) {
          suggestions.push({
            sourceThreadId: threadIds[i],
            targetThreadId: threadIds[j],
            matchScore,
            sourcePreview: `${comm1.communicationType} with ${comm1.contactName}${comm1.subject ? `: ${comm1.subject}` : ""}`,
            targetPreview: `${comm2.communicationType} with ${comm2.contactName}${comm2.subject ? `: ${comm2.subject}` : ""}`,
            sourceMessageCount: thread1.length,
            targetMessageCount: thread2.length,
            reason: `Contact similarity: ${(contactScore * 100).toFixed(0)}%, Subject similarity: ${(subjectScore * 100).toFixed(0)}%`,
          });
        }
      }
    }

    // Sort by match score (highest first)
    suggestions.sort((a, b) => b.matchScore - a.matchScore);

    return suggestions;
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

// ============================================================
// PHASE 4: BACKEND SUPPORT QUERIES FOR MULTI-VIEW UI
// ============================================================

/**
 * Task 4B.1: Thread View Query
 * Paginated list of thread summaries for inbox-style view
 */
export const getThreadedView = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
    filterUnread: v.optional(v.boolean()),
    filterRequiresAction: v.optional(v.boolean()),
    statusFilter: v.optional(v.union(v.literal("active"), v.literal("completed"), v.literal("archived"), v.literal("all"))),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.userId, "communications", "view");

    const limit = args.limit || 20;
    const statusFilter = args.statusFilter || "active";

    // Read from threadSummaries for performance
    let allSummaries = await ctx.db
      .query("threadSummaries")
      .collect();

    // Filter by status (undefined treated as "active")
    if (statusFilter !== "all") {
      allSummaries = allSummaries.filter(s => (s.status || "active") === statusFilter);
    }

    // Filter by unread
    if (args.filterUnread) {
      allSummaries = allSummaries.filter(s => s.hasUnread === true);
    }

    // Filter by requires action
    if (args.filterRequiresAction) {
      allSummaries = allSummaries.filter(s => s.requiresAction === true);
    }

    // Sort by lastActivityAt DESC
    allSummaries.sort((a, b) => b.lastActivityAt - a.lastActivityAt);

    // Cursor-based pagination (cursor = lastActivityAt timestamp as string)
    let startIndex = 0;
    if (args.cursor) {
      const cursorTime = parseInt(args.cursor, 10);
      startIndex = allSummaries.findIndex(s => s.lastActivityAt < cursorTime);
      if (startIndex === -1) startIndex = allSummaries.length;
    }

    const page = allSummaries.slice(startIndex, startIndex + limit);
    const hasMore = startIndex + limit < allSummaries.length;

    return {
      threads: page.map(s => ({
        threadId: s.threadId,
        subject: s.subject,
        previewText: s.previewText,
        lastActivityAt: s.lastActivityAt,
        messageCount: s.messageCount,
        participantNames: s.participantNames,
        hasUnread: s.hasUnread,
        complianceCategories: s.complianceCategories,
        requiresAction: s.requiresAction,
        participantId: s.participantId,
        status: s.status || "active",
      })),
      nextCursor: hasMore ? String(page[page.length - 1].lastActivityAt) : null,
    };
  },
});

/**
 * Task 4B.2: Thread Detail Query
 * All communications in a single thread
 */
export const getThreadMessages = query({
  args: {
    userId: v.id("users"),
    threadId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.userId, "communications", "view");

    const limit = args.limit || 50;

    // Get messages in thread sorted by createdAt ASC (oldest first), exclude deleted
    const allMessages = await ctx.db
      .query("communications")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
      .collect();
    const messages = allMessages.filter(m => !m.isDeleted);

    // Sort ASC (oldest first) and limit
    messages.sort((a, b) => a.createdAt - b.createdAt);
    const limited = messages.slice(0, limit);

    // Get thread summary
    const threadSummary = await ctx.db
      .query("threadSummaries")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
      .first();

    return {
      messages: limited.map(m => ({
        _id: m._id,
        type: m.communicationType,
        direction: m.direction,
        contactName: m.contactName,
        contactType: m.contactType,
        subject: m.subject,
        summary: m.summary,
        createdAt: m.createdAt,
        readAt: m.readAt,
        complianceCategory: m.complianceCategory,
        complianceFlags: m.complianceFlags,
        isThreadStarter: m.isThreadStarter,
        communicationDate: m.communicationDate,
        communicationTime: m.communicationTime,
        contactEmail: m.contactEmail,
        contactPhone: m.contactPhone,
        attachmentStorageId: m.attachmentStorageId,
        attachmentFileName: m.attachmentFileName,
      })),
      threadSummary: threadSummary || null,
    };
  },
});

/**
 * Task 4B.3: Timeline View Query
 * Flat chronological list with date/type filtering
 */
export const getTimelineView = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
    dateFrom: v.optional(v.string()),
    dateTo: v.optional(v.string()),
    type: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.userId, "communications", "view");

    const limit = args.limit || 50;

    // Get all non-deleted communications
    let comms = await ctx.db
      .query("communications")
      .order("desc")
      .filter((q) => q.neq(q.field("isDeleted"), true))
      .collect();

    // Date range filtering
    if (args.dateFrom) {
      comms = comms.filter(c => c.communicationDate >= args.dateFrom!);
    }
    if (args.dateTo) {
      comms = comms.filter(c => c.communicationDate <= args.dateTo!);
    }

    // Type filtering
    if (args.type) {
      comms = comms.filter(c => c.communicationType === args.type);
    }

    // Cursor-based pagination (cursor = createdAt timestamp as string)
    let startIndex = 0;
    if (args.cursor) {
      const cursorTime = parseInt(args.cursor, 10);
      startIndex = comms.findIndex(c => c.createdAt < cursorTime);
      if (startIndex === -1) startIndex = comms.length;
    }

    const page = comms.slice(startIndex, startIndex + limit);
    const hasMore = startIndex + limit < comms.length;

    // Batch fetch participant names
    const participantIds = [...new Set(page.map(c => c.linkedParticipantId || c.participantId).filter(Boolean))];
    const participants = await Promise.all(participantIds.map(id => ctx.db.get(id!)));
    const participantMap = new Map(
      participants.filter(Boolean).map(p => [p!._id, `${p!.firstName} ${p!.lastName}`])
    );

    return {
      communications: page.map(c => {
        const pid = c.linkedParticipantId || c.participantId;
        return {
          _id: c._id,
          type: c.communicationType,
          direction: c.direction,
          contactName: c.contactName,
          contactType: c.contactType,
          subject: c.subject,
          summary: c.summary,
          createdAt: c.createdAt,
          threadId: c.threadId,
          complianceCategory: c.complianceCategory,
          participantId: pid,
          participantName: pid ? participantMap.get(pid) || null : null,
          communicationDate: c.communicationDate,
          communicationTime: c.communicationTime,
        };
      }),
      nextCursor: hasMore ? String(page[page.length - 1].createdAt) : null,
    };
  },
});

/**
 * Task 4B.4: Stakeholder View Query
 * Communications grouped by stakeholder/contact
 */
export const getStakeholderView = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
    contactType: v.optional(v.string()),
    searchName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.userId, "communications", "view");

    const limit = args.limit || 20;

    // Get all non-deleted communications
    let comms = await ctx.db
      .query("communications")
      .filter((q) => q.neq(q.field("isDeleted"), true))
      .collect();

    // Filter by contact type
    if (args.contactType) {
      comms = comms.filter(c => c.contactType === args.contactType);
    }

    // Case-insensitive name search
    if (args.searchName) {
      const search = args.searchName.toLowerCase();
      comms = comms.filter(c => c.contactName.toLowerCase().includes(search));
    }

    // Group by contactName (normalized lowercase)
    const stakeholderMap = new Map<string, {
      contactName: string;
      contactType: string;
      stakeholderEntityType: string | null;
      stakeholderEntityId: string | null;
      totalCommunications: number;
      lastContactAt: number;
      latestSubject: string;
      complianceCategories: Set<string>;
    }>();

    for (const comm of comms) {
      const key = comm.contactName.toLowerCase();
      const existing = stakeholderMap.get(key);

      if (existing) {
        existing.totalCommunications++;
        if (comm.createdAt > existing.lastContactAt) {
          existing.lastContactAt = comm.createdAt;
          existing.latestSubject = comm.subject || "";
        }
        if (comm.complianceCategory) {
          existing.complianceCategories.add(comm.complianceCategory);
        }
      } else {
        stakeholderMap.set(key, {
          contactName: comm.contactName,
          contactType: comm.contactType,
          stakeholderEntityType: comm.stakeholderEntityType || null,
          stakeholderEntityId: comm.stakeholderEntityId || null,
          totalCommunications: 1,
          lastContactAt: comm.createdAt,
          latestSubject: comm.subject || "",
          complianceCategories: new Set(comm.complianceCategory ? [comm.complianceCategory] : []),
        });
      }
    }

    // Convert to array and sort by lastContactAt DESC
    let stakeholders = Array.from(stakeholderMap.values())
      .sort((a, b) => b.lastContactAt - a.lastContactAt);

    // Cursor-based pagination (cursor = lastContactAt timestamp as string)
    let startIndex = 0;
    if (args.cursor) {
      const cursorTime = parseInt(args.cursor, 10);
      startIndex = stakeholders.findIndex(s => s.lastContactAt < cursorTime);
      if (startIndex === -1) startIndex = stakeholders.length;
    }

    const page = stakeholders.slice(startIndex, startIndex + limit);
    const hasMore = startIndex + limit < stakeholders.length;

    return {
      stakeholders: page.map(s => ({
        contactName: s.contactName,
        contactType: s.contactType,
        stakeholderEntityType: s.stakeholderEntityType,
        stakeholderEntityId: s.stakeholderEntityId,
        totalCommunications: s.totalCommunications,
        lastContactAt: new Date(s.lastContactAt).toISOString(),
        latestSubject: s.latestSubject,
        complianceCategories: Array.from(s.complianceCategories),
      })),
      nextCursor: hasMore ? String(page[page.length - 1].lastContactAt) : null,
    };
  },
});

/**
 * Task 4B.5: Compliance View Query
 * Compliance-filtered communications with stats
 */
export const getComplianceView = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
    complianceCategory: v.optional(v.string()),
    hasFlags: v.optional(v.boolean()),
    requiresFollowUp: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.userId, "communications", "view");

    const limit = args.limit || 50;

    // Get all non-deleted communications
    let comms = await ctx.db
      .query("communications")
      .order("desc")
      .filter((q) => q.neq(q.field("isDeleted"), true))
      .collect();

    // Default: exclude "routine" and "none" categories
    if (args.complianceCategory) {
      comms = comms.filter(c => c.complianceCategory === args.complianceCategory);
    } else {
      comms = comms.filter(c =>
        c.complianceCategory &&
        c.complianceCategory !== "routine" &&
        c.complianceCategory !== "none"
      );
    }

    // Filter by hasFlags (complianceFlags not empty)
    if (args.hasFlags) {
      comms = comms.filter(c => c.complianceFlags && c.complianceFlags.length > 0);
    }

    // Filter by requiresFollowUp
    if (args.requiresFollowUp) {
      comms = comms.filter(c => c.requiresFollowUp === true);
    }

    // Calculate stats from full filtered set
    const categoryCount: Record<string, number> = {};
    let flaggedCount = 0;
    let pendingFollowUpCount = 0;

    for (const c of comms) {
      const cat = c.complianceCategory || "none";
      categoryCount[cat] = (categoryCount[cat] || 0) + 1;
      if (c.complianceFlags && c.complianceFlags.length > 0) flaggedCount++;
      if (c.requiresFollowUp === true) pendingFollowUpCount++;
    }

    // Cursor-based pagination
    let startIndex = 0;
    if (args.cursor) {
      const cursorTime = parseInt(args.cursor, 10);
      startIndex = comms.findIndex(c => c.createdAt < cursorTime);
      if (startIndex === -1) startIndex = comms.length;
    }

    const page = comms.slice(startIndex, startIndex + limit);
    const hasMore = startIndex + limit < comms.length;

    // Batch fetch participant names
    const participantIds = [...new Set(page.map(c => c.linkedParticipantId || c.participantId).filter(Boolean))];
    const participants = await Promise.all(participantIds.map(id => ctx.db.get(id!)));
    const participantMap = new Map(
      participants.filter(Boolean).map(p => [p!._id, `${p!.firstName} ${p!.lastName}`])
    );

    return {
      communications: page.map(c => {
        const pid = c.linkedParticipantId || c.participantId;
        return {
          _id: c._id,
          type: c.communicationType,
          direction: c.direction,
          contactName: c.contactName,
          contactType: c.contactType,
          subject: c.subject,
          summary: c.summary,
          createdAt: c.createdAt,
          threadId: c.threadId,
          complianceCategory: c.complianceCategory,
          complianceFlags: c.complianceFlags,
          requiresFollowUp: c.requiresFollowUp,
          participantName: pid ? participantMap.get(pid) || null : null,
        };
      }),
      stats: {
        total: comms.length,
        byCategory: categoryCount,
        flagged: flaggedCount,
        pendingFollowUp: pendingFollowUpCount,
      },
      nextCursor: hasMore ? String(page[page.length - 1].createdAt) : null,
    };
  },
});

/**
 * Task 4B.6: Mark Thread Read Mutation
 * Mark all communications in a thread as read
 */
export const markThreadRead = mutation({
  args: {
    userId: v.id("users"),
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, args.userId, "communications", "update");

    // Find all unread communications in thread
    const threadComms = await ctx.db
      .query("communications")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
      .collect();

    const now = new Date().toISOString();
    let updatedCount = 0;

    for (const comm of threadComms) {
      if (!comm.readAt) {
        await ctx.db.patch(comm._id, {
          readAt: now,
          updatedAt: Date.now(),
        });
        updatedCount++;
      }
    }

    // Update thread summary
    const summary = await ctx.db
      .query("threadSummaries")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
      .first();

    if (summary) {
      await ctx.db.patch(summary._id, {
        hasUnread: false,
      });
    }

    // Audit log
    await ctx.runMutation(internal.auditLog.log, {
      userId: user._id,
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`,
      action: "update",
      entityType: "communication",
      entityId: args.threadId,
      entityName: `Thread marked read: ${args.threadId}`,
      metadata: JSON.stringify({
        operation: "thread_read",
        updatedCount,
      }),
    });

    return { updatedCount };
  },
});

/**
 * Task 4B.7: Communication Stats Query
 * Dashboard-level stats for the communications module
 */
export const getCommunicationDashboardStats = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.userId, "communications", "view");

    // Thread stats from summaries (fast - small table)
    const summaries = await ctx.db.query("threadSummaries").collect();
    const activeSummaries = summaries.filter(s => (s.status || "active") === "active");
    const totalThreads = activeSummaries.length;
    const unreadThreads = activeSummaries.filter(s => s.hasUnread).length;
    const requiresActionCount = activeSummaries.filter(s => s.requiresAction).length;
    const completedThreads = summaries.filter(s => s.status === "completed").length;
    const archivedThreads = summaries.filter(s => s.status === "archived").length;

    // Compliance breakdown from active summaries
    const complianceBreakdown: Record<string, number> = {};
    for (const s of activeSummaries) {
      for (const cat of s.complianceCategories) {
        complianceBreakdown[cat] = (complianceBreakdown[cat] || 0) + 1;
      }
    }

    // Recent activity (last 24 hours) - query non-deleted communications
    const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
    const recentComms = await ctx.db
      .query("communications")
      .order("desc")
      .filter((q) => q.neq(q.field("isDeleted"), true))
      .collect();
    const recentActivity = recentComms.filter(c => c.createdAt >= twentyFourHoursAgo).length;

    // Unique stakeholder count
    const stakeholderNames = new Set(recentComms.map(c => c.contactName.toLowerCase()));
    const stakeholderCount = stakeholderNames.size;

    return {
      totalThreads,
      unreadThreads,
      requiresAction: requiresActionCount,
      completedThreads,
      archivedThreads,
      complianceBreakdown,
      recentActivity,
      stakeholderCount,
    };
  },
});

// ============================================================
// PHASE 6B: BULK OPERATIONS
// ============================================================

/**
 * Task 6B.1: Bulk Mark As Read
 * Marks multiple communications as read, updates affected thread summaries
 */
export const bulkMarkAsRead = mutation({
  args: {
    userId: v.id("users"),
    communicationIds: v.array(v.id("communications")),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.userId, "communications", "update");

    // Validate max 100 IDs
    if (args.communicationIds.length === 0) {
      throw new Error("No communication IDs provided");
    }
    if (args.communicationIds.length > 100) {
      throw new Error("Maximum 100 communications per bulk operation");
    }

    const now = new Date().toISOString();
    const affectedThreadIds = new Set<string>();
    let updatedCount = 0;

    // Mark each communication as read
    for (const commId of args.communicationIds) {
      const comm = await ctx.db.get(commId);
      if (!comm || comm.readAt) continue; // Skip if already read or not found

      await ctx.db.patch(commId, { readAt: now });
      updatedCount++;

      if (comm.threadId) {
        affectedThreadIds.add(comm.threadId);
      }
    }

    // Update affected thread summaries - check if all comms in thread are now read
    for (const threadId of affectedThreadIds) {
      const threadComms = await ctx.db
        .query("communications")
        .withIndex("by_thread", (q: any) => q.eq("threadId", threadId))
        .collect();

      const hasUnread = threadComms.some((c: any) => !c.readAt);

      const summary = await ctx.db
        .query("threadSummaries")
        .withIndex("by_thread", (q: any) => q.eq("threadId", threadId))
        .first();

      if (summary) {
        await ctx.db.patch(summary._id, { hasUnread });
      }
    }

    // Get user for audit log
    const user = await ctx.db.get(args.userId);
    if (user) {
      await ctx.runMutation(internal.auditLog.log, {
        userId: user._id,
        userEmail: user.email,
        userName: `${user.firstName} ${user.lastName}`,
        action: "bulk_mark_read",
        entityType: "communication",
        entityName: `Bulk mark read: ${updatedCount} communications`,
        metadata: JSON.stringify({
          communicationIds: args.communicationIds,
          updatedCount,
          affectedThreads: [...affectedThreadIds],
        }),
      });
    }

    return { updatedCount, affectedThreads: affectedThreadIds.size };
  },
});

/**
 * Task 6B.2: Bulk Categorize
 * Updates compliance category for multiple communications, recalculates summaries,
 * re-evaluates consultation gate for affected communications
 */
export const bulkUpdateCategory = mutation({
  args: {
    userId: v.id("users"),
    communicationIds: v.array(v.id("communications")),
    complianceCategory: v.union(
      v.literal("routine"),
      v.literal("incident_related"),
      v.literal("complaint"),
      v.literal("safeguarding"),
      v.literal("plan_review"),
      v.literal("access_request"),
      v.literal("quality_audit"),
      v.literal("advocacy"),
      v.literal("none")
    ),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.userId, "communications", "update");

    if (args.communicationIds.length === 0) {
      throw new Error("No communication IDs provided");
    }
    if (args.communicationIds.length > 100) {
      throw new Error("Maximum 100 communications per bulk operation");
    }

    const now = Date.now();
    const affectedThreadIds = new Set<string>();
    let updatedCount = 0;
    let gateTriggeredCount = 0;

    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    for (const commId of args.communicationIds) {
      const comm = await ctx.db.get(commId);
      if (!comm) continue;

      const previousCategory = comm.complianceCategory;

      // Update the category
      await ctx.db.patch(commId, {
        complianceCategory: args.complianceCategory,
        updatedAt: now,
      });
      updatedCount++;

      if (comm.threadId) {
        affectedThreadIds.add(comm.threadId);
      }

      // Re-evaluate consultation gate with new category
      const updatedComm = await ctx.db.get(commId);
      if (updatedComm) {
        const commForGate: CommunicationForGate = {
          _id: updatedComm._id,
          threadId: updatedComm.threadId,
          complianceCategory: updatedComm.complianceCategory,
          complianceFlags: updatedComm.complianceFlags,
          isParticipantInvolved: updatedComm.isParticipantInvolved,
          contactType: updatedComm.contactType,
          stakeholderEntityType: updatedComm.stakeholderEntityType,
          participantId: updatedComm.participantId || updatedComm.linkedParticipantId,
        };

        // Get thread comms for gate evaluation
        let threadCommsForGate: CommunicationForGate[] = [];
        if (updatedComm.threadId) {
          const threadComms = await ctx.db
            .query("communications")
            .withIndex("by_thread", (q: any) => q.eq("threadId", updatedComm.threadId))
            .collect();
          threadCommsForGate = threadComms
            .filter((c: any) => c._id !== updatedComm._id)
            .map((c: any) => ({
              _id: c._id,
              threadId: c.threadId,
              complianceCategory: c.complianceCategory,
              complianceFlags: c.complianceFlags,
              isParticipantInvolved: c.isParticipantInvolved,
              contactType: c.contactType,
              stakeholderEntityType: c.stakeholderEntityType,
              participantId: c.participantId || c.linkedParticipantId,
            }));
        }

        const gateResult = checkConsultationGate(commForGate, threadCommsForGate);
        if (gateResult.triggered && !updatedComm.requiresFollowUp) {
          await ctx.db.patch(commId, { requiresFollowUp: true, updatedAt: now });
          gateTriggeredCount++;

          // Auto-create follow-up task
          await ctx.runMutation(internal.tasks.createFollowUpTask, {
            communicationId: commId,
            userId: args.userId,
            participantId: updatedComm.linkedParticipantId,
            propertyId: updatedComm.linkedPropertyId,
            subject: updatedComm.subject,
            priority: gateResult.recommendedPriority,
            dueDateOffset: gateResult.recommendedDueDateOffset,
            category: "follow_up",
          });
        }
      }
    }

    // Regenerate affected thread summaries
    for (const threadId of affectedThreadIds) {
      await regenerateThreadSummary(ctx, threadId);
    }

    // Audit log
    await ctx.runMutation(internal.auditLog.log, {
      userId: user._id,
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`,
      action: "bulk_categorize",
      entityType: "communication",
      entityName: `Bulk categorize: ${updatedCount} → ${args.complianceCategory}`,
      metadata: JSON.stringify({
        communicationIds: args.communicationIds,
        newCategory: args.complianceCategory,
        updatedCount,
        gateTriggeredCount,
        affectedThreads: [...affectedThreadIds],
      }),
    });

    return { updatedCount, gateTriggeredCount, affectedThreads: affectedThreadIds.size };
  },
});

/**
 * Task 6B.3: Bulk Add To Thread
 * Moves multiple communications into a target thread, regenerates affected summaries
 */
export const bulkAddToThread = mutation({
  args: {
    userId: v.id("users"),
    communicationIds: v.array(v.id("communications")),
    targetThreadId: v.string(),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.userId, "communications", "update");

    if (args.communicationIds.length === 0) {
      throw new Error("No communication IDs provided");
    }
    if (args.communicationIds.length > 50) {
      throw new Error("Maximum 50 communications per bulk thread operation");
    }

    // Validate target thread exists
    const targetSummary = await ctx.db
      .query("threadSummaries")
      .withIndex("by_thread", (q: any) => q.eq("threadId", args.targetThreadId))
      .first();

    if (!targetSummary) {
      throw new Error("Target thread not found");
    }

    const now = Date.now();
    const sourceThreadIds = new Set<string>();
    let movedCount = 0;

    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    for (const commId of args.communicationIds) {
      const comm = await ctx.db.get(commId);
      if (!comm) continue;

      // Track the source thread for summary regeneration
      if (comm.threadId && comm.threadId !== args.targetThreadId) {
        sourceThreadIds.add(comm.threadId);
      }

      // Move to target thread
      await ctx.db.patch(commId, {
        threadId: args.targetThreadId,
        updatedAt: now,
      });
      movedCount++;
    }

    // Regenerate all affected thread summaries (sources + target)
    for (const threadId of sourceThreadIds) {
      await regenerateThreadSummary(ctx, threadId);
    }
    await regenerateThreadSummary(ctx, args.targetThreadId);

    // Audit log
    await ctx.runMutation(internal.auditLog.log, {
      userId: user._id,
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`,
      action: "bulk_thread",
      entityType: "communication",
      entityName: `Bulk thread: ${movedCount} → ${args.targetThreadId}`,
      metadata: JSON.stringify({
        communicationIds: args.communicationIds,
        targetThreadId: args.targetThreadId,
        movedCount,
        sourceThreadIds: [...sourceThreadIds],
      }),
    });

    return { movedCount, sourceThreadsAffected: sourceThreadIds.size };
  },
});

/**
 * Task 6B.4: Bulk Add Flags
 * Adds compliance flags to multiple communications (merges, no duplicates),
 * re-evaluates consultation gate if time_sensitive or requires_documentation added
 */
export const bulkAddFlags = mutation({
  args: {
    userId: v.id("users"),
    communicationIds: v.array(v.id("communications")),
    flags: v.array(v.union(
      v.literal("requires_documentation"),
      v.literal("time_sensitive"),
      v.literal("escalation_required"),
      v.literal("ndia_reportable"),
      v.literal("legal_hold")
    )),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.userId, "communications", "update");

    if (args.communicationIds.length === 0) {
      throw new Error("No communication IDs provided");
    }
    if (args.communicationIds.length > 100) {
      throw new Error("Maximum 100 communications per bulk operation");
    }
    if (args.flags.length === 0) {
      throw new Error("No flags provided");
    }

    const now = Date.now();
    let updatedCount = 0;
    let gateTriggeredCount = 0;

    // Check if any gate-triggering flags are being added
    const gateRelevantFlags = ["time_sensitive", "requires_documentation"];
    const hasGateRelevantFlag = args.flags.some(f => gateRelevantFlags.includes(f));

    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    for (const commId of args.communicationIds) {
      const comm = await ctx.db.get(commId);
      if (!comm) continue;

      // Merge flags without duplicates
      const existingFlags = comm.complianceFlags || [];
      const mergedFlags = [...new Set([...existingFlags, ...args.flags])];

      await ctx.db.patch(commId, {
        complianceFlags: mergedFlags,
        updatedAt: now,
      });
      updatedCount++;

      // Re-evaluate consultation gate if gate-relevant flags were added
      if (hasGateRelevantFlag && !comm.requiresFollowUp) {
        const commForGate: CommunicationForGate = {
          _id: comm._id,
          threadId: comm.threadId,
          complianceCategory: comm.complianceCategory,
          complianceFlags: mergedFlags,
          isParticipantInvolved: comm.isParticipantInvolved,
          contactType: comm.contactType,
          stakeholderEntityType: comm.stakeholderEntityType,
          participantId: comm.participantId || comm.linkedParticipantId,
        };

        // Get thread comms for gate evaluation
        let threadCommsForGate: CommunicationForGate[] = [];
        if (comm.threadId) {
          const threadComms = await ctx.db
            .query("communications")
            .withIndex("by_thread", (q: any) => q.eq("threadId", comm.threadId))
            .collect();
          threadCommsForGate = threadComms
            .filter((c: any) => c._id !== comm._id)
            .map((c: any) => ({
              _id: c._id,
              threadId: c.threadId,
              complianceCategory: c.complianceCategory,
              complianceFlags: c.complianceFlags,
              isParticipantInvolved: c.isParticipantInvolved,
              contactType: c.contactType,
              stakeholderEntityType: c.stakeholderEntityType,
              participantId: c.participantId || c.linkedParticipantId,
            }));
        }

        const gateResult = checkConsultationGate(commForGate, threadCommsForGate);
        if (gateResult.triggered) {
          await ctx.db.patch(commId, { requiresFollowUp: true, updatedAt: now });
          gateTriggeredCount++;

          await ctx.runMutation(internal.tasks.createFollowUpTask, {
            communicationId: commId,
            userId: args.userId,
            participantId: comm.linkedParticipantId,
            propertyId: comm.linkedPropertyId,
            subject: comm.subject,
            priority: gateResult.recommendedPriority,
            dueDateOffset: gateResult.recommendedDueDateOffset,
            category: "follow_up",
          });
        }
      }
    }

    // Audit log
    await ctx.runMutation(internal.auditLog.log, {
      userId: user._id,
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`,
      action: "bulk_flag",
      entityType: "communication",
      entityName: `Bulk flags: ${updatedCount} comms + [${args.flags.join(", ")}]`,
      metadata: JSON.stringify({
        communicationIds: args.communicationIds,
        addedFlags: args.flags,
        updatedCount,
        gateTriggeredCount,
      }),
    });

    return { updatedCount, gateTriggeredCount };
  },
});

// ============================================================
// PHASE v1.5: SOFT DELETE, THREAD STATUS, PARTICIPANT THREADING
// ============================================================

/**
 * v1.5: Restore a soft-deleted communication (admin only)
 */
export const restore = mutation({
  args: {
    id: v.id("communications"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, args.userId, "communications", "delete");

    // Admin-only
    if (user.role !== "admin") {
      throw new Error("Only admins can restore deleted communications");
    }

    const communication = await ctx.db.get(args.id);
    if (!communication) {
      throw new Error("Communication not found");
    }

    if (!communication.isDeleted) {
      throw new Error("Communication is not deleted");
    }

    // Restore
    await ctx.db.patch(args.id, {
      isDeleted: undefined,
      deletedAt: undefined,
      deletedBy: undefined,
      updatedAt: Date.now(),
    });

    // Regenerate thread summary
    if (communication.threadId) {
      await regenerateThreadSummary(ctx, communication.threadId);
    }

    // Audit log
    await ctx.runMutation(internal.auditLog.log, {
      userId: user._id,
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`,
      action: "restore",
      entityType: "communication",
      entityId: args.id,
      entityName: `Restored: ${communication.communicationType} - ${communication.contactName}`,
      metadata: JSON.stringify({
        previousDeletedAt: communication.deletedAt,
        previousDeletedBy: communication.deletedBy,
      }),
    });
  },
});

/**
 * v1.5: Update thread status (active/completed/archived)
 */
export const updateThreadStatus = mutation({
  args: {
    userId: v.id("users"),
    threadId: v.string(),
    status: v.union(v.literal("active"), v.literal("completed"), v.literal("archived")),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, args.userId, "communications", "update");

    const summary = await ctx.db
      .query("threadSummaries")
      .withIndex("by_thread", (q: any) => q.eq("threadId", args.threadId))
      .first();

    if (!summary) {
      throw new Error("Thread not found");
    }

    const previousStatus = summary.status || "active";

    await ctx.db.patch(summary._id, {
      status: args.status,
    });

    // Audit log
    await ctx.runMutation(internal.auditLog.log, {
      userId: user._id,
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`,
      action: "thread_status_change",
      entityType: "communication",
      entityName: `Thread "${summary.subject}" status: ${previousStatus} → ${args.status}`,
      metadata: JSON.stringify({
        threadId: args.threadId,
        previousStatus,
        newStatus: args.status,
      }),
    });
  },
});

/**
 * v1.5: Get deleted communications (admin only)
 */
export const getDeletedCommunications = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.userId, "communications", "view");

    // Get user and check admin
    const user = await ctx.db.get(args.userId);
    if (!user || user.role !== "admin") {
      return [];
    }

    const deleted = await ctx.db
      .query("communications")
      .order("desc")
      .filter((q) => q.eq(q.field("isDeleted"), true))
      .collect();

    // Batch fetch deletedBy user names
    const deletedByIds = [...new Set(deleted.map(c => c.deletedBy).filter(Boolean))];
    const deletedByUsers = await Promise.all(deletedByIds.map(id => ctx.db.get(id!)));
    const deletedByMap = new Map(
      deletedByUsers.filter(Boolean).map(u => [u!._id, `${u!.firstName} ${u!.lastName}`])
    );

    return deleted.map(c => ({
      _id: c._id,
      communicationType: c.communicationType,
      contactName: c.contactName,
      subject: c.subject,
      summary: c.summary,
      deletedAt: c.deletedAt,
      deletedByName: c.deletedBy ? deletedByMap.get(c.deletedBy) || "Unknown" : "Unknown",
      threadId: c.threadId,
      createdAt: c.createdAt,
    }));
  },
});

/**
 * v1.5: Get communications grouped by thread for a participant
 * Used on participant detail pages for collapsible thread sections
 */
export const getByParticipantThreaded = query({
  args: {
    participantId: v.id("participants"),
  },
  handler: async (ctx, args) => {
    // Get all thread summaries for this participant
    const summaries = await ctx.db
      .query("threadSummaries")
      .withIndex("by_participant_activity", (q: any) =>
        q.eq("participantId", args.participantId)
      )
      .collect();

    // For each thread, get active (non-deleted) messages
    const threads = await Promise.all(
      summaries.map(async (summary) => {
        const messages = await ctx.db
          .query("communications")
          .withIndex("by_thread", (q: any) => q.eq("threadId", summary.threadId))
          .collect();

        const activeMessages = messages
          .filter((m: any) => !m.isDeleted)
          .sort((a: any, b: any) => a.createdAt - b.createdAt);

        if (activeMessages.length === 0) return null;

        return {
          threadId: summary.threadId,
          subject: summary.subject,
          status: summary.status || "active",
          lastActivityAt: summary.lastActivityAt,
          messageCount: activeMessages.length,
          participantNames: summary.participantNames,
          contactName: activeMessages[0]?.contactName || "Unknown",
          complianceCategories: summary.complianceCategories,
          requiresAction: summary.requiresAction,
          messages: activeMessages.map((m: any) => ({
            _id: m._id,
            communicationType: m.communicationType,
            type: m.communicationType,
            direction: m.direction,
            contactName: m.contactName,
            subject: m.subject,
            summary: m.summary,
            createdAt: m.createdAt,
            communicationDate: m.communicationDate,
            communicationTime: m.communicationTime,
            complianceCategory: m.complianceCategory,
          })),
        };
      })
    );

    // Filter out null (threads with all deleted messages) and sort by lastActivityAt DESC
    const activeThreads = threads
      .filter(Boolean)
      .sort((a: any, b: any) => b.lastActivityAt - a.lastActivityAt);

    return { threads: activeThreads };
  },
});

/**
 * v1.5: Soft-delete all communications for a given contact name
 * Used by StakeholderView to remove an entire stakeholder's comms
 */
export const deleteByContactName = mutation({
  args: {
    userId: v.id("users"),
    contactName: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, args.userId, "communications", "delete");

    // Find all active communications for this contact name (case-insensitive)
    const allComms = await ctx.db.query("communications").collect();
    const targetComms = allComms.filter(
      (c) =>
        c.contactName.toLowerCase() === args.contactName.toLowerCase() &&
        !c.isDeleted
    );

    if (targetComms.length === 0) {
      throw new Error("No communications found for this contact");
    }

    const now = Date.now();
    const threadIds = new Set<string>();

    // Soft-delete each communication
    for (const comm of targetComms) {
      await ctx.db.patch(comm._id, {
        isDeleted: true,
        deletedAt: now,
        deletedBy: args.userId,
        updatedAt: now,
      });
      if (comm.threadId) {
        threadIds.add(comm.threadId);
      }
    }

    // Regenerate thread summaries for affected threads
    for (const threadId of threadIds) {
      await regenerateThreadSummary(ctx, threadId);
    }

    // Audit log
    await ctx.runMutation(internal.auditLog.log, {
      userId: user._id,
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`,
      action: "delete",
      entityType: "communication",
      entityId: targetComms[0]._id,
      entityName: `Bulk delete: ${targetComms.length} communications for ${args.contactName}`,
    });

    return { deletedCount: targetComms.length };
  },
});

/**
 * Internal: Auto-create a communication entry when an incident is created.
 * Called from incidents.create - no permission check needed (internal).
 */
export const autoCreateForIncident = internalMutation({
  args: {
    incidentId: v.id("incidents"),
    incidentTitle: v.string(),
    incidentDescription: v.string(),
    incidentType: v.string(),
    severity: v.string(),
    incidentDate: v.string(),
    incidentTime: v.optional(v.string()),
    propertyId: v.id("properties"),
    participantId: v.optional(v.id("participants")),
    isNdisReportable: v.boolean(),
    createdBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Get the user who created the incident
    const user = await ctx.db.get(args.createdBy);
    if (!user) return;

    // Get participant name if linked
    let contactName = `${user.firstName} ${user.lastName}`;
    if (args.participantId) {
      const participant = await ctx.db.get(args.participantId);
      if (participant) {
        contactName = `${participant.firstName} ${participant.lastName}`;
      }
    }

    // Build compliance flags
    const complianceFlags: ("ndia_reportable" | "requires_documentation" | "time_sensitive" | "escalation_required" | "legal_hold")[] = ["requires_documentation"];
    if (args.isNdisReportable) {
      complianceFlags.push("ndia_reportable");
      complianceFlags.push("time_sensitive");
    }

    // Create a new thread for this incident
    const threadId = `thread_incident_${args.incidentId}_${now}`;

    // Truncate description for summary (max 500 chars)
    const summary = `[Auto-created from incident] ${args.incidentDescription.substring(0, 500)}`;

    // Create the communication entry
    const communicationId = await ctx.db.insert("communications", {
      communicationType: "other" as const,
      direction: "sent" as const,
      communicationDate: args.incidentDate,
      communicationTime: args.incidentTime,
      contactType: args.participantId ? "participant" as const : "other" as const,
      contactName,
      subject: `Incident: ${args.incidentTitle}`,
      summary,
      linkedParticipantId: args.participantId,
      linkedPropertyId: args.propertyId,
      linkedIncidentId: args.incidentId,
      complianceCategory: "incident_related" as const,
      complianceFlags,
      createdBy: args.createdBy,
      isThreadStarter: true,
      requiresFollowUp: args.isNdisReportable,
      isParticipantInvolved: args.participantId != null,
      threadId,
      participantId: args.participantId,
      createdAt: now,
      updatedAt: now,
    });

    // Create thread summary if participant is linked
    if (args.participantId) {
      await ctx.db.insert("threadSummaries", {
        threadId,
        participantId: args.participantId,
        startedAt: now,
        lastActivityAt: now,
        messageCount: 1,
        participantNames: [contactName],
        subject: `Incident: ${args.incidentTitle}`,
        previewText: summary.substring(0, 100),
        hasUnread: true,
        complianceCategories: ["incident_related"],
        requiresAction: args.isNdisReportable,
      });
    }

    // Audit log
    await ctx.runMutation(internal.auditLog.log, {
      userId: user._id,
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`,
      action: "create",
      entityType: "communication",
      entityId: communicationId,
      entityName: `Auto-created from incident: ${args.incidentTitle}`,
      metadata: JSON.stringify({
        autoCreated: true,
        incidentId: args.incidentId,
        incidentType: args.incidentType,
        severity: args.severity,
      }),
    });

    return communicationId;
  },
});
