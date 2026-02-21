import type { Metadata } from "next";
import Link from "next/link";
import TrackFeaturePageView from "@/components/analytics/TrackFeaturePageView";

export const metadata: Metadata = {
  title: "Features — SDA Management Software",
  description:
    "Evidence Vault, Compliance Watchdog, Xero invoicing, NDIS audit pack generator, and 30+ features purpose-built for Australian SDA providers.",
  openGraph: {
    title: "Features — MySDAManager",
    description:
      "Everything you need to manage SDA properties and stay audit-ready.",
  },
  keywords: [
    "SDA management software features",
    "NDIS compliance software",
    "SDA property management features",
  ],
};

/* -------------------------------------------------------------------------- */
/* Inline SVG icon components                                                  */
/* -------------------------------------------------------------------------- */

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className || "h-8 w-8"}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
      />
    </svg>
  );
}

function BellIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className || "h-8 w-8"}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
      />
    </svg>
  );
}

function ReceiptIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className || "h-8 w-8"}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
      />
    </svg>
  );
}

function BuildingIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className || "h-6 w-6"}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 21h19.5M3.75 3v18m4.5-18v18m4.5-18v18m4.5-18v18M5.25 6h.008v.008H5.25V6zm0 3h.008v.008H5.25V9zm0 3h.008v.008H5.25V12zm4.5-6h.008v.008H9.75V6zm0 3h.008v.008H9.75V9zm0 3h.008v.008H9.75V12zm4.5-6h.008v.008h-.008V6zm0 3h.008v.008h-.008V9zm0 3h.008v.008h-.008V12z"
      />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className || "h-6 w-6"}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
      />
    </svg>
  );
}

function WrenchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className || "h-6 w-6"}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11.42 15.17l-5.384 5.383a1.5 1.5 0 01-2.12-2.122l5.383-5.383m0 0l-1.414-1.414a1.5 1.5 0 010-2.122l4.243-4.243a6 6 0 018.485 8.485l-4.243 4.243a1.5 1.5 0 01-2.122 0l-1.414-1.414z"
      />
    </svg>
  );
}

function ClipboardCheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className || "h-6 w-6"}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11.35 3.836c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 011.65 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m8.9-4.414c.376.023.75.05 1.124.08 1.131.094 1.976 1.057 1.976 2.192V16.5A2.25 2.25 0 0118 18.75h-2.25m-7.5-10.5H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V18.75m-7.5-10.5h6.375c.621 0 1.125.504 1.125 1.125v9.375m-8.25-3l1.5 1.5 3-3.75"
      />
    </svg>
  );
}

function ExclamationTriangleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className || "h-6 w-6"}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
      />
    </svg>
  );
}

function ChatBubbleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className || "h-6 w-6"}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155"
      />
    </svg>
  );
}

function HandRaisedIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className || "h-6 w-6"}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.05 4.575a1.575 1.575 0 10-3.15 0v3.15M10.05 4.575a1.575 1.575 0 013.15 0v3.15M10.05 4.575v3.15M3.75 12h16.5M3.75 12a2.25 2.25 0 01-2.25-2.25V7.5M3.75 12a2.25 2.25 0 002.25 2.25h12a2.25 2.25 0 002.25-2.25M3.75 12V7.5m16.5 4.5V7.5m0 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 7.5m0 0V5.625c0-.621.504-1.125 1.125-1.125h1.5c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125h-1.5A1.125 1.125 0 013 7.5"
      />
    </svg>
  );
}

function CurrencyDollarIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className || "h-6 w-6"}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function IdentificationIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className || "h-6 w-6"}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z"
      />
    </svg>
  );
}

function EnvelopeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className || "h-6 w-6"}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
      />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className || "h-6 w-6"}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
      />
    </svg>
  );
}

function ChartBarIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className || "h-6 w-6"}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
      />
    </svg>
  );
}

function LockClosedIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className || "h-5 w-5"}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
      />
    </svg>
  );
}

function KeyIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className || "h-5 w-5"}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z"
      />
    </svg>
  );
}

function DocumentCheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className || "h-5 w-5"}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.125 2.25h-4.5c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9zm2.25 9.75l2.25 2.25m0 0l2.25 2.25m-2.25-2.25l2.25-2.25m-2.25 2.25l-2.25 2.25"
      />
    </svg>
  );
}

function FingerPrintIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className || "h-5 w-5"}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7.864 4.243A7.5 7.5 0 0119.5 10.5c0 2.92-.556 5.709-1.568 8.268M5.742 6.364A7.465 7.465 0 004.5 10.5a48.667 48.667 0 00-1.395 8.972m-1.583-4.306A47.74 47.74 0 003.75 14.5m0 0a6 6 0 019.168-5.088A6 6 0 0112 14.5m-8.25 0a48.167 48.167 0 00-.86 4.677M12 14.5A6.042 6.042 0 0114.5 12c1.38 0 2.634.462 3.643 1.242m-3.643-1.242a48.038 48.038 0 013.818 7.794"
      />
    </svg>
  );
}

function WifiIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className || "h-5 w-5"}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z"
      />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Data                                                                        */
/* -------------------------------------------------------------------------- */

const PILLARS = [
  {
    icon: <ShieldIcon className="h-8 w-8 text-teal-400" />,
    title: "Evidence Vault",
    description:
      "Store, track, and retrieve every compliance document your auditor will ever ask for.",
    bullets: [
      "Document storage with automatic expiry tracking",
      "Version-controlled consent forms, certifications, and compliance docs",
      "AES-256 encrypted, audit-indexed for instant retrieval",
      "One-click 7-section NDIS audit pack generation",
    ],
  },
  {
    icon: <BellIcon className="h-8 w-8 text-teal-400" />,
    title: "Compliance Watchdog",
    description:
      "Never miss a renewal or expiry again. Automated alerts keep you ahead of every deadline.",
    bullets: [
      "Automated alerts at 90, 60, and 30 days before any document expires",
      "Fire safety certificate tracking with FP1500 compliance",
      "Participant plan renewal reminders",
      "Real-time compliance dashboard across all properties",
    ],
  },
  {
    icon: <ReceiptIcon className="h-8 w-8 text-teal-400" />,
    title: "Xero Automated Invoicing",
    description:
      "Eliminate manual payment tracking. SDA revenue flows straight into your accounting.",
    bullets: [
      "SDA payments, RRC contributions, and provider fees synced to Xero",
      "Auto-calculated payment breakdowns per participant",
      "NDIS claim export files (PACE format)",
      "Monthly owner folio summary generation",
    ],
  },
];

const FEATURES = [
  {
    icon: <BuildingIcon className="h-6 w-6 text-teal-400" />,
    title: "Property Management",
    description:
      "Track SDA properties with dwellings, SDA categories, and occupancy status",
  },
  {
    icon: <UsersIcon className="h-6 w-6 text-teal-400" />,
    title: "Participant Tracking",
    description:
      "NDIS participant profiles, plans, funding levels, consent workflow",
  },
  {
    icon: <WrenchIcon className="h-6 w-6 text-teal-400" />,
    title: "Maintenance",
    description:
      "Reactive and preventative maintenance with photo evidence and contractor quotes",
  },
  {
    icon: <ClipboardCheckIcon className="h-6 w-6 text-teal-400" />,
    title: "Inspections",
    description:
      "Mobile-optimised checklists with photo capture and PDF report generation",
  },
  {
    icon: <ExclamationTriangleIcon className="h-6 w-6 text-teal-400" />,
    title: "Incidents",
    description:
      "NDIS-compliant incident reporting with 24-hour notification chain of custody",
  },
  {
    icon: <ChatBubbleIcon className="h-6 w-6 text-teal-400" />,
    title: "Complaints",
    description:
      "BLS-SOP-001 procedure with 24-hour acknowledgment countdown",
  },
  {
    icon: <HandRaisedIcon className="h-6 w-6 text-teal-400" />,
    title: "Consent Workflow",
    description:
      "APP 3 compliant lifecycle with Easy Read PDF generation",
  },
  {
    icon: <CurrencyDollarIcon className="h-6 w-6 text-teal-400" />,
    title: "Payment Tracking",
    description:
      "SDA funding, RRC, provider fees with variance detection",
  },
  {
    icon: <IdentificationIcon className="h-6 w-6 text-teal-400" />,
    title: "Staff Files",
    description:
      "Employee records with NDIS Worker Screening Check compliance",
  },
  {
    icon: <EnvelopeIcon className="h-6 w-6 text-teal-400" />,
    title: "Communications Hub",
    description:
      "Multi-view message tracking with threading and compliance flags",
  },
  {
    icon: <CalendarIcon className="h-6 w-6 text-teal-400" />,
    title: "Calendar",
    description:
      "Internal events plus Google Calendar and Outlook sync",
  },
  {
    icon: <ChartBarIcon className="h-6 w-6 text-teal-400" />,
    title: "Reports",
    description:
      "Compliance, financial, and contractor reports with PDF export",
  },
];

