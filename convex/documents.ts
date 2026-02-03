import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { requirePermission, requireAuth } from "./authHelpers";

// Generate upload URL for file
export const generateUploadUrl = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Verify user has permission to create documents
    await requirePermission(ctx, args.userId, "documents", "create");
    return await ctx.storage.generateUploadUrl();
  },
});

// Create document record after file is uploaded
export const create = mutation({
  args: {
    fileName: v.string(),
    fileSize: v.number(),
    fileType: v.string(),
    storageId: v.id("_storage"),
    documentType: v.union(
      // Participant documents
      v.literal("ndis_plan"),
      v.literal("accommodation_agreement"),
      v.literal("sda_quotation"),
      v.literal("centrepay_consent"),
      // Property documents
      v.literal("lease"),
      v.literal("fire_safety_certificate"),
      v.literal("building_compliance_certificate"),
      v.literal("sda_design_certificate"),
      // Insurance documents
      v.literal("public_liability_insurance"),
      v.literal("professional_indemnity_insurance"),
      v.literal("building_insurance"),
      v.literal("workers_compensation_insurance"),
      // Compliance/Certification documents
      v.literal("ndis_practice_standards_cert"),
      v.literal("sda_registration_cert"),
      v.literal("ndis_worker_screening"),
      // General
      v.literal("report"),
      v.literal("other"),
      // Legacy
      v.literal("service_agreement"),
      v.literal("insurance"),
      v.literal("compliance")
    ),
    documentCategory: v.union(
      v.literal("participant"),
      v.literal("property"),
      v.literal("dwelling"),
      v.literal("owner"),
      v.literal("organisation")
    ),
    linkedParticipantId: v.optional(v.id("participants")),
    linkedPropertyId: v.optional(v.id("properties")),
    linkedDwellingId: v.optional(v.id("dwellings")),
    linkedOwnerId: v.optional(v.id("owners")),
    description: v.optional(v.string()),
    expiryDate: v.optional(v.string()),
    uploadedBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Verify user has permission
    const user = await requirePermission(ctx, args.uploadedBy, "documents", "create");

    const now = Date.now();
    const documentId = await ctx.db.insert("documents", {
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
      entityType: "document",
      entityId: documentId,
      entityName: args.fileName,
      metadata: JSON.stringify({
        documentType: args.documentType,
        documentCategory: args.documentCategory,
        expiryDate: args.expiryDate,
      }),
    });

    return documentId;
  },
});

// Get all documents with related entity details
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    const documents = await ctx.db.query("documents").collect();

    const documentsWithDetails = await Promise.all(
      documents.map(async (doc) => {
        const participant = doc.linkedParticipantId
          ? await ctx.db.get(doc.linkedParticipantId)
          : null;
        const property = doc.linkedPropertyId
          ? await ctx.db.get(doc.linkedPropertyId)
          : null;
        const dwelling = doc.linkedDwellingId
          ? await ctx.db.get(doc.linkedDwellingId)
          : null;
        const owner = doc.linkedOwnerId ? await ctx.db.get(doc.linkedOwnerId) : null;
        const uploadedByUser = await ctx.db.get(doc.uploadedBy);

        // Generate download URL
        const downloadUrl = await ctx.storage.getUrl(doc.storageId);

        return {
          ...doc,
          participant,
          property,
          dwelling,
          owner,
          uploadedByUser,
          downloadUrl,
        };
      })
    );

    return documentsWithDetails.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Get documents by participant
