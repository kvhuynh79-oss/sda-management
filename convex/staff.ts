import { v } from "convex/values";
import { mutation, query, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { requirePermission, getUserFullName, requireTenant } from "./authHelpers";
import { encryptField, decryptField } from "./lib/encryption";
import { assertValidEmail, assertValidPhone } from "./lib/validation";

// Sensitive staff fields that must be encrypted at rest
const ENCRYPTED_STAFF_FIELDS = [
  "dateOfBirth",
  "policeCheckNumber",
  "ndisWorkerScreeningNumber",
  "workingWithChildrenNumber",
] as const;

// Decrypt sensitive staff fields (handles both encrypted and plaintext for migration compatibility)
async function decryptStaffFields<T extends Record<string, any>>(s: T): Promise<T> {
  const [dateOfBirth, policeCheckNumber, ndisWorkerScreeningNumber, workingWithChildrenNumber] =
    await Promise.all([
      decryptField(s.dateOfBirth),
      decryptField(s.policeCheckNumber),
      decryptField(s.ndisWorkerScreeningNumber),
      decryptField(s.workingWithChildrenNumber),
    ]);
  return {
    ...s,
    dateOfBirth: dateOfBirth ?? s.dateOfBirth,
    policeCheckNumber: policeCheckNumber ?? s.policeCheckNumber,
    ndisWorkerScreeningNumber: ndisWorkerScreeningNumber ?? s.ndisWorkerScreeningNumber,
    workingWithChildrenNumber: workingWithChildrenNumber ?? s.workingWithChildrenNumber,
  };
}

// Get all active staff members with resolved assigned properties
export const getAll = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);

    const staffMembers = await ctx.db
      .query("staffMembers")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    // Resolve assigned properties for each staff member + decrypt sensitive fields
    const staffWithProperties = await Promise.all(
      staffMembers.map(async (member) => {
        const decrypted = await decryptStaffFields(member);
        const properties = member.assignedProperties
          ? await Promise.all(
              member.assignedProperties.map(async (propId) => {
                const property = await ctx.db.get(propId);
                return property
                  ? {
                      _id: property._id,
                      propertyName: property.propertyName,
                      addressLine1: property.addressLine1,
                      suburb: property.suburb,
                    }
                  : null;
              })
            )
          : [];
        return {
          ...decrypted,
          properties: properties.filter(Boolean),
        };
      })
    );

    return staffWithProperties;
  },
});

// Get staff member by ID with resolved assigned properties
export const getById = query({
  args: { userId: v.id("users"), staffMemberId: v.id("staffMembers") },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const member = await ctx.db.get(args.staffMemberId);
    if (!member) return null;
    if (member.organizationId !== organizationId) {
      throw new Error("Access denied: Record belongs to different organization");
    }

    const decrypted = await decryptStaffFields(member);

    // Resolve assigned properties
    const properties = member.assignedProperties
      ? await Promise.all(
          member.assignedProperties.map(async (propId) => {
            const property = await ctx.db.get(propId);
            return property
              ? {
                  _id: property._id,
                  propertyName: property.propertyName,
                  addressLine1: property.addressLine1,
                  suburb: property.suburb,
                }
              : null;
          })
        )
      : [];

    return {
      ...decrypted,
      properties: properties.filter(Boolean),
    };
  },
});

