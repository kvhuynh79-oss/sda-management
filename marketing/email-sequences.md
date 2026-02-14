# MySDAManager Email Sequences

## Overview

Four complete email sequences for the MySDAManager marketing funnel:
1. **Welcome Sequence** (8 emails, Days 0-13) -- New trial signups
2. **Lead Nurture Sequence** (6 emails, Days 7-60) -- Audit checklist downloaders
3. **Monthly Newsletter** ("The Compliance Pulse") -- Template
4. **Re-engagement Sequence** (4 emails, Days 3-30) -- Churned trials

**Sending platform**: Resend API (noreply@mysdamanager.com)
**Unsubscribe**: All emails include one-click unsubscribe (CAN-SPAM + Australian Spam Act 2003 compliant)
**Tracking**: UTM parameters on all links (utm_source=email, utm_medium=sequence_name, utm_campaign=email_number)

---

## Sequence 1: Welcome (New Trial Signups)

**Trigger**: User completes registration at mysdamanager.com/register
**Duration**: 13 days (8 emails)
**Goal**: Activate the trial user -- get them to add their first property, upload documents, and experience value before trial expiry

---

### Email 1 -- Day 0 (Immediately after signup)

**Subject**: Welcome to MySDAManager -- your SDA operations start here
**Preview**: Your 14-day trial is active. Here is how to get the most out of it.

**Body**:

Hi {first_name},

Welcome to MySDAManager. You have just joined the first platform built specifically for SDA property management.

Your 14-day trial includes full access to every feature -- no restrictions, no credit card required until you are ready.

**Your first 10 minutes:**

Here is a quick-start path to get you set up:

**Step 1: Complete your organisation profile (2 min)**
Add your ABN, NDIS registration number, logo, and contact details. These appear on every document you generate.

Go to Settings > Organisation: https://mysdamanager.com/settings/organization?utm_source=email&utm_medium=welcome&utm_campaign=day0

**Step 2: Add your first property (3 min)**
Enter the address, SDA design category, and building type. Add the dwellings (units) within the property.

Go to Properties: https://mysdamanager.com/properties?utm_source=email&utm_medium=welcome&utm_campaign=day0

**Step 3: Upload a certification (2 min)**
Upload a fire safety certificate or SDA design certification. Set the expiry date. The Compliance Watchdog starts monitoring immediately.

Go to Documents: https://mysdamanager.com/documents?utm_source=email&utm_medium=welcome&utm_campaign=day0

**Step 4: Add your first participant (3 min)**
Enter their details or use "Save Incomplete" if you only have a name at this stage.

Go to Participants: https://mysdamanager.com/participants?utm_source=email&utm_medium=welcome&utm_campaign=day0

That is it. You are operational.

Over the next two weeks, I will send you a short email each day highlighting one feature that will make your SDA management simpler. Every email takes under 3 minutes to read.

If you need help at any point, reply to this email -- it goes directly to our team.

Khen Manickam
Founder, MySDAManager

P.S. If you manage more than 10 properties, reply to this email and I will personally walk you through the setup.

---

### Email 2 -- Day 1

**Subject**: Your compliance documents are scattered. Let's fix that today.
**Preview**: The Evidence Vault: every document, every expiry, one searchable location.

**Body**:

Hi {first_name},

Quick question: if an NDIS auditor called today and asked for the fire safety certificate for your third property, how long would it take you to find it?

If the answer is "more than 30 seconds," the Evidence Vault is about to become your favourite feature.

**The Evidence Vault in 60 seconds:**

Every compliance document you upload to MySDAManager is stored with:
- **Upload date and uploader identity** (who put it there and when)
- **Document type** (fire safety, building compliance, SDA design, worker screening, consent form, etc.)
- **Expiry date** (with automated alerts 30 days before)
- **Property or participant linkage** (which property does this certificate belong to?)
- **Full audit trail** (who viewed, modified, or downloaded it)

**Why it matters:**

When you upload a fire safety certificate and set its expiry to 15 March 2027, three things happen automatically:

1. The document is indexed, searchable, and accessible to your team
2. The Compliance Watchdog adds the expiry date to its monitoring schedule
3. A compliance certification record is created and linked to the property

No spreadsheet tracking. No calendar reminders. No hoping someone remembers.

**Try it now:**

Upload one document today. Any compliance document -- a fire safety certificate, building compliance report, or worker screening check. Set the expiry date. Watch the Compliance Watchdog pick it up.

Upload a document: https://mysdamanager.com/documents?utm_source=email&utm_medium=welcome&utm_campaign=day1

It takes 60 seconds. And from that moment, you will never lose track of that document's expiry again.

Tomorrow: How the Compliance Watchdog monitors your entire portfolio while you sleep.

Khen

---

### Email 3 -- Day 2

**Subject**: What expires next in your SDA portfolio?
**Preview**: The Compliance Watchdog monitors every deadline so you do not have to.

**Body**:

Hi {first_name},

Here is a number that should concern every SDA provider: the average portfolio has 47 separate compliance dates to track. Certification expiries, NDIS plan end dates, consent renewals, worker screening checks, scheduled inspections.

