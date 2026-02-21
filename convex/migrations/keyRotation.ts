/**
 * Encryption Key Rotation Migration (S3)
 *
 * Re-encrypts all encrypted fields across all tables from the old key version
 * to the current key version (CURRENT_KEY_VERSION env var).
 *
 * This migration is:
 * - IDEMPOTENT: Records already on the current key version are skipped
 * - BATCHED: Processes 100 records per internal mutation call to avoid timeouts
 * - SAFE: Decryption failures are logged but do not abort the migration
 * - AUDITABLE: Logs progress per table with counts
 *
 * Prerequisites:
 * 1. Set ENCRYPTION_KEY_V<N> env var with the new key
 * 2. Set CURRENT_KEY_VERSION env var to "v<N>"
 * 3. Both old and new keys must be available for decryption
 *
 * Usage:
 *   npx convex run migrations/keyRotation:rotateAllEncryptedFields
 *
 * Tables and encrypted fields covered:
 * - participants: ndisNumber, dateOfBirth, emergencyContactName, emergencyContactPhone, emergencyContactRelation
 * - incidents: description, witnessNames, immediateActionTaken, followUpNotes
 * - owners: bankAccountNumber
 * - staffMembers: dateOfBirth, policeCheckNumber, ndisWorkerScreeningNumber, workingWithChildrenNumber
 * - providerSettings: bankAccountNumber
 * - calendarConnections: accessToken, refreshToken
 * - users (MFA): mfaSecret
 */
import { action, internalMutation, internalQuery } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";
import {
  isEncrypted,
  isCurrentKeyVersion,
  reEncryptWithCurrentKey,
} from "../lib/encryption";

const BATCH_SIZE = 100;

/** Result type for each table's rotation */
interface TableRotationResult {
  total: number;
  rotated: number;
  skipped: number;
  failed: number;
}

/** Full rotation result across all tables */
interface RotationResult {
  participants: TableRotationResult;
  incidents: TableRotationResult;
  owners: TableRotationResult;
  staffMembers: TableRotationResult;
  providerSettings: TableRotationResult;
  calendarConnections: TableRotationResult;
  mfaSecrets: TableRotationResult;
}

// ============================================
// MAIN ROTATION ACTION
// ============================================

/**
 * Rotate all encrypted fields to the current key version.
 *
 * This is the main entry point for key rotation. Run this after setting
 * the new key and updating CURRENT_KEY_VERSION.
 */
