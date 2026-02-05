# Priority Fixes - Development Handoff
**My SDA Manager - Pre-Production Security & Compliance**
**Date:** 2026-02-06

---

## Backend Team - Critical Fixes (26 hours)

### 1. User Management Security 🔴 URGENT (1 hour)
**File:** `convex/auth.ts`
**Lines:** 272, 342, 19

**Problem:** Any authenticated user can escalate to admin or reset passwords.

**Fix:**
```typescript
// Line 272 - updateUser mutation
export const updateUser = mutation({
  args: {
    actingUserId: v.id("users"), // ADD THIS
    targetUserId: v.id("users"),
    role: v.optional(v.union(...)),
    // ... other args
  },
  handler: async (ctx, args) => {
    // ADD THIS CHECK:
    await requireAdmin(ctx, args.actingUserId);

    await ctx.db.patch(args.targetUserId, filteredUpdates);

    // ADD AUDIT LOG:
    await ctx.runMutation(internal.auditLog.log, {
      userId: args.actingUserId,
      action: "update",
      entityType: "user",
      entityId: args.targetUserId,
      changes: JSON.stringify(filteredUpdates),
    });
  },
});

// Line 342 - resetPassword action
export const resetPassword = action({
  args: {
    actingUserId: v.id("users"), // ADD THIS
    targetUserId: v.id("users"),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    // ADD THIS CHECK:
    await ctx.runMutation(internal.auth.verifyAdminInternal, {
      userId: args.actingUserId
    });

    const newHash = await hashPassword(args.newPassword);
    await ctx.runMutation(internal.auth.updatePasswordHash, {
      userId: args.targetUserId,
      passwordHash: newHash,
    });

    // ADD AUDIT LOG
  },
});

// Line 19 - createUser action
export const createUser = action({
  args: {
    actingUserId: v.id("users"), // ADD THIS
    // ... other args
  },
  handler: async (ctx, args) => {
    // ADD THIS CHECK:
    await ctx.runMutation(internal.auth.verifyAdminInternal, {
      userId: args.actingUserId
    });

    const passwordHash = await hashPassword(args.password);
    // ... rest of logic
  },
});

// ADD THIS HELPER:
export const verifyAdminInternal = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user || user.role !== "admin") {
      throw new Error("Admin access required");
    }
  },
});
```

**Frontend Changes Needed:** Update all calls to these functions to include `actingUserId`.

**Test:** Try escalating staff user to admin - should fail with "Admin access required"

---

### 2. Audit Logging - Participant Plans 🔴 URGENT (2 hours)
**File:** `convex/participantPlans.ts`

**Problem:** Funding changes not logged (NDIS compliance violation).

**Fix:** Add audit logging to `create` and `update` functions:

```typescript
// After create
await ctx.runMutation(internal.auditLog.log, {
  userId: args.userId,
  userEmail: user.email,
  userName: getUserFullName(user),
  action: "create",
  entityType: "participantPlan",
  entityId: planId,
  entityName: `Plan for ${participant.firstName} ${participant.lastName}`,
});

// After update (capture previous values)
const previousValues = {
  fundingAmount: plan.fundingAmount,
  startDate: plan.startDate,
  endDate: plan.endDate,
};

await ctx.runMutation(internal.auditLog.log, {
  userId: args.userId,
  action: "update",
  entityType: "participantPlan",
  entityId: args.planId,
  changes: JSON.stringify(filteredUpdates),
  previousValues: JSON.stringify(previousValues),
});
```

**Test:** Update participant plan funding → Check audit log has entry with previous amount

---

### 3. Audit Logging - Incidents 🔴 URGENT (2 hours)
**File:** `convex/incidents.ts`
**Lines:** update, markNdisNotified, resolve functions

**Problem:** Cannot prove when NDIS was notified.

**Fix:** Add audit logging to all incident modification functions:

