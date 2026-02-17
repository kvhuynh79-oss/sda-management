import { mutation, query, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { requireTenant, getUserFullName } from "./authHelpers";

// ============================================================================
// Queries
// ============================================================================

/**
 * getByOrganization - Get all support tickets for the current user's org.
 * Returns tickets sorted by createdAt desc, enriched with message count.
 */
export const getByOrganization = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);

    const tickets = await ctx.db
      .query("supportTickets")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
      .collect();

    // Enrich each ticket with message count
    const ticketsWithCounts = await Promise.all(
      tickets.map(async (ticket) => {
        const messages = await ctx.db
          .query("supportTicketMessages")
          .withIndex("by_ticketId", (q) => q.eq("ticketId", ticket._id))
          .collect();

        return {
          ...ticket,
          messageCount: messages.length,
        };
      })
    );

    // Sort by createdAt descending (most recent first)
    ticketsWithCounts.sort((a, b) => b.createdAt - a.createdAt);

    return ticketsWithCounts;
  },
});

/**
 * getAllTickets - Get ALL support tickets across all orgs.
 * Super-admin only. Enriched with org name and message count.
 */
export const getAllTickets = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user?.isSuperAdmin) {
      throw new Error("Unauthorized: super-admin access required");
    }

    const tickets = await ctx.db
      .query("supportTickets")
      .withIndex("by_createdAt")
      .order("desc")
      .collect();

    // Build org lookup map to avoid N+1
    const orgIdSet = new Set(tickets.map((t) => t.organizationId));
    const orgIds = Array.from(orgIdSet);
    const orgMap = new Map<string, string>();
    for (const orgId of orgIds) {
      const org = await ctx.db.get(orgId);
      if (org) {
        orgMap.set(orgId, org.name);
      }
    }

    // Enrich each ticket with org name and message count
    const ticketsWithDetails = await Promise.all(
      tickets.map(async (ticket) => {
        const messages = await ctx.db
          .query("supportTicketMessages")
          .withIndex("by_ticketId", (q) => q.eq("ticketId", ticket._id))
          .collect();

        return {
          ...ticket,
          organizationName: orgMap.get(ticket.organizationId) || "Unknown",
          messageCount: messages.length,
        };
      })
    );

    return ticketsWithDetails;
  },
});

/**
 * getById - Get a single ticket with all messages, creator name, and org name.
 * Access check: user must be in same org, or be a super-admin.
 */
export const getById = query({
  args: {
    userId: v.id("users"),
    ticketId: v.id("supportTickets"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket) {
      return null;
    }

    // Access check: same org or super-admin
    if (!user.isSuperAdmin && user.organizationId !== ticket.organizationId) {
      throw new Error("Unauthorized: you do not have access to this ticket");
    }

    // Get all messages sorted by createdAt ascending
    const messages = await ctx.db
      .query("supportTicketMessages")
      .withIndex("by_ticketId", (q) => q.eq("ticketId", args.ticketId))
      .collect();

    messages.sort((a, b) => a.createdAt - b.createdAt);

    // Resolve screenshot URL
    const screenshotUrl = ticket.screenshotStorageId
      ? await ctx.storage.getUrl(ticket.screenshotStorageId)
      : null;

    // Resolve message attachment URLs
    const messagesWithUrls = await Promise.all(
      messages.map(async (msg) => {
        const attachmentUrl = msg.attachmentStorageId
          ? await ctx.storage.getUrl(msg.attachmentStorageId)
          : null;
        return { ...msg, attachmentUrl };
      })
    );

    // Get creator name
    const creator = await ctx.db.get(ticket.createdByUserId);
    const creatorName = creator
      ? `${creator.firstName} ${creator.lastName}`
      : "Unknown User";

    // Get org name
    const org = await ctx.db.get(ticket.organizationId);
    const organizationName = org?.name || "Unknown";

    return {
      ...ticket,
      screenshotUrl,
      messages: messagesWithUrls,
      creatorName,
      organizationName,
    };
  },
});

/**
 * getTicketMetrics - Platform-wide ticket metrics for super-admin dashboard.
 * Returns open, inProgress, avgResponseTime, slaCompliance, totalResolved.
 */