Tracking 47 dates in a spreadsheet is not a system. It is a liability.

**The Compliance Watchdog:**

Once you have added your properties, participants, and documents to MySDAManager, the Compliance Watchdog runs continuously:

**What it monitors:**
- Certificate expiry dates (fire safety, building, SDA design, worker screening)
- NDIS plan end dates for every participant
- Participant consent validity (APP 3 annual renewal)
- Document expiry dates across your entire library
- Maintenance response times
- Incident reporting windows (24-hour NDIS deadline)

**How it alerts you:**
- 30-day advance warning (yellow "Expiring Soon" status)
- Critical alert on expiry date (red "Expired" status)
- Dashboard widget with current counts: X expired, Y expiring soon, Z current
- Daily automated check at 1 AM (runs every night, even on weekends)

**The compliance dashboard:**

Your dashboard shows a real-time snapshot:
- Expired certifications (immediate action needed)
- Expiring within 30 days (schedule renewal)
- Current certifications (no action needed)

**Try it now:**

If you uploaded a document yesterday with an expiry date, check your dashboard today. You will see it reflected in the Compliance Watchdog's counts.

If you have not added properties and documents yet, today is a good day to start. The sooner the Watchdog has your data, the sooner it starts protecting you.

View your dashboard: https://mysdamanager.com/dashboard?utm_source=email&utm_medium=welcome&utm_campaign=day2

Tomorrow: No email (we respect your inbox). Day 4: Adding properties and participants efficiently.

Khen

---

### Email 4 -- Day 4

**Subject**: Your first property is in. Here is what to do next.
**Preview**: From one property to your whole portfolio -- a 5-minute-per-property workflow.

**Body**:

Hi {first_name},

By now, you may have added your first property to MySDAManager. If not, no worries -- this email will show you the most efficient way to set up your entire portfolio.

**The 5-minute property setup:**

For each SDA property, you need:

1. **Address and details** (1 min)
   Street address, SDA design category (Improved Liveability, Fully Accessible, Robust, High Physical Support), building type, and SDA registration number.

2. **Dwellings** (30 sec per dwelling)
   Each unit/room within the property. Most SDA properties have 2-5 dwellings.

3. **Owner details** (1 min)
   If the property is investor-owned: owner name, contact details, bank information for payment distribution.

4. **Certifications** (1 min)
   Upload fire safety, building compliance, and SDA design certifications with expiry dates.

5. **Participants** (2 min per participant)
   Link participants to their dwelling. Enter NDIS details or use "Save Incomplete" for referral-stage profiles.

**The "Save Incomplete" shortcut:**

Not every participant comes with full NDIS details. Referrals often start with just a name and a phone number. The "Save Incomplete" feature lets you create a participant profile with just a first and last name. The system:
- Creates the profile immediately (so the referral is not lost)
- Marks it with an orange "Incomplete" badge
- Generates an automatic alert for follow-up
- Lets you add NDIS details, plan information, and dwelling assignment later

**For portfolios of 10+ properties:**

If you are setting up a larger portfolio, reply to this email. I will schedule a 30-minute onboarding call where we walk through the setup together and answer any questions.

Add a property: https://mysdamanager.com/properties/new?utm_source=email&utm_medium=welcome&utm_campaign=day4

Khen

---

### Email 5 -- Day 6

**Subject**: Your participant data is encrypted. Here is what that means.
**Preview**: AES-256 encryption, role-based access, tamper-proof audit logs. Here is how we protect your data.

**Body**:

Hi {first_name},

You store some of the most sensitive personal information in the Australian disability sector. NDIS numbers. Dates of birth. Medical details. Emergency contacts. Incident descriptions involving vulnerable people.

This data deserves bank-level protection. Here is how MySDAManager provides it.

**Layer 1: AES-256 Encryption at Rest**

Sensitive fields are encrypted before they are stored in the database:
- NDIS participant numbers
- Dates of birth
- Emergency contact details
- Owner bank account numbers
- Incident descriptions and witness information

Even if someone accessed the raw database, these fields are unreadable without the encryption key. AES-256 is the same standard used by banks, government agencies, and the military.

**Layer 2: Role-Based Access Control (RBAC)**

Not everyone on your team needs to see everything:
- **Admin**: Full access to all data and settings
- **Property Manager**: Access to assigned properties and participants
- **Staff**: Operational access without financial or admin capabilities
- **SIL Provider**: Portal-only access (their participants, their properties)

Permissions are enforced at the database level, not just the interface.

**Layer 3: Tamper-Proof Audit Logs**

Every action in MySDAManager generates an audit log entry with a SHA-256 hash chain. Entries cannot be deleted or modified. Daily integrity verification runs at 3 AM UTC. If any entry has been tampered with, the system detects it.

**Layer 4: Session Security**

- 24-hour access tokens with 30-day refresh tokens
- Automatic inactivity lock (5 minutes for admin, 15 minutes for other roles)
- MFA support for admin accounts (TOTP, Google Authenticator compatible)
- Forced logout after 5 failed PIN attempts

**Layer 5: Compliance**