export const rotateAllEncryptedFields = action({
  args: {},
  handler: async (ctx): Promise<RotationResult> => {
    const results: RotationResult = {
      participants: { total: 0, rotated: 0, skipped: 0, failed: 0 },
      incidents: { total: 0, rotated: 0, skipped: 0, failed: 0 },
      owners: { total: 0, rotated: 0, skipped: 0, failed: 0 },
      staffMembers: { total: 0, rotated: 0, skipped: 0, failed: 0 },
      providerSettings: { total: 0, rotated: 0, skipped: 0, failed: 0 },
      calendarConnections: { total: 0, rotated: 0, skipped: 0, failed: 0 },
      mfaSecrets: { total: 0, rotated: 0, skipped: 0, failed: 0 },
    };

    // === PARTICIPANTS ===
    console.log("[KEY-ROTATION] Starting participants...");
    const participants = await ctx.runQuery(internal.participants.getAllRaw);
    results.participants.total = participants.length;

    for (let i = 0; i < participants.length; i += BATCH_SIZE) {
      const batch = participants.slice(i, i + BATCH_SIZE);
      const updates: Array<{
        id: Id<"participants">;
        ndisNumber?: string;
        dateOfBirth?: string;
        emergencyContactName?: string;
        emergencyContactPhone?: string;
        emergencyContactRelation?: string;
      }> = [];

      for (const p of batch) {
        // Check if the primary encrypted field is already on current version
        if (!isEncrypted(p.ndisNumber) && !isEncrypted(p.dateOfBirth)) {
          results.participants.skipped++;
          continue;
        }

        if (isCurrentKeyVersion(p.ndisNumber)) {
          results.participants.skipped++;
          continue;
        }

        try {
          const update: (typeof updates)[0] = { id: p._id };
          let hasChanges = false;

          const reEncNdis = await reEncryptWithCurrentKey(p.ndisNumber);
          if (reEncNdis !== p.ndisNumber) {
            update.ndisNumber = reEncNdis ?? undefined;
            hasChanges = true;
          }

          const reEncDob = await reEncryptWithCurrentKey(p.dateOfBirth);
          if (reEncDob !== p.dateOfBirth) {
            update.dateOfBirth = reEncDob ?? undefined;
            hasChanges = true;
          }

          const reEncEmName = await reEncryptWithCurrentKey(p.emergencyContactName);
          if (reEncEmName !== p.emergencyContactName) {
            update.emergencyContactName = reEncEmName ?? undefined;
            hasChanges = true;
          }

          const reEncEmPhone = await reEncryptWithCurrentKey(p.emergencyContactPhone);
          if (reEncEmPhone !== p.emergencyContactPhone) {
            update.emergencyContactPhone = reEncEmPhone ?? undefined;
            hasChanges = true;
          }

          const reEncEmRelation = await reEncryptWithCurrentKey(p.emergencyContactRelation);
          if (reEncEmRelation !== p.emergencyContactRelation) {
            update.emergencyContactRelation = reEncEmRelation ?? undefined;
            hasChanges = true;
          }

          if (hasChanges) {
            updates.push(update);
            results.participants.rotated++;
          } else {
            results.participants.skipped++;
          }
        } catch (err) {
          console.error(`[KEY-ROTATION] Failed to rotate participant ${p._id}:`, err);
          results.participants.failed++;
        }
      }

      if (updates.length > 0) {
        await ctx.runMutation(
          internal.migrations.keyRotation.patchParticipantBatch,
          { updates }
        );
      }
      console.log(
        `[KEY-ROTATION] Participants batch ${Math.floor(i / BATCH_SIZE) + 1}: ` +
        `${updates.length} rotated, ${batch.length - updates.length} skipped`
      );
    }

    // === INCIDENTS ===
    console.log("[KEY-ROTATION] Starting incidents...");
    const incidents = await ctx.runQuery(internal.incidents.getAllRaw);
    results.incidents.total = incidents.length;

    for (let i = 0; i < incidents.length; i += BATCH_SIZE) {
      const batch = incidents.slice(i, i + BATCH_SIZE);
      const updates: Array<{
        id: Id<"incidents">;
        description?: string;
        witnessNames?: string;
        immediateActionTaken?: string;
        followUpNotes?: string;
      }> = [];

      for (const inc of batch) {
        if (!isEncrypted(inc.description)) {
          results.incidents.skipped++;
          continue;
        }

        if (isCurrentKeyVersion(inc.description)) {
          results.incidents.skipped++;
          continue;
        }

        try {
          const update: (typeof updates)[0] = { id: inc._id };
          let hasChanges = false;

          const reEncDesc = await reEncryptWithCurrentKey(inc.description);
          if (reEncDesc !== inc.description) {
            update.description = reEncDesc ?? undefined;
            hasChanges = true;
          }

          const reEncWitness = await reEncryptWithCurrentKey(inc.witnessNames);
          if (reEncWitness !== inc.witnessNames) {
            update.witnessNames = reEncWitness ?? undefined;
            hasChanges = true;
          }

          const reEncAction = await reEncryptWithCurrentKey(inc.immediateActionTaken);
          if (reEncAction !== inc.immediateActionTaken) {
            update.immediateActionTaken = reEncAction ?? undefined;
            hasChanges = true;
          }

          const reEncNotes = await reEncryptWithCurrentKey(inc.followUpNotes);
          if (reEncNotes !== inc.followUpNotes) {
            update.followUpNotes = reEncNotes ?? undefined;
            hasChanges = true;
          }

          if (hasChanges) {
            updates.push(update);
            results.incidents.rotated++;
          } else {
            results.incidents.skipped++;
          }
        } catch (err) {
          console.error(`[KEY-ROTATION] Failed to rotate incident ${inc._id}:`, err);
          results.incidents.failed++;
        }
      }

      if (updates.length > 0) {
        await ctx.runMutation(
          internal.migrations.keyRotation.patchIncidentBatch,
          { updates }
        );
      }
      console.log(
        `[KEY-ROTATION] Incidents batch ${Math.floor(i / BATCH_SIZE) + 1}: ` +
        `${updates.length} rotated, ${batch.length - updates.length} skipped`
      );
    }

    // === OWNERS ===
    console.log("[KEY-ROTATION] Starting owners...");
    const owners = await ctx.runQuery(internal.owners.getAllRaw);
    results.owners.total = owners.length;

    for (let i = 0; i < owners.length; i += BATCH_SIZE) {
      const batch = owners.slice(i, i + BATCH_SIZE);
      const updates: Array<{
        id: Id<"owners">;
        bankAccountNumber?: string;
      }> = [];

      for (const owner of batch) {
        if (!owner.bankAccountNumber || !isEncrypted(owner.bankAccountNumber)) {
          results.owners.skipped++;
          continue;
        }

        if (isCurrentKeyVersion(owner.bankAccountNumber)) {
          results.owners.skipped++;
          continue;
        }

        try {
          const reEnc = await reEncryptWithCurrentKey(owner.bankAccountNumber);
          if (reEnc !== owner.bankAccountNumber) {
            updates.push({ id: owner._id, bankAccountNumber: reEnc ?? undefined });
            results.owners.rotated++;
          } else {
            results.owners.skipped++;
          }
        } catch (err) {
          console.error(`[KEY-ROTATION] Failed to rotate owner ${owner._id}:`, err);
          results.owners.failed++;
        }
      }

      if (updates.length > 0) {
        await ctx.runMutation(
          internal.migrations.keyRotation.patchOwnerBatch,
          { updates }
        );
      }
      console.log(
        `[KEY-ROTATION] Owners batch ${Math.floor(i / BATCH_SIZE) + 1}: ` +
        `${updates.length} rotated, ${batch.length - updates.length} skipped`
      );
    }

    // === STAFF MEMBERS ===
    console.log("[KEY-ROTATION] Starting staff members...");
    const staffMembers = await ctx.runQuery(internal.staff.getAllRaw);
    results.staffMembers.total = staffMembers.length;

    for (let i = 0; i < staffMembers.length; i += BATCH_SIZE) {
      const batch = staffMembers.slice(i, i + BATCH_SIZE);
      const updates: Array<{
        id: Id<"staffMembers">;
        dateOfBirth?: string;
        policeCheckNumber?: string;
        ndisWorkerScreeningNumber?: string;
        workingWithChildrenNumber?: string;
      }> = [];

      for (const s of batch) {
        const marker = s.dateOfBirth || s.policeCheckNumber || s.ndisWorkerScreeningNumber || s.workingWithChildrenNumber;
        if (!marker || !isEncrypted(marker)) {
          results.staffMembers.skipped++;
          continue;
        }

        if (isCurrentKeyVersion(marker)) {
          results.staffMembers.skipped++;
          continue;
        }

        try {
          const update: (typeof updates)[0] = { id: s._id };
          let hasChanges = false;

          for (const field of ["dateOfBirth", "policeCheckNumber", "ndisWorkerScreeningNumber", "workingWithChildrenNumber"] as const) {
            const val = s[field];
            if (val && isEncrypted(val)) {
              const reEnc = await reEncryptWithCurrentKey(val);
              if (reEnc !== val) {
                (update as Record<string, unknown>)[field] = reEnc ?? undefined;
                hasChanges = true;
              }
            }
          }

          if (hasChanges) {
            updates.push(update);
            results.staffMembers.rotated++;
          } else {
            results.staffMembers.skipped++;
          }
        } catch (err) {
          console.error(`[KEY-ROTATION] Failed to rotate staff ${s._id}:`, err);
          results.staffMembers.failed++;
        }
      }

      if (updates.length > 0) {
        await ctx.runMutation(
          internal.migrations.keyRotation.patchStaffBatch,
          { updates }
        );
      }
      console.log(
        `[KEY-ROTATION] Staff batch ${Math.floor(i / BATCH_SIZE) + 1}: ` +
        `${updates.length} rotated, ${batch.length - updates.length} skipped`
      );
    }

    // === PROVIDER SETTINGS ===
    console.log("[KEY-ROTATION] Starting provider settings...");
    const providerSettings = await ctx.runQuery(internal.providerSettings.getAllRaw);
    results.providerSettings.total = providerSettings.length;

    for (const ps of providerSettings) {
      if (!ps.bankAccountNumber || !isEncrypted(ps.bankAccountNumber)) {
        results.providerSettings.skipped++;
        continue;
      }

      if (isCurrentKeyVersion(ps.bankAccountNumber)) {
        results.providerSettings.skipped++;
        continue;
      }

      try {
        const reEnc = await reEncryptWithCurrentKey(ps.bankAccountNumber);
        if (reEnc !== ps.bankAccountNumber) {
          await ctx.runMutation(
            internal.migrations.keyRotation.patchProviderSettings,
            { id: ps._id, bankAccountNumber: reEnc! }
          );
          results.providerSettings.rotated++;
        } else {
          results.providerSettings.skipped++;
        }
      } catch (err) {
        console.error(`[KEY-ROTATION] Failed to rotate provider settings ${ps._id}:`, err);
        results.providerSettings.failed++;
      }
    }
    console.log(
      `[KEY-ROTATION] Provider settings: ${results.providerSettings.rotated} rotated, ` +
      `${results.providerSettings.skipped} skipped, ${results.providerSettings.failed} failed`
    );

    // === CALENDAR CONNECTIONS ===
    console.log("[KEY-ROTATION] Starting calendar connections...");
    const calendarConnections = await ctx.runQuery(
      internal.migrations.encryptExistingData.getAllCalendarConnectionsRaw
    );
    results.calendarConnections.total = calendarConnections.length;

    for (const conn of calendarConnections) {
      if (!isEncrypted(conn.accessToken)) {
        results.calendarConnections.skipped++;
        continue;
      }

      if (isCurrentKeyVersion(conn.accessToken)) {
        results.calendarConnections.skipped++;
        continue;
      }

      try {
        const [reEncAccess, reEncRefresh] = await Promise.all([
          reEncryptWithCurrentKey(conn.accessToken),
          reEncryptWithCurrentKey(conn.refreshToken),
        ]);

        if (reEncAccess !== conn.accessToken || reEncRefresh !== conn.refreshToken) {
          await ctx.runMutation(
            internal.migrations.keyRotation.patchCalendarConnection,
            {
              id: conn._id,
              accessToken: reEncAccess ?? conn.accessToken,
              refreshToken: reEncRefresh ?? conn.refreshToken,
            }
          );
          results.calendarConnections.rotated++;
        } else {
          results.calendarConnections.skipped++;
        }
      } catch (err) {
        console.error(`[KEY-ROTATION] Failed to rotate calendar connection ${conn._id}:`, err);
        results.calendarConnections.failed++;
      }
    }
    console.log(
      `[KEY-ROTATION] Calendar connections: ${results.calendarConnections.rotated} rotated, ` +
      `${results.calendarConnections.skipped} skipped, ${results.calendarConnections.failed} failed`
    );

    // === MFA SECRETS ===
    console.log("[KEY-ROTATION] Starting MFA secrets...");
    const users = await ctx.runQuery(
      internal.migrations.encryptExistingData.getUsersWithMfaRaw
    );
    results.mfaSecrets.total = users.length;

    for (const u of users) {
      if (!u.mfaSecret || !isEncrypted(u.mfaSecret)) {
        results.mfaSecrets.skipped++;
        continue;
      }

      if (isCurrentKeyVersion(u.mfaSecret)) {
        results.mfaSecrets.skipped++;
        continue;
      }

      try {
        const reEnc = await reEncryptWithCurrentKey(u.mfaSecret);
        if (reEnc !== u.mfaSecret) {
          await ctx.runMutation(
            internal.migrations.keyRotation.patchUserMfaSecret,
            { id: u._id, mfaSecret: reEnc! }
          );
          results.mfaSecrets.rotated++;
        } else {
          results.mfaSecrets.skipped++;
        }
      } catch (err) {
        console.error(`[KEY-ROTATION] Failed to rotate MFA secret for user ${u._id}:`, err);
        results.mfaSecrets.failed++;
      }
    }
    console.log(
      `[KEY-ROTATION] MFA secrets: ${results.mfaSecrets.rotated} rotated, ` +
      `${results.mfaSecrets.skipped} skipped, ${results.mfaSecrets.failed} failed`
    );

    console.log("[KEY-ROTATION] COMPLETE:", JSON.stringify(results, null, 2));
    return results;
  },
});

