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
4. **Property Inspections** - Mobile-optimized checklists (BLS template)
5. **Payments** - Track SDA payments and generate NDIS export files
6. **Documents** - Store documents with expiry tracking
7. **Alerts** - Automated alerts for expiries, vacancies, maintenance
8. **Reports** - Compliance, financial, and contractor reports

## Project Structure
```
src/app/                    # Next.js pages
├── dashboard/              # Main dashboard
├── properties/             # Property CRUD + detail pages
├── participants/           # Participant management
├── payments/               # Payment tracking + NDIS export
├── maintenance/            # Maintenance requests
├── inspections/            # Property inspection checklists (NEW)
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
├── inspections.ts          # Inspection system (NEW)
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
- `preventativeSchedule` - Scheduled maintenance tasks
- `documents` - Uploaded documents
- `alerts` - System-generated alerts
- `incidents` - Incident reports
- `incidentPhotos` - Photos for incidents
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

## Next Session Priorities
1. **Bug fixing** - Test all features, fix any issues
2. **Bulk data entry** - User will upload property/participant data
3. **Owner reports** - Reference the Folio Summary format for 6-month reports

## Reference Documents
- **Folio Summary / SDA Rental Statement** - Monthly landlord report showing:
  - Per-participant revenue breakdown
  - SDA Funding + RRC contributions
  - Less management fees
  - Monthly totals with grand total
  - Owner bank details for payment

## Future Roadmap (Priorities)
1. PWA for mobile (offline, install prompt)
2. Custom domain (betterlivingsolutions.com.au)
3. Security enhancements (2FA, audit logging)
4. AI integration (NDIS plan parsing, document classification)
5. Inspection PDF reports

## Commands
```bash
npm run dev          # Start development server
npx convex dev       # Start Convex backend
npm run build        # Production build
npx convex deploy    # Deploy Convex to production
```

---
**Last Updated**: 2026-01-29
