"use client";

import Link from "next/link";

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function ShieldIcon() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Table of Contents
// ---------------------------------------------------------------------------

const SECTIONS = [
  { id: "acceptance", title: "1. Acceptance of Terms" },
  { id: "service-description", title: "2. Service Description" },
  { id: "account-registration", title: "3. Account Registration and Security" },
  { id: "subscription-billing", title: "4. Subscription and Billing" },
  { id: "acceptable-use", title: "5. Acceptable Use" },
  { id: "data-ownership", title: "6. Data Ownership" },
  { id: "intellectual-property", title: "7. Intellectual Property" },
  { id: "service-availability", title: "8. Service Availability" },
  { id: "limitation-of-liability", title: "9. Limitation of Liability" },
  { id: "termination", title: "10. Termination" },
  { id: "privacy", title: "11. Privacy" },
  { id: "changes-to-terms", title: "12. Changes to Terms" },
  { id: "governing-law", title: "13. Governing Law" },
  { id: "contact", title: "14. Contact Information" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <ShieldIcon />
              <span className="text-xl font-bold text-white">MySDAManager</span>
            </Link>
            <nav className="flex items-center gap-6">
              <Link
                href="/pricing"
                className="text-gray-300 hover:text-white text-sm font-medium transition-colors"
              >
                Pricing
              </Link>
              <Link
                href="/login"
                className="text-gray-300 hover:text-white text-sm font-medium transition-colors"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                Get Started
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-teal-500 hover:text-teal-400 transition-colors mb-8"
        >
          <ArrowLeftIcon />
          Back to home
        </Link>

        {/* Title */}
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
          Terms of Service
        </h1>
        <p className="text-gray-400 text-sm mb-10">
          Last updated: February 2026
        </p>

        {/* Table of Contents */}
        <nav
          aria-label="Table of contents"
          className="bg-gray-800 rounded-xl border border-gray-700 p-6 mb-12"
        >
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
            Table of Contents
          </h2>
          <ol className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {SECTIONS.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="text-sm text-teal-500 hover:text-teal-400 transition-colors"
                >
                  {section.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {/* Legal content */}
        <div className="prose-custom space-y-10">
          {/* Introduction */}
          <p className="text-gray-300 leading-relaxed">
            These Terms of Service (&quot;Terms&quot;) govern your access to and use of the
            MySDAManager platform (&quot;Service&quot;), operated by MySDAManager Pty Ltd
            (ABN pending) (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;), an Australian
            company. By accessing or using the Service, you agree to be bound by these Terms.
          </p>

          {/* 1. Acceptance of Terms */}
          <section id="acceptance">
            <h2 className="text-xl font-bold text-white mb-4">
              1. Acceptance of Terms
            </h2>
            <div className="space-y-3 text-gray-300 leading-relaxed">
              <p>
                By creating an account, accessing, or using MySDAManager, you acknowledge
                that you have read, understood, and agree to be bound by these Terms and
                our <Link href="/privacy" className="text-teal-500 hover:text-teal-400 transition-colors">Privacy Policy</Link>.
                If you are using the Service on behalf of an organisation, you represent
                and warrant that you have authority to bind that organisation to these Terms.
              </p>
              <p>
                If you do not agree to these Terms, you must not access or use the Service.
              </p>
            </div>
          </section>

          {/* 2. Service Description */}
          <section id="service-description">
            <h2 className="text-xl font-bold text-white mb-4">
              2. Service Description
            </h2>
            <div className="space-y-3 text-gray-300 leading-relaxed">
              <p>
                MySDAManager is a cloud-based software platform designed for Australian
                Specialist Disability Accommodation (SDA) providers to manage their
                property portfolios, participant records, compliance obligations,
                maintenance workflows, financial reporting, and related operational
                activities under the National Disability Insurance Scheme (NDIS).
              </p>
              <p>
                The Service includes, but is not limited to:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Property and dwelling management</li>
                <li>NDIS participant record keeping</li>
                <li>Maintenance request tracking and contractor coordination</li>
                <li>Incident reporting and complaints management</li>
                <li>Document management with expiry tracking</li>
                <li>Compliance certification tracking</li>
                <li>Financial reporting and payment tracking</li>
                <li>Property inspections and checklists</li>
                <li>Communications logging and follow-up task management</li>
              </ul>
              <p>
                The Service is provided as a tool to assist with SDA management. It does
                not constitute legal, financial, or compliance advice. You remain solely
                responsible for meeting all NDIS regulatory obligations and requirements
                set by the NDIS Quality and Safeguards Commission.
              </p>
            </div>
          </section>

          {/* 3. Account Registration & Security */}
          <section id="account-registration">
            <h2 className="text-xl font-bold text-white mb-4">
              3. Account Registration and Security
            </h2>
            <div className="space-y-3 text-gray-300 leading-relaxed">
              <p>
                To use the Service, your organisation must register for an account. During
                registration, you must provide accurate, current, and complete information.
                You agree to keep this information up to date.
              </p>
              <p>
                <strong className="text-white">Organisation accounts.</strong> The Service
                operates on an organisation-level model. A designated administrator creates
                the organisation account and manages user access. Users may be assigned
                roles including administrator, property manager, staff, or SIL provider,
                each with different permission levels.
              </p>
              <p>
                <strong className="text-white">Account security.</strong> You are
                responsible for maintaining the confidentiality of all credentials
                associated with your account. You must:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Use strong, unique passwords for each user account</li>
                <li>Enable multi-factor authentication (MFA) where available, particularly for administrator accounts</li>
                <li>Not share login credentials between individuals</li>
                <li>Notify us immediately at <a href="mailto:support@mysdamanager.com" className="text-teal-500 hover:text-teal-400 transition-colors">support@mysdamanager.com</a> if you suspect any unauthorised access</li>
              </ul>
              <p>
                You are liable for all activity that occurs under your organisation&apos;s
                account, whether or not authorised by you.
              </p>
            </div>
          </section>

          {/* 4. Subscription & Billing */}
          <section id="subscription-billing">
            <h2 className="text-xl font-bold text-white mb-4">
              4. Subscription and Billing
            </h2>
            <div className="space-y-3 text-gray-300 leading-relaxed">
              <p>
                <strong className="text-white">Plan tiers.</strong> The Service is offered
                under three subscription plans:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong className="text-white">Starter</strong> -- A$499 per month (up to 10 properties, 5 users)</li>
                <li><strong className="text-white">Professional</strong> -- A$899 per month (up to 25 properties, 15 users)</li>
                <li><strong className="text-white">Enterprise</strong> -- A$1,499 per month (up to 50 properties, unlimited users)</li>
              </ul>
              <p>
                Annual billing is available at a discounted rate. All prices are in
                Australian Dollars (AUD) and are exclusive of GST unless otherwise stated.
              </p>
              <p>
                <strong className="text-white">Free trial.</strong> New organisations may
                be eligible for a 14-day free trial. No credit card is required during the
                trial period. At the end of the trial, you must select a paid plan to
                continue using the Service.
              </p>
              <p>
                <strong className="text-white">Payment processing.</strong> All payments
                are processed securely through Stripe. By providing payment information,
                you authorise us to charge your nominated payment method on a recurring
                basis in accordance with your selected plan.
              </p>
              <p>
                <strong className="text-white">Auto-renewal.</strong> Subscriptions
                automatically renew at the end of each billing period (monthly or
                annually) unless cancelled before the renewal date.
              </p>
              <p>
                <strong className="text-white">Cancellation.</strong> You may cancel your
                subscription at any time through your account settings or by contacting us.
                Upon cancellation:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Access to the Service continues until the end of the current billing period</li>
                <li>No refunds are provided for partial billing periods</li>
                <li>Your data will be retained for 90 days after cancellation, during which you may export your data or reactivate your account</li>
                <li>After 90 days, your data will be permanently deleted in accordance with our <Link href="/privacy" className="text-teal-500 hover:text-teal-400 transition-colors">Privacy Policy</Link></li>
              </ul>
              <p>
                <strong className="text-white">Plan changes.</strong> You may upgrade or
                downgrade your plan at any time. Upgrades take effect immediately with
                pro-rated charges. Downgrades take effect at the start of the next billing
                period.
              </p>
              <p>
                <strong className="text-white">Failed payments.</strong> If a payment
                fails, we will attempt to process it again over a reasonable period. If
                payment cannot be collected, we may suspend or restrict access to the
                Service until the outstanding amount is resolved.
              </p>
            </div>
          </section>

          {/* 5. Acceptable Use */}
          <section id="acceptable-use">
            <h2 className="text-xl font-bold text-white mb-4">
              5. Acceptable Use
            </h2>
            <div className="space-y-3 text-gray-300 leading-relaxed">
              <p>
                You agree to use the Service only for lawful purposes and in accordance
                with these Terms. Specifically, you must:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Use the Service only for managing SDA properties and related NDIS activities</li>
                <li>Enter accurate and truthful data, particularly participant records, financial information, and compliance documentation</li>
                <li>Comply with all applicable Australian laws, including the <em>National Disability Insurance Scheme Act 2013</em>, the <em>Privacy Act 1988</em>, and all NDIS Practice Standards</li>
                <li>Handle all participant data in accordance with the Australian Privacy Principles (APPs)</li>
                <li>Not attempt to gain unauthorised access to the Service, other accounts, or our systems</li>
                <li>Not use the Service to store or transmit malicious code, viruses, or harmful content</li>
                <li>Not reverse-engineer, decompile, or disassemble any part of the Service</li>
                <li>Not resell, sublicense, or redistribute access to the Service without our written consent</li>
                <li>Not use the Service in any manner that could impair its performance or availability for other users</li>
              </ul>
              <p>
                <strong className="text-white">NDIS compliance.</strong> While the Service
                provides tools to assist with NDIS compliance (such as incident reporting
                templates, compliance dashboards, and certification tracking), you are
                solely responsible for ensuring your organisation meets all NDIS regulatory
                requirements. The Service is an operational tool, not a compliance
                guarantee.
              </p>
            </div>
          </section>

          {/* 6. Data Ownership */}
          <section id="data-ownership">
            <h2 className="text-xl font-bold text-white mb-4">
              6. Data Ownership
            </h2>
            <div className="space-y-3 text-gray-300 leading-relaxed">
              <p>
                <strong className="text-white">Your data.</strong> You retain full
                ownership of all data you input into the Service (&quot;Customer
                Data&quot;), including but not limited to property information, participant
                records, financial data, documents, incident reports, and communications
                logs.
              </p>
              <p>
                <strong className="text-white">Licence to us.</strong> By using the
                Service, you grant us a limited, non-exclusive licence to process,
                store, and transmit your Customer Data solely for the purpose of
                providing and improving the Service. We will not access your Customer
                Data except as necessary to provide the Service, respond to support
                requests, or comply with legal obligations.
              </p>
              <p>
                <strong className="text-white">Data export.</strong> You may export your
                Customer Data at any time during your active subscription and for 90 days
                following cancellation. We will provide reasonable assistance with data
                export requests.
              </p>
              <p>
                <strong className="text-white">Aggregated data.</strong> We may collect
                and use anonymised, aggregated data derived from your use of the Service
                for purposes such as improving the platform, generating industry
                benchmarks, and producing statistical reports. This data will never
                identify you, your organisation, or any individual participant.
              </p>
            </div>
          </section>

          {/* 7. Intellectual Property */}
          <section id="intellectual-property">
            <h2 className="text-xl font-bold text-white mb-4">
              7. Intellectual Property
            </h2>
            <div className="space-y-3 text-gray-300 leading-relaxed">
              <p>
                <strong className="text-white">Our property.</strong> The Service,
                including its software, design, branding, documentation, and all
                underlying technology, is owned by MySDAManager Pty Ltd and is protected
                by Australian and international intellectual property laws. Nothing in
                these Terms transfers any ownership of the Service to you.
              </p>
              <p>
                <strong className="text-white">Your content.</strong> You retain all
                intellectual property rights in the content you create, upload, or input
                into the Service. We claim no ownership over your Customer Data.
              </p>
              <p>
                <strong className="text-white">Feedback.</strong> If you provide
                suggestions, feature requests, or other feedback about the Service, you
                grant us the right to use that feedback without restriction or compensation.
              </p>
            </div>
          </section>

          {/* 8. Service Availability */}
          <section id="service-availability">
            <h2 className="text-xl font-bold text-white mb-4">
              8. Service Availability
            </h2>
            <div className="space-y-3 text-gray-300 leading-relaxed">
              <p>
                <strong className="text-white">Best-effort uptime.</strong> We strive to
                maintain high availability of the Service and aim for 99.9% uptime.
                However, unless you are on an Enterprise plan with a separately negotiated
                Service Level Agreement (SLA), we do not guarantee any specific uptime
                percentage.
              </p>
              <p>
                <strong className="text-white">Scheduled maintenance.</strong> We may
                perform scheduled maintenance that temporarily affects the availability of
                the Service. Where possible, we will provide advance notice of scheduled
                maintenance windows and aim to perform maintenance during off-peak hours
                (Australian Eastern Time).
              </p>
              <p>
                <strong className="text-white">Unscheduled downtime.</strong> The Service
                may occasionally experience unscheduled downtime due to factors beyond our
                reasonable control, including but not limited to third-party service
                outages, internet connectivity issues, or force majeure events.
              </p>
              <p>
                <strong className="text-white">Offline capabilities.</strong> The Service
                includes limited offline functionality for critical operations such as
                incident reporting. Data entered while offline will be synchronised
                automatically when connectivity is restored.
              </p>
            </div>
          </section>

          {/* 9. Limitation of Liability */}
          <section id="limitation-of-liability">
            <h2 className="text-xl font-bold text-white mb-4">
              9. Limitation of Liability
            </h2>
            <div className="space-y-3 text-gray-300 leading-relaxed">
              <p>
                To the maximum extent permitted by Australian law, including the
                <em> Australian Consumer Law</em> (Schedule 2 of the <em>Competition and
                Consumer Act 2010</em>):
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>
                  The Service is provided &quot;as is&quot; and &quot;as available&quot;.
                  We make no warranties, express or implied, regarding the suitability of
                  the Service for any particular purpose, except as required by law.
                </li>
                <li>
                  We are not liable for any indirect, incidental, special, consequential,
                  or punitive damages, including but not limited to loss of data, loss of
                  profits, or business interruption, arising from your use of or inability
                  to use the Service.
                </li>
                <li>
                  Our total aggregate liability to you for any claims arising from or
                  related to these Terms or the Service shall not exceed the total fees
                  paid by you to us in the twelve (12) months immediately preceding the
                  event giving rise to the claim.
                </li>
              </ul>
              <p>
                <strong className="text-white">NDIS compliance disclaimer.</strong> We
                are not responsible for any failure by your organisation to meet NDIS
                registration requirements, practice standards, or reporting obligations.
                The Service is a management tool and does not replace professional
                compliance advice. You should seek independent advice regarding your
                specific regulatory obligations.
              </p>
              <p>
                <strong className="text-white">Third-party services.</strong> The Service
                integrates with third-party providers (including Stripe for payments,
                Resend for email, and Convex for data hosting). We are not liable for any
                issues, outages, or data loss caused by these third-party services.
              </p>
              <p>
                Nothing in these Terms excludes or limits any rights you may have under
                the Australian Consumer Law that cannot be excluded or limited by contract.
              </p>
            </div>
          </section>

          {/* 10. Termination */}
          <section id="termination">
            <h2 className="text-xl font-bold text-white mb-4">
              10. Termination
            </h2>
            <div className="space-y-3 text-gray-300 leading-relaxed">
              <p>
                <strong className="text-white">Termination by you.</strong> You may
                terminate your account at any time by cancelling your subscription through
                the account settings or by emailing{" "}
                <a href="mailto:support@mysdamanager.com" className="text-teal-500 hover:text-teal-400 transition-colors">support@mysdamanager.com</a>.
                Cancellation is effective at the end of the current billing period.
              </p>
              <p>
                <strong className="text-white">Termination by us.</strong> We may suspend
                or terminate your access to the Service immediately, without prior notice,
                if:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>You breach these Terms or engage in prohibited conduct</li>
                <li>Your subscription fees remain unpaid for more than 30 days</li>
                <li>We are required to do so by law or a government authority</li>
                <li>We reasonably believe your use of the Service poses a security risk</li>
              </ul>
              <p>
                <strong className="text-white">Effect of termination.</strong> Upon
                termination:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>All user access to the Service will be revoked</li>
                <li>Your Customer Data will be retained for 90 days, during which you may request a data export</li>
                <li>After the 90-day retention period, all Customer Data will be permanently deleted</li>
                <li>Audit logs may be retained for up to 7 years in accordance with NDIS record-keeping requirements</li>
              </ul>
              <p>
                Sections 6 (Data Ownership), 7 (Intellectual Property), 9 (Limitation of
                Liability), and 13 (Governing Law) survive termination.
              </p>
            </div>
          </section>

          {/* 11. Privacy */}
          <section id="privacy">
            <h2 className="text-xl font-bold text-white mb-4">
              11. Privacy
            </h2>
            <div className="space-y-3 text-gray-300 leading-relaxed">
              <p>
                Our collection, use, and handling of personal information is governed by
                our{" "}
                <Link href="/privacy" className="text-teal-500 hover:text-teal-400 transition-colors">
                  Privacy Policy
                </Link>
                , which forms part of these Terms. By using the Service, you consent to
                our collection and use of information as described in the Privacy Policy.
              </p>
              <p>
                Given the nature of the Service, you will be inputting personal and
                sensitive information about NDIS participants. You acknowledge that you
                are responsible for obtaining all necessary consents from participants (or
                their authorised representatives) before entering their information into
                the Service, and for handling that information in compliance with the
                Australian Privacy Principles.
              </p>
            </div>
          </section>

          {/* 12. Changes to Terms */}
          <section id="changes-to-terms">
            <h2 className="text-xl font-bold text-white mb-4">
              12. Changes to Terms
            </h2>
            <div className="space-y-3 text-gray-300 leading-relaxed">
              <p>
                We may update these Terms from time to time. For material changes, we
                will provide at least 30 days&apos; notice by:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Sending an email to the administrator email address on file</li>
                <li>Displaying a prominent notice within the Service</li>
              </ul>
              <p>
                Non-material changes (such as typographical corrections or clarifications
                that do not affect your rights) may be made without notice.
              </p>
              <p>
                Your continued use of the Service after the notice period constitutes
                acceptance of the updated Terms. If you do not agree with the changes,
                you must stop using the Service and cancel your subscription before the
                changes take effect.
              </p>
            </div>
          </section>

          {/* 13. Governing Law */}
          <section id="governing-law">
            <h2 className="text-xl font-bold text-white mb-4">
              13. Governing Law
            </h2>
            <div className="space-y-3 text-gray-300 leading-relaxed">
              <p>
                These Terms are governed by and construed in accordance with the laws
                of New South Wales, Australia. You agree to submit to the exclusive
                jurisdiction of the courts of New South Wales and the Federal Court of
                Australia for any disputes arising from or in connection with these Terms
                or your use of the Service.
              </p>
              <p>
                <strong className="text-white">Dispute resolution.</strong> Before
                commencing legal proceedings, both parties agree to attempt to resolve
                any dispute through good-faith negotiation. If the dispute cannot be
                resolved within 30 days, either party may pursue formal legal remedies.
              </p>
            </div>
          </section>

          {/* 14. Contact Information */}
          <section id="contact">
            <h2 className="text-xl font-bold text-white mb-4">
              14. Contact Information
            </h2>
            <div className="space-y-3 text-gray-300 leading-relaxed">
              <p>
                If you have questions about these Terms, please contact us:
              </p>
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 mt-4">
                <p className="text-white font-semibold mb-2">MySDAManager Pty Ltd</p>
                <ul className="space-y-1.5 text-gray-300">
                  <li>
                    <span className="text-gray-400">Email:</span>{" "}
                    <a href="mailto:support@mysdamanager.com" className="text-teal-500 hover:text-teal-400 transition-colors">
                      support@mysdamanager.com
                    </a>
                  </li>
                  <li>
                    <span className="text-gray-400">Website:</span>{" "}
                    <a href="https://mysdamanager.com" className="text-teal-500 hover:text-teal-400 transition-colors">
                      https://mysdamanager.com
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-gray-400">
              <ShieldIcon />
              <span className="text-sm">MySDAManager</span>
            </div>
            <div className="flex items-center gap-6">
              <Link href="/privacy" className="text-sm text-gray-400 hover:text-white transition-colors">
                Privacy Policy
              </Link>
              <Link href="/pricing" className="text-sm text-gray-400 hover:text-white transition-colors">
                Pricing
              </Link>
              <Link href="/login" className="text-sm text-gray-400 hover:text-white transition-colors">
                Login
              </Link>
            </div>
            <p className="text-sm text-gray-400">
              &copy; {new Date().getFullYear()} MySDAManager Pty Ltd. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
