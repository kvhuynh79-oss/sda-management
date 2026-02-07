# MySDAManager Production Deployment Plan

**Version:** v1.3.2 -> v1.4.0
**Date Created:** 2026-02-07
**Estimated Downtime:** 5-15 minutes (Convex schema push)
**Risk Level:** MEDIUM-HIGH (schema changes, encryption migration, new tables)

---

## Deployment Overview

### What is being deployed
- 77 tasks of new functionality across 20+ modified files and 8 new files
- CommunicationsLog Refactor (threading, consultation gate, multi-view UI, bulk ops)
- MFA authentication (TOTP-based with backup codes and rate limiting)
- Field-level encryption (AES-256-GCM for NDIS, DOB, bank accounts)
- Inspection PDF report generation
- Frontend refactoring (4 pages: payments, inspections, operations, compliance)
- MFA hardening (rate limiting, audit logging)
- New badge components and color constants

### Architecture
- **Frontend:** Next.js 16 on Vercel (auto-deploys on push to main)
- **Backend:** Convex Cloud (manual deploy via `npx convex deploy`)
- **DEV deployment:** `original-turtle-8` (all changes deployed and tested)
- **PROD deployment:** `accomplished-hornet-117` (current production)

### Key Risk Areas
1. Schema changes add new tables and fields (backward compatible due to `v.optional`)
2. New indexes (Convex handles these non-destructively)
3. Encryption migration must be run AFTER env vars are set
4. MFA adds fields to users table (all optional, no breaking change)
5. Communications table has 20+ new optional fields and 4 new indexes

---

## Pre-Deployment Checklist

### 1. Code Verification (Do This First)

- [ ] **1.1** Run local build to confirm TypeScript compiles cleanly:
  ```bash
  cd c:\Projects\sda-management
  npm run build
  ```
  Expected: Build succeeds with 72+ pages generated, zero TypeScript errors.

- [ ] **1.2** Verify all files are committed. Current uncommitted changes:
  ```
  Modified (20 files):
    convex/_generated/api.d.ts, convex/auditLog.ts, convex/communications.ts,
    convex/incidents.ts, convex/mfa.ts, convex/owners.ts, convex/participants.ts,
    convex/schema.ts, convex/tasks.ts, src/app/compliance/page.tsx,
    src/app/follow-ups/communications/new/page.tsx, src/app/inspections/page.tsx,
    src/app/login/page.tsx, src/app/operations/page.tsx, src/app/payments/page.tsx,
    src/app/settings/security/page.tsx, src/components/Header.tsx,
    src/components/MfaSetup.tsx, src/components/ui/Badge.tsx, src/constants/colors.ts

  New files (untracked):
    convex/lib/ (encryption.ts, threadingEngine.ts, consultationGate.ts)
    convex/migrations/ (encryptExistingData.ts)
    src/app/communications/ (new multi-view page)
    src/components/communications/ (new components)
    src/hooks/useBulkSelection.ts
    MFA_SECURITY_TEST_REPORT.md
  ```
  ```bash
  git add -A
  git status
  # Review carefully - ensure no .env files or secrets are staged
  git commit -m "v1.4.0: CommunicationsLog refactor, MFA, encryption, PDF reports"
  ```

- [ ] **1.3** Verify no sensitive files are being committed:
  ```bash
  git diff --cached --name-only | findstr /i "env secret key credential password"
  ```
  Expected: No matches. If `.env.local` appears, remove it immediately.

- [ ] **1.4** Confirm DEV deployment has been fully tested:
  - MFA setup and login flow work (Grade: B+, 3 bugs fixed)
  - Communications multi-view (Thread, Timeline, Stakeholder, Compliance) render correctly
  - Bulk operations (mark read, categorize, thread, flag) function correctly
  - Inspection PDF downloads generate valid PDFs
  - Encryption module encrypts and decrypts correctly in DEV

### 2. Production Data Backup

