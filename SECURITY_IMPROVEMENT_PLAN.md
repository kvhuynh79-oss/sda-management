# Security Improvement Plan - SDA Management System

## Current Security Assessment

### Critical Vulnerabilities

| Issue | Severity | Current State | Risk |
|-------|----------|---------------|------|
| Weak Password Hashing | **Critical** | Simple JS hash with static salt | Passwords easily crackable |
| No Server-Side Auth | **Critical** | Client-side localStorage only | API endpoints unprotected |
| No Row-Level Security | **High** | All queries return all data | Data leakage between users |
| No Audit Logging | **High** | No tracking of actions | No accountability/forensics |
| No Input Validation | **Medium** | Trust client-side data | Injection vulnerabilities |
| No Rate Limiting | **Medium** | Unlimited API calls | DoS vulnerability |

### Current Authentication Flow

```
1. User enters email/password on client
2. Client calls login mutation
3. Server returns user object with role
4. Client stores in localStorage as 'sda_user'
5. All subsequent requests trust this stored data
```

**Problems:**
- Anyone can modify localStorage to change their role
- API endpoints don't verify caller identity
- No session tokens or expiry
- Password hash is weak (simple JS hash)

---

## Phase 1: Audit Logging (Immediate Priority)

### 1.1 Create Audit Log Table

Add to `convex/schema.ts`:

```typescript
auditLogs: defineTable({
  userId: v.id("users"),
  userEmail: v.string(),
  action: v.string(), // "create", "update", "delete", "view", "login", "logout"
  entityType: v.string(), // "property", "participant", "payment", etc.
  entityId: v.optional(v.string()),
  entityName: v.optional(v.string()), // Human-readable name
  changes: v.optional(v.string()), // JSON string of before/after
  ipAddress: v.optional(v.string()),
  userAgent: v.optional(v.string()),
  timestamp: v.number(),
  metadata: v.optional(v.string()), // Additional context as JSON
})
  .index("by_userId", ["userId"])
  .index("by_action", ["action"])
  .index("by_entityType", ["entityType"])
  .index("by_timestamp", ["timestamp"])
  .index("by_entityType_entityId", ["entityType", "entityId"]),
```

### 1.2 Create Audit Logging Utility

Create `convex/auditLog.ts`:

```typescript
import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Internal function to log actions
export const log = internalMutation({
  args: {
    userId: v.id("users"),
    userEmail: v.string(),
    action: v.string(),
    entityType: v.string(),
    entityId: v.optional(v.string()),
    entityName: v.optional(v.string()),
    changes: v.optional(v.string()),
    metadata: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("auditLogs", {
      ...args,
      timestamp: Date.now(),
    });
  },
});

// Query audit logs (admin only)
export const getAuditLogs = query({
  args: {
    limit: v.optional(v.number()),
    entityType: v.optional(v.string()),
    userId: v.optional(v.id("users")),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("auditLogs").order("desc");

    if (args.entityType) {
      query = ctx.db.query("auditLogs")
        .withIndex("by_entityType", q => q.eq("entityType", args.entityType))
        .order("desc");
    }

    const logs = await query.take(args.limit || 100);

    // Filter by date if provided
    return logs.filter(log => {
      if (args.startDate && log.timestamp < args.startDate) return false;
      if (args.endDate && log.timestamp > args.endDate) return false;
      if (args.userId && log.userId !== args.userId) return false;
      return true;
    });
  },
});
```

### 1.3 Actions to Audit

| Entity | Create | Update | Delete | View |
|--------|--------|--------|--------|------|
| Properties | Yes | Yes | Yes | No |
| Participants | Yes | Yes | Yes | No |
| Payments | Yes | Yes | Yes | No |
| Maintenance | Yes | Yes | Yes | No |
| Documents | Yes | - | Yes | No |
| Users | Yes | Yes | Yes | No |
| Incidents | Yes | Yes | Yes | No |

### 1.4 Implementation Pattern

Before:
```typescript
export const createProperty = mutation({
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("properties", { ...args });
    return id;
  },
});
```

After:
```typescript
export const createProperty = mutation({
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("properties", { ...args });

    // Audit log
    await ctx.runMutation(internal.auditLog.log, {
      userId: args.userId,
      userEmail: args.userEmail,
      action: "create",
      entityType: "property",
      entityId: id,
      entityName: args.propertyName || args.addressLine1,
      metadata: JSON.stringify({ suburb: args.suburb, state: args.state }),
    });

    return id;
  },
});
```

---

## Phase 2: Row-Level Security

### 2.1 Security Model

For now, implement simple role-based access:

| Role | Properties | Participants | Payments | Maintenance | Reports | Admin |
|------|------------|--------------|----------|-------------|---------|-------|
| admin | Full | Full | Full | Full | Full | Full |
| property_manager | Full | Full | Full | Full | View | No |
| staff | View | View | No | Create/View | No | No |
| accountant | View | View | Full | View | Full | No |

### 2.2 Auth Helper Function

