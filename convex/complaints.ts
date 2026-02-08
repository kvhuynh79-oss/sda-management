import { v } from "convex/values";
import { mutation, query, internalMutation, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireAuth, requirePermission, getUserFullName } from "./authHelpers";

// Generate a unique reference number for complaints: CMP-YYYYMMDD-XXXX
function generateReferenceNumber(): string {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let suffix = "";
  for (let i = 0; i < 4; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `CMP-${y}${m}${d}-${suffix}`;
}

// Get all complaints with optional filters
export const getAll = query({
  args: {
    userId: v.id("users"),
    status: v.optional(v.string()),
    category: v.optional(v.string()),
    severity: v.optional(v.string()),
    propertyId: v.optional(v.id("properties")),
    participantId: v.optional(v.id("participants")),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.userId);
    let complaints = await ctx.db.query("complaints").collect();

    if (args.status) {
      complaints = complaints.filter(c => c.status === args.status);
    }
    if (args.category) {
      complaints = complaints.filter(c => c.category === args.category);
    }
    if (args.severity) {
      complaints = complaints.filter(c => c.severity === args.severity);
    }
    if (args.propertyId) {
      complaints = complaints.filter(c => c.propertyId === args.propertyId);
    }
    if (args.participantId) {
      complaints = complaints.filter(c => c.participantId === args.participantId);
    }

    // Enrich with related data
    const enriched = await Promise.all(
      complaints.map(async (complaint) => {
        const participant = complaint.participantId ? await ctx.db.get(complaint.participantId) : null;
        const property = complaint.propertyId ? await ctx.db.get(complaint.propertyId) : null;
        const receivedByUser = await ctx.db.get(complaint.receivedBy);
        const assignedToUser = complaint.assignedTo ? await ctx.db.get(complaint.assignedTo) : null;
        return { ...complaint, participant, property, receivedByUser, assignedToUser };
      })
    );

    return enriched.sort((a, b) => new Date(b.receivedDate).getTime() - new Date(a.receivedDate).getTime());
  },
});

// Get complaints requiring acknowledgment (received but not acknowledged within 5 business days)
export const getPendingAcknowledgment = query({
  args: {},
  handler: async (ctx) => {
    const complaints = await ctx.db.query("complaints")
      .filter(q => q.eq(q.field("status"), "received"))
      .collect();

    const today = new Date();

    // Filter to those needing acknowledgment (5 business days = roughly 7 calendar days)
    const needsAck = complaints.filter(c => {
      if (c.acknowledgedDate) return false;
      const receivedDate = new Date(c.receivedDate);
      const daysSinceReceived = Math.floor((today.getTime() - receivedDate.getTime()) / (1000 * 60 * 60 * 24));
      return daysSinceReceived >= 3; // Flag when approaching deadline
    });

    // Enrich with related data
    const enriched = await Promise.all(
      needsAck.map(async (complaint) => {
        const participant = complaint.participantId ? await ctx.db.get(complaint.participantId) : null;
        const property = complaint.propertyId ? await ctx.db.get(complaint.propertyId) : null;
        return { ...complaint, participant, property };
      })
    );

    return enriched;
  },
});

// Get complaint by ID
export const getById = query({
  args: { complaintId: v.id("complaints") },
  handler: async (ctx, args) => {
    const complaint = await ctx.db.get(args.complaintId);
    if (!complaint) return null;

    const participant = complaint.participantId ? await ctx.db.get(complaint.participantId) : null;
    const property = complaint.propertyId ? await ctx.db.get(complaint.propertyId) : null;
    const receivedByUser = await ctx.db.get(complaint.receivedBy);
    const assignedToUser = complaint.assignedTo ? await ctx.db.get(complaint.assignedTo) : null;

    return { ...complaint, participant, property, receivedByUser, assignedToUser };
  },
});