export const getTicketMetrics = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user?.isSuperAdmin) {
      throw new Error("Unauthorized: super-admin access required");
    }

    const allTickets = await ctx.db
      .query("supportTickets")
      .collect();

    const open = allTickets.filter((t) => t.status === "open").length;
    const inProgress = allTickets.filter(
      (t) => t.status === "in_progress" || t.status === "waiting_on_customer"
    ).length;

    // Calculate average response time (ms) for tickets that have a first response
    const respondedTickets = allTickets.filter((t) => t.firstResponseAt);
    const avgResponseTime =
      respondedTickets.length > 0
        ? respondedTickets.reduce(
            (sum, t) => sum + (t.firstResponseAt! - t.createdAt),
            0
          ) / respondedTickets.length
        : 0;

    // Calculate SLA compliance: % of resolved tickets where firstResponseAt < slaDeadline
    const resolvedTickets = allTickets.filter(
      (t) => t.status === "resolved" || t.status === "closed"
    );
    const totalResolved = resolvedTickets.length;
    const slaCompliantCount = resolvedTickets.filter(
      (t) => t.firstResponseAt && t.firstResponseAt <= t.slaDeadline
    ).length;
    const slaCompliance =
      totalResolved > 0 ? (slaCompliantCount / totalResolved) * 100 : 100;

    return {
      open,
      inProgress,
      avgResponseTime,
      slaCompliance,
      totalResolved,
    };
  },
});

// ============================================================================
// Mutations
// ============================================================================

/**
 * create - Create a new support ticket.
 * Auto-generates TKT-0001 ticket number using supportTicketCounters.
 * Calculates SLA deadline based on severity.
 * Schedules email notification to super-admin.
 */
export const create = mutation({
  args: {
    userId: v.id("users"),
    subject: v.string(),
    description: v.string(),
    severity: v.union(
      v.literal("critical"),
      v.literal("high"),
      v.literal("normal"),
      v.literal("low")
    ),
    category: v.union(
      v.literal("bug"),
      v.literal("how_to"),
      v.literal("feature_request"),
      v.literal("billing"),
      v.literal("data_issue"),
      v.literal("other")
    ),
    pageUrl: v.optional(v.string()),
    browserInfo: v.optional(v.string()),
    screenshotStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const { organizationId, user } = await requireTenant(ctx, args.userId);
    const now = Date.now();

    // Auto-generate ticket number: TKT-0001 (platform-wide counter)
    const ticketNumber = await generateTicketNumber(ctx);

    // Calculate SLA deadline based on severity
    // Critical: 4 hours, everything else: 24 hours
    const slaHours = args.severity === "critical" ? 4 : 24;
    const slaDeadline = now + slaHours * 60 * 60 * 1000;

    const ticketId = await ctx.db.insert("supportTickets", {
      organizationId,
      createdByUserId: args.userId,
      ticketNumber,
      subject: args.subject,
      description: args.description,
      severity: args.severity,
      category: args.category,
      status: "open",
      pageUrl: args.pageUrl,
      browserInfo: args.browserInfo,
      screenshotStorageId: args.screenshotStorageId,
      slaDeadline,
      createdAt: now,
      updatedAt: now,
    });

    // Get org name for the notification email
    const org = await ctx.db.get(organizationId);
    const orgName = org?.name || "Unknown Org";

    // Schedule email notification to super-admin (async, non-blocking)
    await ctx.scheduler.runAfter(0, internal.supportTickets.notifySuperAdmin, {
      ticketId,
      ticketNumber,
      subject: args.subject,
      description: args.description.substring(0, 300),
      severity: args.severity,
      category: args.category,
      organizationName: orgName,
      creatorName: getUserFullName(user),
      creatorEmail: user.email,
    });

    // Audit log
    await ctx.runMutation(internal.auditLog.log, {
      organizationId,
      userId: args.userId,
      userEmail: user.email,
      userName: getUserFullName(user),
      action: "create",
      entityType: "support_ticket",
      entityId: ticketId,
      entityName: `${ticketNumber}: ${args.subject}`,
      metadata: JSON.stringify({
        severity: args.severity,
        category: args.category,
        slaDeadline,
      }),
    });

    return { ticketId, ticketNumber };
  },
});

/**
 * addMessage - Add a reply message to a support ticket.
 * Determines authorRole based on super-admin status.
 * Tracks first admin response time for SLA.
 */
