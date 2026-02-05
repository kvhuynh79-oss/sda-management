# SDA Management App - Real-World Use Cases & Features

## About the App
**MySDAManager** is a comprehensive property and participant management system for **Better Living Solutions**, an Australian SDA (Specialist Disability Accommodation) provider managing NDIS-funded properties.

## User Personas

### 1. Property Manager (Primary User)
- **Role**: Manages day-to-day operations of SDA properties
- **Needs**: Track vacancies, maintenance, participant plans, compliance deadlines
- **Daily tasks**: Log communications, create maintenance requests, monitor alerts

### 2. Admin/Director
- **Role**: Oversees business operations and compliance
- **Needs**: Financial reports, compliance monitoring, audit trails
- **Daily tasks**: Review financial reports, check compliance status, approve major decisions

### 3. Accountant
- **Role**: Manages financial records and NDIS claims
- **Needs**: Payment tracking, NDIS export files, owner reports
- **Daily tasks**: Process payments, generate NDIS claim files, create owner folio summaries

### 4. SIL Provider (Portal User)
- **Role**: External Supported Independent Living provider
- **Needs**: View assigned properties, log incidents, submit maintenance requests
- **Portal access**: Limited view of their properties only

---

## Real-World Use Cases

### Use Case 1: New Participant Move-In
**Scenario**: Faith Tofilau is moving into a High Physical Support dwelling in Smithfield.

**Workflow**:
1. **Property Setup** → Create property "123 Smith Street, Smithfield"
2. **Dwelling Setup** → Add dwelling (Apartment 2, HPS, 1 bedroom)
3. **Participant Registration** → Add Faith with NDIS number, support coordinator details
4. **NDIS Plan Entry** → Record plan dates, SDA funding amount, design category
5. **Document Upload** → Attach NDIS plan PDF, OT report, lease agreement
6. **Alert Creation** → System auto-generates alert for plan expiry in 11 months
7. **Payment Tracking** → Log monthly SDA payments + RRC (rent contribution)

**Features Used**: Properties, Participants, Participant Plans, Documents, Alerts, Payments

---

### Use Case 2: Reactive Maintenance Request
**Scenario**: Broken hot water system at Faith's dwelling - requires urgent contractor quote.

**Workflow**:
1. **Log Maintenance Request** → Create MR with priority "Urgent", category "Plumbing"
2. **Add Photos** → Upload photos of broken hot water system
3. **Send Quote Requests** → Email 3 plumbers from contractor database
4. **Contractor Submits Quote** → Plumber clicks email link, fills public quote form
5. **Review & Approve** → Compare 3 quotes, select best option
6. **Track Completion** → Update MR status to "Completed", add completion photos
7. **Payment Record** → Log contractor invoice in payments

**Features Used**: Maintenance Requests, Contractors, Quote Requests, Maintenance Photos, Payments

---

### Use Case 3: NDIS Plan Renewal Chase
**Scenario**: Faith's NDIS plan expires in 30 days, need to chase Support Coordinator for renewal.

**Workflow**:
1. **Alert Triggers** → System generates "Plan Expiring Soon" alert
2. **Log Communication** → Record email sent to Support Coordinator Simon Gatt
3. **Attach Document** → Upload funding renewal request letter as PDF
4. **Create Follow-up Task** → "Chase SC for plan approval" - Due: 7 days, Priority: High
5. **Update Task Status** → Mark "In Progress" when SC responds
6. **Complete Task** → Mark "Completed" with notes when new plan received
7. **Update Plan** → Enter new plan dates and funding amounts

**Features Used**: Alerts, Follow-ups (Communications), Tasks, Documents, Participant Plans

---

### Use Case 4: Monthly Owner Folio Report
**Scenario**: Generate monthly revenue report for property owner/investor.

**Workflow**:
1. **Go to Reports** → Navigate to Owner Reports
2. **Select Owner** → Choose property owner "John Smith Properties Pty Ltd"
3. **Select Date Range** → Last 6 months (Jan-Jun 2026)
4. **Generate PDF** → System creates Folio Summary showing:
   - Per-participant breakdown (Faith: SDA $2,500 + RRC $450 = $2,950)
   - Monthly totals
   - Less: Management fee (10% = $295)
   - Net payment to owner: $2,655/month
   - Owner bank details for transfer
