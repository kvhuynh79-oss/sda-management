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

## Next Session Priorities
1. **Testing needed:**
   - Xero Integration - Connect and sync bank transactions (OAuth fixed, ready to test)
2. **Bug fixing** - Test all features, fix any issues
3. **Bulk data entry** - User will upload property/participant data

## Reference Documents
- **Folio Summary / SDA Rental Statement** - Monthly landlord report showing:
  - Per-participant revenue breakdown
  - SDA Funding + RRC contributions
  - Less management fees
  - Monthly totals with grand total
  - Owner bank details for payment

## Future Roadmap (Priorities)
1. Security enhancements (2FA, audit logging)
2. Inspection PDF reports

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
**Last Updated**: 2026-02-02
