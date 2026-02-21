# MySDAManager -- Complete Feature List

> **The only platform built from the ground up for SDA property management and NDIS compliance.**
>
> Every tool on the market today was built for something else and adapted sideways. Rostering tools. Billing tools. Generic property management software. MySDAManager replaces the workaround. One platform. Every SDA property. Audit-ready from day one.

---

## 1. Dashboard & Real-Time Overview

**See everything that matters the moment you log in.**

- Live property portfolio: total properties, dwellings, occupancy rate, vacancy count
- Task tracker: open tasks, overdue count, urgent follow-ups, funding tasks
- Compliance snapshot: expired certifications, expiring documents, missing consents
- Quick actions: add property, add participant, log maintenance, report incident, create task
- Recent activity feed: latest maintenance, upcoming tasks, property updates, consent status
- Five semantic sections: Property Portfolio, Tasks & Follow-ups, Operations, Quick Actions, Recent Activity
- Role-based view: admins see everything, property managers see their portfolio, SIL providers see their portal

---

## 2. Property & Dwelling Management

**Every SDA property. Every dwelling. Every detail. In one place.**

- Unlimited property records with street address, suburb, state, postcode
- Four SDA design categories: High Physical Support, Robust, Fully Accessible, Improved Liveability
- Multi-dwelling support: track individual units within a property (dwelling number, bedrooms, bathrooms, SDA category per unit)
- Property status workflow: Active, Under Construction, Planning, SIL Property
- Ownership types: Investor, Self-Owned, SIL-Managed
- Owner/landlord management with encrypted bank details (BSB, account number -- AES-256-GCM at rest)
- Real-time occupancy tracking: see who lives in each dwelling, vacancy status, days vacant
- NDIA 5-day vacancy notification compliance tracking
- SIL property support: optional owner details, SIL Provider linked from database, hidden SDA-specific fields
- Property filtering: status, state, SDA category, occupancy, search
- Property detail page: dwellings, participants, owner info, documents, maintenance history, communications history
- Property media uploads: photos, floor plans, site maps

---

## 3. Participant Management

**NDIS participant profiles with plan tracking, encryption, and flexible workflows.**

- Comprehensive participant profiles: name, NDIS number, date of birth, contact details, emergency contacts
- Field-level encryption: NDIS numbers, dates of birth, and emergency contacts encrypted at rest (AES-256-GCM with HMAC-SHA256 blind indexes for search)
- NDIS plan tracking: plan start/end dates, funding amounts, plan manager details, SDA funding line items
- Plan expiry alerts: 90-day, 60-day, and 30-day warnings before plan end date
- Dwelling placement: link participants to specific dwellings with move-in/move-out dates
- Support coordinator linking: assign SC from database with contact auto-population
- SIL provider linking: assign SIL provider from database
- Occupational therapist linking: assign OT from database with AHPRA number tracking
- Incomplete participant workflow: save a profile with just first and last name before full NDIS data is available. Yellow "Save Incomplete" button on step 1. Auto-creates follow-up alert
- Archive participant: soft archive with confirmation dialog. Archived participants filtered from active lists but never deleted
- Status filtering: Active, Incomplete, Archived
- Participant search: filter by name, NDIS number (blind index search on encrypted data), dwelling, status

---

## 4. Participant Consent Workflow

**APP 3 compliant consent lifecycle. Record, renew, withdraw. With Easy Read PDFs.**

- Full consent lifecycle: Record Consent, Renew Consent, Withdraw Consent
- Australian Privacy Principles (APP 3) compliance: consent clauses cover collection, use, disclosure, storage, access, correction
- Consent status tracking: No Consent, Active, Expired, Withdrawn
- Consent expiry alerts: 30-day warning before annual consent expires, critical alert on expiry date
- Consent missing alerts: flagged on participants with no consent recorded
- Standard consent PDF: 2-page professional document with participant details, consent clauses, signature blocks, privacy information sheet
- Easy Read consent PDF: 12-page NDIS Commission-style document with 15 hand-drawn illustrations, two-column layout, purple accents, word list explaining key terms
- Custom template upload: upload a professionally designed PDF template (from Canva, InDesign, etc.), map field positions, overlay dynamic participant data using pdf-lib
- Three-tier PDF fallback: custom template (if uploaded) -> local template file -> jsPDF illustrated version
- Consent withdrawal: archives sensitive data (NDIS number, DOB, emergency contacts) while preserving tenancy records for continuity
- Dashboard widget: active consents, expired, expiring soon, missing counts
- Detail page: consent section shows current status with generate PDF / record / renew / withdraw actions