Create `convex/authHelpers.ts`:

```typescript
import { QueryCtx, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

type UserRole = "admin" | "property_manager" | "staff" | "accountant";

interface AuthenticatedUser {
  _id: Id<"users">;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
}

export async function requireAuth(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">
): Promise<AuthenticatedUser> {
  const user = await ctx.db.get(userId);

  if (!user) {
    throw new Error("User not found");
  }

  if (!user.isActive) {
    throw new Error("User account is disabled");
  }

  return user as AuthenticatedUser;
}

export async function requireRole(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  allowedRoles: UserRole[]
): Promise<AuthenticatedUser> {
  const user = await requireAuth(ctx, userId);

  if (!allowedRoles.includes(user.role)) {
    throw new Error(`Access denied. Required roles: ${allowedRoles.join(", ")}`);
  }

  return user;
}

export async function requireAdmin(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">
): Promise<AuthenticatedUser> {
  return requireRole(ctx, userId, ["admin"]);
}

export function canViewPayments(role: UserRole): boolean {
  return ["admin", "property_manager", "accountant"].includes(role);
}

export function canEditPayments(role: UserRole): boolean {
  return ["admin", "accountant"].includes(role);
}

export function canManageUsers(role: UserRole): boolean {
  return role === "admin";
}
```

### 2.3 Update Mutations with Auth Checks

Before:
```typescript
export const deleteProperty = mutation({
  args: { id: v.id("properties") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
```

After:
```typescript
export const deleteProperty = mutation({
  args: {
    id: v.id("properties"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Verify user has permission
    const user = await requireRole(ctx, args.userId, ["admin", "property_manager"]);

    // Get property for audit log
    const property = await ctx.db.get(args.id);

    // Delete
    await ctx.db.delete(args.id);

    // Audit log
    await ctx.runMutation(internal.auditLog.log, {
      userId: user._id,
      userEmail: user.email,
      action: "delete",
      entityType: "property",
      entityId: args.id,
      entityName: property?.propertyName || property?.addressLine1,
    });
  },
});
```

---

## Phase 3: Future Improvements

### 3.1 Proper Authentication (Clerk)

When ready to implement Clerk:

1. Install Clerk: `npm install @clerk/nextjs @clerk/clerk-react`
2. Configure Clerk with Convex: `npm install @clerk/clerk-sdk-node`
3. Replace localStorage auth with Clerk sessions
4. Use Clerk's built-in 2FA, SSO, session management

Benefits:
- Industry-standard authentication
- Built-in 2FA/MFA
- Social login (Google, Microsoft)
- Session management
- Audit trail of logins

### 3.2 Password Security (Immediate Improvement)

Replace weak hash with bcrypt on the server side:

```typescript
// Install: npm install bcryptjs
import bcrypt from "bcryptjs";

// Hash password
const hash = await bcrypt.hash(password, 12);

// Verify password
const isValid = await bcrypt.compare(password, hash);
```

### 3.3 Input Validation

Add Zod schemas for all inputs:

```typescript
import { z } from "zod";

const propertySchema = z.object({
  addressLine1: z.string().min(1).max(200),
  suburb: z.string().min(1).max(100),
  postcode: z.string().regex(/^\d{4}$/),
  state: z.enum(["NSW", "VIC", "QLD", "SA", "WA", "TAS", "NT", "ACT"]),
});
```

### 3.4 Rate Limiting

Implement at API gateway level or using Convex scheduled functions to track request counts.

---

## Implementation Checklist

### Phase 1: Audit Logging
- [ ] Add auditLogs table to schema
- [ ] Create auditLog.ts with logging functions
- [ ] Add audit logging to property mutations
- [ ] Add audit logging to participant mutations
- [ ] Add audit logging to payment mutations
- [ ] Add audit logging to maintenance mutations
- [ ] Add audit logging to document mutations
- [ ] Add audit logging to user/auth mutations
- [ ] Add audit logging to incident mutations
- [ ] Create audit log viewer page (admin only)

### Phase 2: Row-Level Security
- [ ] Create authHelpers.ts with role checking functions
- [ ] Update all mutations to require userId parameter
- [ ] Add role checks to sensitive mutations
- [ ] Update all queries to filter by user permissions
- [ ] Add error handling for unauthorized access

### Phase 3: Quick Wins
- [ ] Replace simple hash with bcrypt
- [ ] Add session expiry check on client
- [ ] Add input validation with Zod
- [ ] Implement logout functionality properly

---

## Security Testing Checklist

After implementation, verify:

- [ ] Cannot access admin pages without admin role
- [ ] Cannot delete records without proper role
- [ ] All mutations log to audit table
- [ ] Audit logs show correct user and action
- [ ] Role changes are logged
- [ ] Login/logout are logged
- [ ] Cannot access API without valid userId
- [ ] Cannot elevate own role
- [ ] Cannot modify other users (except admin)

---

**Document Version:** 1.0
**Last Updated:** 2026-02-03
**Author:** Security Review