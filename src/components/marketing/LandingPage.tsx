"use client";

import { useEffect, useState, useCallback, useRef, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { generateAuditChecklistPdf } from "@/utils/auditChecklistPdf";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";

/* ──────────────────────────────────────────────────────────────────────
   Screenshot gallery data
   ────────────────────────────────────────────────────────────────────── */
const GALLERY_SCREENSHOTS = [
  { src: "/marketing/dashboard.png", label: "Dashboard", description: "Real-time overview of your entire SDA portfolio" },
  { src: "/marketing/properties.png", label: "Properties", description: "Manage properties, dwellings, and occupancy" },
  { src: "/marketing/participants.png", label: "Participants", description: "NDIS participant profiles with plan tracking" },
  { src: "/marketing/incidents.png", label: "Incidents", description: "Incident reporting with NDIS severity levels" },
  { src: "/marketing/certifications.png", label: "Compliance", description: "Track certifications and expiry dates" },
] as const;

/* ──────────────────────────────────────────────────────────────────────
   Workaround comparison data
   ────────────────────────────────────────────────────────────────────── */
const WORKAROUND_ROWS = [
  {
    need: "Property & dwelling tracking",
    workaround: "Excel spreadsheet",
    solution: "Built-in with SDA categories, occupancy, owner details",
  },
  {
    need: "Participant placement",
    workaround: "Manual matching + emails",
    solution: "Linked to dwellings, consent workflow, plan tracking",
  },
  {
    need: "SDA payment calculations",
    workaround: "Another spreadsheet",
    solution: "Auto-calculated: SDA Funding + RRC + Provider Fee",
  },
  {
    need: "Compliance document tracking",
    workaround: "Shared Google Drive",
    solution: "Evidence Vault with expiry alerts + audit indexing",
  },
  {
    need: "Fire safety cert expiry",
    workaround: "Calendar reminders (maybe)",
    solution: "Compliance Watchdog: 90/60/30-day automated alerts",
  },
  {
    need: "Incident reporting",
    workaround: "Word doc template",
    solution: "Offline-capable forms, 24hr NDIS chain of custody",
  },
  {
    need: "Owner / landlord reporting",
    workaround: "Manual PDF every month",
    solution: "One-click Folio Summary generation",
  },
  {
    need: "Audit pack preparation",
    workaround: "2 weeks of manual assembly",
    solution: "7-section PDF generated in minutes",
  },
  {
    need: "Contractor quotes",
    workaround: "Email back and forth",
    solution: "Quote request workflow with public response link",
  },
  {
    need: "Xero invoicing",
    workaround: "Manual data entry",
    solution: "One-click sync",
  },
] as const;

/* ──────────────────────────────────────────────────────────────────────
   Reusable SVG icon components (inlined for zero-dependency perf)
   ────────────────────────────────────────────────────────────────────── */
function IconLock({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  );
}

function IconGlobe({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function IconShield({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

function IconCheck({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function IconDownload({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}

function IconX({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function IconExclamation({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
    </svg>
  );
}

/* ──────────────────────────────────────────────────────────────────────
   Landing Page Component
   ────────────────────────────────────────────────────────────────────── */
export function LandingPage() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const { canInstall, isInstalled, isIOS, promptInstall } = useInstallPrompt();

  // Lead magnet form state
  const [leadName, setLeadName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadProperties, setLeadProperties] = useState<number | "">("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Mobile header menu
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Screenshot gallery
  const [activeScreenshot, setActiveScreenshot] = useState(0);

  const submitLead = useMutation(api.marketingLeads.submitLead);

  useEffect(() => {
    const user = localStorage.getItem("sda_user");
    setIsLoggedIn(!!user);
  }, []);

  const handleInstall = async () => {
    await promptInstall();
  };

  const scrollToChecklist = () => {
    const el = document.getElementById("audit-checklist");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleChecklistSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await submitLead({
        name: leadName,
        email: leadEmail,
        numberOfProperties: leadProperties ? Number(leadProperties) : undefined,
        source: "audit_checklist",
      });
    } catch {
      // If the mutation fails, still generate the PDF so we don't block the user
    }

    try {
      await generateAuditChecklistPdf(leadName);
    } catch {
      // PDF generation fallback - should not fail but guard anyway
    }

    setIsSubmitting(false);
    setIsSubmitted(true);
  };

  // Still checking auth
  if (isLoggedIn === null) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* ================================================================
          SECTION 1: Sticky Header
          ================================================================ */}
      <header className="sticky top-0 z-50 bg-gray-900/95 backdrop-blur border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded-md"
            aria-label="MySDAManager home"
          >
            <img
              src="/mysda-logo-dark.svg"
              alt="MySDAManager"
              className="h-8 w-auto"
            />
          </Link>

          {/* Desktop center nav */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Primary navigation">
            <Link
              href="/features"
              className="px-3 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
            >
              Features
            </Link>
            <Link
              href="/pricing"
              className="px-3 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
            >
              Pricing
            </Link>
            <Link
              href="/compare"
              className="px-3 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
            >
              Compare
            </Link>
            <Link
              href="/security"
              className="px-3 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
            >
              Security
            </Link>
            <Link
              href="/about"
              className="px-3 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
            >
              About
            </Link>
            <Link
              href="/blog"
              className="px-3 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
            >
              Blog
            </Link>
          </nav>

          {/* Desktop right side */}
          <div className="hidden md:flex items-center gap-3">
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                className="text-sm bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-3 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="text-sm font-semibold bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
                >
                  Start Free Trial
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            type="button"
            className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-controls="landing-mobile-menu"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {mobileMenuOpen ? (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div id="landing-mobile-menu" className="md:hidden border-t border-gray-800 pb-4 px-4">
            <div className="flex flex-col space-y-1 pt-3">
              <Link href="/features" className="px-3 py-2 text-base font-medium text-gray-300 hover:text-white hover:bg-gray-800 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500" onClick={() => setMobileMenuOpen(false)}>Features</Link>
              <Link href="/pricing" className="px-3 py-2 text-base font-medium text-gray-300 hover:text-white hover:bg-gray-800 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500" onClick={() => setMobileMenuOpen(false)}>Pricing</Link>
              <Link href="/compare" className="px-3 py-2 text-base font-medium text-gray-300 hover:text-white hover:bg-gray-800 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500" onClick={() => setMobileMenuOpen(false)}>Compare</Link>
              <Link href="/security" className="px-3 py-2 text-base font-medium text-gray-300 hover:text-white hover:bg-gray-800 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500" onClick={() => setMobileMenuOpen(false)}>Security</Link>
              <Link href="/about" className="px-3 py-2 text-base font-medium text-gray-300 hover:text-white hover:bg-gray-800 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500" onClick={() => setMobileMenuOpen(false)}>About</Link>
              <Link href="/blog" className="px-3 py-2 text-base font-medium text-gray-300 hover:text-white hover:bg-gray-800 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500" onClick={() => setMobileMenuOpen(false)}>Blog</Link>
            </div>
            <div className="border-t border-gray-800 mt-3 pt-3 flex flex-col space-y-2 px-3">
              {isLoggedIn ? (
                <Link href="/dashboard" className="text-center py-2 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-500 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500" onClick={() => setMobileMenuOpen(false)}>Go to Dashboard</Link>
              ) : (
                <>
                  <Link href="/login" className="text-center py-2 text-sm font-medium text-gray-300 hover:text-white rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500" onClick={() => setMobileMenuOpen(false)}>Login</Link>
                  <Link href="/register" className="text-center py-2 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-500 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500" onClick={() => setMobileMenuOpen(false)}>Start Free Trial</Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      <main>
        {/* ================================================================
            SECTION 2: Hero
            ================================================================ */}
        <section className="py-20 sm:py-28 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight">
              Still juggling spreadsheets, emails, and generic NDIS tools?
            </h1>
            <p className="text-xl sm:text-2xl lg:text-3xl font-semibold text-teal-400 mt-4 leading-snug">
              MySDAManager replaces the workaround. One platform. Every SDA property. Audit-ready from day one.
            </p>
            <p className="text-base sm:text-lg text-gray-400 max-w-3xl mx-auto mt-6 leading-relaxed">
              You&apos;re paying for 3-5 systems that weren&apos;t built for SDA. ShiftCare for rostering. Excel for properties.
              Google Drive for documents. A calendar for expiry dates. MySDAManager is the only platform purpose-built
              for SDA providers &mdash; where properties, participants, compliance, payments, and documents live in one system.
            </p>

            {/* Dual CTA row */}
            <div className="flex flex-col sm:flex-row gap-4 mt-10 justify-center">
              {isLoggedIn ? (
                <Link
                  href="/dashboard"
                  className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-3.5 rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
                >
                  Go to Dashboard
                </Link>
              ) : (
                <Link
                  href="/register"
                  className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-3.5 rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
                >
                  Start Free Trial
                </Link>
              )}
              <button
                onClick={scrollToChecklist}
                className="border border-teal-600 text-teal-400 hover:bg-teal-600/10 px-8 py-3.5 rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
              >
                Download Audit Checklist
              </button>
            </div>

            {/* Trust signals row */}
            <div className="flex flex-wrap gap-6 sm:gap-8 mt-10 justify-center">
              <span className="flex items-center gap-2 text-sm text-gray-400">
                <IconLock className="w-4 h-4 text-teal-400 flex-shrink-0" />
                AES-256 Encrypted
              </span>
              <span className="flex items-center gap-2 text-sm text-gray-400">
                <IconGlobe className="w-4 h-4 text-teal-400 flex-shrink-0" />
                Australian Hosted
              </span>
              <span className="flex items-center gap-2 text-sm text-gray-400">
                <IconShield className="w-4 h-4 text-teal-400 flex-shrink-0" />
                NDIS Practice Standards Aligned
              </span>
            </div>

            {/* PWA Install prompt */}
            {canInstall && !isInstalled && (
              <div className="mt-8 flex justify-center">
                <button
                  onClick={handleInstall}
                  className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white font-medium px-6 py-2.5 rounded-lg border border-gray-600 transition-colors text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                  aria-label="Install MySDAManager app"
                >
                  <IconDownload className="w-5 h-5" />
                  Install App
                </button>
              </div>
            )}
            {isIOS && !isInstalled && (
              <div className="mt-8 flex justify-center">
                <div className="flex items-center gap-2 bg-gray-800 text-gray-300 font-medium px-6 py-2.5 rounded-lg border border-gray-600 text-sm">
                  <IconDownload className="w-5 h-5" />
                  <span>
                    Tap <strong>Share</strong> then <strong>Add to Home Screen</strong>
                  </span>
                </div>
              </div>
            )}
            {isInstalled && (
              <div className="mt-8 flex items-center justify-center gap-2 text-teal-400 text-sm">
                <IconCheck className="w-5 h-5" />
                App installed
              </div>
            )}
          </div>
        </section>

        {/* ================================================================
            SECTION 2.5: Hero Dashboard Screenshot
            ================================================================ */}
        <section className="pb-16 sm:pb-20 px-4 -mt-4">
          <div className="max-w-6xl mx-auto">
            <div className="relative rounded-xl overflow-hidden border border-gray-700 shadow-2xl shadow-teal-900/20">
              <Image
                src="/marketing/dashboard.png"
                alt="MySDAManager dashboard showing property portfolio, tasks, and operations overview"
                width={1920}
                height={1080}
                className="w-full h-auto"
                priority
              />
              {/* Gradient fade at bottom */}
              <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-gray-900/80 to-transparent" aria-hidden="true" />
            </div>
          </div>
        </section>

        {/* ================================================================
            SECTION 3: The Workaround Problem (NEW)
            ================================================================ */}
        <section className="py-16 sm:py-20 px-4 bg-gray-800/30">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
                The workaround problem
              </h2>
              <p className="text-gray-400 max-w-2xl mx-auto">
                Every SDA provider starts the same way: stitching together tools that were never designed
                for disability housing. Here is what that actually looks like.
              </p>
            </div>

            {/* Desktop table view */}
            <div className="hidden lg:block overflow-hidden rounded-xl border border-gray-700">
              <table className="w-full" role="table">
                <thead>
                  <tr className="bg-gray-800">
                    <th scope="col" className="text-left px-6 py-4 text-sm font-semibold text-gray-300 w-1/4">What you need</th>
                    <th scope="col" className="text-left px-6 py-4 text-sm font-semibold text-gray-300 w-[37.5%]">The workaround today</th>
                    <th scope="col" className="text-left px-6 py-4 text-sm font-semibold text-gray-300 w-[37.5%]">With MySDAManager</th>
                  </tr>
                </thead>
                <tbody>
                  {WORKAROUND_ROWS.map((row, i) => (
                    <tr
                      key={i}
                      className={i % 2 === 0 ? "bg-gray-900" : "bg-gray-900/60"}
                    >
                      <td className="px-6 py-4 text-sm text-gray-400">{row.need}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-2 text-sm text-red-400">
                          <IconX className="w-4 h-4 flex-shrink-0" />
                          {row.workaround}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-2 text-sm text-teal-400">
                          <IconCheck className="w-4 h-4 flex-shrink-0" />
                          {row.solution}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile / tablet card view */}
            <div className="lg:hidden space-y-4">
              {WORKAROUND_ROWS.map((row, i) => (
                <div key={i} className="bg-gray-900 rounded-xl border border-gray-700 p-5">
                  <p className="text-sm font-medium text-white mb-3">{row.need}</p>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-red-500/10 flex items-center justify-center">
                        <IconX className="w-3 h-3 text-red-400" />
                      </span>
                      <span className="text-sm text-red-400">{row.workaround}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-teal-500/10 flex items-center justify-center">
                        <IconCheck className="w-3 h-3 text-teal-400" />
                      </span>
                      <span className="text-sm text-teal-400">{row.solution}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ================================================================
            SECTION 4: Pain Point Strip
            ================================================================ */}
        <section className="py-16 px-4 bg-gray-800/50">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold text-white text-center mb-10">
              Could you survive an unannounced audit?
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {/* Pain card 1: Expired Consent Forms */}
              <div className="bg-gray-900 rounded-xl border border-red-500/30 p-6">
                <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center mb-4">
                  <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-white font-semibold mb-2">Expired Consent Forms</h3>
                <p className="text-sm text-gray-400">
                  Can you produce a valid, signed consent form for every
                  participant within 15 minutes? APP 3 requires it.
                </p>
                <p className="mt-4 text-sm font-medium text-teal-400">
                  MySDAManager solves this.
                </p>
              </div>

              {/* Pain card 2: Missing Fire Safety Docs */}
              <div className="bg-gray-900 rounded-xl border border-red-500/30 p-6">
                <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center mb-4">
                  <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
                  </svg>
                </div>
                <h3 className="text-white font-semibold mb-2">Missing Fire Safety Docs</h3>
                <p className="text-sm text-gray-400">
                  Are your FP1500 fire safety certificates all current and
                  traceable? One expired cert is an immediate non-compliance
                  finding.
                </p>
                <p className="mt-4 text-sm font-medium text-teal-400">
                  MySDAManager solves this.
                </p>
              </div>

              {/* Pain card 3: Manual Invoicing Errors */}
              <div className="bg-gray-900 rounded-xl border border-red-500/30 p-6">
                <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center mb-4">
                  <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-white font-semibold mb-2">Manual Invoicing Errors</h3>
                <p className="text-sm text-gray-400">
                  Still reconciling SDA payments, RRC contributions, and
                  provider fees by hand? One transposition error can cascade
                  through months of records.
                </p>
                <p className="mt-4 text-sm font-medium text-teal-400">
                  MySDAManager solves this.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================
            SECTION 5: Feature Showcase (3 Pillars)
            ================================================================ */}
        <section className="py-20 px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold text-white text-center mb-4">
              Your compliance shield. Three pillars.
            </h2>
            <p className="text-gray-400 text-center mb-12">
              Every feature built for one purpose: keeping your registration
              safe.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
              {/* Pillar 1: The Evidence Vault */}
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-8 hover:border-teal-600/50 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-teal-600/10 flex items-center justify-center mb-5">
                  <IconShield className="w-6 h-6 text-teal-400" />
                </div>
                <h3 className="text-white text-lg font-semibold mb-3">
                  The Evidence Vault
                </h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Every consent form, incident report, and compliance document
                  &mdash; version-controlled, AES-256 encrypted, and
                  audit-indexed. One click to generate a complete evidence
                  pack.
                </p>
              </div>

              {/* Pillar 2: The Compliance Watchdog */}
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-8 hover:border-teal-600/50 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-teal-600/10 flex items-center justify-center mb-5">
                  <svg className="w-6 h-6 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <h3 className="text-white text-lg font-semibold mb-3">
                  The Compliance Watchdog
                </h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Never miss a certification expiry, plan renewal, or NDIS
                  reporting deadline. Automated alerts at 90, 60, and 30 days.
                  Your early warning system.
                </p>
              </div>

              {/* Pillar 3: Xero Automated Invoicing */}
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-8 hover:border-teal-600/50 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-teal-600/10 flex items-center justify-center mb-5">
                  <svg className="w-6 h-6 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
                  </svg>
                </div>
                <h3 className="text-white text-lg font-semibold mb-3">
                  Xero Automated Invoicing
                </h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  SDA payments, RRC contributions, and provider fees &mdash; synced
                  to Xero in one click. No manual data entry. No transposition
                  errors. No missed payments.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================
            SECTION 6: How It Works (NEW)
            ================================================================ */}
        <section className="py-16 sm:py-20 px-4 bg-gray-800/30">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-14">
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
                How it works
              </h2>
              <p className="text-gray-400 max-w-xl mx-auto">
                From scattered files to audit-ready evidence in three steps.
              </p>
            </div>

            <div className="relative">
              {/* Connecting line (desktop only) */}
              <div className="hidden sm:block absolute top-12 left-[calc(16.67%+24px)] right-[calc(16.67%+24px)] h-0.5 bg-gradient-to-r from-teal-600 via-teal-500 to-teal-600" aria-hidden="true" />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 sm:gap-8">
                {/* Step 1 */}
                <div className="text-center relative">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-teal-600 text-white text-lg font-bold mb-5 relative z-10 ring-4 ring-gray-900">
                    1
                  </div>
                  <div className="bg-gray-900 rounded-xl border border-gray-700 p-6">
                    <div className="w-10 h-10 rounded-lg bg-teal-600/10 flex items-center justify-center mx-auto mb-4">
                      <svg className="w-5 h-5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <h3 className="text-white font-semibold mb-2">Upload your evidence</h3>
                    <p className="text-sm text-gray-400">
                      Documents, certificates, consent forms &mdash; all into the Evidence Vault.
                      AES-256 encrypted and audit-indexed automatically.
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="text-center relative">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-teal-600 text-white text-lg font-bold mb-5 relative z-10 ring-4 ring-gray-900">
                    2
                  </div>
                  <div className="bg-gray-900 rounded-xl border border-gray-700 p-6">
                    <div className="w-10 h-10 rounded-lg bg-teal-600/10 flex items-center justify-center mx-auto mb-4">
                      <svg className="w-5 h-5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                    </div>
                    <h3 className="text-white font-semibold mb-2">Set your alerts</h3>
                    <p className="text-sm text-gray-400">
                      The Compliance Watchdog monitors every expiry date. Automated alerts
                      at 90, 60, and 30 days before anything lapses.
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="text-center relative">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-teal-600 text-white text-lg font-bold mb-5 relative z-10 ring-4 ring-gray-900">
                    3
                  </div>
                  <div className="bg-gray-900 rounded-xl border border-gray-700 p-6">
                    <div className="w-10 h-10 rounded-lg bg-teal-600/10 flex items-center justify-center mx-auto mb-4">
                      <svg className="w-5 h-5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h3 className="text-white font-semibold mb-2">Generate audit packs</h3>
                    <p className="text-sm text-gray-400">
                      One click produces a 7-section NDIS audit evidence pack.
                      What used to take two weeks now takes minutes.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================
            SECTION 6.5: Screenshot Carousel
            ================================================================ */}
        <section className="py-16 sm:py-20 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
                See it in action
              </h2>
              <p className="text-gray-400 max-w-xl mx-auto">
                Purpose-built for SDA providers. Every screen designed around NDIS workflows.
              </p>
            </div>

            {/* Carousel */}
            <div className="relative group">
              {/* Slides container */}
              <div className="overflow-hidden rounded-xl border border-gray-700 shadow-2xl shadow-teal-900/20">
                <div
                  className="flex transition-transform duration-500 ease-in-out"
                  style={{ transform: `translateX(-${activeScreenshot * 100}%)` }}
                >
                  {GALLERY_SCREENSHOTS.map((item) => (
                    <div key={item.label} className="w-full flex-shrink-0">
                      <Image
                        src={item.src}
                        alt={item.description}
                        width={1920}
                        height={1080}
                        className="w-full h-auto"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Left arrow */}
              {activeScreenshot > 0 && (
                <button
                  onClick={() => setActiveScreenshot((prev) => prev - 1)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-gray-900/80 border border-gray-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:opacity-100"
                  aria-label="Previous screenshot"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}

              {/* Right arrow */}
              {activeScreenshot < GALLERY_SCREENSHOTS.length - 1 && (
                <button
                  onClick={() => setActiveScreenshot((prev) => prev + 1)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-gray-900/80 border border-gray-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:opacity-100"
                  aria-label="Next screenshot"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}
            </div>

            {/* Label + dots */}
            <div className="mt-6 flex flex-col items-center gap-3">
              <p className="text-white font-medium text-sm">
                {GALLERY_SCREENSHOTS[activeScreenshot].label}
                <span className="text-gray-400 font-normal ml-2">
                  &mdash; {GALLERY_SCREENSHOTS[activeScreenshot].description}
                </span>
              </p>
              <div className="flex gap-2" role="tablist" aria-label="Screenshot navigation">
                {GALLERY_SCREENSHOTS.map((item, i) => (
                  <button
                    key={item.label}
                    role="tab"
                    aria-selected={activeScreenshot === i}
                    aria-label={item.label}
                    onClick={() => setActiveScreenshot(i)}
                    className={`h-2 rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
                      activeScreenshot === i
                        ? "w-8 bg-teal-500"
                        : "w-2 bg-gray-600 hover:bg-gray-500"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================
            SECTION 6.75: Testimonials
            ================================================================ */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-4">
            Trusted by SDA Providers Across Australia
          </h2>
          <p className="text-gray-400 text-center mb-12 max-w-2xl mx-auto">
            Hear from providers who switched from spreadsheets to MySDAManager
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Testimonial 1: BLS - Khen H - Compliance/Audit feature */}
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-gray-300 text-sm mb-6">
                &ldquo;We used to spend days pulling together documents for NDIS audits.
                Now I generate a complete compliance pack in under a minute.
                The audit trail and certification tracking alone saved us from
                a potential non-compliance finding.&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-teal-600/20 rounded-full flex items-center justify-center">
                  <span className="text-teal-400 font-semibold text-sm">KH</span>
                </div>
                <div>
                  <div className="text-white text-sm font-medium">Khen H.</div>
                  <div className="text-gray-400 text-xs">Director, Better Living Solutions</div>
                </div>
              </div>
            </div>

            {/* Testimonial 2: AAH - Anh L - Property/Participant management */}
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-gray-300 text-sm mb-6">
                &ldquo;Managing participant plans and property details across multiple
                sites was a nightmare with spreadsheets. MySDAManager keeps
                everything in one place &mdash; NDIS numbers, plan dates, dwelling
                assignments. My team actually enjoys updating records now.&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-600/20 rounded-full flex items-center justify-center">
                  <span className="text-purple-400 font-semibold text-sm">AL</span>
                </div>
                <div>
                  <div className="text-white text-sm font-medium">Anh L.</div>
                  <div className="text-gray-400 text-xs">Director, Achieve Ability Housing</div>
                </div>
              </div>
            </div>

            {/* Testimonial 3: SDA - Brian J - MTA Claims/Invoicing */}
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-gray-300 text-sm mb-6">
                &ldquo;The MTA claims and invoicing feature cut our admin time in
                half. I can generate all my monthly claims in one click and
                the tax invoices look professional. No more copying and pasting
                into Word templates at the end of every month.&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600/20 rounded-full flex items-center justify-center">
                  <span className="text-blue-400 font-semibold text-sm">BJ</span>
                </div>
                <div>
                  <div className="text-white text-sm font-medium">Brian J.</div>
                  <div className="text-gray-400 text-xs">Manager, Supporting Disabilities Australia</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================
            SECTION 7: Lead Magnet Form (Audit Checklist)
            ================================================================ */}
        <section
          id="audit-checklist"
          className="py-20 px-4 bg-gradient-to-br from-teal-900/40 to-gray-900"
        >
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
              Free: The 2026 NDIS SDA Audit Readiness Checklist
            </h2>
            <p className="text-gray-400 mb-8">
              12-point checklist covering every document the NDIS Commission
              will ask for. No login required.
            </p>

            {isSubmitted ? (
              /* Success state */
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-8">
                <div className="flex justify-center mb-4">
                  <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center">
                    <svg className="w-7 h-7 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  Your checklist is downloading!
                </h3>
                <p className="text-gray-400 mb-6">
                  Check your downloads folder.
                </p>
                <Link
                  href="/register"
                  className="inline-block bg-teal-600 hover:bg-teal-700 text-white font-medium px-8 py-3 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
                >
                  Want the full platform? Start Free Trial
                </Link>
              </div>
            ) : (
              /* Form state */
              <form
                onSubmit={handleChecklistSubmit}
                className="space-y-4 text-left"
                noValidate
              >
                <div>
                  <label
                    htmlFor="lead-name"
                    className="block text-sm font-medium text-gray-300 mb-1"
                  >
                    Your name
                  </label>
                  <input
                    id="lead-name"
                    type="text"
                    required
                    autoComplete="name"
                    value={leadName}
                    onChange={(e) => setLeadName(e.target.value)}
                    placeholder="Jane Smith"
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label
                    htmlFor="lead-email"
                    className="block text-sm font-medium text-gray-300 mb-1"
                  >
                    Work email
                  </label>
                  <input
                    id="lead-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={leadEmail}
                    onChange={(e) => setLeadEmail(e.target.value)}
                    placeholder="jane@provider.com.au"
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label
                    htmlFor="lead-properties"
                    className="block text-sm font-medium text-gray-300 mb-1"
                  >
                    Number of SDA properties{" "}
                    <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input
                    id="lead-properties"
                    type="number"
                    min={1}
                    autoComplete="off"
                    value={leadProperties}
                    onChange={(e) =>
                      setLeadProperties(
                        e.target.value === "" ? "" : Number(e.target.value)
                      )
                    }
                    placeholder="e.g. 5"
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !leadName.trim() || !leadEmail.trim()}
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white font-medium py-3.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
                >
                  {isSubmitting ? "Downloading..." : "Download Free Checklist"}
                </button>
              </form>
            )}
          </div>
        </section>

        {/* ================================================================
            SECTION 8: Trust Bar
            ================================================================ */}
        <section className="py-12 px-4 border-y border-gray-800">
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-wrap justify-center gap-8 sm:gap-12">
              <span className="flex items-center gap-2 text-sm text-gray-400">
                <IconShield className="w-5 h-5 text-teal-400 flex-shrink-0" />
                Built for NDIS Compliance
              </span>
              <span className="flex items-center gap-2 text-sm text-gray-400">
                <IconLock className="w-5 h-5 text-teal-400 flex-shrink-0" />
                AES-256 Encrypted
              </span>
              <span className="flex items-center gap-2 text-sm text-gray-400">
                <svg className="w-5 h-5 text-teal-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Audit Pack Generator
              </span>
              <span className="flex items-center gap-2 text-sm text-gray-400">
                <IconGlobe className="w-5 h-5 text-teal-400 flex-shrink-0" />
                Australian Hosted
              </span>
              <span className="flex items-center gap-2 text-sm text-gray-400">
                <svg className="w-5 h-5 text-teal-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                Real-Time Alerts
              </span>
            </div>
          </div>
        </section>

        {/* ================================================================
            SECTION 9: Final CTA
            ================================================================ */}
        <section className="py-20 px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
              Your next NDIS audit could be tomorrow.
            </h2>
            <p className="text-lg text-gray-400 mb-8">
              Start protecting your evidence trail today.
            </p>
            <Link
              href="/register"
              className="inline-block bg-teal-600 hover:bg-teal-700 text-white font-medium px-10 py-4 rounded-lg text-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
            >
              Start Free Trial
            </Link>
            <div className="mt-4">
              <button
                onClick={scrollToChecklist}
                className="text-sm text-teal-400 hover:text-teal-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded"
              >
                or download the free checklist
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* ================================================================
          SECTION 10: Footer
          ================================================================ */}
      <footer className="border-t border-gray-800 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-8">
            {/* Product column */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-3">Product</h4>
              <nav className="flex flex-col gap-2" aria-label="Product links">
                <Link href="/features" className="text-sm text-gray-400 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded">Features</Link>
                <Link href="/pricing" className="text-sm text-gray-400 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded">Pricing</Link>
                <Link href="/security" className="text-sm text-gray-400 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded">Security</Link>
              </nav>
            </div>
            {/* Company column */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-3">Company</h4>
              <nav className="flex flex-col gap-2" aria-label="Company links">
                <Link href="/about" className="text-sm text-gray-400 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded">About</Link>
                <Link href="/contact" className="text-sm text-gray-400 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded">Contact</Link>
              </nav>
            </div>
            {/* Legal column */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-3">Legal</h4>
              <nav className="flex flex-col gap-2" aria-label="Legal links">
                <Link href="/terms" className="text-sm text-gray-400 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded">Terms</Link>
                <Link href="/privacy" className="text-sm text-gray-400 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded">Privacy</Link>
              </nav>
            </div>
            {/* Account column */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-3">Account</h4>
              <nav className="flex flex-col gap-2" aria-label="Account links">
                <Link href="/login" className="text-sm text-gray-400 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded">Login</Link>
                <Link href="/register" className="text-sm text-gray-400 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded">Start Free Trial</Link>
              </nav>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-400">
              &copy; 2026 MySDAManager. Built for NDIS compliance.
            </p>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <IconShield className="w-4 h-4 text-teal-400" />
              NDIS Practice Standards Aligned
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
