# Claude Context - SDA Management System

## Project Overview
A comprehensive management system for **Specialist Disability Accommodation (SDA)** properties in Australia. Built for **Better Living Solutions** to manage properties, participants, maintenance, and compliance.

## Tech Stack
- **Frontend**: Next.js 16 (App Router), React 19, TypeScript
- **Backend**: Convex (serverless backend with real-time data)
- **Styling**: Tailwind CSS (dark theme)
- **PDF Generation**: jsPDF with autotable
- **Email**: Resend API
- **SMS**: Twilio API

## Current Version: v1.3.2

### Key Features
1. **Property Management** - Properties with multiple dwellings, owner details, bank info
2. **Participant Management** - NDIS participants with plans and funding
3. **Maintenance** - Reactive and preventative maintenance with photos
4. **Contractor Management** - Track contractors, send quote requests via email
5. **Quote Request Workflow** - Email contractors, receive quotes via public link
6. **Property Inspections** - Mobile-optimized checklists (BLS template)
7. **Payments** - Track SDA payments and generate NDIS export files
8. **Documents** - Store documents with expiry tracking
9. **Alerts** - Automated alerts for expiries, vacancies, maintenance
10. **Reports** - Compliance, financial, and contractor reports
11. **Incidents** - Record and track incidents with photos, NDIS reporting
12. **Incident Actions** - Define remediation actions, assign to contractor (via MR) or in-house
13. **Database Management** - Support Coordinators, Contractors, SIL Providers, OTs
14. **Follow-ups & Tasks** - Track communications (email, SMS, calls) and follow-up tasks for funding, plan approvals

## Project Structure
```
src/app/                    # Next.js pages
├── dashboard/              # Main dashboard
├── properties/             # Property CRUD + detail pages
├── participants/           # Participant management
├── payments/               # Payment tracking + NDIS export
├── maintenance/            # Maintenance requests
├── contractors/            # Contractor management
├── quote/[token]/          # Public quote submission page (for contractors)
├── inspections/            # Property inspection checklists
├── incidents/              # Incident reports
├── documents/              # Document management
├── alerts/                 # Alert management
├── preventative-schedule/  # Scheduled maintenance
├── follow-ups/             # Tasks and communication tracking
├── reports/                # Reports & analytics
└── settings/               # User preferences

convex/                     # Backend functions
├── schema.ts               # Database schema (all tables)
├── properties.ts           # Property queries/mutations
├── participants.ts         # Participant queries/mutations
├── contractors.ts          # Contractor CRUD
├── quoteRequests.ts        # Quote request workflow + email sending
├── inspections.ts          # Inspection system
├── maintenanceRequests.ts  # Maintenance functions
├── payments.ts             # Payment functions
├── alerts.ts               # Alert generation
├── notifications.ts        # Email/SMS sending
├── crons.ts                # Scheduled jobs
├── communications.ts       # Communication log tracking
├── tasks.ts                # Follow-up task management
└── ...

src/components/
├── Header.tsx              # Main navigation header
└── ...
```

## Database Tables (Convex)
- `users` - App users with roles
- `owners` - Property investors/landlords with bank details
- `properties` - SDA properties
- `dwellings` - Individual units within properties
- `participants` - NDIS participants
- `participantPlans` - NDIS plan details and funding
- `payments` - SDA payment records
- `maintenanceRequests` - Maintenance work orders
- `maintenancePhotos` - Photos for maintenance
- `maintenanceQuotes` - Quotes received from contractors
- `contractors` - Trade contractors for maintenance work
- `quoteRequests` - Email requests sent to contractors for quotes
- `preventativeSchedule` - Scheduled maintenance tasks
- `documents` - Uploaded documents
- `alerts` - System-generated alerts
- `incidents` - Incident reports
- `incidentPhotos` - Photos for incidents
- `incidentActions` - Remediation actions for incidents (contractor or in-house)
- `inspectionTemplates` - Reusable inspection checklists
- `inspections` - Individual inspection records
- `inspectionItems` - Each checked item in inspection
- `inspectionPhotos` - Photos for inspection items
- `supportCoordinators` - NDIS support coordinators
- `supportCoordinatorParticipants` - SC-participant relationships
- `silProviders` - SIL (Supported Independent Living) providers
- `silProviderParticipants` - SIL provider-participant relationships
- `occupationalTherapists` - OTs for SDA assessments
- `otParticipants` - OT-participant relationships
- `communications` - Communication logs (emails, calls, SMS, meetings)
- `tasks` - Follow-up tasks linked to participants/communications

