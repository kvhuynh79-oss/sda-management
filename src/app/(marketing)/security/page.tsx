import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Security — Enterprise-Grade Data Protection",
  description:
    "AES-256 field-level encryption, MFA, immutable audit trail, RBAC, and NDIS-compliant data protection. Your participant data is protected by enterprise-grade security.",
  keywords: [
    "NDIS data security",
    "SDA software encryption",
    "participant data protection",
  ],
};

/* -------------------------------------------------------------------------- */
/* Inline SVG icon components                                                  */
/* -------------------------------------------------------------------------- */

function LockClosedIcon({ className }: { className?: string }) {
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
        d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
      />
    </svg>
  );
}

function KeyIcon({ className }: { className?: string }) {
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
        d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z"
      />
    </svg>
  );
}

function DocumentCheckIcon({ className }: { className?: string }) {
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
        d="M10.125 2.25h-4.5c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9zm3.75 11.625l2.25 2.25m-2.25-2.25l-2.25-2.25m2.25 2.25l-2.25 2.25m2.25-2.25l2.25-2.25"
      />
    </svg>
  );
}

function FingerPrintIcon({ className }: { className?: string }) {
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
        d="M7.864 4.243A7.5 7.5 0 0119.5 10.5c0 2.92-.556 5.709-1.568 8.268M5.742 6.364A7.465 7.465 0 004.5 10.5a48.667 48.667 0 00-1.395 8.972m-1.583-4.306A47.74 47.74 0 003.75 14.5m0 0a6 6 0 019.168-5.088A6 6 0 0112 14.5m-8.25 0a48.167 48.167 0 00-.86 4.677M12 14.5A6.042 6.042 0 0114.5 12c1.38 0 2.634.462 3.643 1.242m-3.643-1.242a48.038 48.038 0 013.818 7.794"
      />
    </svg>
  );
}

function GlobeAltIcon({ className }: { className?: string }) {
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
        d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418"
      />
    </svg>
  );
}

function ServerStackIcon({ className }: { className?: string }) {
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
        d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z"
      />
    </svg>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className || "h-5 w-5"}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Data                                                                        */
/* -------------------------------------------------------------------------- */

const PILLARS = [
  {
    icon: <LockClosedIcon className="h-8 w-8 text-teal-400" />,
    title: "Field-Level Encryption",
    description:
      "AES-256-GCM encryption for NDIS numbers, dates of birth, emergency contacts, and bank details. HMAC-SHA256 blind indexes enable search without decryption.",
  },
  {
    icon: <KeyIcon className="h-8 w-8 text-teal-400" />,
    title: "Multi-Factor Authentication",
    description:
      "TOTP-based MFA (Google Authenticator, Authy) with 10 backup codes. Inactivity lock screen with PIN protection after 5 minutes.",
  },
  {
    icon: <DocumentCheckIcon className="h-8 w-8 text-teal-400" />,
    title: "Immutable Audit Trail",
    description:
      "SHA-256 hash-chained audit logs that cannot be modified or deleted. Daily integrity verification. Full chain of custody for every data change.",
  },
  {
    icon: <FingerPrintIcon className="h-8 w-8 text-teal-400" />,
    title: "Role-Based Access Control",
    description:
      "5 roles (Admin, Property Manager, Staff, Accountant, SIL Provider) with granular permissions. Every API call verified against user permissions.",
  },
  {
    icon: <GlobeAltIcon className="h-8 w-8 text-teal-400" />,
    title: "NDIS-Compliant Data Protection",
    description:
      "AES-256 encrypted at rest. Compliant with Australian Privacy Principles (APPs) and NDIS Practice Standards. 72-hour Notifiable Data Breach response.",
  },
  {
    icon: <ServerStackIcon className="h-8 w-8 text-teal-400" />,
    title: "Secure Infrastructure",
    description:
      "Content Security Policy headers, HTTPS everywhere, bcrypt password hashing (12 salt rounds), session tokens with automatic refresh.",
  },
];