```typescript
// In update function
await ctx.runMutation(internal.auditLog.log, {
  userId: args.userId,
  action: "update",
  entityType: "incident",
  entityId: args.incidentId,
  changes: JSON.stringify(filteredUpdates),
  previousValues: JSON.stringify({
    status: incident.status,
    description: incident.description,
  }),
});

// In markNdisNotified
await ctx.runMutation(internal.auditLog.log, {
  userId: args.userId,
  action: "update",
  entityType: "incident",
  entityId: args.incidentId,
  entityName: "NDIS_NOTIFIED",
  changes: JSON.stringify({ ndisNotifiedAt: new Date().toISOString() }),
});
```

**Test:** Mark incident as NDIS notified → Audit log shows timestamp

---

### 4. Immutable Audit Logs 🔴 URGENT (8 hours)
**File:** `convex/auditLog.ts`

**Problem:** Audit logs can be deleted, violating 7-year retention.

**Fix:** Implement multiple layers:

```typescript
// 1. Add deletion prevention
export const remove = mutation({
  args: { auditLogId: v.id("auditLogs") },
  handler: async (ctx, args) => {
    throw new Error("Audit logs cannot be deleted. Contact system administrator for archival.");
  },
});

// 2. Add hash chain integrity
export const log = internalMutation({
  args: { /* ... */ },
  handler: async (ctx, args) => {
    // Get previous log entry
    const previousLog = await ctx.db
      .query("auditLogs")
      .withIndex("by_timestamp")
      .order("desc")
      .first();

    // Calculate hash of previous entry
    const previousHash = previousLog
      ? await hashLogEntry(previousLog)
      : "GENESIS";

    // Create new entry with hash chain
    const logId = await ctx.db.insert("auditLogs", {
      ...args,
      previousHash,
      integrity: await hashLogEntry({ ...args, previousHash }),
    });

    return logId;
  },
});

// 3. Add integrity verification cron
crons.daily("verify-audit-integrity", { hourUTC: 2, minuteUTC: 0 },
  internal.auditLog.verifyIntegrity
);

export const verifyIntegrity = internalMutation({
  handler: async (ctx) => {
    const logs = await ctx.db.query("auditLogs").collect();

    for (let i = 1; i < logs.length; i++) {
      const currentHash = await hashLogEntry(logs[i-1]);
      if (currentHash !== logs[i].previousHash) {
        // ALERT: Audit trail tampered!
        await ctx.runMutation(internal.notifications.alertAdmin, {
          subject: "SECURITY ALERT: Audit Trail Tampering Detected",
          message: `Audit log integrity breach detected at entry ${logs[i]._id}`,
        });
      }
    }
  },
});

// Helper function
async function hashLogEntry(entry: any): Promise<string> {
  const data = JSON.stringify({
    userId: entry.userId,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    timestamp: entry._creationTime,
  });

  // Use Web Crypto API for SHA-256
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
```

**Schema Changes:**
```typescript
// Add to auditLogs table in schema.ts
auditLogs: defineTable({
  // ... existing fields
  previousHash: v.optional(v.string()), // Hash of previous log entry
  integrity: v.optional(v.string()),    // Hash of current entry
}),
```

**Test:** Try to delete audit log → Should fail. Modify old log entry → Integrity cron should alert.

---

### 5. Error Handling - Incidents 🔴 URGENT (2 hours)
**File:** `convex/incidents.ts`

**Problem:** No error handling - incident data can be lost on DB failure.

**Fix:**

```typescript
export const create = mutation({
  args: { /* ... */ },
  handler: async (ctx, args) => {
    try {
      // Existing creation logic
      const incidentId = await ctx.db.insert("incidents", baseData);

      // Audit logging
      await ctx.runMutation(internal.auditLog.log, { /* ... */ });

      // Email notification
      if (baseData.severity === "major") {
        await ctx.scheduler.runAfter(0, internal.notifications.sendIncidentAlert, {
          incidentId,
          notificationType: "24_hour_alert",
        });
      }

      return incidentId;

    } catch (error) {
      // Fallback: Email incident details to admin
      await ctx.scheduler.runAfter(0, internal.notifications.sendIncidentFailureEmail, {
        incidentData: {
          participantId: args.participantId,
          title: args.title,
          description: args.description,
          severity: args.severity,
          occurredAt: args.occurredAt,
        },
        error: error.message,
      });

      throw new Error(`Failed to create incident: ${error.message}. Admin has been notified via email.`);
    }
  },
});
```

