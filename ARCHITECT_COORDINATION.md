# 🏗️ Architect Coordination Center
**Current Project:** MySDAManager v1.4.0 - CommunicationsLog Refactor
**Date Started:** 2026-02-07
**Architect:** Window 1 (This Window)
**Backend Team:** Window 2
**Frontend Team:** Window 3

---

## 📊 Overall Progress - CommunicationsLog Refactor

| Team | Phase | Tasks Assigned | Completed | In Progress | Status |
|------|-------|----------------|-----------|-------------|--------|
| **Backend** | Phase 1: Schema | 5 tasks | 0 | 0 | ⏳ READY TO START |
| **Frontend** | Phase 1: Planning | 0 tasks | 0 | 0 | ⏳ STANDBY |

**Total Estimated Time:** 120 hours over 6 weeks
**Current Phase:** Phase 1 - Database Schema & Migration

## 🎯 CURRENT MILESTONE: Deploy Schema Changes to Dev Environment

---

## 📋 CURRENT PROJECT TASKS - CommunicationsLog Refactor

### 🔴 BACKEND TEAM - Phase 1: Database Schema & Migration (Week 1)

#### Task 1.1: Update Communications Schema [⏳ READY TO START] - 3 hours
**Files:** `convex/schema.ts` (lines 1697-1813)
**Assigned To:** Backend Window 2
**Instructions:**
1. Add new fields to communications table:
   - complianceCategory (9 options: routine, incident_related, complaint, safeguarding, plan_review, access_request, quality_audit, advocacy, none)
   - complianceFlags (array: requires_documentation, time_sensitive, escalation_required, ndia_reportable, legal_hold)
   - Threading fields: threadId, parentCommunicationId, isThreadStarter, threadParticipants
   - Stakeholder linking: stakeholderEntityType, stakeholderEntityId
   - Consultation Gate: requiresFollowUp, followUpDueDate, followUpStatus, consultationOutcome
   - Participant involvement: isParticipantInvolved, participantConsentGiven
   - Multiple attachments: attachmentStorageIds (array), attachmentMetadata (array of objects)
2. Add new indexes:
   - by_thread: [threadId, timestamp]
   - by_participant_compliance: [participantId, complianceCategory, timestamp]
   - by_stakeholder: [stakeholderEntityType, stakeholderEntityId, timestamp]
   - by_follow_up: [requiresFollowUp, followUpDueDate]
3. Rename linkedParticipantId → participantId (make required)
4. Add linkedParticipantIds (optional array) for multi-participant communications
5. Deploy schema to dev environment using `npx convex dev`

**Deliverables:**
- [ ] Modified `convex/schema.ts` with all new fields
- [ ] All new indexes added
- [ ] Schema deployed to dev (not production yet!)
- [ ] Test: Create sample communication with new fields

**Report back when:** COMPLETED

---

#### Task 1.2: Create threadSummaries Table [⏳ READY TO START] - 1 hour
**Files:** `convex/schema.ts`
**Assigned To:** Backend Window 2
**Instructions:**
1. Create new table `threadSummaries` with fields:
   - threadId, participantId, startedAt, lastActivityAt
   - messageCount, participantNames, subject, previewText
   - hasUnread, complianceCategories, requiresAction
2. Add indexes:
   - by_participant_activity: [participantId, lastActivityAt]
   - by_thread: [threadId]
3. Deploy schema change

**Deliverables:**
- [ ] New `threadSummaries` table in schema
- [ ] Indexes added
- [ ] Schema deployed to dev

**Report back when:** COMPLETED

---

#### Task 1.3: Create Migration Script [⏳ READY TO START] - 4 hours
**Files:** `convex/migrations/communications_v2.ts` (NEW)
**Assigned To:** Backend Window 2
**Instructions:**
1. Create new file `convex/migrations/communications_v2.ts`
2. Implement `migrateToV2` internal mutation with:
   - Batch processing (100 records at a time)
   - Field mapping: linkedParticipantId → participantId
   - Infer complianceCategory from keywords in subject/summary
   - Infer stakeholderEntityType from existing contactType
   - Set defaults: isParticipantInvolved: true, requiresFollowUp: false, threadId: comm._id
   - Convert single attachmentStorageId to array attachmentStorageIds
   - Add migrated_v2 flag for tracking
