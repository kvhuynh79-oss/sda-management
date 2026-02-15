# Claude Context - SDA Management System

## Project Overview
A comprehensive management system for **Specialist Disability Accommodation (SDA)** properties in Australia. Built for **Better Living Solutions** to manage properties, participants, maintenance, and compliance.

## Tech Stack
- **Frontend**: Next.js 16 (App Router), React 19, TypeScript
- **Backend**: Convex (serverless backend with real-time data)
- **Styling**: Tailwind CSS (dark theme)
- **PDF Generation**: jsPDF with autotable + pdf-lib for template overlays
- **Email**: Resend API + Postmark (inbound webhook)
- **SMS**: Twilio API
- **AI**: Claude API (document analysis, policy summaries)
- **Native Mobile**: Capacitor (iOS + Android) with home screen widgets

## Current Version: v2.6.0 (Marketing Sprint + SEO + Blog)

### Key Features
1. **Property Management** - Properties with multiple dwellings, owner details, bank info
2. **Participant Management** - NDIS participants with plans, funding, incomplete/archive workflow
3. **Maintenance** - Reactive and preventative maintenance with photos
4. **Contractor Management** - Track contractors, send quote requests via email
5. **Quote Request Workflow** - Email contractors, receive quotes via public link
6. **Property Inspections** - Mobile-optimized checklists (BLS template)
7. **Payments** - Track SDA payments and generate NDIS export files
8. **Documents** - Store documents with expiry tracking + AI analysis
9. **Alerts** - Automated alerts for expiries, vacancies, maintenance
10. **Reports** - Compliance, financial, and contractor reports
11. **Incidents** - Record and track incidents with photos, NDIS reporting
12. **Incident Actions** - Define remediation actions, assign to contractor (via MR) or in-house
13. **Database Management** - Support Coordinators, Contractors, SIL Providers, OTs
14. **Follow-ups & Tasks** - Track communications (email, SMS, calls) and follow-up tasks for funding, plan approvals
15. **Communications Hub** - Multi-view communications with threading, compliance tracking, bulk operations, incident auto-linking
16. **NDIS Complaints Compliance** - Website intake, 24hr countdown, SOP-001 procedure, chain of custody, compliance checklist
17. **Multi-Tenant SaaS** - Row-level tenant isolation, organizations, plan tiers
18. **Stripe Billing** - Subscription management, checkout, webhooks, plan enforcement
19. **Super-Admin Dashboard** - Platform-wide metrics, org management, impersonation
20. **REST API v1** - External API with key management for properties, participants, maintenance, incidents
21. **White-Label Branding** - Per-org colors, logos, custom branding
22. **Registration & Onboarding** - Self-service signup, pricing page, 4-step onboarding wizard
23. **Participant Consent Workflow** - APP 3 compliant consent lifecycle (record, renew, withdraw), Easy Read PDF with illustrations, consent expiry alerts
24. **Email Integration** - Postmark inbound webhook for email-to-communications, Outlook add-in manifest
25. **Policies & Procedures** - Per-org compliance policy library with AI-generated summaries (BLS + AAH pre-loaded, other orgs upload their own)
26. **Staff Files** - Employee records, NDIS screening compliance tracking
27. **Emergency Plans** - EMP and BCP pages for business continuity
28. **Audit Compliance Export** - 7-section NDIS audit pack PDF (certifications, incidents, complaints, plans, documents, audit integrity)
29. **Founder's Launch Dashboard** - 15-item go-live checklist with 5 categories and progress tracking
30. **Save Incomplete Participant** - Create profiles with just first/last name before full NDIS data available
31. **MTA Schedule of Supports** - Landscape PDF matching BLS template with org-specific branding
32. **Archive Participant** - Soft archive with confirmation, filtered from active lists
33. **Marketing Website** - 9 marketing pages (Features, Security, About, Contact, FAQ, Compare, Blog) with shared layout
34. **SEO Infrastructure** - robots.txt, sitemap.xml, OG/Twitter images, structured data (JSON-LD)
35. **Blog System** - 6 articles with categories, search, share buttons, individual post pages
36. **Lead Capture** - Audit checklist PDF download with email capture via marketingLeads table

