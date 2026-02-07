import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { requireAuth } from "./authHelpers";

// Mapping: document type -> certification type
const DOC_TO_CERT_TYPE: Record<string, string> = {
  ndis_practice_standards_cert: "ndis_practice_standards",
  sda_registration_cert: "sda_registration",
  ndis_worker_screening: "ndis_worker_screening",
  fire_safety_certificate: "fire_safety",
  building_compliance_certificate: "building_compliance",
  sda_design_certificate: "sda_design_standard",
};

// Mapping: document type -> default certification name
const DOC_TO_CERT_NAME: Record<string, string> = {
  ndis_practice_standards_cert: "NDIS Practice Standards Certification",
  sda_registration_cert: "SDA Provider Registration",
  ndis_worker_screening: "NDIS Worker Screening Check",
  fire_safety_certificate: "Fire Safety Certificate",
  building_compliance_certificate: "Building Compliance Certificate",
  sda_design_certificate: "SDA Design Standard Certification",
};

export { DOC_TO_CERT_TYPE };

// Get all certifications with optional filters
export const getAll = query({
  args: {
    certificationType: v.optional(v.string()),
    status: v.optional(v.string()),
    propertyId: v.optional(v.id("properties")),
  },
  handler: async (ctx, args) => {
    let certifications = await ctx.db.query("complianceCertifications").collect();

    if (args.certificationType) {
      certifications = certifications.filter(c => c.certificationType === args.certificationType);
    }
    if (args.status) {
      certifications = certifications.filter(c => c.status === args.status);
    }
    if (args.propertyId) {
      certifications = certifications.filter(c => c.propertyId === args.propertyId);
    }

    // Enrich with property data
    const enriched = await Promise.all(
      certifications.map(async (cert) => {
        const property = cert.propertyId ? await ctx.db.get(cert.propertyId) : null;
        const dwelling = cert.dwellingId ? await ctx.db.get(cert.dwellingId) : null;
        return { ...cert, property, dwelling };
      })
    );

    return enriched.sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
  },
});

// Get certifications expiring soon (within 90 days)
export const getExpiringSoon = query({
  args: {},
  handler: async (ctx) => {
    const certifications = await ctx.db.query("complianceCertifications").collect();
    const now = new Date();
    const ninetyDaysFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    const expiring = certifications.filter(cert => {
      const expiryDate = new Date(cert.expiryDate);
      return expiryDate > now && expiryDate <= ninetyDaysFromNow;
    });

    // Enrich with property data
    const enriched = await Promise.all(
      expiring.map(async (cert) => {
        const property = cert.propertyId ? await ctx.db.get(cert.propertyId) : null;
        return { ...cert, property };
      })
    );

    return enriched.sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
  },
});

// Get certification by ID
export const getById = query({
  args: { certificationId: v.id("complianceCertifications") },
  handler: async (ctx, args) => {
    const cert = await ctx.db.get(args.certificationId);
    if (!cert) return null;

    const property = cert.propertyId ? await ctx.db.get(cert.propertyId) : null;
    const dwelling = cert.dwellingId ? await ctx.db.get(cert.dwellingId) : null;

    return { ...cert, property, dwelling };
  },
});