5. **Email Report** → Send PDF to owner

**Features Used**: Reports, Payments, Properties, Owners, Participants

---

### Use Case 5: Property Inspection (Mobile)
**Scenario**: Quarterly property inspection at Smithfield - using phone on-site.

**Workflow**:
1. **Open on Mobile** → Access via PWA (installed on phone)
2. **Start Inspection** → Select "BLS Quarterly Inspection" template
3. **Walk Through Property** → Check items on checklist:
   - Fire alarm tested ✓
   - Smoke detectors working ✓
   - Ramps/accessibility clear ✓
   - Hot water temperature safe ✓
4. **Take Photos** → Add photos for any issues found
5. **Mark Issues** → Flag "Cracked tile in bathroom" as maintenance needed
6. **Submit Inspection** → Save inspection with timestamp
7. **Auto-Create MR** → System creates maintenance request for cracked tile

**Features Used**: Inspections, Inspection Templates, Inspection Photos, Properties

---

### Use Case 6: Incident Reporting (24-Hour NDIS Compliance)
**Scenario**: Faith had a fall in her dwelling - requires NDIS incident report within 24 hours.

**Workflow**:
1. **Log Incident** → Create incident report immediately
   - Type: "Injury to participant"
   - Severity: "Major" (triggers 24-hour NDIS notification requirement)
   - Description: "Faith slipped in bathroom, possible wrist fracture"
2. **Add Photos** → Upload photos of scene (wet floor)
3. **Record Actions Taken** → "Called ambulance, Faith taken to hospital"
4. **NDIS Notification** → System flags "24-hour notification required"
5. **Create Incident Action** → "Install grab rail in bathroom"
   - Type: "Contractor" (assign to maintenance request)
   - Priority: "High"
6. **Send to NDIS** → Generate NDIS incident report PDF
7. **Follow-up** → Create task to check on Faith's recovery

**Features Used**: Incidents, Incident Photos, Incident Actions, Maintenance Requests, Compliance Dashboard

---

### Use Case 7: NDIS Payment Export for Claims
**Scenario**: End of month - submit SDA claims to NDIS for payment.

**Workflow**:
1. **Go to Payments** → Navigate to NDIS Export page
2. **Select Period** → Choose month (e.g., January 2026)
3. **Review Payments** → System shows all participants with claims:
   - Faith Tofilau: $2,500 SDA (31 days occupied)
   - Status: "Not Claimed"
4. **Generate Export File** → Create NDIS-compliant CSV file
5. **Download** → Export contains:
   - Participant NDIS number
   - Claim amount
   - Date range
   - Support item number
6. **Upload to NDIS Portal** → Submit via NDIS Provider Portal
7. **Mark as Claimed** → Update status in system

**Features Used**: Payments, NDIS Export, Participants

---

### Use Case 8: Preventative Maintenance Schedule
**Scenario**: Set up quarterly smoke alarm testing for all properties.

**Workflow**:
1. **Create Schedule Template** → "Smoke Alarm Testing"
   - Frequency: Quarterly
   - Category: "Safety/Compliance"
2. **Assign to Properties** → Apply to all 15 properties
3. **System Auto-Creates Tasks** → Generates maintenance requests automatically every 3 months
4. **Contractor Assignment** → Assign standing contractor "Fire Safety Experts"
5. **Email Notifications** → Contractors receive automatic reminders 7 days before due date
6. **Track Completion** → Mark each property complete as testing is done

**Features Used**: Preventative Schedule, Maintenance Requests, Contractors, Notifications

---

### Use Case 9: Vacancy Management & Marketing
**Scenario**: Dwelling becomes vacant - need to advertise and find new participant.

**Workflow**:
1. **Update Dwelling Status** → Mark as "Vacant" (triggers vacancy alert)
2. **Create Listing** → Add to Vacancy Listings with:
   - Photos of property
   - Design category: "High Physical Support"
   - Available from: 01-Mar-2026
   - Monthly SDA funding: $2,500