export const addMessage = mutation({
  args: {
    userId: v.id("users"),
    ticketId: v.id("supportTickets"),
    message: v.string(),
    attachmentStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket) {
      throw new Error("Ticket not found");
    }

    // Access check: same org or super-admin
    if (!user.isSuperAdmin && user.organizationId !== ticket.organizationId) {
      throw new Error("Unauthorized: you do not have access to this ticket");
    }

    const now = Date.now();
    const authorRole = user.isSuperAdmin ? "admin" : "customer";
    const authorName = `${user.firstName} ${user.lastName}`;

    // Create the message
    await ctx.db.insert("supportTicketMessages", {
      ticketId: args.ticketId,
      authorUserId: args.userId,
      authorName,
      authorRole,
      message: args.message,
      attachmentStorageId: args.attachmentStorageId,
      createdAt: now,
    });

    // If this is an admin reply and firstResponseAt is not set, record it (SLA tracking)
    const updates: Record<string, unknown> = { updatedAt: now };
    if (authorRole === "admin" && !ticket.firstResponseAt) {
      updates.firstResponseAt = now;
    }

    await ctx.db.patch(args.ticketId, updates);

    return { success: true };
  },
});

/**
 * updateStatus - Change a ticket's status.
 * Super-admin only. Sets resolvedAt when status is "resolved".
 */
export const updateStatus = mutation({
  args: {
    userId: v.id("users"),
    ticketId: v.id("supportTickets"),
    status: v.union(
      v.literal("open"),
      v.literal("in_progress"),
      v.literal("waiting_on_customer"),
      v.literal("resolved"),
      v.literal("closed")
    ),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user?.isSuperAdmin) {
      throw new Error("Unauthorized: super-admin access required");
    }

    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket) {
      throw new Error("Ticket not found");
    }

    const now = Date.now();
    const previousStatus = ticket.status;

    const updates: Record<string, unknown> = {
      status: args.status,
      updatedAt: now,
    };

    // Set resolvedAt when moving to resolved status
    if (args.status === "resolved" && !ticket.resolvedAt) {
      updates.resolvedAt = now;
    }

    await ctx.db.patch(args.ticketId, updates);

    // Add a system message for the status change
    await ctx.db.insert("supportTicketMessages", {
      ticketId: args.ticketId,
      authorName: "System",
      authorRole: "system",
      message: `Status changed from "${previousStatus}" to "${args.status}" by ${user.firstName} ${user.lastName}`,
      createdAt: now,
    });

    // Audit log
    await ctx.runMutation(internal.auditLog.log, {
      userId: args.userId,
      userEmail: user.email,
      userName: getUserFullName(user),
      action: "update",
      entityType: "support_ticket",
      entityId: args.ticketId,
      entityName: `${ticket.ticketNumber}: ${ticket.subject}`,
      changes: JSON.stringify({ status: args.status }),
      previousValues: JSON.stringify({ status: previousStatus }),
    });

    return { success: true };
  },
});

/**
 * assignTicket - Assign a ticket to a super-admin.
 * Super-admin only.
 */
export const assignTicket = mutation({
  args: {
    userId: v.id("users"),
    ticketId: v.id("supportTickets"),
    assignedTo: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user?.isSuperAdmin) {
      throw new Error("Unauthorized: super-admin access required");
    }

    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket) {
      throw new Error("Ticket not found");
    }

    const previousAssignedTo = ticket.assignedTo;

    await ctx.db.patch(args.ticketId, {
      assignedTo: args.assignedTo,
      updatedAt: Date.now(),
    });

    // Add a system message for the assignment
    await ctx.db.insert("supportTicketMessages", {
      ticketId: args.ticketId,
      authorName: "System",
      authorRole: "system",
      message: `Ticket assigned to ${args.assignedTo} by ${user.firstName} ${user.lastName}`,
      createdAt: Date.now(),
    });

    // Audit log
    await ctx.runMutation(internal.auditLog.log, {
      userId: args.userId,
      userEmail: user.email,
      userName: getUserFullName(user),
      action: "update",
      entityType: "support_ticket",
      entityId: args.ticketId,
      entityName: `${ticket.ticketNumber}: ${ticket.subject}`,
      changes: JSON.stringify({ assignedTo: args.assignedTo }),
      previousValues: JSON.stringify({ assignedTo: previousAssignedTo }),
    });

    return { success: true };
  },
});

/**
 * generateUploadUrl - Generate a Convex storage upload URL for screenshot attachments.
 */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

// ============================================================================
// Internal Actions
// ============================================================================

/**
 * notifySuperAdmin - Send email notification to super-admin when a new ticket is created.
 * Uses Resend API. Logs errors but does not throw (non-blocking).
 */
