# MySDAManager Competitor Analysis

> **Date**: 2026-02-14
> **Conclusion**: No direct, like-for-like competitor exists.

MySDAManager sits in a unique niche: a purpose-built SaaS platform specifically for **SDA property management** that combines property/dwelling management, participant tracking, NDIS payments, maintenance workflows, compliance, and multi-tenant architecture in one app. Most competitors fall into one of these adjacent categories:

---

## Category 1: General NDIS Care Management Software

These are the largest players but focus on **care delivery** (rostering, timesheets, shift notes) rather than **property management**.

| Product | Focus | SDA Features | Gap vs MySDAManager |
|---|---|---|---|
| **Lumary** | SIL/SDA + care delivery | SDA/SIL funding planning, participant-home matching, roster of care, vacancy management | No property maintenance, no owner financials, no contractor workflows |
| **ShiftCare** | Rostering + billing | NDIS claims, scheduling, compliance docs | No SDA property features at all |
| **CareMaster** | End-to-end NDIS ops | Vehicle/property asset tracking, SDA billing | Property features are basic asset registers, not full management |
| **Vertex360** | NDIS provider management | AI shift notes, scheduling, billing | No SDA/property features |
| **Astalty** | NDIS business ops | Scheduling, invoicing, compliance | No SDA-specific features. $64/user/month |
| **DSC Software (Dayspring Care)** | NDIS + HCP + Property Care | Rostering for "Property Care" providers, incident management | Closest general NDIS platform to our space but still care-delivery focused |
| **FlowLogic** | NDIS compliance | Claims, goals, reporting | No property management |

**Lumary** is the closest competitor in this category - they have a dedicated "Disability Connect" product for SIL/SDA providers with vacancy management and participant matching. But they're primarily a **care delivery** platform, not a **property management** one.

### Links
- Lumary: https://lumary.com/ | SIL/SDA product: https://content.lumary.com/lumary-disability-connect-sil-software
- ShiftCare: https://shiftcare.com/solutions/ndis-providers-software
- CareMaster: https://caremaster.com.au/ | Pricing: https://caremaster.com.au/pricing/
- Vertex360: https://vertex360.io/ndis-software/
- Astalty: https://astalty.com.au/ | Pricing: https://astalty.com.au/pricing
- DSC Software: https://www.dayspringcare.com.au/
- FlowLogic: https://ndis-software.com.au/

---

## Category 2: Property Management Software with SDA Bolt-Ons

| Product | Focus | SDA Features | Gap vs MySDAManager |
|---|---|---|---|
| **OurProperty** | General real estate PM | Added SDA invoicing/reporting in Jan 2026 update | Built for real estate agencies, SDA is an afterthought. No NDIS participant tracking, no compliance library, no incident management |

OurProperty is interesting because they recently added SDA support, suggesting **growing market demand**. But it's a general property management tool adapted for SDA, not purpose-built.

### Links
- OurProperty: https://www.ourproperty.com.au/ | Jan 2026 SDA update: https://www.ourproperty.com.au/jan-2026-whats-new-improved/

---

## Category 3: Maintenance/Asset Management (CMMS)

| Product | Focus | SDA Features | Gap vs MySDAManager |
|---|---|---|---|
| **Pinnacle CMMS** | Asset & maintenance management | NDIS-specific maintenance workflows, contractor management, compliance audit | No participant management, no NDIS payments, no dwelling/property hierarchy |

Pinnacle only covers the **maintenance slice** of what MySDAManager does. Good at that one thing but not a full platform.

### Links
- Pinnacle CMMS: https://www.pinnacle.com.au/ndis/

---

## Category 4: SDA Property Management Services (Not Software)

These are **managed services** companies, not SaaS products. They use internal tools to manage SDA properties for owners. They are actually **potential customers** for MySDAManager, not competitors.

| Company | What They Do |
|---|---|
| **SDA Consulting** | Licensed property manager for SDA nationally. Uses cloud tools internally + tenant app |
| **Just SDA Management** | SDA property management services |
| **SDA Management Australia** | SDA property management for landlords |
| **Home In Place** | Large SDA housing provider with tenancy & property services |

### Links
- SDA Consulting: https://sdaconsulting.com.au/property-management/
- Just SDA Management: https://www.justsda.com.au/
- SDA Management Australia: https://sdama.com.au/for-landlords/
- Home In Place: https://homeinplace.org/specialist-disability-accommodation/sda-tenancy-and-property-services/

---

## Competitive Positioning

```
                    Property Management Focus
                           HIGH
                            |
    OurProperty             |          MySDAManager
    (general PM +           |          (PURPOSE-BUILT)
     SDA bolt-on)           |
                            |
  ──────────────────────────┼──────────────────────────
    Pinnacle CMMS           |          Lumary DC
    (maintenance only)      |          (SIL/SDA care
                            |           + basic property)
                            |
                           LOW
              LOW ──────────────────── HIGH
                    NDIS Care Delivery Focus
```

---

## MySDAManager Competitive Advantages

1. **No direct competitor exists** - Nobody combines SDA property management + NDIS participant tracking + payments/claims + maintenance + compliance in one SaaS platform
2. **Multi-tenant SaaS** - Most NDIS tools are single-instance. Multi-org architecture with white-labeling is rare
3. **SDA-specific workflows** - MTA documents, SDA design categories, dwelling hierarchies, RRC calculations, NDIS claim exports
4. **Compliance-first** - Built-in policies library, consent workflows, incident management with NDIS reporting deadlines, audit pack export
5. **Price point** - At $250-600/mo per org, competitive with Astalty ($64/user, so ~$320/mo for 5 users) and cheaper than enterprise platforms like Lumary
6. **Modern tech stack** - Real-time (Convex), PWA, offline support, AI summaries - most NDIS software looks dated

---

## Potential Threats

1. **Lumary expanding** into deeper SDA property management features
2. **OurProperty** continuing to build out their SDA module
3. **SDA Consulting** potentially productizing their internal tools
4. **New entrant** from the real estate tech space (e.g., PropertyMe, MRI Software) adding NDIS/SDA modules

---

## Go-To-Market Recommendation

The biggest opportunity is targeting the **Category 4 companies** (SDA property management services) as customers. They're managing SDA properties manually or with cobbled-together tools. MySDAManager gives them a purpose-built platform. The market gap is clear.

### Pricing Comparison

| Product | Pricing Model | Approximate Cost (5 users) |
|---|---|---|
| **MySDAManager Starter** | $250/mo per org | $250/mo |
| **MySDAManager Professional** | $450/mo per org | $450/mo |
| **MySDAManager Enterprise** | $600/mo per org | $600/mo |
| **Astalty** | $64/mo per user | $320/mo |
| **CareMaster** | Per user (tiered) | Contact for quote |
| **OurProperty** | Subscription + per-feature fees | Contact for quote |
| **Pinnacle CMMS** | Enterprise pricing | Contact for quote |
| **Lumary** | Enterprise pricing | Contact for quote |
