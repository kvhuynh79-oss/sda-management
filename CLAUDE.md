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

## Current Version: v1.2.0

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
- User stored in localStorage as `sda_user` (temporary auth)
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

## Next Session Priorities
1. **Testing needed:**
   - Xero Integration - Connect and sync bank transactions (OAuth fixed, ready to test)
2. **Bug fixing** - Test all features, fix any issues
3. **Bulk data entry** - User will upload property/participant data
4. **Frontend Refactoring (remaining pages):**
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
1. Security enhancements - ✅ Audit logging implemented, row-level security helpers created
2. Proper authentication (Clerk) - Replace localStorage auth with proper auth provider
3. 2FA - Implement via Clerk when auth migration complete
4. Inspection PDF reports

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
**Last Updated**: 2026-02-03