**New Internal Mutation:**
```typescript
// convex/notifications.ts
export const sendIncidentFailureEmail = internalMutation({
  args: {
    incidentData: v.object({ /* ... */ }),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    await sendEmailWithRetry({
      to: "khen@betterlivingsolutions.com.au",
      subject: "URGENT: Incident Report System Failure",
      html: `
        <h1>Incident could not be saved to database</h1>
        <p>Error: ${args.error}</p>
        <h2>Incident Details:</h2>
        <pre>${JSON.stringify(args.incidentData, null, 2)}</pre>
        <p>Please manually create this incident record.</p>
      `,
    });
  },
});
```

**Test:** Simulate DB failure → Admin receives email with incident details

---

### 6. Payment Validation 🔴 URGENT (3 hours)
**File:** `convex/payments.ts`

**Problem:** No validation - negative payments, duplicates, invalid amounts possible.

**Fix:**

```typescript
import { z } from "zod";

// Add validation schema
const PaymentSchema = z.object({
  participantId: z.string().uuid(),
  dwellingId: z.string().uuid(),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  expectedAmount: z.number().positive().max(100000),
  actualAmount: z.number().positive().max(100000),
  paymentType: z.enum(["sda_funding", "rrc", "other"]),
});

export const create = mutation({
  args: {
    userId: v.id("users"),
    participantId: v.id("participants"),
    // ... other args
  },
  handler: async (ctx, args) => {
    // 1. Validate input
    try {
      PaymentSchema.parse(args);
    } catch (e) {
      throw new Error(`Validation failed: ${e.errors.map(err => err.message).join(', ')}`);
    }

    // 2. Check for duplicates
    const existingPayment = await ctx.db
      .query("payments")
      .withIndex("by_participant_date", q =>
        q.eq("participantId", args.participantId)
         .eq("paymentDate", args.paymentDate)
      )
      .first();

    if (existingPayment) {
      throw new Error(`Payment already exists for ${args.paymentDate}`);
    }

    // 3. Verify plan is active
    const plan = await ctx.db
      .query("participantPlans")
      .withIndex("by_participant", q => q.eq("participantId", args.participantId))
      .filter(q =>
        q.and(
          q.lte(q.field("startDate"), args.paymentDate),
          q.gte(q.field("endDate"), args.paymentDate)
        )
      )
      .first();

    if (!plan) {
      throw new Error(`No active plan for payment date ${args.paymentDate}`);
    }

    // 4. Calculate variance
    const variance = args.actualAmount - args.expectedAmount;

    // 5. Alert on large variance
    if (Math.abs(variance) > 500) {
      await ctx.scheduler.runAfter(0, internal.notifications.sendVarianceAlert, {
        participantId: args.participantId,
        paymentDate: args.paymentDate,
        expectedAmount: args.expectedAmount,
        actualAmount: args.actualAmount,
        variance,
      });
    }

    // 6. Create payment
    const paymentId = await ctx.db.insert("payments", {
      ...args,
      variance,
      status: "received",
    });

    // 7. Audit log
    await ctx.runMutation(internal.auditLog.log, { /* ... */ });

    return paymentId;
  },
});
```

**Install zod:** `npm install zod`

**Test:**
- Create payment with negative amount → Should fail
- Create duplicate payment for same date → Should fail
- Create payment when plan expired → Should fail
- Create payment with $1000 variance → Admin receives alert email

---

### 7. Server-Side Sessions 🔴 URGENT (8 hours)
**File:** `convex/auth.ts`

**Problem:** localStorage auth = complete lockout if user clears browser.

**Fix:** Implement session tokens stored in database:

```typescript
// Add to schema.ts
sessions: defineTable({
  userId: v.id("users"),
  token: v.string(),
  expiresAt: v.number(),
  refreshToken: v.string(),
  ipAddress: v.optional(v.string()),
  userAgent: v.optional(v.string()),
}).index("by_token", ["token"])
  .index("by_userId", ["userId"])
  .index("by_refreshToken", ["refreshToken"]),

// New login flow
export const loginWithSession = action({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify credentials
    const user = await ctx.runQuery(internal.auth.getUserByEmail, {
      email: args.email,
    });

    if (!user) throw new Error("Invalid credentials");

    const passwordValid = await verifyPassword(args.password, user.passwordHash);
    if (!passwordValid) throw new Error("Invalid credentials");

    // Generate tokens
    const token = crypto.randomUUID();
    const refreshToken = crypto.randomUUID();
    const expiresAt = Date.now() + (24 * 60 * 60 * 1000); // 24 hours

    // Store session
    const sessionId = await ctx.runMutation(internal.auth.createSession, {
      userId: user._id,
      token,
      refreshToken,
      expiresAt,
    });

    // Audit log
    await ctx.runMutation(internal.auditLog.log, {
      userId: user._id,
      userEmail: user.email,
      userName: getUserFullName(user),
      action: "login",
      entityType: "system",
    });

    return {
      user: {
        _id: user._id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      token,
      refreshToken,
      expiresAt,
    };
  },
});

// Session validation
export const validateSession = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", q => q.eq("token", args.token))
      .first();

    if (!session) return null;

    if (session.expiresAt < Date.now()) {
      // Session expired
      await ctx.db.delete(session._id);
      return null;
    }

    const user = await ctx.db.get(session.userId);
    return user;
  },
});

// Refresh token
export const refreshSession = action({
  args: { refreshToken: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.runQuery(internal.auth.getSessionByRefreshToken, {
      refreshToken: args.refreshToken,
    });

    if (!session) throw new Error("Invalid refresh token");

    // Generate new tokens
    const newToken = crypto.randomUUID();
    const newRefreshToken = crypto.randomUUID();
    const expiresAt = Date.now() + (24 * 60 * 60 * 1000);

    // Update session
    await ctx.runMutation(internal.auth.updateSession, {
      sessionId: session._id,
      token: newToken,
      refreshToken: newRefreshToken,
      expiresAt,
    });

    return { token: newToken, refreshToken: newRefreshToken, expiresAt };
  },
});
```

**Frontend Changes:** Replace localStorage with token storage + refresh logic.

**Test:** Login → Clear localStorage → Page refresh → Should still be authenticated

---

### 8. Fix SIL Provider Role Type 🔴 URGENT (5 minutes)
**File:** `convex/authHelpers.ts`
**Line:** 5

**Problem:** `sil_provider` role exists in schema but not in authHelpers type.

**Fix:**
```typescript
// Line 5 - Add sil_provider
export type UserRole =
  | "admin"
  | "property_manager"
  | "staff"
  | "accountant"
  | "sil_provider"; // ADD THIS
```

**Test:** TypeScript compilation should pass without errors

---

## Frontend Team - Critical Fixes (12 hours)

### 1. Update Auth Function Calls (4 hours)

**Files to Update:** All pages that call user management functions

**Changes:**
```typescript
// Old
await updateUser({
  userId: user._id,
  role: "admin",
});

// New
await updateUser({
  actingUserId: currentUser._id,  // ADD THIS
  targetUserId: user._id,
  role: "admin",
});
```

**Files Affected:**
- `src/app/settings/page.tsx`
- Any other pages that call createUser, updateUser, or resetPassword

---

### 2. Session-Based Auth (6 hours)

**Files to Update:** All 60+ pages using localStorage auth

**Changes:**
```typescript
// Old localStorage pattern
const storedUser = localStorage.getItem("sda_user");
if (!storedUser) {
  router.push("/login");
  return;
}
const user = JSON.parse(storedUser);

// New session pattern
import { useSession } from "@/hooks/useSession";

const { user, loading } = useSession();

if (loading) return <LoadingScreen />;
if (!user) {
  router.push("/login");
  return;
}
```

