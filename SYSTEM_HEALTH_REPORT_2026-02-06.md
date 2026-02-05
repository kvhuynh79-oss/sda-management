# My SDA Manager - System Health Report
**Pre-SaaS Launch Audit**
**Date:** 2026-02-06
**Status:** ⚠️ **NOT PRODUCTION READY** - Critical security and compliance gaps identified

---

## Executive Summary

Your SDA Management system has **solid architectural foundations** but requires **immediate security and compliance fixes** before moving to a subscription model or onboarding new providers.

### Overall Health Scores

| Category | Score | Status |
|----------|-------|--------|
| **Data Privacy** | 45% | 🔴 CRITICAL - No encryption at rest |
| **Audit Trail** | 35% | 🔴 CRITICAL - Major NDIS compliance gaps |
| **Access Control (RBAC)** | 65% | 🟠 HIGH RISK - Privilege escalation possible |
| **Reliability** | 40% | 🔴 CRITICAL - Multiple single points of failure |
| **Accessibility (WCAG 2.1)** | 75% | 🟡 MEDIUM - Modal and contrast issues |

**Overall System Grade:** **D+** - Functional but not production-ready

---

## 1. Data Privacy & Encryption 🔴 CRITICAL

### Findings

**CRITICAL VULNERABILITIES:**
- ❌ **NO field-level encryption** - NDIS numbers, DOB, financial data stored in plaintext
- ❌ **Sensitive incident data unencrypted** - Sexual assault, abuse, death records in plaintext
- ❌ **OAuth tokens unencrypted** - Xero access tokens stored without encryption
- ❌ **No MFA** - Admin accounts lack multi-factor authentication
- ⚠️ **Data residency risk** - Convex may host data in US (violates Australian privacy laws)

### NDIS Compliance Status
- **APP 11 (Security): FAILED** ❌
- **APP 8 (Cross-Border): AT RISK** ⚠️

### Impact
- **Regulatory:** NDIS Commission penalties, potential deregistration
- **Legal:** Privacy breach liability up to $2.1M under Privacy Act 1988
- **Reputational:** Loss of participant trust, bad press

### Immediate Actions Required (0-30 days)
1. ✅ Implement field-level encryption for NDIS numbers, DOB, financial amounts
2. ✅ Encrypt incident descriptions (especially reportable incidents)
3. ✅ Add MFA for admin accounts
4. ✅ Verify Convex data residency (must be Australia-based)
5. ✅ Encrypt file storage (NDIS plans, OT reports, accommodation agreements)

**Estimated Cost:** $53,000 AUD over 8-10 weeks

---

## 2. Audit Trail & Logging 🔴 CRITICAL

### Findings

**Current Coverage:** 31% of sensitive operations logged

**CRITICAL GAPS:**
- ❌ **Participant Plans** - Funding changes not logged (NDIS compliance violation)
- ❌ **Incident Updates** - Cannot prove when NDIS was notified
- ❌ **Claims** - Submission/payment tracking gaps
- ❌ **Documents** - Deletion of NDIS plans/agreements untracked
- ❌ **Dwelling Occupancy** - Vacancy changes (triggers NDIA notifications) untracked
- ❌ **Audit Logs NOT Immutable** - Can be deleted by database admins

### NDIS Compliance Gaps

| Requirement | Status | Gap % |
|-------------|--------|-------|
| Participant data changes tracked | ⚠️ Partial | 50% |
| Incident modifications tracked | ❌ No | 75% |
| Payment tracking auditable | ✅ Mostly | 40% |
| 7-year record retention | ❌ No | 100% |
| Tamper-evident audit trail | ❌ No | 100% |

### Impact
- **Regulatory:** Cannot prove NDIS incident notification compliance
- **Legal:** 7-year retention requirement unmet
- **Operational:** Cannot investigate data tampering

### Immediate Actions Required (1-2 weeks)
1. ✅ Add audit logging to Participant Plans (create, update)
2. ✅ Add audit logging to Incident updates (markNdisNotified, resolve)
3. ✅ Make audit logs immutable (prevent deletion)
4. ✅ Add audit logging to Claims (updateStatus, bulkCreate)
5. ✅ Populate IP address and user agent fields

