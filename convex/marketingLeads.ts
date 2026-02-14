import { mutation, query } from "./_generated/server";
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