const SECURITY_BADGES = [
  { icon: <LockClosedIcon className="h-5 w-5 text-teal-400" />, label: "AES-256 Encryption" },
  { icon: <KeyIcon className="h-5 w-5 text-teal-400" />, label: "MFA Authentication" },
  { icon: <DocumentCheckIcon className="h-5 w-5 text-teal-400" />, label: "Immutable Audit Trail" },
  { icon: <FingerPrintIcon className="h-5 w-5 text-teal-400" />, label: "RBAC Access Control" },
  { icon: <WifiIcon className="h-5 w-5 text-teal-400" />, label: "Offline Capability" },
];

const INTEGRATIONS = [
  "Xero",
  "Google Calendar",
  "Outlook Calendar",
  "Postmark Email",
  "REST API",
];

/* -------------------------------------------------------------------------- */
/* Page                                                                        */
/* -------------------------------------------------------------------------- */

export default function FeaturesPage() {
  return (
    <div>
      <TrackFeaturePageView />
      {/* ------------------------------------------------------------------ */}
      {/* Hero                                                                */}
      {/* ------------------------------------------------------------------ */}
      <section className="pt-20 pb-16 sm:pt-28 sm:pb-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">
            Everything you need to manage SDA properties
          </h1>
          <p className="mt-6 text-lg text-gray-400 max-w-2xl mx-auto">
            30+ features purpose-built for SDA providers. Not a generic NDIS
            tool with property management bolted on.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="inline-flex items-center px-6 py-3 text-base font-semibold text-white bg-teal-600 hover:bg-teal-500 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
            >
              Start 14-Day Free Trial
            </Link>
            <Link
              href="/book-demo"
              className="inline-flex items-center px-6 py-3 text-base font-semibold text-teal-400 border border-teal-600 hover:bg-teal-600/10 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
            >
              Book a Demo
            </Link>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Three Pillars                                                       */}
      {/* ------------------------------------------------------------------ */}
      <section className="pb-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="sr-only">Core capabilities</h2>
          <div className="flex flex-col gap-8">
            {PILLARS.map((pillar) => (
              <div
                key={pillar.title}
                className="bg-gray-800 border border-gray-700 rounded-xl p-8 sm:p-10"
              >
                <div className="flex items-start gap-4 mb-6">
                  <div className="shrink-0 flex items-center justify-center w-12 h-12 rounded-lg bg-teal-600/10 border border-teal-600/20">
                    {pillar.icon}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">
                      {pillar.title}
                    </h3>
                    <p className="mt-1 text-gray-400">{pillar.description}</p>
                  </div>
                </div>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="list">
                  {pillar.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-2">
                      <svg
                        className="h-5 w-5 text-teal-400 shrink-0 mt-0.5"
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
                      <span className="text-sm text-gray-300">{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Feature Grid                                                        */}
      {/* ------------------------------------------------------------------ */}
      <section className="pb-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white">
              Built for every part of SDA operations
            </h2>
            <p className="mt-4 text-gray-400 max-w-2xl mx-auto">
              From property tracking to compliance reporting, every module is
              designed around the workflows Australian SDA providers use daily.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="bg-gray-800/60 border border-gray-700 rounded-xl p-6 hover:bg-gray-700/80 transition-colors"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-teal-600/10 border border-teal-600/20 mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-base font-semibold text-white mb-1">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Security Strip                                                      */}
      {/* ------------------------------------------------------------------ */}
      <section className="py-12 bg-gray-800/50 border-y border-gray-700">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
            {SECURITY_BADGES.map((badge) => (
              <div key={badge.label} className="flex items-center gap-2">
                {badge.icon}
                <span className="text-sm font-medium text-gray-300">
                  {badge.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Integrations                                                        */}
      {/* ------------------------------------------------------------------ */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-8">
            Integrates with the tools you already use
          </h2>
          <div className="flex flex-wrap items-center justify-center gap-8">
            {INTEGRATIONS.map((name) => (
              <div
                key={name}
                className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-lg px-5 py-3"
              >
                <span className="text-sm font-medium text-gray-300">
                  {name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* CTA                                                                 */}
      {/* ------------------------------------------------------------------ */}
      <section className="pb-20 pt-4">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-gradient-to-br from-teal-900/30 to-gray-800 rounded-xl border border-teal-600/30 p-10">
            <h2 className="text-2xl font-bold text-white mb-3">
              Ready to replace the workaround?
            </h2>
            <p className="text-gray-400 mb-6">
              Stop duct-taping spreadsheets, email threads, and filing cabinets.
              MySDAManager brings it all into one place.
            </p>
            <Link
              href="/register"
              className="inline-flex items-center px-8 py-3 text-base font-semibold text-white bg-teal-600 hover:bg-teal-500 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
            >
              Start your 14-day free trial
            </Link>
            <p className="mt-3 text-sm text-gray-400">
              No credit card required
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