**Estimated Effort:** 24 hours (3 days)

---

## 3. Role-Based Access Control (RBAC) 🔴 CRITICAL

### Findings

**CRITICAL SECURITY VULNERABILITIES:**
1. ❌ **Privilege Escalation** - Any user can become admin
   - `auth.ts:updateUser` lacks admin check
   - Staff user can call `updateUser({ role: "admin" })` on themselves

2. ❌ **Password Reset Abuse** - Any user can reset any password
   - `auth.ts:resetPassword` accessible to all authenticated users
   - Staff can reset admin password and take over account

3. ❌ **Unauthorized User Creation** - Any user can create admin accounts
   - `auth.ts:createUser` lacks admin verification

4. ⚠️ **Query Permission Bypass** - Read-anywhere vulnerability
   - Query endpoints like `getAllUsers` lack permission checks
   - Staff can view all user emails/roles

### Attack Scenarios
- Staff user escalates to admin → Full system compromise
- Staff user resets admin password → Account takeover
- Accountant queries all payments → Information disclosure

### Impact
- **Security:** Complete privilege escalation possible
- **Compliance:** Unauthorized access to protected health information
- **Data Breach:** Exposed participant PII

### Immediate Actions Required (1-2 days)
1. ✅ Add `requireAdmin` to `auth.ts:updateUser` (line 272)
2. ✅ Add `requireAdmin` to `auth.ts:resetPassword` (line 342)
3. ✅ Add `requireAdmin` to `auth.ts:createUser` (line 19)
4. ✅ Add `sil_provider` to `authHelpers.ts:UserRole` type (line 5)
5. ✅ Add permission checks to query endpoints (getAllUsers, etc.)

**Estimated Effort:** 4 hours

---

## 4. System Reliability 🔴 CRITICAL

### Top 3 Critical Failure Points

#### **#1: Incident Reporting System Failure** (HIGHEST RISK)
**Impact:** NDIS compliance violation, potential deregistration

**Vulnerabilities:**
- No database backup/redundancy
- No offline capability (PWA exists but forms require live connection)
- No error handling around incident mutations
- Staff in properties with poor connectivity cannot report incidents

**Failure Scenario:**
- Convex outage → Cannot create incident reports → Miss 24-hour NDIS notification → Automatic NDIS Commission investigation

**Mitigation Needed:**
- ✅ Email fallback for incident submission
- ✅ Offline-first incident form with sync queue
- ✅ SMS alerts for critical incidents

---

#### **#2: Authentication System Vulnerability** (CRITICAL RISK)
**Impact:** Complete system lockout, business continuity failure

**Vulnerabilities:**
- localStorage-based auth (temporary implementation)
- Browser cache clear = instant lockout
- No session recovery mechanism
- No password reset flow
- Zero error handling (JSON.parse crashes)

**Failure Scenario:**
- User clears browser data → Lost access to system → Cannot process urgent payments → Provider doesn't get paid

**Mitigation Needed:**
- ✅ Server-side session management with refresh tokens
- ✅ Password reset via email
- ✅ Migrate to Clerk (as planned) with 2FA

---

#### **#3: Payment/Claims Data Integrity Failure** (HIGH RISK)
**Impact:** Revenue loss, incorrect NDIS claims, audit failures

**Vulnerabilities:**
- No transaction integrity (partial writes possible)
- No validation: amounts, duplicates, plan eligibility dates
- Variance calculation errors (no bounds checking)
- Claims can be created after plan expires

**Failure Scenario:**
- Payment recorded but audit log fails → Compliance gap
- Duplicate payment for same period → Overpayment to owner
- Claim submitted after plan ends → NDIA rejects entire batch

**Mitigation Needed:**
- ✅ Schema validation (positive numbers, max amounts)
- ✅ Duplicate detection
- ✅ Plan expiry validation before claim creation
- ✅ Transaction rollback mechanisms

---

### Error Handling Coverage
- **Current:** 10% of codebase (mostly AI/external API calls)
- **Critical gaps:** Database mutations, authentication, payment processing
- **Files without error handling:** claims.ts (176 lines), incidents.ts (544 lines), payments.ts (420 lines)