// Create complaint (internal / staff-created)
export const create = mutation({
  args: {
    userId: v.id("users"),
    complainantType: v.union(
      v.literal("participant"),
      v.literal("family_carer"),
      v.literal("support_coordinator"),
      v.literal("sil_provider"),
      v.literal("staff"),
      v.literal("anonymous"),
      v.literal("other")
    ),
    complainantName: v.optional(v.string()),
    complainantContact: v.optional(v.string()),
    participantId: v.optional(v.id("participants")),
    propertyId: v.optional(v.id("properties")),
    complaintDate: v.string(),
    receivedDate: v.string(),
    category: v.union(
      v.literal("service_delivery"),
      v.literal("staff_conduct"),
      v.literal("property_condition"),
      v.literal("communication"),
      v.literal("billing"),
      v.literal("privacy"),
      v.literal("safety"),
      v.literal("other")
    ),
    description: v.string(),
    severity: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("critical")
    ),
    assignedTo: v.optional(v.id("users")),
    advocacyOffered: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Permission check
    const user = await requireAuth(ctx, args.userId);
    const { userId, ...complaintData } = args;
    const now = Date.now();

    // Generate reference number
    const referenceNumber = generateReferenceNumber();

    // Calculate 24-hour acknowledgment deadline from receivedDate
    const receivedDateObj = new Date(args.receivedDate);
    const dueDate = new Date(receivedDateObj.getTime() + 24 * 60 * 60 * 1000);
    const acknowledgmentDueDate = dueDate.toISOString();

    // Calculate 21-business-day resolution deadline (~30 calendar days)
    const resolutionDue = new Date(receivedDateObj.getTime() + 30 * 24 * 60 * 60 * 1000);
    const resolutionDueDate = resolutionDue.toISOString();

    const complaintId = await ctx.db.insert("complaints", {
      ...complaintData,
      receivedBy: userId,
      status: "received",
      source: "internal",
      referenceNumber,
      acknowledgmentDueDate,
      acknowledgmentOverdue: false,
      resolutionDueDate,
      resolutionOverdue: false,
      createdAt: now,
      updatedAt: now,
    });

    // Audit log
    await ctx.runMutation(internal.auditLog.log, {
      userId,
      userEmail: user.email,
      userName: getUserFullName(user),
      action: "create",
      entityType: "complaint",
      entityId: complaintId,
      entityName: `${args.category} complaint: ${referenceNumber}`,
      metadata: JSON.stringify({ source: "internal", referenceNumber }),
    });

    return complaintId;
  },
});

// Public mutation for website-submitted complaints (NO auth check)
export const submitFromWebsite = mutation({
  args: {
    complainantType: v.union(
      v.literal("participant"),
      v.literal("family_carer"),
      v.literal("support_coordinator"),
      v.literal("sil_provider"),
      v.literal("staff"),
      v.literal("anonymous"),
      v.literal("other")
    ),
    complainantName: v.optional(v.string()),
    complainantContact: v.optional(v.string()),
    preferredContactMethod: v.optional(v.union(
      v.literal("email"),
      v.literal("phone"),
      v.literal("letter"),
      v.literal("sms")
    )),
    description: v.string(),
    category: v.union(
      v.literal("service_delivery"),
      v.literal("staff_conduct"),
      v.literal("property_condition"),
      v.literal("communication"),
      v.literal("billing"),
      v.literal("privacy"),
      v.literal("safety"),
      v.literal("other")
    ),
    severity: v.optional(v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("critical")
    )),
    participantName: v.optional(v.string()),
    propertyAddress: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const referenceNumber = generateReferenceNumber();
    const today = new Date().toISOString().split("T")[0];

    // Calculate 24-hour acknowledgment deadline
    const dueDate = new Date(now + 24 * 60 * 60 * 1000);
    const acknowledgmentDueDate = dueDate.toISOString();

    // Calculate 21-business-day resolution deadline (~30 calendar days)
    const resolutionDue = new Date(now + 30 * 24 * 60 * 60 * 1000);
    const resolutionDueDate = resolutionDue.toISOString();

    // Find first admin user to set as receivedBy
    const users = await ctx.db.query("users").collect();
    const adminUser = users.find(u => u.role === "admin");
    if (!adminUser) throw new Error("No admin user found to receive complaint");

    const complaintId = await ctx.db.insert("complaints", {
      complainantType: args.complainantType,
      complainantName: args.complainantName,
      complainantContact: args.complainantContact,
      preferredContactMethod: args.preferredContactMethod,
      complaintDate: today,
      receivedDate: today,
      receivedBy: adminUser._id,
      category: args.category,
      description: args.description,
      severity: args.severity || "medium",
      status: "received",
      source: "website",
      isLocked: true,
      referenceNumber,
      acknowledgmentDueDate,
      acknowledgmentOverdue: false,
      resolutionDueDate,
      resolutionOverdue: false,
      createdAt: now,
      updatedAt: now,
    });

    // Auto-create communication entry
    await ctx.runMutation(internal.communications.autoCreateForComplaint, {
      complaintId,
      referenceNumber,
      description: args.description,
      category: args.category,
      severity: args.severity || "medium",
      complainantName: args.complainantName || "Anonymous",
      createdBy: adminUser._id,
    });

    // Send email notification to staff
    await ctx.scheduler.runAfter(0, internal.complaints.notifyStaffOfNewComplaint, {
      referenceNumber,
      complaintId,
      category: args.category,
      severity: args.severity || "medium",
      complainantType: args.complainantType,
      complainantName: args.complainantName,
      preferredContactMethod: args.preferredContactMethod,
      description: args.description.substring(0, 200),
      acknowledgmentDueDate,
    });

    // Audit log
    await ctx.runMutation(internal.auditLog.log, {
      userId: adminUser._id,
      userEmail: adminUser.email,
      userName: `${adminUser.firstName} ${adminUser.lastName}`,
      action: "create",
      entityType: "complaint",
      entityId: complaintId,
      entityName: `Website complaint: ${referenceNumber}`,
      metadata: JSON.stringify({ source: "website", referenceNumber }),
    });

    return { referenceNumber, complaintId };
  },
});