- [ ] **2.1** Export critical production data from Convex dashboard BEFORE any changes:
  - Navigate to: https://dashboard.convex.dev
  - Select deployment: `accomplished-hornet-117`
  - Export the following tables (use Dashboard > Data > Export):
    - `users` (MFA fields will be added)
    - `communications` (20+ new fields, 4 new indexes)
    - `participants` (encryption will modify ndisNumber, dateOfBirth, etc.)
    - `incidents` (encryption will modify description, witnessNames, etc.)
    - `owners` (encryption will modify bankAccountNumber)
  - Save exports to a dated folder: `backups/2026-02-07/`

- [ ] **2.2** Record current production state:
  ```
  Total users: ___
  Total participants: ___
  Total communications: ___
  Total incidents: ___
  Total owners: ___
  ```

- [ ] **2.3** Note current Convex deployment version in production:
  - Check Convex dashboard > Deployments > Production
  - Record function count and index count for comparison after deploy

---

## Deployment Steps

### Step 3: Set Environment Variables on Convex Production

**CRITICAL: These MUST be set BEFORE deploying the backend code.**
The encryption module reads `ENCRYPTION_KEY` and `HMAC_KEY` at runtime.
If these are missing when encryption functions are called, the app will throw errors.

- [ ] **3.1** Generate encryption keys (do this ONCE, store securely):
  ```bash
  # Generate a 32-byte (256-bit) key for AES-256-GCM
  node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
  # Output example: Abc123...= (44 character base64 string)

  # Generate a 32-byte key for HMAC-SHA256 blind indexes
  node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
  # Output example: Xyz789...= (44 character base64 string)
  ```

- [ ] **3.2** **IMMEDIATELY** store both keys in a secure password manager:
  - Store as: "MySDAManager Production - ENCRYPTION_KEY"
  - Store as: "MySDAManager Production - HMAC_KEY"
  - **WARNING:** Losing these keys = PERMANENT DATA LOSS for encrypted fields.
  - Consider storing a second copy in a sealed envelope in a physical safe.

- [ ] **3.3** Set the environment variables on Convex production:
  ```bash
  npx convex env set ENCRYPTION_KEY "your-base64-encryption-key-here" --prod
  npx convex env set HMAC_KEY "your-base64-hmac-key-here" --prod
  ```
  If `--prod` flag is not supported, specify the deployment:
  ```bash
  npx convex env set ENCRYPTION_KEY "your-base64-encryption-key-here"
  npx convex env set HMAC_KEY "your-base64-hmac-key-here"
  ```
  (Ensure you are targeting `accomplished-hornet-117`, NOT `original-turtle-8`)

- [ ] **3.4** Verify env vars are set:
  ```bash
  npx convex env list
  ```
  Confirm both `ENCRYPTION_KEY` and `HMAC_KEY` appear (values will be masked).

### Step 4: Deploy Convex Backend to Production

**IMPORTANT:** Convex deploys are atomic. The schema push, indexes, and functions all deploy together. New optional fields and new tables are backward compatible -- existing data is untouched.

- [ ] **4.1** Notify team that deployment is starting:
  - Expected: 5-15 minute window where new features become available
  - No data loss expected (all new fields are `v.optional`)
  - Existing functionality continues working during deploy

- [ ] **4.2** Deploy Convex backend to production:
  ```bash
  cd c:\Projects\sda-management
  npx convex deploy
  ```
  This deploys to `accomplished-hornet-117` (production).

  **What this deploys:**
  - Schema changes: new `threadSummaries` table, new fields on `communications` (20+), `users` (MFA fields), `participants` (ndisNumberIndex)
  - New indexes: 4 on `communications`, 2 on `threadSummaries`, 1 on `auditLogs`
  - New functions: all `convex/lib/` modules (encryption, threading, consultation gate)
  - New migration action: `migrations/encryptExistingData.migrateAll`
  - Updated functions: `communications.ts`, `auditLog.ts`, `mfa.ts`, `participants.ts`, `incidents.ts`, `owners.ts`, `tasks.ts`

- [ ] **4.3** Watch the deploy output for errors:
  ```
  Expected output:
    Preparing... [OK]
    Pushing source code... [OK]
    Analyzing changes... [OK]
    Deploying... [OK]
    Successfully deployed
  ```
  **If deploy fails:** See Rollback Plan (Step 8) below.