### Third-Party Dependencies
| Service | Current Handling | Risk Level |
|---------|-----------------|-----------|
| Convex database | ❌ No fallback | 🔴 CRITICAL |
| Resend email | ✅ Retry logic | 🟡 MEDIUM |
| Twilio SMS | ✅ Retry logic | 🟡 MEDIUM |
| Xero | ✅ Graceful degradation | 🟢 LOW |

---

## 5. Accessibility (WCAG 2.1) 🟡 MEDIUM

### Compliance Score: ~75%

**What's Working:**
- ✅ Form components with proper labels, aria-describedby, aria-invalid
- ✅ Keyboard navigation with focus-visible states
- ✅ Mostly good color contrast
- ✅ Reduced motion support

**Critical Issues (8 violations):**

1. **Modal Accessibility** (29 modals affected)
   - Missing `role="dialog"` and `aria-modal="true"`
   - No focus trap
   - No Escape key handler
   - No return focus management

2. **Heading Hierarchy**
   - Pages use `<h2>` instead of `<h1>` for main title
   - Non-hierarchical structure

3. **Color Contrast**
   - text-gray-500 on dark backgrounds: 3.18:1 (fails AA 4.5:1)
   - Affects form helper text and placeholders

4. **Missing Autocomplete**
   - Login forms lack `autocomplete="email"` and `autocomplete="current-password"`
   - WCAG 1.3.5 violation

5. **No Status Announcements**
   - Form submissions don't announce to screen readers
   - No `aria-live` regions

### Impact
- **Accessibility:** Users with disabilities cannot effectively use the system
- **Legal:** Non-compliance with Disability Discrimination Act 1992
- **UX:** Poor experience for screen reader users

### Recommended Actions (4-6 weeks)
1. Create reusable Modal component with full accessibility
2. Fix heading hierarchy across all pages
3. Improve color contrast for helper text
4. Add autocomplete attributes to forms
5. Implement Announcer component for status updates

**Estimated Effort:** 36-52 hours

---

## Priority Fixes Summary

### 🔴 CRITICAL - Fix Immediately (This Week)

| Priority | Fix | File | Impact | Effort |
|----------|-----|------|--------|--------|
| 1 | Add `requireAdmin` to user management | `convex/auth.ts` | Prevents privilege escalation | 1 hour |
| 2 | Add audit logging to Participant Plans | `convex/participantPlans.ts` | NDIS compliance | 2 hours |
| 3 | Add audit logging to Incident updates | `convex/incidents.ts` | NDIS compliance | 2 hours |
| 4 | Make audit logs immutable | `convex/auditLog.ts` | Tamper prevention | 8 hours |
| 5 | Add error handling to incident mutations | `convex/incidents.ts` | Business continuity | 2 hours |
| 6 | Add payment validation | `convex/payments.ts` | Data integrity | 3 hours |
| 7 | Implement server-side sessions | `convex/auth.ts` | Auth resilience | 8 hours |

**Total Effort:** 26 hours (~3-4 days)

---

### 🟠 HIGH - Fix Soon (This Month)

| Priority | Fix | Area | Impact | Effort |
|----------|-----|------|--------|--------|
| 8 | Add permission checks to query endpoints | Backend | Information disclosure | 6 hours |
| 9 | Add audit logging to Documents/Dwellings | Backend | NDIS compliance | 3 hours |
| 10 | Implement offline incident forms | Frontend | NDIS compliance | 12 hours |
| 11 | Add transaction safety patterns | Backend | Data integrity | 8 hours |
| 12 | Implement field-level encryption | Backend | Privacy compliance | 40 hours |
| 13 | Add MFA for admin accounts | Auth | Security | 16 hours |

**Total Effort:** 85 hours (~2 weeks)

---

### 🟡 MEDIUM - Fix Next (1-2 Months)

| Priority | Fix | Area | Impact | Effort |
|----------|-----|------|--------|--------|
| 14 | Fix modal accessibility | Frontend | WCAG compliance | 12 hours |
| 15 | Fix heading hierarchy | Frontend | WCAG compliance | 4 hours |
| 16 | Add circuit breakers for APIs | Backend | Resilience | 8 hours |
| 17 | Implement health monitoring | DevOps | Observability | 16 hours |
| 18 | Migrate to Clerk authentication | Auth | Security & UX | 40 hours |

