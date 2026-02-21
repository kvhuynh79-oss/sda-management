import type { Metadata } from "next";
import Link from "next/link";
import { generateBreadcrumbSchema } from "@/lib/seo";

export const metadata: Metadata = {
  title: "About -- Built by SDA Providers, for SDA Providers",
  description:
    "MySDAManager was born from a simple question: why does every SDA provider in Australia manage compliance on spreadsheets?",
  keywords: ["MySDAManager team", "SDA software Australia", "about MySDAManager"],
};

/* ──────────────────────────────────────────────────────────────────────
   SVG Icon helpers (inlined, zero-dependency)
   ────────────────────────────────────────────────────────────────────── */

function IconShield({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
      />
    </svg>
  );
}

function IconEye({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
      />
    </svg>
  );
}

function IconGlobe({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function IconHeart({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
      />
    </svg>
  );
}

function IconBolt({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 10V3L4 14h7v7l9-11h-7z"
      />
    </svg>
  );
}

function IconLock({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
      />
    </svg>
  );
}

function IconCheck({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

/* ──────────────────────────────────────────────────────────────────────
   Data
   ────────────────────────────────────────────────────────────────────── */

const CORE_VALUES = [
  {
    title: "Compliance-First",
    description:
      "Every feature we build starts with one question: does this help you pass an audit?",
    icon: IconShield,
  },
  {
    title: "Radical Transparency",
    description:
      "No hidden fees. No data lock-in. Your data is always yours to export.",
    icon: IconEye,
  },
  {
    title: "Built for Australia",
    description:
      "Australian English, Australian Privacy Principles, NDIS Practice Standards. Purpose-built for Australian SDA providers.",
    icon: IconGlobe,
  },
  {
    title: "Participant Dignity",
    description:
      "The participants who live in SDA dwellings deserve providers who have their compliance sorted. Better compliance means better care.",
    icon: IconHeart,
  },
  {
    title: "Relentless Reliability",
    description:
      "Offline incident reporting. Automatic alerts. Daily audit integrity checks. The system works when you need it most.",
    icon: IconBolt,
  },
];

const TRUST_BADGES = [
  { label: "AES-256 Encrypted", icon: IconLock },
  { label: "NDIS-Compliant Data Protection", icon: IconShield },
  { label: "NDIS Aligned", icon: IconShield },
  { label: "SOC 2 Ready", icon: IconCheck },
];

/* ──────────────────────────────────────────────────────────────────────
   Page Component (Server Component)
   ────────────────────────────────────────────────────────────────────── */

export default function AboutPage() {
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "About", url: "/about" },
  ]);

  return (
    <>
      {/* JSON-LD Breadcrumb */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      {/* ================================================================
          SECTION 1: Hero
          ================================================================ */}
      <section className="py-20 sm:py-28 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight">
            Built by SDA providers, for SDA providers
          </h1>
          <p className="text-lg sm:text-xl text-gray-400 max-w-3xl mx-auto mt-6 leading-relaxed">
            MySDAManager was born from a simple question: why does every SDA
            provider in Australia manage compliance on spreadsheets when a single
            missed document can cost them their registration?
          </p>
        </div>
      </section>

      {/* ================================================================
          SECTION 2: Origin Story
          ================================================================ */}
      <section className="py-16 sm:py-20 px-4 bg-gray-800/30">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Text column */}
            <div className="space-y-6">
              <h2 className="text-2xl sm:text-3xl font-bold text-white">
                We built the platform we wished existed
              </h2>
              <p className="text-gray-400 leading-relaxed">
                We watched SDA providers juggle 3&ndash;5 separate systems to
                manage what should be one workflow. Excel for properties.
                SharePoint for documents. Calendar reminders for expiry dates.
                Email for contractor quotes. And fingers crossed that nothing
                fell through the cracks.
              </p>
              <p className="text-gray-400 leading-relaxed">
                The $592M SDA market has 11,360 enrolled dwellings and is
                growing 20% annually. Yet until MySDAManager, there was no
                software purpose-built for SDA property management. Every
                provider was using workarounds.
              </p>
              <p className="text-teal-400 font-medium text-lg">
                We built the platform we wished existed.
              </p>
            </div>

            {/* Visual column */}
            <div className="bg-gray-900 rounded-2xl border border-gray-700 p-8">
              <div className="space-y-5">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center mt-0.5">
                    <svg
                      className="w-5 h-5 text-red-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Excel for properties</p>
                    <p className="text-sm text-gray-400">No real-time updates, no audit trail</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center mt-0.5">
                    <svg
                      className="w-5 h-5 text-red-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">SharePoint for documents</p>
                    <p className="text-sm text-gray-400">No expiry tracking, no encryption</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center mt-0.5">
                    <svg
                      className="w-5 h-5 text-red-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Calendar reminders for expiry dates</p>
                    <p className="text-sm text-gray-400">Easy to miss, no escalation</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center mt-0.5">
                    <svg
                      className="w-5 h-5 text-red-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Email for contractor quotes</p>
                    <p className="text-sm text-gray-400">Lost in inboxes, no central record</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center mt-0.5">
                    <svg
                      className="w-5 h-5 text-red-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Fingers crossed for audits</p>
                    <p className="text-sm text-gray-400">No compliance assurance</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================
          SECTION 3: Core Values
          ================================================================ */}
      <section className="py-16 sm:py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
              What we stand for
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              Five principles that guide every product decision we make.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {CORE_VALUES.map((value) => {
              const Icon = value.icon;
              return (
                <div
                  key={value.title}
                  className="bg-gray-800 rounded-xl border border-gray-700 p-8 hover:border-teal-600/50 transition-colors"
                >
                  <div className="w-12 h-12 rounded-xl bg-teal-600/10 flex items-center justify-center mb-5">
                    <Icon className="w-6 h-6 text-teal-400" />
                  </div>
                  <h3 className="text-white text-lg font-semibold mb-3">
                    {value.title}
                  </h3>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    {value.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================================================================
          SECTION 4: Trust Badges
          ================================================================ */}
      <section className="py-12 px-4 bg-gray-800/30">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {TRUST_BADGES.map((badge) => {
              const Icon = badge.icon;
              return (
                <div
                  key={badge.label}
                  className="flex flex-col items-center gap-3 py-6 px-4 bg-gray-900 rounded-xl border border-gray-700"
                >
                  <div className="w-10 h-10 rounded-lg bg-teal-600/10 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-teal-400" />
                  </div>
                  <span className="text-sm font-medium text-gray-300 text-center">
                    {badge.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================================================================
          SECTION 5: CTA
          ================================================================ */}
      <section className="py-20 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
            See what we have built
          </h2>
          <p className="text-lg text-gray-400 mb-8">
            Explore the full feature set designed to keep your SDA registration
            safe.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/features"
              className="inline-flex items-center justify-center px-8 py-3.5 text-base font-medium text-white bg-teal-600 hover:bg-teal-500 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
            >
              Explore Features
            </Link>
            <Link
              href="/book-demo"
              className="inline-flex items-center justify-center px-8 py-3.5 text-base font-medium text-teal-400 border border-teal-600 hover:bg-teal-600/10 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
            >
              Book a Demo
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