// Create a new staff member
export const create = mutation({
  args: {
    userId: v.id("users"),
    // Personal
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    suburb: v.optional(v.string()),
    state: v.optional(v.string()),
    postcode: v.optional(v.string()),
    dateOfBirth: v.optional(v.string()),
    emergencyContactName: v.optional(v.string()),
    emergencyContactPhone: v.optional(v.string()),
    // Employment
    position: v.optional(v.string()),
    employmentType: v.union(
      v.literal("full_time"),
      v.literal("part_time"),
      v.literal("casual"),
      v.literal("contractor")
    ),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    assignedProperties: v.optional(v.array(v.id("properties"))),
    // NDIS Screening & Compliance
    policeCheckNumber: v.optional(v.string()),
    policeCheckDate: v.optional(v.string()),
    policeCheckExpiry: v.optional(v.string()),
    ndisWorkerScreeningNumber: v.optional(v.string()),
    ndisWorkerScreeningDate: v.optional(v.string()),
    ndisWorkerScreeningExpiry: v.optional(v.string()),
    workingWithChildrenNumber: v.optional(v.string()),
    workingWithChildrenDate: v.optional(v.string()),
    workingWithChildrenExpiry: v.optional(v.string()),
    ndisWorkerOrientation: v.optional(v.boolean()),
    ndisWorkerOrientationDate: v.optional(v.string()),
    firstAidCertDate: v.optional(v.string()),
    firstAidCertExpiry: v.optional(v.string()),
    // Standard
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Validate email and phone
    assertValidEmail(args.email);
    if (args.phone) assertValidPhone(args.phone, "Phone");
    if (args.emergencyContactPhone) assertValidPhone(args.emergencyContactPhone, "Emergency contact phone");

    // Permission check and get organizationId
    const user = await requirePermission(ctx, args.userId, "staffMembers", "create");
    const { organizationId } = await requireTenant(ctx, args.userId);
    const { userId, ...staffData } = args;

    // Encrypt sensitive fields before storing
    const [encDateOfBirth, encPoliceCheckNumber, encNdisWorkerScreeningNumber, encWorkingWithChildrenNumber] =
      await Promise.all([
        encryptField(staffData.dateOfBirth),
        encryptField(staffData.policeCheckNumber),
        encryptField(staffData.ndisWorkerScreeningNumber),
        encryptField(staffData.workingWithChildrenNumber),
      ]);

    const staffMemberId = await ctx.db.insert("staffMembers", {
      ...staffData,
      dateOfBirth: encDateOfBirth ?? staffData.dateOfBirth,
      policeCheckNumber: encPoliceCheckNumber ?? staffData.policeCheckNumber,
      ndisWorkerScreeningNumber: encNdisWorkerScreeningNumber ?? staffData.ndisWorkerScreeningNumber,
      workingWithChildrenNumber: encWorkingWithChildrenNumber ?? staffData.workingWithChildrenNumber,
      organizationId,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Audit log
    await ctx.runMutation(internal.auditLog.log, {
      userId: args.userId,
      userEmail: user.email,
      userName: getUserFullName(user),
      action: "create",
      entityType: "staffMember",
      entityId: staffMemberId,
      entityName: `${args.firstName} ${args.lastName}`,
    });

    return staffMemberId;
  },
});

// Update a staff member
export const update = mutation({
  args: {
    userId: v.id("users"),
    staffMemberId: v.id("staffMembers"),
    // Personal
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    suburb: v.optional(v.string()),
    state: v.optional(v.string()),
    postcode: v.optional(v.string()),
    dateOfBirth: v.optional(v.string()),
    emergencyContactName: v.optional(v.string()),
    emergencyContactPhone: v.optional(v.string()),
    // Employment
    position: v.optional(v.string()),
    employmentType: v.optional(
      v.union(
        v.literal("full_time"),
        v.literal("part_time"),
        v.literal("casual"),
        v.literal("contractor")
      )
    ),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    assignedProperties: v.optional(v.array(v.id("properties"))),
    // NDIS Screening & Compliance
    policeCheckNumber: v.optional(v.string()),
    policeCheckDate: v.optional(v.string()),
    policeCheckExpiry: v.optional(v.string()),
    ndisWorkerScreeningNumber: v.optional(v.string()),
    ndisWorkerScreeningDate: v.optional(v.string()),
    ndisWorkerScreeningExpiry: v.optional(v.string()),
    workingWithChildrenNumber: v.optional(v.string()),
    workingWithChildrenDate: v.optional(v.string()),
    workingWithChildrenExpiry: v.optional(v.string()),
    ndisWorkerOrientation: v.optional(v.boolean()),
    ndisWorkerOrientationDate: v.optional(v.string()),
    firstAidCertDate: v.optional(v.string()),
    firstAidCertExpiry: v.optional(v.string()),
    // Standard
    notes: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Permission check and get organizationId
    await requirePermission(ctx, args.userId, "staffMembers", "update");
    const { organizationId } = await requireTenant(ctx, args.userId);
    const { staffMemberId, userId, ...updates } = args;

    const existing = await ctx.db.get(staffMemberId);
    if (!existing) throw new Error("Staff member not found");
    if (existing.organizationId !== organizationId) {
      throw new Error("Access denied: Record belongs to different organization");
    }

    const filteredUpdates: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filteredUpdates[key] = value;
      }
    }

    // Encrypt sensitive fields if they are being updated
    if (filteredUpdates.dateOfBirth !== undefined) {
      filteredUpdates.dateOfBirth = await encryptField(filteredUpdates.dateOfBirth as string) ?? filteredUpdates.dateOfBirth;
    }
    if (filteredUpdates.policeCheckNumber !== undefined) {
      filteredUpdates.policeCheckNumber = await encryptField(filteredUpdates.policeCheckNumber as string) ?? filteredUpdates.policeCheckNumber;
    }
    if (filteredUpdates.ndisWorkerScreeningNumber !== undefined) {
      filteredUpdates.ndisWorkerScreeningNumber = await encryptField(filteredUpdates.ndisWorkerScreeningNumber as string) ?? filteredUpdates.ndisWorkerScreeningNumber;
    }
    if (filteredUpdates.workingWithChildrenNumber !== undefined) {
      filteredUpdates.workingWithChildrenNumber = await encryptField(filteredUpdates.workingWithChildrenNumber as string) ?? filteredUpdates.workingWithChildrenNumber;
    }

    await ctx.db.patch(staffMemberId, filteredUpdates);
    return staffMemberId;
  },
});