---

## 5. Financial Management

**SDA payments, RRC calculations, Xero sync, NDIS PACE export, and owner reports.**

- SDA payment tracking: record monthly SDA payments per participant with amounts, dates, status
- RRC (Reasonable Rent Contribution) calculations: 25% of Disability Support Pension + 100% of Commonwealth Rent Assistance
- Provider fee deduction: management percentage deducted from total
- Payment status workflow: Draft, Submitted, Approved, Paid
- Variance detection: payments exceeding $500 variance from expected amount trigger automatic alerts
- Duplicate detection: prevents recording the same payment twice (participant + date check)
- Plan expiry validation: blocks payment creation if participant NDIS plan has expired
- NDIS PACE export: generate claim export file in PACE format for bulk submission
- Expected payment generation: monthly cron job on the 1st generates expected SDA, RRC, and owner disbursement amounts
- Owner Folio Summary (SDA Rental Statement): 6-month landlord report showing per-participant revenue breakdown, SDA Funding + RRC contributions, management fee deductions, monthly totals, grand total, owner bank details
- Bank account management: track BSB, account number, bank name per owner (encrypted at rest)
- Xero integration: OAuth connection, sync invoices and payments, per-org Xero accounts
- Payment filtering: by participant, property, status, date range
- Financial reports: payment summary, outstanding payments, cost analysis, payment distributions

---

## 6. Maintenance & Contractors

**Reactive and preventative maintenance. Quote workflows. Contractor tracking.**

- Reactive maintenance requests: create with title, description, property, dwelling, priority, category
- Four priority levels: Emergency, High, Medium, Low
- Seven categories: Plumbing, Electrical, Appliances, Building, Grounds, Safety, General
- Status workflow: Reported -> Awaiting Quotes -> Quoted -> Approved -> Scheduled -> In Progress -> Completed
- Photo uploads: attach multiple photos per maintenance request as evidence
- Days-elapsed urgency indicator: visual badge showing how long a request has been open
- Quote request workflow: email contractors directly from the platform with job details. Contractors submit quotes via a public link (no login required)
- Quote comparison: review multiple contractor quotes side-by-side, approve the best one
- Preventative maintenance: create recurring scheduled tasks (weekly, monthly, quarterly, annually)
- Preventative schedule: calendar view of upcoming scheduled maintenance, overdue alerts
- 30-day cost forecast: estimated upcoming maintenance costs
- Contractor database: name, trade, ABN, license number, insurance details, expiry dates, contact info, rating
- Contractor performance tracking: jobs completed, average response time, ratings
- Maintenance detail page: full timeline with photos, quotes, status changes, linked communications
- Maintenance reports: overview, cost analysis, contractor performance

---

## 7. Property Inspections

**Mobile-optimised checklists. Photo capture. Offline support. PDF reports.**

- Inspection templates: create reusable checklists (BLS template pre-loaded) with categories and items
- Custom checklists: define your own inspection categories and items per template
- Mobile-optimised interface: designed for tablet and phone use in the field
- Per-item status: Pass, Fail, N/A for each checklist item
- Photo capture: attach photos per inspection item directly from device camera
- Notes per item: add context or comments to individual checklist items
- Inspection status: Draft, In Progress, Completed
- Completion rate tracking: percentage of items checked, pass rate
- PDF report generation: one-click PDF with photos, category summaries, pass/fail rates, overall score
- Offline inspections: complete full inspections without internet. Data saved to device (IndexedDB), auto-syncs when connection restored
- Inspection history: view all past inspections per property with dates, scores, templates used
- Inspection listing: filter by property, status, date range, template

---

## 8. Incident Reporting & Compliance

**24-hour NDIS notification tracking. Offline forms. Chain of custody. Remediation actions.**