3. **Generate Listing PDF** → Create marketing material
4. **Send to Support Coordinators** → Email SCs in database
5. **Track Applications** → Log communications with potential participants
6. **Onboarding** → When participant selected, upload onboarding documents
7. **Move-In** → Update dwelling status to "Occupied", create participant record

**Features Used**: Dwellings, Vacancy Listings, Support Coordinators, Communications, Documents

---

### Use Case 10: Audit Trail for Compliance Review
**Scenario**: NDIS Quality & Safeguards Commission requests audit of data changes.

**Workflow**:
1. **Go to Audit Log** → Admin access only
2. **Filter by Entity** → Select "Participants"
3. **Filter by Date** → Last 12 months
4. **Review Changes** → See complete history:
   - User: "Jane Smith" changed Faith's plan end date
   - Timestamp: 2026-01-15 14:23:45
   - Old value: "2026-06-30"
   - New value: "2026-12-31"
   - IP Address: 192.168.1.100
5. **Export Report** → Generate audit trail PDF
6. **Submit to Commission** → Provide evidence of data integrity

**Features Used**: Audit Logs, User Management, Security & Compliance

---

### Use Case 11: Multi-Property Owner Statement
**Scenario**: Investor owns 5 properties - wants consolidated quarterly report.

**Workflow**:
1. **Owner Dashboard** → View all properties owned by "Smith Property Group"
2. **Financial Summary** → See aggregate stats:
   - Total monthly revenue: $12,450
   - Total participants: 8
   - Vacancy rate: 10% (1 vacant dwelling)
3. **Generate Report** → 6-month consolidated folio showing:
   - Property 1 (Smithfield): $2,950/month
   - Property 2 (Townsville): $2,100/month
   - ... (5 properties total)
   - Grand total: $74,700 (6 months)
   - Less: Management fees (10%): $7,470
   - Net payment: $67,230
4. **Payment Distribution** → Record bank transfers to owner
5. **Tax Documentation** → Export for owner's accountant

**Features Used**: Owners, Properties, Payments, Reports, Owner Distributions

---

### Use Case 12: Xero Bank Reconciliation
**Scenario**: Match bank transactions to SDA payments for accounting.

**Workflow**:
1. **Connect Xero** → OAuth integration with Xero account
2. **Import Transactions** → Sync bank account transactions
3. **Auto-Match** → System suggests matches:
   - Bank deposit $2,500 → Faith's SDA payment (Jan 2026)
   - Confidence: High
4. **Review Matches** → Approve or adjust
5. **Identify Variances** → Flag unmatched transactions
6. **Create Reconciliation Report** → Export matched/unmatched for accountant
7. **Sync to Xero** → Push matched transactions back to Xero

**Features Used**: Xero Integration, Bank Accounts, Bank Transactions, Payments

---

## Feature Summary by Category

### 1. Property Management
- **Properties** - SDA and SIL properties with owner details, bank info
- **Dwellings** - Individual units within properties (addresses, design categories)
- **Owners** - Investor/landlord management with bank details
- **Vacancy Listings** - Market vacant dwellings, track applications

### 2. Participant Management
- **Participants** - NDIS participant profiles with contact details
- **Participant Plans** - NDIS plan dates, funding amounts, design categories
- **Support Coordinators** - SC database with participant links
- **Occupational Therapists** - OT database for SDA assessments

### 3. Financial Management
- **Payments** - SDA payment tracking, RRC contributions
- **NDIS Export** - Generate NDIS claim files for submission
- **Owner Reports** - Folio summaries showing revenue breakdown
- **Owner Distributions** - Track payments to property owners
- **Bank Accounts** - Manage multiple bank accounts
- **Bank Transactions** - Import and reconcile transactions
- **Xero Integration** - Two-way sync with Xero accounting

