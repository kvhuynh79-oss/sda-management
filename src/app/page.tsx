"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Head from "next/head";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { generateAuditChecklistPdf } from "@/utils/auditChecklistPdf";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";

export default function Home() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const { canInstall, isInstalled, isIOS, promptInstall } = useInstallPrompt();

  // Lead magnet form state
  const [leadName, setLeadName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadProperties, setLeadProperties] = useState<number | "">("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

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
      generateAuditChecklistPdf(leadName);
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
    <>
      <Head>
        <title>MySDAManager -- NDIS SDA Compliance & Property Management Software</title>
        <meta
          name="description"
          content="Australia's purpose-built SDA management platform. Evidence vault, compliance alerts, Xero invoicing. Audit-ready from day one."
        />
        <meta property="og:title" content="MySDAManager -- NDIS SDA Compliance Software" />
        <meta
          property="og:description"
          content="The all-in-one compliance shield for Australian SDA providers. Evidence Vault, Compliance Watchdog, Xero invoicing."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://mysdamanager.com" />
        <meta
          name="keywords"
          content="SDA management software, NDIS provider compliance tool, SDA participant record keeping, NDIS audit software, SDA property management, SDA compliance Australia"
        />
      </Head>

      <div className="min-h-screen bg-gray-900 flex flex-col">
        {/* ================================================================
            SECTION 1: Sticky Header
            ================================================================ */}
        <header className="sticky top-0 z-50 bg-gray-900/95 backdrop-blur border-b border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src="/mysda-logo-dark.svg"
                alt="MySDAManager"
                className="h-8 w-auto"
              />
            </div>
            <nav className="flex items-center gap-4" aria-label="Primary navigation">
              <Link
                href="/pricing"
                className="text-sm text-gray-400 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded"
              >
                Pricing
              </Link>
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
                    className="text-sm text-gray-300 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded"
                  >
                    Login
                  </Link>
                  <Link
                    href="/register"
                    className="text-sm bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
                  >
                    Start Free Trial
                  </Link>
                </>
              )}
            </nav>
          </div>
        </header>

        <main>
          {/* ================================================================
              SECTION 2: Hero (Fear Hook)
              ================================================================ */}
          <section className="py-20 sm:py-28 px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight">
                The NDIS Crackdown Is Here.
              </h1>
              <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-teal-400 mt-3">
                Is your SDA compliance on a spreadsheet — or in a shield?
              </p>
              <p className="text-lg text-gray-400 max-w-2xl mx-auto mt-6">
                The Commission is cracking down on providers with poor
                record-keeping. Expired consents, missing fire docs, and manual
                invoicing errors are putting registrations at risk.
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
                  <svg className="w-4 h-4 text-teal-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  AES-256 Encrypted
                </span>
                <span className="flex items-center gap-2 text-sm text-gray-400">
                  <svg className="w-4 h-4 text-teal-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Australian Hosted
                </span>
                <span className="flex items-center gap-2 text-sm text-gray-400">
                  <svg className="w-4 h-4 text-teal-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  NDIS Practice Standards Aligned
                </span>
              </div>

              {/* PWA Install prompt (keep existing functionality) */}
              {(canInstall && !isInstalled) && (
                <div className="mt-8 flex justify-center">
                  <button
                    onClick={handleInstall}
                    className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white font-medium px-6 py-2.5 rounded-lg border border-gray-600 transition-colors text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                    aria-label="Install MySDAManager app"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Install App
                  </button>
                </div>
              )}
              {isIOS && !isInstalled && (
                <div className="mt-8 flex justify-center">
                  <div className="flex items-center gap-2 bg-gray-800 text-gray-300 font-medium px-6 py-2.5 rounded-lg border border-gray-600 text-sm">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span>
                      Tap <strong>Share</strong> then <strong>Add to Home Screen</strong>
                    </span>
                  </div>
                </div>
              )}
              {isInstalled && (
                <div className="mt-8 flex items-center justify-center gap-2 text-teal-400 text-sm">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  App installed
                </div>
              )}
            </div>
          </section>

          {/* ================================================================
              SECTION 3: Pain Point Strip
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
              SECTION 4: Feature Showcase (3 Pillars)
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
                    <svg className="w-6 h-6 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <h3 className="text-white text-lg font-semibold mb-3">
                    The Evidence Vault
                  </h3>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    Every consent form, incident report, and compliance document
                    — version-controlled, AES-256 encrypted, and
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
                    SDA payments, RRC contributions, and provider fees — synced
                    to Xero in one click. No manual data entry. No transposition
                    errors. No missed payments.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* ================================================================
              SECTION 5: Lead Magnet Form (Audit Checklist)
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
              SECTION 6: Trust Bar
              ================================================================ */}
          <section className="py-12 px-4 border-y border-gray-800">
            <div className="max-w-5xl mx-auto">
              <div className="flex flex-wrap justify-center gap-8 sm:gap-12">
                <span className="flex items-center gap-2 text-sm text-gray-400">
                  <svg className="w-5 h-5 text-teal-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Built for NDIS Compliance
                </span>
                <span className="flex items-center gap-2 text-sm text-gray-400">
                  <svg className="w-5 h-5 text-teal-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  AES-256 Encrypted
                </span>
                <span className="flex items-center gap-2 text-sm text-gray-400">
                  <svg className="w-5 h-5 text-teal-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Audit Pack Generator
                </span>
                <span className="flex items-center gap-2 text-sm text-gray-400">
                  <svg className="w-5 h-5 text-teal-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
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
              SECTION 7: Final CTA
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
            SECTION 8: Footer
            ================================================================ */}
        <footer className="border-t border-gray-800 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-400">
              &copy; 2026 MySDAManager. Built for NDIS compliance.
            </p>
            <nav className="flex items-center gap-6" aria-label="Footer navigation">
              <Link
                href="/pricing"
                className="text-sm text-gray-400 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded"
              >
                Pricing
              </Link>
              <Link
                href="/terms"
                className="text-sm text-gray-400 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded"
              >
                Terms
              </Link>
              <Link
                href="/privacy"
                className="text-sm text-gray-400 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded"
              >
                Privacy
              </Link>
            </nav>
          </div>
        </footer>
      </div>
    </>
  );
}
