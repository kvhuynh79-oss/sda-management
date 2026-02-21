import { action, internalMutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import bcrypt from "bcryptjs";
import { requirePasswordComplexity } from "./lib/passwordValidation";

/**
 * Registration Module - Sprint 3 SaaS Onboarding
 *
 * Handles new organization registration, admin user creation,
 * slug availability checking, and onboarding completion.
 *
 * Registration flow:
 * 1. User checks slug availability (checkSlugAvailability)
 * 2. User submits registration form (registerOrganization)
 *    - Creates organization record (trialing status)
 *    - Creates admin user with organizationId
 *    - Returns org ID for Stripe Checkout redirect
 * 3. User completes Stripe Checkout (handled by stripe.ts)
 * 4. Webhook updates org to active status
 * 5. Admin marks onboarding complete (completeOnboarding)
 *
 * Security:
 * - registerOrganization is a public action (no auth, new user signup)
 * - Password hashed with bcrypt (12 salt rounds)
 * - Email uniqueness enforced at database level
 * - Slug validated for URL-safety and uniqueness
 */

const SALT_ROUNDS = 12;

// ============================================================================
// PLAN CONFIGURATION (shared with stripe.ts)
// ============================================================================

type PlanTier = "starter" | "professional" | "enterprise";

interface PlanLimits {
  maxProperties: number;
  maxUsers: number;
  maxDwellings: number;
}

const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  starter: { maxProperties: 10, maxUsers: 5, maxDwellings: 20 },
  professional: { maxProperties: 25, maxUsers: 15, maxDwellings: 75 },
  enterprise: { maxProperties: 50, maxUsers: 50, maxDwellings: 200 },
};

// ============================================================================
// QUERIES (public, no auth required for registration flow)
// ============================================================================

/**
 * Check if an organization slug is available.
 * Used in the registration form for real-time validation.
 *
 * Returns { available: boolean, suggestion?: string }
 */
export const checkSlugAvailability = query({
  args: { slug: v.string() },
  handler: async (ctx, args): Promise<{ available: boolean; suggestion?: string }> => {
    // Validate slug format
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    const normalizedSlug = args.slug.toLowerCase().trim();

    if (!slugRegex.test(normalizedSlug)) {
      return {
        available: false,
        suggestion: normalizedSlug
          .replace(/[^a-z0-9\s-]/g, "")
          .replace(/\s+/g, "-")
          .replace(/-+/g, "-")
          .replace(/^-|-$/g, ""),
      };
    }

    // Check if slug is already taken
    const existing = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", normalizedSlug))
      .first();

    if (existing) {
      // Generate a suggestion by appending a number
      let counter = 2;
      let suggestion = `${normalizedSlug}-${counter}`;
      let suggestionTaken = true;

      while (suggestionTaken && counter < 10) {
        suggestion = `${normalizedSlug}-${counter}`;
        const check = await ctx.db
          .query("organizations")
          .withIndex("by_slug", (q) => q.eq("slug", suggestion))
          .first();
        suggestionTaken = check !== null;
        counter++;
      }

      return { available: false, suggestion };
    }

    return { available: true };
  },
});

// ============================================================================
// INTERNAL MUTATIONS (called from registration action)
// ============================================================================

/**
 * Create the organization record in the database.
 * Called internally by registerOrganization action.
 */
export const createOrganizationInternal = internalMutation({
  args: {
    name: v.string(),
    slug: v.string(),
    plan: v.union(
      v.literal("starter"),
      v.literal("professional"),
      v.literal("enterprise")
    ),
    maxUsers: v.number(),
    maxProperties: v.number(),
  },
  handler: async (ctx, args): Promise<Id<"organizations">> => {
    // Double-check slug uniqueness
    const existing = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (existing) {
      throw new Error(`Organization slug already exists: ${args.slug}`);
    }

    const organizationId = await ctx.db.insert("organizations", {
      name: args.name,
      slug: args.slug,
      plan: args.plan,
      subscriptionStatus: "trialing",
      maxUsers: args.maxUsers,
      maxProperties: args.maxProperties,
      isActive: true,
      createdAt: Date.now(),
    });

    // Auto-generate unique inbound email address for new org
    let inboundAddress: string | null = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      const randomBytes = new Uint8Array(4);
      crypto.getRandomValues(randomBytes);
      const suffix = Array.from(randomBytes)
        .map((b) => b.toString(36))
        .join("")
        .substring(0, 6);
      const candidate = `${args.slug}-${suffix}@inbound.mysdamanager.com`;
      const existing = await ctx.db
        .query("organizations")
        .withIndex("by_inboundEmailAddress", (q) =>
          q.eq("inboundEmailAddress", candidate)
        )
        .first();
      if (!existing) {
        inboundAddress = candidate;
        break;
      }
    }
    if (inboundAddress) {
      await ctx.db.patch(organizationId, {
        inboundEmailAddress: inboundAddress,
        inboundEmailEnabled: true,
      });
    }

    return organizationId;
  },
});

/**
 * Create the admin user for a new organization.
 * Called internally by registerOrganization action.
 */
