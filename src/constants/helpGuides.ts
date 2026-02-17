import type { HelpGuide } from "@/components/ui/HelpGuidePanel";

export const HELP_GUIDES: Record<string, HelpGuide> = {
  // ---------------------------------------------------------------------------
  // 1. INCIDENTS
  // ---------------------------------------------------------------------------
  incidents: {
    id: "incidents",
    title: "Incident Reporting Guide",
    subtitle: "NDIS compliance requirements for incident management",
    overview:
      "Incidents are safety-related events that affect participants, staff, or visitors. They are distinct from maintenance requests, which deal with property repairs. Every incident must be documented promptly to meet NDIS Quality and Safeguards Commission requirements and to protect participant wellbeing.",
    sections: [
      {
        id: "when-to-report-an-incident",
        title: "When to Report an Incident",
        icon: "alert",
        color: "red",
        badge: "CRITICAL",
        defaultExpanded: true,
        content: [
          {
            type: "text",
            value:
              "An incident is any event that causes harm, risk of harm, or a near-miss involving a participant. It is not the same as a maintenance request. A broken tap is maintenance; a participant scalded by hot water is an incident.",
          },
          {
            type: "list",
            value: [
              "Injury to a participant, staff member, or visitor",
              "Property damage caused by or affecting a participant",
              "Behavioural incident involving aggression, self-harm, or absconding",
              "Medication error (wrong dose, missed dose, wrong medication)",
              "Abuse or neglect (suspected or confirmed)",
              "Missing participant or participant at risk",
              "Death of a participant",
            ],
          },
          {
            type: "warning",
            value:
              "If in doubt, report it as an incident. It is always better to over-report than to miss a reportable event.",
          },
        ],
      },
      {
        id: "ndis-reportable-incidents",
        title: "NDIS Reportable Incidents",
        icon: "shield",
        color: "red",
        badge: "24HR",
        content: [
          {
            type: "text",
            value:
              "Certain incidents must be reported to the NDIS Quality and Safeguards Commission within strict timeframes. Failure to report can result in sanctions, civil penalties, or banning orders against your organisation.",
          },
          {
            type: "list",
            value: [
              "Death of a participant",
              "Serious injury requiring emergency hospital treatment",
              "Abuse or neglect causing serious harm to a participant",
              "Unlawful sexual or physical contact of a participant by a staff member",
              "Sexual misconduct committed against a participant by a staff member",
              "Use of an unauthorised restrictive practice on a participant",
            ],
          },
          {
            type: "list",
            value: [
              "5 business day notification: suspected abuse or neglect",
              "5 business day notification: unlawful physical contact not involving serious harm",
              "5 business day notification: unexplained serious injury to a participant",
              "5 business day notification: missing participant who is at risk of harm",
            ],
          },
          {
            type: "warning",
            value:
              "Timeframes start when you BECOME AWARE of the incident, not when it occurred. Report to the NDIS Quality and Safeguards Commission at 1800 035 544 or via their provider portal.",
          },
        ],
      },
      {
        id: "reporting-workflow",
        title: "Reporting Workflow",
        icon: "list",
        color: "teal",
        content: [
          {
            type: "steps",
            value: [
              "Log the incident immediately in MySDAManager with as much detail as available",
              "Ensure participant safety - take any immediate protective actions needed",
              "Assess severity: Critical (life threat), Major (NDIS reportable), Moderate (action needed), Minor (preventative)",
              "If NDIS reportable: notify the NDIS Quality and Safeguards Commission within 24 hours via their online portal",
              "Complete investigation within 7 days - gather evidence, interview witnesses, review records",
              "Document actions taken and preventive measures implemented",
              "Close the incident with final notes and lessons learned",
            ],
          },
        ],
      },
      {
        id: "completing-the-form",
        title: "Completing the Form",
        icon: "file",
        color: "gray",
        content: [
          {
            type: "fields",
            value: [
              "**Title**: Be specific - include what happened and where (e.g. 'Hot water scalding in Dwelling 2 bathroom')",
              "**Description**: What happened, when exactly, who was involved, immediate actions taken. Write factually - avoid opinions.",
              "**Severity**: Critical = immediate life threat. Major = NDIS reportable. Moderate = participant affected. Minor = near-miss or low impact.",
              "**Incident Type**: Select the most specific type. If multiple apply, choose the most serious one.",
              "**Property & Dwelling**: Link to the exact location. This creates automatic cross-references.",
              "**Participant**: Link to affected participant(s). This notifies their Support Coordinator.",
              "**Photos**: Required for property damage and visible injuries (with consent). Take wide shots for context and close-ups for detail.",
            ],
          },
        ],
      },
      {
        id: "best-practices",
        title: "Best Practices",
        icon: "check",
        color: "green",
        badge: "BEST PRACTICE",
        content: [
          {
            type: "list",
            value: [
              "Report first, investigate after - never delay reporting to gather more information",
              "Use objective language: 'Participant fell at 2:15pm in hallway' not 'They tripped because they weren't being careful'",
              "Include witness names while they are available - memories fade quickly",
              "Take photos immediately with timestamps enabled on your phone",
              "Always offer the participant support and explain what happens next",
              "Follow up within 48 hours to check on participant wellbeing",
            ],
          },
          {
            type: "tip",
            value:
              "The incident form works offline too. If you are on-site with poor reception, fill it out and it will sync automatically when you reconnect.",
          },
        ],
      },
      {
        id: "common-mistakes-to-avoid",
        title: "Common Mistakes to Avoid",
        icon: "warning",
        color: "yellow",
        content: [
          {
            type: "list",
            value: [
              "Waiting to report until you have 'all the information' - report immediately, update later",
              "Classifying abuse or neglect as a 'behavioural incident' to avoid NDIS notification",
              "Uploading photos that show a participant's face without their consent",
              "Forgetting to follow up on actions - the system tracks this automatically",
              "Not linking the incident to the correct property/participant - this breaks audit trails",
            ],
          },
        ],
      },
    ],
    relatedLinks: [
      { label: "Compliance Dashboard", href: "/compliance" },
      {
        label: "NDIS Commission Portal",
        href: "https://www.ndiscommission.gov.au/providers/provider-portal",
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // 2. MAINTENANCE
  // ---------------------------------------------------------------------------
  maintenance: {
    id: "maintenance",
    title: "Maintenance Management Guide",
    subtitle: "From request to completion - managing property maintenance",
    overview:
      "Log, track, and resolve maintenance requests across all SDA and SIL properties. Every maintenance request follows a defined lifecycle from initial report through to completion and closure, with full audit trails and photo documentation.",
    sections: [
      {
        id: "maintenance-vs-incident",
        title: "Maintenance vs Incident",
        icon: "info",
        color: "teal",
        defaultExpanded: true,
        content: [
          {
            type: "text",
            value:
              "Before logging a request, determine whether the issue is maintenance, an incident, or both. This ensures it is routed correctly and any compliance obligations are met.",
          },
          {
            type: "list",
            value: [
              "Maintenance: Broken equipment, wear and tear, scheduled repairs, cosmetic damage",
              "Incident: Safety hazard, participant injury, emergency situation, abuse or neglect",
              "Both: Gas leak (emergency maintenance + safety incident), flooding (property damage + participant risk)",
            ],
          },
          {
            type: "tip",
            value:
              "If a maintenance issue poses immediate risk to a participant, log it as BOTH an incident and a maintenance request.",
          },
        ],
      },
      {
        id: "request-lifecycle",
        title: "Request Lifecycle",
        icon: "list",
        color: "teal",
        content: [
          {
            type: "text",
            value:
              "Every maintenance request follows this 8-stage lifecycle. Each status change is logged for audit purposes.",
          },
          {
            type: "steps",
            value: [
              "Reported - Staff logs the issue with description, photos, and priority",
              "Awaiting Quotes - Request sent to relevant contractors for pricing",
              "Quoted - Quotes received and under review by property manager",
              "Approved - Best quote selected, contractor notified",
              "Scheduled - Work date confirmed with contractor and participant",
              "In Progress - Contractor on-site performing the work",
              "Completed - Work finished, before/after photos uploaded, quality verified",
              "Closed - Final review complete, invoice processed",
            ],
          },
        ],
      },
      {
        id: "priority-assessment",
        title: "Priority Assessment",
        icon: "alert",
        color: "yellow",
        badge: "KEY SKILL",
        content: [
          {
            type: "fields",
            value: [
              "**Urgent**: Safety hazard, essential service down (no hot water, power outage, security breach). Target response: same day.",
              "**High**: Impacts daily living significantly (broken appliance, leaking tap, blocked drain). Target: within 48 hours.",
              "**Medium**: Non-urgent but needed repair (cracked tile, stiff door, minor cosmetic). Target: within 1 week.",
              "**Low**: Preventative or cosmetic work (painting, garden maintenance, minor wear). Target: within 1 month.",
            ],
          },
          {
            type: "warning",
            value:
              "Always assess from the PARTICIPANT's perspective. A broken air conditioner might be 'Medium' in autumn, but 'Urgent' during a heatwave for someone with limited mobility.",
          },
        ],
      },
      {
        id: "quote-request-process",
        title: "Quote Request Process",
        icon: "dollar",
        color: "purple",
        content: [
          {
            type: "steps",
            value: [
              "From the maintenance request, click 'Request Quotes'",
              "Select contractors by specialty (plumber, electrician, HVAC, builder, etc.)",
              "An email is automatically sent with property address, issue description, and photos",
              "Contractors receive a unique link to submit their quote online",
              "Compare quotes side-by-side on the maintenance request detail page",
              "Select the winning quote and update status to 'Approved'",
            ],
          },
          {
            type: "tip",
            value:
              "Maintain at least 2-3 contractors per specialty in your database. This ensures competitive quotes and backup options if one is unavailable.",
          },
        ],
      },
      {
        id: "completing-the-form",
        title: "Completing the Form",
        icon: "file",
        color: "gray",
        content: [
          {
            type: "fields",
            value: [
              "**Title**: Brief summary (e.g. 'Leaking kitchen tap in Unit 3')",
              "**Category**: Select the most specific type - HVAC, Plumbing, Electrical, Structural, etc. Avoid 'Other' if a better category exists.",
              "**Description**: What is broken, when it was noticed, any temporary fixes applied. The more detail, the better the quote.",
              "**Priority**: Use the assessment guide above. When unsure, mark as High and let the property manager adjust.",
              "**Property & Dwelling**: Always specify the exact dwelling, not just the property.",
              "**Estimated Cost**: Optional but helpful for budget planning. Leave blank if unknown.",
              "**Photos**: Before-photos help contractors prepare accurate quotes. Include a wide shot of the area plus a close-up of the issue.",
            ],
          },
        ],
      },
      {
        id: "best-practices",
        title: "Best Practices",
        icon: "check",
        color: "green",
        badge: "BEST PRACTICE",
        content: [
          {
            type: "list",
            value: [
              "Use the preventative schedule to catch issues early and reduce emergency repairs",
              "Always upload before AND after photos - these are critical for insurance claims and owner reports",
              "Notify the participant before contractors visit their dwelling",
              "Check if the issue is covered by warranty before requesting external quotes",
              "Track contractor response times and quality - this data helps choose better contractors over time",
              "Close completed requests promptly so dashboards and reports stay accurate",
            ],
          },
        ],
      },
    ],
    relatedLinks: [
      { label: "Preventative Schedule", href: "/preventative-schedule" },
      { label: "Contractors", href: "/contractors" },
    ],
  },

  // ---------------------------------------------------------------------------
  // 3. INSPECTIONS
  // ---------------------------------------------------------------------------
  inspections: {
    id: "inspections",
    title: "Property Inspection Guide",
    subtitle: "BLS inspection template and mobile inspection tips",
    overview:
      "Regular property inspections ensure SDA compliance, participant safety, and property condition monitoring. Inspections are conducted on-site using a mobile-optimised checklist and produce PDF reports for property managers, owners, and compliance records.",
    sections: [
      {
        id: "inspection-schedule",
        title: "Inspection Schedule",
        icon: "clock",
        color: "teal",
        defaultExpanded: true,
        content: [
          {
            type: "text",
            value:
              "Different property types require different inspection frequencies. Use this as a baseline and adjust based on risk factors such as participant needs, property age, and incident history.",
          },
          {
            type: "fields",
            value: [
              "**Move-in Inspection**: Within 7 days of a new participant moving in. Documents baseline property condition.",
              "**Quarterly**: Every 3 months for High Physical Support (HPS) and Robust category properties.",
              "**Bi-annual**: Every 6 months for Fully Accessible properties.",
              "**Annual**: Once per year for Improved Liveability properties.",
              "**Move-out**: Within 3 days of a participant vacating. Compare against move-in inspection.",
              "**Ad-hoc**: After major maintenance work, following an incident, or if concerns are raised.",
            ],
          },
        ],
      },
      {
        id: "using-the-bls-template",
        title: "Using the BLS Template",
        icon: "list",
        color: "teal",
        content: [
          {
            type: "text",
            value:
              "The BLS inspection template covers 8 categories with over 100 checklist items. Each item is marked Pass, Fail, or N/A with optional photos and comments.",
          },
          {
            type: "list",
            value: [
              "Safety: Fire extinguishers, smoke alarms, exit signs, handrails, non-slip surfaces",
              "Accessibility: Doorway widths, grab rails, ramp gradients, switch heights, emergency systems",
              "Functionality: Hot water (must be 50-60 degrees C), appliances, lighting, plumbing, HVAC",
              "Cleanliness: Common areas, participant spaces, outdoor areas, pest control",
              "Structural: Walls, floors, ceilings, windows, doors, roof condition",
              "Compliance: Certificates displayed, emergency plans posted, first aid accessible",
              "Participant Feedback: Satisfaction, comfort, any concerns or requests",
              "Overall Assessment: Summary rating, recommended actions, follow-up date",
            ],
          },
          {
            type: "tip",
            value:
              "For each failed item, add a clear comment explaining why it failed and what action is needed. Failed items can automatically generate maintenance requests.",
          },
        ],
      },
      {
        id: "mobile-inspection-tips",
        title: "Mobile Inspection Tips",
        icon: "tool",
        color: "green",
        badge: "MOBILE",
        content: [
          {
            type: "list",
            value: [
              "The inspection form works fully offline - start the inspection even without mobile signal",
              "Take photos as you go - use the camera button next to each checklist item",
              "Good lighting matters: turn on all lights before photographing. Use flash only if needed.",
              "Include context in photos: take a wide shot of the room then close-ups of specific issues",
              "Mark items as Pass or Fail. If unsure, mark Fail with a note - it is easier to upgrade than to miss an issue",
              "Comments are required for any Fail items. Be specific about what needs fixing.",
              "Your inspection will auto-sync when you reconnect to the internet",
            ],
          },
          {
            type: "warning",
            value:
              "Battery tip: Inspections with lots of photos can drain your phone quickly. Start with a full charge or bring a portable charger.",
          },
        ],
      },
      {
        id: "after-the-inspection",
        title: "After the Inspection",
        icon: "check",
        color: "gray",
        content: [
          {
            type: "steps",
            value: [
              "Review all items before submitting - especially any Fail items and their comments",
              "Submit the inspection. A PDF report is automatically generated.",
              "Failed items will appear as recommended maintenance actions",
              "Share the report with the property manager and participant (if requested)",
              "Schedule any follow-up inspections for items that need re-checking",
              "The inspection history is available on each property's detail page",
            ],
          },
        ],
      },
      {
        id: "common-issues-to-watch-for",
        title: "Common Issues to Watch For",
        icon: "warning",
        color: "yellow",
        content: [
          {
            type: "list",
            value: [
              "Fire safety: Expired extinguishers, missing smoke alarm batteries, blocked exits, outdated emergency plans",
              "Accessibility: Loose grab rails, damaged ramps, high switches, heavy doors",
              "Hot water: Must be between 50-60 degrees C at the tap. Too hot risks scalding, too cold risks legionella",
              "Pest evidence: Droppings, damage to food packaging, unusual smells, visible insects",
              "Mould: Check bathrooms, laundry, and any areas with poor ventilation",
              "Security: Broken locks, damaged windows, non-functioning intercoms or cameras",
            ],
          },
        ],
      },
    ],
    relatedLinks: [
      { label: "Inspection Templates", href: "/inspections/templates" },
      { label: "Properties", href: "/properties" },
    ],
  },

  // ---------------------------------------------------------------------------
  // 4. PAYMENTS
  // ---------------------------------------------------------------------------
  payments: {
    id: "payments",
    title: "SDA Payments Guide",
    subtitle: "Recording payments, understanding SDA funding, and NDIS exports",
    overview:
      "Track all SDA-related payments including NDIS funding, Reasonable Rent Contributions, and owner distributions. The payments module ensures accurate financial records for NDIS compliance, owner reporting, and organisational accounting.",
    sections: [
      {
        id: "understanding-sda-revenue",
        title: "Understanding SDA Revenue",
        icon: "dollar",
        color: "teal",
        defaultExpanded: true,
        content: [
          {
            type: "text",
            value:
              "Each participant generates revenue from multiple sources. Understanding these revenue streams is essential for accurate payment recording and owner distributions.",
          },
          {
            type: "fields",
            value: [
              "**SDA Funding**: The NDIS payment for the participant's accommodation. Amount varies by SDA design category (HPS pays highest, Improved Liveability pays lowest) and is specified in the participant's NDIS plan.",
              "**Reasonable Rent Contribution (RRC)**: The participant's own contribution, calculated as 25% of the Disability Support Pension PLUS 100% of Commonwealth Rent Assistance. This is collected directly from the participant.",
              "**SDA Provider Fee**: The management fee deducted before paying the property owner. This is your organisation's revenue for managing the property.",
            ],
          },
          {
            type: "tip",
            value:
              "The participant's NDIS plan specifies their exact SDA funding amount. Always verify this before recording payments.",
          },
        ],
      },
      {
        id: "recording-a-payment",
        title: "Recording a Payment",
        icon: "file",
        color: "gray",
        content: [
          {
            type: "fields",
            value: [
              "**Payment Date**: The date payment was received (not the invoice date or service period)",
              "**Amount**: The gross amount received, before any deductions",
              "**Payment Type**: 'SDA Funding' for NDIS payments, 'RRC' for participant contributions, 'Other' for ad-hoc payments",
              "**Participant**: Link to the participant. Must have an active NDIS plan with SDA funding.",
              "**Property**: Auto-populated from participant's dwelling assignment",
              "**Reference**: Bank reference number or NDIS payment reference for reconciliation",
            ],
          },
          {
            type: "warning",
            value:
              "Payments are validated against the participant's NDIS plan. The system will reject payments if the plan has expired. Ensure plans are kept up to date.",
          },
        ],
      },
      {
        id: "variance-detection",
        title: "Variance Detection",
        icon: "alert",
        color: "yellow",
        badge: "IMPORTANT",
        content: [
          {
            type: "text",
            value:
              "The system automatically flags payments that differ from expected amounts. Variance monitoring helps catch errors early and ensures participants receive the correct funding.",
          },
          {
            type: "list",
            value: [
              "A variance alert is triggered when a payment differs by more than $500 from the expected amount",
              "Common causes: NDIS plan changes, pro-rata calculations for partial months, processing errors",
              "To investigate: Check the participant's current plan amount, verify the payment period, and contact NDIS if the variance is unexplained",
              "Variance history is tracked on each participant's payment record for trend analysis",
            ],
          },
        ],
      },
      {
        id: "ndis-export",
        title: "NDIS Export",
        icon: "list",
        color: "purple",
        content: [
          {
            type: "steps",
            value: [
              "Navigate to Payments > NDIS Export",
              "Select the reporting period (typically quarterly)",
              "Review the export preview - check participant names, amounts, and dates",
              "Download the CSV file in NDIS-compliant format",
              "Upload to the NDIS portal via your provider account",
              "Mark the export as submitted in MySDAManager for tracking",
            ],
          },
          {
            type: "tip",
            value:
              "Run the export preview first and check for any warnings. Common issues include missing participant NDIS numbers or expired plans.",
          },
        ],
      },
      {
        id: "owner-distributions",
        title: "Owner Distributions",
        icon: "home",
        color: "green",
        content: [
          {
            type: "text",
            value:
              "After collecting payments and deducting the provider fee, the remaining funds are distributed to property owners. The Folio Summary report provides a complete breakdown for each owner.",
          },
          {
            type: "steps",
            value: [
              "Payments are allocated to properties based on participant dwelling assignments",
              "The SDA Provider Fee percentage is deducted automatically",
              "Generate a Folio Summary report for each owner showing per-participant breakdown",
              "Process bank transfers using the owner's stored bank details",
              "The Folio Summary serves as the owner's tax invoice and statement",
            ],
          },
        ],
      },
    ],
    relatedLinks: [
      { label: "NDIS Export", href: "/payments/ndis-export" },
      { label: "Owner Distributions", href: "/payments/distributions" },
      { label: "Financial Reports", href: "/financials" },
    ],
  },

  // ---------------------------------------------------------------------------
  // 5. DOCUMENTS
  // ---------------------------------------------------------------------------
  documents: {
    id: "documents",
    title: "Evidence Vault Guide",
    subtitle: "Upload, track, and manage compliance documents",
    overview:
      "Centralised document storage with expiry tracking, auto-certification linking, and AI-powered analysis. Every compliance-critical document is monitored for expiry, and the system generates alerts well before deadlines are missed.",
    sections: [
      {
        id: "document-categories",
        title: "Document Categories",
        icon: "file",
        color: "teal",
        defaultExpanded: true,
        content: [
          {
            type: "text",
            value:
              "Documents are organised into 5 categories for easy retrieval. Choosing the correct category ensures documents appear in the right context throughout the system.",
          },
          {
            type: "fields",
            value: [
              "**Property Documents**: Leases, property agreements, building plans, land titles. Linked to specific properties.",
              "**Participant Documents**: NDIS plans, service agreements, consent forms, assessment reports. Linked to specific participants.",
              "**Compliance Documents**: NDIS registration, fire safety certificates, building compliance, insurance policies. Often have expiry dates.",
              "**Organisation Documents**: Policies, procedures, staff training records, ABN certificates. Apply to the whole organisation.",
              "**Financial Documents**: Invoices, receipts, quotes, bank statements. Can be linked to properties or participants.",
            ],
          },
        ],
      },
      {
        id: "expiry-tracking",
        title: "Expiry Tracking",
        icon: "clock",
        color: "red",
        badge: "COMPLIANCE",
        content: [
          {
            type: "text",
            value:
              "Compliance-critical documents have automatic expiry tracking. The system monitors deadlines and generates escalating alerts to ensure nothing lapses.",
          },
          {
            type: "list",
            value: [
              "Set the expiry date when uploading any compliance document",
              "System generates alerts at 90 days, 30 days, and 7 days before expiry",
              "Expired documents appear as critical alerts on the dashboard",
              "Fire Safety Certificates must be renewed ANNUALLY - the most common compliance gap",
              "NDIS Practice Standards certification renews every 3 years with an 18-month mid-term audit",
            ],
          },
          {
            type: "warning",
            value:
              "Letting certifications expire can result in NDIS registration suspension, civil penalties up to $93,900, or banning orders. Always begin renewal at least 60 days before expiry.",
          },
        ],
      },
      {
        id: "auto-certification-linking",
        title: "Auto-Certification Linking",
        icon: "check",
        color: "green",
        content: [
          {
            type: "text",
            value:
              "When you upload certain document types, the system automatically creates or updates compliance certification records. This saves manual data entry and keeps the Compliance Dashboard current.",
          },
          {
            type: "list",
            value: [
              "Fire Safety Certificate uploads automatically create or update the fire safety certification for that property",
              "Building Compliance Certificate uploads link to building compliance certification",
              "NDIS Practice Standards documents link to organisational certification",
              "SDA Design Standard documents link to property-level SDA certification",
              "Worker Screening checks link to individual worker clearance records",
              "The auto-linked certification appears on the Compliance Dashboard immediately",
            ],
          },
          {
            type: "tip",
            value:
              "Use the Global Upload button in the header to quickly file documents from any page. You can route documents to the correct property, participant, or category in seconds.",
          },
        ],
      },
      {
        id: "upload-best-practices",
        title: "Upload Best Practices",
        icon: "star",
        color: "green",
        badge: "BEST PRACTICE",
        content: [
          {
            type: "list",
            value: [
              "Name files clearly before uploading: 'Fire_Safety_Cert_12WaldronRd_2026.pdf' is much better than 'scan001.pdf'",
              "Upload original digital documents when available, not scans of printouts",
              "Always set the expiry date for compliance documents - without it, no alerts will be generated",
              "Use the AI Analysis button to automatically extract document details (invoice amounts, dates, vendors)",
              "Link documents to the correct entity (property, participant, or organisation) for easy retrieval",
              "Check the Documents tab on property and participant detail pages to see all linked documents in one place",
            ],
          },
        ],
      },
    ],
    relatedLinks: [
      { label: "Compliance Certifications", href: "/compliance/certifications" },
      { label: "Global Upload", href: "/documents/new" },
    ],
  },

  // ---------------------------------------------------------------------------
  // 6. COMMUNICATIONS
  // ---------------------------------------------------------------------------
  communications: {
    id: "communications",
    title: "Communications & Follow-ups Guide",
    subtitle: "Track all communications and manage follow-up tasks",
    overview:
      "Log every email, call, SMS, and meeting in one place. Create follow-up tasks to ensure nothing falls through the cracks. The Communications Log creates an auditable trail that satisfies NDIS record-keeping requirements.",
    sections: [
      {
        id: "what-to-log",
        title: "What to Log",
        icon: "info",
        color: "teal",
        defaultExpanded: true,
        content: [
          {
            type: "text",
            value:
              "The Communications Log creates an auditable trail of all interactions related to participants, properties, and compliance matters. If a conversation is relevant to service delivery, it should be logged.",
          },
          {
            type: "list",
            value: [
              "Phone calls with Support Coordinators about plan renewals or funding",
              "Emails to or from NDIS about participant plans or payments",
              "SMS messages to participants about maintenance visits or inspections",
              "Meetings with SIL providers about shared care arrangements",
              "Conversations with family members or advocates about participant concerns",
              "Correspondence with contractors about quotes or work quality",
              "Any communication related to complaints, incidents, or compliance matters",
            ],
          },
          {
            type: "tip",
            value:
              "If it is important enough to remember, it is important enough to log. A 30-second entry now can save hours of confusion later.",
          },
        ],
      },
      {
        id: "5-view-modes",
        title: "5 View Modes",
        icon: "list",
        color: "teal",
        content: [
          {
            type: "fields",
            value: [
              "**Thread View**: See conversations grouped by topic. Each thread shows all related messages in chronological order. Best for following ongoing discussions.",
              "**Timeline View**: A flat, chronological list of ALL communications. Best for seeing recent activity across all contacts.",
              "**Stakeholder View**: Filter by contact person. See all communications with a specific Support Coordinator, SIL provider, or family member.",
              "**Compliance View**: Filter by NDIS compliance category. Critical for audit preparation - see all incident-related, funding-related, or complaint-related communications.",
              "**Tasks View**: See all follow-up tasks with due dates, priorities, and status. Overdue tasks are highlighted.",
            ],
          },
        ],
      },
      {
        id: "logging-a-communication",
        title: "Logging a Communication",
        icon: "file",
        color: "gray",
        content: [
          {
            type: "fields",
            value: [
              "**Type**: Email, Phone Call, SMS, Meeting, or In-Person conversation",
              "**Direction**: Inbound (you received it) or Outbound (you initiated it)",
              "**Contact**: Who you communicated with. Select from database (SC, SIL provider, OT, contractor) for auto-filled contact details, or type a name manually.",
              "**Subject**: Brief topic (e.g. 'Plan renewal for Sarah - due March 2026')",
              "**Notes**: Key points discussed, decisions made, action items identified. Write enough that someone else could understand the conversation.",
              "**Participant**: Link to relevant participant(s) for their communication history",
              "**Compliance Category**: If NDIS-relevant, select the category (incident_related, funding, plan_approval, etc.)",
              "**Attachments**: Upload email screenshots, documents discussed, or meeting notes",
            ],
          },
        ],
      },
      {
        id: "ndis-compliance-features",
        title: "NDIS Compliance Features",
        icon: "shield",
        color: "red",
        badge: "COMPLIANCE",
        content: [
          {
            type: "text",
            value:
              "Every communication can be tagged with compliance flags for NDIS audit readiness. These flags make it simple to locate relevant records during Quality and Safeguards Commission reviews.",
          },
          {
            type: "list",
            value: [
              "NDIA Reportable: The communication relates to a reportable incident or event",
              "Time Sensitive: Has a deadline for response or action (e.g. 24hr incident notification)",
              "Funding Related: Involves SDA funding, plan amounts, or payment discussions",
              "Advocacy Involved: A participant advocate was part of the communication",
              "Complaint Related: Connected to a formal complaint or feedback process",
            ],
          },
          {
            type: "warning",
            value:
              "Communications tagged with compliance flags are immutable - they cannot be deleted, only soft-archived. This ensures a complete audit trail for NDIS reviews.",
          },
        ],
      },
      {
        id: "managing-tasks",
        title: "Managing Tasks",
        icon: "check",
        color: "green",
        content: [
          {
            type: "steps",
            value: [
              "Create a task from any communication by clicking 'Create Follow-up Task'",
              "Set priority (High, Medium, Low) and a due date",
              "Assign to yourself or another team member",
              "Tasks appear on the dashboard and in the Tasks view of Follow-ups",
              "When complete, add resolution notes explaining the outcome",
              "Overdue tasks generate alerts - check them daily",
            ],
          },
          {
            type: "tip",
            value:
              "Create tasks for anything that needs a response or action. Common tasks: 'Call SC about plan renewal', 'Send inspection report to owner', 'Follow up on maintenance quote'.",
          },
        ],
      },
    ],
    relatedLinks: [
      { label: "Follow-ups Dashboard", href: "/follow-ups" },
      { label: "New Communication", href: "/follow-ups/communications/new" },
    ],
  },

  // ---------------------------------------------------------------------------
  // 7. PROPERTIES
  // ---------------------------------------------------------------------------
  properties: {
    id: "properties",
    title: "Property Management Guide",
    subtitle: "Managing SDA and SIL properties, dwellings, and compliance",
    overview:
      "Properties are the core of MySDAManager. Each property contains one or more dwellings where NDIS participants live. Accurate property records drive compliance tracking, payment calculations, and reporting across the entire system.",
    sections: [
      {
        id: "sda-vs-sil-properties",
        title: "SDA vs SIL Properties",
        icon: "home",
        color: "teal",
        defaultExpanded: true,
        content: [
          {
            type: "fields",
            value: [
              "**SDA Properties**: Registered with the NDIS as Specialist Disability Accommodation. Must meet specific design standards. Revenue comes from NDIS SDA funding. Owned by investors and managed by your organisation.",
              "**SIL Properties**: Used by Supported Independent Living providers. May not require NDIS SDA registration. Managed differently - often by the SIL provider directly with your organisation providing oversight.",
              "**Hybrid**: An SDA-registered property where a SIL provider manages participant support. The property receives SDA funding AND the participant receives SIL support separately.",
            ],
          },
          {
            type: "tip",
            value:
              "When creating a new property, select the correct property type first. This determines which fields are shown and which compliance requirements apply.",
          },
        ],
      },
      {
        id: "sda-design-categories",
        title: "SDA Design Categories",
        icon: "star",
        color: "purple",
        content: [
          {
            type: "text",
            value:
              "NDIS recognises four SDA design categories, each with different design requirements and funding levels. The category determines the maximum SDA payment a property can receive.",
          },
          {
            type: "fields",
            value: [
              "**Improved Liveability**: Basic accessibility features like step-free entry, wider doorways, and improved lighting. Lowest SDA funding tier.",
              "**Fully Accessible**: Full wheelchair accessibility throughout, including bathrooms, kitchen, and outdoor areas. Medium funding tier.",
              "**Robust**: Reinforced construction for participants with complex behavioural support needs. Includes impact-resistant walls and secure fittings.",
              "**High Physical Support (HPS)**: The highest standard. Includes ceiling hoists, adjustable kitchen benches, profiling beds, emergency power, and assistive technology integration. Highest SDA funding tier.",
            ],
          },
        ],
      },
      {
        id: "setting-up-a-property",
        title: "Setting Up a Property",
        icon: "list",
        color: "gray",
        content: [
          {
            type: "steps",
            value: [
              "Enter the property address, type (SDA or SIL), and design category",
              "Add the property owner details and their bank information for payment distributions",
              "Create dwellings - each dwelling is a separate living unit within the property",
              "Set bedroom count and maximum occupancy for each dwelling",
              "Upload compliance documents (SDA registration, fire safety certificate, building compliance)",
              "Assign participants to their dwellings once they move in",
            ],
          },
        ],
      },
      {
        id: "dwelling-management",
        title: "Dwelling Management",
        icon: "users",
        color: "green",
        content: [
          {
            type: "text",
            value:
              "Each dwelling is a separate unit that houses participants and generates individual SDA funding. Accurate dwelling records are essential for payment calculations and vacancy tracking.",
          },
          {
            type: "list",
            value: [
              "Each dwelling has its own bedroom count and maximum participant capacity (1-4)",
              "Participants are assigned to specific dwellings, not just properties",
              "Vacancy tracking shows which dwellings have available beds",
              "Move-in and move-out dates are tracked per participant per dwelling",
              "Maintenance requests, inspections, and incidents can be linked to specific dwellings",
              "Dwelling occupancy affects SDA funding calculations",
            ],
          },
        ],
      },
      {
        id: "property-compliance",
        title: "Property Compliance",
        icon: "shield",
        color: "red",
        badge: "COMPLIANCE",
        content: [
          {
            type: "list",
            value: [
              "SDA Registration Certificate - must be current for NDIS funding eligibility",
              "Fire Safety Certificate - ANNUAL renewal required. Most common compliance gap.",
              "Building Compliance Certificate - required for occupancy",
              "SDA Design Standard Certificate - confirms the property meets its registered design category",
              "Insurance - public liability, building, and contents insurance must be current",
              "All certificates are tracked on the Compliance Dashboard with automatic expiry alerts",
            ],
          },
          {
            type: "warning",
            value:
              "An expired SDA registration means the property cannot receive NDIS SDA funding until renewed. Monitor expiry dates closely.",
          },
        ],
      },
    ],
    relatedLinks: [
      { label: "Compliance Dashboard", href: "/compliance" },
      { label: "Vacancy Listings", href: "/vacancies" },
    ],
  },

  // ---------------------------------------------------------------------------
  // 8. PARTICIPANTS
  // ---------------------------------------------------------------------------
  participants: {
    id: "participants",
    title: "Participant Management Guide",
    subtitle: "NDIS participant records, plans, and stakeholder management",
    overview:
      "Manage participant information, NDIS plan details, and relationships with Support Coordinators, SIL providers, and other stakeholders. Accurate participant records are the foundation of SDA funding, compliance reporting, and service delivery.",
    sections: [
      {
        id: "participant-records",
        title: "Participant Records",
        icon: "users",
        color: "teal",
        defaultExpanded: true,
        content: [
          {
            type: "text",
            value:
              "Each participant record contains personal details, NDIS information, and living arrangements. Keep records current to ensure accurate payments and compliance reporting.",
          },
          {
            type: "fields",
            value: [
              "**Name & Contact**: Full name, phone, email, emergency contact details",
              "**NDIS Number**: The participant's unique NDIS identifier. Stored securely and audit-logged on access.",
              "**Date of Birth**: Used for age-related compliance checks",
              "**SDA Category Needs**: Which design category the participant is approved for (IL, FA, Robust, HPS)",
              "**Current Dwelling**: Which property and dwelling they live in",
              "**Move-in Date**: When they started living at the current dwelling",
            ],
          },
        ],
      },
      {
        id: "ndis-plan-management",
        title: "NDIS Plan Management",
        icon: "file",
        color: "purple",
        badge: "KEY",
        content: [
          {
            type: "text",
            value:
              "Each participant has an NDIS plan that determines their SDA funding. Plans have fixed terms and must be renewed before expiry to avoid gaps in funding.",
          },
          {
            type: "fields",
            value: [
              "**Plan Start Date**: When the current NDIS plan period begins",
              "**Plan End Date**: When the plan expires - CRITICAL to track. Payments cannot be processed against an expired plan.",
              "**SDA Funding Amount**: The monthly SDA payment specified in the plan",
              "**Plan Manager**: Who manages the participant's NDIS funding (self-managed, plan-managed, or NDIA-managed)",
              "**Support Coordinator**: The participant's assigned SC who assists with plan implementation",
            ],
          },
          {
            type: "warning",
            value:
              "The system generates automatic alerts at 60, 30, and 7 days before plan expiry. Begin the renewal process at least 60 days before expiry to avoid gaps in funding.",
          },
        ],
      },
      {
        id: "stakeholder-linking",
        title: "Stakeholder Linking",
        icon: "users",
        color: "green",
        content: [
          {
            type: "text",
            value:
              "Link participants to their support network for streamlined communications and coordinated care.",
          },
          {
            type: "list",
            value: [
              "Support Coordinator: Primary contact for plan reviews, funding queries, and service coordination. Linked from the database - their contact details auto-populate in communications.",
              "SIL Provider: If the participant receives Supported Independent Living services. Important for coordinating property access and support schedules.",
              "Occupational Therapist: For SDA assessments, equipment recommendations, and home modifications. Track AHPRA registration and specialisations.",
              "Family/Guardian: Emergency contacts and decision-makers. Important for consent and communication preferences.",
            ],
          },
          {
            type: "tip",
            value:
              "When you link a Support Coordinator to a participant, you can quickly create pre-filled communications to them from the participant's detail page.",
          },
        ],
      },
      {
        id: "privacy-and-consent",
        title: "Privacy and Consent",
        icon: "shield",
        color: "red",
        badge: "PRIVACY",
        content: [
          {
            type: "list",
            value: [
              "NDIS numbers are sensitive personal information - access is audit-logged",
              "Never share participant information without their explicit consent or legal authority",
              "Photos containing a participant's face require written consent before being uploaded",
              "Participants can request access to their own records at any time",
              "All data is retained for 7 years after service ends (NDIS compliance requirement)",
              "When a participant moves out, their record is archived but not deleted",
            ],
          },
        ],
      },
      {
        id: "plan-expiry-workflow",
        title: "Plan Expiry Workflow",
        icon: "clock",
        color: "yellow",
        badge: "TIMELINE",
        content: [
          {
            type: "steps",
            value: [
              "60 days before expiry: Alert generated. Contact the Support Coordinator to confirm renewal is underway.",
              "30 days before expiry: Escalation alert. Follow up with SC if no update on renewal progress.",
              "7 days before expiry: Critical alert. Payment processing will be blocked if the plan is not renewed.",
              "Plan expired: No new payments can be recorded against this plan. Existing payments remain valid.",
              "New plan received: Create a new plan record with updated dates, funding amounts, and any changes to SDA category.",
            ],
          },
          {
            type: "warning",
            value:
              "Never delete an expired plan. Create a new plan record instead. The expired plan is needed for historical payment reconciliation.",
          },
        ],
      },
    ],
    relatedLinks: [
      {
        label: "Support Coordinators",
        href: "/database/support-coordinators",
      },
      { label: "SIL Providers", href: "/database/sil-providers" },
    ],
  },

  // ---------------------------------------------------------------------------
  // 9. CONTRACTORS
  // ---------------------------------------------------------------------------
  contractors: {
    id: "contractors",
    title: "Contractor Management Guide",
    subtitle: "Managing trade contractors and the quote request workflow",
    overview:
      "Maintain a database of trusted contractors for property maintenance and access the automated quote request system. Good contractor records lead to faster repairs, competitive pricing, and better outcomes for participants.",
    sections: [
      {
        id: "contractor-database",
        title: "Contractor Database",
        icon: "tool",
        color: "teal",
        defaultExpanded: true,
        content: [
          {
            type: "fields",
            value: [
              "**Business Name**: The contractor's registered business name",
              "**Contact**: Primary contact person, phone, and email",
              "**ABN**: Australian Business Number - required for invoicing and tax compliance",
              "**Specialty**: Primary trade (Plumber, Electrician, HVAC, Builder, Painter, Locksmith, Landscaper, Cleaner, General Maintenance, Other)",
              "**Service Areas**: Which suburbs or regions they cover",
              "**Insurance**: Public liability insurance status and expiry date - verify annually",
              "**Notes**: Any relevant information (availability, quality notes, pricing tendencies)",
            ],
          },
        ],
      },
      {
        id: "quote-request-workflow",
        title: "Quote Request Workflow",
        icon: "dollar",
        color: "purple",
        content: [
          {
            type: "steps",
            value: [
              "From a maintenance request, click 'Request Quotes'",
              "Select one or more contractors that match the required specialty",
              "Customise the email message if needed - property details and photos are included automatically",
              "The contractor receives an email with a unique link to submit their quote",
              "They fill out their quote online: amount, estimated timeframe, scope of work, warranty details",
              "Quotes appear on the maintenance request for side-by-side comparison",
              "Select the winning quote and the contractor is notified automatically",
            ],
          },
          {
            type: "tip",
            value:
              "Send quote requests to at least 2-3 contractors for competitive pricing. The system tracks which contractors respond fastest and offer the best value.",
          },
        ],
      },
      {
        id: "performance-tracking",
        title: "Performance Tracking",
        icon: "star",
        color: "green",
        content: [
          {
            type: "text",
            value:
              "Over time, MySDAManager builds a profile of each contractor's performance based on completed work. Use this data to make informed decisions when selecting contractors.",
          },
          {
            type: "list",
            value: [
              "Response time: How quickly they reply to quote requests",
              "Quote accuracy: How close their final invoice is to the original quote",
              "Work quality: Based on post-completion inspection results",
              "Reliability: Tracks no-shows, delays, and schedule changes",
              "Cost competitiveness: How their pricing compares to other contractors for similar work",
            ],
          },
        ],
      },
      {
        id: "best-practices",
        title: "Best Practices",
        icon: "check",
        color: "green",
        badge: "BEST PRACTICE",
        content: [
          {
            type: "list",
            value: [
              "Keep at least 2-3 contractors per specialty for competitive quotes and backup options",
              "Verify public liability insurance annually - expired insurance is a significant risk",
              "Add detailed notes after each job to build a useful contractor profile",
              "Use the preferred contractor flag for your most reliable trades",
              "Always confirm the contractor has appropriate licences for the work (e.g. electrical licence for electrical work)",
              "Request certificates of completion for major works - upload them as documents",
            ],
          },
        ],
      },
    ],
    relatedLinks: [
      { label: "Maintenance Requests", href: "/maintenance" },
      { label: "Quote Requests", href: "/maintenance" },
    ],
  },

  // ---------------------------------------------------------------------------
  // 10. COMPLAINTS
  // ---------------------------------------------------------------------------
  complaints: {
    id: "complaints",
    title: "Complaints Management SOP",
    subtitle: "BLS-SOP-001 — NDIS-compliant complaints handling procedure",
    overview:
      "This procedure ensures all complaints regarding Better Living Solutions are handled fairly, quickly, and in compliance with the NDIS (Complaints Management and Resolution) Rules 2018. All complaints must be logged in MySDAManager to maintain a complete, auditable chain of custody.",
    sections: [
      {
        id: "key-timeframes",
        title: "Key Compliance Timeframes",
        icon: "clock",
        color: "red",
        badge: "MANDATORY",
        defaultExpanded: true,
        content: [
          {
            type: "text",
            value:
              "These timeframes are non-negotiable under the NDIS Practice Standards. Missing them may trigger regulatory action.",
          },
          {
            type: "fields",
            value: [
              "**24 Hours**: Acknowledge receipt of the complaint and make initial contact with the complainant.",
              "**24 Hours (Reportable)**: If the complaint involves a Reportable Incident (abuse, neglect, exploitation, serious injury), the Director must notify the NDIS Quality and Safeguards Commission immediately.",
              "**21 Days**: Target resolution. Provide the complainant with a written outcome including findings and actions taken.",
              "**7 Years**: Retain all complaint records, communications, and evidence for NDIS audit purposes.",
            ],
          },
          {
            type: "warning",
            value:
              "If a complaint involves a Reportable Incident, the Director must notify the NDIS Quality and Safeguards Commission within 24 hours via the online portal or by calling 1800 035 544. Reference: NDIS (Incident Management and Reportable Incidents) Rules 2018, Section 16.",
          },
        ],
      },
      {
        id: "five-step-resolution",
        title: "5-Step Resolution Lifecycle",
        icon: "list",
        color: "teal",
        badge: "BLS-SOP-001",
        content: [
          {
            type: "steps",
            value: [
              "Receipt and Initial Triage — Log the complaint in MySDAManager immediately. A unique reference (CMP-YYYYMMDD-XXXX) is auto-generated. Assess whether it involves a Reportable Incident. Assign severity (Low / Medium / High / Critical) and category.",
              "Acknowledgement — Contact the complainant within 24 hours via their preferred method (phone, email, letter, or in person). Confirm receipt, provide the reference number, and give an estimated resolution timeframe. Remind them of their right to use an independent advocate.",
              "Investigation — Assign an investigator who is not the subject of the complaint. Review relevant records in MySDAManager (property logs, communications, incidents, maintenance). Interview all relevant parties. Upload all evidence and notes to the complaint record. Keep the complainant informed of progress.",
              "Resolution and Outcome — Determine the outcome: Upheld, Partially Upheld, Not Upheld, or Withdrawn. Send a formal outcome letter with findings and corrective actions. Every outcome letter must include instructions on contacting the NDIS Commission (1800 035 544) if dissatisfied. Record whether the complainant is satisfied.",
              "Closing and Learning — Close the record in MySDAManager. Review at the monthly management meeting to identify systemic patterns. Update staff training if knowledge gaps were identified. Ensure all documentation is complete for the 7-year retention requirement.",
            ],
          },
        ],
      },
      {
        id: "complaint-sources",
        title: "Complaint Sources",
        icon: "info",
        color: "gray",
        content: [
          {
            type: "text",
            value:
              "Complaints can arrive through multiple channels. Each is automatically logged with its source for tracking.",
          },
          {
            type: "fields",
            value: [
              "**Website**: Submitted via the Better Living Solutions website form. These are auto-logged and locked — only status, notes, and assignment can be edited.",
              "**Phone**: Received by phone call. Staff must log the complaint manually within the same business day.",
              "**Email**: Received via email. Forward to the complaints inbox or log manually.",
              "**In Person**: Raised face-to-face by a participant, family member, or visitor. Log immediately after the conversation.",
              "**Internal**: Raised by a staff member about an internal process or concern.",
            ],
          },
          {
            type: "tip",
            value:
              "Website-submitted complaints have a locked icon. This means the original complaint details cannot be modified — this protects the integrity of the complainant's submission for audit purposes.",
          },
        ],
      },
      {
        id: "severity-assessment",
        title: "Severity Assessment",
        icon: "alert",
        color: "yellow",
        badge: "KEY SKILL",
        content: [
          {
            type: "fields",
            value: [
              "**Critical**: Immediate risk to participant safety. Potential Reportable Incident. Requires same-day escalation to Director.",
              "**High**: Significant impact on participant wellbeing or service delivery. Requires priority investigation within 48 hours.",
              "**Medium**: Service issue affecting participant experience but no immediate safety risk. Standard 21-day resolution applies.",
              "**Low**: Minor feedback, suggestion, or low-impact concern. Address within normal workflow.",
            ],
          },
          {
            type: "warning",
            value:
              "Always assess severity from the complainant's perspective. A complaint about 'cold food' might seem low severity, but if the participant has swallowing difficulties and requires specific food temperatures, it could be a safety concern.",
          },
        ],
      },
      {
        id: "completing-the-form",
        title: "Completing the Complaint Form",
        icon: "file",
        color: "gray",
        content: [
          {
            type: "fields",
            value: [
              "**Complainant Name**: Full name of the person lodging the complaint. Can be anonymous — record as 'Anonymous' if requested.",
              "**Complainant Type**: Participant, Family/Carer, Support Coordinator, SIL Provider, Staff, Anonymous, or Other.",
              "**Category**: Service Delivery, Staff Conduct, Property Condition, Communication, Billing, Privacy, Safety, or Other.",
              "**Severity**: Use the severity guide above. When uncertain, err on the side of a higher severity.",
              "**Description**: Record the complaint in the complainant's own words as closely as possible. Include dates, times, and specific details.",
              "**Preferred Contact Method**: How the complainant wants to be contacted for updates (phone, email, letter, SMS).",
              "**Advocacy Offered**: NDIS Practice Standards require offering access to an independent advocate. Always tick this and note if they accepted or declined.",
            ],
          },
        ],
      },
      {
        id: "compliance-checklist",
        title: "Interactive Compliance Checklist",
        icon: "check",
        color: "green",
        content: [
          {
            type: "text",
            value:
              "Each complaint detail page has an interactive 5-step compliance checklist in the sidebar. Complete each step as the complaint progresses through the lifecycle.",
          },
          {
            type: "list",
            value: [
              "Step 1: Initial Triage — Confirm severity, assign category, check for Reportable Incident",
              "Step 2: Acknowledgement — Confirm complainant contacted within 24 hours",
              "Step 3: Investigation — Confirm investigator assigned and evidence gathering underway",
              "Step 4: Resolution — Confirm outcome determined and communicated to complainant",
              "Step 5: Closure — Confirm complainant satisfaction recorded and lessons documented",
            ],
          },
          {
            type: "tip",
            value:
              "Each checklist step is audit-logged with a timestamp and the user who completed it. This creates an automatic chain of custody for NDIS reviews.",
          },
        ],
      },
      {
        id: "best-practices",
        title: "Best Practices",
        icon: "star",
        color: "green",
        badge: "BEST PRACTICE",
        content: [
          {
            type: "list",
            value: [
              "Acknowledge every complaint promptly — even if you cannot resolve it immediately, the complainant needs to know they have been heard",
              "Record complaints in the complainant's own words, not your interpretation",
              "Keep the complainant informed at every stage — silence breeds escalation",
              "Always offer advocacy support and document that you did so",
              "Look for patterns — if the same property or staff member appears in multiple complaints, investigate the root cause",
              "Use the Chain of Custody view on the detail page to verify all actions are documented before closing",
              "Never close a complaint without recording whether the complainant is satisfied with the outcome",
            ],
          },
        ],
      },
      {
        id: "compliance-contacts",
        title: "Compliance Contacts",
        icon: "shield",
        color: "red",
        badge: "CONTACTS",
        content: [
          {
            type: "fields",
            value: [
              "**NDIS Quality and Safeguards Commission**: Phone 1800 035 544 | Website www.ndiscommission.gov.au",
              "**Internal Escalation**: Director, Better Living Solutions — for all Reportable Incidents and complaints unresolved within 21 days",
            ],
          },
        ],
      },
    ],
    relatedLinks: [
      { label: "Compliance Dashboard", href: "/compliance" },
      { label: "New Complaint", href: "/compliance/complaints/new" },
      { label: "NDIS Commission", href: "https://www.ndiscommission.gov.au" },
    ],
  },

  // ---------------------------------------------------------------------------
  // 11. COMPLIANCE CERTIFICATIONS
  // ---------------------------------------------------------------------------
  certifications: {
    id: "certifications",
    title: "Compliance Certifications Guide",
    subtitle: "Managing NDIS registrations, safety certificates, and audit compliance",
    overview:
      "Compliance certifications are the legal documents that allow your organisation and properties to operate as an NDIS SDA provider. Letting any certification expire can result in funding suspension, penalties, or registration revocation.",
    sections: [
      {
        id: "organisation-level-certifications",
        title: "Organisation-Level Certifications",
        icon: "shield",
        color: "red",
        badge: "REQUIRED",
        defaultExpanded: true,
        content: [
          {
            type: "text",
            value:
              "These certifications apply to your entire organisation and must be maintained at all times to remain a registered NDIS provider.",
          },
          {
            type: "fields",
            value: [
              "**NDIS Practice Standards Certification**: Required for all registered NDIS providers. Demonstrates compliance with NDIS Practice Standards including rights, governance, and service delivery. Certified by an NDIS-approved auditor. Renewal: every 3 years with a mid-term audit at 18 months.",
              "**SDA Provider Registration**: Registration with the NDIS Commission to provide Specialist Disability Accommodation. Must be current for any SDA funding to be received. Renewal: every 3 years.",
              "**NDIS Verification Audit**: Required for providers delivering lower-risk supports. A desktop audit verifying policies, procedures, and systems are in place. Renewal: every 3 years.",
            ],
          },
          {
            type: "warning",
            value:
              "Non-compliance consequences include: registration suspension or revocation, civil penalties up to $93,900, and banning orders. Begin renewal at least 60 days before expiry.",
          },
        ],
      },
      {
        id: "property-level-certifications",
        title: "Property-Level Certifications",
        icon: "home",
        color: "yellow",
        badge: "PER PROPERTY",
        content: [
          {
            type: "text",
            value:
              "Each SDA property requires its own set of certifications. These must be maintained individually and linked to the correct property in MySDAManager.",
          },
          {
            type: "fields",
            value: [
              "**SDA Design Standard Certificate**: Certifies the property meets SDA Design Standard requirements for its registered category (HPS, Fully Accessible, Robust, or Improved Liveability). Issued by a certified SDA Assessor or Building Certifier. One-time unless modifications are made to the property.",
              "**Fire Safety Certificate**: Annual fire safety statement covering detection, alarms, extinguishers, exits, and evacuation plans. Issued by an Accredited Fire Safety Practitioner. ANNUAL renewal — this is the most commonly missed certification.",
              "**Building Compliance Certificate**: Occupancy or compliance certificate confirming the building meets BCA requirements and is safe for occupation. Issued by a Private Certifier or Local Council. One-time unless modifications are made.",
            ],
          },
          {
            type: "warning",
            value:
              "Fire Safety Certificates expire ANNUALLY. This is the most common compliance gap across SDA providers. Set calendar reminders 90 days before expiry and begin the renewal process immediately.",
          },
        ],
      },
      {
        id: "worker-certifications",
        title: "Worker Screening Requirements",
        icon: "users",
        color: "purple",
        badge: "ALL WORKERS",
        content: [
          {
            type: "text",
            value:
              "All workers with more than incidental contact with NDIS participants must have valid screening clearance.",
          },
          {
            type: "fields",
            value: [
              "**NDIS Worker Screening Check**: Mandatory for all workers. Applied for through the State/Territory Worker Screening Unit. Valid for 5 years.",
              "**Workers CANNOT start until clearance is received**: No exceptions. Interim or provisional arrangements are not permitted under NDIS rules.",
              "**Track expiry dates for all staff**: MySDAManager can track worker screening expiry dates and generate alerts before they lapse.",
            ],
          },
          {
            type: "warning",
            value:
              "Employing a worker without a valid NDIS Worker Screening Check is a serious compliance breach. The responsibility falls on the provider, not the worker.",
          },
        ],
      },
      {
        id: "status-lifecycle",
        title: "Certification Status Lifecycle",
        icon: "clock",
        color: "teal",
        content: [
          {
            type: "text",
            value:
              "MySDAManager automatically tracks certification status and transitions based on expiry dates.",
          },
          {
            type: "fields",
            value: [
              "**Current** (green): The certification is valid and the expiry date is more than 90 days away.",
              "**Expiring Soon** (yellow): The certification will expire within 90 days. Action needed — begin the renewal process.",
              "**Expired** (red): The certification has passed its expiry date. Immediate action required — the property or organisation may not be compliant.",
              "**Pending Renewal** (purple): A renewal application has been submitted but the new certificate has not yet been received.",
            ],
          },
          {
            type: "tip",
            value:
              "The system runs a daily check at 1:00 AM UTC to automatically transition certifications from Current to Expiring Soon to Expired based on their expiry dates. You do not need to update statuses manually.",
          },
        ],
      },
      {
        id: "adding-a-certification",
        title: "Adding a Certification",
        icon: "file",
        color: "gray",
        content: [
          {
            type: "fields",
            value: [
              "**Type**: Select the certification type. This determines which compliance requirements apply.",
              "**Title**: A descriptive name (e.g. 'Fire Safety Certificate - 12 Waldron Rd - 2026').",
              "**Issuing Body**: Who issued the certificate (e.g. 'Fire Safety Australia Pty Ltd').",
              "**Issue Date**: When the certificate was issued.",
              "**Expiry Date**: When the certificate expires. This drives all automatic alerts and status transitions.",
              "**Property**: Link to a specific property (for property-level certs) or leave blank for organisation-wide certs.",
              "**Certificate File**: Upload the actual certificate document. This creates an automatic link in the Documents module.",
              "**Audit Outcome**: If from an audit — Pass, Conditional Pass, Fail, or Pending.",
            ],
          },
          {
            type: "tip",
            value:
              "You can also add certifications automatically by uploading compliance documents through the Global Upload button. The system detects fire safety, building compliance, and SDA design certificates and auto-creates the certification record.",
          },
        ],
      },
      {
        id: "alert-system",
        title: "Expiry Alert System",
        icon: "alert",
        color: "yellow",
        badge: "AUTOMATED",
        content: [
          {
            type: "text",
            value:
              "MySDAManager generates automatic alerts for certification expiry to ensure you never miss a renewal deadline.",
          },
          {
            type: "list",
            value: [
              "90 days before expiry: Status changes to 'Expiring Soon' (yellow). Begin gathering renewal requirements.",
              "30 days before expiry: Warning alert generated on the dashboard. Contact the certifying body if renewal is not yet underway.",
              "7 days before expiry: Critical alert. Escalate to management if the renewal is still pending.",
              "Expired: Critical alert displayed prominently on dashboard and compliance page. Immediate action required.",
            ],
          },
          {
            type: "warning",
            value:
              "Expired certifications block SDA funding eligibility. The 30-day alert is your last comfortable window to complete renewal without service disruption.",
          },
        ],
      },
      {
        id: "best-practices",
        title: "Best Practices",
        icon: "star",
        color: "green",
        badge: "BEST PRACTICE",
        content: [
          {
            type: "list",
            value: [
              "Maintain a renewal calendar with reminders starting 90 days before each expiry",
              "Upload the actual certificate document — not just a record. Auditors will ask for the original.",
              "Link property-level certificates to the correct property so they appear on property detail pages",
              "After an NDIS audit, update the audit outcome and any conditions immediately",
              "Review the Expiring Soon list weekly as part of your compliance routine",
              "For NDIS Practice Standards renewal, schedule the mid-term audit at exactly 18 months to avoid surprises",
              "Keep contact details for all certifying bodies on file so renewals can be initiated quickly",
            ],
          },
        ],
      },
    ],
    relatedLinks: [
      { label: "New Certification", href: "/compliance/certifications/new" },
      { label: "Compliance Dashboard", href: "/compliance" },
      { label: "Evidence Vault", href: "/documents" },
    ],
  },

  // ---------------------------------------------------------------------------
  // 12. EMERGENCY MANAGEMENT PLANS
  // ---------------------------------------------------------------------------
  "emergency-plans": {
    id: "emergency-plans",
    title: "Emergency Management Plans",
    subtitle: "NDIS Practice Standard 5 — per-property emergency preparedness",
    overview:
      "Emergency Management Plans (EMPs) ensure every SDA property has documented procedures for responding to emergencies such as fire, flood, severe weather, medical emergencies, and utility failures. Under NDIS Practice Standard 5 (Service Environment), providers must maintain current emergency plans for each property and ensure all staff and participants are familiar with them.",
    sections: [
      {
        id: "ndis-requirement",
        title: "NDIS Practice Standard 5 Requirement",
        icon: "shield",
        color: "red",
        badge: "MANDATORY",
        defaultExpanded: true,
        content: [
          {
            type: "text",
            value:
              "NDIS Practice Standard 5 (Service Environment) requires providers to maintain a safe environment that is fit for purpose. This includes documented emergency and disaster management plans for each service delivery location.",
          },
          {
            type: "list",
            value: [
              "Each SDA property must have its own Emergency Management Plan tailored to the property layout, participant needs, and local risks",
              "Plans must be reviewed at least annually and updated after any emergency event or significant change",
              "All staff working at the property must be familiar with the plan and know their assigned roles",
              "Participants must be informed of emergency procedures in an accessible format appropriate to their needs",
              "Emergency plans must be readily accessible at the property — not locked in an office or stored only digitally",
            ],
          },
          {
            type: "warning",
            value:
              "Failure to maintain current emergency plans is a non-compliance finding in NDIS audits. Properties without plans may receive conditions on their registration or face enforcement action.",
          },
        ],
      },
      {
        id: "key-plan-sections",
        title: "Key Plan Sections",
        icon: "list",
        color: "teal",
        badge: "TEMPLATE",
        content: [
          {
            type: "text",
            value:
              "A comprehensive Emergency Management Plan covers the following sections. MySDAManager provides a structured template to ensure nothing is missed.",
          },
          {
            type: "fields",
            value: [
              "**Management Contacts**: Property manager, on-call staff, and escalation contacts with phone numbers. These are the first people called in an emergency.",
              "**Emergency Services Contacts**: Fire (000), Ambulance (000), Police (000), SES (132 500), Poisons Info (13 11 26), plus local hospital and GP details.",
              "**Evacuation Procedures**: Step-by-step evacuation instructions including primary and secondary routes, assembly points, participant mobility considerations, and wheelchair-accessible exits.",
              "**Emergency Kit Contents**: First aid supplies, torch, battery-powered radio, medications list, participant emergency profiles, spare keys, and any participant-specific equipment (e.g. oxygen, communication devices).",
              "**Team Roles & Responsibilities**: Who does what during an emergency — fire warden, first aider, evacuation assistant, communications coordinator, and participant support roles.",
              "**Emergency Procedures**: Specific procedures for fire, flood, severe weather, power failure, gas leak, medical emergency, missing participant, and security threat.",
            ],
          },
        ],
      },
      {
        id: "review-frequency",
        title: "Review Frequency",
        icon: "clock",
        color: "yellow",
        badge: "ANNUAL",
        content: [
          {
            type: "text",
            value:
              "Emergency plans must be reviewed regularly to remain effective. A plan that has not been reviewed may contain outdated contacts, incorrect procedures, or missing information about new participants.",
          },
          {
            type: "list",
            value: [
              "Annual review: Every plan must be reviewed at least once per year, even if no changes are needed. Record the review date.",
              "After any emergency event: If the plan was activated (even partially), review it within 7 days to capture lessons learned.",
              "After any incident at the property: Incidents may reveal gaps in emergency preparedness.",
              "When participants change: New participants may have different mobility, communication, or medical needs that affect evacuation procedures.",
              "When staff change: New staff need to be assigned roles and trained on the plan.",
              "When the property is modified: Renovations, new equipment, or changes to exits require plan updates.",
            ],
          },
          {
            type: "warning",
            value:
              "The system tracks review dates and generates alerts when a plan is overdue for review. Plans not reviewed within 12 months are flagged as non-compliant on the Compliance Dashboard.",
          },
        ],
      },
      {
        id: "audit-tips",
        title: "Audit & Compliance Tips",
        icon: "check",
        color: "green",
        badge: "BEST PRACTICE",
        content: [
          {
            type: "list",
            value: [
              "Keep plans current — an outdated plan is worse than no plan because staff may follow incorrect procedures",
              "Ensure all staff know the assembly point for each property they work at",
              "Test evacuation procedures at least annually — document the drill date, participants involved, and time taken",
              "Include participant-specific considerations: mobility aids, sensory impairments, behavioural triggers during stress",
              "Store a printed copy of the plan at the property in an accessible location (not behind a locked door)",
              "Review and update emergency contact numbers quarterly — staff turnover makes these go stale quickly",
              "During NDIS audits, auditors will ask staff about emergency procedures — ensure staff can explain the plan without reading it",
              "Photograph the posted emergency plan and evacuation map at each property as evidence for audit files",
            ],
          },
          {
            type: "tip",
            value:
              "Run a fire drill at each property at least once per year. Record the date, who participated, how long evacuation took, and any issues identified. This is strong evidence of compliance during audits.",
          },
        ],
      },
    ],
    relatedLinks: [
      { label: "Compliance Dashboard", href: "/compliance" },
      { label: "Properties", href: "/properties" },
      { label: "Incidents", href: "/incidents" },
    ],
  },

  // ---------------------------------------------------------------------------
  // 13. BUSINESS CONTINUITY PLANNING
  // ---------------------------------------------------------------------------
  "business-continuity": {
    id: "business-continuity",
    title: "Business Continuity Planning",
    subtitle: "Ensuring continuity of supports for NDIS participants",
    overview:
      "A Business Continuity Plan (BCP) ensures your organisation can continue delivering essential supports to NDIS participants during and after disruptive events such as natural disasters, pandemics, key staff loss, IT failures, or supply chain disruptions. The NDIS Practice Standards require providers to plan for continuity of supports.",
    sections: [
      {
        id: "ndis-continuity-requirement",
        title: "NDIS Continuity of Supports Requirement",
        icon: "shield",
        color: "red",
        badge: "MANDATORY",
        defaultExpanded: true,
        content: [
          {
            type: "text",
            value:
              "The NDIS Practice Standards require registered providers to plan for the continuity of supports to participants. Participants depend on SDA providers for safe and accessible housing — any disruption to services can directly affect participant safety and wellbeing.",
          },
          {
            type: "list",
            value: [
              "Providers must have a documented plan for maintaining services during disruptive events",
              "The plan must identify critical services and the risks that could disrupt them",
              "Alternative arrangements must be identified for key personnel, systems, and suppliers",
              "Participants and their support networks must be informed of continuity arrangements",
              "The plan must be tested and reviewed regularly to ensure it remains effective",
            ],
          },
          {
            type: "warning",
            value:
              "During NDIS audits, providers are expected to demonstrate they have considered business continuity. Not having a BCP is a finding that can result in conditions on registration.",
          },
        ],
      },
      {
        id: "risk-assessment",
        title: "Risk Assessment Methodology",
        icon: "alert",
        color: "yellow",
        badge: "KEY SKILL",
        content: [
          {
            type: "text",
            value:
              "The BCP is built around a risk assessment that identifies threats, evaluates their likelihood and impact, and determines mitigation strategies. MySDAManager uses a standard likelihood x impact matrix.",
          },
          {
            type: "fields",
            value: [
              "**Likelihood**: Rare (1), Unlikely (2), Possible (3), Likely (4), Almost Certain (5). Based on historical data and expert judgement.",
              "**Impact**: Insignificant (1), Minor (2), Moderate (3), Major (4), Catastrophic (5). Assessed from the perspective of participant safety and service continuity.",
              "**Risk Rating**: Likelihood x Impact = Risk Score. Low (1-4), Medium (5-9), High (10-15), Extreme (16-25). High and Extreme risks require specific mitigation strategies.",
              "**Mitigation Strategy**: What actions reduce the likelihood or impact of the risk. Every High and Extreme risk must have at least one documented mitigation.",
            ],
          },
          {
            type: "tip",
            value:
              "Common risks for SDA providers include: pandemic or infectious disease outbreak, key staff member illness or departure, natural disaster (flood, bushfire, storm), IT system failure, power outage, insurance lapse, and contractor unavailability.",
          },
        ],
      },
      {
        id: "key-plan-sections",
        title: "Key Plan Sections",
        icon: "list",
        color: "teal",
        badge: "TEMPLATE",
        content: [
          {
            type: "text",
            value:
              "A comprehensive BCP addresses the following areas. MySDAManager provides structured sections for each.",
          },
          {
            type: "fields",
            value: [
              "**Key Personnel & Succession**: Identify critical roles and their backups. Who takes over if the property manager, director, or on-call staff are unavailable? Include contact details for all backup personnel.",
              "**Critical Services**: List the essential services participants depend on — accommodation, utilities, maintenance response, medication management, and communication with support networks.",
              "**Insurance Coverage**: Summary of current insurance policies including property, public liability, professional indemnity, and business interruption cover. Reference policy numbers and contact details.",
              "**Risk Scenarios**: Documented risk scenarios with likelihood, impact, risk rating, and specific mitigation strategies for each.",
              "**Data Backup & IT Recovery**: How is participant data protected? What are the backup procedures? How quickly can systems be restored? MySDAManager data is cloud-hosted, but local files and credentials need backup procedures.",
              "**Communication Plan**: How will staff, participants, families, Support Coordinators, and SIL providers be notified during a disruption? Include templates and contact lists.",
              "**Recovery Checklist**: Step-by-step actions to restore normal operations after a disruption. Includes damage assessment, service restoration priorities, and post-incident review.",
            ],
          },
        ],
      },
      {
        id: "review-frequency",
        title: "Review Frequency",
        icon: "clock",
        color: "yellow",
        badge: "ANNUAL",
        content: [
          {
            type: "text",
            value:
              "The BCP must be a living document that is reviewed and updated regularly. An untested plan may fail when it is needed most.",
          },
          {
            type: "list",
            value: [
              "Annual review: The BCP must be fully reviewed at least once per year. Record the review date and any changes made.",
              "After activation: If the BCP was activated (even partially), conduct a formal review within 14 days to capture lessons learned.",
              "After any significant incident: Major incidents may reveal gaps in continuity planning that need to be addressed.",
              "When organisational changes occur: New properties, staff changes, new service agreements, or changes to insurance should trigger a plan review.",
              "After regulatory changes: Updates to NDIS Practice Standards or state regulations may require plan amendments.",
            ],
          },
          {
            type: "warning",
            value:
              "The system tracks the BCP review date and flags it as overdue if not reviewed within 12 months. An overdue BCP reduces your compliance score on the Compliance Dashboard.",
          },
        ],
      },
      {
        id: "audit-tips",
        title: "Audit & Compliance Tips",
        icon: "check",
        color: "green",
        badge: "BEST PRACTICE",
        content: [
          {
            type: "list",
            value: [
              "Test the BCP regularly — a desktop exercise or tabletop scenario at least annually demonstrates preparedness",
              "Train all staff on BCP activation procedures during onboarding and at annual refreshers",
              "Keep the communication plan contact list up to date — check quarterly for phone number and email changes",
              "Document any BCP activations in detail, including what worked and what needs improvement",
              "Ensure backup personnel have the access and credentials they need before they are needed",
              "Review insurance coverage annually to ensure it matches current property portfolio and risk profile",
              "Store a printed copy of key contact numbers and critical procedures in a secure but accessible location",
              "During NDIS audits, be prepared to explain your BCP, when it was last reviewed, and how staff are trained on it",
            ],
          },
          {
            type: "tip",
            value:
              "Run a tabletop exercise annually where your team walks through a disruption scenario (e.g. 'What happens if the property manager is hospitalised and a major storm damages two properties on the same day?'). Document the exercise and outcomes as audit evidence.",
          },
        ],
      },
    ],
    relatedLinks: [
      { label: "Compliance Dashboard", href: "/compliance" },
      { label: "Emergency Plans", href: "/compliance/emergency-plans" },
      { label: "Insurance Policies", href: "/compliance/insurance" },
    ],
  },

  // ---------------------------------------------------------------------------
  // 14. POLICIES & PROCEDURES
  // ---------------------------------------------------------------------------
  policies: {
    id: "policies",
    title: "Policies & Procedures Guide",
    subtitle: "Managing your organisational policy library",
    overview: "The Policies & Procedures library stores all organisational policies, standard operating procedures, and guidelines. Keeping policies current and reviewed on schedule is a core NDIS Practice Standard requirement.",
    sections: [
      {
        id: "why-policies-matter",
        title: "Why Policy Management Matters",
        icon: "shield",
        color: "red",
        badge: "NDIS",
        defaultExpanded: true,
        content: [
          {
            type: "text" as const,
            value: "NDIS registered providers must maintain documented policies and procedures as part of the NDIS Practice Standards. Auditors will check that policies exist, are current, and are reviewed regularly.",
          },
          {
            type: "list" as const,
            value: [
              "Incident management policy (mandatory)",
              "Complaints handling policy (mandatory)",
              "Privacy and confidentiality policy",
              "Work health and safety policy",
              "Human resources and worker screening policy",
              "Continuity of supports policy",
            ],
          },
        ],
      },
      {
        id: "adding-a-policy",
        title: "Adding a Policy",
        icon: "file",
        color: "teal",
        content: [
          {
            type: "steps" as const,
            value: [
              "Click '+ Add Policy' from the policies list page",
              "Enter the policy title and select or type a category",
              "Upload the policy document (PDF recommended)",
              "Set the version number, effective date, and review due date",
              "Set status to Draft while developing, Active when approved",
            ],
          },
        ],
      },
      {
        id: "review-cycle",
        title: "Policy Review Cycle",
        icon: "clock",
        color: "yellow",
        badge: "ANNUAL",
        content: [
          {
            type: "text" as const,
            value: "Most NDIS policies should be reviewed at least annually. Overdue reviews are flagged on the compliance dashboard and reduce your compliance score.",
          },
        ],
      },
    ],
    relatedLinks: [
      { label: "Compliance Dashboard", href: "/compliance" },
      { label: "Certifications", href: "/compliance/certifications" },
    ],
  },

  // ---------------------------------------------------------------------------
  // 15. FINANCIALS
  // ---------------------------------------------------------------------------
  financials: {
    id: "financials",
    title: "Payments & Financials",
    subtitle: "SDA payments, NDIS exports, MTA claims, and plan-managed invoices",
    overview:
      "Track SDA payments, generate NDIS exports, manage Medium Term Accommodation claims, and produce tax invoices for plan-managed participants. The Financials module brings together all revenue streams in one place for accurate reporting and timely cash flow.",
    sections: [
      {
        id: "sda-payments",
        title: "SDA Payments",
        icon: "dollar",
        color: "teal",
        defaultExpanded: true,
        content: [
          {
            type: "text",
            value:
              "SDA payments are the primary revenue stream for each property. Payments are recorded against participants and linked to their NDIS plans for reconciliation and variance tracking.",
          },
          {
            type: "list",
            value: [
              "Record payments as they are received from NDIS or plan managers",
              "Each payment is linked to a participant and their active NDIS plan",
              "The system validates that the plan has not expired before accepting the payment",
              "Variance detection flags any payment that differs by more than $500 from expected amounts",
              "Payment history is available per participant, per property, and per period",
              "Duplicate detection prevents recording the same payment twice",
            ],
          },
          {
            type: "tip",
            value:
              "Use the payment reference field to store the bank or NDIS reference number. This makes bank reconciliation much faster.",
          },
        ],
      },
      {
        id: "ndis-export",
        title: "NDIS Export (PACE CSV)",
        icon: "file",
        color: "purple",
        badge: "EXPORT",
        content: [
          {
            type: "text",
            value:
              "Generate NDIS-compliant CSV files for bulk claiming through the PACE portal. The export includes all required fields in the correct format.",
          },
          {
            type: "steps",
            value: [
              "Navigate to the Financials page and select the Claims tab",
              "Select the reporting period (typically monthly or quarterly)",
              "Review the export preview to verify participant details and amounts",
              "Download the CSV file in NDIS PACE-compliant format",
              "Upload to the NDIS PACE portal via your provider account",
              "Mark the export as submitted in MySDAManager for tracking",
            ],
          },
          {
            type: "warning",
            value:
              "Ensure all participant NDIS numbers are current before exporting. Missing or incorrect NDIS numbers will cause the PACE upload to reject those line items.",
          },
        ],
      },
      {
        id: "mta-claims",
        title: "MTA Claims",
        icon: "list",
        color: "yellow",
        badge: "MTA",
        content: [
          {
            type: "text",
            value:
              "Medium Term Accommodation (MTA) claims cover short-stay accommodation for NDIS participants, typically up to 90 days. The MTA tab manages agreements, claim periods, and invoice generation.",
          },
          {
            type: "fields",
            value: [
              "**Agreement Setup**: Enter the participant, daily MTA rate, start date, end date (max 90 days), and claim frequency (weekly, fortnightly, or monthly).",
              "**Bulk Create**: Click 'Generate All Claims' to automatically create claim windows for the entire agreement period using rolling date windows.",
              "**Invoice Numbers**: Auto-generated in INV-0001 format, sequential per organisation per month.",
              "**Status Lifecycle**: Pending (created) -> Submitted (sent to NDIS) -> Paid (payment received). Claims can also be marked Rejected or Partial.",
              "**Delete**: Only pending or rejected claims can be deleted. Submitted and paid claims are locked for audit purposes.",
            ],
          },
          {
            type: "tip",
            value:
              "Use 'Generate All Claims' instead of creating claims one at a time. This ensures consistent date windows across the full agreement period with no gaps or overlaps.",
          },
        ],
      },
      {
        id: "plan-managed-invoices",
        title: "Plan-Managed Invoices",
        icon: "file",
        color: "green",
        content: [
          {
            type: "text",
            value:
              "For participants whose NDIS plan is managed by a plan manager, you can generate professional tax invoices in Xero-compatible format directly from the Claims tab.",
          },
          {
            type: "steps",
            value: [
              "On the Claims tab, find the participant with a 'Plan Managed' claim method",
              "Click 'Generate Invoice' on individual claims or use bulk invoice generation",
              "The system produces a 2-page PDF: Page 1 is the tax invoice, Page 2 is a payment advice slip",
              "The invoice includes your organisation's ABN, bank details, and logo",
              "Download the PDF and send it to the plan manager for payment",
            ],
          },
          {
            type: "tip",
            value:
              "Ensure your organisation's bank details and ABN are configured in Settings > Organization before generating invoices. These details appear on every invoice.",
          },
        ],
      },
    ],
    relatedLinks: [
      { label: "NDIS Export", href: "/payments/ndis-export" },
      { label: "Reports", href: "/reports" },
      { label: "Settings", href: "/settings" },
    ],
  },

  // ---------------------------------------------------------------------------
  // 16. ALERTS
  // ---------------------------------------------------------------------------
  alerts: {
    id: "alerts",
    title: "Alerts & Notifications",
    subtitle: "Automated monitoring for expiries, compliance, and operations",
    overview:
      "MySDAManager continuously monitors your data for compliance risks, approaching deadlines, and operational issues. Alerts are generated automatically and displayed on your dashboard and the dedicated Alerts page so nothing slips through the cracks.",
    sections: [
      {
        id: "alert-types",
        title: "Alert Types",
        icon: "alert",
        color: "teal",
        defaultExpanded: true,
        content: [
          {
            type: "text",
            value:
              "Alerts are classified into three severity levels. Each level determines how prominently the alert is displayed and what action is expected.",
          },
          {
            type: "fields",
            value: [
              "**Critical (Red)**: Requires immediate action. Examples: expired NDIS plan, expired fire safety certificate, overdue complaint acknowledgment. These appear prominently on the dashboard with a red indicator.",
              "**Warning (Yellow)**: Action needed soon. Examples: plan expiring within 30 days, document expiring within 90 days, consent expiring soon. These appear as yellow indicators.",
              "**Info (Teal)**: Informational notices. Examples: new participant without full details, incomplete profile alerts. Lower urgency but should be addressed within normal workflow.",
            ],
          },
        ],
      },
      {
        id: "document-expiry-alerts",
        title: "Document Expiry Alerts",
        icon: "file",
        color: "yellow",
        badge: "AUTOMATED",
        content: [
          {
            type: "list",
            value: [
              "Generated automatically when compliance documents approach their expiry date",
              "Alerts trigger at 90 days, 30 days, and 7 days before expiry",
              "After expiry, the alert escalates to Critical severity",
              "Common documents tracked: fire safety certificates, insurance policies, SDA registrations, NDIS practice standards",
              "Resolve by uploading the renewed document with the new expiry date",
            ],
          },
        ],
      },
      {
        id: "plan-expiry-alerts",
        title: "Plan Expiry Alerts",
        icon: "clock",
        color: "red",
        badge: "CRITICAL",
        content: [
          {
            type: "text",
            value:
              "NDIS plan expiry alerts are among the most important because an expired plan blocks all payment processing for that participant.",
          },
          {
            type: "list",
            value: [
              "60-day warning: Begin contacting the Support Coordinator about plan renewal",
              "30-day warning: Escalated alert. Follow up if no renewal confirmation received",
              "7-day warning: Critical alert. Payment processing will stop when the plan expires",
              "Expired: No new payments can be recorded against this plan until a new plan is created",
            ],
          },
          {
            type: "warning",
            value:
              "Plan expiry gaps mean you cannot claim SDA funding for that participant during the gap period. This revenue is typically unrecoverable.",
          },
        ],
      },
      {
        id: "vacancy-alerts",
        title: "Vacancy Alerts",
        icon: "home",
        color: "purple",
        content: [
          {
            type: "text",
            value:
              "Vacancy alerts help you track unoccupied dwellings that are generating no revenue. Each empty bed represents lost SDA funding potential.",
          },
          {
            type: "list",
            value: [
              "Generated when a dwelling has fewer participants than its maximum capacity",
              "Tracks how long the vacancy has existed",
              "Resolve by assigning a new participant to the dwelling",
              "Vacancy data feeds into the dashboard portfolio overview and reports",
            ],
          },
        ],
      },
      {
        id: "consent-expiry-alerts",
        title: "Consent Expiry Alerts",
        icon: "shield",
        color: "yellow",
        content: [
          {
            type: "list",
            value: [
              "Participant consent records are tracked for expiry (typically annual renewal)",
              "Warning alerts appear 30 days before consent expires",
              "Critical alerts appear when consent has expired",
              "Missing consent alerts flag participants who have never had consent recorded",
              "Resolve by recording renewed consent on the participant detail page",
            ],
          },
          {
            type: "tip",
            value:
              "Use the Easy Read Consent PDF generator to produce accessible consent forms that participants can understand and sign.",
          },
        ],
      },
      {
        id: "how-to-resolve",
        title: "How to Resolve Alerts",
        icon: "check",
        color: "green",
        content: [
          {
            type: "steps",
            value: [
              "Review the alert on the dashboard or Alerts page to understand what needs attention",
              "Click the alert to navigate directly to the relevant record (participant, property, document, etc.)",
              "Take the required action: renew the document, update the plan, assign a participant, or record consent",
              "The alert will automatically resolve once the underlying issue is addressed",
              "Dismissed alerts can be re-activated if the issue reappears",
            ],
          },
          {
            type: "tip",
            value:
              "Check the Alerts page at least daily. The dashboard shows a summary count, but the Alerts page provides filtering by type and severity for systematic resolution.",
          },
        ],
      },
    ],
    relatedLinks: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Compliance Certifications", href: "/compliance/certifications" },
      { label: "Documents", href: "/documents" },
    ],
  },

  // ---------------------------------------------------------------------------
  // 17. DASHBOARD
  // ---------------------------------------------------------------------------
  dashboard: {
    id: "dashboard",
    title: "Dashboard Overview",
    subtitle: "Your command center for daily operations",
    overview:
      "The dashboard provides a real-time overview of your entire SDA portfolio. It surfaces the most important information first so you can prioritise your day effectively, from urgent alerts to upcoming tasks and recent activity.",
    sections: [
      {
        id: "property-portfolio",
        title: "Property Portfolio Stats",
        icon: "home",
        color: "teal",
        defaultExpanded: true,
        content: [
          {
            type: "text",
            value:
              "The top section displays key metrics about your property portfolio at a glance.",
          },
          {
            type: "list",
            value: [
              "Total Properties: Count of all active SDA and SIL properties in your portfolio",
              "Total Dwellings: Number of individual living units across all properties",
              "Total Participants: Active NDIS participants housed in your dwellings",
              "Vacancy Count: Dwellings with available capacity for new participants",
              "SIL Properties: Properties managed under Supported Independent Living arrangements",
              "Compliance Score: Overall compliance health based on certifications, documents, and plans",
            ],
          },
        ],
      },
      {
        id: "task-overview",
        title: "Task Overview",
        icon: "check",
        color: "yellow",
        badge: "DAILY",
        content: [
          {
            type: "text",
            value:
              "The Tasks section shows your follow-up workload and highlights items that need immediate attention.",
          },
          {
            type: "list",
            value: [
              "Overdue tasks are displayed with a red indicator and count",
              "Due today tasks appear with a yellow indicator",
              "Upcoming tasks show what is coming in the next 7 days",
              "Click any task count to navigate directly to the filtered Follow-ups page",
              "Completed tasks are tracked for reporting and workload analysis",
            ],
          },
        ],
      },
      {
        id: "operations-summary",
        title: "Operations Summary",
        icon: "tool",
        color: "purple",
        content: [
          {
            type: "list",
            value: [
              "Active Maintenance: Open maintenance requests requiring attention",
              "Open Incidents: Unresolved incidents that need investigation or closure",
              "Pending Inspections: Scheduled inspections that have not yet been completed",
              "Active Complaints: Complaints in the resolution pipeline",
              "Consent Status: Counts of active, expired, and missing participant consent records",
            ],
          },
        ],
      },
      {
        id: "quick-actions",
        title: "Quick Actions",
        icon: "star",
        color: "green",
        content: [
          {
            type: "text",
            value:
              "The Quick Actions panel provides one-click access to the most common daily tasks.",
          },
          {
            type: "list",
            value: [
              "New Maintenance Request: Log a new repair or maintenance issue",
              "New Incident: Report a safety incident immediately",
              "New Inspection: Start a property inspection checklist",
              "New Communication: Log a phone call, email, or meeting",
              "Upload Document: Quickly file a new compliance document",
            ],
          },
          {
            type: "tip",
            value:
              "Use the Command Palette (Ctrl+K) for even faster navigation. Type what you need and press Enter to go directly there.",
          },
        ],
      },
      {
        id: "getting-started",
        title: "Getting Started Tips",
        icon: "info",
        color: "gray",
        content: [
          {
            type: "steps",
            value: [
              "Start each day by checking the dashboard for critical alerts and overdue tasks",
              "Review the Operations Summary to see what needs follow-up",
              "Process any pending inspections or maintenance requests",
              "Check the Recent Activity feed for changes made by other team members",
              "Use Quick Actions to handle any new items that come up during the day",
            ],
          },
        ],
      },
    ],
    relatedLinks: [
      { label: "Alerts", href: "/alerts" },
      { label: "Follow-ups", href: "/follow-ups" },
      { label: "Help Center", href: "/help" },
    ],
  },

  // ---------------------------------------------------------------------------
  // 18. SETTINGS
  // ---------------------------------------------------------------------------
  settings: {
    id: "settings",
    title: "Settings & Configuration",
    subtitle: "Configure your organisation, users, integrations, and security",
    overview:
      "The Settings area lets you customise MySDAManager for your organisation. Manage users and roles, connect external services, configure API access, and control security features like MFA and session timeouts.",
    sections: [
      {
        id: "organization-settings",
        title: "Organisation Settings",
        icon: "home",
        color: "teal",
        defaultExpanded: true,
        content: [
          {
            type: "text",
            value:
              "Configure your organisation's identity and branding. These details appear on invoices, reports, and the login screen.",
          },
          {
            type: "fields",
            value: [
              "**Organisation Name**: Your registered business name as it appears on all documents and reports.",
              "**Logo**: Upload your organisation's logo. It will appear on invoices, PDF reports, and the navigation header.",
              "**Brand Color**: Choose a primary color for your organisation's UI theme. This customises buttons, links, and accents.",
              "**ABN**: Your Australian Business Number, displayed on invoices and tax documents.",
              "**Contact Details**: Phone number, email, and address used on official correspondence.",
            ],
          },
        ],
      },
      {
        id: "user-management",
        title: "User Management",
        icon: "users",
        color: "purple",
        badge: "ADMIN",
        content: [
          {
            type: "text",
            value:
              "Manage who can access the system and what they can do. MySDAManager uses role-based access control (RBAC) to restrict data access based on job function.",
          },
          {
            type: "fields",
            value: [
              "**Admin**: Full access to all features including user management, settings, audit logs, and super-admin functions.",
              "**Property Manager**: Access to properties, participants, maintenance, inspections, payments, and communications. Cannot manage users or view audit logs.",
              "**Staff**: Limited access for day-to-day operations. Can create incidents, maintenance requests, and log communications. Cannot view financial data.",
              "**SIL Provider**: Restricted to the SIL Provider Portal. Can view assigned participants and properties only.",
            ],
          },
          {
            type: "warning",
            value:
              "Always follow the principle of least privilege. Give users only the access they need for their role. Excessive permissions increase the risk of data breaches.",
          },
        ],
      },
      {
        id: "api-keys",
        title: "API Keys",
        icon: "tool",
        color: "gray",
        content: [
          {
            type: "text",
            value:
              "API keys allow external systems to access your MySDAManager data through the REST API. Each key is scoped to specific permissions and can be revoked at any time.",
          },
          {
            type: "steps",
            value: [
              "Navigate to Settings > API Keys",
              "Click 'Create API Key' and enter a descriptive name (e.g. 'Xero Integration')",
              "Select the permissions: Properties, Participants, Maintenance, Incidents (or all)",
              "Copy the generated key immediately - it will not be shown again",
              "Use the key in your API requests as a Bearer token in the Authorization header",
              "Revoke the key immediately if it is compromised or no longer needed",
            ],
          },
          {
            type: "warning",
            value:
              "API keys provide full access to the permitted data. Never share keys in emails, commit them to source code, or expose them in client-side applications.",
          },
        ],
      },
      {
        id: "calendar-integration",
        title: "Calendar Integration",
        icon: "clock",
        color: "green",
        content: [
          {
            type: "list",
            value: [
              "Connect Google Calendar or Microsoft Outlook for two-way event syncing",
              "Calendar events sync automatically every 15 minutes via background cron",
              "Use the manual 'Sync Now' button for immediate synchronisation",
              "Connected calendars appear in the Calendar view with colour-coded sources",
              "Configure at Settings > Integrations > Calendar",
            ],
          },
        ],
      },
      {
        id: "webhook-configuration",
        title: "Webhook Configuration",
        icon: "tool",
        color: "purple",
        content: [
          {
            type: "text",
            value:
              "Outbound webhooks notify external systems when events happen in MySDAManager. Use webhooks to integrate with CRMs, notification services, or custom applications.",
          },
          {
            type: "list",
            value: [
              "12 event types available: participant created/updated, maintenance created/updated, incident created, payment created, and more",
              "Each webhook delivery is signed with HMAC-SHA256 for security verification",
              "Failed deliveries are retried up to 3 times with exponential backoff",
              "Webhooks are automatically disabled after 10 consecutive failures",
              "Delivery history is available for debugging at Settings > Webhooks",
            ],
          },
        ],
      },
      {
        id: "data-export",
        title: "Data Export",
        icon: "file",
        color: "gray",
        content: [
          {
            type: "text",
            value:
              "Export your complete organisational data as a JSON file. This is useful for backups, migration, or compliance audit requests.",
          },
          {
            type: "list",
            value: [
              "Admin-only feature - requires admin role to access",
              "Exports all tables including properties, participants, payments, incidents, and more",
              "Encrypted fields (NDIS numbers, bank details) are decrypted in the export",
              "Secrets and API keys are automatically stripped from the export",
              "Available at Settings > Data Export",
            ],
          },
          {
            type: "warning",
            value:
              "The exported file contains sensitive personal information including NDIS numbers and financial data. Store it securely and delete it when no longer needed.",
          },
        ],
      },
    ],
    relatedLinks: [
      { label: "Security Settings", href: "/settings/security" },
      { label: "API Documentation", href: "/settings/api-keys" },
      { label: "Webhooks", href: "/settings/webhooks" },
    ],
  },

  // ---------------------------------------------------------------------------
  // 19. CALENDAR
  // ---------------------------------------------------------------------------
  calendar: {
    id: "calendar",
    title: "Calendar Integration",
    subtitle: "Sync external calendars and manage events across views",
    overview:
      "The Calendar module brings together internal events, synced external calendars, and compliance deadlines into a single view. Connect your Google or Outlook calendar to see everything in one place and never miss an appointment, inspection, or deadline.",
    sections: [
      {
        id: "connecting-google-calendar",
        title: "Connecting Google Calendar",
        icon: "check",
        color: "green",
        defaultExpanded: true,
        content: [
          {
            type: "steps",
            value: [
              "Navigate to Settings > Integrations > Calendar",
              "Click 'Connect Google Calendar' to start the OAuth flow",
              "Sign in with your Google account and grant calendar access",
              "Select which calendars to sync (you can choose specific calendars or all)",
              "Events will begin syncing immediately and then refresh every 15 minutes",
              "Use the 'Sync Now' button at any time for an immediate refresh",
            ],
          },
          {
            type: "tip",
            value:
              "Google Calendar events appear in the calendar view with a distinct colour so you can tell synced events apart from internal MySDAManager events.",
          },
        ],
      },
      {
        id: "connecting-outlook",
        title: "Connecting Outlook Calendar",
        icon: "info",
        color: "gray",
        badge: "COMING SOON",
        content: [
          {
            type: "text",
            value:
              "Microsoft Outlook calendar integration is fully built and ready to activate. It requires Azure OAuth app registration which is currently pending configuration.",
          },
          {
            type: "list",
            value: [
              "Full two-way sync with Outlook 365 calendars",
              "Same 15-minute automatic sync cycle as Google Calendar",
              "Supports multiple Outlook calendars per account",
              "Will be available once Azure app registration is complete",
            ],
          },
        ],
      },
      {
        id: "calendar-views",
        title: "Calendar Views",
        icon: "list",
        color: "teal",
        content: [
          {
            type: "fields",
            value: [
              "**Month View**: Overview of the entire month. Dates with events show indicators. Click a date to see its events or switch to day view.",
              "**Week View**: Seven-day horizontal layout showing events by time slot. Best for planning your week.",
              "**Day View**: Detailed single-day view with hour-by-hour time slots. Best for managing a busy day.",
              "**Agenda View**: A chronological list of all upcoming events across all calendars. Best for quick scanning of what is coming up.",
            ],
          },
        ],
      },
      {
        id: "creating-events",
        title: "Creating Events",
        icon: "star",
        color: "purple",
        content: [
          {
            type: "steps",
            value: [
              "Click on a date or time slot in any calendar view",
              "Enter the event title, description, and time",
              "Optionally link the event to a property, participant, or maintenance request",
              "Set a reminder notification if needed",
              "The event will appear in the calendar view immediately",
            ],
          },
          {
            type: "tip",
            value:
              "Events linked to properties or participants will also appear on their respective detail pages, creating a useful activity timeline.",
          },
        ],
      },
      {
        id: "sync-settings",
        title: "Sync Settings",
        icon: "tool",
        color: "gray",
        content: [
          {
            type: "list",
            value: [
              "Automatic sync runs every 15 minutes via a background cron job",
              "Manual sync is available via the 'Sync Now' button on the calendar page",
              "Disconnect a calendar at any time from Settings > Integrations > Calendar",
              "Synced events are read-only in MySDAManager (edit them in the source calendar)",
              "Connection status is shown on the Settings page with last sync time",
            ],
          },
        ],
      },
    ],
    relatedLinks: [
      { label: "Calendar Settings", href: "/settings/integrations/calendar" },
      { label: "Dashboard", href: "/dashboard" },
    ],
  },

  // ---------------------------------------------------------------------------
  // 20. STAFF FILES
  // ---------------------------------------------------------------------------
  staff: {
    id: "staff",
    title: "Staff Files & NDIS Screening",
    subtitle: "Employee records and NDIS worker screening compliance",
    overview:
      "Manage employee records, track NDIS Worker Screening Check compliance, and monitor document expiry for all staff members. The NDIS requires that all workers with more than incidental contact with participants hold a valid Worker Screening Check at all times.",
    sections: [
      {
        id: "adding-staff",
        title: "Adding Staff Members",
        icon: "users",
        color: "teal",
        defaultExpanded: true,
        content: [
          {
            type: "steps",
            value: [
              "Navigate to Staff Files from the Compliance menu",
              "Click 'Add Staff Member' to open the creation form",
              "Enter the staff member's personal details: name, email, phone, role",
              "Record their employment start date and position title",
              "Add their NDIS Worker Screening Check details (number, issue date, expiry date)",
              "Upload supporting documents: screening clearance letter, qualifications, certifications",
            ],
          },
        ],
      },
      {
        id: "required-documents",
        title: "Required Documents",
        icon: "file",
        color: "yellow",
        badge: "COMPLIANCE",
        content: [
          {
            type: "list",
            value: [
              "NDIS Worker Screening Check clearance letter (mandatory for all workers)",
              "Working With Children Check (if applicable to your state/territory)",
              "First Aid Certificate (recommended for all staff, mandatory for some roles)",
              "CPR Certificate (annual renewal required)",
              "Qualifications and training certificates relevant to role",
              "Signed employment contract or service agreement",
              "Police check (if required by your organisation's policy)",
            ],
          },
          {
            type: "warning",
            value:
              "Workers CANNOT commence duties until their NDIS Worker Screening Check clearance is received. There are no provisional or interim arrangements permitted under NDIS rules.",
          },
        ],
      },
      {
        id: "ndis-worker-screening",
        title: "NDIS Worker Screening",
        icon: "shield",
        color: "red",
        badge: "MANDATORY",
        content: [
          {
            type: "text",
            value:
              "The NDIS Worker Screening Check is a national check that assesses whether a person poses a risk to people with disability. It is mandatory for all NDIS workers in risk-assessed roles.",
          },
          {
            type: "fields",
            value: [
              "**Validity**: 5 years from the date of issue. Must be renewed before expiry.",
              "**Application**: Applied for through the State/Territory Worker Screening Unit. Processing times vary (typically 2-6 weeks).",
              "**Portability**: Valid across all states and territories. A clearance issued in one state is recognised nationally.",
              "**Employer Obligations**: You must verify the clearance before the worker starts, monitor expiry dates, and not allow workers with expired or revoked clearances to work.",
            ],
          },
        ],
      },
      {
        id: "expiry-tracking",
        title: "Expiry Tracking",
        icon: "clock",
        color: "yellow",
        content: [
          {
            type: "list",
            value: [
              "The system automatically monitors screening check expiry dates for all staff",
              "Warning alerts are generated 90 days before expiry",
              "Critical alerts appear 30 days before expiry",
              "Expired screening checks are flagged prominently on the Staff Files page",
              "Begin the renewal process at least 8 weeks before expiry to allow for processing time",
            ],
          },
          {
            type: "tip",
            value:
              "Set a personal reminder to start each staff member's screening renewal 3 months before expiry. Processing times can be unpredictable and you cannot allow a gap in clearance.",
          },
        ],
      },
      {
        id: "compliance-status",
        title: "Compliance Status",
        icon: "check",
        color: "green",
        content: [
          {
            type: "fields",
            value: [
              "**Compliant (Green)**: All required documents are current and the screening check is valid.",
              "**Expiring Soon (Yellow)**: One or more documents or the screening check will expire within 90 days. Action needed.",
              "**Non-Compliant (Red)**: The screening check has expired or a mandatory document is missing. The worker should not be performing risk-assessed work until resolved.",
            ],
          },
          {
            type: "warning",
            value:
              "Allowing a worker to continue in a risk-assessed role with an expired NDIS Worker Screening Check is a serious compliance breach. The provider bears responsibility, not the worker.",
          },
        ],
      },
    ],
    relatedLinks: [
      { label: "Compliance Dashboard", href: "/compliance" },
      { label: "Certifications", href: "/compliance/certifications" },
    ],
  },

  // ---------------------------------------------------------------------------
  // 21. EMERGENCY & BUSINESS CONTINUITY
  // ---------------------------------------------------------------------------
  emergency_plans: {
    id: "emergency_plans",
    title: "Emergency & Business Continuity Plans",
    subtitle: "Emergency management and business continuity procedures",
    overview:
      "Emergency Management Plans (EMPs) and Business Continuity Plans (BCPs) are mandatory under NDIS Practice Standard 5. Every SDA property needs a tailored EMP, and your organisation needs a BCP to ensure continuity of supports during disruptions.",
    sections: [
      {
        id: "emp-overview",
        title: "Emergency Management Plan (EMP)",
        icon: "alert",
        color: "red",
        badge: "PER PROPERTY",
        defaultExpanded: true,
        content: [
          {
            type: "text",
            value:
              "Each SDA property must have its own Emergency Management Plan tailored to the property layout, participant needs, and local risks. Plans must be reviewed annually and after any emergency event.",
          },
          {
            type: "list",
            value: [
              "Covers fire, flood, severe weather, medical emergencies, power failures, gas leaks, and security threats",
              "Includes evacuation procedures with primary and secondary routes",
              "Documents participant-specific needs: mobility aids, sensory impairments, behavioural considerations",
              "Lists emergency contacts: management, emergency services, SES, hospitals, and GPs",
              "Details team roles and responsibilities during an emergency",
              "Must be physically posted at the property in an accessible location",
            ],
          },
        ],
      },
      {
        id: "bcp-overview",
        title: "Business Continuity Plan (BCP)",
        icon: "shield",
        color: "purple",
        content: [
          {
            type: "text",
            value:
              "The BCP ensures your organisation can continue delivering essential supports to NDIS participants during disruptive events. It covers organisational-level risks rather than property-specific emergencies.",
          },
          {
            type: "list",
            value: [
              "Key personnel succession: who takes over if the property manager or director is unavailable",
              "Critical services identification: accommodation, utilities, maintenance response, communication",
              "Risk scenarios with likelihood, impact assessment, and mitigation strategies",
              "Data backup and IT recovery procedures",
              "Communication plan for notifying staff, participants, families, and stakeholders",
              "Insurance coverage summary with policy numbers and contacts",
            ],
          },
        ],
      },
      {
        id: "evacuation-procedures",
        title: "Evacuation Procedures",
        icon: "warning",
        color: "yellow",
        badge: "SAFETY",
        content: [
          {
            type: "steps",
            value: [
              "Sound the alarm and call 000 if not already alerted",
              "Assist participants to evacuate using the primary route (or secondary if primary is blocked)",
              "Account for all participants and staff at the assembly point",
              "Do not re-enter the building until emergency services give the all-clear",
              "Report to the emergency coordinator on site",
              "Document the event in MySDAManager as an incident within 24 hours",
            ],
          },
          {
            type: "warning",
            value:
              "Ensure evacuation routes account for participants with mobility limitations. Wheelchair-accessible exits must be clearly identified in the EMP.",
          },
        ],
      },
      {
        id: "emergency-contacts",
        title: "Emergency Contacts",
        icon: "info",
        color: "gray",
        content: [
          {
            type: "fields",
            value: [
              "**Fire, Ambulance, Police**: 000 (Triple Zero)",
              "**SES (Storms, Floods)**: 132 500",
              "**Poisons Information**: 13 11 26",
              "**Lifeline (Crisis Support)**: 13 11 14",
              "**NDIS Commission**: 1800 035 544",
              "**Property Manager**: Listed in each property's EMP",
              "**On-Call Staff**: Listed in the property's emergency roster",
            ],
          },
          {
            type: "tip",
            value:
              "Print emergency contact numbers and post them near the main entrance of each property. Digital-only contact lists are useless during power outages.",
          },
        ],
      },
    ],
    relatedLinks: [
      { label: "Emergency Plans Page", href: "/emergency-plans" },
      { label: "Compliance Dashboard", href: "/compliance" },
      { label: "Incidents", href: "/incidents" },
    ],
  },

  // ---------------------------------------------------------------------------
  // 22. REPORTS
  // ---------------------------------------------------------------------------
  reports: {
    id: "reports",
    title: "Reports & Analytics",
    subtitle: "Generate compliance, financial, and operational reports",
    overview:
      "The Reports module provides pre-built reports for NDIS compliance audits, financial reconciliation, and operational performance tracking. Generate PDF exports, download data files, and build evidence packs for regulatory reviews.",
    sections: [
      {
        id: "compliance-reports",
        title: "Compliance Reports",
        icon: "shield",
        color: "red",
        badge: "AUDIT",
        defaultExpanded: true,
        content: [
          {
            type: "text",
            value:
              "Compliance reports help you prepare for NDIS audits by aggregating certification status, incident records, and documentation completeness into structured formats.",
          },
          {
            type: "fields",
            value: [
              "**Audit Compliance Pack**: A comprehensive 7-section PDF covering certifications, incidents, complaints, participant plans, document expiry, and audit log integrity. Generate this before any NDIS review.",
              "**Certification Status Report**: Lists all compliance certifications with their current status, expiry dates, and any overdue renewals.",
              "**Complaints Register Export**: Landscape PDF listing all complaints with reference numbers, status, timeframes, and resolution outcomes.",
              "**Incident Summary**: Aggregated incident data by type, severity, property, and participant for a selected period.",
            ],
          },
          {
            type: "tip",
            value:
              "Generate the Audit Compliance Pack monthly, even when no audit is scheduled. This helps identify gaps early and demonstrates ongoing compliance to auditors.",
          },
        ],
      },
      {
        id: "financial-reports",
        title: "Financial Reports",
        icon: "dollar",
        color: "green",
        content: [
          {
            type: "text",
            value:
              "Financial reports provide visibility into revenue, payment tracking, and owner distributions across your portfolio.",
          },
          {
            type: "fields",
            value: [
              "**Payment Summary**: Total payments received by period, grouped by participant, property, or payment type.",
              "**Owner Folio Summary**: Per-owner revenue breakdown showing participant contributions, provider fee deductions, and net distributions. Used as the owner's statement.",
              "**Variance Report**: Payments that differ from expected amounts by more than $500, with investigation status.",
              "**MTA Claims Summary**: Overview of MTA claim status across all agreements, including pending, submitted, and paid amounts.",
            ],
          },
        ],
      },
      {
        id: "operational-reports",
        title: "Operational Reports",
        icon: "tool",
        color: "purple",
        content: [
          {
            type: "fields",
            value: [
              "**Maintenance Summary**: Open requests by status, average resolution time, cost by property, and contractor performance metrics.",
              "**Inspection Summary**: Inspection completion rates, common failure items, pass/fail trends by property.",
              "**Vacancy Report**: Current and historical vacancy data across the portfolio with estimated revenue impact.",
              "**Task Completion**: Follow-up task metrics showing completion rates, overdue trends, and workload distribution.",
            ],
          },
        ],
      },
      {
        id: "export-options",
        title: "Export Options",
        icon: "file",
        color: "gray",
        content: [
          {
            type: "list",
            value: [
              "PDF: Professional formatted reports suitable for stakeholders, owners, and auditors",
              "CSV: Raw data exports for spreadsheet analysis in Excel or Google Sheets",
              "JSON: Structured data export for integration with external systems",
              "PACE CSV: NDIS-specific format for bulk claiming through the PACE portal",
              "Audit Pack: Multi-section PDF combining multiple report types into a single document",
            ],
          },
          {
            type: "tip",
            value:
              "For NDIS audits, use the Audit Compliance Pack export. It combines all relevant compliance data into a single, auditor-friendly PDF document.",
          },
        ],
      },
    ],
    relatedLinks: [
      { label: "Financials", href: "/financials" },
      { label: "Compliance Dashboard", href: "/compliance" },
      { label: "Data Export", href: "/settings/data-export" },
    ],
  },
};