Under the Notifiable Data Breaches (NDB) scheme, you must notify the OAIC within 72 hours of a breach. MySDAManager's security architecture is designed to prevent breaches -- and our audit logs provide the evidence trail if an investigation is ever required.

Your participants trust you with their most personal information. We take that trust seriously.

Review your security settings: https://mysdamanager.com/settings/security?utm_source=email&utm_medium=welcome&utm_campaign=day6

Khen

---

### Email 6 -- Day 8

**Subject**: "We spent 4 days preparing for our last audit." It should take 10 minutes.
**Preview**: The Audit Pack Generator: 7 sections, one click, zero scrambling.

**Body**:

Hi {first_name},

Every SDA provider I speak with tells me the same story about audit preparation:

"We spent days gathering documents from shared drives, email attachments, and filing cabinets. We compiled everything into folders, cross-referenced spreadsheets, and hoped we had not missed anything."

The Audit Pack Generator changes that.

**One click. Seven sections. Under 10 seconds.**

When you click "Generate Audit Pack" in MySDAManager, the system produces a comprehensive PDF covering:

1. **Cover Page** -- Organisation details, generation timestamp, record counts
2. **Compliance Certifications** -- Every cert: type, issue date, expiry, status, linked property
3. **Incident Register** -- All incidents with classifications, response timelines, NDIS notification status
4. **Complaints Register** -- Reference numbers, acknowledgement timestamps, resolution status
5. **Participant Plans** -- NDIS plan dates, funding, design categories, expiry alerts
6. **Document Expiry Status** -- Every document sorted by expiry date
7. **Audit Log Integrity** -- Hash-chain verification proving records have not been tampered with

**Here is the key insight:**

The Audit Pack Generator does not create evidence. It compiles evidence that your team generated as a natural byproduct of daily operations. Every document you uploaded, every incident you logged, every certification you tracked -- it is all there.

Compliance evidence should be a byproduct of working, not a separate project.

**Try it now:**

If you have added properties, participants, and documents over the past week, go to Reports > Compliance and click "Generate Audit Pack." Review what the system has captured so far.

Generate your audit pack: https://mysdamanager.com/reports?utm_source=email&utm_medium=welcome&utm_campaign=day8

Even with just a few records, you will see the structure. Now imagine it with your full portfolio.

Khen

---

### Email 7 -- Day 11 (Trial Midpoint)

**Subject**: Day 11 of 14: how is your trial going?
**Preview**: Quick check-in. What have you explored? What questions do you have?

**Body**:

Hi {first_name},

You are 11 days into your MySDAManager trial. I wanted to check in.

**A quick self-assessment:**

Have you:

- [ ] Added at least one property with dwellings?
- [ ] Uploaded a compliance document with an expiry date?
- [ ] Created a participant profile?
- [ ] Viewed your compliance dashboard?
- [ ] Generated an audit pack (even a small one)?

If you have ticked 3 or more of these, you have seen the core value of the platform. The question now is: how does it feel compared to your current workflow?

If you have ticked fewer than 3, no judgement -- we know you are busy. But I want to make sure you experience the platform properly before your trial ends.

**Three things I would like to offer:**

1. **A 20-minute guided walkthrough.** I will share my screen and walk you through setup using your actual properties and participants. Reply to this email with "walkthrough" and I will send you a calendar link.

2. **Setup assistance.** If you send me a spreadsheet of your properties and participants, our team can pre-load them into your trial account. Reply with "setup help" and I will send instructions.

3. **Extended trial.** If you need more time, just ask. We would rather you make an informed decision than a rushed one.

**Pricing reminder:**

| Plan | Monthly | Properties | Users |
|------|---------|------------|-------|
| Starter | $250 | Up to 15 | Up to 5 |
| Professional | $450 | Up to 50 | Up to 15 |
| Enterprise | $600 | Unlimited | Unlimited |

All plans include every feature. No hidden costs. No feature gatekeeping.

See full pricing: https://mysdamanager.com/pricing?utm_source=email&utm_medium=welcome&utm_campaign=day11

Your trial has 3 days left. Let us make them count.

Khen

---

### Email 8 -- Day 13 (Trial Ending)

**Subject**: Your trial ends tomorrow. Here is a special offer.
**Preview**: Extend your trial or subscribe today and save 15% on your first 3 months.

**Body**:

Hi {first_name},

Your MySDAManager trial ends tomorrow.

Over the past two weeks, you have had access to the only platform built specifically for SDA property management: the Evidence Vault, the Compliance Watchdog, the Audit Pack Generator, offline incident reporting, AES-256 encryption, and every other feature we have shared with you.

**I want to make your decision easy.**

**Option 1: Subscribe today and save 15%**

Choose any plan and receive 15% off your first 3 months:

| Plan | Regular | With 15% off (first 3 months) |
|------|---------|-------------------------------|
| Starter | $250/month | $212.50/month |
| Professional | $450/month | $382.50/month |
| Enterprise | $600/month | $510/month |

Use code **LAUNCH15** at checkout.

Subscribe now: https://mysdamanager.com/pricing?utm_source=email&utm_medium=welcome&utm_campaign=day13&promo=LAUNCH15

**Option 2: Extend your trial**