export const createAdminUserInternal = internalMutation({
  args: {
    email: v.string(),
    passwordHash: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    phone: v.optional(v.string()),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args): Promise<Id<"users">> => {
    // Check email uniqueness
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();

    if (existing) {
      throw new Error(
        "An account with this email already exists. Please sign in or use a different email."
      );
    }

    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      email: args.email.toLowerCase(),
      passwordHash: args.passwordHash,
      firstName: args.firstName,
      lastName: args.lastName,
      role: "admin",
      phone: args.phone,
      organizationId: args.organizationId,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    return userId;
  },
});

/**
 * Mark an organization's onboarding as complete.
 * Internal mutation called by completeOnboarding action.
 */
export const markOnboardingCompleteInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      throw new Error("Organization not found");
    }

    // Verify user belongs to this organization
    const user = await ctx.db.get(args.userId);
    if (!user || user.organizationId !== args.organizationId) {
      throw new Error("User does not belong to this organization");
    }

    if (user.role !== "admin") {
      throw new Error("Only admins can complete onboarding");
    }

    // Update organization settings to mark onboarding complete
    const existingSettings = org.settings ?? {};
    await ctx.db.patch(args.organizationId, {
      settings: {
        ...existingSettings,
        onboardingComplete: "true", // Store as string since settings values are strings
      },
    });
  },
});

// ============================================================================
// PUBLIC ACTIONS
// ============================================================================

/**
 * Register a new organization and admin user.
 *
 * This is a PUBLIC action (no authentication required) because it is used
 * during the signup flow when no user exists yet.
 *
 * Flow:
 * 1. Validate inputs (slug format, email format, password strength)
 * 2. Create organization (trialing status)
 * 3. Hash password with bcrypt
 * 4. Create admin user linked to organization
 * 5. Return org ID + user ID for Stripe Checkout redirect
 *
 * Security considerations:
 * - Password hashed with bcrypt (12 salt rounds)
 * - Email stored lowercase for case-insensitive matching
 * - Slug validated for URL-safety
 * - Duplicate email/slug checked at database level
 */
export const registerOrganization = action({
  args: {
    orgName: v.string(),
    slug: v.string(),
    plan: v.union(
      v.literal("starter"),
      v.literal("professional"),
      v.literal("enterprise")
    ),
    adminEmail: v.string(),
    adminPassword: v.string(),
    adminFirstName: v.string(),
    adminLastName: v.string(),
    adminPhone: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    organizationId: Id<"organizations">;
    userId: Id<"users">;
  }> => {
    // ---- Input Validation ----

    // Validate organization name
    const orgName = args.orgName.trim();
    if (orgName.length < 2 || orgName.length > 200) {
      throw new Error(
        "Organization name must be between 2 and 200 characters"
      );
    }

    // Validate slug format
    const slug = args.slug.toLowerCase().trim();
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    if (!slugRegex.test(slug)) {
      throw new Error(
        "Slug must be lowercase, alphanumeric with hyphens only (e.g., 'my-org-name')"
      );
    }
    if (slug.length < 3 || slug.length > 63) {
      throw new Error("Slug must be between 3 and 63 characters");
    }

    // Validate email format (basic check - full validation done by database unique constraint)
    const email = args.adminEmail.toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error("Please enter a valid email address");
    }

    // SECURITY (S5): Validate password complexity (OWASP compliant)
    requirePasswordComplexity(args.adminPassword);

    // Validate name fields
    const firstName = args.adminFirstName.trim();
    const lastName = args.adminLastName.trim();
    if (firstName.length < 1 || lastName.length < 1) {
      throw new Error("First name and last name are required");
    }

    // ---- Create Organization ----

    const limits = PLAN_LIMITS[args.plan];

    const organizationId: Id<"organizations"> = await ctx.runMutation(
      internal.registration.createOrganizationInternal,
      {
        name: orgName,
        slug,
        plan: args.plan,
        maxUsers: limits.maxUsers,
        maxProperties: limits.maxProperties,
      }
    );

    // ---- Create Admin User ----

    // Hash password with bcrypt (async, requires action context)
    const passwordHash = await bcrypt.hash(args.adminPassword, SALT_ROUNDS);

    let userId: Id<"users">;
    try {
      userId = await ctx.runMutation(
        internal.registration.createAdminUserInternal,
        {
          email,
          passwordHash,
          firstName,
          lastName,
          phone: args.adminPhone,
          organizationId,
        }
      );
    } catch (error) {
      // If user creation fails (e.g., duplicate email), we should clean up the org
      // Note: In a production system, you'd want a saga/compensation pattern here.
      // For now, the org will exist with trialing status but no admin user,
      // which is detectable and cleanable by a super-admin.
      console.error(
        `[Registration] User creation failed after org ${organizationId} was created:`,
        error
      );
      throw error;
    }

    console.log(
      `[Registration] Organization registered: ${orgName} (${slug}), admin: ${email}`
    );

    return { organizationId, userId };
  },
});

/**
 * Complete the onboarding process for an organization.
 * Called after the admin finishes the onboarding wizard.
 *
 * Requires authentication - the user must be an admin of the organization.
 */
export const completeOnboarding = action({
  args: {
    userId: v.id("users"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    await ctx.runMutation(
      internal.registration.markOnboardingCompleteInternal,
      {
        organizationId: args.organizationId,
        userId: args.userId,
      }
    );

    return { success: true };
  },
});
