import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireTenant } from "./authHelpers";

// Generate upload URL for file storage
export const generateUploadUrl = mutation(async (ctx) => {
  return await ctx.storage.generateUploadUrl();
});

// Create a new document
export const create = mutation({
  args: {
    fileName: v.string(),
    fileSize: v.number(),
    fileType: v.string(),
    storageId: v.id("_storage"),
    documentType: v.string(),
    documentCategory: v.string(),
    linkedParticipantId: v.optional(v.id("participants")),
    linkedPropertyId: v.optional(v.id("properties")),
    linkedDwellingId: v.optional(v.id("dwellings")),
    linkedOwnerId: v.optional(v.id("owners")),
    linkedLeadId: v.optional(v.id("leads")),
    linkedStaffMemberId: v.optional(v.id("staffMembers")),
    description: v.optional(v.string()),
    expiryDate: v.optional(v.string()),
    // Invoice fields
    invoiceNumber: v.optional(v.string()),
    invoiceDate: v.optional(v.string()),
    invoiceAmount: v.optional(v.number()),
    vendor: v.optional(v.string()),
    isPaid: v.optional(v.boolean()),
    uploadedBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.uploadedBy);
    const now = Date.now();

    const documentId = await ctx.db.insert("documents", {
      ...args,
      organizationId,
      documentType: args.documentType as any,
      documentCategory: args.documentCategory as any,
      createdAt: now,
      updatedAt: now,
    });

    // If this is a certification document with an expiry date, auto-create/update compliance certification
    const certificationTypes = [
      "fire_safety_certificate",
      "building_compliance_certificate",
      "ndis_practice_standards_cert",
      "sda_design_certificate",
      "sda_registration_cert",
      "ndis_worker_screening",
    ];

    if (certificationTypes.includes(args.documentType) && args.expiryDate) {
      // Call internal mutation to create/update certification
      await ctx.scheduler.runAfter(0, internal.complianceCertifications.createFromDocument, {
        documentId,
        storageId: args.storageId,
        documentType: args.documentType as any,
        expiryDate: args.expiryDate,
        propertyId: args.linkedPropertyId,
        createdBy: args.uploadedBy,
        organizationId,
      });
    }

    // Trigger webhook
    await ctx.scheduler.runAfter(0, internal.webhooks.triggerWebhook, {
      organizationId,
      event: "document.uploaded",
      payload: { documentId, fileName: args.fileName, documentType: args.documentType },
    });

    return documentId;
  },
});

// Get all documents
export const getAll = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const documents = await ctx.db
      .query("documents")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
      .collect();

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
        const downloadUrl = await ctx.storage.getUrl(doc.storageId);

        return {
          ...doc,
          participant,
          property,
          dwelling,
          owner,
          downloadUrl,
        };
      })
    );

    return documentsWithDetails.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Get documents by participant