**Total Effort:** 80 hours (~2 weeks)

---

## Cost & Timeline Estimates

### Phase 1: Critical Security Fixes
**Timeline:** 1 week
**Effort:** 26 hours
**Cost:** $3,900 AUD (at $150/hour contractor rate)
**Outcome:** System safe for production use

### Phase 2: Compliance & Reliability
**Timeline:** 2-3 weeks
**Effort:** 85 hours
**Cost:** $12,750 AUD
**Outcome:** NDIS compliant, resilient to failures

### Phase 3: Encryption & Advanced Security
**Timeline:** 8-10 weeks
**Effort:** 280 hours
**Cost:** $42,000 AUD
**Outcome:** Enterprise-grade security, multi-tenant ready

### Phase 4: Accessibility & Polish
**Timeline:** 4-6 weeks
**Effort:** 80 hours
**Cost:** $12,000 AUD
**Outcome:** WCAG 2.1 AA compliant, excellent UX

**TOTAL INVESTMENT:** $70,650 AUD over 4-5 months

---

## Recommended Go-Live Strategy

### Option A: Fast Track (High Risk)
- Fix critical security issues only (Phase 1)
- Go live with current single-tenant setup
- Roll out encryption and compliance fixes to live system
- **Timeline:** 1 week
- **Risk:** Operating with compliance gaps, potential audit issues

### Option B: Prudent Approach (Recommended)
- Complete Phase 1 + Phase 2 before onboarding first external provider
- Roll out encryption during early beta (limited users)
- Complete accessibility during public launch
- **Timeline:** 4-5 weeks
- **Risk:** Minimal, system production-ready

### Option C: Gold Standard
- Complete all phases before public SaaS launch
- Beta test with 3-5 friendly providers
- Public launch with full compliance
- **Timeline:** 5-6 months
- **Risk:** None, premium product quality

**RECOMMENDATION:** **Option B** - Balance speed and safety

---

## Detailed Reports Generated

1. **SECURITY_AUDIT_REPORT.md** - Data privacy and encryption analysis
2. **AUDIT_TRAIL_REPORT.md** - Logging coverage and NDIS compliance
3. **RBAC_AUDIT_REPORT.md** - Access control vulnerabilities
4. **RELIABILITY_AUDIT_REPORT.md** - Critical failure points
5. **ACCESSIBILITY_AUDIT_2026-02-06.md** - WCAG 2.1 compliance analysis

---

## Next Steps

### Immediate (This Week)
1. **Review this health report** with your technical team
2. **Prioritize critical fixes** - Decide on Option A, B, or C
3. **Assign resources** - Allocate developer time
4. **Set up tracking** - Create tickets for each priority fix

### Short Term (This Month)
1. **Implement Phase 1 fixes** - Critical security patches
2. **Test thoroughly** - Security testing, penetration testing
3. **Document fixes** - Update CLAUDE.md with improvements

### Medium Term (Next Quarter)
1. **Complete Phase 2** - NDIS compliance + reliability
2. **Encrypted storage migration** - Re-encrypt existing data
3. **Clerk migration** - Replace localStorage auth
4. **Beta testing** - Onboard 3-5 friendly providers

---

## Sign-Off Checklist

Before proceeding to SaaS model, verify:

- [ ] All 🔴 CRITICAL fixes implemented (7 items)
- [ ] Penetration testing completed (no P0/P1 vulnerabilities)
- [ ] NDIS compliance verified (participant plans + incidents logged)
- [ ] Data encryption at rest implemented
- [ ] MFA for admin accounts enabled
- [ ] Password reset flow functional
- [ ] Offline incident reporting tested
- [ ] Audit logs immutable and retained for 7 years
- [ ] Health monitoring and alerts configured
- [ ] Disaster recovery plan documented
- [ ] WCAG 2.1 Level AA compliance (critical issues fixed)
- [ ] Legal review completed (privacy policy, terms of service)
- [ ] Insurance updated (cyber liability, professional indemnity)

---

**Prepared by:** Lead Systems Auditor (AI)
**Audit Date:** 2026-02-06
**Review Date:** 2026-02-13 (1 week follow-up recommended)

**Contact:** See individual audit reports for technical details and code examples.
