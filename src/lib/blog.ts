// Blog content for MySDAManager marketing site
// Static content defined as JS objects for simplicity (no MDX dependencies)

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  author: string;
  category:
    | "compliance-tips"
    | "product-updates"
    | "sda-market"
    | "ndis-changes";
  categoryLabel: string;
  keywords: string[];
  readingTime: string;
  content: string; // Pre-rendered HTML content
}

export const BLOG_CATEGORIES = [
  { id: "all", label: "All Posts" },
  { id: "compliance-tips", label: "Compliance Tips" },
  { id: "product-updates", label: "Product Updates" },
  { id: "sda-market", label: "SDA Market Insights" },
  { id: "ndis-changes", label: "NDIS Changes" },
] as const;

export const BLOG_POSTS: BlogPost[] = [
  // ─── Post 1 ───────────────────────────────────────────────────────────
  {
    slug: "real-cost-spreadsheet-sda-compliance",
    title: "The Real Cost of Managing SDA Compliance on Spreadsheets",
    description:
      "Hidden costs of manual compliance management for SDA providers: time wasted, audit risk, and how purpose-built software delivers measurable ROI.",
    date: "2026-02-10",
    author: "MySDAManager Team",
    category: "compliance-tips",
    categoryLabel: "Compliance Tips",
    keywords: [
      "SDA compliance cost",
      "NDIS compliance spreadsheet",
      "SDA provider software ROI",
      "NDIS audit risk",
      "SDA management software",
    ],
    readingTime: "6 min read",
    content: `
<p>Every SDA provider starts the same way. A spreadsheet for properties. Another for participant details. A shared Google Drive for compliance documents. Calendar reminders for expiry dates. It works&mdash;until it doesn&rsquo;t.</p>

<p>The moment an NDIS auditor walks through your door, the cracks in this system become chasms. And the real cost of managing compliance on spreadsheets is not the subscription fee you are saving&mdash;it is the time, risk, and revenue you are haemorrhaging every single week.</p>

<h2>The hidden time cost</h2>

<p>Let us quantify what &ldquo;manual compliance management&rdquo; actually looks like for a typical SDA provider managing 10&ndash;20 properties:</p>

<ul>
<li><strong>Document tracking:</strong> 45&ndash;60 minutes per week checking expiry dates across fire safety certificates, insurance policies, worker screening checks, and participant consent forms. Multiply that across 15 properties with 5&ndash;10 documents each, and you are tracking 75&ndash;150 individual dates.</li>
<li><strong>Incident reporting:</strong> 30&ndash;45 minutes per incident to locate the correct template, fill it in, cross-reference participant details, and file it in the right folder. NDIS reportable incidents have a 24-hour notification window&mdash;there is zero margin for scrambling.</li>
<li><strong>Payment reconciliation:</strong> 1&ndash;2 hours per week calculating SDA funding, RRC contributions, and provider fees for each participant manually. One transposition error cascades through months of records.</li>
<li><strong>Audit preparation:</strong> 2&ndash;3 full days (minimum) when audit season arrives. Gathering consent forms from one folder, fire certificates from another, incident logs from a third. Formatting everything into a presentable pack.</li>
</ul>

<p>Conservative estimate: <strong>4 hours per week</strong> on compliance administration alone. At a fully-loaded cost of $75/hour for a property manager, that is <strong>$15,600 per year</strong> spent on work that software can automate.</p>

<h2>The errors you do not see until audit day</h2>

<p>Time is one thing. Errors are another. Here are the most common compliance failures we see from providers still running on spreadsheets:</p>

<h3>Expired fire safety certificates</h3>
<p>FP1500 Annual Fire Safety Statements must be current for every SDA property. A single expired certificate is an immediate non-compliance finding. In a spreadsheet system, the only safeguard is a calendar reminder&mdash;which has no escalation path, no accountability trail, and no way to prove the reminder was acted on.</p>

<h3>Missing or expired consent forms</h3>
<p>Australian Privacy Principle 3 (APP 3) requires valid, signed consent for every participant. Consent forms expire. Participants move between dwellings. New consent must be obtained. In a spreadsheet, there is no automated trigger when consent lapses. The gap can sit undetected for months.</p>

<h3>Incident reporting delays</h3>
<p>The NDIS Commission requires reportable incidents to be notified within 24 hours. When your incident form is a Word document template stored in a shared drive, and the staff member in the field has no mobile-optimised way to submit it, you are relying on memory and manual follow-up to meet that deadline.</p>

<h3>Stale participant plan data</h3>
<p>NDIS plans have start and end dates. When a plan expires and is not renewed, the funding basis for SDA payments changes. A spreadsheet will not warn you that a participant&rsquo;s plan expired three weeks ago and you are still claiming against it.</p>

<h2>The audit risk is not hypothetical</h2>

<p>NDIS audits are not annual events you can prepare for in advance. They can be unannounced. The auditor will ask for specific documents and expect them within minutes, not days. The five documents they check first are:</p>

<ol>
<li>Participant consent forms (APP 3 compliant, currently signed)</li>
<li>Fire safety statements (FP1500, current for every property)</li>
<li>Incident register with chain of custody</li>
<li>Complaints handling records (24-hour acknowledgment evidence)</li>
<li>Staff screening check clearances (current, not expired)</li>
</ol>

<p>If any of these are missing, expired, or cannot be produced quickly, you face a non-compliance finding. Multiple findings can escalate to conditions on your registration. In the worst case, registration can be suspended&mdash;which means zero revenue from every SDA property you manage.</p>

<h2>The ROI calculation</h2>

<p>Here is the straightforward comparison:</p>

<table>
<thead>
<tr><th>Cost centre</th><th>Spreadsheet approach</th><th>MySDAManager</th></tr>
</thead>
<tbody>
<tr><td>Compliance admin time</td><td>$15,600/year (4 hrs/wk &times; $75)</td><td>$2,400/year (30 min/wk &times; $75)</td></tr>
<tr><td>Audit preparation</td><td>$3,600/year (2 audits &times; 3 days &times; $75/hr)</td><td>$300/year (one-click pack)</td></tr>
<tr><td>Error correction</td><td>$2,000+/year (payment recalculations, re-filing)</td><td>Near zero (automated validation)</td></tr>
<tr><td>Software cost</td><td>$0</td><td>$5,400/year (Professional plan)</td></tr>
<tr><td><strong>Total annual cost</strong></td><td><strong>$21,200+</strong></td><td><strong>$8,100</strong></td></tr>
</tbody>
</table>

<p>That is a net saving of <strong>$13,100 per year</strong>&mdash;before accounting for the revenue protection of maintaining an unblemished compliance record.</p>

<h2>What purpose-built software actually does differently</h2>

<p>The difference is not just digitising spreadsheets. It is building compliance into the workflow so that gaps become impossible to miss:</p>

<ul>
<li><strong>Automated expiry alerts</strong> at 90, 60, and 30 days for every document, certificate, and participant plan&mdash;with an audit trail proving the alert was generated and acknowledged.</li>
<li><strong>Offline incident forms</strong> that field staff can complete on mobile, even without connectivity, with automatic sync when back online.</li>
<li><strong>One-click audit packs</strong> that generate a 7-section evidence PDF covering certifications, incidents, complaints, participant plans, documents, and audit log integrity.</li>
<li><strong>Real-time dashboards</strong> showing compliance status at a glance&mdash;how many documents are expiring, how many plans need renewal, how many incidents are open.</li>
</ul>

<h2>The bottom line</h2>

<p>Spreadsheets are not free. They cost you time, expose you to audit risk, and create gaps that only become visible when it is too late. For SDA providers managing more than a handful of properties, the question is not whether you can afford purpose-built software&mdash;it is whether you can afford not to have it.</p>

<p>If you are spending more than 2 hours a week on compliance administration, the ROI is already there.</p>
`,
  },

  // ─── Post 2 ───────────────────────────────────────────────────────────
  {
    slug: "5-documents-ndis-commission-checks-first",
    title:
      "5 Documents the NDIS Commission Checks First in an SDA Audit",
    description:
      "What NDIS auditors look for first: consent forms, fire safety statements, incident registers, complaints records, and staff screening checks. A compliance guide for SDA providers.",
    date: "2026-02-07",
    author: "MySDAManager Team",
    category: "compliance-tips",
    categoryLabel: "Compliance Tips",
    keywords: [
      "NDIS audit documents",
      "SDA audit checklist",
      "NDIS compliance requirements",
      "NDIS Practice Standards SDA",
      "SDA provider audit preparation",
    ],
    readingTime: "7 min read",
    content: `
<p>When an NDIS auditor arrives&mdash;announced or unannounced&mdash;they follow a well-established playbook. They are not reviewing every document in your filing cabinet. They are checking specific evidence points that indicate whether your organisation has robust compliance systems or is operating on hope and good intentions.</p>

<p>After working with SDA providers across Australia, we have identified the five documents that auditors consistently request first. Getting these right does not guarantee a clean audit, but getting any of them wrong almost certainly guarantees a finding.</p>

<h2>1. Participant consent forms (APP 3)</h2>

<h3>What auditors look for</h3>
<p>A valid, signed consent form for every current participant. The form must comply with Australian Privacy Principle 3 (APP 3), which governs the collection of personal information. For SDA providers, this is particularly sensitive because you are collecting and storing health-related information, NDIS numbers, emergency contacts, and financial details.</p>

<h3>What constitutes compliance</h3>
<ul>
<li>Consent was obtained <strong>before or at the time</strong> of information collection</li>
<li>The consent form clearly states <strong>what information</strong> is being collected and <strong>why</strong></li>
<li>The participant (or their nominee/guardian) has <strong>signed and dated</strong> the form</li>
<li>Consent is <strong>current</strong>&mdash;not expired and not withdrawn</li>
<li>For participants with cognitive impairment, an <strong>Easy Read</strong> version was provided</li>
</ul>

<h3>Common gaps</h3>
<p>The most frequent issue is expired consent. Many providers obtain consent at intake and never revisit it. Consent should be renewed annually at minimum, or whenever there is a material change to the information being collected or how it is used. A signed form from three years ago with a previous address is not current consent.</p>

<p>The second most common gap is the absence of Easy Read formats. The NDIS Commission expects providers to make reasonable adjustments to ensure participants understand what they are consenting to.</p>

<h2>2. Fire safety statements (FP1500)</h2>

<h3>What auditors look for</h3>
<p>Current Annual Fire Safety Statements (FP1500 in NSW, equivalent forms in other states) for every SDA property. These statements certify that all essential fire safety measures in the building have been assessed by a competent fire safety practitioner and are performing to the required standard.</p>

<h3>What constitutes compliance</h3>
<ul>
<li>An FP1500 (or state equivalent) exists for <strong>every property</strong></li>
<li>The statement is <strong>dated within the last 12 months</strong></li>
<li>It covers <strong>all essential fire safety measures</strong> listed on the fire safety schedule</li>
<li>It was prepared by a <strong>qualified fire safety practitioner</strong></li>
<li>A copy has been <strong>prominently displayed</strong> in the building</li>
</ul>

<h3>Common gaps</h3>
<p>Expired certificates are the number one issue. Fire safety statements are annual, and the renewal date varies by property. When you manage 15&ndash;20 properties, tracking 15&ndash;20 different expiry dates manually is a recipe for gaps. A single expired FP1500 is an immediate non-compliance finding because it directly affects participant safety.</p>

<p>The other common gap is incomplete coverage. The FP1500 must address every measure on the fire safety schedule. If the building has been modified (e.g., new smoke detectors, updated sprinkler systems), the schedule and statement must reflect these changes.</p>

<h2>3. Incident register with chain of custody</h2>

<h3>What auditors look for</h3>
<p>A complete incident register showing every recorded incident, with clear timestamps demonstrating compliance with reporting obligations. For NDIS reportable incidents, the auditor will check that the NDIS Commission was notified within 24 hours and that a detailed report was submitted within 5 business days.</p>

<h3>What constitutes compliance</h3>
<ul>
<li>Every incident has a <strong>unique identifier</strong> and <strong>creation timestamp</strong></li>
<li>The register shows <strong>who recorded</strong> the incident, <strong>when</strong>, and <strong>what actions</strong> were taken</li>
<li>Reportable incidents have evidence of <strong>24-hour NDIS notification</strong></li>
<li>Follow-up actions are documented with <strong>completion dates</strong> and <strong>responsible parties</strong></li>
<li>The register is <strong>tamper-evident</strong>&mdash;entries cannot be silently modified or deleted</li>
</ul>

<h3>Common gaps</h3>
<p>Chain of custody is where most providers fall down. Auditors do not just want to see that an incident was recorded&mdash;they want to see an unbroken timeline from initial report through investigation to resolution. When incidents are recorded in Word documents or spreadsheets, there is no audit trail showing when entries were created or modified.</p>

<p>The 24-hour notification requirement for reportable incidents is another pressure point. If a field worker records an incident on Friday afternoon and the office does not see it until Monday morning, the notification window has already closed.</p>

<h2>4. Complaints handling records</h2>

<h3>What auditors look for</h3>
<p>Evidence that your organisation has a documented complaints handling procedure and that it is being followed. The NDIS Practice Standards require providers to acknowledge complaints within 24 hours and work towards resolution within 21 days.</p>

<h3>What constitutes compliance</h3>
<ul>
<li>A <strong>documented complaints procedure</strong> accessible to participants and staff</li>
<li>Every complaint has a <strong>unique reference number</strong> and <strong>receipt timestamp</strong></li>
<li>Evidence of <strong>24-hour acknowledgment</strong> (email, letter, or documented phone call)</li>
<li>A <strong>resolution timeline</strong> with documented progress</li>
<li>Escalation to the NDIS Commission for complaints involving <strong>reportable incidents</strong></li>
<li><strong>Outcome letters</strong> sent to complainants</li>
</ul>

<h3>Common gaps</h3>
<p>The 24-hour acknowledgment requirement catches many providers off-guard. When complaints arrive via email, phone, or the organisation&rsquo;s website, there must be a system to ensure acknowledgment happens within the window&mdash;regardless of when the complaint arrives (weekends, public holidays, after hours).</p>

<p>The other gap is the absence of a documented procedure. It is not enough to handle complaints well in practice. The auditor needs to see a written procedure that staff can reference, ideally aligned with a formal standard like BLS-SOP-001.</p>

<h2>5. Staff screening check clearances</h2>

<h3>What auditors look for</h3>
<p>Current NDIS Worker Screening Check clearances for every staff member who has contact with participants. This includes direct support workers, property managers who visit sites, and any contractors who work in occupied SDA dwellings.</p>

<h3>What constitutes compliance</h3>
<ul>
<li>Every relevant staff member has a <strong>current NDIS Worker Screening Check</strong></li>
<li>Clearances are <strong>not expired</strong> (validity periods vary by state, typically 5 years)</li>
<li>The organisation maintains a <strong>register</strong> of all clearances with expiry dates</li>
<li>New staff have clearances <strong>before commencing</strong> participant-facing work (or are appropriately supervised while pending)</li>
<li>Contractors working in SDA dwellings have <strong>equivalent screening</strong></li>
</ul>

<h3>Common gaps</h3>
<p>Expired clearances for long-serving staff are the most common finding. A staff member hired five years ago may have had their screening check expire without anyone noticing. The screening check register needs proactive monitoring, not just a one-time check at hiring.</p>

<p>Contractor screening is frequently overlooked. When a plumber or electrician enters an occupied SDA dwelling, they are interacting with NDIS participants. The provider has an obligation to ensure appropriate screening is in place.</p>

<h2>How to stay audit-ready</h2>

<p>The common thread across all five documents is <strong>proactive monitoring</strong>. None of these compliance requirements are difficult to meet when you have systems that flag gaps before they become findings.</p>

<p>The providers who pass audits cleanly are not the ones with the best filing systems. They are the ones with automated alerts that tell them, 90 days in advance, that a fire safety certificate is about to expire. They are the ones with digital incident registers that timestamp every entry and cannot be silently modified. They are the ones with consent management workflows that trigger renewal reminders before consent lapses.</p>

<p>The tools exist. The question is whether you are using them.</p>
`,
  },

  // ─── Post 3 ───────────────────────────────────────────────────────────
  {
    slug: "why-sda-providers-need-purpose-built-software",
    title:
      "Why SDA Providers Need Purpose-Built Software (Not Generic NDIS Tools)",
    description:
      "The SDA management gap: generic NDIS tools handle services, not properties. Why a $592M industry needs software designed for dwelling-level compliance and owner reporting.",
    date: "2026-02-03",
    author: "MySDAManager Team",
    category: "sda-market",
    categoryLabel: "SDA Market Insights",
    keywords: [
      "SDA management software",
      "NDIS SDA tools",
      "SDA provider technology",
      "SDA property management",
      "specialist disability accommodation software",
    ],
    readingTime: "7 min read",
    content: `
<p>If you manage SDA properties, you have almost certainly tried to use generic NDIS software and found it does not quite fit. ShiftCare handles rostering. Brevity handles billing. CTARS handles client management. But none of them handle <strong>properties</strong>.</p>

<p>This is the fundamental gap in the NDIS technology market. SDA providers are not just service providers&mdash;they are property managers operating under NDIS compliance obligations. That dual nature requires software that understands both worlds, and until recently, nothing in the market did.</p>

<h2>The workaround problem</h2>

<p>Here is what a typical SDA provider&rsquo;s technology stack actually looks like:</p>

<ul>
<li><strong>ShiftCare or similar</strong> &mdash; for rostering support workers (if they also provide SIL)</li>
<li><strong>Excel or Google Sheets</strong> &mdash; for tracking properties, dwellings, and occupancy</li>
<li><strong>Xero or MYOB</strong> &mdash; for accounting, with manual data entry for SDA payments</li>
<li><strong>Google Drive or SharePoint</strong> &mdash; for storing compliance documents</li>
<li><strong>Google Calendar</strong> &mdash; for tracking document expiry dates and inspection schedules</li>
<li><strong>Word templates</strong> &mdash; for incident reports, inspection checklists, and owner reports</li>
<li><strong>Email</strong> &mdash; for contractor quotes, maintenance coordination, and compliance correspondence</li>
</ul>

<p>That is seven separate systems, none of which talk to each other, all of which require manual data transfer. Every time a piece of information moves from one system to another, there is an opportunity for error, delay, or omission.</p>

<h2>What makes SDA fundamentally different from other NDIS services</h2>

<p>The reason generic NDIS tools do not work for SDA is structural. SDA providers manage a specific type of asset&mdash;physical properties&mdash;that comes with obligations no other NDIS service type shares:</p>

<h3>Dwelling-level management</h3>
<p>A single SDA property might contain multiple dwellings, each with different participants, different occupancy statuses, and different SDA categories (Improved Liveability, Fully Accessible, Robust, or High Physical Support). Generic client management systems have no concept of a &ldquo;dwelling&rdquo; as a data entity. They track people, not places.</p>

<h3>Owner and investor reporting</h3>
<p>Many SDA properties are owned by external investors who expect monthly Folio Summary reports showing per-participant revenue, SDA funding breakdowns, RRC contributions, and management fee deductions. No generic NDIS tool generates landlord reports because they were not designed for a model where someone else owns the asset.</p>

<h3>SDA payment calculations</h3>
<p>SDA revenue has a unique three-part structure:</p>
<ol>
<li><strong>SDA Funding</strong> &mdash; the NDIS-funded monthly payment based on the participant&rsquo;s plan and the dwelling&rsquo;s SDA category</li>
<li><strong>Reasonable Rent Contribution (RRC)</strong> &mdash; 25% of the Disability Support Pension plus 100% of Commonwealth Rent Assistance</li>
<li><strong>Less: Provider Fee</strong> &mdash; the management percentage deducted before remitting to the owner</li>
</ol>
<p>This calculation is specific to SDA. No other NDIS service type has this revenue model. Generic billing tools do not support it natively, which means every provider is either doing it in spreadsheets or has built custom workarounds.</p>

<h3>Property-level compliance</h3>
<p>SDA compliance operates at the property level, not just the organisation level. Each property needs current fire safety certificates, building compliance documentation, insurance, and SDA design category verification. Generic compliance tools track organisational certifications but have no way to link documents to specific properties and dwellings.</p>

<h3>Maintenance and contractor management</h3>
<p>When a tap leaks in an SDA dwelling, the response chain involves identifying the dwelling, checking whether the property is investor-owned (and therefore requires owner approval for expenditure above a threshold), issuing a quote request to registered contractors, receiving and comparing quotes, approving the work, and recording the maintenance event against the property&rsquo;s history. None of this exists in rostering or billing software.</p>

<h2>The market gap: $592 million with zero purpose-built software</h2>

<p>The SDA market in Australia represents over $592 million in annual NDIS funding. There are hundreds of registered SDA providers managing thousands of properties across every state and territory. Yet until MySDAManager, there was no software product designed specifically for this market.</p>

<p>This is not because the need does not exist. It is because SDA is a relatively new and specialised segment of the NDIS ecosystem. The generic NDIS software vendors (and there are many of them) built for the larger SIL and community participation markets, where the primary entities are staff shifts and service bookings&mdash;not properties and dwellings.</p>

<p>The result is that every SDA provider in Australia is running some version of the same workaround stack described above. Some have invested in custom spreadsheets. Some have hired administrators specifically to manage the compliance paperwork. A few have built internal tools. But none of these approaches scale, and none of them provide the audit trail that NDIS compliance demands.</p>

<h2>What SDA-specific features actually look like</h2>

<p>When we say &ldquo;purpose-built for SDA,&rdquo; we mean the software understands the domain at a structural level:</p>

<ul>
<li><strong>Property and dwelling hierarchy</strong> &mdash; properties contain dwellings, dwellings have SDA categories, participants are placed in dwellings. The data model reflects reality.</li>
<li><strong>Occupancy tracking</strong> &mdash; which dwellings are occupied, which are vacant, which participants are in which dwelling. Vacancy alerts when a dwelling has been empty for more than 30 days.</li>
<li><strong>SDA category management</strong> &mdash; Improved Liveability, Fully Accessible, Robust, and High Physical Support. The category determines funding rates, design requirements, and compliance obligations.</li>
<li><strong>Automated payment calculations</strong> &mdash; SDA Funding + RRC - Provider Fee, calculated per participant per month, with variance detection if actuals differ from expected amounts by more than $500.</li>
<li><strong>Owner Folio Summaries</strong> &mdash; one-click generation of monthly landlord reports showing per-participant revenue and management fee deductions.</li>
<li><strong>Property-level compliance</strong> &mdash; fire safety certificates, building compliance documents, and insurance policies linked to specific properties with automated expiry alerts.</li>
<li><strong>Xero integration</strong> &mdash; SDA payments synced directly to Xero, eliminating manual accounting data entry.</li>
<li><strong>Maintenance workflow</strong> &mdash; from request to quote to approval to completion, tracked against the specific dwelling with contractor management built in.</li>
</ul>

<h2>The cost of the workaround</h2>

<p>The workaround is not free. It costs time (hours per week on manual data transfer and compliance checking), money (dedicated admin staff), and risk (audit exposure from gaps in the stitched-together system). For a provider managing 10&ndash;20 properties, the annual cost of the workaround easily exceeds $15,000&mdash;and that is before counting the cost of a non-compliance finding.</p>

<p>Purpose-built software does not just save time. It eliminates entire categories of risk that manual systems cannot address. Automated expiry alerts, tamper-evident incident registers, and one-click audit packs are not features&mdash;they are safeguards.</p>

<p>The SDA industry has matured to the point where spreadsheet-based compliance management is no longer adequate. The tools that this market needs are different from the tools built for the broader NDIS sector. SDA providers deserve software that understands their world.</p>
`,
  },

  // ─── Post 4 ───────────────────────────────────────────────────────────
  {
    slug: "automated-expiry-alerts-prevent-registration-loss",
    title: "How Automated Expiry Alerts Prevent Registration Loss",
    description:
      "Expired documents are the number one cause of NDIS non-compliance findings. Learn how automated alerts at 90, 60, and 30 days protect your SDA registration.",
    date: "2026-01-28",
    author: "MySDAManager Team",
    category: "compliance-tips",
    categoryLabel: "Compliance Tips",
    keywords: [
      "NDIS expiry alerts",
      "SDA compliance alerts",
      "document expiry tracking",
      "NDIS registration loss",
      "SDA compliance automation",
    ],
    readingTime: "6 min read",
    content: `
<p>Imagine you manage 15 SDA properties. Each property has between 5 and 10 documents with expiry dates: fire safety certificates, insurance policies, building compliance reports, SDA design verifications, and council approvals. That is 75 to 150 individual expiry dates to track.</p>

<p>Now add participant-level documents: consent forms (annual renewal), NDIS plans (variable expiry), and worker screening checks for every staff member and contractor who enters a dwelling. You are now tracking upwards of 200 dates across multiple systems.</p>

<p>Miss one, and you have a non-compliance finding. Miss several, and you have conditions on your registration. Miss too many, and you lose your registration entirely&mdash;which means zero revenue from every SDA property in your portfolio.</p>

<h2>Why calendar reminders are not enough</h2>

<p>The default solution for most providers is Google Calendar or Outlook reminders. Set a reminder 30 days before each expiry date. Simple enough, right?</p>

<p>In practice, calendar reminders fail for four specific reasons:</p>

<h3>No escalation path</h3>
<p>A calendar reminder fires once. If you are in a meeting, on a site visit, or simply overwhelmed that day, the reminder is dismissed and forgotten. There is no follow-up at 14 days. No escalation to a manager at 7 days. No &ldquo;critical&rdquo; alert on the day of expiry.</p>

<h3>No accountability trail</h3>
<p>When an NDIS auditor asks you to prove that your organisation has a system for monitoring document expiry, a calendar reminder is not evidence. There is no log showing that the alert was generated, who received it, whether it was acknowledged, and what action was taken. An auditor sees a gap in the paper trail.</p>

<h3>No dashboard visibility</h3>
<p>Calendar reminders are invisible to everyone except the person who set them. If that person is on leave, the reminder fires into the void. There is no organisation-wide view showing which documents are expiring soon, which are already expired, and which properties are at risk.</p>

<h3>No connection to the document itself</h3>
<p>A calendar reminder says &ldquo;Fire safety cert expires &mdash; 42 Smith Street.&rdquo; But it does not link to the actual certificate, the property record, or the renewal process. You still need to go to the shared drive, find the file, contact the fire safety assessor, schedule the inspection, and upload the new certificate. The reminder is just the first step in a multi-step process that is entirely manual.</p>

<h2>The compliance watchdog approach</h2>

<p>Automated expiry alerts in a purpose-built system work differently. Here is how the Compliance Watchdog feature in MySDAManager handles document expiry:</p>

<h3>Three-tier alert schedule</h3>
<p>Every document with an expiry date triggers alerts at three intervals:</p>
<ul>
<li><strong>90 days</strong> &mdash; Early warning. Plenty of time to schedule renewals, book assessments, and process applications. This alert appears on the dashboard as an informational item.</li>
<li><strong>60 days</strong> &mdash; Action required. The alert escalates to a warning. If no action has been taken since the 90-day alert, it is flagged for attention.</li>
<li><strong>30 days</strong> &mdash; Urgent. The alert becomes critical. A countdown badge appears on the relevant property and document records. Email notifications are sent to the responsible staff member.</li>
<li><strong>Expiry day</strong> &mdash; If the document expires without renewal, the system marks it as expired, generates a critical alert, and flags the property as non-compliant on the dashboard.</li>
</ul>

<h3>Audit trail for every alert</h3>
<p>Every alert generated by the system is logged with a timestamp, the document it relates to, the property and participant (if applicable), and the staff member who was notified. This log is part of the audit evidence pack&mdash;it proves your organisation has a proactive monitoring system, not just reactive fixes.</p>

<h3>Dashboard integration</h3>
<p>The compliance dashboard shows a real-time summary: how many documents are expiring within 30 days, how many are already expired, and which properties are affected. This view is available to every authorised user, not just the person who set a calendar reminder. If a staff member is on leave, their colleagues can see the same alerts.</p>

<h3>Direct links to action</h3>
<p>Each alert links directly to the document record, the property record, and the renewal workflow. One click takes you from &ldquo;this fire safety certificate expires in 28 days&rdquo; to the property detail page where you can see the current certificate, contact the assessor, and upload the renewed document&mdash;all in one system.</p>

<h2>Case study: what 200 tracked dates looks like in practice</h2>

<p>Consider a mid-sized SDA provider managing 20 properties with 30 participants. Their compliance obligations include:</p>

<ul>
<li>20 fire safety certificates (annual)</li>
<li>20 insurance policies (annual)</li>
<li>20 building compliance reports (biennial)</li>
<li>30 participant consent forms (annual)</li>
<li>30 NDIS plans (variable, typically 12&ndash;24 months)</li>
<li>15 staff screening checks (5 years, but staggered start dates)</li>
<li>Various contractor clearances</li>
</ul>

<p>That is approximately 150&ndash;200 individual dates. In a manual system, tracking these requires a dedicated spreadsheet, regular manual reviews (at least weekly), and reliance on individual diligence.</p>

<p>With automated alerts, every one of these dates is monitored continuously. The system does not take holidays. It does not get distracted. It does not forget to check the spreadsheet on a busy week. At 90 days, it generates the first alert. At 60, the second. At 30, the third. On expiry day, it marks the document as expired and flags the property.</p>

<h2>The registration protection calculation</h2>

<p>NDIS registration is the foundation of an SDA provider&rsquo;s business. Without it, you cannot receive SDA funding, which means zero revenue from every property in your portfolio. For a provider managing 20 properties with an average SDA payment of $2,000 per participant per month, that is $40,000 per month in revenue at risk.</p>

<p>Registration loss does not happen from a single expired fire certificate. It happens from a pattern of non-compliance&mdash;multiple findings across multiple audits that demonstrate a lack of systemic compliance management. Each expired document, each missing consent form, each delayed incident report adds to that pattern.</p>

<p>Automated expiry alerts do not just prevent individual lapses. They prevent the pattern from forming in the first place.</p>

<h2>Getting started</h2>

<p>If you are currently tracking document expiry dates in spreadsheets or calendars, the migration to automated alerts is straightforward. Upload your documents with their expiry dates, and the system starts monitoring immediately. Within minutes, you will see a dashboard showing exactly which documents need attention and when.</p>

<p>The goal is not to add another system to your stack. It is to replace the manual checking, the calendar reminders, and the spreadsheet reviews with a single automated process that runs continuously and generates evidence of compliance as a by-product of normal operations.</p>

<p>Your registration depends on it.</p>
`,
  },

  // ─── Post 5 ───────────────────────────────────────────────────────────
  {
    slug: "getting-started-mysda-15-minute-setup",
    title: "Getting Started with MySDAManager: A 15-Minute Setup Guide",
    description:
      "Step-by-step guide to setting up MySDAManager: create your account, add properties, onboard participants, and configure compliance alerts in under 15 minutes.",
    date: "2026-01-20",
    author: "MySDAManager Team",
    category: "product-updates",
    categoryLabel: "Product Updates",
    keywords: [
      "MySDAManager setup guide",
      "SDA software onboarding",
      "NDIS property management setup",
      "SDA compliance software tutorial",
      "getting started SDA management",
    ],
    readingTime: "5 min read",
    content: `
<p>Setting up a new software system usually means hours of configuration, data migration headaches, and a steep learning curve. We designed MySDAManager to get you from registration to a working compliance system in 15 minutes.</p>

<p>Here is the step-by-step process.</p>

<h2>Step 1: Create your account (2 minutes)</h2>

<p>Visit <strong>mysdamanager.com/register</strong> and enter your details:</p>

<ul>
<li>Your name and work email</li>
<li>A secure password (minimum 8 characters)</li>
<li>Your organisation name</li>
<li>Select your plan (Starter, Professional, or Enterprise)</li>
</ul>

<p>You will receive a confirmation email. Click the link and you are in. All plans include a 14-day free trial&mdash;no credit card required to start.</p>

<h2>Step 2: Set up your organisation (3 minutes)</h2>

<p>The onboarding wizard walks you through four setup steps. The first is your organisation profile:</p>

<ul>
<li><strong>Organisation name</strong> (pre-filled from registration)</li>
<li><strong>ABN</strong> &mdash; your Australian Business Number</li>
<li><strong>NDIS registration number</strong></li>
<li><strong>Contact details</strong> &mdash; phone, address, primary email</li>
<li><strong>Logo</strong> &mdash; upload your organisation logo (appears on reports, PDFs, and owner statements)</li>
</ul>

<p>This information flows through to every document the system generates&mdash;owner Folio Summaries, audit packs, MTA Schedules of Supports, and consent forms. Set it once, and it populates everywhere.</p>

<h2>Step 3: Add your first property and dwellings (3 minutes)</h2>

<p>The second step of the onboarding wizard is adding a property. Enter:</p>

<ul>
<li><strong>Property address</strong></li>
<li><strong>Property type</strong> (SDA or SIL)</li>
<li><strong>SDA design category</strong> (Improved Liveability, Fully Accessible, Robust, or High Physical Support)</li>
<li><strong>Owner details</strong> (if investor-owned: name, contact, bank details for payment remittance)</li>
</ul>

<p>Then add the individual dwellings within the property. A dwelling might be a self-contained apartment, a bedroom in a shared house, or a standalone unit. Each dwelling gets its own record with:</p>

<ul>
<li>Dwelling number or identifier</li>
<li>SDA category (can differ per dwelling in mixed-category properties)</li>
<li>Occupancy status</li>
</ul>

<p>You can add more properties after onboarding. The wizard just gets you started with one to see how the system works.</p>

<h2>Step 4: Add your first participant (3 minutes)</h2>

<p>The third step is adding a participant. You have two options:</p>

<p><strong>Option A: Full profile.</strong> Enter all details now: name, date of birth, NDIS number, SDA category, dwelling placement, emergency contacts, support coordinator, and NDIS plan dates. This gives you a complete record from day one.</p>

<p><strong>Option B: Save incomplete.</strong> If you do not have all the NDIS details yet (common for participants still in the onboarding pipeline), you can save a profile with just a first and last name. The system marks it as &ldquo;Incomplete&rdquo; and creates an alert reminding you to complete the profile. No data is lost, and the participant appears in your list ready for completion.</p>

<p>For the full profile option, you will also be prompted to record participant consent. The system generates an APP 3-compliant consent form (including an Easy Read version) that you can download, sign, and upload back into the Evidence Vault.</p>

<h2>Step 5: Upload key documents to the Evidence Vault (2 minutes)</h2>

<p>The Evidence Vault is where all compliance documents live. Start by uploading the essentials for your first property:</p>

<ul>
<li><strong>Fire safety certificate</strong> (FP1500 or state equivalent)</li>
<li><strong>Insurance certificate of currency</strong></li>
<li><strong>SDA registration confirmation</strong></li>
<li><strong>Building compliance reports</strong></li>
</ul>

<p>For each document, set the <strong>expiry date</strong>. This is what drives the Compliance Watchdog alerts. The system starts monitoring from the moment you save the document.</p>

<p>You can also upload participant-level documents: signed consent forms, NDIS plans, and assessment reports. Each document is linked to the relevant property or participant record automatically.</p>

<h2>Step 6: Configure your Compliance Watchdog alerts (1 minute)</h2>

<p>The Compliance Watchdog runs automatically once your documents have expiry dates. No configuration needed for the default behaviour&mdash;you will receive alerts at 90, 60, and 30 days before any document expires.</p>

<p>If you want to customise alert behaviour, visit <strong>Settings &gt; Notifications</strong> to configure:</p>

<ul>
<li>Which alert categories to enable (document expiry, plan renewal, consent expiry, vacancy alerts)</li>
<li>Email notification preferences</li>
<li>Push notification settings (for the mobile app)</li>
</ul>

<h2>Step 7: Invite your team (1 minute)</h2>

<p>The fourth step of the onboarding wizard is inviting team members. Enter their email addresses and assign roles:</p>

<ul>
<li><strong>Admin</strong> &mdash; full access to all features including user management and settings</li>
<li><strong>Property Manager</strong> &mdash; access to properties, participants, maintenance, and compliance</li>
<li><strong>Staff</strong> &mdash; access to view properties and participants, submit incidents and maintenance requests</li>
</ul>

<p>Team members receive an invitation email with a link to set their password and log in.</p>

<h2>Tips for migrating from spreadsheets</h2>

<p>If you are moving from an existing spreadsheet-based system, here are some practical tips:</p>

<h3>Prioritise active properties first</h3>
<p>Do not try to migrate everything at once. Start with your currently occupied properties and their participants. You can backfill historical data later.</p>

<h3>Upload documents as you go</h3>
<p>You do not need to upload every document on day one. Start with the documents that expire soonest&mdash;fire safety certificates, insurance, and any consent forms due for renewal. The Compliance Watchdog will start generating alerts immediately.</p>

<h3>Use &ldquo;Save Incomplete&rdquo; for pipeline participants</h3>
<p>If you have participants in the onboarding pipeline who do not yet have complete NDIS details, use the Save Incomplete feature to create their profiles now. You will get a reminder to complete them, and the participant is already in the system for when their NDIS plan comes through.</p>

<h3>Set up Xero integration early</h3>
<p>If you use Xero for accounting, connect it from <strong>Settings &gt; Integrations</strong>. Once connected, SDA payments sync automatically, eliminating the manual data entry that consumes hours each month.</p>

<h2>What happens after setup</h2>

<p>Once you have completed the onboarding wizard, your dashboard shows:</p>

<ul>
<li><strong>Property portfolio overview</strong> &mdash; total properties, occupied dwellings, vacancies</li>
<li><strong>Compliance status</strong> &mdash; documents expiring soon, overdue items, consent status</li>
<li><strong>Tasks and follow-ups</strong> &mdash; pending actions, overdue tasks, upcoming deadlines</li>
<li><strong>Recent activity</strong> &mdash; latest incidents, maintenance requests, and communications</li>
</ul>

<p>From here, everything you need to manage your SDA portfolio is accessible from the navigation bar: Properties, Participants, Maintenance, Incidents, Documents, Payments, and Compliance.</p>

<p>15 minutes. One platform. Audit-ready from day one.</p>
`,
  },

  // ─── Post 6 ───────────────────────────────────────────────────────────
  {
    slug: "understanding-sda-payment-calculations",
    title:
      "Understanding SDA Payment Calculations: Funding + RRC + Provider Fees",
    description:
      "A complete guide to SDA revenue structure: how SDA Funding, Reasonable Rent Contribution, and Provider Fees combine to determine per-participant revenue.",
    date: "2026-01-15",
    author: "MySDAManager Team",
    category: "sda-market",
    categoryLabel: "SDA Market Insights",
    keywords: [
      "SDA payment calculation",
      "NDIS SDA funding",
      "reasonable rent contribution",
      "SDA provider fees",
      "SDA revenue calculator",
    ],
    readingTime: "7 min read",
    content: `
<p>SDA payment calculations are one of the most misunderstood aspects of running an SDA business. The revenue structure has three distinct components, each with its own source, calculation method, and payment timing. Getting these calculations wrong does not just affect your bottom line&mdash;it can lead to over-claiming (a compliance risk), under-claiming (lost revenue), or incorrect owner remittances (a contractual risk).</p>

<p>This guide breaks down each component so you understand exactly where the money comes from and how to calculate it correctly.</p>

<h2>Component 1: SDA Funding</h2>

<p>SDA Funding is the primary revenue source. It is the payment made by the NDIS to the SDA provider for housing a participant in an SDA-enrolled dwelling.</p>

<h3>How it is determined</h3>
<p>SDA Funding rates are set by the NDIA and published in the SDA Pricing Arrangements and Price Limits. The amount depends on four factors:</p>

<ol>
<li><strong>SDA design category</strong> &mdash; High Physical Support commands the highest rate, followed by Robust, Fully Accessible, and Improved Liveability</li>
<li><strong>Building type</strong> &mdash; apartment, villa/townhouse, house, or group home</li>
<li><strong>Location</strong> &mdash; metro, regional, or remote (location loading applies)</li>
<li><strong>Number of residents</strong> &mdash; single-occupancy dwellings attract a higher per-participant rate than shared dwellings</li>
</ol>

<h3>Example calculation</h3>
<p>A participant living in a single-occupancy High Physical Support apartment in metropolitan Sydney might attract an annual SDA Funding amount of approximately $55,000&ndash;$65,000, depending on the specific pricing period. Divided by 12, that is roughly $4,500&ndash;$5,400 per month.</p>

<h3>When it is paid</h3>
<p>SDA Funding is claimed monthly through the NDIS payment system. The participant&rsquo;s NDIS plan must include SDA funding for the claim to be valid. If the plan expires or the SDA line item is removed, the funding stops until a new plan is approved.</p>

<h3>Common errors</h3>
<ul>
<li>Claiming against an <strong>expired NDIS plan</strong> (the plan end date passed without renewal)</li>
<li>Using the wrong <strong>SDA category rate</strong> (e.g., claiming Fully Accessible rates for an Improved Liveability dwelling)</li>
<li>Not applying the correct <strong>occupancy ratio</strong> for shared dwellings</li>
</ul>

<h2>Component 2: Reasonable Rent Contribution (RRC)</h2>

<p>The Reasonable Rent Contribution is the amount the participant themselves contributes towards their housing costs. It is not NDIS funding&mdash;it comes directly from the participant&rsquo;s income.</p>

<h3>How it is calculated</h3>
<p>The RRC has two sub-components:</p>

<ul>
<li><strong>25% of the Disability Support Pension (DSP)</strong> &mdash; the DSP rate is set by Services Australia and adjusted in March and September each year. As of 2026, the single-person DSP is approximately $1,116 per fortnight ($2,418/month). 25% of that is approximately $604/month.</li>
<li><strong>100% of Commonwealth Rent Assistance (CRA)</strong> &mdash; CRA is an additional payment from Services Australia to help with rental costs. The amount depends on the participant&rsquo;s rent and circumstances. A single person paying more than a threshold amount in rent might receive approximately $190&ndash;$210 per fortnight ($411&ndash;$455/month).</li>
</ul>

<h3>Example calculation</h3>
<table>
<thead>
<tr><th>RRC component</th><th>Fortnightly</th><th>Monthly (approx.)</th></tr>
</thead>
<tbody>
<tr><td>25% of DSP ($1,116 &times; 0.25)</td><td>$279.00</td><td>$604.50</td></tr>
<tr><td>100% of CRA</td><td>$195.00</td><td>$422.50</td></tr>
<tr><td><strong>Total RRC</strong></td><td><strong>$474.00</strong></td><td><strong>$1,027.00</strong></td></tr>
</tbody>
</table>

<h3>When it is paid</h3>
<p>RRC is typically collected monthly from the participant (or their nominee/financial administrator). It is not an NDIS claim&mdash;it is a direct rent payment. The collection method and timing should be documented in the participant&rsquo;s tenancy agreement.</p>

<h3>Common errors</h3>
<ul>
<li>Not updating the RRC when <strong>DSP or CRA rates change</strong> (twice yearly)</li>
<li>Collecting more than the allowable amount (over-charging is a compliance risk)</li>
<li>Not adjusting for participants who receive <strong>partial DSP</strong> or <strong>no CRA</strong></li>
<li>Failing to account for <strong>periods of hospitalisation</strong> where the participant may still be liable for RRC</li>
</ul>

<h2>Component 3: SDA Provider Fee</h2>

<p>The Provider Fee is the management fee charged by the SDA provider for managing the property on behalf of the owner. This applies when the property is investor-owned (not self-owned by the provider).</p>

<h3>How it is calculated</h3>
<p>The Provider Fee is typically a percentage of total revenue (SDA Funding + RRC). The exact percentage varies by provider and is set in the management agreement with the property owner. Common ranges are 10&ndash;20% of gross revenue.</p>

<h3>Example calculation</h3>
<table>
<thead>
<tr><th>Revenue line</th><th>Monthly amount</th></tr>
</thead>
<tbody>
<tr><td>SDA Funding</td><td>$4,800.00</td></tr>
<tr><td>RRC</td><td>$1,027.00</td></tr>
<tr><td><strong>Gross revenue</strong></td><td><strong>$5,827.00</strong></td></tr>
<tr><td>Less: Provider Fee (15%)</td><td>-$874.05</td></tr>
<tr><td><strong>Net to owner</strong></td><td><strong>$4,952.95</strong></td></tr>
</tbody>
</table>

<h3>Common errors</h3>
<ul>
<li>Calculating the fee on <strong>SDA Funding only</strong> when the agreement specifies gross revenue (including RRC)</li>
<li>Applying the wrong <strong>percentage rate</strong> (different owners may have different agreements)</li>
<li>Not deducting <strong>maintenance costs</strong> if the agreement specifies net-of-maintenance remittance</li>
</ul>

<h2>Putting it all together: total revenue per participant</h2>

<p>Here is a complete worked example for a single participant in a High Physical Support single-occupancy apartment:</p>

<table>
<thead>
<tr><th>Component</th><th>Source</th><th>Monthly</th><th>Annual</th></tr>
</thead>
<tbody>
<tr><td>SDA Funding</td><td>NDIS</td><td>$4,800</td><td>$57,600</td></tr>
<tr><td>RRC (25% DSP)</td><td>Participant</td><td>$605</td><td>$7,260</td></tr>
<tr><td>RRC (100% CRA)</td><td>Participant (via Services Aust.)</td><td>$423</td><td>$5,076</td></tr>
<tr><td><strong>Gross revenue</strong></td><td></td><td><strong>$5,828</strong></td><td><strong>$69,936</strong></td></tr>
<tr><td>Less: Provider Fee (15%)</td><td></td><td>-$874</td><td>-$10,490</td></tr>
<tr><td><strong>Provider retained</strong></td><td></td><td><strong>$874</strong></td><td><strong>$10,490</strong></td></tr>
<tr><td><strong>Net to owner</strong></td><td></td><td><strong>$4,954</strong></td><td><strong>$59,446</strong></td></tr>
</tbody>
</table>

<h2>Why manual calculations are a risk</h2>

<p>The risk with manual calculations is not just arithmetic errors (although those are common enough). It is the compounding effect of multiple variables changing at different times:</p>

<ul>
<li>DSP and CRA rates change in <strong>March and September</strong></li>
<li>SDA Funding rates are updated <strong>annually</strong> (sometimes mid-year)</li>
<li>Participant plans expire and renew on <strong>individual schedules</strong></li>
<li>Provider Fee percentages may vary <strong>by property owner</strong></li>
<li>Occupancy changes when participants <strong>move in or out</strong></li>
</ul>

<p>When these variables are tracked in separate spreadsheets, the probability of a mismatch between what you are claiming, what you are collecting, and what you are remitting to owners increases with every change.</p>

<h2>How MySDAManager automates this</h2>

<p>MySDAManager calculates SDA payments automatically based on the data already in the system:</p>

<ul>
<li><strong>SDA Funding</strong> is calculated from the participant&rsquo;s plan, the dwelling&rsquo;s SDA category, and the current pricing period</li>
<li><strong>RRC</strong> is calculated from the current DSP and CRA rates, updated when rates change</li>
<li><strong>Provider Fee</strong> is calculated from the percentage set in the owner&rsquo;s management agreement</li>
<li><strong>Variance detection</strong> flags any payment that differs from the expected amount by more than $500</li>
<li><strong>Xero sync</strong> pushes the calculated amounts directly to your accounting software</li>
<li><strong>Owner Folio Summaries</strong> are generated with one click, showing per-participant revenue breakdowns</li>
</ul>

<p>The system does not replace your financial judgement. It ensures the arithmetic is correct, the rates are current, and the calculations are auditable.</p>

<h2>Key takeaways</h2>

<ol>
<li><strong>SDA revenue has three components</strong>: SDA Funding (NDIS), RRC (participant), and Provider Fee (retained by manager)</li>
<li><strong>Rates change multiple times per year</strong>: DSP/CRA in March and September, SDA Funding annually</li>
<li><strong>Manual calculations compound errors</strong>: Multiple variables changing on different schedules create drift</li>
<li><strong>Over-claiming is a compliance risk</strong>: NDIS can claw back incorrect claims and investigate systemic over-charging</li>
<li><strong>Under-claiming is lost revenue</strong>: Many providers leave money on the table by using outdated rates or missing CRA entitlements</li>
</ol>

<p>Whether you automate these calculations or continue doing them manually, the important thing is to understand the structure. Every dollar of SDA revenue traces back to one of these three sources, and getting the calculation right protects both your compliance standing and your bottom line.</p>
`,
  },
];

/**
 * Look up a single blog post by its URL slug.
 */
export function getPostBySlug(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}

/**
 * Return posts filtered by category. Pass "all" for unfiltered.
 */
export function getPostsByCategory(category: string): BlogPost[] {
  if (category === "all") return BLOG_POSTS;
  return BLOG_POSTS.filter((p) => p.category === category);
}

/**
 * Return related posts (same category, excluding the current post).
 * Returns up to `limit` posts.
 */
export function getRelatedPosts(
  currentSlug: string,
  limit: number = 3
): BlogPost[] {
  const current = getPostBySlug(currentSlug);
  if (!current) return BLOG_POSTS.slice(0, limit);
  return BLOG_POSTS.filter(
    (p) => p.category === current.category && p.slug !== currentSlug
  ).slice(0, limit);
}

/**
 * Format a date string (YYYY-MM-DD) to Australian display format (DD Month YYYY).
 */
export function formatBlogDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