3. Include helper functions: inferComplianceCategory, inferStakeholderType
4. Add audit logging for migration

**Deliverables:**
- [ ] New migration file created
- [ ] Migration logic implemented with rollback support
- [ ] Test migration on 10 sample records in dev

**Report back when:** COMPLETED

---

#### Task 1.4: Backup Communications Data [⏳ READY TO START] - 30 minutes
**Files:** Command line / Convex dashboard
**Assigned To:** Backend Window 2
**Instructions:**
1. Export existing communications table from dev environment
2. Save backup JSON file to project root: `communications_backup_2026-02-07.json`
3. Document backup location in migration script comments

**Deliverables:**
- [ ] Backup file created
- [ ] Backup location documented

**Report back when:** COMPLETED

---

#### Task 1.5: Test Migration & Rollback [⏳ READY TO START] - 2 hours
**Files:** `convex/migrations/communications_v2.ts`
**Assigned To:** Backend Window 2
**Dependencies:** ⚠️ WAIT for Tasks 1.1, 1.2, 1.3, 1.4 to complete
**Instructions:**
1. Run migration on dev environment (100 records max)
2. Verify all fields populated correctly
3. Check audit log for migration entries
4. Test rollback: restore from backup if needed
5. Document migration results

**Deliverables:**
- [ ] Migration tested successfully
- [ ] All data preserved with new fields
- [ ] Rollback procedure tested
- [ ] Migration report written

**Report back when:** COMPLETED

---

### 🎨 FRONTEND TEAM - Phase 1: Planning & Research (Week 1)

#### Task F1.1: Review Existing Components [⏳ STANDBY] - 1 hour
**Files:** `src/components/ui/CommunicationCard.tsx`, `src/app/follow-ups/`
**Assigned To:** Frontend Window 3
**Dependencies:** ⚠️ STANDBY until Backend completes schema migration
**Instructions:**
1. Read and understand current CommunicationCard component
2. Read follow-ups page implementation
3. Identify reusable patterns (badges, loading states, filters)
4. Document component structure for refactor

**Deliverables:**
- [ ] Component analysis notes
- [ ] List of reusable patterns
- [ ] Recommendations for Phase 4

**Report back when:** COMPLETED

---

## 📅 Execution Timeline

**Week 1 (Current):** Backend Phase 1 - Database schema changes
**Week 2:** Backend Phase 2 & 3 - Threading engine + Consultation Gate
**Week 3:** Frontend Phase 4 - Multi-view interface
**Week 4:** Frontend Phase 5 - Enhanced components
**Week 5:** Backend + Frontend Phase 6 - Bulk operations & performance
**Week 6:** Testing Phase 7 - Accessibility & QA

---

## 🏆 PREVIOUS PROJECT: Security Hardening - ✅ COMPLETE

| Team | Tasks | Completed | Status |
|------|-------|-----------|--------|
| **Backend** | 10 tasks | 10 | ✅ **ALL DONE** |
| **Frontend** | 5 tasks | 5 | ✅ **ALL DONE** |

**Completed:** 2026-02-06 (MFA Implementation)

---

## 📝 Completion Log

### 2026-02-06 Session 1

| Time | Task | Status | Notes |
|------|------|--------|-------|
| ✅ | Task 1.2: SIL Provider Role | COMPLETED | Added to UserRole type + permissions |
| ✅ | Task 1.1: User Management Security | COMPLETED | Added admin checks to createUser, updateUser, resetPassword |
| ✅ | Task 1.4: Audit - Participant Plans | COMPLETED | Added audit logging with previousValues |
| ✅ | Task 1.5: Audit - Incidents | COMPLETED | Added NDIS notification timestamp logging |
| ✅ | Task 1.3: Frontend Auth Updates | COMPLETED | Verified auth function calls updated (W3) |
| ✅ | Task 1.6: Audit - Claims/Docs | COMPLETED | Added audit logging (W2) |
| ✅ | Task 1.7: Error Handling - Incidents | COMPLETED | Added try-catch + failure email (W2) |
| ✅ | Task 1.8: Payment Validation | COMPLETED | Zod validation + duplicate check (W2) |
| ✅ | Task 4.2: Color Contrast & Headings | COMPLETED | Fixed text-gray-500, autocomplete attrs (W3) |