Not ready yet? Reply to this email with "extend" and I will add 7 more days to your trial. No questions asked.

**Option 3: Let's talk**

If you have questions about pricing, features, or how MySDAManager fits your specific operation, reply to this email or book a call: https://mysdamanager.com/contact?utm_source=email&utm_medium=welcome&utm_campaign=day13

**What happens if your trial expires?**

Your data is preserved for 30 days after trial expiry. You can subscribe at any time during that window and pick up exactly where you left off. Nothing is lost.

After 30 days, your data is permanently deleted in accordance with our privacy policy.

**A final thought:**

Every day you manage your SDA portfolio with spreadsheets and shared drives is another day of compliance risk, wasted time, and operational friction. MySDAManager eliminates all of that for less than $10 per day.

Thank you for trying MySDAManager. Whatever you decide, I hope the past two weeks have shown you what purpose-built SDA management looks like.

Khen Manickam
Founder, MySDAManager

P.S. The 15% offer (code LAUNCH15) expires 48 hours after your trial ends. If you are going to subscribe, doing it now saves you up to $270 over 3 months.

---

## Sequence 2: Lead Nurture (Audit Checklist Downloaders)

**Trigger**: User downloads the "2026 NDIS SDA Audit Readiness Checklist" lead magnet (from LinkedIn ad, website, or blog post)
**Duration**: 60 days (6 emails)
**Goal**: Convert checklist downloaders into trial signups

---

### Email 1 -- Day 7

**Subject**: Did you score yourself on the audit checklist?
**Preview**: Most providers score 4 out of 10. Here is what to do about the gaps.

**Body**:

Hi {first_name},

A week ago, you downloaded our 2026 NDIS SDA Audit Readiness Checklist. I hope you have had a chance to work through it.

If you have, I have a question: how did you score?

**What we typically see:**

Most SDA providers score between 3 and 5 out of 10 on their first self-assessment. The most common gaps:

- **Certification tracking** (62% have at least one expired certificate they did not know about)
- **Incident reporting evidence** (71% cannot produce a complete incident register on demand)
- **Participant consent records** (58% have consent records older than 12 months)
- **Maintenance response documentation** (67% have no timestamps on maintenance requests)
- **Complaints handling timeline** (45% cannot demonstrate 5-day acknowledgement compliance)

**The good news:**

Every one of these gaps is closable. And most can be closed within 2 weeks with the right system.

If you scored 7 or above: Excellent. Your compliance posture is strong. You might benefit from a system that maintains that standard with less manual effort.

If you scored 4 to 6: You are aware of the gaps but have not had time (or the right tools) to close them. A purpose-built system would make a measurable difference.

If you scored below 4: Your next NDIS audit carries significant risk. Addressing these gaps should be a priority, and doing it with a dedicated tool will be faster than trying to fix spreadsheets.

**What to do next:**

MySDAManager was built to address every item on that checklist. The Compliance Watchdog, Evidence Vault, and Audit Pack Generator work together to close compliance gaps and keep them closed.

Start your 14-day free trial (no credit card required): https://mysdamanager.com/register?utm_source=email&utm_medium=nurture&utm_campaign=day7

If you want to discuss your specific gaps, reply to this email. I read every response.

Khen

---

### Email 2 -- Day 14

**Subject**: The NDIS Commission found 847 compliance breaches last quarter
**Preview**: Enforcement is increasing. Here are the most common findings -- and how to avoid them.

**Body**:

Hi {first_name},

The NDIS Quality and Safeguards Commission continues to increase its compliance monitoring and enforcement activity. For SDA providers, the practical implication is clear: the bar for acceptable compliance is rising.

**The most common audit findings for SDA providers:**

1. **Incomplete incident records** -- Incidents logged without proper classification, response timeline, or resolution documentation. The 24-hour reportable incident window (NDIS Rules 2018) is a frequent area of non-compliance.

2. **Expired certifications** -- Fire safety certificates, building compliance reports, or worker screening checks that have lapsed without renewal. A single expired certification is a finding. Multiple expired certifications suggest systemic failure.

3. **Inadequate complaints handling evidence** -- Complaints received but not formally acknowledged within 5 business days. No reference numbers assigned. No resolution timeline documented.

4. **Missing or outdated participant consent** -- Consent records that are more than 12 months old, not in accessible format, or do not reflect current data practices.

5. **Poor maintenance documentation** -- Maintenance requests without timestamps, no evidence of contractor engagement, no completion records.

**The common thread:**

None of these findings are about providers doing bad work. They are about providers who cannot prove they did good work because their documentation is incomplete, scattered, or undated.

**The fix:**

A system that generates evidence as a natural byproduct of daily operations. When logging an incident automatically creates a timestamped, classified record with response tracking -- that is compliance by design.

MySDAManager addresses every one of the five most common findings:

- Incident module with classification, 24-hour alerts, and offline reporting
- Compliance Watchdog with automated certification expiry tracking
- Complaints module with reference numbers, countdown timers, and SOP-001 compliance
- Participant consent lifecycle with Easy Read PDF support
- Maintenance tracking with timestamps from report to resolution

Start your free trial: https://mysdamanager.com/register?utm_source=email&utm_medium=nurture&utm_campaign=day14