- Four severity levels: Critical, Major, Moderate, Minor
- NDIS reportable incident flagging: mark incidents that require NDIS Commission notification
- 24-hour notification countdown: automatic timer for critical NDIS-reportable incidents
- 5-day notification tracking: extended tracking for major incidents
- Incident categories: abuse, neglect, injury, death, restrictive practice, property damage, other
- Photo and video evidence: attach multiple media files per incident
- Encrypted witness statements: witness details stored with field-level encryption
- Offline incident reporting: save incident forms to device (IndexedDB) when there is no internet. Auto-sync when connection restored with retry logic and exponential backoff
- Incident actions: define remediation steps, assign to contractor (creates maintenance request) or in-house team
- Action status tracking: Pending, In Progress, Completed
- Auto-communication linking: creating an incident automatically generates a communication log entry. NDIS-reportable incidents get time_sensitive and ndia_reportable compliance flags
- Resolution workflow: Reported -> Under Investigation -> Resolved -> Closed
- Incident reports: summary by severity, by property, by type, NDIS notification compliance
- Detail page: full incident timeline, photos, actions, linked communications, chain of custody

---

## 9. Communications Hub

**Four views. Five channels. NDIS compliance categories. Threading. Email integration.**

- Five communication types: Email, Phone Call, SMS, Meeting, In-Person
- Direction tracking: Inbound, Outbound
- Entity linking: link communications to participants, properties, support coordinators, SIL providers, OTs, contractors
- Thread view: grouped conversations by participant/property with thread summaries
- Timeline view: chronological feed of all communications with filtering
- Stakeholder view: communications grouped by contact (support coordinator, SIL provider, OT, contractor)
- Compliance view: communications filtered by NDIS compliance categories and flags
- NDIS compliance categories: incident_related, complaint_related, plan_related, consent_related, funding_related, documentation, medication, restrictive_practice, safeguarding
- NDIS compliance flags: time_sensitive, ndia_reportable, consent_required, escalation_needed, external_notification
- Thread management: Active, Completed, Archived status per thread
- Bulk operations: select multiple communications, mark as read, categorise, flag in bulk
- Soft delete with admin restore: deleted communications retained for 30 days, admin can restore
- Email integration: forward emails to Postmark inbound webhook, auto-creates communication log with stakeholder recognition (matches sender to SC, SIL, OT, contractor by email or name)
- Outlook add-in: XML manifest for logging emails directly from Outlook
- Drag-and-drop attachment upload: drag files onto the communication form
- DB-linked dropdowns: select SC, SIL Provider, OT, or Contractor from database, auto-populates email and phone
- Communications history: reusable component embedded on participant detail, property detail, SC detail, SIL Provider detail pages
- Pre-fill via URL: link from detail pages to create new communication with entity pre-selected

---

## 10. Compliance & Certifications

**Six certification types. Auto-status. Complaints register. Audit pack. 80+ policies. Staff screening.**

### Certifications
- Six certification types: SDA Registration, NDIS Practice Standards, Worker Screening, Fire Safety, Building Compliance, SDA Design
- Certification scopes: organisation-wide or property-specific
- Status tracking: Current, Expiring Soon (within 30 days), Expired, Pending Renewal
- Auto-status transitions: daily cron job (1 AM UTC) automatically moves Current -> Expiring Soon -> Expired
- Auto-creation from documents: uploading a certification-type document auto-creates the matching certification record
- Certificate file linking: download the original certificate directly from the certification detail page
- Certification dashboard: stats row with current/expiring/expired counts, filterable table
- Expiry alerts: critical alert for expired, warning for expiring within 30 days

### NDIS Complaints Register (BLS-SOP-001)
- Five-step lifecycle: Receipt & Triage -> Acknowledgement -> Investigation -> Resolution -> Closing & Learning
- Auto-generated reference numbers: CMP-YYYYMMDD-XXXX
- 24-hour acknowledgment countdown: automatic SLA tracking
- 21-day resolution tracking: business day countdown for resolution deadline
- SOP-001 overlay: full-screen interactive procedure checklist with per-step audit logging
- Chain of custody: filtered audit trail per complaint showing every view, action, and timestamp
- Website intake: public POST API for receiving complaints from your website (CORS-enabled)
- Auto-communication linking: creating a complaint generates a communication log entry
- Complaint PDF export: landscape NDIS audit report format
- Overdue cron jobs: 2 AM checks acknowledgments, 2:30 AM checks resolutions

### Policies & Procedures
- 80+ pre-loaded policies: 40 BLS policies + 40 AAH policies ready to use
- AI-generated summaries: Claude API generates a summary and 8 key points per policy
- 10+ categories: Quality, Safety, HR, Governance, Operations, Clinical, Financial, IT, Privacy, Risk
- Version tracking, effective dates, review due dates
- Policy status: Draft, Active, Under Review, Archived
- Full-text search across all policies
- Per-org library: BLS and AAH get pre-loaded policies; other organisations upload and manage their own