### 🎉 SESSION 1 COMPLETE - All Critical Fixes Done!

### 2026-02-06 Session 2

| Time | Task | Status | Notes |
|------|------|--------|-------|
| ✅ | Task 1.9: Immutable Audit Logs | COMPLETED | Hash chain + deletion prevention (W2) |
| ✅ | Task 4.1: Modal Accessibility | COMPLETED | Added role, aria-modal, focus trap (W3) |
| ✅ | Task 2.1: Server-Side Sessions | COMPLETED | Sessions table, login/validate/refresh (W2) |
| ✅ | Verification & Testing | COMPLETED | Build passes, audit logs working (W3) |
| ✅ | Task 2.2: Frontend Sessions | COMPLETED | useSession hook, login integration (W3) |

### 🏆 SESSION 2 COMPLETE - All Security Hardening Done!

### 2026-02-06 Deployment

| Time | Task | Status | Notes |
|------|------|--------|-------|
| ✅ | Git Commit | COMPLETED | All changes committed |
| ✅ | Git Push | COMPLETED | Pushed to main |
| ✅ | Convex Deploy | COMPLETED | Backend deployed to production |

### 🚀 DEPLOYED TO PRODUCTION!

### 2026-02-06 Session 3 - Bug Fixes & Performance

| Time | Task | Status | Notes |
|------|------|--------|-------|
| ✅ | Admin Route Protection | COMPLETED | Added RequireAuth to /admin/audit (W3) |
| ✅ | Login Fix | COMPLETED | Added backward compat for sda_user localStorage (W3) |
| ✅ | Properties Index | COMPLETED | Added by_isActive index + withIndex query (W2) |
| ✅ | Dwellings Index | COMPLETED | Added withIndex to dwellings query (W2) |
| ✅ | Bulk isActive Fixes | COMPLETED | 30+ queries optimized (W2) |

### 🎉 SESSION 3 COMPLETE!

### 2026-02-06 Session 4 - MFA Implementation

| Time | Task | Status | Notes |
|------|------|--------|-------|
| ✅ | MFA Backend | COMPLETED | TOTP-based auth with backup codes (W2+W3) |
| ✅ | MFA Frontend | COMPLETED | Settings security page, login flow (W2+W3) |
| ✅ | Query Permission Fixes | COMPLETED | 15+ pages fixed with userId params (W1) |
| ✅ | TypeScript Build Fixes | COMPLETED | All errors resolved, build passes (W1) |
| ✅ | offlineQueue Fix | COMPLETED | IndexedDB query fix (W1) |

### 🏆 SESSION 4 COMPLETE - MFA Ready for Deployment!

---

## 📊 Current Task Status

| Window | Current Task | Status |
|--------|-------------|--------|
| W1 | Architect/Coordinator | Active |
| W2 | Available - Ready for Deployment | Standby |
| W3 | Available - Ready for Testing | Standby |

---

## 🔴 BACKEND TEAM - Critical Fixes (26 hours)

### ✅ Status Legend
- ⏳ Not Started
- 🔄 In Progress
- ✅ Completed
- ❌ Blocked

### Task 1: User Management Security [⏳ NOT STARTED] - 1 hour
**File:** `convex/auth.ts` (lines 272, 342, 19)
**Problem:** Privilege escalation vulnerability - any user can become admin
**Assigned To:** Backend Window 2
**Instructions:**
1. Add `actingUserId` parameter to `updateUser`, `resetPassword`, `createUser`
2. Add `requireAdmin` check at start of each function
3. Create `verifyAdminInternal` helper mutation
4. Add audit logging to each function
5. Test: Try escalating staff user to admin (should fail)

**Deliverables:**
- [ ] Modified `convex/auth.ts` with admin checks
- [ ] Test result: Staff user CANNOT escalate to admin
- [ ] Test result: Staff user CANNOT reset passwords
- [ ] Test result: Staff user CANNOT create admin accounts