Khen

---

### Email 3 -- Day 21

**Subject**: MySDAManager vs. spreadsheets: an honest comparison
**Preview**: We are not going to pretend spreadsheets never work. But here is where they fail.

**Body**:

Hi {first_name},

I am not going to tell you that spreadsheets are terrible. They are flexible, familiar, and free. For a provider managing 2-3 properties, a well-maintained spreadsheet can work.

But here is an honest comparison for providers managing 5+ properties:

**Where spreadsheets work:**
- Simple data storage (names, addresses, dates)
- Basic calculations (payment amounts, totals)
- Quick ad-hoc tracking

**Where spreadsheets fail:**

| Capability | Spreadsheet | MySDAManager |
|-----------|-------------|--------------|
| Automated expiry alerts | Manual checks or calendar reminders | Automated daily monitoring + 30-day warnings |
| Audit trail | None (no record of who changed what) | SHA-256 hash-chain audit log |
| Document storage | Separate system (Google Drive, Dropbox) | Integrated Evidence Vault with expiry tracking |
| Incident reporting | Manual form, email, or paper | Digital with offline support, auto-notifications |
| Audit pack generation | Days of manual compilation | One click, 7-section PDF in under 10 seconds |
| Multi-user access control | Shared sheet (everyone sees everything) | Role-based permissions (RBAC) |
| Participant data encryption | None | AES-256 encryption at rest |
| Maintenance tracking | Manual status updates | Timestamped lifecycle with contractor integration |
| Compliance monitoring | Someone remembers to check | 24/7 automated Watchdog |
| Mobile access | Awkward on phones | Progressive Web App (mobile-first) |

**The real cost of spreadsheets:**

It is not the subscription fee (spreadsheets are free). It is the 12-15 hours per week your team spends on data entry, document searching, cross-referencing, and manual compliance checking.

At $45/hour, that is $2,340-$2,925/month in labour costs for work that a $250-$450/month platform handles automatically.

**The honest answer:**

If you manage fewer than 5 properties and have a single dedicated compliance person, spreadsheets can work with enough discipline. For everyone else, the risk-to-cost ratio favours a purpose-built system.

See for yourself: https://mysdamanager.com/register?utm_source=email&utm_medium=nurture&utm_campaign=day21

Khen

---

### Email 4 -- Day 30

**Subject**: 5 things NDIS auditors check first (and how long it takes you to produce them)
**Preview**: Time yourself. If any of these take more than 2 minutes, you have a gap.

**Body**:

Hi {first_name},

Here is a practical exercise. Time yourself on each of these five requests:

**1. "Show me the current fire safety certificate for Property 3."**
Your time: _____ minutes
Target: Under 30 seconds

**2. "Show me your incident register for the past 12 months."**
Your time: _____ minutes
Target: Under 60 seconds

**3. "When was Participant A's consent last recorded?"**
Your time: _____ minutes
Target: Under 30 seconds

**4. "What is the average response time for maintenance requests this quarter?"**
Your time: _____ minutes
Target: Under 60 seconds

**5. "Show me the complaints you received in the past 6 months and their resolution status."**
Your time: _____ minutes
Target: Under 60 seconds

**Scoring:**

- All under target: Your compliance documentation is excellent. A platform like MySDAManager would maintain that standard with less effort.
- 3-4 under target: Good but gaps exist. Those gaps are where audit findings live.
- 1-2 under target: Significant compliance documentation risk. An auditor would flag multiple areas.
- None under target: Your next audit should be a priority concern.

**In MySDAManager, every one of these takes under 30 seconds.**

The Evidence Vault stores documents with instant search. The dashboard shows incident and complaint registers. Participant consent records are linked to profiles. Maintenance response times are calculated automatically.

This is not about having better software. It is about having immediate, confident access to your compliance evidence -- at any time, not just when you have had 6 weeks to prepare.

Start your free trial: https://mysdamanager.com/register?utm_source=email&utm_medium=nurture&utm_campaign=day30

Khen

---

### Email 5 -- Day 45

**Subject**: How much is your SDA compliance costing you? (ROI calculator)
**Preview**: A realistic calculation: time saved, risks avoided, money recovered.

**Body**:

Hi {first_name},

Let us do the maths for your operation.

**Calculate your current compliance cost:**

Step 1: Hours per week on administrative tasks
(Data entry, document filing, searching for records, updating spreadsheets, cross-referencing systems)

Your estimate: _____ hours/week x $45/hour x 4.3 weeks = $_____ /month

Step 2: Monthly software subscriptions
(Xero + project management + file storage + communication tools)

Your estimate: $_____ /month

Step 3: Audit preparation time
(Hours spent gathering documents, compiling reports, filling gaps before an audit)

Your estimate: _____ hours per audit cycle / 12 months = $_____ /month

Step 4: Compliance consultant fees
(Annual reviews, ad-hoc compliance advice)

Your estimate: $_____ /year / 12 = $_____ /month

**Your total monthly compliance cost: $_____**

**Now calculate the MySDAManager cost:**

