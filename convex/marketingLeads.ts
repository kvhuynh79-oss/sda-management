import { mutation, query, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { requirePermission } from "./authHelpers";

/**
 * Submit a marketing lead from the landing page.
 * PUBLIC mutation — no authentication required.
 */
export const submitLead = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    organization: v.optional(v.string()),
    role: v.optional(v.string()),
    numberOfProperties: v.optional(v.number()),
    source: v.string(),
  },
  handler: async (ctx, args) => {
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(args.email)) {
      throw new Error("Invalid email address");
    }

    if (!args.name.trim()) {
      throw new Error("Name is required");
    }

    const leadId = await ctx.db.insert("marketingLeads", {
      name: args.name.trim(),
      email: args.email.trim().toLowerCase(),
      organization: args.organization?.trim() || undefined,
      role: args.role || undefined,
      numberOfProperties: args.numberOfProperties,
      source: args.source,
      downloadedAt: Date.now(),
    });

    // Send email notification for new lead
    await ctx.scheduler.runAfter(0, internal.marketingLeads.notifyNewLead, {
      type: "lead" as const,
      name: args.name.trim(),
      email: args.email.trim().toLowerCase(),
      organization: args.organization?.trim() || undefined,
      numberOfProperties: args.numberOfProperties,
      source: args.source,
      timestamp: new Date().toISOString(),
    });

    return { success: true, leadId };
  },
});

/**
 * Submit a demo booking request from /book-demo page.
 * PUBLIC mutation — no authentication required.
 */
export const submitDemoRequest = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    numberOfProperties: v.optional(v.string()),
    preferredDateTime: v.optional(v.string()),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(args.email)) {
      throw new Error("Invalid email address");
    }

    if (!args.name.trim()) {
      throw new Error("Name is required");
    }

    // Build a descriptive message combining all fields
    const messageParts: string[] = [];
    if (args.numberOfProperties) {
      messageParts.push(`SDA Properties: ${args.numberOfProperties}`);
    }
    if (args.preferredDateTime) {
      messageParts.push(`Preferred Date/Time: ${args.preferredDateTime}`);
    }
    if (args.message) {
      messageParts.push(`Additional notes: ${args.message}`);
    }
    const combinedMessage = messageParts.join("\n") || undefined;

    const leadId = await ctx.db.insert("marketingLeads", {
      name: args.name.trim(),
      email: args.email.trim().toLowerCase(),
      phone: args.phone?.trim() || undefined,
      inquiryType: "demo",
      message: combinedMessage,
      source: "demo_request",
      downloadedAt: Date.now(),
    });

    // Send email notification for new demo request
    await ctx.scheduler.runAfter(0, internal.marketingLeads.notifyNewLead, {
      type: "inquiry" as const,
      name: args.name.trim(),
      email: args.email.trim().toLowerCase(),
      phone: args.phone?.trim() || undefined,
      numberOfProperties: args.numberOfProperties
        ? parseInt(args.numberOfProperties, 10) || undefined
        : undefined,
      inquiryType: "demo",
      message: combinedMessage,
      source: "demo_request",
      timestamp: new Date().toISOString(),
    });

    return { success: true, leadId };
  },
});

/**
 * Submit a contact form inquiry from the website.
 * PUBLIC mutation — no authentication required.
 */
export const submitInquiry = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    organization: v.optional(v.string()),
    phone: v.optional(v.string()),
    inquiryType: v.string(),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(args.email)) {
      throw new Error("Invalid email address");
    }

    if (!args.name.trim()) {
      throw new Error("Name is required");
    }

    if (!args.message.trim()) {
      throw new Error("Message is required");
    }

    const leadId = await ctx.db.insert("marketingLeads", {
      name: args.name.trim(),
      email: args.email.trim().toLowerCase(),
      organization: args.organization?.trim() || undefined,
      phone: args.phone?.trim() || undefined,
      inquiryType: args.inquiryType,
      message: args.message.trim(),
      source: "contact_form",
      downloadedAt: Date.now(),
    });

    // Send email notification for new inquiry
    await ctx.scheduler.runAfter(0, internal.marketingLeads.notifyNewLead, {
      type: "inquiry" as const,
      name: args.name.trim(),
      email: args.email.trim().toLowerCase(),
      organization: args.organization?.trim() || undefined,
      phone: args.phone?.trim() || undefined,
      inquiryType: args.inquiryType,
      message: args.message.trim(),
      source: "contact_form",
      timestamp: new Date().toISOString(),
    });

    return { success: true, leadId };
  },
});

/**
 * Get all marketing leads (admin only).
 */
export const getAll = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.userId, "leads", "view");

    const leads = await ctx.db
      .query("marketingLeads")
      .withIndex("by_downloadedAt")
      .order("desc")
      .collect();

    return leads;
  },
});

/**
 * Internal action to send email notification when a new lead or inquiry is captured.
 * Uses Resend API, same pattern as complaints.ts notifyStaffOfNewComplaint.
 */