### 4. Maintenance & Contractors
- **Maintenance Requests** - Reactive and preventative work orders
- **Contractors** - Trade contractor database
- **Quote Requests** - Email contractors, receive quotes via public link
- **Maintenance Photos** - Photo documentation for work orders
- **Preventative Schedule** - Automated recurring maintenance tasks

### 5. Compliance & Safety
- **Inspections** - Property inspection checklists (mobile-optimized)
- **Incidents** - NDIS incident reporting with 24-hour flagging
- **Incident Actions** - Remediation actions for incidents
- **Documents** - Store docs with expiry tracking (NDIS plans, leases, OT reports)
- **Alerts** - Automated alerts for expiries, vacancies, maintenance
- **Compliance Dashboard** - NDIS guides for incident reporting, complaints, certifications
- **Audit Logs** - Complete audit trail of all data changes

### 6. Communication & Tasks
- **Communications** - Log emails, SMS, phone calls, meetings
- **Tasks** - Follow-up tasks with priority, due dates, categories
- **Follow-ups Page** - Task management with collapsible communications

### 7. Reporting & Analytics
- **Dashboard** - Key metrics, task stats, upcoming deadlines
- **Reports** - Financial, compliance, and contractor reports
- **Operations Dashboard** - Vacancy rates, occupancy stats, maintenance metrics

### 8. User Management & Security
- **Users** - Role-based access (Admin, Property Manager, Staff, Accountant, SIL Provider)
- **Authentication** - Login with bcrypt password hashing
- **Permissions** - Granular permissions by resource and role
- **Audit Logging** - Track all CRUD operations with user/timestamp

### 9. Third-Party Integrations
- **Email (Resend)** - Send quote requests, notifications, reports
- **SMS (Twilio)** - SMS notifications and alerts
- **Xero** - Accounting integration for bank reconciliation

### 10. Portal (External Access)
- **SIL Provider Portal** - Limited view for SIL providers to:
  - View assigned properties
  - Log incidents
  - Submit maintenance requests
  - View documents

---

## Key Business Concepts

### SDA (Specialist Disability Accommodation)
- NDIS-funded housing for people with extreme functional impairment or high support needs
- Design categories: Improved Liveability, Fully Accessible, Robust, High Physical Support

### Revenue Model (per participant)
- **SDA Funding**: NDIS pays provider monthly (e.g., $2,500/month)
- **RRC (Reasonable Rent Contribution)**: Participant contributes:
  - 25% of Disability Support Pension
  - 100% of Commonwealth Rent Assistance
  - Total: ~$400-500/month
- **Less: Provider Fee**: Management percentage (typically 10%)
- **Net to Owner**: Remaining amount paid to property investor

### SIL (Supported Independent Living)
- Different from SDA - provides support services, not accommodation
- SIL properties in the app are managed separately (different funding model)

### NDIS Compliance Requirements
- **24-Hour Incident Reporting**: Major incidents must be reported to NDIS within 24 hours
- **5-Day Incident Reporting**: Less serious incidents within 5 business days
- **Document Retention**: Keep all records for 7 years
- **Plan Management**: Track NDIS plan dates and ensure continuous funding

---

## Typical Daily Workflow (Property Manager)

**Morning**:
1. Check **Dashboard** for alerts and overdue tasks
2. Review **Tasks** - follow up on urgent items
3. Check **Alerts** - any plan expiries or maintenance deadlines

**Throughout Day**:
4. Log **Communications** - record calls/emails with SCs, participants, contractors
5. Create **Maintenance Requests** - respond to participant issues
6. Review **Quote Requests** - approve contractor quotes
7. Update **Task Status** - mark completed tasks

**End of Month**:
8. Generate **NDIS Export** - submit SDA claims
9. Create **Owner Reports** - send folio summaries
10. Review **Compliance Dashboard** - ensure all certifications current

---

## Technology Notes
- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS (dark theme)
- **Backend**: Convex (serverless, real-time data)
- **PWA**: Installable on mobile for on-site inspections
- **Domain**: https://mysdamanager.com
- **Multi-tenant ready**: Designed for SaaS transformation

---

**This document provides real-world context for understanding how the SDA Management app is used in daily operations.**