export const getByParticipant = query({
  args: { userId: v.id("users"), participantId: v.id("participants") },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const allDocuments = await ctx.db
      .query("documents")
      .withIndex("by_participant", (q) =>
        q.eq("linkedParticipantId", args.participantId)
      )
      .collect();

    const documents = allDocuments.filter(d => d.organizationId === organizationId);

    const documentsWithUrls = await Promise.all(
      documents.map(async (doc) => {
        const downloadUrl = await ctx.storage.getUrl(doc.storageId);
        return { ...doc, downloadUrl };
      })
    );

    return documentsWithUrls.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Get documents by staff member
export const getByStaffMember = query({
  args: { userId: v.id("users"), staffMemberId: v.id("staffMembers") },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const allDocuments = await ctx.db
      .query("documents")
      .withIndex("by_staffMember", (q) =>
        q.eq("linkedStaffMemberId", args.staffMemberId)
      )
      .collect();

    const documents = allDocuments.filter(d => d.organizationId === organizationId);

    const documentsWithUrls = await Promise.all(
      documents.map(async (doc) => {
        const downloadUrl = await ctx.storage.getUrl(doc.storageId);
        return { ...doc, downloadUrl };
      })
    );

    return documentsWithUrls.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Get documents by property
export const getByProperty = query({
  args: { userId: v.id("users"), propertyId: v.id("properties") },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const allDocuments = await ctx.db
      .query("documents")
      .withIndex("by_property", (q) => q.eq("linkedPropertyId", args.propertyId))
      .collect();

    const documents = allDocuments.filter(d => d.organizationId === organizationId);

    const documentsWithUrls = await Promise.all(
      documents.map(async (doc) => {
        const downloadUrl = await ctx.storage.getUrl(doc.storageId);
        return { ...doc, downloadUrl };
      })
    );

    return documentsWithUrls.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Get documents by dwelling
export const getByDwelling = query({
  args: { userId: v.id("users"), dwellingId: v.id("dwellings") },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const allDocuments = await ctx.db
      .query("documents")
      .withIndex("by_dwelling", (q) => q.eq("linkedDwellingId", args.dwellingId))
      .collect();

    const documents = allDocuments.filter(d => d.organizationId === organizationId);

    const documentsWithUrls = await Promise.all(
      documents.map(async (doc) => {
        const downloadUrl = await ctx.storage.getUrl(doc.storageId);
        return { ...doc, downloadUrl };
      })
    );

    return documentsWithUrls.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Get documents by lead
export const getByLead = query({
  args: { userId: v.id("users"), leadId: v.id("leads") },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const allDocuments = await ctx.db
      .query("documents")
      .withIndex("by_lead", (q) => q.eq("linkedLeadId", args.leadId))
      .collect();

    const documents = allDocuments.filter(d => d.organizationId === organizationId);

    const documentsWithUrls = await Promise.all(
      documents.map(async (doc) => {
        const downloadUrl = await ctx.storage.getUrl(doc.storageId);
        return { ...doc, downloadUrl };
      })
    );

    return documentsWithUrls.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Get documents by type
export const getByType = query({
  args: { userId: v.id("users"), documentType: v.string() },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const allDocuments = await ctx.db
      .query("documents")
      .withIndex("by_documentType", (q) => q.eq("documentType", args.documentType as any))
      .collect();

    const documents = allDocuments.filter(d => d.organizationId === organizationId);

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

    return documentsWithDetails.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Get document by ID
export const getById = query({
  args: { userId: v.id("users"), id: v.id("documents") },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const document = await ctx.db.get(args.id);
    if (!document) return null;
    if (document.organizationId !== organizationId) {
      throw new Error("Access denied: Record belongs to different organization");
    }

    const participant = document.linkedParticipantId
      ? await ctx.db.get(document.linkedParticipantId)
      : null;
    const property = document.linkedPropertyId
      ? await ctx.db.get(document.linkedPropertyId)
      : null;
    const dwelling = document.linkedDwellingId
      ? await ctx.db.get(document.linkedDwellingId)
      : null;
    const owner = document.linkedOwnerId
      ? await ctx.db.get(document.linkedOwnerId)
      : null;
    const downloadUrl = await ctx.storage.getUrl(document.storageId);

    return {
      ...document,
      participant,
      property,
      dwelling,
      owner,
      downloadUrl,
    };
  },
});

// Update document details
export const update = mutation({
  args: {
    userId: v.id("users"),
    id: v.id("documents"),
    description: v.optional(v.string()),
    expiryDate: v.optional(v.string()),
    invoiceNumber: v.optional(v.string()),
    invoiceDate: v.optional(v.string()),
    invoiceAmount: v.optional(v.number()),
    vendor: v.optional(v.string()),
    isPaid: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const { id, userId, ...updates } = args;

    const document = await ctx.db.get(id);
    if (!document) throw new Error("Document not found");
    if (document.organizationId !== organizationId) {
      throw new Error("Access denied: Record belongs to different organization");
    }

    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

// Delete document
export const remove = mutation({
  args: { userId: v.id("users"), id: v.id("documents") },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const document = await ctx.db.get(args.id);
    if (!document) {
      throw new Error("Document not found");
    }
    if (document.organizationId !== organizationId) {
      throw new Error("Access denied: Record belongs to different organization");
    }

    // Delete from storage
    await ctx.storage.delete(document.storageId);

    // Delete from database
    await ctx.db.delete(args.id);
  },
});

// Get documents expiring soon (within 30 days)
export const getExpiringSoon = query({
  args: { userId: v.id("users"), daysAhead: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const daysAhead = args.daysAhead || 30;
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + daysAhead);

    const nowStr = now.toISOString().split("T")[0];
    const futureStr = futureDate.toISOString().split("T")[0];

    const allDocuments = await ctx.db
      .query("documents")
      .withIndex("by_expiryDate")
      .collect();

    const documents = allDocuments.filter(d => d.organizationId === organizationId);

    const expiringDocs = documents.filter((doc) => {
      if (!doc.expiryDate) return false;
      return doc.expiryDate >= nowStr && doc.expiryDate <= futureStr;
    });

    const documentsWithDetails = await Promise.all(
      expiringDocs.map(async (doc) => {
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

    return documentsWithDetails.sort(
      (a, b) =>
        new Date(a.expiryDate!).getTime() - new Date(b.expiryDate!).getTime()
    );
  },
});

// Get document statistics
export const getStats = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const documents = await ctx.db
      .query("documents")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
      .collect();

    const now = new Date().toISOString().split("T")[0];
    const expiringSoon = documents.filter(
      (doc) => doc.expiryDate && doc.expiryDate <= now
    ).length;

    return {
      total: documents.length,
      expiringSoon,
      byType: documents.reduce((acc, doc) => {
        acc[doc.documentType] = (acc[doc.documentType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      byCategory: documents.reduce((acc, doc) => {
        acc[doc.documentCategory] = (acc[doc.documentCategory] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };
  },
});

// Get recent documents
export const getRecent = query({
  args: { userId: v.id("users"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const limit = args.limit || 10;
    const documents = await ctx.db
      .query("documents")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
      .collect();

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

// Get invoices by property (invoice, receipt, quote types only)
export const getInvoicesByProperty = query({
  args: { userId: v.id("users"), propertyId: v.id("properties") },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const allDocuments = await ctx.db
      .query("documents")
      .withIndex("by_property", (q) => q.eq("linkedPropertyId", args.propertyId))
      .collect();

    const documents = allDocuments.filter(d => d.organizationId === organizationId);

    const invoices = documents.filter((doc) =>
      ["invoice", "receipt", "quote"].includes(doc.documentType)
    );

    const invoicesWithUrls = await Promise.all(
      invoices.map(async (doc) => {
        const downloadUrl = await ctx.storage.getUrl(doc.storageId);
        return { ...doc, downloadUrl };
      })
    );

    return invoicesWithUrls.sort((a, b) => {
      if (!a.invoiceDate || !b.invoiceDate) return b.createdAt - a.createdAt;
      return new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime();
    });
  },
});

// Get invoices by participant
export const getInvoicesByParticipant = query({
  args: { userId: v.id("users"), participantId: v.id("participants") },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const allDocuments = await ctx.db
      .query("documents")
      .withIndex("by_participant", (q) =>
        q.eq("linkedParticipantId", args.participantId)
      )
      .collect();

    const documents = allDocuments.filter(d => d.organizationId === organizationId);

    const invoices = documents.filter((doc) =>
      ["invoice", "receipt", "quote"].includes(doc.documentType)
    );

    const invoicesWithUrls = await Promise.all(
      invoices.map(async (doc) => {
        const downloadUrl = await ctx.storage.getUrl(doc.storageId);
        return { ...doc, downloadUrl };
      })
    );

    return invoicesWithUrls.sort((a, b) => {
      if (!a.invoiceDate || !b.invoiceDate) return b.createdAt - a.createdAt;
      return new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime();
    });
  },
});

// Get invoice summary stats
export const getInvoiceSummary = query({
  args: {
    userId: v.id("users"),
    propertyId: v.optional(v.id("properties")),
    participantId: v.optional(v.id("participants")),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    let documents = await ctx.db
      .query("documents")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
      .collect();

    // Filter by property or participant if provided
    if (args.propertyId) {
      documents = documents.filter((doc) => doc.linkedPropertyId === args.propertyId);
    }
    if (args.participantId) {
      documents = documents.filter(
        (doc) => doc.linkedParticipantId === args.participantId
      );
    }

    const invoices = documents.filter((doc) =>
      ["invoice", "receipt", "quote"].includes(doc.documentType)
    );

    const totalAmount = invoices.reduce(
      (sum, inv) => sum + (inv.invoiceAmount || 0),
      0
    );
    const paid = invoices.filter((inv) => inv.isPaid).length;
    const unpaid = invoices.filter((inv) => !inv.isPaid).length;
    const paidAmount = invoices
      .filter((inv) => inv.isPaid)
      .reduce((sum, inv) => sum + (inv.invoiceAmount || 0), 0);
    const unpaidAmount = invoices
      .filter((inv) => !inv.isPaid)
      .reduce((sum, inv) => sum + (inv.invoiceAmount || 0), 0);

    return {
      totalInvoices: invoices.length,
      totalAmount,
      paid,
      unpaid,
      paidAmount,
      unpaidAmount,
      byType: {
        invoice: invoices.filter((inv) => inv.documentType === "invoice").length,
        receipt: invoices.filter((inv) => inv.documentType === "receipt").length,
        quote: invoices.filter((inv) => inv.documentType === "quote").length,
      },
    };
  },
});