// Internal action to send email notification when a new complaint is received
export const notifyStaffOfNewComplaint = internalAction({
  args: {
    referenceNumber: v.string(),
    complaintId: v.id("complaints"),
    category: v.string(),
    severity: v.string(),
    complainantType: v.string(),
    complainantName: v.optional(v.string()),
    preferredContactMethod: v.optional(v.string()),
    description: v.string(),
    acknowledgmentDueDate: v.string(),
  },
  handler: async (_ctx, args) => {
    const apiKey = process.env.RESEND_API_KEY;
    const adminEmail = process.env.ADMIN_EMAIL || "khen@betterlivingsolutions.com.au";
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://mysdamanager.com";

    if (!apiKey) {
      console.log("RESEND_API_KEY not configured, skipping email notification");
      return;
    }

    const dueDate = new Date(args.acknowledgmentDueDate);
    const formattedDue = dueDate.toLocaleString("en-AU", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Australia/Sydney"
    });

    const categoryLabel = args.category.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    const severityColor = args.severity === "critical" ? "#ef4444" : args.severity === "high" ? "#f97316" : "#eab308";

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #dc2626; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 20px;">NEW COMPLAINT - Immediate Action Required</h1>
        </div>
        <div style="background-color: #1f2937; color: #e5e7eb; padding: 24px;">
          <div style="background-color: #374151; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #9ca3af;">Reference Number</p>
            <p style="margin: 0; font-size: 24px; font-weight: bold; color: white;">${args.referenceNumber}</p>
          </div>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
            <tr>
              <td style="padding: 8px 0; color: #9ca3af; font-size: 14px;">Category</td>
              <td style="padding: 8px 0; color: white; font-size: 14px; text-align: right;">${categoryLabel}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #9ca3af; font-size: 14px;">Severity</td>
              <td style="padding: 8px 0; color: ${severityColor}; font-size: 14px; text-align: right; font-weight: bold;">${args.severity.toUpperCase()}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #9ca3af; font-size: 14px;">Complainant</td>
              <td style="padding: 8px 0; color: white; font-size: 14px; text-align: right;">${args.complainantName || "Anonymous"} (${args.complainantType.replace(/_/g, " ")})</td>
            </tr>
            ${args.preferredContactMethod ? `<tr>
              <td style="padding: 8px 0; color: #9ca3af; font-size: 14px;">Preferred Contact</td>
              <td style="padding: 8px 0; color: white; font-size: 14px; text-align: right;">${args.preferredContactMethod}</td>
            </tr>` : ""}
          </table>
          <div style="background-color: #374151; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #9ca3af;">Description</p>
            <p style="margin: 0; color: #e5e7eb; font-size: 14px;">${args.description}...</p>
          </div>
          <div style="background-color: #7f1d1d; border: 1px solid #dc2626; border-radius: 8px; padding: 16px; margin-bottom: 20px; text-align: center;">
            <p style="margin: 0; color: #fca5a5; font-size: 16px; font-weight: bold;">You have 24 hours to acknowledge this complaint</p>
            <p style="margin: 8px 0 0 0; color: #fca5a5; font-size: 14px;">Deadline: ${formattedDue}</p>
          </div>
          <div style="text-align: center;">
            <a href="${appUrl}/compliance/complaints/${args.complaintId}"
               style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 32px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: bold;">
              View Complaint
            </a>
          </div>
        </div>
        <div style="background-color: #111827; color: #6b7280; padding: 16px; text-align: center; font-size: 12px;">
          <p style="margin: 0;">NDIS Practice Standards require complaints to be acknowledged within 5 business days.</p>
          <p style="margin: 4px 0 0 0;">Better Living Solutions internal policy: 24-hour acknowledgment for all complaints.</p>
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
          to: [adminEmail],
          subject: `New Complaint Received - ${args.referenceNumber}`,
          html: htmlContent,
        }),
      });

      if (!response.ok) {
        console.error("Failed to send complaint notification email:", await response.text());
      }
    } catch (error) {
      console.error("Error sending complaint notification:", error);
    }
  },
});