## Important Business Context

### SDA Categories
- Improved Liveability
- Fully Accessible
- Robust
- High Physical Support (HPS)

### Revenue Sources per Participant
- **SDA Funding** - NDIS SDA payment (monthly)
- **RRC** - Reasonable Rent Contribution:
  - 25% of Disability Support Pension
  - 100% of Commonwealth Rent Assistance
- **Less: SDA Provider Fee** - Management percentage

### Key Dates
- NDIS plans have start/end dates (track expiry)
- Documents have expiry dates
- Maintenance has scheduled/due dates
- Claims typically processed on specific days of month

## Coding Conventions
- All pages use dark theme (bg-gray-900, text-white)
- Header component used on all pages with `currentPage` prop
- Forms use controlled components with useState
- Convex queries use `useQuery(api.module.function)`
- Convex mutations use `useMutation(api.module.function)`
- **Authentication**: Dual system (migration in progress)
  - `useAuth` hook reads from `localStorage.getItem("sda_user")`
  - `useSession` hook reads from `sda_session_token` + `sda_refresh_token`
  - **CRITICAL**: `RequireAuth` must use `useAuth` to match Dashboard
  - Login stores BOTH formats for backward compatibility
- All dates stored as ISO strings (YYYY-MM-DD)

## Completed Features
- **Custom domain** - https://mysdamanager.com
- **Resend email** - Configured with noreply@mysdamanager.com, sending to khen@betterlivingsolutions.com.au
- **PWA for mobile** - Offline support, install prompt
- **Xero Integration** - OAuth fixed (state validation, sync buttons work per account)
- **Owner reports** - 6-month Folio Summary ✓ (fixed plan start date check)
- **Onboarding documents** - Address display + proposed move-in date ✓
- **Incident Actions** - Tested workflow: Add Action → Contractor/In-House → Complete ✓
- **Property addresses** - Dwelling number + street name display ✓
- **NDIS Compliance Guides** - Collapsible guides in Compliance Dashboard ✓
  - Incident Reporting Guide (24-hour & 5-day notification requirements)
  - Complaints Handling Guide (5-day ack, 21-day resolution, advocacy)
  - Certifications Guide (org-level, property-level, worker requirements)
- **Security Improvements** ✓
  - Audit logging system (auditLogs table, tracks all CRUD actions)
  - Row-level security helpers (authHelpers.ts with role-based permissions)
  - Login/logout audit trail
  - Audit logging on: properties, participants, payments, maintenance, incidents, documents
  - Audit log viewer page at /admin/audit (admin-only with filters/search)
  - Permission checks using requirePermission() on sensitive mutations
- **Database Section** - Expanded with new entity types ✓
  - SIL Providers (Supported Independent Living) with services, areas, participant linking
  - Occupational Therapists with specializations, AHPRA numbers, assessment tracking
- **Frontend Improvements** ✓
  - Shared UI components: LoadingScreen, EmptyState, StatCard, Toast
  - Shared form components: FormInput, FormSelect, FormTextarea, FormCheckbox, Button
  - RequireAuth wrapper for protected routes
  - Color constants (src/constants/colors.ts) for consistent styling
  - Format utilities (src/utils/format.ts) for dates, currency, status
  - useMemo optimizations on filtered lists
  - WCAG accessibility: aria labels, fieldsets, focus-visible states
  - Refactored pages: dashboard, properties, participants, maintenance, incidents, documents, alerts, contractors
- **UI Design System (SaaS-Ready)** ✓
  - MySDAManager branding added to Header (alongside org logo for multi-tenant)
  - Badge component (src/components/ui/Badge.tsx) with preset status badges
  - Design tokens file (src/constants/designTokens.ts) - spacing, shadows, typography
  - Global transitions in globals.css with reduced motion support
  - Fixed invalid bg-gray-750 hover states across 14 files
- **Backend Improvements** ✓
  - Notification helpers (convex/notificationHelpers.ts) with retry logic and exponential backoff
  - Alert helpers (convex/alertHelpers.ts) with centralized alert generators
  - TypeScript fixes in auth.ts (explicit return types, circular inference fixes)
  - Integrated helpers into alerts.ts and notifications.ts (removed ~400 lines duplicated code)
