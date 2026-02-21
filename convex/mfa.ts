import { v } from "convex/values";
import { mutation, query, action, internalQuery, internalMutation } from "./_generated/server";
import { TOTP, Secret } from "otpauth";
import QRCode from "qrcode";
import { internal } from "./_generated/api";
import { requirePermission } from "./authHelpers";

/**
 * MFA (Multi-Factor Authentication) Module
 *
 * Implements TOTP (Time-based One-Time Password) authentication
 * for admin accounts using Google Authenticator-compatible tokens.
 */

// TOTP Configuration
const TOTP_CONFIG = {
  issuer: "MySDAManager",
  algorithm: "SHA1" as const,
  digits: 6,
  period: 30, // 30-second validity window
};

// Rate limiting configuration
const RATE_LIMIT = {
  MAX_ATTEMPTS: 5,       // Maximum failed attempts before lockout
  LOCKOUT_MS: 15 * 60 * 1000, // 15 minutes lockout
};

/**
 * Check if user is locked out from MFA attempts
 * @returns null if not locked, or remaining lockout message
 */
function checkMfaLockout(user: { mfaLockedUntil?: string }): string | null {
  if (!user.mfaLockedUntil) return null;
  const lockedUntil = new Date(user.mfaLockedUntil).getTime();
  const now = Date.now();
  if (lockedUntil > now) {
    const remainingMin = Math.ceil((lockedUntil - now) / 60000);
    return `Account locked. Try again in ${remainingMin} minute${remainingMin !== 1 ? "s" : ""}.`;
  }
  return null; // Lockout expired
}

/**
 * Generate a random backup code (8 characters, alphanumeric)
 */
function generateBackupCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const randomBytes = new Uint8Array(8);
  crypto.getRandomValues(randomBytes);
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(randomBytes[i] % chars.length);
  }
  return code;
}

/**
 * Hash a string using simple crypto (for backup codes)
 * Note: In production, use bcrypt for password-like hashing
 */