// Create certification
export const create = mutation({
  args: {
    userId: v.id("users"),
    certificationType: v.union(
      v.literal("ndis_practice_standards"),
      v.literal("ndis_verification_audit"),
      v.literal("sda_design_standard"),
      v.literal("sda_registration"),
      v.literal("ndis_worker_screening"),
      v.literal("fire_safety"),
      v.literal("building_compliance"),
      v.literal("other")
    ),
    certificationName: v.string(),
    propertyId: v.optional(v.id("properties")),
    dwellingId: v.optional(v.id("dwellings")),
    isOrganizationWide: v.optional(v.boolean()),
    certifyingBody: v.optional(v.string()),
    certificateNumber: v.optional(v.string()),
    issueDate: v.string(),
    expiryDate: v.string(),
    lastAuditDate: v.optional(v.string()),
    nextAuditDate: v.optional(v.string()),
    auditorName: v.optional(v.string()),
    auditOutcome: v.optional(v.union(
      v.literal("pass"),
      v.literal("conditional_pass"),
      v.literal("fail"),
      v.literal("pending")
    )),
    certificateStorageId: v.optional(v.id("_storage")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Permission check
    await requireAuth(ctx, args.userId);
    const { userId, ...certificationData } = args;
    const now = Date.now();
    const expiryDate = new Date(args.expiryDate);
    const today = new Date();
    const ninetyDaysFromNow = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);

    let status: "current" | "expiring_soon" | "expired" | "pending_renewal" = "current";
    if (expiryDate < today) {
      status = "expired";
    } else if (expiryDate <= ninetyDaysFromNow) {
      status = "expiring_soon";
    }

    return await ctx.db.insert("complianceCertifications", {
      ...certificationData,
      createdBy: userId,
      status,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update certification
export const update = mutation({
  args: {
    userId: v.id("users"),
    certificationId: v.id("complianceCertifications"),
    certificationName: v.optional(v.string()),
    certifyingBody: v.optional(v.string()),
    certificateNumber: v.optional(v.string()),
    issueDate: v.optional(v.string()),
    expiryDate: v.optional(v.string()),
    lastAuditDate: v.optional(v.string()),
    nextAuditDate: v.optional(v.string()),
    auditorName: v.optional(v.string()),
    auditOutcome: v.optional(v.union(
      v.literal("pass"),
      v.literal("conditional_pass"),
      v.literal("fail"),
      v.literal("pending")
    )),
    certificateStorageId: v.optional(v.id("_storage")),
    status: v.optional(v.union(
      v.literal("current"),
      v.literal("expiring_soon"),
      v.literal("expired"),
      v.literal("pending_renewal")
    )),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Permission check
    await requireAuth(ctx, args.userId);
    const { certificationId, userId, ...updates } = args;
    const cert = await ctx.db.get(certificationId);
    if (!cert) throw new Error("Certification not found");

    // Recalculate status if expiry date changed
    let status = updates.status;
    if (updates.expiryDate && !updates.status) {
      const expiryDate = new Date(updates.expiryDate);
      const today = new Date();
      const ninetyDaysFromNow = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);

      if (expiryDate < today) {
        status = "expired";
      } else if (expiryDate <= ninetyDaysFromNow) {
        status = "expiring_soon";
      } else {
        status = "current";
      }
    }

    const filteredUpdates: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filteredUpdates[key] = value;
      }
    }
    if (status) filteredUpdates.status = status;

    await ctx.db.patch(certificationId, filteredUpdates);
    return { success: true };
  },
});

// Delete certification
export const remove = mutation({
  args: {
    userId: v.id("users"),
    certificationId: v.id("complianceCertifications"),
  },
  handler: async (ctx, args) => {
    // Permission check
    await requireAuth(ctx, args.userId);
    await ctx.db.delete(args.certificationId);
    return { success: true };
  },
});

// Update all certification statuses (run periodically via cron)
export const updateStatuses = mutation({
  args: {},
  handler: async (ctx) => {
    const certifications = await ctx.db.query("complianceCertifications").collect();
    const today = new Date();
    const ninetyDaysFromNow = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);
    let updated = 0;

    for (const cert of certifications) {
      const expiryDate = new Date(cert.expiryDate);
      let newStatus: "current" | "expiring_soon" | "expired" | "pending_renewal" = cert.status;

      if (expiryDate < today && cert.status !== "expired" && cert.status !== "pending_renewal") {
        newStatus = "expired";
      } else if (expiryDate <= ninetyDaysFromNow && expiryDate > today && cert.status === "current") {
        newStatus = "expiring_soon";
      }

      if (newStatus !== cert.status) {
        await ctx.db.patch(cert._id, { status: newStatus, updatedAt: Date.now() });
        updated++;
      }
    }

    return { updated };
  },
});

// Auto-create certification from a document upload (called internally by documents.create)
export const createFromDocument = internalMutation({
  args: {
    documentType: v.string(),
    documentId: v.id("documents"),
    storageId: v.id("_storage"),
    expiryDate: v.string(),
    propertyId: v.optional(v.id("properties")),
    dwellingId: v.optional(v.id("dwellings")),
    isOrganizationWide: v.optional(v.boolean()),
    description: v.optional(v.string()),
    createdBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const certType = DOC_TO_CERT_TYPE[args.documentType];
    if (!certType) return null; // Not a cert-type document

    // Check for existing certification of the same type to avoid duplicates
    const existing = await ctx.db
      .query("complianceCertifications")
      .withIndex("by_type", (q) => q.eq("certificationType", certType as any))
      .collect();

    // If property-level, check for same property; if org-wide, check for org-wide match
    const duplicate = existing.find((cert) => {
      if (args.propertyId) return cert.propertyId === args.propertyId;
      if (args.isOrganizationWide) return cert.isOrganizationWide === true;
      return !cert.propertyId && !cert.isOrganizationWide;
    });

    if (duplicate) {
      // Update existing certification with new document link and expiry
      await ctx.db.patch(duplicate._id, {
        certificateStorageId: args.storageId,
        linkedDocumentId: args.documentId,
        expiryDate: args.expiryDate,
        updatedAt: Date.now(),
      });

      // Recalculate status
      const expiryDate = new Date(args.expiryDate);
      const today = new Date();
      const ninetyDaysFromNow = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);
      let status: "current" | "expiring_soon" | "expired" = "current";
      if (expiryDate < today) status = "expired";
      else if (expiryDate <= ninetyDaysFromNow) status = "expiring_soon";
      await ctx.db.patch(duplicate._id, { status });

      return duplicate._id;
    }

    // Calculate status from expiry date
    const expiryDate = new Date(args.expiryDate);
    const today = new Date();
    const ninetyDaysFromNow = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);
    let status: "current" | "expiring_soon" | "expired" = "current";
    if (expiryDate < today) status = "expired";
    else if (expiryDate <= ninetyDaysFromNow) status = "expiring_soon";

    const now = Date.now();
    const certName = DOC_TO_CERT_NAME[args.documentType] || "Certificate";

    const certId = await ctx.db.insert("complianceCertifications", {
      certificationType: certType as any,
      certificationName: certName,
      propertyId: args.propertyId,
      dwellingId: args.dwellingId,
      isOrganizationWide: args.isOrganizationWide ?? (!args.propertyId && !args.dwellingId),
      issueDate: new Date().toISOString().split("T")[0],
      expiryDate: args.expiryDate,
      certificateStorageId: args.storageId,
      linkedDocumentId: args.documentId,
      notes: args.description,
      status,
      createdBy: args.createdBy,
      createdAt: now,
      updatedAt: now,
    });

    return certId;
  },
});