| Your portfolio | Recommended plan | Monthly cost |
|----------------|-----------------|-------------|
| 1-15 properties | Starter | $250 |
| 16-50 properties | Professional | $450 |
| 50+ properties | Enterprise | $600 |

**Typical savings:**

Based on providers who have switched to MySDAManager:

| Area | Typical reduction |
|------|------------------|
| Administrative time | 60% reduction (9-10 hours/week saved) |
| Audit preparation | 95% reduction (days to minutes) |
| Compliance consultant | 50% reduction (system handles monitoring) |
| Other software subscriptions | 30-50% reduction (consolidation) |

**The number most providers do not calculate:**

Avoided audit findings. A single NDIS audit finding can cost $10,000-$25,000 in remediation. If MySDAManager prevents one finding over 3 years of use, it has paid for itself 5-10 times over.

Ready to see the savings for yourself?

Start your free trial: https://mysdamanager.com/register?utm_source=email&utm_medium=nurture&utm_campaign=day45

Khen

---

### Email 6 -- Day 60 (Final)

**Subject**: Last email from us (unless you want more)
**Preview**: A final offer: 14-day trial + 20% off your first 3 months. This is your best deal.

**Body**:

Hi {first_name},

This is the last email in this sequence. I want to respect your inbox, so I will be direct.

**Two months ago, you downloaded our NDIS SDA Audit Readiness Checklist.** You were interested enough in SDA compliance to take that step. I hope the checklist has been useful.

**Since then, we have shared:**
- The most common NDIS audit findings and how to avoid them
- An honest comparison of spreadsheets vs. purpose-built software
- A practical exercise to test your audit readiness
- An ROI framework for evaluating SDA management tools

**If you have not started a trial yet, I understand.** You are busy running an SDA operation. The last thing you need is another system to evaluate.

**So here is my best offer:**

**20% off your first 3 months** on any MySDAManager plan.

| Plan | Regular | With 20% off (3 months) | Monthly saving |
|------|---------|------------------------|----------------|
| Starter | $250/month | $200/month | $50 |
| Professional | $450/month | $360/month | $90 |
| Enterprise | $600/month | $480/month | $120 |

Use code **AUDIT20** when you subscribe.

This code expires in 14 days.

Start your trial: https://mysdamanager.com/register?utm_source=email&utm_medium=nurture&utm_campaign=day60&promo=AUDIT20

**Alternatively:**

If now is not the right time, I completely understand. You can:
- **Book a demo** for when you are ready: https://mysdamanager.com/contact?utm_source=email&utm_medium=nurture&utm_campaign=day60
- **Stay on our newsletter** for monthly SDA insights (The Compliance Pulse)
- **Unsubscribe** (link below) -- no hard feelings

Whatever you decide, I hope we have demonstrated that SDA property management does not have to be held together with spreadsheets and workarounds.

When you are ready, we are here.

Khen Manickam
Founder, MySDAManager

---

## Sequence 3: Monthly Newsletter ("The Compliance Pulse")

**Frequency**: Monthly (first Tuesday of each month)
**Audience**: All contacts (trial users, active subscribers, lead magnet downloaders, newsletter subscribers)
**Goal**: Stay top-of-mind, provide ongoing value, drive trial signups and feature adoption

---

### Newsletter Template

**Subject line formula**: The Compliance Pulse -- {Month} 2026: {Headline topic}
**Example**: The Compliance Pulse -- March 2026: New SDA Design Standard Changes

**Preview text**: {Compliance update summary} + 1 feature spotlight + SDA market data

---

**Body**:

# The Compliance Pulse
**{Month} 2026** | MySDAManager

---

## 1. Compliance Update

**{Headline: Specific regulatory change or enforcement trend}**

{2-3 paragraphs explaining a recent or upcoming NDIS regulatory change, enforcement action, or practice standard update relevant to SDA providers. Include specific regulation references where possible.}

**What SDA providers should do:**
- {Action item 1}
- {Action item 2}
- {Action item 3}

{Link to relevant NDIS Commission page or guidance document}

---

## 2. Feature Spotlight: {Feature Name}

**{One-line description of the feature}**

{2 paragraphs explaining what the feature does and why it matters for SDA providers. Include a specific use case or scenario.}

**How to use it:**
1. {Step 1}
2. {Step 2}
3. {Step 3}

{Screenshot or GIF placeholder}

{Link to feature in MySDAManager or demo video}

---

## 3. SDA Market Data

**{Stat headline -- a single compelling number}**

{1-2 paragraphs providing context for a market statistic, trend, or data point relevant to SDA providers. Sources should be cited where available.}

| Metric | Current | Previous Quarter | Change |
|--------|---------|-----------------|--------|
| {Metric 1} | {Value} | {Value} | {%} |
| {Metric 2} | {Value} | {Value} | {%} |
| {Metric 3} | {Value} | {Value} | {%} |

---

## 4. Blog Picks

**{Article 1 title}**
{One-sentence summary}
Read more: {link}

**{Article 2 title}**
{One-sentence summary}
Read more: {link}

---

## 5. From the Community

**{Tip or insight from an SDA provider}**

"{Quote from a provider about a compliance tip, operational improvement, or lesson learned.}"

