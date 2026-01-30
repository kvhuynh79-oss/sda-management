# SDA Management System - Project Plan

## Completed Features

### v1.2.0 (Current)
- [x] Property and participant management
- [x] Preventative maintenance scheduling with SDA templates
- [x] Automated alerts and notifications (email/SMS)
- [x] Reports and analytics with PDF/CSV export
- [x] Document management with expiry tracking
- [x] Payment tracking and recording
- [x] Maintenance request management with photo uploads
- [x] Maintenance request detail/edit page
- [x] Owner bank details (BSB, Account Number, Account Name) for payment distributions
- [x] Responsive header across all pages
- [x] Mobile-friendly navigation
- [x] **Property Inspection Checklists** (NEW)
  - BLS Property Inspection template with 18 categories, 100+ items
  - Mobile-optimized Pass/Fail/N/A interface
  - Photo upload for failed items
  - Remarks/notes per item
  - Progress tracking per category
  - Template management system

---

## Future Development Roadmap

### Phase 1: Mobile App (PWA) - HIGH PRIORITY
**Goal**: Enable on-site maintenance work with mobile devices

**Features**:
- [ ] Add `manifest.json` for app metadata and icons
- [ ] Configure service worker for offline caching
- [ ] Add "Install App" prompt for mobile users
- [ ] Optimize touch interactions for mobile
- [ ] Enable camera access for maintenance photos
- [ ] Offline support for viewing maintenance lists
- [ ] Background sync for data when connection restored

**Use Cases**:
- Field workers can tick off maintenance tasks on-site
- Add remarks and photos during property visits
- View maintenance schedules without internet connection

**Technical Requirements**:
- `next-pwa` package or custom service worker
- IndexedDB for offline data storage
- Camera API integration (already partially done)

**Estimated Effort**: 1-2 days

---

### Phase 2: Custom Domain Setup - MEDIUM PRIORITY
**Goal**: Professional branding with custom domain for SaaS product

**Current URL**: https://sda-management.vercel.app

**Domain Strategy Decision**:
- **DO NOT** use `betterlivingsolutions.com.au` for the SaaS product
- **CREATE NEW** neutral domain for SaaS subscriptions
- **Reason**: Other SDA providers (competitors) won't want to use competitor-branded software
- **Suggested domains** (check availability):
  - `sdamanager.com.au`
  - `sdahub.com.au`
  - `sdaproperty.com.au`
  - `sdaliving.com.au`
- Footer can display "Powered by Better Living Solutions" for credit

**Tasks**:
- [ ] Purchase neutral SaaS domain (e.g., `sdamanager.com.au`)
- [ ] Add domain to Vercel project
- [ ] Configure DNS records (CNAME to Vercel)
- [ ] Set up SSL certificate (automatic with Vercel)
- [ ] Configure Resend for custom domain email sending
- [ ] Update email templates with branded sender
- [ ] Update app branding/logo for neutral product identity

**DNS Records Required**:
```
Type: CNAME
Name: app (or www)
Value: cname.vercel-dns.com

Type: TXT (for Resend)
Name: _resend
Value: [provided by Resend]
```

**Estimated Effort**: 1-2 hours (plus DNS propagation time)

---

### Phase 3: Security Enhancements - MEDIUM PRIORITY
**Goal**: Production-grade security for sensitive data

**Features**:
- [ ] Two-Factor Authentication (2FA)
  - TOTP-based (Google Authenticator, Authy)
  - SMS backup codes
- [ ] Audit Logging
  - Track all data modifications
  - User action history
  - Login/logout events
  - Export audit logs
- [ ] Session Management
  - JWT tokens with refresh mechanism
  - Session timeout configuration
  - Device tracking
  - Force logout capability
- [ ] Password Policies
  - Minimum complexity requirements
  - Password expiry (optional)
  - Prevent password reuse
- [ ] Role-Based Access Control (RBAC)
  - Admin, Manager, Staff roles
  - Granular permissions per feature
  - Audit trail for permission changes

**Estimated Effort**: 2-4 weeks

---

### Phase 4: Property Inspection Checklists - ✅ COMPLETED
**Goal**: Digital inspection checklists for on-site property maintenance checks

#### 4.1 Inspection Checklist System
Comprehensive property inspection system:
- [x] Pre-defined checklist templates (BLS standard - 18 categories, 100+ items)
- [x] Mobile-friendly interface for on-site use
- [x] Photo upload for any issues found
- [x] Remarks/notes field per item
- [x] Completion tracking and reporting
- [x] Pass/Fail/N/A status for each item
- [x] Category accordion navigation
- [x] Template management page

**Checklist Categories** (from BLS template):