### Staff Files & NDIS Screening
- Employee records: name, position, start date, contact details
- NDIS worker screening compliance: check number, expiry date, screening state
- Screening status: Current, Expiring Soon, Expired, Pending
- Screening expiry alerts: automated alerts before screening expires
- Emergency contact storage per staff member

### Emergency Plans
- Emergency Management Plans (EMP): per-property emergency procedures
- Business Continuity Plans (BCP): organisation-wide continuity planning
- Plan status tracking: Active, Under Review, Draft
- Review due date tracking with overdue alerts

### Audit Compliance Export
- Seven-section NDIS audit pack PDF: generated in one click from the Reports page
  1. Cover page with organisation details and generation date
  2. Compliance certifications summary
  3. Incident reports and resolution status
  4. Complaints register with SOP-001 compliance
  5. Participant plan status and expiry tracking
  6. Document expiry tracking (90-day window)
  7. Audit log integrity verification (hash chain check)

---

## 11. Alerts, Calendar & Notifications

**20+ alert types. 90/60/30-day warnings. Calendar sync. Push notifications. Email and SMS.**

### Automated Alerts
- 20+ alert types: document expiry, plan expiry, certification expiry, consent expiry, consent missing, vacancy, maintenance overdue, payment variance, complaint acknowledgment overdue, complaint resolution overdue, incident notification, task overdue, screening expiry, profile incomplete
- Severity levels: Critical, Warning, Info
- 90/60/30-day advance warnings: configurable warning windows for expiry-based alerts
- Alert dashboard: filterable by type, severity, status (active/dismissed)
- Daily alert generation: cron job runs at midnight UTC, sends notification digest at 9 AM UTC
- Dismissal tracking: dismiss alerts with audit trail

### Calendar Integration
- Internal calendar: create and manage events within MySDAManager
- Four views: Month, Week, Day, Agenda
- Google Calendar sync: OAuth connection with 15-minute automatic sync via cron job + manual "Sync Now" button
- Microsoft/Outlook Calendar sync: OAuth connection with 15-minute sync (code ready, Azure config pending)
- Calendar events: title, description, start/end time, location, attendees, colour coding
- Event categories: maintenance, inspection, meeting, follow-up, compliance deadline

### Notifications
- Email notifications: via Resend API with custom domain (noreply@mysdamanager.com) and HTML templates
- SMS notifications: via Twilio API
- Push notifications: VAPID-based web push with service worker handlers
- Four notification categories: Critical Alerts, Warnings, Info, Daily Digest
- Notification preferences: per-user toggle for email, SMS, push per category
- Test notifications: send a test email/SMS from settings to verify configuration

---

## 12. Platform & Integrations

**Multi-tenant SaaS. White-label. REST API. Webhooks. Mobile app. Security.**

### Multi-Tenant SaaS
- Three pricing tiers: Starter ($499/mo -- 10 properties, 5 users), Professional ($899/mo -- 25 properties, 20 users), Enterprise ($1,499/mo -- unlimited)
- Annual billing discount: save ~7% with annual plans
- 14-day free trial with no credit card required
- Plan enforcement: hard limits on properties and users per tier
- Stripe integration: checkout, subscription management, customer portal, webhooks
- Self-service registration: email validation, password strength, organisation slug availability check
- Four-step onboarding wizard: organisation details, first property, first participant, invite team

### White-Label Branding
- Per-organisation settings: name, primary colour (hex picker), logo upload, timezone, date format, currency
- Custom domain support: mysdamanager.com with organisation-specific branding
- Organisation slug: unique URL path per organisation

### REST API v1
- Four resource endpoints: Properties, Participants, Maintenance, Incidents
- Bearer token authentication with SHA-256 hashed API keys
- Permission scoping: read-only or read-write per key
- API key management UI: create, revoke, copy-to-clipboard
- Rate limiting and audit logging per key

### Outbound Webhooks
- 12 event types: participant.created, participant.updated, maintenance.created, maintenance.updated, incident.created, incident.updated, payment.created, payment.updated, document.created, document.deleted, inspection.created, inspection.completed
- HMAC-SHA256 payload signing for verification
- Three automatic retries with exponential backoff
- Auto-disable after 10 consecutive failures
- Delivery history with response codes and timestamps