// ============================================
// INTERNAL MUTATIONS (batch patchers for rotation)
// ============================================

export const patchParticipantBatch = internalMutation({
  args: {
    updates: v.array(
      v.object({
        id: v.id("participants"),
        ndisNumber: v.optional(v.string()),
        dateOfBirth: v.optional(v.string()),
        emergencyContactName: v.optional(v.string()),
        emergencyContactPhone: v.optional(v.string()),
        emergencyContactRelation: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    for (const update of args.updates) {
      const { id, ...fields } = update;
      const patch: Record<string, unknown> = { updatedAt: Date.now() };
      for (const [key, value] of Object.entries(fields)) {
        if (value !== undefined) {
          patch[key] = value;
        }
      }
      await ctx.db.patch(id, patch);
    }
    return { patched: args.updates.length };
  },
});

export const patchIncidentBatch = internalMutation({
  args: {
    updates: v.array(
      v.object({
        id: v.id("incidents"),
        description: v.optional(v.string()),
        witnessNames: v.optional(v.string()),
        immediateActionTaken: v.optional(v.string()),
        followUpNotes: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    for (const update of args.updates) {
      const { id, ...fields } = update;
      const patch: Record<string, unknown> = { updatedAt: Date.now() };
      for (const [key, value] of Object.entries(fields)) {
        if (value !== undefined) {
          patch[key] = value;
        }
      }
      await ctx.db.patch(id, patch);
    }
    return { patched: args.updates.length };
  },
});

export const patchOwnerBatch = internalMutation({
  args: {
    updates: v.array(
      v.object({
        id: v.id("owners"),
        bankAccountNumber: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    for (const update of args.updates) {
      const { id, ...fields } = update;
      const patch: Record<string, unknown> = { updatedAt: Date.now() };
      for (const [key, value] of Object.entries(fields)) {
        if (value !== undefined) {
          patch[key] = value;
        }
      }
      await ctx.db.patch(id, patch);
    }
    return { patched: args.updates.length };
  },
});

export const patchStaffBatch = internalMutation({
  args: {
    updates: v.array(
      v.object({
        id: v.id("staffMembers"),
        dateOfBirth: v.optional(v.string()),
        policeCheckNumber: v.optional(v.string()),
        ndisWorkerScreeningNumber: v.optional(v.string()),
        workingWithChildrenNumber: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    for (const update of args.updates) {
      const { id, ...fields } = update;
      const patch: Record<string, unknown> = { updatedAt: Date.now() };
      for (const [key, value] of Object.entries(fields)) {
        if (value !== undefined) {
          patch[key] = value;
        }
      }
      await ctx.db.patch(id, patch);
    }
    return { patched: args.updates.length };
  },
});

export const patchProviderSettings = internalMutation({
  args: {
    id: v.id("providerSettings"),
    bankAccountNumber: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      bankAccountNumber: args.bankAccountNumber,
      updatedAt: Date.now(),
    });
  },
});

export const patchCalendarConnection = internalMutation({
  args: {
    id: v.id("calendarConnections"),
    accessToken: v.string(),
    refreshToken: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      accessToken: args.accessToken,
      refreshToken: args.refreshToken,
      updatedAt: Date.now(),
    });
  },
});

export const patchUserMfaSecret = internalMutation({
  args: {
    id: v.id("users"),
    mfaSecret: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      mfaSecret: args.mfaSecret,
      updatedAt: Date.now(),
    });
  },
});