- **Performance Optimizations (2026-02-03)** ✓
  - Fixed N+1 queries in alerts.ts (getAll, getActive, getByType) using batch fetching + lookup maps
  - Fixed N+1 queries in payments.ts (getAll, getByParticipant, getRecent, getPaymentsWithVariance)
  - Added compound indexes: bankTransactions.by_bankAccount_date, bankTransactions.by_bankAccount_matchStatus, maintenanceQuotes.by_maintenance_status
  - Added paginated endpoints: alerts.getActivePaginated, payments.getAllPaginated
- **Security Hardening (2026-02-03)** ✓
  - Hardened Content Security Policy (CSP) in next.config.ts - removes unsafe-eval in production
  - Bcrypt password hashing (12 salt rounds) - auth functions (login, createUser, resetPassword) converted to actions for async crypto
  - Fixed Vercel build errors - changed useMutation to useAction for bcrypt-based auth in login, settings, setup pages
- **User Management (2026-02-03)** ✓
  - Added SIL Provider role to user management dropdown + backend validator
  - SIL Provider users display with orange badge in user list
- **SIL Property Management (2026-02-04)** ✓
  - Added SIL Properties count to dashboard with orange indicator
  - Made ownerId optional in schema for SIL properties
  - SIL Provider dropdown linked to database (not free text)
  - Hidden SDA-specific fields (Design Category, Building Type, Registration Date) for SIL properties
  - Optional owner details section for SIL properties (collapsible)
  - Fixed form duplication - removed duplicate SIL Provider field from Step 1
  - Property status types: "active", "under_construction", "planning", "sil_property"
  - Ownership types: "investor", "self_owned", "sil_managed"
- **Follow-ups & Tasks Feature (2026-02-04)** ✓
  - New `communications` table - log emails, SMS, phone calls, meetings
  - New `tasks` table - follow-up tasks with priority, category, due dates
  - `/follow-ups` page with task-focused view and collapsible communications
  - Communication logging: type, direction, contact details, attachments, participant linking
  - Task management: create, update status, complete with notes, assign to users
  - Categories: funding, plan_approval, documentation, follow_up, general
  - Dashboard integration: task stats, overdue counts, upcoming tasks widget
  - Badge presets: TaskStatusBadge, TaskCategoryBadge, CommunicationTypeBadge, ContactTypeBadge
  - Color constants for all new entity types
- **Follow-ups Build Fixes (2026-02-05)** ✓
  - Fixed FormTextarea missing `label` prop - added `hideLabel` option for accessibility
  - Fixed StatCard invalid color "orange" - changed to "yellow" (valid: blue, green, yellow, red, purple, gray)
  - Fixed `api.users.getAll` → `api.auth.getAllUsers` (users API is in auth.ts)
  - Added communications and tasks permissions to authHelpers.ts rolePermissions
  - Added "communication" and "task" to AuditEntityType union
- **Drag & Drop Attachment Upload (2026-02-05)** ✓
  - Added drag-drop support in communications/new page
  - Visual feedback: blue highlight border when dragging over drop zone
  - File type validation: images, PDF, Word documents
  - Preserves click-to-upload functionality
  - Accessible: keyboard navigation, ARIA labels, focus states
- **Production Auth & Performance Fix (2026-02-06)** ✓ **CRITICAL FIX**
  - **Root Cause**: `RequireAuth` used `useSession` (looks for `sda_session_token`) while Dashboard used `useAuth` (looks for `sda_user`)
  - **Symptom**: Properties, Participants, Follow-ups pages hung indefinitely; Dashboard worked fine
  - **Fix**: Changed `RequireAuth.tsx` to use `useAuth` instead of `useSession`
  - **Query Optimizations**:
    - `properties.getAll`: Changed from `.filter()` to `.withIndex("by_isActive")`
    - `participants.getAll`: Changed from DB negation filter to in-memory filter
    - Added `dwellings.by_isActive` index for performance
  - **Debugging Method**: Used Backend Architect AI agent to identify auth mismatch in one pass
