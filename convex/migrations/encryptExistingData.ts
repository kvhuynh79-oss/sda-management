/**
 * ENC-6: Data Migration Action
 * Encrypts existing plaintext data in participants, incidents, and owners tables.
 * Idempotent: checks isEncrypted() before encrypting each field.
 * Batched: processes 50 records per internal mutation call.
 *
 * CRITICAL: Run on DEV deployment first! npx convex dev (NOT npx convex deploy)
 */
import { action, internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";
import { encryptField, createBlindIndex, isEncrypted } from "../lib/encryption";

const BATCH_SIZE = 50;

/**
 * Re-encrypt migration: strips old encrypted values (from lost keys)
 * and re-encrypts with current keys. For fields where plaintext is
 * unrecoverable, sets placeholder values that must be re-entered manually.
 */
export const reEncryptAll = action({
  args: {},
  handler: async (ctx): Promise<{
    participants: { total: number; fixed: number; skipped: number };
    incidents: { total: number; fixed: number; skipped: number };
    owners: { total: number; fixed: number; skipped: number };
  }> => {
    const results = {
      participants: { total: 0, fixed: 0, skipped: 0 },
      incidents: { total: 0, fixed: 0, skipped: 0 },
      owners: { total: 0, fixed: 0, skipped: 0 },
    };

    // === PARTICIPANTS ===
    console.log("[RE-ENC] Starting participants...");
    const participants = await ctx.runQuery(internal.participants.getAllRaw);
    results.participants.total = participants.length;

    for (let i = 0; i < participants.length; i += BATCH_SIZE) {
      const batch = participants.slice(i, i + BATCH_SIZE);
      const updates: Array<{
        id: Id<"participants">;
        ndisNumber?: string;
        ndisNumberIndex?: string;
        dateOfBirth?: string;
        emergencyContactName?: string;
        emergencyContactPhone?: string;
        emergencyContactRelation?: string;
      }> = [];

      for (const p of batch) {
        if (!isEncrypted(p.ndisNumber)) {
          results.participants.skipped++;
          continue;
        }

        // NDIS number is unrecoverable - set placeholder, re-encrypt it
        const placeholder = `NEEDS-REENTRY-${p._id.slice(-6)}`;
        const update: typeof updates[0] = { id: p._id };

        update.ndisNumber = (await encryptField(placeholder))!;
        update.ndisNumberIndex = (await createBlindIndex(placeholder))!;

        // Clear optional encrypted fields (will show as empty until re-entered)
        update.dateOfBirth = undefined;
        update.emergencyContactName = undefined;
        update.emergencyContactPhone = undefined;
        update.emergencyContactRelation = undefined;

        updates.push(update);
        results.participants.fixed++;
      }

      if (updates.length > 0) {
        await ctx.runMutation(
          internal.migrations.encryptExistingData.patchParticipantBatch,
          { updates }
        );
      }
      console.log(`[RE-ENC] Participants batch ${Math.floor(i / BATCH_SIZE) + 1}: ${updates.length} fixed`);
    }

    // === INCIDENTS ===
    console.log("[RE-ENC] Starting incidents...");
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

        const update: typeof updates[0] = { id: inc._id };
        update.description = (await encryptField("[Description needs re-entry]"))!;
        update.witnessNames = undefined;
        update.immediateActionTaken = undefined;
        update.followUpNotes = undefined;

        updates.push(update);
        results.incidents.fixed++;
      }

      if (updates.length > 0) {
        await ctx.runMutation(
          internal.migrations.encryptExistingData.patchIncidentBatch,
          { updates }
        );
      }
      console.log(`[RE-ENC] Incidents batch ${Math.floor(i / BATCH_SIZE) + 1}: ${updates.length} fixed`);
    }

    // === OWNERS ===
    console.log("[RE-ENC] Starting owners...");
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

        const update: typeof updates[0] = { id: owner._id };
        update.bankAccountNumber = undefined; // Clear - needs re-entry

        updates.push(update);
        results.owners.fixed++;
      }

      if (updates.length > 0) {
        await ctx.runMutation(
          internal.migrations.encryptExistingData.patchOwnerBatch,
          { updates }
        );
      }
      console.log(`[RE-ENC] Owners batch ${Math.floor(i / BATCH_SIZE) + 1}: ${updates.length} fixed`);
    }

    console.log("[RE-ENC] COMPLETE:", JSON.stringify(results, null, 2));
    return results;
  },
});