| Category | Items |
|----------|-------|
| **Heating & Cooling** | AC working |
| **Electrical** | Switches, fixtures, doorbell |
| **Plumbing** | Faucets, water flow, drainage, leaks |
| **Windows** | Glass condition, open/close, screens, hardware |
| **Doors** | Open/close, latches, stoppers, locks |
| **Exterior/Porches/Decks** | Cladding, gutters, sidewalks, railings, drainage |
| **Garage & Structures** | Doors, remotes, lock codes, floors |
| **Miscellaneous** | Smoke/CO2 detectors, security systems, intercoms |
| **Bedrooms (1, 2, etc.)** | Walls, floors, windows, closets, electrical, lighting |
| **Bathroom** | Showers, water flow/temp, basins, toilets, cabinets, moisture |
| **Carers Room** | Walls, floors, windows, closets, electrical, lighting |
| **Hallways** | Walls, floors, windows, electrical |
| **Living Room** | Walls, floors, windows, electrical, lighting |
| **Kitchen** | Cabinetry, countertops, drawers, appliances, walls, floors |

**Database Schema**:
```typescript
// Inspection Templates
inspectionTemplates: defineTable({
  name: v.string(),                    // "BLS Property Inspection"
  description: v.optional(v.string()),
  categories: v.array(v.object({
    name: v.string(),                  // "Heating & Cooling"
    items: v.array(v.object({
      name: v.string(),                // "Check to see if AC is working"
      required: v.boolean(),
    })),
  })),
  isActive: v.boolean(),
  createdAt: v.number(),
})

// Inspection Records
inspections: defineTable({
  templateId: v.id("inspectionTemplates"),
  propertyId: v.id("properties"),
  dwellingId: v.optional(v.id("dwellings")),
  inspectorId: v.id("users"),
  scheduledDate: v.string(),
  completedDate: v.optional(v.string()),
  status: v.union(
    v.literal("scheduled"),
    v.literal("in_progress"),
    v.literal("completed")
  ),
  location: v.optional(v.string()),    // Header: LOCATION field
  preparedBy: v.optional(v.string()),  // Header: PREPARED BY field
  additionalComments: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
})

// Inspection Items (each checked item)
inspectionItems: defineTable({
  inspectionId: v.id("inspections"),
  category: v.string(),
  itemName: v.string(),
  status: v.union(
    v.literal("pending"),
    v.literal("pass"),
    v.literal("fail"),
    v.literal("na")
  ),
  condition: v.optional(v.string()),   // Condition/Details notes
  hasIssue: v.boolean(),
  updatedAt: v.number(),
}).index("by_inspection", ["inspectionId"])

// Inspection Photos (for issues)
inspectionPhotos: defineTable({
  inspectionId: v.id("inspections"),
  inspectionItemId: v.id("inspectionItems"),
  storageId: v.id("_storage"),
  fileName: v.string(),
  fileType: v.string(),
  description: v.optional(v.string()),
  uploadedBy: v.id("users"),
  uploadedAt: v.number(),
}).index("by_inspection", ["inspectionId"])
  .index("by_item", ["inspectionItemId"])
```

**User Flow**:
```
1. Admin creates inspection from template for a property
2. Assigns to contractor/inspector with scheduled date
3. Inspector opens inspection on mobile (PWA)
4. Goes through checklist room-by-room:
   - Taps item to mark Pass/Fail/N/A
   - If Fail: adds photo + remarks
   - Can add condition notes to any item
5. Completes inspection with additional comments
6. Report auto-generated and visible on web app
7. Any issues can trigger maintenance requests
```

**Pages Created**:
- [x] `/inspections` - List all inspections with filters and stats
- [x] `/inspections/new` - Create new inspection from template
- [x] `/inspections/[id]` - View/conduct inspection (mobile-optimized)
- [ ] `/inspections/[id]/report` - PDF report generation (future)
- [x] `/inspections/templates` - Manage inspection templates

**Mobile Optimizations Implemented**:
- [x] Large touch targets for Pass/Fail/N/A buttons
- [x] Camera quick-access for photos (uses device camera)
- [x] Progress indicator per category
- [ ] Swipe gestures for Pass/Fail (future enhancement)
- [ ] Offline capability with sync (requires PWA - Phase 1)

**Status**: ✅ Core functionality complete

---

### Phase 5: AI Integration - MEDIUM PRIORITY
**Goal**: Automate data entry and document management using AI

#### 4.1 NDIS Plan Auto-Fill
Upload a participant's NDIS plan PDF and AI extracts:
- [ ] Participant name, DOB, NDIS number
- [ ] Plan start and end dates
- [ ] Funding categories and amounts (SDA, SIL, Core, etc.)
- [ ] Support coordinator details
- [ ] Goals and support needs