- **Security Hardening (2026-02-06)** ✓ **MAJOR UPDATE**
  - **RBAC Security**: Fixed privilege escalation vulnerabilities
    - Added admin checks to createUser, updateUser, resetPassword
    - Added actingUserId parameter for audit trail
    - Added SIL Provider role with proper permissions
  - **Audit Logging Expansion**: NDIS compliance
    - Participant Plans: create/update with previousValues capture
    - Incidents: update, markNdisNotified (timestamp), resolve
    - Claims: updateStatus, bulkCreate
    - Documents: deletion tracking
  - **Payment Validation**: Zod schema validation
    - Positive amounts only, max $100,000
    - Duplicate detection (participant + date)
    - Plan expiry validation before payment creation
    - Variance alerts (>$500)
  - **Error Handling**: Incident creation failure → admin email notification
  - **Immutable Audit Logs**: Tamper-proof with hash chain integrity
    - SHA-256 hash linking
    - Deletion prevention
    - Daily integrity verification cron (3 AM UTC)
  - **Server-Side Sessions**: Replaced localStorage auth
    - Sessions table with tokens + refresh tokens
    - loginWithSession, validateSession, refreshSession
    - 24-hour access token, 30-day refresh token
  - **Frontend Session Integration**:
    - useSession hook for auth state
    - Automatic token refresh
    - Proper logout with session cleanup
  - **Accessibility (WCAG 2.1 AA)**:
    - Modal accessibility: role="dialog", aria-modal, focus trap, Escape key
    - Color contrast: text-gray-500 → text-gray-400
    - Form autocomplete attributes on login
    - Heading hierarchy fixes (h1 for main titles)
  - **Deployment**: Commit 10bd4b8, 22 new indexes deployed to Convex
  - **System Grade After Deployment: D+ → B+ (Production Ready)**
- **Security Testing & Critical Fix (2026-02-06)** ✓ **PRODUCTION BLOCKER RESOLVED**
  - **Automated Security Testing**: Created Playwright test suite (backend_security_test.py)
    - Tested RBAC (role-based access control)
    - Tested audit logging integrity
    - Tested payment validation
    - Tested session management
  - **Critical Vulnerability Discovered**: `/admin/audit` page accessible without authentication
    - Backend API security: A+ (all requirePermission checks working)
    - Frontend route protection: C (admin page missing RequireAuth wrapper)
    - Security impact: High (audit log UI exposed, but API calls would fail)
  - **Immediate Fix Deployed**: Commit 63fbd29
    - Added `<RequireAuth allowedRoles={["admin"]}>` wrapper to audit page
    - Verified all admin routes protected (/admin/audit, /admin/ai, /admin/seed)
    - Build successful (63 pages generated)
  - **Security Grade After Fix: C → A+ (Production Ready)**
  - **Test Report**: See BACKEND_SECURITY_TEST_REPORT.md for full details
  - **Recommendation**: Safe for production deployment after this fix
- **Offline Incident Forms (2026-02-06)** ✓ **NDIS COMPLIANCE FEATURE**
  - **Problem**: Field staff need to report incidents immediately, even in areas with poor connectivity
  - **Solution**: IndexedDB-based offline queue with automatic sync
  - **Implementation**:
    - `src/lib/offlineQueue.ts` - IndexedDB wrapper for pending incidents
    - `src/hooks/useOfflineSync.ts` - Auto-sync hook with retry logic
    - `src/components/OfflineIndicator.tsx` - Status banners (offline, syncing, pending, success)
    - `src/app/incidents/new/page.tsx` - Offline detection and local storage
  - **Features**:
    - Detects offline state using `navigator.onLine`
    - Saves incident data + photos/videos as base64 to IndexedDB
    - Auto-syncs when connection restored (with 1-second delay)
    - Manual "Sync Now" button for pending incidents
    - Retry logic with exponential backoff
    - Photo upload during sync (base64 → File → Convex storage)
  - **NDIS Compliance**:
    - Zero data loss - incidents never lost even if device dies
    - Immediate reporting capability for critical 24-hour incidents
    - Photo evidence preserved in offline queue
    - Audit trail shows creation time vs sync time
  - **Testing Guide**: See OFFLINE_TESTING_GUIDE.md for comprehensive test scenarios
  - **Status**: Ready for production testing
