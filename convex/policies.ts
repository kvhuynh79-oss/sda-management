import { v } from "convex/values";
import { mutation, query, internalMutation, internalQuery, action } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireTenant, requirePermission, getUserFullName } from "./authHelpers";
import { callClaudeAPI, extractJSON } from "./aiUtils";

// Generate a signed upload URL for policy document files
export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

// Get all active policies with optional status/category filters
export const getAll = query({
  args: {
    userId: v.id("users"),
    status: v.optional(v.string()),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);

    const allPolicies = await ctx.db
      .query("policies")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
      .collect();

    // Filter to active records only
    let policies = allPolicies.filter((p) => p.isActive !== false);

    // Apply optional status filter
    if (args.status) {
      policies = policies.filter((p) => p.status === args.status);
    }

    // Apply optional category filter
    if (args.category) {
      policies = policies.filter((p) => p.category === args.category);
    }

    // Sort alphabetically by title
    policies.sort((a, b) => a.title.localeCompare(b.title));

    return policies;
  },
});

// Get a single policy by ID with resolved document URL
export const getById = query({
  args: {
    userId: v.id("users"),
    policyId: v.id("policies"),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);

    const policy = await ctx.db.get(args.policyId);
    if (!policy) return null;

    if (policy.organizationId !== organizationId) {
      throw new Error("Access denied: Policy belongs to different organization");
    }

    // Resolve document download URL from storage if a file is attached
    const documentUrl = policy.documentStorageId
      ? await ctx.storage.getUrl(policy.documentStorageId)
      : null;

    return { ...policy, documentUrl };
  },
});

// Create a new policy document
export const create = mutation({
  args: {
    userId: v.id("users"),
    title: v.string(),
    description: v.optional(v.string()),
    category: v.string(),
    documentStorageId: v.optional(v.id("_storage")),
    documentFileName: v.optional(v.string()),
    version: v.optional(v.string()),
    effectiveDate: v.optional(v.string()),
    reviewDueDate: v.optional(v.string()),
    status: v.union(
      v.literal("draft"),
      v.literal("active"),
      v.literal("under_review"),
      v.literal("archived")
    ),
    notes: v.optional(v.string()),
    content: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    await requirePermission(ctx, args.userId, "policies", "create");
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    const { userId, ...policyData } = args;
    const now = Date.now();

    const policyId = await ctx.db.insert("policies", {
      ...policyData,
      organizationId,
      isActive: true,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });

    // Audit log
    await ctx.runMutation(internal.auditLog.log, {
      organizationId,
      userId: args.userId,
      userEmail: user.email,
      userName: getUserFullName(user),
      action: "create",
      entityType: "policy",
      entityId: policyId,
      entityName: args.title,
    });

    return policyId;
  },
});

// Update an existing policy
export const update = mutation({
  args: {
    userId: v.id("users"),
    policyId: v.id("policies"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    documentStorageId: v.optional(v.id("_storage")),
    documentFileName: v.optional(v.string()),
    version: v.optional(v.string()),
    effectiveDate: v.optional(v.string()),
    reviewDueDate: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("draft"),
        v.literal("active"),
        v.literal("under_review"),
        v.literal("archived")
      )
    ),
    notes: v.optional(v.string()),
    content: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    await requirePermission(ctx, args.userId, "policies", "update");
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    const policy = await ctx.db.get(args.policyId);
    if (!policy) throw new Error("Policy not found");
    if (policy.organizationId !== organizationId) {
      throw new Error("Access denied: Policy belongs to different organization");
    }

    const { policyId, userId, ...updates } = args;

    // Build update object with only defined values
    const filteredUpdates: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filteredUpdates[key] = value;
      }
    }

    await ctx.db.patch(args.policyId, filteredUpdates);

    // Audit log
    await ctx.runMutation(internal.auditLog.log, {
      organizationId,
      userId: args.userId,
      userEmail: user.email,
      userName: getUserFullName(user),
      action: "update",
      entityType: "policy",
      entityId: args.policyId,
      entityName: args.title ?? policy.title,
    });

    return { success: true };
  },
});