**Report back when:** COMPLETED ✅

---

### Task 2: Audit Logging - Participant Plans [⏳ NOT STARTED] - 2 hours
**File:** `convex/participantPlans.ts`
**Problem:** Funding changes not logged (NDIS compliance violation)
**Assigned To:** Backend Window 2
**Instructions:**
1. Add audit logging to `create` function
2. Add audit logging to `update` function (capture previous values)
3. Test: Update participant plan funding → Check audit log has entry

**Deliverables:**
- [ ] Modified `convex/participantPlans.ts` with audit logging
- [ ] Test result: Plan changes appear in audit log with previous values

**Report back when:** COMPLETED ✅

---

### Task 3: Audit Logging - Incidents [⏳ NOT STARTED] - 2 hours
**File:** `convex/incidents.ts`
**Problem:** Cannot prove when NDIS was notified
**Assigned To:** Backend Window 2
**Instructions:**
1. Add audit logging to `update` function
2. Add audit logging to `markNdisNotified` function
3. Add audit logging to `resolve` function
4. Test: Mark incident as NDIS notified → Check audit log shows timestamp

**Deliverables:**
- [ ] Modified `convex/incidents.ts` with audit logging
- [ ] Test result: NDIS notification timestamp logged

**Report back when:** COMPLETED ✅

---

### Task 4: Immutable Audit Logs [⏳ NOT STARTED] - 8 hours
**File:** `convex/auditLog.ts` + `convex/schema.ts`
**Problem:** Audit logs can be deleted (7-year retention violation)
**Assigned To:** Backend Window 2
**Instructions:**
1. Add deletion prevention to `remove` function
2. Implement hash chain integrity in `log` function
3. Add `previousHash` and `integrity` fields to schema
4. Create `hashLogEntry` helper function using SHA-256
5. Add integrity verification cron (daily at 2am)
6. Test: Try to delete audit log (should fail)
7. Test: Modify old log entry → Integrity cron should alert

**Deliverables:**
- [ ] Modified `convex/auditLog.ts` with immutability
- [ ] Modified `convex/schema.ts` with hash fields
- [ ] Test result: Cannot delete audit logs
- [ ] Test result: Integrity verification works

**Report back when:** COMPLETED ✅

---

### Task 5: Error Handling - Incidents [⏳ NOT STARTED] - 2 hours
**File:** `convex/incidents.ts` + `convex/notifications.ts`
**Problem:** No error handling - incident data can be lost
**Assigned To:** Backend Window 2
**Instructions:**
1. Wrap `create` function in try-catch
2. Create `sendIncidentFailureEmail` in `convex/notifications.ts`
3. On error: Email incident details to admin
4. Test: Simulate DB failure → Admin receives email

**Deliverables:**
- [ ] Modified `convex/incidents.ts` with error handling
- [ ] New function in `convex/notifications.ts`
- [ ] Test result: Failure email sent to admin

**Report back when:** COMPLETED ✅

---

### Task 6: Payment Validation [⏳ NOT STARTED] - 3 hours
**File:** `convex/payments.ts`
**Problem:** No validation - negative payments, duplicates possible
**Assigned To:** Backend Window 2
**Instructions:**
1. Install zod: `npm install zod`
2. Create PaymentSchema validation
3. Add duplicate check (by participant + date)
4. Add plan expiry validation
5. Add variance calculation with alert (>$500)
6. Test: Create payment with negative amount (should fail)
7. Test: Create duplicate payment (should fail)
8. Test: Create payment with expired plan (should fail)
9. Test: Create payment with $1000 variance (admin receives email)

**Deliverables:**
- [ ] Modified `convex/payments.ts` with validation
- [ ] Zod installed
- [ ] Test results: All validation rules work

**Report back when:** COMPLETED ✅

---

### Task 7: Server-Side Sessions [⏳ NOT STARTED] - 8 hours
**File:** `convex/auth.ts` + `convex/schema.ts`
**Problem:** localStorage auth = lockout if user clears browser
**Assigned To:** Backend Window 2
**Instructions:**
1. Add `sessions` table to `convex/schema.ts`
2. Create `loginWithSession` action
3. Create `validateSession` query
4. Create `refreshSession` action
5. Create internal mutations for session management
6. Test: Login → Clear localStorage → Refresh page (should stay authenticated)