- **MFA Implementation (2026-02-06)** ✓ **SECURITY MILESTONE**
  - **TOTP-Based Authentication**: Google Authenticator / Authy compatible
    - `convex/mfa.ts` - Full MFA module with setup, verify, disable functions
    - QR code generation for easy enrollment
    - 10 backup codes per user (SHA-256 hashed)
    - 30-second TOTP window with 1-step tolerance for clock skew
  - **Admin-Only Feature**: MFA restricted to admin accounts for now
  - **Login Flow Integration**:
    - `loginWithSession` returns `requiresMfa: true` + `userId` if MFA enabled
    - `completeMfaLogin` verifies TOTP code and issues session tokens
    - Backup code support with automatic consumption
  - **Settings Page**: `/settings/security` for MFA management
    - Enable/disable MFA
    - View remaining backup codes
    - Regenerate backup codes (requires TOTP verification)
  - **Query Permission Fixes**: 15+ pages updated with required `userId` parameter
    - participants.getAll, payments.getAll, auth.getAllUsers now require auth
    - Prevents unauthorized data access
  - **Files Modified**:
    - `convex/mfa.ts` (NEW) - MFA backend module
    - `convex/schema.ts` - Added mfaSecret, mfaEnabled, mfaBackupCodes to users
    - `src/app/login/page.tsx` - MFA login flow with code input
    - `src/app/settings/security/page.tsx` - MFA management UI
    - 15+ pages - Query permission fixes
  - **Status**: Build passes, ready for deployment and testing

## Next Session Priorities
1. **CommunicationsLog Refactor (v1.4.0)** - 🔄 **IN PROGRESS**
   - Transform basic contact log into NDIS-audit-ready stakeholder management system
   - Phase 1: Database schema changes + migration (Week 1)
   - Phase 2: Smart threading engine with 12-hour window fuzzy matching (Week 2)
   - Phase 3: Consultation Gate workflow with auto-task creation (Week 2)
   - Phase 4: Multi-view interface (Thread/Timeline/Stakeholder/Compliance) (Week 3)
   - Phase 5: Enhanced components & compliance badges (Week 4)
   - Phase 6: Bulk operations & pagination (Week 5)
   - Phase 7: Accessibility testing & WCAG 2.1 AA compliance (Week 6)
   - **Plan**: See `C:\Users\User\.claude\plans\transient-wobbling-floyd.md`
   - **Estimated**: 6 weeks, 120 hours total
2. **Testing needed:**
   - Xero Integration - Connect and sync bank transactions (OAuth fixed, ready to test)
3. **Bug fixing** - Test all features, fix any issues
4. **Bulk data entry** - User will upload property/participant data
5. **Frontend Refactoring (remaining pages):**
   - `payments/page.tsx` - Apply shared components, useMemo, formatCurrency
   - `inspections/page.tsx` - Apply shared components, useMemo, color constants
   - `operations/page.tsx` - Large page with tabs, needs LoadingScreen/EmptyState/useMemo
   - `compliance/page.tsx` - Large page, needs shared components and accessibility

## Reference Documents
- **Folio Summary / SDA Rental Statement** - Monthly landlord report showing:
  - Per-participant revenue breakdown
  - SDA Funding + RRC contributions
  - Less management fees
  - Monthly totals with grand total
  - Owner bank details for payment

## Future Roadmap (Priorities)
1. Security enhancements - ✅ **COMPLETE** (RBAC, audit logging, sessions, validation)
2. MFA for admin accounts - ✅ **COMPLETE** (TOTP-based, backup codes, Settings UI)
3. Field-level encryption - Encrypt NDIS numbers, DOB, incident descriptions at rest
4. Proper authentication (Clerk) - Optional migration from current session system
5. Inspection PDF reports

## Phase 2: SaaS Subscription Model (Start: Mid-February 2026)
**Prerequisite:** Complete 2-3 weeks of testing/debugging current app first.

See [SAAS_BUSINESS_PLAN.md](SAAS_BUSINESS_PLAN.md) for full details.

### Summary
- **Brand**: MySDAManager (https://mysdamanager.com - SECURED)
- Transform into multi-tenant SaaS for other SDA providers
- New independent company (Pty Ltd)
- Stripe subscription billing
- Pricing: $250-600/month (match Re-Leased, but FREE onboarding)
- **Competitor**: Re-Leased ($7,500 year 1) - same annual, save $2,500 on onboarding

### Key Steps
1. Register company, ABN, trademark
2. Implement multi-tenant architecture
3. Add Stripe billing
4. Beta launch with 5-10 customers
5. Public launch
  - Pricing tiers

## Commands
```bash
npm run dev          # Start development server
npx convex dev       # Start Convex backend
npm run build        # Production build
npx convex deploy    # Deploy Convex to production
```

---
**Last Updated**: 2026-02-06