// Internal mutation to patch a batch of participants with encrypted data
export const patchParticipantBatch = internalMutation({
  args: {
    updates: v.array(
      v.object({
        id: v.id("participants"),
        ndisNumber: v.optional(v.string()),
        ndisNumberIndex: v.optional(v.string()),
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
      const patch: Record<string, any> = { updatedAt: Date.now() };
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

// Internal mutation to patch a batch of incidents with encrypted data
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
      const patch: Record<string, any> = { updatedAt: Date.now() };
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

// Internal mutation to patch a batch of owners with encrypted data
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
      const patch: Record<string, any> = { updatedAt: Date.now() };
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

// Main migration action - orchestrates encryption of all existing data
export const migrateAll = action({
  args: {},
  handler: async (ctx) => {
    const results = {
      participants: { total: 0, encrypted: 0, skipped: 0 },
      incidents: { total: 0, encrypted: 0, skipped: 0 },
      owners: { total: 0, encrypted: 0, skipped: 0 },
    };

    // === PARTICIPANTS ===
    console.log("[ENC Migration] Starting participants...");
    const participants = await ctx.runQuery(internal.participants.getAllRaw);
    results.participants.total = participants.length;

    for (let i = 0; i < participants.length; i += BATCH_SIZE) {
      const batch = participants.slice(i, i + BATCH_SIZE);
      const updates: Array<{
        id: Id<"participants">;
        ndisNumber?: string;
        ndisNumberIndex?: string;
        dateOfBirth?: string;
        emergencyContactName?: string;
        emergencyContactPhone?: string;
        emergencyContactRelation?: string;
      }> = [];

      for (const p of batch) {
        // Skip if already encrypted (idempotent check)
        if (isEncrypted(p.ndisNumber)) {
          results.participants.skipped++;
          continue;
        }

        const update: typeof updates[0] = { id: p._id };

        // Encrypt each sensitive field
        const encNdis = await encryptField(p.ndisNumber);
        if (encNdis) update.ndisNumber = encNdis;

        // Create blind index for NDIS number
        const blindIndex = await createBlindIndex(p.ndisNumber);
        if (blindIndex) update.ndisNumberIndex = blindIndex;

        if (p.dateOfBirth) {
          const enc = await encryptField(p.dateOfBirth);
          if (enc) update.dateOfBirth = enc;
        }
        if (p.emergencyContactName) {
          const enc = await encryptField(p.emergencyContactName);
          if (enc) update.emergencyContactName = enc;
        }
        if (p.emergencyContactPhone) {
          const enc = await encryptField(p.emergencyContactPhone);
          if (enc) update.emergencyContactPhone = enc;
        }
        if (p.emergencyContactRelation) {
          const enc = await encryptField(p.emergencyContactRelation);
          if (enc) update.emergencyContactRelation = enc;
        }

        updates.push(update);
        results.participants.encrypted++;
      }

      if (updates.length > 0) {
        await ctx.runMutation(
          internal.migrations.encryptExistingData.patchParticipantBatch,
          { updates }
        );
      }

      console.log(
        `[ENC Migration] Participants batch ${Math.floor(i / BATCH_SIZE) + 1}: ${updates.length} encrypted, ${batch.length - updates.length} skipped`
      );
    }

    // === INCIDENTS ===
    console.log("[ENC Migration] Starting incidents...");
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
        // Skip if already encrypted (idempotent check on description)
        if (isEncrypted(inc.description)) {
          results.incidents.skipped++;
          continue;
        }

        const update: typeof updates[0] = { id: inc._id };

        const encDesc = await encryptField(inc.description);
        if (encDesc) update.description = encDesc;

        if (inc.witnessNames) {
          const enc = await encryptField(inc.witnessNames);
          if (enc) update.witnessNames = enc;
        }
        if (inc.immediateActionTaken) {
          const enc = await encryptField(inc.immediateActionTaken);
          if (enc) update.immediateActionTaken = enc;
        }
        if (inc.followUpNotes) {
          const enc = await encryptField(inc.followUpNotes);
          if (enc) update.followUpNotes = enc;
        }

        updates.push(update);
        results.incidents.encrypted++;
      }

      if (updates.length > 0) {
        await ctx.runMutation(
          internal.migrations.encryptExistingData.patchIncidentBatch,
          { updates }
        );
      }

      console.log(
        `[ENC Migration] Incidents batch ${Math.floor(i / BATCH_SIZE) + 1}: ${updates.length} encrypted, ${batch.length - updates.length} skipped`
      );
    }

    // === OWNERS ===
    console.log("[ENC Migration] Starting owners...");
    const owners = await ctx.runQuery(internal.owners.getAllRaw);
    results.owners.total = owners.length;

    for (let i = 0; i < owners.length; i += BATCH_SIZE) {
      const batch = owners.slice(i, i + BATCH_SIZE);
      const updates: Array<{
        id: Id<"owners">;
        bankAccountNumber?: string;
      }> = [];

      for (const owner of batch) {
        // Skip if no bank account number or already encrypted
        if (!owner.bankAccountNumber || isEncrypted(owner.bankAccountNumber)) {
          results.owners.skipped++;
          continue;
        }

        const update: typeof updates[0] = { id: owner._id };
        const enc = await encryptField(owner.bankAccountNumber);
        if (enc) update.bankAccountNumber = enc;

        updates.push(update);
        results.owners.encrypted++;
      }

      if (updates.length > 0) {
        await ctx.runMutation(
          internal.migrations.encryptExistingData.patchOwnerBatch,
          { updates }
        );
      }

      console.log(
        `[ENC Migration] Owners batch ${Math.floor(i / BATCH_SIZE) + 1}: ${updates.length} encrypted, ${batch.length - updates.length} skipped`
      );
    }

    console.log("[ENC Migration] COMPLETE:", JSON.stringify(results, null, 2));
    return results;
  },
});