// Soft delete a staff member
export const remove = mutation({
  args: {
    userId: v.id("users"),
    staffMemberId: v.id("staffMembers"),
  },
  handler: async (ctx, args) => {
    // Permission check - only admin can delete
    const user = await requirePermission(ctx, args.userId, "staffMembers", "delete");
    const { organizationId } = await requireTenant(ctx, args.userId);

    const member = await ctx.db.get(args.staffMemberId);
    if (!member) throw new Error("Staff member not found");
    if (member.organizationId !== organizationId) {
      throw new Error("Access denied: Record belongs to different organization");
    }

    await ctx.db.patch(args.staffMemberId, {
      isActive: false,
      updatedAt: Date.now(),
    });

    // Audit log
    await ctx.runMutation(internal.auditLog.log, {
      userId: args.userId,
      userEmail: user.email,
      userName: getUserFullName(user),
      action: "delete",
      entityType: "staffMember",
      entityId: args.staffMemberId,
      entityName: `${member.firstName} ${member.lastName}`,
    });
  },
});

// Screening expiry types for computed fields
type ScreeningStatus = "expired" | "expiring_soon" | "current";

interface ExpiringScreening {
  type: string;
  expiryDate: string;
  status: ScreeningStatus;
}

// Get staff members with screenings expiring within N days or already expired
export const getScreeningExpiries = query({
  args: {
    userId: v.id("users"),
    daysAhead: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);
    const daysAhead = args.daysAhead ?? 30;

    const staffMembers = await ctx.db
      .query("staffMembers")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    const now = new Date();
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() + daysAhead);
    const nowStr = now.toISOString().split("T")[0];
    const thresholdStr = thresholdDate.toISOString().split("T")[0];

    const screeningFields: { field: keyof typeof staffMembers[0]; label: string }[] = [
      { field: "policeCheckExpiry", label: "Police Check" },
      { field: "ndisWorkerScreeningExpiry", label: "NDIS Worker Screening" },
      { field: "workingWithChildrenExpiry", label: "Working with Children Check" },
      { field: "firstAidCertExpiry", label: "First Aid Certificate" },
    ];

    const results: (typeof staffMembers[0] & { expiringScreenings: ExpiringScreening[] })[] = [];

    for (const member of staffMembers) {
      const expiringScreenings: ExpiringScreening[] = [];

      for (const { field, label } of screeningFields) {
        const expiryDate = member[field] as string | undefined;
        if (!expiryDate) continue;

        let status: ScreeningStatus = "current";
        if (expiryDate < nowStr) {
          status = "expired";
        } else if (expiryDate <= thresholdStr) {
          status = "expiring_soon";
        }

        if (status !== "current") {
          expiringScreenings.push({
            type: label,
            expiryDate,
            status,
          });
        }
      }

      if (expiringScreenings.length > 0) {
        const decrypted = await decryptStaffFields(member);
        results.push({
          ...decrypted,
          expiringScreenings,
        });
      }
    }

    return results;
  },
});

// Get staff statistics
export const getStats = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const { organizationId } = await requireTenant(ctx, args.userId);

    const allStaff = await ctx.db
      .query("staffMembers")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
      .collect();

    const active = allStaff.filter((s) => s.isActive);
    const inactive = allStaff.filter((s) => !s.isActive);

    // Count by employment type
    const byEmploymentType = {
      full_time: 0,
      part_time: 0,
      casual: 0,
      contractor: 0,
    };
    for (const member of active) {
      byEmploymentType[member.employmentType]++;
    }

    // Check screening expiries for active staff
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const nowStr = now.toISOString().split("T")[0];
    const thresholdStr = thirtyDaysFromNow.toISOString().split("T")[0];

    const screeningExpiryFields = [
      "policeCheckExpiry",
      "ndisWorkerScreeningExpiry",
      "workingWithChildrenExpiry",
      "firstAidCertExpiry",
    ] as const;

    let expiredScreenings = 0;
    let expiringScreenings = 0;

    for (const member of active) {
      let hasExpired = false;
      let hasExpiring = false;

      for (const field of screeningExpiryFields) {
        const expiryDate = member[field] as string | undefined;
        if (!expiryDate) continue;

        if (expiryDate < nowStr) {
          hasExpired = true;
        } else if (expiryDate <= thresholdStr) {
          hasExpiring = true;
        }
      }

      if (hasExpired) expiredScreenings++;
      if (hasExpiring && !hasExpired) expiringScreenings++;
    }

    return {
      total: allStaff.length,
      active: active.length,
      inactive: inactive.length,
      byEmploymentType,
      expiredScreenings,
      expiringScreenings,
    };
  },
});

// Internal raw query for migration (no decryption - returns data as-is)
export const getAllRaw = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("staffMembers").collect();
  },
});