// Acknowledge complaint
export const acknowledge = mutation({
  args: {
    userId: v.id("users"),
    complaintId: v.id("complaints"),
    acknowledgmentMethod: v.union(
      v.literal("email"),
      v.literal("phone"),
      v.literal("letter"),
      v.literal("in_person")
    ),
    acknowledgedDate: v.string(),
  },
  handler: async (ctx, args) => {
    // Permission check
    await requireAuth(ctx, args.userId);
    const complaint = await ctx.db.get(args.complaintId);
    if (!complaint) throw new Error("Complaint not found");

    await ctx.db.patch(args.complaintId, {
      acknowledgedDate: args.acknowledgedDate,
      acknowledgmentMethod: args.acknowledgmentMethod,
      acknowledgmentOverdue: false,
      status: "acknowledged",
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Update complaint
export const update = mutation({
  args: {
    userId: v.id("users"),
    complaintId: v.id("complaints"),
    assignedTo: v.optional(v.id("users")),
    investigationNotes: v.optional(v.string()),
    status: v.optional(v.union(
      v.literal("received"),
      v.literal("acknowledged"),
      v.literal("under_investigation"),
      v.literal("resolved"),
      v.literal("closed"),
      v.literal("escalated")
    )),
    advocacyOffered: v.optional(v.boolean()),
    advocacyAccepted: v.optional(v.boolean()),
    advocacyProvider: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Permission check
    await requireAuth(ctx, args.userId);
    const { complaintId, userId, ...updates } = args;
    const complaint = await ctx.db.get(complaintId);
    if (!complaint) throw new Error("Complaint not found");

    // Lock check: if complaint is locked (website-submitted), only allow certain fields
    const allowedLockedFields = new Set([
      "status",
      "assignedTo",
      "investigationNotes",
      "advocacyOffered",
      "advocacyAccepted",
      "advocacyProvider",
    ]);

    const filteredUpdates: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        if (complaint.isLocked && !allowedLockedFields.has(key)) {
          // Skip locked fields on website-submitted complaints
          continue;
        }
        filteredUpdates[key] = value;
      }
    }

    await ctx.db.patch(complaintId, filteredUpdates);
    return { success: true };
  },
});

// Resolve complaint
export const resolve = mutation({
  args: {
    userId: v.id("users"),
    complaintId: v.id("complaints"),
    resolutionDate: v.string(),
    resolutionDescription: v.string(),
    resolutionOutcome: v.union(
      v.literal("upheld"),
      v.literal("partially_upheld"),
      v.literal("not_upheld"),
      v.literal("withdrawn")
    ),
    complainantSatisfied: v.optional(v.boolean()),
    systemicIssueIdentified: v.optional(v.boolean()),
    correctiveActionsTaken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Permission check
    await requireAuth(ctx, args.userId);
    const { complaintId, userId, ...resolution } = args;
    const complaint = await ctx.db.get(complaintId);
    if (!complaint) throw new Error("Complaint not found");

    await ctx.db.patch(complaintId, {
      ...resolution,
      status: "resolved",
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Escalate to NDIS Commission
export const escalate = mutation({
  args: {
    userId: v.id("users"),
    complaintId: v.id("complaints"),
    escalationDate: v.string(),
    escalationReason: v.string(),
  },
  handler: async (ctx, args) => {
    // Permission check
    await requireAuth(ctx, args.userId);
    const complaint = await ctx.db.get(args.complaintId);
    if (!complaint) throw new Error("Complaint not found");

    await ctx.db.patch(args.complaintId, {
      escalatedToNdisCommission: true,
      escalationDate: args.escalationDate,
      escalationReason: args.escalationReason,
      status: "escalated",
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Close complaint
export const close = mutation({
  args: {
    userId: v.id("users"),
    complaintId: v.id("complaints"),
  },
  handler: async (ctx, args) => {
    // Permission check
    await requireAuth(ctx, args.userId);
    const complaint = await ctx.db.get(args.complaintId);
    if (!complaint) throw new Error("Complaint not found");

    await ctx.db.patch(args.complaintId, {
      status: "closed",
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Delete complaint
export const remove = mutation({
  args: {
    userId: v.id("users"),
    complaintId: v.id("complaints"),
  },
  handler: async (ctx, args) => {
    // Permission check - admin only
    await requirePermission(ctx, args.userId, "incidents", "delete");
    await ctx.db.delete(args.complaintId);
    return { success: true };
  },
});

// Log when a user views a complaint (audit trail for NDIS compliance)
export const logView = mutation({
  args: {
    userId: v.id("users"),
    complaintId: v.id("complaints"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.userId);
    const complaint = await ctx.db.get(args.complaintId);
    if (!complaint) return;

    await ctx.runMutation(internal.auditLog.log, {
      userId: args.userId,
      userEmail: user.email,
      userName: getUserFullName(user),
      action: "view",
      entityType: "complaint",
      entityId: args.complaintId,
      entityName: complaint.referenceNumber || `Complaint`,
    });
  },
});

// Log when a user opens the complaint procedure PDF (compliance evidence)
export const logProcedurePdfOpened = mutation({
  args: {
    userId: v.id("users"),
    complaintId: v.id("complaints"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.userId);
    const complaint = await ctx.db.get(args.complaintId);
    if (!complaint) throw new Error("Complaint not found");

    await ctx.db.patch(args.complaintId, {
      procedurePdfOpenedAt: Date.now(),
      procedurePdfOpenedBy: args.userId,
      updatedAt: Date.now(),
    });

    await ctx.runMutation(internal.auditLog.log, {
      userId: args.userId,
      userEmail: user.email,
      userName: getUserFullName(user),
      action: "view",
      entityType: "complaint",
      entityId: args.complaintId,
      entityName: complaint.referenceNumber || "Complaint",
      metadata: JSON.stringify({ action_detail: "procedure_pdf_opened" }),
    });
  },
});

// Update a compliance checklist step (SOP-001) with audit logging
const CHECKLIST_STEP_LABELS: Record<string, string> = {
  triage: "Step 1: Triage - Check for Reportable Incidents",
  acknowledge: "Step 2: Acknowledge - Contact complainant within 24hrs",
  investigate: "Step 3: Investigate - Gather evidence",
  resolve: "Step 4: Resolve - Provide written outcome within 21 days",
  close: "Step 5: Close & Improve - Log resolution and review trends",
};

export const updateChecklistStep = mutation({
  args: {
    userId: v.id("users"),
    complaintId: v.id("complaints"),
    step: v.union(
      v.literal("triage"),
      v.literal("acknowledge"),
      v.literal("investigate"),
      v.literal("resolve"),
      v.literal("close")
    ),
    completed: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.userId);
    const complaint = await ctx.db.get(args.complaintId);
    if (!complaint) throw new Error("Complaint not found");

    const now = Date.now();
    const existing = complaint.complianceChecklist ?? {
      triage: undefined,
      acknowledge: undefined,
      investigate: undefined,
      resolve: undefined,
      close: undefined,
    };

    // Build updated checklist with explicit type
    const stepValue = args.completed
      ? { completedAt: now, completedBy: args.userId }
      : undefined;

    const updatedChecklist = {
      ...existing,
      [args.step]: stepValue,
    };

    await ctx.db.patch(args.complaintId, {
      complianceChecklist: updatedChecklist,
      updatedAt: now,
    });

    // Audit log - each checklist action is timestamped for NDIS compliance
    const stepLabel = CHECKLIST_STEP_LABELS[args.step] || args.step;
    await ctx.runMutation(internal.auditLog.log, {
      userId: args.userId,
      userEmail: user.email,
      userName: getUserFullName(user),
      action: "update",
      entityType: "complaint",
      entityId: args.complaintId,
      entityName: complaint.referenceNumber || "Complaint",
      metadata: JSON.stringify({
        action_detail: "compliance_checklist_update",
        step: args.step,
        stepLabel,
        completed: args.completed,
      }),
    });

    return { success: true };
  },
});

// Check for overdue acknowledgments (run via cron - internal only)
export const checkOverdueAcknowledgments = internalMutation({
  args: {},
  handler: async (ctx) => {
    const complaints = await ctx.db.query("complaints")
      .filter(q => q.eq(q.field("status"), "received"))
      .collect();

    const now = Date.now();
    let updated = 0;

    for (const complaint of complaints) {
      if (complaint.acknowledgedDate) continue;

      // Use acknowledgmentDueDate if available, otherwise fall back to 7 calendar days
      let isOverdue = false;
      if (complaint.acknowledgmentDueDate) {
        const dueDate = new Date(complaint.acknowledgmentDueDate);
        isOverdue = now > dueDate.getTime();
      } else {
        const receivedDate = new Date(complaint.receivedDate);
        // 5 business days ~ 7 calendar days
        const dueDate = new Date(receivedDate.getTime() + 7 * 24 * 60 * 60 * 1000);
        isOverdue = now > dueDate.getTime();
      }

      if (isOverdue && !complaint.acknowledgmentOverdue) {
        await ctx.db.patch(complaint._id, {
          acknowledgmentOverdue: true,
          updatedAt: now,
        });

        // Create an alert for the overdue acknowledgment
        const alertExists = await ctx.db.query("alerts")
          .filter(q =>
            q.and(
              q.eq(q.field("alertType"), "complaint_acknowledgment_overdue"),
              q.eq(q.field("title"), `Complaint acknowledgment overdue: ${complaint.referenceNumber || complaint._id}`),
              q.neq(q.field("status"), "resolved")
            )
          )
          .first();

        if (!alertExists) {
          const today = new Date().toISOString().split("T")[0];
          await ctx.db.insert("alerts", {
            alertType: "complaint_acknowledgment_overdue",
            title: `Complaint acknowledgment overdue: ${complaint.referenceNumber || complaint._id}`,
            message: `Complaint ${complaint.referenceNumber || ""} has not been acknowledged within the required timeframe. Category: ${complaint.category}, Severity: ${complaint.severity}.`,
            severity: (complaint.severity === "critical" || complaint.severity === "high") ? "critical" as const : "warning" as const,
            status: "active",
            triggerDate: today,
            createdAt: now,
          });
        }

        updated++;
      }
    }

    return { updated };
  },
});

// Check for overdue resolutions (21 business days / ~30 calendar days)
export const checkOverdueResolutions = internalMutation({
  args: {},
  handler: async (ctx) => {
    const complaints = await ctx.db.query("complaints").collect();
    const now = Date.now();
    let updated = 0;

    const activeStatuses = ["received", "acknowledged", "under_investigation"];

    for (const complaint of complaints) {
      if (!activeStatuses.includes(complaint.status)) continue;
      if (complaint.resolutionOverdue) continue;

      let isOverdue = false;
      if (complaint.resolutionDueDate) {
        isOverdue = now > new Date(complaint.resolutionDueDate).getTime();
      } else {
        // Fallback: 30 calendar days from received date
        const receivedDate = new Date(complaint.receivedDate);
        const dueDate = new Date(receivedDate.getTime() + 30 * 24 * 60 * 60 * 1000);
        isOverdue = now > dueDate.getTime();
      }

      if (isOverdue) {
        await ctx.db.patch(complaint._id, {
          resolutionOverdue: true,
          updatedAt: now,
        });

        // Create alert for overdue resolution
        const alertExists = await ctx.db.query("alerts")
          .filter(q =>
            q.and(
              q.eq(q.field("alertType"), "complaint_resolution_overdue"),
              q.eq(q.field("title"), `Complaint resolution overdue: ${complaint.referenceNumber || complaint._id}`),
              q.neq(q.field("status"), "resolved")
            )
          )
          .first();

        if (!alertExists) {
          const today = new Date().toISOString().split("T")[0];
          await ctx.db.insert("alerts", {
            alertType: "complaint_resolution_overdue",
            title: `Complaint resolution overdue: ${complaint.referenceNumber || complaint._id}`,
            message: `Complaint ${complaint.referenceNumber || ""} has not been resolved within the 21-business-day timeframe. Category: ${complaint.category}, Severity: ${complaint.severity}.`,
            severity: (complaint.severity === "critical" || complaint.severity === "high") ? "critical" as const : "warning" as const,
            status: "active",
            triggerDate: today,
            createdAt: now,
          });
        }

        updated++;
      }
    }

    return { updated };
  },
});

// Get chain of custody audit trail for a specific complaint (NDIS compliance)
export const getChainOfCustody = query({
  args: { complaintId: v.id("complaints") },
  handler: async (ctx, args) => {
    const logs = await ctx.db
      .query("auditLogs")
      .filter(q =>
        q.and(
          q.eq(q.field("entityType"), "complaint"),
          q.eq(q.field("entityId"), args.complaintId)
        )
      )
      .collect();

    // Enrich with user names
    const enriched = await Promise.all(
      logs.map(async (log) => {
        const user = await ctx.db.get(log.userId);
        return {
          ...log,
          userName: user ? `${user.firstName} ${user.lastName}` : "System",
        };
      })
    );

    return enriched.sort((a, b) => a.timestamp - b.timestamp);
  },
});

// Get full complaints register data with enriched fields for reporting
export const getComplaintsRegisterData = query({
  args: {},
  handler: async (ctx) => {
    const complaints = await ctx.db.query("complaints").collect();
    const now = new Date();

    const enriched = await Promise.all(
      complaints.map(async (complaint) => {
        const participant = complaint.participantId ? await ctx.db.get(complaint.participantId) : null;
        const property = complaint.propertyId ? await ctx.db.get(complaint.propertyId) : null;
        const receivedByUser = await ctx.db.get(complaint.receivedBy);
        const assignedToUser = complaint.assignedTo ? await ctx.db.get(complaint.assignedTo) : null;

        // Calculate days
        const receivedDate = new Date(complaint.receivedDate);
        const daysOpen = Math.floor((now.getTime() - receivedDate.getTime()) / (1000 * 60 * 60 * 24));
        const daysToAcknowledge = complaint.acknowledgedDate
          ? Math.floor((new Date(complaint.acknowledgedDate).getTime() - receivedDate.getTime()) / (1000 * 60 * 60 * 24))
          : null;
        const daysToResolve = complaint.resolutionDate
          ? Math.floor((new Date(complaint.resolutionDate).getTime() - receivedDate.getTime()) / (1000 * 60 * 60 * 24))
          : null;

        return {
          ...complaint,
          participant,
          property,
          receivedByUser,
          assignedToUser,
          daysOpen,
          daysToAcknowledge,
          daysToResolve,
        };
      })
    );

    return enriched.sort((a, b) => new Date(b.receivedDate).getTime() - new Date(a.receivedDate).getTime());
  },
});

// Get complaints statistics
export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const complaints = await ctx.db.query("complaints").collect();

    const stats = {
      total: complaints.length,
      byStatus: {
        received: complaints.filter(c => c.status === "received").length,
        acknowledged: complaints.filter(c => c.status === "acknowledged").length,
        under_investigation: complaints.filter(c => c.status === "under_investigation").length,
        resolved: complaints.filter(c => c.status === "resolved").length,
        closed: complaints.filter(c => c.status === "closed").length,
        escalated: complaints.filter(c => c.status === "escalated").length,
      },
      bySeverity: {
        low: complaints.filter(c => c.severity === "low").length,
        medium: complaints.filter(c => c.severity === "medium").length,
        high: complaints.filter(c => c.severity === "high").length,
        critical: complaints.filter(c => c.severity === "critical").length,
      },
      overdueAcknowledgments: complaints.filter(c => c.acknowledgmentOverdue).length,
      escalatedToCommission: complaints.filter(c => c.escalatedToNdisCommission).length,
    };

    return stats;
  },
});