// Soft delete a policy (sets isActive to false)
export const remove = mutation({
  args: {
    userId: v.id("users"),
    policyId: v.id("policies"),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    await requirePermission(ctx, args.userId, "policies", "delete");
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    const policy = await ctx.db.get(args.policyId);
    if (!policy) throw new Error("Policy not found");
    if (policy.organizationId !== organizationId) {
      throw new Error("Access denied: Policy belongs to different organization");
    }

    // Soft delete
    await ctx.db.patch(args.policyId, {
      isActive: false,
      updatedAt: Date.now(),
    });

    // Audit log
    await ctx.runMutation(internal.auditLog.log, {
      organizationId,
      userId: args.userId,
      userEmail: user.email,
      userName: getUserFullName(user),
      action: "delete",
      entityType: "policy",
      entityId: args.policyId,
      entityName: policy.title,
    });
  },
});

// Get aggregate statistics for the policies dashboard
export const getStats = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);

    const allPolicies = await ctx.db
      .query("policies")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
      .collect();

    // Only count non-deleted records
    const policies = allPolicies.filter((p) => p.isActive !== false);

    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const active = policies.filter((p) => p.status === "active");
    const draft = policies.filter((p) => p.status === "draft");
    const underReview = policies.filter((p) => p.status === "under_review");
    const archived = policies.filter((p) => p.status === "archived");

    // Policies with review due date that has passed (exclude archived)
    const overdueReview = policies.filter((p) => {
      if (p.status === "archived") return false;
      if (!p.reviewDueDate) return false;
      return new Date(p.reviewDueDate) < now;
    });

    // Policies with review due date within the next 30 days (exclude archived and already overdue)
    const reviewingSoon = policies.filter((p) => {
      if (p.status === "archived") return false;
      if (!p.reviewDueDate) return false;
      const reviewDate = new Date(p.reviewDueDate);
      return reviewDate >= now && reviewDate <= thirtyDaysFromNow;
    });

    return {
      total: policies.length,
      active: active.length,
      draft: draft.length,
      underReview: underReview.length,
      archived: archived.length,
      overdueReview: overdueReview.length,
      reviewingSoon: reviewingSoon.length,
    };
  },
});

// Get unique policy categories for filter dropdowns
export const getCategories = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);

    const allPolicies = await ctx.db
      .query("policies")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
      .collect();

    const policies = allPolicies.filter((p) => p.isActive !== false);

    // Extract unique categories and sort alphabetically
    const categories = [...new Set(policies.map((p) => p.category))].sort();

    return categories;
  },
});

// ─── AI Summary Generation ──────────────────────────────────────────────────

const SUMMARY_SYSTEM_PROMPT = `You are a policy summarisation expert for an Australian NDIS (National Disability Insurance Scheme) Specialist Disability Accommodation provider.

Your task is to create a concise summary and extract key action points from the policy document provided.

The summary should:
- Be 2-4 sentences highlighting what the policy is about and why it matters
- Use plain language that frontline staff can quickly understand
- Mention any critical obligations or deadlines

The key points should:
- Be 4-8 bullet points
- Focus on what staff MUST DO or MUST NOT DO
- Include any specific timeframes, thresholds, or requirements
- Be actionable and concrete, not vague

Respond with valid JSON only, no other text:
{"summary": "2-4 sentence summary", "keyPoints": ["point 1", "point 2", ...]}`;