**Create New Hook:**
```typescript
// src/hooks/useSession.ts
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useEffect } from "react";

export function useSession() {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Get token from localStorage (or cookies)
    const storedToken = localStorage.getItem("session_token");
    setToken(storedToken);
  }, []);

  const user = useQuery(
    api.auth.validateSession,
    token ? { token } : "skip"
  );

  return {
    user,
    loading: user === undefined,
    token,
  };
}
```

**Update Login Page:**
```typescript
// src/app/login/page.tsx
const response = await loginWithSession({ email, password });

// Store tokens
localStorage.setItem("session_token", response.token);
localStorage.setItem("refresh_token", response.refreshToken);

// Remove old localStorage
localStorage.removeItem("sda_user");
```

---

### 3. Token Refresh Logic (2 hours)

**Create Refresh Handler:**
```typescript
// src/lib/auth.ts
export async function refreshAuthToken() {
  const refreshToken = localStorage.getItem("refresh_token");
  if (!refreshToken) return null;

  try {
    const response = await fetch("/api/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    });

    const data = await response.json();

    localStorage.setItem("session_token", data.token);
    localStorage.setItem("refresh_token", data.refreshToken);

    return data.token;
  } catch (error) {
    // Refresh failed - logout
    localStorage.removeItem("session_token");
    localStorage.removeItem("refresh_token");
    window.location.href = "/login";
  }
}

// Set up automatic refresh
setInterval(() => {
  refreshAuthToken();
}, 60 * 60 * 1000); // Every hour
```

---

## Testing Checklist

### Security Tests
- [ ] Staff user CANNOT escalate to admin
- [ ] Staff user CANNOT reset admin password
- [ ] Staff user CANNOT create new admin accounts
- [ ] Query endpoints require proper permissions

### Audit Log Tests
- [ ] Participant plan changes logged with previous values
- [ ] Incident NDIS notification logged with timestamp
- [ ] Audit logs CANNOT be deleted
- [ ] Hash chain integrity verification passes

### Reliability Tests
- [ ] Incident creation failure sends email to admin
- [ ] Negative payment amount rejected
- [ ] Duplicate payment for same date rejected
- [ ] Payment during expired plan rejected
- [ ] Large payment variance triggers alert email

### Auth Tests
- [ ] Login creates session token
- [ ] Session token validates correctly
- [ ] Expired session redirects to login
- [ ] Refresh token renews session
- [ ] Logout deletes session

---

## Deployment Steps

1. **Backend Updates** (Deploy First)
   - [ ] Update `convex/auth.ts` with admin checks
   - [ ] Update `convex/authHelpers.ts` with sil_provider
   - [ ] Update `convex/participantPlans.ts` with audit logging
   - [ ] Update `convex/incidents.ts` with audit logging + error handling
   - [ ] Update `convex/auditLog.ts` with immutability
   - [ ] Update `convex/payments.ts` with validation
   - [ ] Update `convex/schema.ts` with sessions table
   - [ ] Run `npx convex deploy`

2. **Frontend Updates** (Deploy After Backend)
   - [ ] Update all user management function calls
   - [ ] Implement session hook
   - [ ] Update login page
   - [ ] Update all pages to use session hook
   - [ ] Add token refresh logic
   - [ ] Test in staging
   - [ ] Deploy to production

3. **Verification** (Post-Deployment)
   - [ ] Run security tests
   - [ ] Verify audit logs working
   - [ ] Test session persistence
   - [ ] Monitor error rates
   - [ ] Check Sentry/logging for issues

---

## Support & Questions

**Backend Questions:** Review `RBAC_AUDIT_REPORT.md` and `SECURITY_AUDIT_REPORT.md`
**Frontend Questions:** Review `ACCESSIBILITY_AUDIT_2026-02-06.md`
**Architecture Questions:** Review `RELIABILITY_AUDIT_REPORT.md`

**Urgent Issues:** Tag @Lead Systems Auditor in dev chat

---

**Last Updated:** 2026-02-06
**Total Estimated Time:** 38 hours (Backend: 26h, Frontend: 12h)
**Priority:** 🔴 CRITICAL - Must complete before onboarding external providers