## Project Structure
```
src/app/                    # Next.js pages (116+ routes)
├── (marketing)/            # Marketing pages (shared MarketingHeader/Footer layout)
│   ├── features/           # Feature showcase
│   ├── security/           # Security & compliance details
│   ├── about/              # About page
│   ├── contact/            # Contact form with lead capture
│   ├── faq/                # FAQ accordion
│   ├── compare/            # MySDAManager vs competitors
│   └── blog/               # Blog with 6 articles
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
├── settings/               # User preferences + org settings + API keys
├── admin/platform/         # Super-admin dashboard (org management)
├── admin/launch/           # Founder's go-live checklist
├── compliance/             # Certifications management
├── policies/               # Policies & procedures library
├── staff/                  # Staff files and NDIS screening
├── emergency-plans/        # EMP and BCP pages
├── register/               # Self-service registration
├── pricing/                # Public pricing page
├── onboarding/setup/       # 4-step onboarding wizard
├── portal/                 # SIL provider portal
└── api/
    ├── v1/                 # REST API endpoints (properties, participants, maintenance, incidents)
    ├── mail/               # Postmark inbound email webhook
    └── stripe/webhook/     # Stripe webhook handler

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
├── Header.tsx              # Main navigation header (app)
├── BottomNav.tsx           # Mobile bottom navigation bar
├── LockScreen.tsx          # Inactivity PIN lock overlay
├── RequireAuth.tsx         # Auth wrapper with lock screen
├── PushNotificationPrompt.tsx # Push notification settings UI
├── ui/ConfirmDialog.tsx    # Styled alert/confirm replacement
├── marketing/
│   ├── MarketingHeader.tsx # Sticky header with full nav + mobile hamburger
│   ├── MarketingFooter.tsx # Trust badges, footer columns, legal links
│   ├── LandingPage.tsx     # Homepage with workaround messaging + lead capture
│   ├── ContactForm.tsx     # Contact form component
│   ├── FaqAccordion.tsx    # Expandable FAQ sections
│   ├── BlogPostGrid.tsx    # Blog post card grid
│   ├── BlogCategoryFilter.tsx # Blog category filter tabs
│   └── ShareButton.tsx     # Social share dropdown
└── ...

worker/
└── index.ts                # Custom SW push notification handlers
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
- `pushSubscriptions` - Web Push notification subscriptions per user/device

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
- **ConfirmDialog**: Use `useConfirmDialog()` instead of browser `alert()`/`confirm()` - available globally via ConfirmDialogProvider
- **BottomNav**: Add `<BottomNav currentPage="..." />` on mobile-priority pages
- **Inactivity Lock**: Automatic via `RequireAuth` - all protected routes get PIN lock after inactivity
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
- **CommunicationsLog v1.4.0 COMPLETE (2026-02-07)** ✓ **MAJOR FEATURE**
  - **Phase 1-6 (2026-02-04 to 2026-02-06)**: Schema, threading, consultation gate, multi-view, bulk ops
  - **Phase 7 WCAG Audit (2026-02-07)**: All 9 communication components audited
    - Keyboard navigation: all controls reachable via Tab
    - Focus visibility: focus-visible:ring-2 on all interactive elements
    - ARIA: role="tablist"/tab/tabpanel, aria-expanded, aria-live regions
    - Color contrast: zero text-gray-500 violations
    - BulkActionBar: ArrowUp/Down keyboard nav, auto-focus on dropdown open, Escape closes
  - **Communications Gap-Fix (2026-02-07)**:
    - DB-linked dropdowns: SC, SIL Provider, OT, Contractor from database
    - Auto-populate email/phone on entity selection
    - NDIS Compliance section: 9 categories + 5 flags on every communication
    - getByStakeholder backend query using by_stakeholder index
    - CommunicationsHistory reusable component on participant, property, SC, SIL detail pages
    - Pre-fill support via URL search params from detail pages
  - **Bulk Operations UI**:
    - BulkActionBar: Mark Read, Categorize, Flag with checkbox selection
    - Integrated into ThreadView, TimelineView, ComplianceView
  - **Inspection PDF Reports**:
    - getInspectionReport backend query (items, photos, category summaries, pass rate)
    - Client-side PDF generation via jsPDF + autoTable (511 lines)
    - Download button on completed inspections with loading state
  - **List-to-Detail Navigation**: Contractor + OT list pages wired to detail pages
  - **Build**: 65 pages, 0 errors
- **Communications v1.5 Enhancements (2026-02-07)** ✓
  - **Soft Delete + Admin Restore**:
    - `remove` mutation converted from hard delete to soft delete (`isDeleted`, `deletedAt`, `deletedBy`)
    - New `restore` mutation (admin-only) to undo deletions
    - `regenerateThreadSummary` filters out deleted messages
    - All 13+ queries filter out `isDeleted` records
  - **Thread Archive/Complete**:
    - New `updateThreadStatus` mutation (active/completed/archived)
    - Status filter tabs (Active/Completed/Archived) on ThreadView
    - Complete/Archive/Reactivate buttons per thread
    - URL-persisted `threadStatus` filter on communications page
  - **Delete Buttons on All Views**:
    - StakeholderView: `deleteByContactName` mutation (bulk soft-delete all comms for a contact)
    - TimelineView: Per-communication delete button
    - ComplianceView: Per-communication delete button
    - Role-gated: only admin + property_manager see delete buttons
  - **Incident-to-Communications Auto-Linking**:
    - New `autoCreateForIncident` internal mutation in communications.ts
    - Auto-creates communication with `complianceCategory: "incident_related"` when incident created
    - NDIS-reportable incidents get `ndia_reportable` + `time_sensitive` flags
    - Linked to participant thread if participant specified
    - Incidents now appear automatically in Compliance view
  - **Threaded Participant View**: `getByParticipantThreaded` query for collapsible thread groups
  - **Deleted Items Admin View**: `getDeletedCommunications` query for admin restore UI
  - **+ New Communication Button**: Added to communications page header
  - **Schema**: Added `isDeleted`/`deletedAt`/`deletedBy` on communications, `status` on threadSummaries, 2 new indexes
  - **Commits**: `3435390` (delete buttons), `8bf16cc` (incident auto-linking), `f1fcb54` (new comm button)
- **Compliance Certifications Auto-Creation (2026-02-08)** ✓
  - Auto-create compliance certifications when cert-type documents uploaded
  - `createFromDocument` internal mutation in `complianceCertifications.ts`
  - Document-to-cert type mapping (6 cert types: SDA registration, NDIS practice standards, worker screening, fire safety, building compliance, SDA design)
  - Expiry date required for certification documents
  - Green auto-linked banner on document upload form
  - Duplicate detection prevents re-creating existing certifications
- **Admin Deleted Items UI (2026-02-08)** ✓
  - Deleted Items toggle button on Communications page (admin only)
  - Expandable panel showing deleted communications with restore buttons
  - Improved deleted communication detail page messaging for non-admins
- **OfflineIndicator Bug Fix (2026-02-08)** ✓
  - Removed global OfflineIndicator from ConvexClientProvider
  - Was showing "You are offline" on all pages including login
  - incidents/new page already had its own instance
- **Compliance Certifications Management UI (2026-02-08)** ✓
  - **List Page** (`/compliance/certifications`): Stats row, expiring-soon alerts, filterable table
    - Filters: type, status, property, search
    - Status badges (Current/Expiring Soon/Expired/Pending Renewal)
    - Role-gated delete (admin/property_manager)
  - **Detail/Edit Page** (`/compliance/certifications/[id]`): Full cert view with inline edit
    - Certificate download link via `certificateUrl`
    - Scope display (Org-wide badge or linked property)
    - Audit outcome badges
  - **Backend**: `getById` now returns `certificateUrl`, `getDashboardStats` query added
  - **Cron Job**: `updateStatuses` converted to `internalMutation`, wired to daily cron (1 AM UTC)
    - Auto-transitions: current → expiring_soon → expired
  - **ThreadView Bug Fix**: Empty state moved below status filter tabs so users can always switch Active/Completed/Archived
- **Playwright E2E Testing (2026-02-08)** ✓
  - 28 screenshots captured across all communications features
  - Tested: thread status tabs, deleted items panel, restore flow, all view tabs
  - Tested: participant/property communications history, follow-ups, detail pages
  - All features verified working
- **Compliance Alerts & Dashboard Integration (2026-02-08)** ✓
  - Cert expiry alerts in `alertHelpers.ts` (critical for expired, warning for expiring within 30 days)
  - Duplicate detection by title to prevent alert spam
  - Dashboard compliance widget: expired/expiring cert counts with link to certifications page
  - Compliance dashboard: certifications stats card with `getDashboardStats` query
  - Reports page: compliance certifications link card
  - Mobile responsiveness fixes for communications and incidents pages
- **UI/Brand Polish (2026-02-08)** ✓ **PROFESSIONAL SAAS UPGRADE**
  - **Font Fix**: Activated Geist Sans font (was loading but overridden by Arial in globals.css)
  - **Brand Unification**: All metadata updated to "MySDAManager" (layout.tsx title, manifest.json, settings page)
  - **Login Page**: Added MySDAManager branding, trust footer ("Built for NDIS compliance"), removed internal employee email
  - **Active Nav Indicator**: Blue underline (`border-b-2 border-blue-500`) on current page in Header
  - **Emoji → SVG Icons**: Replaced 24 emoji icons across 17 files with proper heroicon SVGs
  - **Dashboard Sections**: 5 semantic sections with headings (Property Portfolio, Tasks, Operations, Quick Actions, Recent Activity)
  - **Pulsing Badge Fix**: Replaced `animate-pulse` on 6 status badges with static ring glow effect
  - **Card Border Standardization**: 14 files updated to consistent `border border-gray-700 hover:bg-gray-700/80`
  - **Input Padding Standardization**: All form inputs normalized to `px-3 py-2` (matching shared FormInput)
  - **Label Spacing**: 30 files updated from `mb-2` to `mb-1` on form labels
  - **Header Margins**: Standardized `mb-8` on all page headers (3 pages had `mb-6`)
  - **Design Tokens Updated**: `COMPONENT_TOKENS.card.base` aligned with new standard
  - **Build**: 68 pages, 0 errors

- **Mobile Audit & PWA Enhancements (2026-02-08)** ✓ **MAJOR MOBILE UX UPDATE**
  - **Mobile Audit**: Comprehensive audit by Mobile App Builder agent across 8 areas
  - **Quick Wins (commit c398aa0)**:
    - Fixed Permissions-Policy header: `camera=(self), geolocation=(self)` (was blocking camera API for inspections)
    - Responsive grid fixes across 10 form pages (~60 instances of bare `grid-cols-2/3` → `grid-cols-1 sm:grid-cols-2/3`)
    - 7 route-level loading skeletons (dashboard, incidents, maintenance, properties, inspections, communications, participants)
    - Branding unified to "MySDAManager" (manifest, install prompt, Apple Web App title)
    - `aria-live="polite"` added to OfflineIndicator
    - Photo delete buttons always visible on mobile (`sm:opacity-0 sm:group-hover:opacity-100`)
    - Manifest `id` field added for stable PWA identity
  - **Offline Inspection Support**:
    - `src/lib/inspectionOfflineQueue.ts` - IndexedDB v2 with `pending_inspection_changes` + `cached_inspections` stores
    - `src/hooks/useInspectionOfflineSync.ts` - Auto-sync on reconnection, 30s periodic check, manual sync
    - Extends existing `offlineQueue.ts` pattern (DB version upgrade preserves incident queue)
  - **Web Push Notifications Infrastructure**:
    - `convex/pushSubscriptions.ts` - VAPID-based push subscription management (subscribe, unsubscribe, send)
    - `src/hooks/usePushNotifications.ts` - Push API client hook with permission management
    - `src/components/PushNotificationPrompt.tsx` - Settings UI with toggle, device count, 4 notification categories
    - `worker/index.ts` - Custom SW push + notification click handlers (auto-built by next-pwa)
    - Integrated into `/settings/security` page
    - **Note**: Requires VAPID keys in env vars to fully activate
  - **ConfirmDialog System** (replaces browser alert/confirm):
    - `src/components/ui/ConfirmDialog.tsx` - Provider + `useConfirmDialog` hook
    - `confirm()` returns `Promise<boolean>`, `alert()` returns `Promise<void>`
    - Variant support: "default" (blue) and "danger" (red)
    - Focus trap, Escape key, body scroll lock, accessible
    - `ConfirmDialogProvider` wired into root `layout.tsx`
    - Replaced ~34 browser alert/confirm calls across 6 pages:
      - `incidents/[id]` (11), `operations` (6), `inspections/[id]` (6), `maintenance/[id]` (2), `settings` (6), `settings/security` (3)
  - **Inactivity Lock Screen** (NDIS data protection):
    - `src/hooks/useInactivityLock.ts` - Tracks mouse/keyboard/touch/scroll activity
    - `src/components/LockScreen.tsx` - Full-screen PIN overlay with number pad
    - SHA-256 hashed 4-digit PIN in sessionStorage
    - 5min timeout (admin) / 15min (other roles), configurable
    - 5-attempt lockout with forced logout
    - Integrated into `RequireAuth.tsx` - all protected routes get auto-lock
  - **Mobile Bottom Navigation**:
    - `src/components/BottomNav.tsx` - Fixed bottom bar, `md:hidden`
    - 5 items: Dashboard, Properties, Incidents, Maintenance, Inspections
    - 56px touch targets, active indicator, safe-area-inset support
    - Integrated into 5 key pages (dashboard, properties, incidents, maintenance, inspections)
  - **Build**: 68 pages, 0 errors. Commits: `c398aa0` (quick wins), `a4545c1` (full features)

- **NDIS Complaints Compliance System (2026-02-08)** ✓ **MAJOR COMPLIANCE FEATURE**
  - **BLS-SOP-001 Document**: Formal 5-step complaints resolution procedure (v2026.1)
    - 5-step lifecycle: Receipt & Triage, Acknowledgement, Investigation, Resolution, Closing & Learning
    - Mandatory callouts for Reportable Incidents (24hr NDIS Commission notification)
    - Compliance contacts: NDIS Commission (1800 035 544), Director BLS
  - **Backend** (`convex/complaints.ts`):
    - `submitFromWebsite` - Public mutation for BLS website intake (no auth, CORS-enabled)
    - `create` - Staff complaints with auto-generated ref numbers (CMP-YYYYMMDD-XXXX)
    - Full status lifecycle: acknowledge, resolve, escalate, close
    - `logView`, `logProcedurePdfOpened` - Audit trail for NDIS compliance evidence
    - `updateChecklistStep` - Interactive SOP-001 checklist with per-step audit logging
    - `getChainOfCustody` - Filtered audit trail per complaint
    - `checkOverdueAcknowledgments` / `checkOverdueResolutions` - Cron jobs for deadline enforcement
    - `notifyStaffOfNewComplaint` - Resend email with HTML template
    - `autoCreateForComplaint` - Auto-links to Communications module
  - **Schema**: referenceNumber, source, isLocked, acknowledgmentDueDate, resolutionDueDate, complianceChecklist, 3 new alert types, 3 new indexes
  - **Frontend**: List page, detail page (2-column with sidebar), new complaint form
  - **SOP-001 Overlay** (`src/components/compliance/SOP001Overlay.tsx`): Full-screen procedure overlay
  - **Compliance Dashboard Guide**: Updated with BLS-SOP-001 5-step lifecycle, 24hr acknowledgment
  - **API Route** (`src/app/api/complaints/submit/route.ts`): POST endpoint for BLS website
  - **Crons**: `check-complaint-acknowledgments` (2 AM), `check-complaint-resolutions` (2:30 AM)
  - **Build**: 68 pages, 0 errors
- **Build Fixes (2026-02-08)** ✓
  - Fixed `pushSubscriptions.ts` circular type inference
  - Fixed `Uint8Array` buffer type in push subscription
  - Excluded `worker/` from tsconfig to fix ServiceWorker type conflict
  - Added `complaint_resolution_overdue` alert type to schema

- **Sprint 1 & 2 Complete: Multi-Tenant SaaS Foundation (2026-02-08)** ✓ **CRITICAL MILESTONE**
  - **Sprint 1 - Organizations Infrastructure**:
    - Created `organizations` table with plan tiers (starter/professional/enterprise)
    - Added `organizationId` field to `users` table
    - Built `convex/organizations.ts` with full CRUD (create, update, getById, getBySlug, getAll, getActive, deactivate, reactivate)
    - Created `requireTenant()` helper in `authHelpers.ts` - extracts user's organizationId for query scoping
    - Created `convex/seed.ts` with BLS org creation + user backfill scripts (idempotent)
    - Built `src/contexts/OrganizationContext.tsx` with `useOrganization` hook - plan limits, feature flags
    - Wired `OrganizationProvider` into `src/app/layout.tsx` (inside ConvexClientProvider)
  - **Sprint 2 - Query Refactoring for Tenant Isolation**:
    - Added `organizationId` field to **49 tables** in schema (all tables except users/orgs)
    - Added `by_organizationId` indexes to all 49 tables for efficient filtering
    - Refactored **26 backend files** (18 core + 8 supporting):
      - **Batch 1 (18 files)**: properties, participants, payments, maintenance, contractors, incidents, documents, alerts, inspections, dwellings, owners, preventative, communications (29 functions!), tasks, complaints, auditLog, certifications, quotes
      - **Batch 2 (8 files)**: supportCoordinators, silProviders, occupationalTherapists, maintenancePhotos, participantPlans, maintenanceQuotes, bankAccounts, bankTransactions
    - Updated **210+ queries/mutations** for tenant isolation:
      - All queries require `userId` parameter and filter by `organizationId` using `by_organizationId` index
      - All mutations add `organizationId` on insert and verify ownership on update/delete
      - Applied `requireTenant()` pattern consistently across all backend files
    - Made `auditLog.organizationId` **optional** for backward compatibility (was required, broke 117 TypeScript errors)
    - Fixed **destructuring errors** in 5 files (forgot to destructure `{ organizationId }` from `requireTenant()`)
  - **Architecture Pattern**:
    - Shared Convex database with row-level isolation via `organizationId`
    - All queries: `ctx.db.query("table").withIndex("by_organizationId", q => q.eq("organizationId", organizationId))`
    - Child entities inherit `organizationId` from parent (e.g., maintenancePhotos inherits from maintenanceRequest)
    - Internal mutations skip tenant checks (e.g., `autoCreateForIncident`, `autoCreateForComplaint`)
  - **Status**:
    - ✅ Backend: 100% complete - all 26 backend files tenant-scoped
    - ✅ Frontend: 100% complete - 64 files updated with userId parameter
    - ✅ Build: 82 pages, 0 TypeScript errors
  - **Files Modified**: 99 files total (35 backend + 64 frontend)
  - **Commits**: db8ab40 (backend), c9de9b7 (frontend)
- **Sprint 2 Frontend (2026-02-09)** ✅
  - Updated **64 frontend files** with `userId` parameter on all `useQuery` calls
  - **6 parallel Frontend Developer agents** (one per batch of 10-17 files)
  - Pattern: `useQuery(api.module.fn, user ? { userId: user.id as Id<"users"> } : "skip")`
  - Only refactored backend modules targeted (26 files with requireTenant)
  - Non-refactored modules (claims, reports, xero, etc.) left unchanged
  - Build: 82 pages, 0 errors. Commit c9de9b7.
- **Seed Script + Data Backfill (2026-02-09)** ✅
  - Created BLS organization via `seedBlsOrganization` mutation
  - Backfilled 3 users with `organizationId`
  - **Critical data recovery**: All 875 records across 49 tables backfilled with `backfillAllTablesOrganizationId`
  - Commit: 52b6223
- **Sprint 3: Stripe Integration + Registration (2026-02-09)** ✅
  - **Backend**: `convex/stripe.ts` - Checkout sessions, customer portal, webhook sync, plan enforcement
  - **Webhook**: `src/app/api/stripe/webhook/route.ts` - Handles checkout.session.completed, subscription updates, payment failures
  - **Registration**: `src/app/register/page.tsx` - Email, password, org name, plan selection
  - **Pricing**: `src/app/pricing/page.tsx` - 3-tier cards (Starter $250, Professional $450, Enterprise $600)
  - **Onboarding**: `src/app/onboarding/setup/page.tsx` - 4-step wizard (org details, first property, first participant, invite team)
  - **Plan Limits**: Enforced in `convex/stripe.ts` via `checkPlanLimit` helper
  - Build: 80 pages, 0 errors
- **Sprint 4: Brand Identity + Teal-600 (2026-02-09)** ✅
  - Replaced blue-500/600 with teal-600 (#0d9488) across the codebase
  - Updated `src/constants/colors.ts` with teal color palette
  - Updated `tailwind.config.ts` with brand color tokens
  - Updated `src/app/globals.css` with CSS custom properties
  - Marketing pages: Landing (`/`), Features (`/features`), About (`/about`), Contact (`/contact`)
  - Logo system with MySDAManager branding
- **Sprint 5: Navigation Redesign (2026-02-09)** ✅
  - Reorganized 14 flat nav items into 6 grouped dropdown clusters
  - Desktop: Hover-triggered dropdowns with smooth transitions
  - Mobile: BottomNav updated with grouped sections
  - Breadcrumbs on detail pages for deep navigation
  - Header component fully redesigned
- **Sprint 6: Super-Admin Dashboard (2026-02-09)** ✅
  - **Backend**: `convex/superAdmin.ts` (690 lines) - requireSuperAdmin, getAllOrganizations, getOrganizationDetail, getPlatformMetrics, getOrganizationUsers, toggleOrgActive, extendTrial, adjustPlanLimits, setSuperAdmin, impersonateOrganization
  - **Frontend**: `/admin/platform/page.tsx` (497 lines) - Platform overview with metrics, org list, search/filter
  - **Frontend**: `/admin/platform/[id]/page.tsx` (1069 lines) - Org detail with users, plan limits, activity, impersonation
  - Added `isSuperAdmin` to users table, `trialEndsAt` to organizations
  - khen set as first super-admin
  - Commit: 6eb3c83
- **Sprint 7: White-Label + REST API (2026-02-09)** ✅
  - **API Keys**: `convex/apiKeys.ts` (264 lines) - SHA-256 hashed keys (`msd_live_*`), CRUD, validation, revocation
  - **API Queries**: `convex/apiQueries.ts` (525 lines) - Tenant-scoped queries for REST API (listProperties, listParticipants, etc.)
  - **REST API v1**: `src/app/api/v1/` - 4 endpoints (properties, participants, maintenance, incidents) with auth middleware
  - **Organization Settings**: `/settings/organization/page.tsx` (461 lines) - Name, color picker, logo upload
  - **API Key Management**: `/settings/api-keys/page.tsx` (651 lines) - Create with permissions, revoke, copy-to-clipboard
  - Added `apiKeys` table to schema with indexes
  - Commit: a5cbf06
- **Sprint 8: Security Audit + Launch Prep (2026-02-09)** ✅
  - **Tenant Isolation Audit**: Added `requireTenant()` to 14 previously unscoped backend files (reports, claims, expectedPayments, incidentActions, insurancePolicies, ndisClaimExport, ownerPayments, payments, propertyMedia, vacancyListings, alerts, alertHelpers, silProviderPortal)
  - **Frontend Security**: Updated 13 pages to pass userId to newly-secured queries
  - **Error Boundaries**: Global `error.tsx`, `not-found.tsx`, `loading.tsx`
  - **Loading Skeletons**: 10 route-level loading states for instant navigation feedback
  - **Mobile Contrast**: Improved WCAG AA compliance across dashboard, operations, properties, incidents, BottomNav, Header, StatCard
  - Build: 80 pages, 0 errors. Commit: 667f4cb

## SaaS Transformation: COMPLETE

All 8 sprints of the SaaS transformation are complete.

| Sprint | Status | Completed |
|---|---|---|
| **0, 0.5, 0.75** | ✅ DONE | Stabilization, Document Intake, AI Analysis |
| **1** | ✅ DONE | Organizations table + tenant context |
| **2** | ✅ DONE | Query refactoring (backend 26 files + frontend 64 files) |
| **3** | ✅ DONE | Stripe integration + registration + onboarding |
| **4** | ✅ DONE | Brand identity (teal-600) + marketing pages |
| **5** | ✅ DONE | Navigation redesign (6 dropdown clusters) |
| **6** | ✅ DONE | Super-Admin Dashboard |
| **7** | ✅ DONE | White-Label + REST API v1 |
| **8** | ✅ DONE | Security audit + error boundaries + mobile contrast |

### Post-Sprint Enhancements (2026-02-09)
- **In-App SOP Help Guides**: HelpGuidePanel slide-in component with structured guides on 11 pages
  - 9 feature pages: incidents, maintenance, inspections, payments, documents, follow-ups, properties, participants, contractors
  - 2 compliance pages: complaints register, compliance certifications
  - Color-coded badges (RED/YELLOW/GREEN/TEAL), collapsible accordion sections
  - Files: `src/components/ui/HelpGuidePanel.tsx`, `HelpGuideButton.tsx`, `src/constants/helpGuides.ts`
- **Complaints Register PDF Export**: Functional Export PDF button generating landscape NDIS audit report
- **VAPID Keys Configured**: Push notification keys set in Convex env + Vercel production
- **Legal Pages**: `/terms` (Terms of Service) + `/privacy` (Privacy Policy) - APP-compliant, NDIS-specific
- **Sentry Error Tracking**: Client/server/edge configs, global error boundary, withSentryConfig in next.config.ts
- **Settings Gear Icon**: Added to desktop header (was only in mobile menu)
- **Participant Form Dropdowns**: SIL Provider + Support Coordinator linked to database with "Add New" option
- **WCAG Contrast Fix (Final)**: 39 files fixed, all text-gray-500/600 on dark backgrounds replaced with text-gray-400
- **ConfirmDialog Migration (Complete)**: All 40 remaining browser `alert()`/`confirm()` calls replaced with styled `useConfirmDialog()`. ConfirmDialog `alert()` enhanced to accept plain strings. Zero browser dialogs remain in codebase.
- **Database Page Cleanup**: Removed Properties and Participants tabs (redundant with main nav)
- **Multi-File Document Upload**: Lead creation form supports multiple document uploads
- **Dashboard Leads UI**: Property filtering fix + leads wired to backend

- **Field-Level Encryption Activated (2026-02-10)**: ENCRYPTION_KEY + HMAC_KEY set in Convex env, data migration confirmed (12 participants, 1 incident, 21 owners already encrypted)
- **SIL Provider Role Restriction (2026-02-10)**: SECURITY FIX - SIL Provider users now restricted to `/portal/*` routes only. RequireAuth auto-redirects to `/portal/dashboard`. Header nav filters Finance/Database clusters by role. Defense-in-depth: RequireAuth redirect + render block + nav filtering.
- **RequireAuth Full Migration (2026-02-10)**: Added RequireAuth to all 72 protected pages (was 40). Migrated 32 detail/creation/sub-pages from inline localStorage auth. Only public pages (login, register, pricing, etc.) and portal pages (own auth) remain without RequireAuth.

### Commercial Launch Prep (2026-02-11 to 2026-02-12)
- **Registration Backend Wired**: `/register` page now calls real Convex `registerOrganization` action + `checkSlugAvailability` query. Session created in localStorage after registration.
- **Click-Wrap Terms Modal**: `TermsAcceptanceModal.tsx` - full-screen non-dismissible modal on first login. 4 key clauses (NDIS disclaimer, health data, liability, security). 2 required checkboxes. Wired into RequireAuth. `acceptTerms` mutation in `convex/auth.ts`.
- **Legal Clauses Strengthened**: Terms of Service updated with 4 NDIS-specific clauses (NDIS disclaimer, APP health data, AES-256 encryption + 72hr NDB, NSW liability shield). Privacy Policy NDB timeline fixed.
- **Document Audit Logging**: `convex/documents.ts` create/remove mutations now log to audit trail.
- **Stripe GST Config**: `automatic_tax: { enabled: true }` + invoice footer with ABN placeholder.
- **Participant Consent Banners**: Teal APP 3 banners on `/participants/new` and `/participants/[id]/edit` with sensitive field tooltips.
- **Participant Consent Workflow**: Full lifecycle (record, renew, withdraw) with:
  - Schema: 8 consent fields on participants table, `consent_expiry`/`consent_missing` alert types
  - Backend: `recordConsent`, `withdrawConsent`, `renewConsent` mutations in `convex/participants.ts`
  - Withdrawal archives sensitive data (NDIS number, DOB, emergency contacts) while keeping tenancy records
  - Consent PDF: `src/utils/consentFormPdf.ts` - 2-page standard + 4-page appended Easy Read
  - Easy Read Consent PDF: 12-page NDIS Commission-style with 15 hand-drawn illustrations (person, house, clipboard, padlock, shield, calendar, phone, etc.), two-column layout, purple accents, word list
  - pdf-lib template system: `src/utils/easyReadConsentPdf.ts` + `easyReadFieldMap.ts` for future Canva template overlay with stock photos (falls back to jsPDF illustrated version)
  - Alerts: `generateConsentExpiryAlerts` (30-day warning, critical on expiry) + `generateConsentMissingAlerts` in daily cron
  - Dashboard: Consent status widget with active/expired/expiring/missing counts
  - Detail page: 4-state consent section (no consent, active, expired, withdrawn) with PDF generation
  - Creation: Consent step added to new participant form
- **Audit-Ready Compliance Export**: `src/utils/auditCompliancePdf.ts` (1,075 lines) - 7-section NDIS audit pack PDF (cover, certifications, incidents, complaints, participant plans, document expiry, audit log integrity). "Generate Audit Pack" button on Reports > Compliance tab.
- **Founder's Launch Dashboard**: `/admin/launch` - 15-item go-live checklist across 5 categories (Identity & Legal, Tax & Finance, Stripe, IP, NDIS Compliance). `convex/launchChecklist.ts` backend with progress tracking. Pre-checked items for completed tasks.
- **Postmark Inbound Email**: `src/app/api/mail/route.ts` - Inbound webhook creates communications from forwarded emails. Auto-recognizes stakeholders (SC, SIL, OT, contractor) by email/name. BLS Postmark hash address configured.
- **Outlook Add-in**: XML manifest + icons at `/outlook-addin/` for email-to-communication integration.
- **Communications Enhancements**: Expandable timeline cards, edit workflow for inbound emails, delete propagation fix, thread summary null safety fix.
- **Provider Settings Tenant Fix**: `convex/providerSettings.ts` was leaking org data between tenants - fixed with `requireTenant()` + `by_organizationId` index.
- **Staff Files Feature**: `/staff` - Employee records with NDIS screening compliance tracking.
- **Emergency Plans**: `/emergency-plans` - EMP and BCP pages for business continuity (BLS only).
- **Policies & Procedures Library**: `/policies` - Built-in policy documents with AI-generated summaries via Claude API.
- **AI Policy Summaries**: Claude API integration for auto-generating compliance policy summaries.
- **Maintenance Urgency Indicator**: Days-elapsed badge on maintenance request cards.
- **Certificate Document Upload**: Direct upload from Add Certification form.

### Capacitor Native App + Task Widget (2026-02-13)
- **Capacitor Setup**: `@capacitor/core`, `@capacitor/cli`, `@capacitor/ios`, `@capacitor/android`, `@capacitor/preferences`, `@capacitor/app`, `@capacitor/status-bar`
- **Widget REST API**: `src/app/api/v1/tasks/widget/route.ts` - GET tasks + POST complete, session-token auth via `_lib/sessionAuth.ts`
- **Convex Query**: `listWidgetTasks` in `convex/apiQueries.ts` - compact task list by assignee, supports assigned/overdue/upcoming filters
- **Token Bridge**: `src/lib/capacitorBridge.ts` - `storeTokenNative()`/`clearTokensNative()` with dynamic `@capacitor/preferences` import (no-op in browser)
- **Auth Integration**: `src/lib/auth.ts` modified to call bridge on storeTokens/logout/refresh
- **iOS Widget**: `ios/App/MyTasksWidget/` - 5 Swift files (WidgetKit + SwiftUI), 3 sizes (small/medium/large), 15-min refresh, App Groups token sharing
- **Android Widget**: `android/app/.../widget/` - 5 Kotlin + 7 XML files (AppWidget + RemoteViews), EncryptedSharedPreferences, dark theme
- **Capacitor Config**: `capacitor.config.ts` - live URL to `https://mysdamanager.com`, dark status bar
- **Manifest**: Added "My Tasks" shortcut to `public/manifest.json`
- **Build**: 94 pages, 0 errors
- **Remaining**: Add WidgetKit target in Xcode, register widget receiver in AndroidManifest, configure App Groups, submit to App Store / Play Store

### Participant Workflow + MTA Document (2026-02-13)
- **Save Incomplete Participant**: Yellow "Save Incomplete" button on `/participants/new` Step 1
  - Only requires firstName + lastName (all other fields optional)
  - Creates participant with `status: "incomplete"`, no dwellingId required
  - Auto-creates `profile_incomplete` alert for follow-up
  - Schema: `dwellingId` now `v.optional(v.id("dwellings"))`, `"incomplete"` + `"archived"` statuses added
  - Null guards added to `claims.ts`, `expectedPayments.ts`, `reports.ts`, `silProviderPortal.ts`
- **Incomplete Participant UI**: Orange "Incomplete" badge on list page, yellow banner on detail page
  - Filter dropdown includes "Incomplete" option
  - Banner: "This profile is incomplete. Complete the required details..."
- **Archive Participant**: Gray "Archive" button on detail page with ConfirmDialog confirmation
  - `archive` mutation with requirePermission("delete") check
  - `getAll` accepts `includeArchived` param, filters archived by default
  - "Archived" filter option + gray badge on list page
- **MTA Settings**: Collapsible panel on onboarding page (next to RRC Settings)
  - `updateMtaSettings` mutation in `convex/providerSettings.ts`
  - Fields: Daily MTA Rate, Support Item Number (default "01_082_0115_1_1")
  - Calculated totals: 90-day and monthly equivalents
- **MTA Schedule of Supports PDF**: Landscape A4 matching BLS template
  - Org-specific: name, ABN, phone, address, NDIS reg, logo from providerSettings + organization
  - Page 1: Org header, logo top-right, blue "Schedule of Supports" bar, participant info table, 5-column support table with dark header
  - Page 2: Service Agreement Signatures with participant + provider blocks
  - Org footer on both pages
  - MTA date inputs + plan manager name/email on onboarding page
- **Calendar Integration**: Internal calendar + Google/Outlook sync (Wave 1-4)
  - Schema: `calendarEvents` + `calendarConnections` tables
  - 4 views: Month, Week, Day, Agenda
  - Google Calendar: OAuth flow + 15-min sync cron
  - Outlook Calendar: OAuth flow + 15-min sync cron
  - Settings page: `/settings/integrations/calendar`
- **Build**: 100 pages, 0 errors

### AAH Policies + Multi-Org Policy Library (2026-02-14)
- **BlsGate Removed**: Policies & Procedures feature now accessible to ALL organizations (was BLS-only)
- **AAH Document Rebranding**: Python-docx find-and-replace pipeline rebrands BLS .docx files for any org
  - `policies-review/org_config.py` - Organization details + replacement maps (BLS, AAH)
  - `policies-review/generate_for_org.py` - CLI tool: `python generate_for_org.py AAH`
  - Handles paragraphs, tables, headers, footers, nested tables, cross-run text splits
  - Longest-first replacement ordering prevents partial matches
- **AAH Policy Records**: 40 policies seeded via `convex/seed.ts:seedAahPolicies`
  - Metadata: title, description, category, version, status, effectiveDate, reviewDueDate
  - Documents: 40 .docx files uploaded to Convex storage via `upload_policies.mjs`
  - Content: Full text extracted from .docx via `extract_docx_text.py` + `update_policy_content.mjs`
  - AI Summaries: Claude API generated summary + 8 key points per policy via `generate_summaries.mjs`
- **Multi-Org Design**: BLS + AAH get pre-loaded policies; other SaaS providers get empty section to upload their own
- **Build**: 103 pages, 0 errors

### Post-Launch Features + Config (2026-02-14)
- **Sentry Error Tracking Configured**: DSN + auth token set in Vercel production env vars, redeployed
- **Google Calendar OAuth Connected**: OAuth app at console.cloud.google.com, Calendar API enabled
  - Env vars set in both Convex + Vercel: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
  - Test user `kvhuynh79@gmail.com` added to OAuth consent screen
  - Calendar syncing automatically every 15 minutes + manual "Sync Now" button
- **Microsoft/Outlook Calendar OAuth**: Code ready, parked (MFA block on Azure portal for info@mmzbuildingsolutions.com.au)
- **AI Document Analysis PDF Support**: Claude API now accepts PDF uploads via `anthropic-beta: pdfs-2024-09-25` header
  - Modified: `convex/aiUtils.ts` (auto-detect PDF content, add beta header), `convex/aiDocumentAnalysis.ts` (removed PDF rejection), `convex/aiParsing.ts` (conditional beta header)
- **Command Palette (Ctrl+K)**: 40+ commands with fuzzy search, recent pages, keyboard navigation
  - `src/components/CommandPalette.tsx` - 9 actions + 31 pages across 8 categories
  - Opens via Ctrl+K, `/` key, or Header search button
  - Escape key fix: moved to global document listener for reliable closing
- **Per-Org Data Export**: Admin-only full data export to JSON
  - `convex/dataExport.ts` - parallel queries across 55+ tables, decrypts encrypted fields, strips secrets
  - `src/app/settings/data-export/page.tsx` - export button, record counts, file size
- **Outbound Webhooks**: Configurable per-org webhook system
  - `convex/webhooks.ts` (680 lines) - CRUD, HMAC-SHA256 signing, 12 event types, 3 retries, auto-disable
  - `src/app/settings/webhooks/page.tsx` (900 lines) - list, create, detail views with delivery history
  - Schema: `webhooks` + `webhookDeliveries` tables with indexes
  - Triggers wired into 6 backend files (10 events): participants, maintenanceRequests, incidents, payments, documents, inspections
- **CI/CD Pipeline**: GitHub Actions + Playwright E2E test infrastructure
  - `.github/workflows/ci.yml` - 4 jobs: typecheck, build (gate), lint, optional E2E
  - `playwright.config.ts` - Chromium-only, auth setup with session reuse
  - `tests/smoke.spec.ts` - login page, dashboard, 8 key pages, 4 public pages
  - `tests/navigation.spec.ts` - 17 routes verified, header presence, page navigation
  - `tests/auth.setup.ts` - real login or mock auth
- **Easy Read PDF Template System**: Upload custom PDF templates for consent forms
  - `src/utils/templatePdfOverlay.ts` (281 lines) - pdf-lib overlay engine with alignment, bold, wrap, color
  - `src/app/settings/templates/page.tsx` (631 lines) - upload, field position editor, JSON export/import
  - `convex/providerSettings.ts` - template upload/save/remove mutations
  - `src/utils/easyReadConsentPdf.ts` - 3-tier fallback: custom template → local template → jsPDF illustrations
- **Build**: 103 pages, 0 errors

### Marketing Sprint (2026-02-14)
- **Marketing Website**: 9 pages under `(marketing)` route group with shared layout
  - `MarketingHeader` (7 nav links + mobile hamburger) + `MarketingFooter` (trust badges, columns)
  - Features (27KB comprehensive), Security, About, Contact (with lead capture), FAQ, Compare, Blog
  - Landing page rewritten with "workaround replacement" positioning
  - Pricing page upgraded with shared MarketingHeader/Footer
- **SEO Infrastructure**: `robots.txt`, `sitemap.xml`, OG/Twitter image generation (`opengraph-image.tsx`, `twitter-image.tsx`)
  - `src/lib/seo.ts` - JSON-LD structured data generators (Organization, FAQ, Breadcrumb, BlogPosting)
  - Metadata on all pages with keywords, canonical URLs, Open Graph
- **Blog System**: `src/lib/blog.ts` with 6 articles across 4 categories
  - Categories: Compliance, Product Updates, Industry News, Best Practices
  - Components: `BlogPostGrid`, `BlogCategoryFilter`, `ShareButton`
  - Individual post pages at `/blog/[slug]` with related posts
- **Lead Capture**: `convex/marketingLeads.ts` - audit checklist PDF download captures email
  - `marketingLeads` table in schema with `by_organizationId` index
  - Email notification via Resend on every lead/inquiry submission (to admin)
  - Admin leads dashboard at `/admin/leads` with stats, search, source filters
- **Marketing Content** (in `marketing/` dir):
  - `brand-guidelines.md` - Comprehensive brand identity document
  - `linkedin-campaign-calendar.md` - 12-week LinkedIn content calendar
  - `email-sequences.md` - Nurture + onboarding email sequences
  - `outbound-playbook.md` - Outbound sales strategy
  - `social-media-kit.md` - Multi-platform social media content
  - `linkedin-authority-posts.md`, `linkedin-posts-audit-fear.md` - Ready-to-post LinkedIn content
- **Strategy Docs**: `COMPETITOR_ANALYSIS.md`, `SOCIAL_MEDIA_MARKETING.md`
- **Marketing Feature List**: `marketing/feature-list.md` - 12-category comprehensive feature document for website/pitch decks
- **Demo Org Seed**: `seedDemoOrg` internalMutation in `convex/seed.ts` - fictional "Horizon SDA Group" with 93 records (5 properties, 8 participants, 10 maintenance, 5 incidents, etc.)
  - Login: `demo@horizonsda.com.au` / `Demo2026!` (idempotent, checks slug before creating)
- **App Screenshots**: 26 desktop (1920x1080) + 78 social crops (LinkedIn/Twitter/Instagram) via Playwright
  - Script: `test_marketing_screenshots.py` | Output: `marketing/screenshots/` + `marketing/screenshots/social/`
  - 5 key screenshots served from `public/marketing/` for landing page
- **Landing Page Screenshot Sections**:
  - Hero dashboard screenshot below hero text with gradient fade
  - Sliding carousel gallery (5 screenshots: Dashboard, Properties, Participants, Incidents, Compliance)
  - CSS translateX transitions, left/right arrows on hover, dot indicators
- **Build**: 117 pages, 0 errors

### Remaining Launch Tasks (ALL EXTERNAL - No Code Needed)
- **Stripe Configuration**: Set STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, product/price IDs in Convex + Vercel env
- **Business Registration**: Register Pty Ltd with ASIC, apply for ABN, apply for Director ID
- **Stripe Business Account**: Create account, configure 10% GST, link to Xero
- **Trademark**: File with IP Australia for "MySDAManager" (Class 9 + 42)
- **Domain**: Secure .com.au under new ABN
- ~~**Performance**: Load test with 10+ simultaneous organizations~~ DONE (Grade A+, 180/180 queries, avg 283ms)
- **DNS**: Configure custom org subdomains (if needed)

## Reference Documents
- **Folio Summary / SDA Rental Statement** - Monthly landlord report showing:
  - Per-participant revenue breakdown
  - SDA Funding + RRC contributions
  - Less management fees
  - Monthly totals with grand total
  - Owner bank details for payment

## Feature Roadmap

### Completed (v1.0-v1.6)
1. Security enhancements - ✅ (RBAC, audit logging, sessions, validation)
2. MFA for admin accounts - ✅ (TOTP-based, backup codes, Settings UI)
3. Inspection PDF reports - ✅ (jsPDF + autoTable, getInspectionReport query)
4. Communications v1.5 - ✅ (soft delete, thread archive, incident auto-link)
5. Mobile PWA enhancements - ✅ (bottom nav, lock screen, offline inspections, push infra)
6. NDIS Complaints Compliance - ✅ (website intake, SOP-001, chain of custody)

### Completed (v2.0 - SaaS Transformation)
7. Multi-tenant architecture - ✅ Sprint 1-2 (organizations table + query isolation for 49 tables)
8. Stripe billing - ✅ Sprint 3 (checkout, webhooks, plan enforcement)
9. Brand identity - ✅ Sprint 4 (teal-600, marketing pages)
10. Navigation redesign - ✅ Sprint 5 (dropdown clusters)
11. Admin super-dashboard - ✅ Sprint 6 (platform metrics, org management, impersonation)
12. White-label + API - ✅ Sprint 7 (per-org branding, REST API v1, API keys)
13. Security audit + launch - ✅ Sprint 8 (tenant isolation audit, error boundaries, loading states)

### Completed (v2.1 - Post-Sprint Polish)
14. In-app SOP help guides - ✅ (11 pages with structured guides, HelpGuidePanel component)
15. Complaints Register PDF Export - ✅ (landscape NDIS audit report)
16. Legal pages - ✅ (Terms of Service + Privacy Policy, APP-compliant)
17. Sentry error tracking - ✅ (infrastructure ready, needs DSN)
18. Participant form dropdowns - ✅ (SIL Provider + SC from database with "Add New")
19. WCAG contrast final fix - ✅ (39 files, all dark-bg text-gray-500/600 → text-gray-400)
20. VAPID keys + push notification infra - ✅ (configured in Convex + Vercel)

### Completed (v2.2 - Commercial Launch Prep)
21. Participant Consent Workflow - ✅ (APP 3, Easy Read PDF with illustrations, expiry alerts)
22. Audit Compliance Export - ✅ (7-section PDF, "Generate Audit Pack" on Reports page)
23. Founder's Launch Dashboard - ✅ (15-item checklist, 5 categories)
24. Click-Wrap Terms Modal - ✅ (NDIS disclaimers, RequireAuth integration)
25. Registration Backend Wired - ✅ (real Convex calls, slug check, session creation)
26. Postmark Inbound Email - ✅ (email forwarding to communications)
27. Outlook Add-in Manifest - ✅ (XML manifest + icons)
28. Policies & Procedures Library - ✅ (built-in library with AI summaries)
29. Staff Files - ✅ (employee records, NDIS screening)
30. Emergency Plans - ✅ (EMP + BCP pages)
31. Easy Read Consent PDF - ✅ (12-page NDIS-style with 15 illustrations, two-column layout)

### Completed (v2.3 - Native Mobile Widget)
32. Capacitor Native App - ✅ (iOS + Android wrapper, live URL to mysdamanager.com)
33. Widget REST API - ✅ (session-token auth, GET tasks, POST complete)
34. iOS WidgetKit - ✅ (SwiftUI, 3 sizes, dark theme, 15-min refresh, deep links)
35. Android AppWidget - ✅ (RemoteViews, EncryptedSharedPreferences, dark theme)
36. Capacitor Token Bridge - ✅ (native token storage on login/logout/refresh for widget access)

### Completed (v2.4 - Participant Workflow + MTA Document)
37. Save Incomplete Participant - ✅ (yellow button on Step 1, only first/last name required, profile_incomplete alert)
38. Incomplete Participant Filter - ✅ (orange badge, filter on list page, yellow banner on detail page)
39. Archive Participant - ✅ (gray button with confirmation dialog, filtered from active lists, archived status filter)
40. MTA Settings - ✅ (daily rate + support item number, collapsible panel on onboarding page)
41. MTA Schedule of Supports PDF - ✅ (landscape A4, org-specific branding, 2-page with signature block)
42. Calendar Integration - ✅ (internal calendar, Google Calendar sync, Outlook Calendar sync, 4 views)
43. Optional dwellingId - ✅ (schema + null guards across claims, expectedPayments, reports, silProviderPortal)

### Completed (v2.4.1 - AAH Policies + Multi-Org Policy Library)
44. Open Policies to All Orgs - ✅ (removed BlsGate from both policy pages, all orgs can access Policies & Procedures)
45. AAH Policy Document Generation - ✅ (python-docx find-and-replace rebranding of 40 BLS .docx files to AAH branding)
46. AAH Policy Seeding - ✅ (40 policy records created in Convex DB with metadata, .docx files uploaded to storage)
47. AAH Policy Content Extraction - ✅ (full text extracted from 40 .docx files, populated `content` field for AI features)
48. AAH AI Summaries - ✅ (Claude API generated summaries + 8 key points for all 40 AAH policies)
49. Policy Tooling - ✅ (reusable scripts: `org_config.py`, `generate_for_org.py`, `extract_docx_text.py`, `upload_policies.mjs`, `update_policy_content.mjs`, `generate_summaries.mjs`)

### Completed (v2.5.0 - Post-Launch Features + Sentry + Google Calendar)
50. AI Document Analysis PDF Support - ✅ (Claude API `pdfs-2024-09-25` beta header, accepts PDF + image uploads)
51. Command Palette (Ctrl+K) - ✅ (40+ commands, fuzzy search, recent pages, keyboard nav, grouped categories, Escape fix)
52. Per-Org Data Export - ✅ (`convex/dataExport.ts`, admin-only, decrypts encrypted fields, strips secrets, JSON download)
53. Outbound Webhooks - ✅ (`convex/webhooks.ts`, HMAC-SHA256 signing, 12 event types, 3 retries, auto-disable after 10 failures)
54. CI/CD Pipeline - ✅ (GitHub Actions: typecheck, build, lint, optional Playwright E2E. `playwright.config.ts` + `tests/`)
55. Easy Read PDF Template System - ✅ (`src/utils/templatePdfOverlay.ts`, pdf-lib overlay, field position editor at `/settings/templates`)
56. Sentry Error Tracking Configured - ✅ (DSN + auth token set in Vercel env vars, redeployed)
57. Google Calendar OAuth Connected - ✅ (OAuth app created, env vars set in Convex + Vercel, calendar syncing via 15-min cron)

### Completed (v2.6.0 - Marketing Sprint + SEO + Blog)
58. Marketing Website - ✅ (9 pages: Features, Security, About, Contact, FAQ, Compare, Blog under `(marketing)` route group)
59. SEO Infrastructure - ✅ (robots.txt, sitemap.xml, OG/Twitter images, JSON-LD structured data, `src/lib/seo.ts`)
60. Blog System - ✅ (`src/lib/blog.ts`, 6 articles, 4 categories, search, share, individual post pages)
61. Lead Capture - ✅ (`convex/marketingLeads.ts`, audit checklist PDF download with email capture)
62. Landing Page Rewrite - ✅ (workaround-replacement messaging, consistent nav with all marketing pages)
63. Pricing Page Upgrade - ✅ (shared MarketingHeader/Footer, mobile hamburger menu)
64. Marketing Content - ✅ (brand guidelines, LinkedIn campaigns, email sequences, outbound playbook, social media kit)
65. Competitor Analysis - ✅ (`COMPETITOR_ANALYSIS.md`, `SOCIAL_MEDIA_MARKETING.md` strategy docs)
66. Marketing Feature List - ✅ (`marketing/feature-list.md`, 12-category benefit-focused feature document)
67. Demo Org Seed Data - ✅ (`seedDemoOrg` in `convex/seed.ts`, 93 records for fictional "Horizon SDA Group")
68. App Screenshots - ✅ (26 desktop + 78 social crops via Playwright, `marketing/screenshots/`)
69. Landing Page Screenshots - ✅ (hero dashboard image + sliding 5-screenshot carousel with arrows and dot nav)
70. Lead Notification + Dashboard - ✅ (Resend email on lead/inquiry capture, admin leads page at `/admin/leads` with stats/search/filters)
71. Load Test - ✅ (12 orgs, 180/180 queries, avg 283ms, Grade A+, tenant isolation verified)

### Post-Launch Tasks
72. **Social Media Marketing** - Execute content plan in `SOCIAL_MEDIA_MARKETING.md`. Sign up for Publer ($12/mo), set up 4 platforms (LinkedIn, Twitter/X, Facebook, Instagram), batch-create content using 5 content pillars, schedule 12 posts/week. See also `COMPETITOR_ANALYSIS.md` for positioning.
73. **Microsoft/Outlook Calendar OAuth** - Code ready, needs Azure app registration (blocked by MFA on Azure portal)
74. **Easy Read Canva Template** - Upload designed PDF template with stock photos to replace jsPDF illustrations
75. **App Store Submission** - Capacitor app ready, needs Android Studio + Play Store registration

## Phase 2: SaaS Subscription Model (COMPLETE 2026-02-09)
**Full execution plan:** `.claude/plans/transient-wobbling-floyd.md`
See [SAAS_BUSINESS_PLAN.md](SAAS_BUSINESS_PLAN.md) for business details.

### Summary
- **Brand**: MySDAManager (https://mysdamanager.com - SECURED)
- **Primary Color**: Teal-600 (#0d9488)
- Multi-tenant SaaS for SDA providers
- Stripe subscription billing: Starter $250/mo, Professional $450/mo, Enterprise $600/mo
- **Architecture**: Shared Convex DB with row-level isolation via `organizationId`
- **Status**: ALL 8 SPRINTS COMPLETE. 80 pages, 0 errors.

### Multi-Tenant Architecture
- `organizations` table with plan, Stripe IDs, settings, branding
- `requireTenant()` helper in authHelpers.ts for ALL queries
- `organizationId` field on ALL 49+ tables with indexes
- BLS seeded as first organization with 875 records backfilled
- **Readiness**: A (100% tenant isolation, security audit passed)

### Key Infrastructure
- **Super-Admin**: `convex/superAdmin.ts` - Platform management, impersonation, org health
- **REST API v1**: `src/app/api/v1/` - Properties, participants, maintenance, incidents
- **API Keys**: `convex/apiKeys.ts` - SHA-256 hashed, permission-scoped, rate-limited
- **Stripe**: `convex/stripe.ts` + `src/app/api/stripe/webhook/route.ts`
- **Registration**: `/register` + `/pricing` + `/onboarding/setup`
- **White-Label**: `/settings/organization` - Per-org branding

### Scaling Plan
| Scale | Users | Properties | Architecture |
|---|---|---|---|
| 1 provider (BLS) | ~5 | ~50 | Single deployment, no isolation needed |
| 5 providers | ~25 | ~250 | Row-level isolation, basic indexes |
| 20 providers | ~100 | ~1,000 | Compound indexes, monitor Convex usage |
| 100 providers | ~500 | ~5,000 | Convex Enterprise, data archival, caching |

### Launch Checklist (Remaining - All External/Config)
1. ~~Field-level encryption for NDIS numbers, DOB at rest~~ DONE (2026-02-10)
2. ~~Registration backend~~ DONE (2026-02-12)
3. ~~Legal compliance (Terms, Privacy, Click-wrap)~~ DONE (2026-02-12)
4. ~~Consent workflow~~ DONE (2026-02-12)
5. ~~Audit compliance export~~ DONE (2026-02-12)
6. Register Pty Ltd with ASIC + apply for ABN + Director ID
7. Create Stripe business account + configure GST + link Xero
8. Set Stripe env vars (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, price IDs)
9. ~~Set Sentry DSN (NEXT_PUBLIC_SENTRY_DSN, SENTRY_AUTH_TOKEN)~~ DONE (2026-02-14)
10. File trademark with IP Australia (Class 9 + 42)
11. Secure .com.au domain under new ABN
12. Load test with 10+ simultaneous organizations

## Commands
```bash
npm run dev          # Start development server
npx convex dev       # Start Convex backend
npm run build        # Production build
npx convex deploy    # Deploy Convex to production

# Capacitor (native app)
npx cap sync ios     # Sync web assets to iOS project
npx cap open ios     # Open Xcode
npx cap sync android # Sync web assets to Android project
npx cap open android # Open Android Studio
```

---
**Last Updated**: 2026-02-16 (v2.6.1 - Lead notification emails via Resend + admin leads dashboard. Competitor analysis + social media marketing plan. Load test passed A+. 117 pages, 0 errors.)