const COMPLIANCE_ITEMS = [
  "Australian Privacy Act 1988 (13 APPs)",
  "NDIS Quality & Safeguards Commission Practice Standards",
  "72-hour Notifiable Data Breach scheme",
  "OWASP Top 10 security practices",
];

/* -------------------------------------------------------------------------- */
/* Page                                                                        */
/* -------------------------------------------------------------------------- */

export default function SecurityPage() {
  return (
    <div>
      {/* ------------------------------------------------------------------ */}
      {/* Hero                                                                */}
      {/* ------------------------------------------------------------------ */}
      <section className="pt-20 pb-16 sm:pt-28 sm:pb-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-teal-600/10 border border-teal-600/20 rounded-full px-4 py-1.5 mb-8">
            <LockClosedIcon className="h-4 w-4 text-teal-400" />
            <span className="text-sm font-medium text-teal-400">
              Enterprise-grade security
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">
            Your participant data, protected
          </h1>
          <p className="mt-6 text-lg text-gray-400 max-w-2xl mx-auto">
            Enterprise-grade security built into every layer. Not bolted on as
            an afterthought.
          </p>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Six Security Pillars                                                */}
      {/* ------------------------------------------------------------------ */}
      <section className="pb-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {PILLARS.map((pillar) => (
              <div
                key={pillar.title}
                className="bg-gray-800 border border-gray-700 rounded-xl p-6 hover:bg-gray-700/80 transition-colors"
              >
                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-teal-600/10 border border-teal-600/20 mb-5">
                  {pillar.icon}
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  {pillar.title}
                </h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  {pillar.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Compliance Standards                                                */}
      {/* ------------------------------------------------------------------ */}
      <section className="pb-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 sm:p-10">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">
              Compliance standards we follow
            </h2>
            <ul className="space-y-4" role="list">
              {COMPLIANCE_ITEMS.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <CheckCircleIcon className="h-5 w-5 text-teal-400 shrink-0 mt-0.5" />
                  <span className="text-gray-300">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Architecture Detail Strip                                           */}
      {/* ------------------------------------------------------------------ */}
      <section className="py-12 bg-gray-800/50 border-y border-gray-700">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            <div>
              <p className="text-3xl font-bold text-teal-400">256-bit</p>
              <p className="mt-1 text-sm text-gray-400">AES-GCM encryption</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-teal-400">SHA-256</p>
              <p className="mt-1 text-sm text-gray-400">
                Hash-chained audit logs
              </p>
            </div>
            <div>
              <p className="text-3xl font-bold text-teal-400">5 roles</p>
              <p className="mt-1 text-sm text-gray-400">
                Granular access control
              </p>
            </div>
            <div>
              <p className="text-3xl font-bold text-teal-400">72 hr</p>
              <p className="mt-1 text-sm text-gray-400">
                Breach notification SLA
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* CTA                                                                 */}
      {/* ------------------------------------------------------------------ */}
      <section className="py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-gradient-to-br from-teal-900/30 to-gray-800 rounded-xl border border-teal-600/30 p-10">
            <h2 className="text-2xl font-bold text-white mb-3">
              Security is not a feature. It is the foundation.
            </h2>
            <p className="text-gray-400 mb-6">
              Every line of code, every database query, every API call is
              designed with participant data protection as the first priority.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="inline-flex items-center justify-center px-8 py-3 text-base font-semibold text-white bg-teal-600 hover:bg-teal-500 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
              >
                Start 14-Day Free Trial
              </Link>
              <Link
                href="/book-demo"
                className="inline-flex items-center justify-center px-8 py-3 text-base font-semibold text-teal-400 border border-teal-600 hover:bg-teal-600/10 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
              >
                Book a Demo
              </Link>
            </div>
            <p className="mt-3 text-sm text-gray-400">
              No credit card required
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