export const notifySuperAdmin = internalAction({
  args: {
    ticketId: v.id("supportTickets"),
    ticketNumber: v.string(),
    subject: v.string(),
    description: v.string(),
    severity: v.string(),
    category: v.string(),
    organizationName: v.string(),
    creatorName: v.string(),
    creatorEmail: v.string(),
  },
  handler: async (_ctx, args): Promise<void> => {
    const apiKey = process.env.RESEND_API_KEY;
    const adminEmail = process.env.ADMIN_EMAIL || "khen@betterlivingsolutions.com.au";
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://mysdamanager.com";

    if (!apiKey) {
      console.error("[supportTickets.notifySuperAdmin] RESEND_API_KEY not configured, skipping email notification");
      return;
    }

    const severityColors: Record<string, string> = {
      critical: "#ef4444",
      high: "#f97316",
      normal: "#eab308",
      low: "#6b7280",
    };
    const severityColor = severityColors[args.severity] || "#eab308";

    const categoryLabel = args.category
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #0d9488; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 20px;">New Support Ticket</h1>
        </div>
        <div style="background-color: #1f2937; color: #e5e7eb; padding: 24px;">
          <div style="background-color: #374151; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #9ca3af;">Ticket Number</p>
            <p style="margin: 0; font-size: 24px; font-weight: bold; color: white;">${args.ticketNumber}</p>
          </div>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
            <tr>
              <td style="padding: 8px 0; color: #9ca3af; font-size: 14px;">Organization</td>
              <td style="padding: 8px 0; color: white; font-size: 14px; text-align: right;">${args.organizationName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #9ca3af; font-size: 14px;">Subject</td>
              <td style="padding: 8px 0; color: white; font-size: 14px; text-align: right;">${args.subject}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #9ca3af; font-size: 14px;">Category</td>
              <td style="padding: 8px 0; color: white; font-size: 14px; text-align: right;">${categoryLabel}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #9ca3af; font-size: 14px;">Severity</td>
              <td style="padding: 8px 0; color: ${severityColor}; font-size: 14px; text-align: right; font-weight: bold;">${args.severity.toUpperCase()}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #9ca3af; font-size: 14px;">Submitted By</td>
              <td style="padding: 8px 0; color: white; font-size: 14px; text-align: right;">${args.creatorName} (${args.creatorEmail})</td>
            </tr>
          </table>
          <div style="background-color: #374151; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #9ca3af;">Description</p>
            <p style="margin: 0; color: #e5e7eb; font-size: 14px; white-space: pre-wrap;">${args.description}</p>
          </div>
          <div style="text-align: center;">
            <a href="${appUrl}/admin/platform/tickets/${args.ticketId}"
               style="display: inline-block; background-color: #0d9488; color: white; padding: 12px 32px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: bold;">
              View Ticket
            </a>
          </div>
        </div>
        <div style="background-color: #111827; padding: 16px; text-align: center;">
          <p style="margin: 0; color: #6b7280; font-size: 12px;">MySDAManager Support Ticket System</p>
        </div>
      </div>
    `;

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "MySDAManager <noreply@mysdamanager.com>",
          to: adminEmail,
          subject: `[${args.severity.toUpperCase()}] Support Ticket ${args.ticketNumber}: ${args.subject}`,
          html: htmlContent,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error(
          `[supportTickets.notifySuperAdmin] Failed to send email (HTTP ${response.status}):`,
          errorData
        );
      } else {
        const data = await response.json();
        console.log(
          `[supportTickets.notifySuperAdmin] Email sent successfully. MessageId: ${data.id}`
        );
      }
    } catch (error) {
      console.error(
        "[supportTickets.notifySuperAdmin] Error sending email:",
        error instanceof Error ? error.message : String(error)
      );
    }
  },
});

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Generate the next sequential ticket number platform-wide.
 * Format: TKT-0001
 * Uses supportTicketCounters table for atomic incrementing.
 */
async function generateTicketNumber(
  ctx: { db: any }
): Promise<string> {
  // supportTicketCounters has no index - there should be exactly 0 or 1 records
  const existing = await ctx.db
    .query("supportTicketCounters")
    .first();

  let nextNumber: number;

  if (existing) {
    nextNumber = existing.lastNumber + 1;
    await ctx.db.patch(existing._id, {
      lastNumber: nextNumber,
      updatedAt: Date.now(),
    });
  } else {
    nextNumber = 1;
    await ctx.db.insert("supportTicketCounters", {
      lastNumber: nextNumber,
      updatedAt: Date.now(),
    });
  }

  return `TKT-${String(nextNumber).padStart(4, "0")}`;
}