- [ ] **4.4** Verify deployment in Convex Dashboard:
  - Navigate to: https://dashboard.convex.dev > `accomplished-hornet-117`
  - Confirm new tables exist: `threadSummaries`
  - Confirm new indexes on `communications` table
  - Confirm `convex/lib/encryption.ts`, `convex/lib/threadingEngine.ts`, `convex/lib/consultationGate.ts` appear in functions
  - Confirm `migrations/encryptExistingData` action exists

### Step 5: Deploy Frontend to Vercel

- [ ] **5.1** Push committed code to main branch:
  ```bash
  git push origin main
  ```
  Vercel auto-deploys on push to main.

- [ ] **5.2** Monitor Vercel build:
  - Navigate to: https://vercel.com/dashboard (or check Vercel CLI)
  - Confirm build succeeds (72+ pages generated)
  - Confirm no build errors in the log
  - Expected build time: 2-5 minutes

- [ ] **5.3** Verify the deployment URL:
  - Production: https://mysdamanager.com
  - Confirm the site loads without blank screen or errors

### Step 6: Post-Deployment Verification

**Perform these checks immediately after both Convex and Vercel deploys complete.**

- [ ] **6.1** Basic smoke test (unauthenticated):
  - [ ] https://mysdamanager.com loads without errors
  - [ ] Login page renders correctly
  - [ ] No console errors in browser DevTools

- [ ] **6.2** Authentication test:
  - [ ] Login with admin account succeeds
  - [ ] Dashboard loads with correct data
  - [ ] Session token stored in localStorage (`sda_user`, `sda_session_token`)

- [ ] **6.3** Core feature smoke tests (logged in as admin):
  - [ ] Properties page loads and lists properties
  - [ ] Participants page loads and lists participants
  - [ ] Maintenance page loads
  - [ ] Payments page loads (refactored page)
  - [ ] Inspections page loads (refactored page)
  - [ ] Operations page loads (refactored page)
  - [ ] Compliance page loads (refactored page)
  - [ ] Follow-ups page loads
  - [ ] Incidents page loads

- [ ] **6.4** New feature verification:
  - [ ] `/communications` page loads with multi-view toggle (Thread/Timeline/Stakeholder/Compliance)
  - [ ] Creating a new communication works
  - [ ] Threading auto-assigns threadId to new communications
  - [ ] Consultation Gate triggers for incident-related communications
  - [ ] `/settings/security` page loads for admin users
  - [ ] MFA enable flow shows QR code (do NOT enable yet in production until ready)

- [ ] **6.5** Convex function health check:
  - [ ] Check Convex Dashboard > Logs for any errors
  - [ ] Verify cron jobs are registered (6 total: alerts, notifications, digest, expected payments, overdue check, owner reminders, audit integrity)
  - [ ] Confirm no function timeout errors

- [ ] **6.6** Inspection PDF test:
  - [ ] Navigate to a completed inspection
  - [ ] Click "Download PDF" button
  - [ ] Verify PDF generates with cover page, category tables, and photos

### Step 7: Encryption Migration

**CRITICAL: This step encrypts existing production data. It is irreversible without the keys.**
**Run this ONLY after Steps 3-6 are all verified.**

- [ ] **7.1** Final pre-migration check:
  ```bash
  npx convex env list
  ```
  Confirm `ENCRYPTION_KEY` and `HMAC_KEY` are both set.

- [ ] **7.2** Run the encryption migration:
  ```bash
  npx convex run migrations/encryptExistingData:migrateAll --prod
  ```
  If `--prod` is not supported:
  ```bash
  npx convex run migrations/encryptExistingData:migrateAll
  ```
  (Ensure targeting `accomplished-hornet-117`)

  **What this does:**
  - Encrypts `participants`: ndisNumber, dateOfBirth, emergencyContactName, emergencyContactPhone, emergencyContactRelation
  - Creates HMAC blind indexes for ndisNumber (enables search on encrypted field)
  - Encrypts `incidents`: description, witnessNames, immediateActionTaken, followUpNotes
  - Encrypts `owners`: bankAccountNumber
  - Processes in batches of 50 records
  - Idempotent: safe to run multiple times (skips already-encrypted records)