// Save AI-generated summary to a policy record
export const saveSummary = internalMutation({
  args: {
    policyId: v.id("policies"),
    summary: v.string(),
    keyPoints: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.policyId, {
      summary: args.summary,
      keyPoints: args.keyPoints,
      summaryGeneratedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// Get policy content for AI summary generation (internal only)
export const getContentForSummary = internalQuery({
  args: {
    policyId: v.id("policies"),
  },
  handler: async (ctx, args) => {
    const policy = await ctx.db.get(args.policyId);
    if (!policy) {
      throw new Error("Policy not found");
    }

    return {
      title: policy.title,
      category: policy.category,
      content: policy.content,
      description: policy.description,
    };
  },
});

// Get user's organizationId for action context (internal only)
export const getUserOrg = internalQuery({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    return { organizationId: user.organizationId };
  },
});

// Get policies that have content but no AI summary yet (internal only)
export const getPoliciesNeedingSummary = internalQuery({
  args: {
    organizationId: v.optional(v.id("organizations")),
  },
  handler: async (ctx, args) => {
    if (!args.organizationId) {
      return [];
    }

    const allPolicies = await ctx.db
      .query("policies")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", args.organizationId!)
      )
      .collect();

    // Filter to active policies with content but no summary
    const needingSummary = allPolicies.filter(
      (p) => p.isActive !== false && p.content && !p.summary
    );

    return needingSummary.map((p) => ({
      _id: p._id,
      title: p.title,
    }));
  },
});

// Generate AI summary for a single policy
export const generateSummary = action({
  args: {
    userId: v.id("users"),
    policyId: v.id("policies"),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ summary: string; keyPoints: string[] }> => {
    // Read policy content
    const policy = await ctx.runQuery(
      internal.policies.getContentForSummary,
      { policyId: args.policyId }
    );

    if (!policy.content) {
      throw new Error(
        "Policy has no content to summarise. Add content to the policy first."
      );
    }

    // Build the user message with all available policy details
    let userMessage = `Policy Title: ${policy.title}\nCategory: ${policy.category}\n`;
    if (policy.description) {
      userMessage += `Description: ${policy.description}\n`;
    }
    userMessage += `\nFull Policy Content:\n${policy.content}`;

    // Call Claude API for summary generation
    const response = await callClaudeAPI(
      SUMMARY_SYSTEM_PROMPT,
      [{ role: "user", content: userMessage }],
      2048
    );

    // Parse and validate the response
    const parsed = extractJSON<{ summary: string; keyPoints: string[] }>(
      response
    );

    if (!parsed.summary) {
      throw new Error("AI response missing summary field");
    }

    if (!Array.isArray(parsed.keyPoints) || parsed.keyPoints.length === 0) {
      throw new Error("AI response missing or empty keyPoints array");
    }

    // Save the summary to the policy
    await ctx.runMutation(internal.policies.saveSummary, {
      policyId: args.policyId,
      summary: parsed.summary,
      keyPoints: parsed.keyPoints,
    });

    return { summary: parsed.summary, keyPoints: parsed.keyPoints };
  },
});

// Generate AI summaries for all policies that don't have one yet
export const generateAllSummaries = action({
  args: {
    userId: v.id("users"),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ generated: number; failed: number; errors: string[] }> => {
    // Get user's organization
    const { organizationId } = await ctx.runQuery(
      internal.policies.getUserOrg,
      { userId: args.userId }
    );

    // Get all policies needing summaries
    const policies = await ctx.runQuery(
      internal.policies.getPoliciesNeedingSummary,
      { organizationId }
    );

    let generated = 0;
    let failed = 0;
    const errors: string[] = [];

    // Process each policy sequentially to avoid rate limits
    for (const policy of policies) {
      try {
        // Read full content for this policy
        const policyData = await ctx.runQuery(
          internal.policies.getContentForSummary,
          { policyId: policy._id }
        );

        if (!policyData.content) {
          failed++;
          errors.push(`${policy.title}: No content to summarise`);
          continue;
        }

        // Build user message
        let userMessage = `Policy Title: ${policyData.title}\nCategory: ${policyData.category}\n`;
        if (policyData.description) {
          userMessage += `Description: ${policyData.description}\n`;
        }
        userMessage += `\nFull Policy Content:\n${policyData.content}`;

        // Call Claude API directly (actions cannot call other actions)
        const response = await callClaudeAPI(
          SUMMARY_SYSTEM_PROMPT,
          [{ role: "user", content: userMessage }],
          2048
        );

        // Parse and validate
        const parsed = extractJSON<{ summary: string; keyPoints: string[] }>(
          response
        );

        if (
          !parsed.summary ||
          !Array.isArray(parsed.keyPoints) ||
          parsed.keyPoints.length === 0
        ) {
          failed++;
          errors.push(`${policy.title}: Invalid AI response format`);
          continue;
        }

        // Save summary
        await ctx.runMutation(internal.policies.saveSummary, {
          policyId: policy._id,
          summary: parsed.summary,
          keyPoints: parsed.keyPoints,
        });

        generated++;
      } catch (error) {
        failed++;
        errors.push(
          `${policy.title}: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }

    return { generated, failed, errors };
  },
});
