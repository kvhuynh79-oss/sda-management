import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Compare — MySDAManager vs Spreadsheets & Generic NDIS Tools",
  description:
    "See how MySDAManager compares to spreadsheets, ShiftCare, Brevity, and CTARS. Purpose-built SDA property management vs generic workarounds.",
  keywords: [
    "SDA software comparison",
    "MySDAManager vs ShiftCare",
    "NDIS software comparison",
    "SDA management vs spreadsheets",
  ],
};

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

interface ComparisonRow {
  need: string;
  spreadsheet: string;
  mysda: string;
}

const COMPARISON_ROWS: ComparisonRow[] = [
  {
    need: "Property & dwelling tracking",
    spreadsheet: "Manual Excel with no alerts",
    mysda: "Built-in with SDA categories, occupancy, owner details",
  },
  {
    need: "Participant placement",
    spreadsheet: "Copy-paste between spreadsheets",
    mysda: "Linked to dwellings, consent workflow, plan tracking",
  },
  {
    need: "SDA payment calculations",
    spreadsheet: "Formulas that break when someone edits the wrong cell",
    mysda: "Auto-calculated: SDA Funding + RRC + Provider Fee",
  },
  {
    need: "Compliance document tracking",
    spreadsheet: "Shared Google Drive with no expiry alerts",
    mysda: "Evidence Vault with expiry alerts + audit indexing",
  },
  {
    need: "Fire safety cert expiry",
    spreadsheet: "Calendar reminders (if someone remembers to set them)",
    mysda: "Compliance Watchdog: 90/60/30-day automated alerts",
  },
  {
    need: "Incident reporting",
    spreadsheet: "Word doc template emailed around",
    mysda: "Offline-capable forms, 24hr NDIS chain of custody",
  },
  {
    need: "Owner/landlord reporting",
    spreadsheet: "Manual PDF cobbled together each month",
    mysda: "One-click Folio Summary generation",
  },
  {
    need: "Audit pack preparation",
    spreadsheet: "2+ weeks of manual assembly from 4 different sources",
    mysda: "7-section PDF generated in minutes",
  },
  {
    need: "Contractor quotes",
    spreadsheet: "Email chains with no tracking",
    mysda: "Quote request workflow with public response link",
  },
  {
    need: "Xero invoicing",
    spreadsheet: "Manual data entry every month",
    mysda: "One-click sync",
  },
];

interface CompetitorCard {
  name: string;
  tagline: string;
  whatTheyDo: string[];
  missing: string[];
}