-- {Name}, {Role}, {Organisation} (anonymised if preferred)

*Have a tip to share? Reply to this email and we may feature it in next month's issue.*

---

## 6. Get Started

{For non-subscribers}:
**Not using MySDAManager yet?**
Start your 14-day free trial -- every feature included, no credit card required.
[Start Free Trial](https://mysdamanager.com/register?utm_source=email&utm_medium=newsletter&utm_campaign={month})

{For active subscribers}:
**New this month:**
{Brief description of new feature or improvement released this month}
[See what's new](https://mysdamanager.com/dashboard?utm_source=email&utm_medium=newsletter&utm_campaign={month})

---

*You are receiving this email because you downloaded a resource from MySDAManager or subscribed to The Compliance Pulse.*
*[Unsubscribe](link) | [Update preferences](link) | [View in browser](link)*

MySDAManager | mysdamanager.com
Purpose-built SDA property management

---

### Newsletter Content Calendar (6 Months)

| Month | Compliance Update | Feature Spotlight | Market Data |
|-------|------------------|-------------------|-------------|
| March | NDIS Practice Standards review outcomes | Evidence Vault + AI Document Analysis | Q4 2025 SDA enrolment numbers |
| April | Worker screening check changes | Offline Incident Reporting | Regional SDA demand analysis |
| May | SDA pricing framework update | Compliance Watchdog setup guide | Provider portfolio size distribution |
| June | End-of-FY compliance requirements | Audit Pack Generator walkthrough | Annual SDA funding growth |
| July | New financial year NDIS changes | Calendar Integration | SDA vacancy rate trends |
| August | Incident reporting guideline updates | Communications Hub deep-dive | Technology adoption in disability sector |

---

## Sequence 4: Re-engagement (Churned Trials)

**Trigger**: Trial user has not logged in for 3+ days (tracked via session activity)
**Duration**: 30 days (4 emails)
**Goal**: Re-activate churned trial users or understand why they left

---

### Email 1 -- Day 3 (No login for 3 days)

**Subject**: We noticed you have not logged in recently
**Preview**: Your MySDAManager trial is still active. Need help getting started?

**Body**:

Hi {first_name},

I noticed you have not logged into MySDAManager in a few days. No pressure -- I just want to make sure everything is okay.

**Three common reasons people pause their trial:**

**1. "I have not had time to set it up properly."**
Completely understandable. SDA property managers are busy people. Here is the shortcut: send me a spreadsheet of your properties and participants (reply to this email with the file attached), and our team will pre-load them into your account. You will log in to a system that already has your data.

**2. "I got stuck on something."**
If you hit a technical issue or were not sure how to do something, reply to this email and tell me what happened. I will personally help you through it. Common questions we get:
- "How do I add multiple dwellings to a property?"
- "How do I connect my Xero account?"
- "How do I set up inspection templates?"

**3. "I am not sure it is right for us."**
That is a valid concern. If you have specific requirements or questions about whether MySDAManager fits your operation, let us have a quick conversation. Book a 15-minute call: https://mysdamanager.com/contact?utm_source=email&utm_medium=reengagement&utm_campaign=day3

**Your trial status:**

- Plan: {plan_name}
- Days remaining: {days_remaining}
- Properties added: {property_count}
- Participants added: {participant_count}

Your data is safe and waiting for you: https://mysdamanager.com/dashboard?utm_source=email&utm_medium=reengagement&utm_campaign=day3

Khen

---

### Email 2 -- Day 7 (No login for 7 days)

**Subject**: What held you back? (30-second survey)
**Preview**: Help us understand what did not work. Your feedback makes the product better.

**Body**:

Hi {first_name},

It has been a week since your last login to MySDAManager. I want to understand what held you back so we can improve -- both for you and for future users.

**Would you take 30 seconds to answer one question?**

What was the primary reason you stopped using MySDAManager during your trial?

Reply to this email with the letter that best matches:

**A** -- I did not have time to set it up properly
**B** -- The setup process was confusing or too complex
**C** -- It does not have a feature I need (please specify)
**D** -- The price is too high for our budget
**E** -- We decided to stick with our current system
**F** -- I am still planning to use it, just have not had time
**G** -- Other (please explain)

That is it. One letter. I read every response personally.

**If you answered F:**

Your trial has {days_remaining} days left. Here is the fastest way to experience value:

1. Log in: https://mysdamanager.com/login
2. Add one property (3 minutes)
3. Upload one compliance document (1 minute)
4. Generate an audit pack (1 click)

Total time: Under 5 minutes. And you will immediately see how the platform works with your data.

**If you answered D:**

Our Starter plan is $250/month -- less than $10/day. For a provider managing 10 properties spending 12+ hours per week on administration, the ROI is typically 4-6x within the first month. But if budget is genuinely the constraint, reply and let us discuss options.

Thank you for your honesty. It genuinely helps.

Khen

---

### Email 3 -- Day 14 (No login for 14 days)

**Subject**: 3 things we have shipped since you last logged in
**Preview**: New features that might change your mind. Plus: your trial status.

**Body**:

Hi {first_name},

MySDAManager is improving every week. Here are three things we have shipped since you last logged in:

**1. {Recent Feature 1}**
{2-3 sentences describing a recently released feature and why it matters for SDA providers.}

**2. {Recent Feature 2}**
{2-3 sentences describing a recently released feature and why it matters for SDA providers.}

**3. {Recent Feature 3}**
{2-3 sentences describing a recently released feature and why it matters for SDA providers.}

**What other users are saying:**

"{Testimonial quote about specific value gained from MySDAManager}"
-- {Name}, {Role}, SDA Provider

**Your trial status:**

Your trial expires in {days_remaining} days. Your data ({property_count} properties, {participant_count} participants, {document_count} documents) is still intact and waiting for you.

Log in and see what is new: https://mysdamanager.com/dashboard?utm_source=email&utm_medium=reengagement&utm_campaign=day14

If you have decided MySDAManager is not for you, I completely respect that decision. But if there is something specific that would make it right for you, I would love to hear it.

Khen

---

### Email 4 -- Day 30 (Final re-engagement)

**Subject**: Your MySDAManager data will be deleted in 7 days
**Preview**: Final notice: your trial data expires soon. Here is how to save it (+ a special offer).

**Body**:

Hi {first_name},

This is a courtesy notice: your MySDAManager trial data will be permanently deleted in 7 days, in accordance with our privacy policy.

This includes:
- {property_count} properties and their associated dwellings
- {participant_count} participant records
- {document_count} uploaded documents
- All compliance data, communications, and audit logs

**If you want to keep your data:**

Subscribe to any plan before the deletion date and everything is preserved. No re-entry needed.

**As a final gesture, here is our best offer:**

**25% off your first 3 months** on any plan:

| Plan | Regular | With 25% off |
|------|---------|-------------|
| Starter | $250/month | $187.50/month |
| Professional | $450/month | $337.50/month |
| Enterprise | $600/month | $450/month |

Use code **COMEBACK25** at checkout: https://mysdamanager.com/pricing?utm_source=email&utm_medium=reengagement&utm_campaign=day30&promo=COMEBACK25

This code expires when your data is deleted (in 7 days).

**Alternatively:**

If you would like an extended trial to give MySDAManager another chance, reply to this email with "extend" and I will add 14 more days.

**If you have decided to move on:**

No hard feelings. You will remain on our monthly newsletter (The Compliance Pulse) unless you unsubscribe. We share SDA market insights and compliance tips that are valuable regardless of what tools you use.

If anything changes in the future, we will be here.

Thank you for giving MySDAManager a try.

Khen Manickam
Founder, MySDAManager

---

## Email Design Guidelines

### Visual Standards

**Header**: MySDAManager logo (teal-600 accent), clean white background
**Body**: Left-aligned text, 16px base font size, 1.6 line height
**CTAs**: Teal-600 (#0d9488) buttons, white text, 16px padding, rounded corners
**Footer**: Unsubscribe link, company address, social links (LinkedIn)

### Tone and Voice

- **Professional but personal**: First person from Khen (the founder), not "the team"
- **Direct, not salesy**: State the problem, show the solution, respect the reader's intelligence
- **Australian English**: -ise spelling, DD/MM/YYYY dates, $ for AUD
- **No pressure tactics**: Always offer alternatives (extend trial, book a call, stay on newsletter)
- **Specific, not vague**: Use real numbers, real features, real scenarios

### Technical Implementation

- **Platform**: Resend API via noreply@mysdamanager.com
- **Personalisation fields**: {first_name}, {plan_name}, {days_remaining}, {property_count}, {participant_count}, {document_count}
- **UTM parameters**: utm_source=email, utm_medium={sequence_name}, utm_campaign={email_identifier}
- **Unsubscribe**: One-click unsubscribe per Australian Spam Act 2003
- **Mobile**: All emails responsive, single-column layout, buttons minimum 44px tap target
- **Plain text**: All emails should have plain-text versions (not just HTML)

### A/B Testing Plan

**Welcome Sequence**:
- Test Day 0 subject line: "Welcome to MySDAManager" vs. "Your SDA operations start here"
- Test Day 13 discount: 15% vs. 20% vs. free month

**Lead Nurture**:
- Test Day 7 subject line: "Did you score yourself?" vs. "Your audit readiness score"
- Test Day 60 discount: 20% vs. extended trial offer

**Re-engagement**:
- Test Day 3 subject line: empathetic vs. data-driven ("We noticed you haven't logged in" vs. "Your trial: 3 properties added, 0 documents uploaded")
- Test Day 30 discount: 25% off vs. free extra month

### Performance Benchmarks

| Metric | Welcome | Lead Nurture | Newsletter | Re-engagement |
|--------|---------|-------------|------------|---------------|
| Open rate | 55-65% | 35-45% | 30-40% | 25-35% |
| Click-through rate | 8-12% | 5-8% | 3-5% | 4-7% |
| Reply rate | 3-5% | 2-4% | 1-2% | 5-8% |
| Unsubscribe rate | <0.5% | <1% | <0.5% | <2% |
| Trial conversion | 25-35% | 8-12% | N/A | 10-15% |

---

*Last updated: 14/02/2026*
*Author: MySDAManager Marketing*