### Data Export
- Admin-only full data export to JSON
- Exports all 55+ tables with decrypted encrypted fields
- Strips internal secrets and system fields
- Record counts and estimated file size shown before export

### Security
- AES-256-GCM field-level encryption: NDIS numbers, dates of birth, emergency contacts, bank account numbers
- HMAC-SHA256 blind indexes: search encrypted fields without decrypting the database
- Bcrypt password hashing: 12 salt rounds
- Session-based authentication: JWT access tokens (24-hour) + refresh tokens (30-day)
- MFA (TOTP): Google Authenticator / Authy compatible, 10 backup codes per user, 30-second window
- Inactivity lock screen: 5-minute timeout for admins, 15-minute for other roles. 4-digit PIN (SHA-256 hashed). 5-attempt lockout with forced logout
- Role-based access control (RBAC): Admin, Property Manager, Staff, Accountant, SIL Provider
- Row-level tenant isolation: every query filtered by organisationId
- Immutable audit logs: SHA-256 hash chain linking, deletion prevention, daily integrity verification (3 AM UTC cron)
- Content Security Policy: production CSP removes unsafe-eval
- Click-wrap terms acceptance: non-dismissible modal on first login with NDIS-specific clauses

### Mobile & PWA
- Progressive Web App: installable on any device, offline support, service worker caching
- Native iOS app: Capacitor wrapper with WidgetKit home screen widget (3 sizes)
- Native Android app: Capacitor wrapper with AppWidget home screen widget (dark theme)
- Task widgets: see and complete tasks from the home screen without opening the app. 15-minute auto-refresh
- Bottom navigation: 5-item fixed bottom bar on mobile (Dashboard, Properties, Incidents, Maintenance, Inspections)
- Command palette (Ctrl+K): 40+ commands with fuzzy search, recent pages, keyboard navigation
- Offline incident reporting: save incidents to device when offline, auto-sync when connected
- Offline inspections: complete full inspections without internet, auto-sync on reconnection
- Push notifications: receive critical alerts on mobile and desktop

### AI Features
- Document analysis: upload a document (PDF or image) and Claude API auto-extracts invoice numbers, dates, amounts, vendors, expiry dates, and categorises the document
- Policy summaries: Claude API generates a plain-language summary and 8 key points for each compliance policy
- AI chatbot: natural language queries against your data (participant plan expiry, vacancies, overdue maintenance, payment status)

### Reports & Analytics
- Financial reports: payment summary, outstanding payments, owner statement (Folio Summary), payment distributions, cost analysis
- Compliance reports: document expiry (90-day window), incident summary, certification status, consent status
- Operational reports: maintenance overview, inspection summary, contractor performance, vacancy report
- Participant reports: plan status (90-day window), consent status
- Audit compliance export: 7-section PDF generated in one click

### In-App Help Guides
- Slide-in help panel on 11 feature pages: Incidents, Maintenance, Inspections, Payments, Documents, Follow-ups, Properties, Participants, Contractors, Complaints, Certifications
- Structured guides with NDIS compliance requirements, step-by-step workflows, and colour-coded badges (RED for critical deadlines, GREEN for best practice)

---

## By the Numbers

| Metric | Count |
|--------|-------|
| Pages / screens | 116+ |
| Database tables | 69 |
| Backend modules | 80+ |
| PDF generators | 10 |
| Automated alert types | 20+ |
| Pre-loaded policies | 80+ |
| API endpoints | 14 |
| Webhook event types | 12 |
| Cron jobs | 12 |
| Supported platforms | Web, iOS, Android, PWA |

---

## Built for NDIS Compliance

- **APP 3 consent workflow** with Easy Read PDFs and annual renewal tracking
- **24-hour incident notification** with countdown timer and chain of custody
- **BLS-SOP-001 complaints procedure** with 24-hour acknowledgment and 21-day resolution SLA
- **Immutable audit logs** with SHA-256 hash chain and daily integrity verification
- **7-section audit evidence pack** generated in one click
- **90/60/30-day expiry warnings** for every document, certificate, plan, consent, and screening
- **Field-level encryption** for NDIS numbers, dates of birth, emergency contacts, and bank details
- **7-year data retention** aligned with NDIS recordkeeping requirements
- **Notifiable Data Breach (NDB)** process: 72-hour notification commitment documented in Privacy Policy

---

*MySDAManager -- Replace the workaround. One platform. Every SDA property. Audit-ready from day one.*