export const notifyNewLead = internalAction({
  args: {
    type: v.union(v.literal("lead"), v.literal("inquiry")),
    name: v.string(),
    email: v.string(),
    organization: v.optional(v.string()),
    phone: v.optional(v.string()),
    numberOfProperties: v.optional(v.number()),
    source: v.optional(v.string()),
    inquiryType: v.optional(v.string()),
    message: v.optional(v.string()),
    timestamp: v.string(),
  },
  handler: async (_ctx, args): Promise<void> => {
    const apiKey = process.env.RESEND_API_KEY;
    const adminEmail = process.env.ADMIN_EMAIL || "khen@betterlivingsolutions.com.au";

    if (!apiKey) {
      console.log("RESEND_API_KEY not configured, skipping lead notification email");
      return;
    }

    const formattedTime = new Date(args.timestamp).toLocaleString("en-AU", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Australia/Sydney",
    });

    const isInquiry = args.type === "inquiry";
    const subject = isInquiry
      ? `New Inquiry: ${args.name} - ${args.inquiryType || "General"}`
      : `New Lead: ${args.name} (${args.source || "unknown"})`;

    const sourceLabel = args.source
      ? args.source.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
      : "Unknown";

    const inquiryTypeLabel = args.inquiryType
      ? args.inquiryType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
      : "";

    // Build optional detail rows
    const optionalRows = [
      args.organization
        ? `<tr>
            <td style="padding: 8px 0; color: #9ca3af; font-size: 14px;">Organization</td>
            <td style="padding: 8px 0; color: white; font-size: 14px; text-align: right;">${args.organization}</td>
          </tr>`
        : "",
      args.phone
        ? `<tr>
            <td style="padding: 8px 0; color: #9ca3af; font-size: 14px;">Phone</td>
            <td style="padding: 8px 0; color: white; font-size: 14px; text-align: right;">${args.phone}</td>
          </tr>`
        : "",
      args.numberOfProperties !== undefined
        ? `<tr>
            <td style="padding: 8px 0; color: #9ca3af; font-size: 14px;">Properties</td>
            <td style="padding: 8px 0; color: white; font-size: 14px; text-align: right;">${args.numberOfProperties}</td>
          </tr>`
        : "",
      isInquiry
        ? `<tr>
            <td style="padding: 8px 0; color: #9ca3af; font-size: 14px;">Inquiry Type</td>
            <td style="padding: 8px 0; color: #2dd4bf; font-size: 14px; text-align: right; font-weight: bold;">${inquiryTypeLabel}</td>
          </tr>`
        : "",
    ]
      .filter(Boolean)
      .join("");

    const messageSection = args.message
      ? `<div style="background-color: #374151; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #9ca3af;">Message</p>
          <p style="margin: 0; color: #e5e7eb; font-size: 14px; white-space: pre-wrap;">${args.message}</p>
        </div>`
      : "";

    const headerColor = isInquiry ? "#0d9488" : "#0f766e";
    const headerTitle = isInquiry ? "NEW INQUIRY" : "NEW LEAD CAPTURED";

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: ${headerColor}; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 20px;">${headerTitle}</h1>
        </div>
        <div style="background-color: #1f2937; color: #e5e7eb; padding: 24px;">
          <div style="background-color: #374151; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
            <p style="margin: 0 0 4px 0; font-size: 14px; color: #9ca3af;">Name</p>
            <p style="margin: 0; font-size: 22px; font-weight: bold; color: white;">${args.name}</p>
          </div>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
            <tr>
              <td style="padding: 8px 0; color: #9ca3af; font-size: 14px;">Email</td>
              <td style="padding: 8px 0; color: #2dd4bf; font-size: 14px; text-align: right;">
                <a href="mailto:${args.email}" style="color: #2dd4bf; text-decoration: none;">${args.email}</a>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #9ca3af; font-size: 14px;">Source</td>
              <td style="padding: 8px 0; color: white; font-size: 14px; text-align: right;">${sourceLabel}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #9ca3af; font-size: 14px;">Received</td>
              <td style="padding: 8px 0; color: white; font-size: 14px; text-align: right;">${formattedTime}</td>
            </tr>
            ${optionalRows}
          </table>
          ${messageSection}
          <div style="text-align: center; margin-top: 20px;">
            <a href="https://mysdamanager.com/admin/leads"
               style="display: inline-block; background-color: #0d9488; color: white; padding: 12px 32px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: bold;">
              View in Dashboard
            </a>
          </div>
        </div>
        <div style="background-color: #111827; color: #6b7280; padding: 16px; text-align: center; font-size: 12px;">
          <p style="margin: 0;">This is an automated notification from MySDAManager.</p>
          <p style="margin: 4px 0 0 0;">Reply directly to the lead at ${args.email}</p>
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
          subject,
          html: htmlContent,
        }),
      });

      if (!response.ok) {
        console.error("Failed to send lead notification email:", await response.text());
      }
    } catch (error) {
      console.error("Error sending lead notification:", error);
    }
  },
});