const COMPETITORS: CompetitorCard[] = [
  {
    name: "vs ShiftCare",
    tagline: "ShiftCare manages your roster. We manage your compliance.",
    whatTheyDo: [
      "Staff scheduling",
      "Timesheets",
      "Client management",
    ],
    missing: [
      "Property management",
      "Dwelling tracking",
      "Owner reporting",
      "SDA payment calculations",
      "Compliance document tracking",
      "Audit pack generation",
    ],
  },
  {
    name: "vs Brevity",
    tagline: "Brevity bills your services. We protect your registration.",
    whatTheyDo: [
      "NDIS billing",
      "Service delivery",
      "Client records",
    ],
    missing: [
      "Property management",
      "Fire safety tracking",
      "Inspection checklists",
      "Contractor workflows",
    ],
  },
  {
    name: "vs CTARS",
    tagline:
      "CTARS tracks clients. We track properties, clients, AND evidence.",
    whatTheyDo: [
      "Client management",
      "Accommodation ($66/client)",
      "Incident management",
    ],
    missing: [
      "SDA-specific property management",
      "Dwelling occupancy",
      "Owner reporting",
      "Automated compliance alerts",
    ],
  },
];

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className || "h-5 w-5"}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function XCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className || "h-5 w-5"}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className || "h-5 w-5"}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ComparePage() {
  return (
    <>
      {/* --------------------------------------------------------------- */}
      {/* Hero                                                             */}
      {/* --------------------------------------------------------------- */}
      <section className="pt-20 pb-16 text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-6">
            Stop juggling workarounds
          </h1>
          <p className="text-lg sm:text-xl text-gray-400 max-w-3xl mx-auto">
            Every SDA provider we&apos;ve spoken to uses 3-5 separate systems.
            Here&apos;s how MySDAManager replaces them all.
          </p>
        </div>
      </section>

      {/* --------------------------------------------------------------- */}
      {/* MySDAManager vs Spreadsheets - Desktop Table                     */}
      {/* --------------------------------------------------------------- */}
      <section className="pb-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-white text-center mb-10">
            MySDAManager vs Spreadsheets
          </h2>

          {/* Desktop: table layout */}
          <div className="hidden md:block bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
            {/* Header row */}
            <div className="grid grid-cols-3 gap-0">
              <div className="px-6 py-4 bg-gray-800/90 border-b border-gray-700">
                <span className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
                  What you need
                </span>
              </div>
              <div className="px-6 py-4 bg-red-950/30 border-b border-gray-700 border-l border-l-red-900/40">
                <span className="text-sm font-semibold text-red-400 uppercase tracking-wide">
                  The spreadsheet workaround
                </span>
              </div>
              <div className="px-6 py-4 bg-teal-950/30 border-b border-gray-700 border-l border-l-teal-900/40">
                <span className="text-sm font-semibold text-teal-400 uppercase tracking-wide">
                  MySDAManager
                </span>
              </div>
            </div>

            {/* Data rows */}
            {COMPARISON_ROWS.map((row, index) => (
              <div
                key={row.need}
                className={`grid grid-cols-3 gap-0 ${
                  index % 2 === 0 ? "bg-gray-800/40" : "bg-gray-800/70"
                } ${
                  index < COMPARISON_ROWS.length - 1
                    ? "border-b border-gray-700/50"
                    : ""
                }`}
              >
                <div className="px-6 py-4">
                  <span className="text-sm font-medium text-white">
                    {row.need}
                  </span>
                </div>
                <div className="px-6 py-4 border-l-2 border-l-red-800/50 bg-red-950/10">
                  <span className="text-sm text-gray-400">{row.spreadsheet}</span>
                </div>
                <div className="px-6 py-4 border-l-2 border-l-teal-700/50 bg-teal-950/10">
                  <span className="text-sm text-gray-300">{row.mysda}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Mobile: stacked cards */}
          <div className="md:hidden space-y-4">
            {COMPARISON_ROWS.map((row) => (
              <div
                key={row.need}
                className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden"
              >
                <div className="px-4 py-3 bg-gray-800/90 border-b border-gray-700">
                  <span className="text-sm font-semibold text-white">
                    {row.need}
                  </span>
                </div>
                <div className="px-4 py-3 border-l-4 border-l-red-700 bg-red-950/10">
                  <span className="block text-xs font-semibold text-red-400 uppercase tracking-wide mb-1">
                    Spreadsheet
                  </span>
                  <span className="text-sm text-gray-400">
                    {row.spreadsheet}
                  </span>
                </div>
                <div className="px-4 py-3 border-l-4 border-l-teal-600 bg-teal-950/10 border-t border-gray-700/50">
                  <span className="block text-xs font-semibold text-teal-400 uppercase tracking-wide mb-1">
                    MySDAManager
                  </span>
                  <span className="text-sm text-gray-300">{row.mysda}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------- */}
      {/* MySDAManager vs Generic NDIS Software                            */}
      {/* --------------------------------------------------------------- */}
      <section className="pb-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-white text-center mb-4">
            Why generic NDIS tools don&apos;t work for SDA
          </h2>
          <p className="text-gray-400 text-center mb-10 max-w-2xl mx-auto">
            Rostering and billing platforms were not designed for property
            management. Here is what they are missing.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {COMPETITORS.map((comp) => (
              <div
                key={comp.name}
                className="bg-gray-800 rounded-xl border border-gray-700 p-6 flex flex-col"
              >
                <h3 className="text-lg font-bold text-white mb-2">
                  {comp.name}
                </h3>
                <p className="text-sm text-teal-400 font-medium mb-5 italic">
                  &ldquo;{comp.tagline}&rdquo;
                </p>

                {/* What they do */}
                <div className="mb-4">
                  <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                    What they do
                  </span>
                  <ul className="space-y-1.5">
                    {comp.whatTheyDo.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <CheckIcon className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-300">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* What they are missing */}
                <div className="mb-5 flex-grow">
                  <span className="block text-xs font-semibold text-red-400 uppercase tracking-wide mb-2">
                    Missing for SDA
                  </span>
                  <ul className="space-y-1.5">
                    {comp.missing.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <XCircleIcon className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-400">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* MySDAManager line */}
                <div className="pt-4 border-t border-gray-700">
                  <div className="flex items-start gap-2">
                    <CheckIcon className="h-4 w-4 text-teal-400 shrink-0 mt-0.5" />
                    <span className="text-sm text-teal-400 font-medium">
                      MySDAManager: All of the above, purpose-built for SDA
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------- */}
      {/* ROI Calculator                                                   */}
      {/* --------------------------------------------------------------- */}
      <section className="pb-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-white text-center mb-10">
            The real cost of workarounds
          </h2>

          <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
            {/* Manual cost */}
            <div className="px-6 py-5 border-b border-gray-700">
              <span className="block text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">
                Manual compliance management
              </span>
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="text-gray-300 text-sm">4 hours/week</span>
                <span className="text-gray-400" aria-hidden="true">
                  x
                </span>
                <span className="text-gray-300 text-sm">$75/hour</span>
                <span className="text-gray-400" aria-hidden="true">
                  x
                </span>
                <span className="text-gray-300 text-sm">52 weeks</span>
                <span className="text-gray-400" aria-hidden="true">
                  =
                </span>
                <span className="text-xl font-bold text-red-400">
                  $15,600/year
                </span>
              </div>
            </div>

            {/* MySDAManager cost */}
            <div className="px-6 py-5 border-b border-gray-700">
              <span className="block text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">
                MySDAManager Professional
              </span>
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="text-gray-300 text-sm">$899/month</span>
                <span className="text-gray-400" aria-hidden="true">
                  x
                </span>
                <span className="text-gray-300 text-sm">12 months</span>
                <span className="text-gray-400" aria-hidden="true">
                  =
                </span>
                <span className="text-xl font-bold text-teal-400">
                  $10,788/year
                </span>
              </div>
            </div>

            {/* Savings */}
            <div className="px-6 py-8 bg-teal-950/20 text-center">
              <span className="block text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Your annual savings
              </span>
              <span className="block text-5xl sm:text-6xl font-bold text-teal-400">
                $4,812
              </span>
              <span className="block text-sm text-gray-400 mt-2">per year</span>
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------- */}
      {/* CTA                                                              */}
      {/* --------------------------------------------------------------- */}
      <section className="pb-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-gradient-to-br from-teal-900/30 to-gray-800 rounded-xl border border-teal-600/30 p-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
              Ready to replace the workaround?
            </h2>
            <p className="text-gray-400 mb-6">
              14 days free, no credit card required.
            </p>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-500 text-white font-semibold px-8 py-3 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
            >
              Start Free Trial
              <ArrowRightIcon className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