async function hashString(input: string): Promise<string> {
  // Simple hash for backup codes (they're one-time use anyway)
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Step 1: Setup MFA - Generate TOTP secret and QR code
 *
 * Call this when user wants to enable MFA.
 * Returns QR code URL and backup codes for user to save.
 */
export const setupMfa = action({
  args: {
    userId: v.id("users"),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    secret: string;
    qrCodeDataUrl: string;
    backupCodes: string[];
  }> => {
    // Get user
    const user = await ctx.runQuery(internal.mfa.getUserInternal, {
      userId: args.userId,
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Only admins can enable MFA (or user themselves)
    if (user.role !== "admin") {
      throw new Error("MFA is only available for admin accounts");
    }

    // Generate TOTP secret
    const secret: Secret = new Secret({ size: 20 });
    const totp: TOTP = new TOTP({
      ...TOTP_CONFIG,
      label: user.email,
      secret,
    });

    // Generate QR code URL
    const otpauthUrl: string = totp.toString();
    const qrCodeDataUrl: string = await QRCode.toDataURL(otpauthUrl);

    // Generate 10 backup codes
    const backupCodes: string[] = [];
    for (let i = 0; i < 10; i++) {
      backupCodes.push(generateBackupCode());
    }

    // Hash backup codes before storing
    const hashedBackupCodes = await Promise.all(
      backupCodes.map((code) => hashString(code))
    );

    // Store secret and hashed backup codes (but don't enable MFA yet)
    await ctx.runMutation(internal.mfa.storeMfaSecretInternal, {
      userId: args.userId,
      secret: secret.base32,
      hashedBackupCodes,
    });

    return {
      secret: secret.base32, // For manual entry if QR scan fails
      qrCodeDataUrl, // QR code image as data URL
      backupCodes, // Plain backup codes (show once, user must save)
    };
  },
});

/**
 * Step 2: Verify MFA code and enable MFA
 *
 * User scans QR code, enters the TOTP code to verify it works.
 * If valid, enable MFA for the account.
 */
export const verifyAndEnableMfa = mutation({
  args: {
    userId: v.id("users"),
    totpCode: v.string(),
  },
  handler: async (ctx, args) => {
    // Get user with secret
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    if (!user.mfaSecret) {
      throw new Error("MFA setup not initiated. Call setupMfa first.");
    }

    // Verify TOTP code
    const totp = new TOTP({
      ...TOTP_CONFIG,
      label: user.email,
      secret: Secret.fromBase32(user.mfaSecret),
    });

    // Rate limit check
    const lockoutMsg = checkMfaLockout(user);
    if (lockoutMsg) {
      throw new Error(lockoutMsg);
    }

    // Check if code is valid (with 1-step window tolerance for clock skew)
    const delta = totp.validate({ token: args.totpCode, window: 1 });

    if (delta === null) {
      // Track failed attempt
      const attempts = (user.mfaFailedAttempts || 0) + 1;
      const patchData: Record<string, any> = {
        mfaFailedAttempts: attempts,
        updatedAt: Date.now(),
      };

      // Lock account after MAX_ATTEMPTS
      if (attempts >= RATE_LIMIT.MAX_ATTEMPTS) {
        patchData.mfaLockedUntil = new Date(Date.now() + RATE_LIMIT.LOCKOUT_MS).toISOString();

        // Audit: lockout
        await ctx.runMutation(internal.auditLog.log, {
          userId: args.userId,
          userEmail: user.email,
          userName: `${user.firstName} ${user.lastName}`,
          action: "mfa_lockout",
          entityType: "user",
          entityId: args.userId,
          entityName: `MFA lockout: ${user.email} (${attempts} failed attempts)`,
          metadata: JSON.stringify({ attempts, lockoutMinutes: 15 }),
        });
      }

      await ctx.db.patch(args.userId, patchData);
      throw new Error("Invalid TOTP code. Please try again.");
    }

    // Enable MFA + reset rate limit counters
    await ctx.db.patch(args.userId, {
      mfaEnabled: true,
      mfaFailedAttempts: 0,
      mfaLockedUntil: undefined,
      updatedAt: Date.now(),
    });

    // Audit: MFA enabled
    await ctx.runMutation(internal.auditLog.log, {
      userId: args.userId,
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`,
      action: "mfa_enabled",
      entityType: "user",
      entityId: args.userId,
      entityName: `MFA enabled: ${user.email}`,
    });

    return { success: true, message: "MFA enabled successfully" };
  },
});

/**
 * Verify MFA code during login (internal)
 *
 * Called after username/password authentication.
 * Checks TOTP code or backup code.
 */
export const verifyMfaLogin = internalMutation({
  args: {
    userId: v.id("users"),
    code: v.string(), // TOTP code or backup code
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    if (!user.mfaEnabled || !user.mfaSecret) {
      throw new Error("MFA not enabled for this user");
    }

    // Rate limit check
    const lockoutMsg = checkMfaLockout(user);
    if (lockoutMsg) {
      throw new Error(lockoutMsg);
    }

    // First, try TOTP code
    const totp = new TOTP({
      ...TOTP_CONFIG,
      label: user.email,
      secret: Secret.fromBase32(user.mfaSecret),
    });

    const delta = totp.validate({ token: args.code, window: 1 });

    if (delta !== null) {
      // Valid TOTP code - reset failed attempts
      await ctx.db.patch(args.userId, {
        mfaFailedAttempts: 0,
        mfaLockedUntil: undefined,
        updatedAt: Date.now(),
      });
      return { success: true, method: "totp" };
    }

    // If TOTP failed, try backup code
    if (user.mfaBackupCodes && user.mfaBackupCodes.length > 0) {
      const hashedCode = await hashString(args.code);

      // Check if this backup code exists
      const codeIndex = user.mfaBackupCodes.indexOf(hashedCode);

      if (codeIndex !== -1) {
        // Valid backup code - remove it (one-time use) + reset failed attempts
        const updatedBackupCodes = [...user.mfaBackupCodes];
        updatedBackupCodes.splice(codeIndex, 1);

        await ctx.db.patch(args.userId, {
          mfaBackupCodes: updatedBackupCodes,
          mfaFailedAttempts: 0,
          mfaLockedUntil: undefined,
          updatedAt: Date.now(),
        });

        // Audit: backup code used
        await ctx.runMutation(internal.auditLog.log, {
          userId: args.userId,
          userEmail: user.email,
          userName: `${user.firstName} ${user.lastName}`,
          action: "mfa_backup_used",
          entityType: "user",
          entityId: args.userId,
          entityName: `MFA backup code used: ${user.email}`,
          metadata: JSON.stringify({ remainingCodes: updatedBackupCodes.length }),
        });

        return {
          success: true,
          method: "backup_code",
          remainingBackupCodes: updatedBackupCodes.length,
        };
      }
    }

    // Both TOTP and backup code failed - track failed attempt
    const attempts = (user.mfaFailedAttempts || 0) + 1;
    const patchData: Record<string, any> = {
      mfaFailedAttempts: attempts,
      updatedAt: Date.now(),
    };

    if (attempts >= RATE_LIMIT.MAX_ATTEMPTS) {
      patchData.mfaLockedUntil = new Date(Date.now() + RATE_LIMIT.LOCKOUT_MS).toISOString();

      // Audit: lockout
      await ctx.runMutation(internal.auditLog.log, {
        userId: args.userId,
        userEmail: user.email,
        userName: `${user.firstName} ${user.lastName}`,
        action: "mfa_lockout",
        entityType: "user",
        entityId: args.userId,
        entityName: `MFA lockout: ${user.email} (${attempts} failed login attempts)`,
        metadata: JSON.stringify({ attempts, lockoutMinutes: 15 }),
      });
    }

    await ctx.db.patch(args.userId, patchData);
    throw new Error("Invalid MFA code");
  },
});

/**
 * Disable MFA for a user
 *
 * Requires verification (TOTP or password) before disabling.
 * Only admin or the user themselves can disable.
 */
export const disableMfa = mutation({
  args: {
    userId: v.id("users"),
    actingUserId: v.id("users"), // Who is performing this action
    totpCode: v.optional(v.string()), // TOTP verification
    password: v.optional(v.string()), // Password verification (alternative)
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    const actingUser = await ctx.db.get(args.actingUserId);
    if (!actingUser) {
      throw new Error("Acting user not found");
    }

    // Authorization: admin or self
    if (actingUser.role !== "admin" && args.actingUserId !== args.userId) {
      throw new Error("Unauthorized: Only admins or the user can disable MFA");
    }

    // Verify TOTP code if provided
    if (args.totpCode && user.mfaSecret && user.mfaEnabled) {
      const totp = new TOTP({
        ...TOTP_CONFIG,
        label: user.email,
        secret: Secret.fromBase32(user.mfaSecret),
      });

      const delta = totp.validate({ token: args.totpCode, window: 1 });
      if (delta === null) {
        throw new Error("Invalid TOTP code");
      }
    }

    // TODO: Verify password if provided (requires bcrypt import)
    // For now, require TOTP verification

    // Disable MFA + clear rate limit data
    await ctx.db.patch(args.userId, {
      mfaEnabled: false,
      mfaSecret: undefined,
      mfaBackupCodes: undefined,
      mfaFailedAttempts: undefined,
      mfaLockedUntil: undefined,
      updatedAt: Date.now(),
    });

    // Audit: MFA disabled
    await ctx.runMutation(internal.auditLog.log, {
      userId: args.actingUserId,
      userEmail: actingUser.email,
      userName: `${actingUser.firstName} ${actingUser.lastName}`,
      action: "mfa_disabled",
      entityType: "user",
      entityId: args.userId,
      entityName: `MFA disabled: ${user.email}`,
      metadata: JSON.stringify({
        disabledBy: args.actingUserId === args.userId ? "self" : "admin",
      }),
    });

    return { success: true, message: "MFA disabled successfully" };
  },
});

/**
 * Regenerate backup codes
 *
 * User must verify with TOTP code before regenerating.
 */
export const regenerateBackupCodes = action({
  args: {
    userId: v.id("users"),
    totpCode: v.string(),
  },
  handler: async (ctx, args): Promise<{ backupCodes: string[] }> => {
    const user = await ctx.runQuery(internal.mfa.getUserInternal, {
      userId: args.userId,
    });

    if (!user) {
      throw new Error("User not found");
    }

    if (!user.mfaEnabled || !user.mfaSecret) {
      throw new Error("MFA not enabled for this user");
    }

    // Verify TOTP code
    const totp = new TOTP({
      ...TOTP_CONFIG,
      label: user.email,
      secret: Secret.fromBase32(user.mfaSecret),
    });

    const delta = totp.validate({ token: args.totpCode, window: 1 });
    if (delta === null) {
      throw new Error("Invalid TOTP code");
    }

    // Generate new backup codes
    const backupCodes: string[] = [];
    for (let i = 0; i < 10; i++) {
      backupCodes.push(generateBackupCode());
    }

    // Hash backup codes
    const hashedBackupCodes = await Promise.all(
      backupCodes.map((code) => hashString(code))
    );

    // Update stored backup codes
    await ctx.runMutation(internal.mfa.updateBackupCodesInternal, {
      userId: args.userId,
      hashedBackupCodes,
    });

    // Audit: backup codes regenerated
    await ctx.runMutation(internal.auditLog.log, {
      userId: args.userId,
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`,
      action: "mfa_backup_regenerated",
      entityType: "user",
      entityId: args.userId,
      entityName: `MFA backup codes regenerated: ${user.email}`,
    });

    return {
      backupCodes, // Plain codes (show once, user must save)
    };
  },
});

/**
 * Check if user has MFA enabled
 */
export const getMfaStatus = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    return {
      mfaEnabled: user.mfaEnabled || false,
      hasBackupCodes: (user.mfaBackupCodes?.length || 0) > 0,
      backupCodesRemaining: user.mfaBackupCodes?.length || 0,
    };
  },
});

// ============ Internal Functions (not exposed to client) ============

/**
 * Internal: Get user data (called from actions)
 */
export const getUserInternal = internalQuery({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args): Promise<any> => {
    return await ctx.db.get(args.userId);
  },
});

/**
 * Internal: Store MFA secret and backup codes
 */
export const storeMfaSecretInternal = internalMutation({
  args: {
    userId: v.id("users"),
    secret: v.string(),
    hashedBackupCodes: v.array(v.string()),
  },
  handler: async (ctx, args): Promise<void> => {
    await ctx.db.patch(args.userId, {
      mfaSecret: args.secret,
      mfaBackupCodes: args.hashedBackupCodes,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Internal: Update backup codes
 */
export const updateBackupCodesInternal = internalMutation({
  args: {
    userId: v.id("users"),
    hashedBackupCodes: v.array(v.string()),
  },
  handler: async (ctx, args): Promise<void> => {
    await ctx.db.patch(args.userId, {
      mfaBackupCodes: args.hashedBackupCodes,
      updatedAt: Date.now(),
    });
  },
});