**User Flow**:
```
1. User clicks "Upload NDIS Plan" on new participant form
2. PDF uploaded to Convex storage
3. PDF sent to Claude API with vision
4. AI returns structured JSON data
5. Form auto-populates with extracted data
6. User reviews, corrects if needed, and confirms
```

**Technical Implementation**:
- Convex HTTP action to call Claude API
- PDF processing with base64 encoding for vision
- Structured JSON response parsing
- Confidence scores for extracted fields

#### 4.2 Smart Document Classification
Upload any document and AI automatically:
- [ ] Identifies document type (lease, insurance, compliance cert, invoice, etc.)
- [ ] Suggests appropriate category/tags
- [ ] Extracts key metadata:
  - Expiry dates
  - Amounts/costs
  - Parties involved
  - Reference numbers
- [ ] Routes to correct storage location
- [ ] Creates alerts for expiring documents

**Supported Document Types**:
- Lease agreements
- Insurance certificates
- Compliance certificates (fire, electrical, gas)
- Contractor invoices
- NDIS correspondence
- Medical/support plans

**Technical Requirements**:
- Anthropic API key (Claude API)
- Convex HTTP actions for API calls
- Document type classification prompt
- Data extraction prompts per document type

**Estimated Costs**:
| Usage | Monthly Cost |
|-------|--------------|
| 50 documents/month | ~$2-5 |
| 200 documents/month | ~$10-20 |
| 500 documents/month | ~$25-50 |

**Estimated Effort**: 1 week

---

### Phase 6: Future Considerations

#### Native Mobile App (Capacitor)
- Wrap PWA in native shell for App Store/Play Store
- Access to push notifications on iOS
- Background location for site visits (optional)

#### NDIS Integration
- API integration with NDIS portal (if available)
- Automated funding verification
- Plan change notifications

#### Advanced Reporting
- Custom report builder
- Scheduled report delivery
- Dashboard widgets customization
- Financial forecasting

#### Multi-tenancy
- Support for multiple SDA providers
- Separate data isolation
- White-label options

---

## Next Session Priorities

### 1. Bug Fixing & Testing
- [ ] Test all current features thoroughly
- [ ] Identify and fix any bugs in existing functionality
- [ ] Ensure data validation is working correctly
- [ ] Test mobile responsiveness across features

### 2. Bulk Data Entry
- [ ] User to upload property and participant data files
- [ ] Claude to assist with entering data into the system
- [ ] Goal: Populate system with real property/participant data for testing

### 3. Owner/Landlord Reports Enhancement
Reference document provided: **SDA Rental Statement / Folio Summary** (see below)

The accountant-prepared report includes:
- Per-participant breakdown:
  - SDA Funding (monthly)
  - RRC - 25% Disability Support Pension
  - RRC - 100% Commonwealth Rent Assistance
  - Less: SDA Provider Fee (management %)
  - Subtotal per participant
- Multi-month columns with totals
- Property details (dwelling type, SDA category, annual funding)
- Owner bank details for payment
- Grand total across all participants

This format should inform the 6-month owner report generation feature.

---

## Technical Debt & Improvements

- [ ] Replace localStorage auth with proper JWT/NextAuth
- [ ] Add comprehensive test coverage
- [ ] Implement proper error boundaries
- [ ] Add loading skeletons for better UX
- [ ] Optimize bundle size
- [ ] Add request caching/deduplication

---

## Third-Party Services

| Service | Purpose | Status | Monthly Cost |
|---------|---------|--------|--------------|
| Vercel | Frontend hosting | Active | Free tier |
| Convex | Backend/Database | Active | Free tier |
| Resend | Email notifications | Active | Free tier (3k/month) |
| Twilio | SMS notifications | Optional | Pay-as-you-go |

**Estimated Monthly Costs at Scale**:
- Small (< 1000 users): $0-20/month
- Medium (1000-5000 users): $50-100/month
- Large (5000+ users): $200+/month

---

## Notes

- PWA approach chosen over native app due to:
  - Lower development effort
  - Single codebase maintenance
  - Immediate deployment (no app store approval)
  - Already works with photo uploads

- Security enhancements should be prioritized before handling sensitive financial data

- Domain setup can be done independently of other features

---

**Last Updated**: 2026-01-29

---

## Session Notes

### Session 2026-01-29
**Completed**: Property Inspection Checklists feature (Phase 4)
- Added 4 new database tables (inspectionTemplates, inspections, inspectionItems, inspectionPhotos)
- Created full backend API in convex/inspections.ts
- Built 4 frontend pages (/inspections, /inspections/new, /inspections/[id], /inspections/templates)
- BLS template with 18 categories and 100+ checklist items
- Mobile-optimized UI with large touch targets

**Next Session Reminders**:
1. Upload property and participant data files for bulk entry
2. Test and fix bugs in existing features
3. Reference the SDA Rental Statement (Folio Summary) format for owner reports