- [ ] **7.3** Monitor migration output:
  ```
  Expected output:
    [ENC Migration] Starting participants...
    [ENC Migration] Participants batch 1: X encrypted, Y skipped
    [ENC Migration] Starting incidents...
    [ENC Migration] Incidents batch 1: X encrypted, Y skipped
    [ENC Migration] Starting owners...
    [ENC Migration] Owners batch 1: X encrypted, Y skipped
    [ENC Migration] COMPLETE: { participants: {...}, incidents: {...}, owners: {...} }
  ```

- [ ] **7.4** Verify encrypted data reads correctly:
  - [ ] Open Participants page - NDIS numbers should display as plaintext (decrypted on read)
  - [ ] Open a Participant detail - DOB, emergency contact should display correctly
  - [ ] Open an Incident - description should display correctly
  - [ ] Open Owner details - bank account number should display correctly
  - [ ] Search by NDIS number - blind index search should find the participant

- [ ] **7.5** Verify data in Convex Dashboard:
  - [ ] Open `participants` table - `ndisNumber` field should show `enc:...` prefix
  - [ ] `ndisNumberIndex` field should show hex string (blind index)
  - [ ] `dateOfBirth` should show `enc:...` prefix
  - [ ] `owners` table - `bankAccountNumber` should show `enc:...` prefix

- [ ] **7.6** Record migration results:
  ```
  Participants: ___ encrypted, ___ skipped
  Incidents:    ___ encrypted, ___ skipped
  Owners:       ___ encrypted, ___ skipped
  ```

---

## Rollback Plan

### If Convex Deploy Fails (Step 4)

The deploy is atomic - if it fails, production stays on the previous version. No action needed.

1. Check error message in deploy output
2. Common failures:
   - Schema validation error: fix schema.ts and re-deploy
   - Function compilation error: fix TypeScript and re-deploy
   - Index conflict: check for duplicate index names
3. Production remains on the old version until a successful deploy

### If Frontend Deploy Fails (Step 5)

Vercel maintains previous deployments. Roll back via Vercel dashboard:

1. Navigate to Vercel Dashboard > Deployments
2. Find the previous successful deployment
3. Click "..." menu > "Promote to Production"
4. Frontend instantly reverts while you fix the issue

### If Application Breaks After Deploy (Step 6)

**Scenario A: Frontend crashes but Convex is fine**

1. Roll back Vercel deployment (see above)
2. Fix frontend code, rebuild, re-push

**Scenario B: Convex functions throw errors**

1. Check Convex Dashboard > Logs for specific errors
2. If encryption-related: verify `ENCRYPTION_KEY` and `HMAC_KEY` env vars are set
3. If schema-related: check if existing data conflicts with new validators
4. Emergency: Redeploy previous Convex version:
   ```bash
   # Checkout the last known good commit for Convex
   git stash
   git checkout 10bd4b8  # Last production-deployed commit
   npx convex deploy
   git checkout main
   git stash pop
   ```

**Scenario C: Encryption migration corrupts data**

1. The migration is idempotent and only encrypts unencrypted records
2. Encrypted records have the `enc:` prefix; plaintext records do not
3. The `decryptField` function passes through non-encrypted strings unchanged
4. If keys are wrong: data will fail to decrypt with an error (not silent corruption)
5. **Worst case:** Restore from the backup taken in Step 2.1:
   - Use Convex Dashboard > Data > Import to restore backed-up tables
   - Re-run migration with correct keys

### If Encryption Keys Are Lost

**THIS IS A DATA LOSS SCENARIO. Prevention is critical.**

1. Encrypted fields CANNOT be recovered without the original keys
2. Restore from the backup taken in Step 2.1 (pre-encryption plaintext)
3. Generate new keys and re-run migration
4. Ensure keys are stored in at least 2 secure locations

---

## Communications Migration (Existing Data)

The communications table has 20+ new optional fields. Existing records do NOT need migration because:

- All new fields are `v.optional()` in the schema
- Existing communications will have `undefined` for new fields
- The migration script in `convex/migrations/` can backfill threading data later
- Thread view will show un-threaded communications as individual threads

**Optional post-deploy:** Run the communications data migration to backfill:
- `threadId` for existing records
- `complianceCategory` defaults
- `isThreadStarter` flags