export const getByParticipant = query({
  args: { participantId: v.id("participants") },
  handler: async (ctx, args) => {
    const documents = await ctx.db
      .query("documents")
      .withIndex("by_participant", (q) =>
        q.eq("linkedParticipantId", args.participantId)
      )
      .collect();

    const documentsWithDetails = await Promise.all(
      documents.map(async (doc) => {
        const uploadedByUser = await ctx.db.get(doc.uploadedBy);
        const downloadUrl = await ctx.storage.getUrl(doc.storageId);

        return {
          ...doc,
          uploadedByUser,
          downloadUrl,
        };
      })
    );

    return documentsWithDetails.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Get documents by property
export const getByProperty = query({
  args: { propertyId: v.id("properties") },
  handler: async (ctx, args) => {
    const documents = await ctx.db
      .query("documents")
      .withIndex("by_property", (q) => q.eq("linkedPropertyId", args.propertyId))
      .collect();

    const documentsWithDetails = await Promise.all(
      documents.map(async (doc) => {
        const uploadedByUser = await ctx.db.get(doc.uploadedBy);
        const downloadUrl = await ctx.storage.getUrl(doc.storageId);

        return {
          ...doc,
          uploadedByUser,
          downloadUrl,
        };
      })
    );

    return documentsWithDetails.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Get documents by dwelling
export const getByDwelling = query({
  args: { dwellingId: v.id("dwellings") },
  handler: async (ctx, args) => {
    const allDocuments = await ctx.db.query("documents").collect();
    const documents = allDocuments.filter(
      (doc) => doc.linkedDwellingId === args.dwellingId
    );

    const documentsWithDetails = await Promise.all(
      documents.map(async (doc) => {
        const uploadedByUser = await ctx.db.get(doc.uploadedBy);
        const downloadUrl = await ctx.storage.getUrl(doc.storageId);

        return {
          ...doc,
          uploadedByUser,
          downloadUrl,
        };
      })
    );

    return documentsWithDetails.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Get documents by type
export const getByType = query({
  args: {
    documentType: v.string(), // Accept any string to avoid listing all types
  },
  handler: async (ctx, args) => {
    const allDocuments = await ctx.db.query("documents").collect();
    const documents = allDocuments.filter(doc => doc.documentType === args.documentType);

    const documentsWithDetails = await Promise.all(
      documents.map(async (doc) => {
        const participant = doc.linkedParticipantId
          ? await ctx.db.get(doc.linkedParticipantId)
          : null;
        const property = doc.linkedPropertyId
          ? await ctx.db.get(doc.linkedPropertyId)
          : null;
        const uploadedByUser = await ctx.db.get(doc.uploadedBy);
        const downloadUrl = await ctx.storage.getUrl(doc.storageId);

        return {
          ...doc,
          participant,
          property,
          uploadedByUser,
          downloadUrl,
        };
      })
    );

    return documentsWithDetails.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Get document by ID
export const getById = query({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.documentId);
    if (!doc) return null;

    const participant = doc.linkedParticipantId
      ? await ctx.db.get(doc.linkedParticipantId)
      : null;
    const property = doc.linkedPropertyId
      ? await ctx.db.get(doc.linkedPropertyId)
      : null;
    const dwelling = doc.linkedDwellingId
      ? await ctx.db.get(doc.linkedDwellingId)
      : null;
    const owner = doc.linkedOwnerId ? await ctx.db.get(doc.linkedOwnerId) : null;
    const uploadedByUser = await ctx.db.get(doc.uploadedBy);
    const downloadUrl = await ctx.storage.getUrl(doc.storageId);

    return {
      ...doc,
      participant,
      property,
      dwelling,
      owner,
      uploadedByUser,
      downloadUrl,
    };
  },
});

// Update document metadata
export const update = mutation({
  args: {
    userId: v.id("users"),
    documentId: v.id("documents"),
    fileName: v.optional(v.string()),
    documentType: v.optional(v.string()), // Accept any string to avoid listing all types
    description: v.optional(v.string()),
    expiryDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify user has permission to update documents
    await requirePermission(ctx, args.userId, "documents", "update");
    const { documentId, userId, ...updates } = args;

    const filteredUpdates: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filteredUpdates[key] = value;
      }
    }

    await ctx.db.patch(documentId, filteredUpdates);
    return { success: true };
  },
});

// Delete document (removes file from storage)
export const remove = mutation({
  args: {
    userId: v.id("users"),
    documentId: v.id("documents"),
  },
  handler: async (ctx, args) => {
    // Verify user has permission to delete documents
    await requirePermission(ctx, args.userId, "documents", "delete");
    const doc = await ctx.db.get(args.documentId);
    if (!doc) throw new Error("Document not found");

    // Delete file from storage
    await ctx.storage.delete(doc.storageId);

    // Delete document record
    await ctx.db.delete(args.documentId);
    return { success: true };
  },
});

// Get documents expiring soon (for alerts)
export const getExpiringSoon = query({
  args: { daysAhead: v.number() },
  handler: async (ctx, args) => {
    const allDocuments = await ctx.db.query("documents").collect();
    const documentsWithExpiry = allDocuments.filter((doc) => doc.expiryDate);

    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + args.daysAhead);

    const expiringDocuments = await Promise.all(
      documentsWithExpiry
        .filter((doc) => {
          if (!doc.expiryDate) return false;
          const expiryDate = new Date(doc.expiryDate);
          return expiryDate <= futureDate && expiryDate >= today;
        })
        .map(async (doc) => {
          const participant = doc.linkedParticipantId
            ? await ctx.db.get(doc.linkedParticipantId)
            : null;
          const property = doc.linkedPropertyId
            ? await ctx.db.get(doc.linkedPropertyId)
            : null;
          const downloadUrl = await ctx.storage.getUrl(doc.storageId);

          const daysUntilExpiry = doc.expiryDate
            ? Math.ceil(
                (new Date(doc.expiryDate).getTime() - today.getTime()) /
                  (1000 * 60 * 60 * 24)
              )
            : 0;

          return {
            ...doc,
            participant,
            property,
            downloadUrl,
            daysUntilExpiry,
          };
        })
    );

    return expiringDocuments.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
  },
});

// Get document statistics
export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const allDocuments = await ctx.db.query("documents").collect();

    const stats = {
      total: allDocuments.length,
      byType: {
        ndis_plan: allDocuments.filter((d) => d.documentType === "ndis_plan")
          .length,
        service_agreement: allDocuments.filter(
          (d) => d.documentType === "service_agreement"
        ).length,
        lease: allDocuments.filter((d) => d.documentType === "lease").length,
        insurance: allDocuments.filter((d) => d.documentType === "insurance")
          .length,
        compliance: allDocuments.filter((d) => d.documentType === "compliance")
          .length,
        report: allDocuments.filter((d) => d.documentType === "report").length,
        other: allDocuments.filter((d) => d.documentType === "other").length,
      },
      byCategory: {
        participant: allDocuments.filter(
          (d) => d.documentCategory === "participant"
        ).length,
        property: allDocuments.filter((d) => d.documentCategory === "property")
          .length,
        dwelling: allDocuments.filter((d) => d.documentCategory === "dwelling")
          .length,
        owner: allDocuments.filter((d) => d.documentCategory === "owner").length,
      },
      withExpiry: allDocuments.filter((d) => d.expiryDate).length,
    };

    return stats;
  },
});

// Get recent documents (for dashboard)
export const getRecent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    const documents = await ctx.db.query("documents").collect();

    const documentsWithDetails = await Promise.all(
      documents.map(async (doc) => {
        const participant = doc.linkedParticipantId
          ? await ctx.db.get(doc.linkedParticipantId)
          : null;
        const property = doc.linkedPropertyId
          ? await ctx.db.get(doc.linkedPropertyId)
          : null;
        const downloadUrl = await ctx.storage.getUrl(doc.storageId);

        return {
          ...doc,
          participant,
          property,
          downloadUrl,
        };
      })
    );

    return documentsWithDetails
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
  },
});