**Deliverables:**
- [ ] Modified `convex/schema.ts` with sessions table
- [ ] Modified `convex/auth.ts` with session functions
- [ ] Test result: Session persists after localStorage clear

**Report back when:** COMPLETED ✅

---

### Task 8: Fix SIL Provider Role Type [⏳ NOT STARTED] - 5 minutes
**File:** `convex/authHelpers.ts` (line 5)
**Problem:** `sil_provider` role missing from type definition
**Assigned To:** Backend Window 2
**Instructions:**
1. Add `"sil_provider"` to UserRole type union
2. Run `npm run build` to verify TypeScript compiles

**Deliverables:**
- [ ] Modified `convex/authHelpers.ts` line 5
- [ ] TypeScript compilation passes

**Report back when:** COMPLETED ✅

---

## 🎨 FRONTEND TEAM - Critical Fixes (12 hours)

### Task 1: Update Auth Function Calls [⏳ NOT STARTED] - 4 hours
**Files:** `src/app/settings/page.tsx` + other pages using auth
**Problem:** Function calls need `actingUserId` parameter
**Assigned To:** Frontend Window 3
**Dependencies:** ⚠️ WAIT for Backend Task 1 to complete first
**Instructions:**
1. Update all calls to `updateUser` to include `actingUserId`
2. Update all calls to `createUser` to include `actingUserId`
3. Update all calls to `resetPassword` to include `actingUserId`
4. Test: Verify all auth operations work

**Deliverables:**
- [ ] Modified `src/app/settings/page.tsx`
- [ ] Modified any other pages calling user management functions
- [ ] Test result: Auth operations work

**Report back when:** COMPLETED ✅

---

### Task 2: Session-Based Auth [⏳ NOT STARTED] - 6 hours
**Files:** All 60+ pages using localStorage
**Problem:** Need to replace localStorage with session tokens
**Assigned To:** Frontend Window 3
**Dependencies:** ⚠️ WAIT for Backend Task 7 to complete first
**Instructions:**
1. Create `src/hooks/useSession.ts` hook
2. Update `src/app/login/page.tsx` to use `loginWithSession`
3. Replace localStorage auth pattern in all pages with `useSession` hook
4. Test: Login → Clear localStorage → Refresh (should stay logged in)

**Deliverables:**
- [ ] New file: `src/hooks/useSession.ts`
- [ ] Modified `src/app/login/page.tsx`
- [ ] All pages updated to use session hook
- [ ] Test result: Session persists after localStorage clear

**Report back when:** COMPLETED ✅

---

### Task 3: Token Refresh Logic [⏳ NOT STARTED] - 2 hours
**Files:** New `src/lib/auth.ts`
**Problem:** Need automatic token refresh
**Assigned To:** Frontend Window 3
**Dependencies:** ⚠️ WAIT for Backend Task 7 to complete first
**Instructions:**
1. Create `src/lib/auth.ts` with `refreshAuthToken` function
2. Set up automatic refresh interval (every hour)
3. Test: Wait for token expiry → Should auto-refresh

**Deliverables:**
- [ ] New file: `src/lib/auth.ts`
- [ ] Automatic refresh working
- [ ] Test result: Token auto-refreshes

**Report back when:** COMPLETED ✅

---

## 📝 Completion Log

_Tasks will be logged here as they're completed_

---

## 🚨 Blockers & Issues

_Report any blockers here_

---

## 💬 Communication Protocol

### Reporting Completion
When a task is COMPLETED, report back with:
```
TASK COMPLETED: [Task Name]
Files Modified: [List files]
Tests Passed: [List test results]
Ready For: [Next dependent task, if any]
```

### Reporting Issues
When BLOCKED, report with:
```
TASK BLOCKED: [Task Name]
Issue: [Description]
Needs: [What's needed to unblock]
```

---

**Last Updated:** 2026-02-06 (Initial setup)