This is NOT required for the app to function. It can be done at any time.

---

## Monitoring Checklist (First 24 Hours)

### Hour 0-1 (Immediately After Deploy)

- [ ] Check Convex Dashboard Logs for any errors
- [ ] Monitor Vercel deployment status
- [ ] Verify all pages load without errors
- [ ] Test login/logout flow
- [ ] Check that existing data displays correctly

### Hour 1-4

- [ ] Monitor Convex function execution times (no new timeouts)
- [ ] Check audit log integrity cron runs at 3 AM UTC
- [ ] Verify no increase in error rate in Convex logs
- [ ] Test creating a new maintenance request, incident, and communication
- [ ] Confirm email notifications still send (Resend API)

### Hour 4-24

- [ ] Monitor daily cron job execution:
  - `generate-daily-alerts` at 00:00 UTC
  - `send-alert-notifications` at 00:05 UTC
  - `verify-audit-log-integrity` at 03:00 UTC
  - `send-daily-digest` at 09:00 UTC
- [ ] Check for any new errors in Convex logs
- [ ] Verify Xero integration still functions (OAuth tokens)
- [ ] Test PWA functionality on mobile device
- [ ] Confirm offline incident form still works

### Day 2-7

- [ ] Monitor daily for any error patterns
- [ ] Verify encryption is working (new participants get encrypted NDIS numbers)
- [ ] Check MFA flow works if admin enables it
- [ ] Review audit logs for any anomalies
- [ ] Confirm thread auto-assignment works for new communications

---

## Environment Variable Summary

### Convex Production (`accomplished-hornet-117`)

| Variable | Purpose | When to Set |
|----------|---------|-------------|
| `ENCRYPTION_KEY` | AES-256-GCM encryption key (32 bytes, base64) | BEFORE deploy (Step 3) |
| `HMAC_KEY` | HMAC-SHA256 blind index key (base64) | BEFORE deploy (Step 3) |
| `RESEND_API_KEY` | Email sending via Resend | Should already be set |
| `TWILIO_ACCOUNT_SID` | SMS via Twilio | Should already be set |
| `TWILIO_AUTH_TOKEN` | SMS via Twilio | Should already be set |

### Vercel (Frontend)

| Variable | Value | Notes |
|----------|-------|-------|
| `NEXT_PUBLIC_CONVEX_URL` | `https://accomplished-hornet-117.convex.cloud` | Production Convex URL |
| `XERO_CLIENT_ID` | (already set) | Xero OAuth |
| `XERO_CLIENT_SECRET` | (already set) | Xero OAuth |
| `XERO_REDIRECT_URI` | `https://mysdamanager.com/api/xero/callback` | Xero callback |

**IMPORTANT:** Verify `NEXT_PUBLIC_CONVEX_URL` on Vercel points to the PRODUCTION Convex deployment (`accomplished-hornet-117`), NOT the dev deployment (`original-turtle-8`).

---

## Deployment Order Summary

```
1. npm run build                              (verify clean build)
2. git add + commit                           (stage all changes)
3. npx convex env set ENCRYPTION_KEY ...      (set on PROD Convex)
4. npx convex env set HMAC_KEY ...            (set on PROD Convex)
5. npx convex deploy                          (deploy backend to PROD)
6. git push origin main                       (triggers Vercel frontend deploy)
7. Verify app loads and works                 (smoke test)
8. npx convex run migrations/...migrateAll    (encrypt existing data)
9. Verify encrypted data reads correctly      (final check)
10. Monitor for 24 hours                      (watch logs)
```

**Total estimated time:** 30-45 minutes (excluding monitoring)

---

## Sign-Off

| Step | Completed | Time | Notes |
|------|-----------|------|-------|
| Pre-deployment checks | [ ] | | |
| Data backup | [ ] | | |
| Env vars set | [ ] | | |
| Convex deployed | [ ] | | |
| Vercel deployed | [ ] | | |
| Smoke tests passed | [ ] | | |
| Encryption migration | [ ] | | |
| Encryption verified | [ ] | | |
| 24-hour monitoring | [ ] | | |

**Deployed by:** _______________
**Date:** _______________
**Version:** v1.4.0
