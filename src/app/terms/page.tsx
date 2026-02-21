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
  { id: "agreement", title: "1. Agreement to Terms" },
  { id: "definitions", title: "2. Definitions" },
  { id: "the-service", title: "3. The Service" },
  { id: "your-account", title: "4. Your Account" },
  { id: "subscription-payment", title: "5. Subscription and Payment" },
  { id: "customer-data-privacy", title: "6. Customer Data and Privacy" },
  { id: "acceptable-use", title: "7. Acceptable Use" },
  { id: "intellectual-property", title: "8. Intellectual Property" },
  { id: "warranties-disclaimers", title: "9. Warranties and Disclaimers" },
  { id: "limitation-of-liability", title: "10. Limitation of Liability" },
  { id: "indemnification", title: "11. Indemnification" },
  { id: "term-termination", title: "12. Term and Termination" },
  { id: "changes", title: "13. Changes to These Terms" },
  { id: "governing-law", title: "14. Governing Law" },
  { id: "general", title: "15. General Provisions" },
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
          Last updated: 21 February 2026
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

          {/* 1. Agreement to Terms */}
          <section id="agreement">
            <h2 className="text-xl font-bold text-white mb-4">
              1. Agreement to Terms
            </h2>
            <div className="space-y-3 text-gray-300 leading-relaxed">
              <p>
                By creating an account, subscribing to a plan, or otherwise accessing or using
                MySDAManager, you acknowledge that you have read, understood, and agree to be
                bound by these Terms and our{" "}
                <Link href="/privacy" className="text-teal-500 hover:text-teal-400 transition-colors">
                  Privacy Policy
                </Link>, which forms part of these Terms.
              </p>
              <p>
                If you are using the Service on behalf of an organisation, you represent and
                warrant that you have the authority to bind that organisation to these Terms.
                References to &quot;you&quot; and &quot;your&quot; in these Terms refer to both
                you individually and the organisation you represent.
              </p>
              <p>
                If you do not agree to these Terms, you must not access or use the Service.
              </p>
            </div>
          </section>

          {/* 2. Definitions */}
          <section id="definitions">
            <h2 className="text-xl font-bold text-white mb-4">
              2. Definitions
            </h2>
            <div className="space-y-3 text-gray-300 leading-relaxed">
              <p>
                In these Terms, the following definitions apply:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong className="text-white">&quot;Authorised Users&quot;</strong> means the
                  individuals within your organisation who are permitted to access the Service
                  under your account. The number of Authorised Users is subject to the limits
                  of your Subscription Plan.
                </li>
                <li>
                  <strong className="text-white">&quot;Customer Data&quot;</strong> means all
                  data uploaded, entered, generated, or stored within the Service by you or
                  your Authorised Users, including but not limited to property records,
                  participant records, financial data, documents, incident reports,
                  communications logs, and NDIS Participant Data.
                </li>
                <li>
                  <strong className="text-white">&quot;NDIS Participant Data&quot;</strong> means
                  the sensitive subset of Customer Data relating to NDIS participants, including
                  names, NDIS numbers, dates of birth, disability information, support needs,
                  emergency contacts, and compliance documentation.
                </li>
                <li>
                  <strong className="text-white">&quot;Subscription Plan&quot;</strong> means the
                  tier of Service you have subscribed to: Starter, Professional, or Enterprise,
                  each with defined limits on properties, users, and features as published at{" "}
                  <Link href="/pricing" className="text-teal-500 hover:text-teal-400 transition-colors">
                    /pricing
                  </Link>.
                </li>
                <li>
                  <strong className="text-white">&quot;Subscription Period&quot;</strong> means
                  the recurring billing period for your Subscription Plan, being either monthly
                  or annual as selected by you.
                </li>
              </ul>
            </div>
          </section>

          {/* 3. The Service */}
          <section id="the-service">
            <h2 className="text-xl font-bold text-white mb-4">
              3. The Service
            </h2>
            <div className="space-y-3 text-gray-300 leading-relaxed">
              <p className="text-white font-semibold mt-4">
                3.1 What We Provide
              </p>
              <p>
                MySDAManager is a cloud-based software platform designed for Australian
                Specialist Disability Accommodation (SDA) providers to manage their property
                portfolios, participant records, compliance obligations, maintenance workflows,
                financial reporting, and related operational activities under the National
                Disability Insurance Scheme (NDIS). Key features include:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Property and dwelling management</li>
                <li>NDIS participant record keeping with consent workflows</li>
                <li>Maintenance request tracking and contractor coordination</li>
                <li>Incident reporting and complaints management</li>
                <li>Document management with expiry tracking and AI analysis</li>
                <li>Compliance certification tracking</li>
                <li>Financial reporting, payment tracking, and invoice generation</li>
                <li>Property inspections and checklists</li>
                <li>Communications logging and follow-up task management</li>
                <li>Calendar integration and scheduling</li>
              </ul>

              <p className="text-white font-semibold mt-4">
                3.2 Service Availability
              </p>
              <p>
                We target 99.5% uptime for the Service, excluding periods of scheduled
                maintenance. We will provide reasonable notice before performing scheduled
                maintenance that may affect availability. We are not liable for interruptions
                caused by internet connectivity issues, third-party service outages, or other
                factors beyond our reasonable control.
              </p>

              <p className="text-white font-semibold mt-4">
                3.3 What We Are Not
              </p>
              <div className="bg-gray-800 rounded-lg border border-yellow-700 p-6 mt-2">
                <p className="text-yellow-400 font-semibold mb-3">
                  Important Disclaimer
                </p>
                <p>
                  MySDAManager is a software tool, not a compliance service or legal adviser.
                  While the Service provides tools to assist with NDIS compliance (such as
                  incident reporting templates, compliance dashboards, and certification
                  tracking), <strong className="text-white">we do not guarantee NDIS
                  compliance</strong>.
                </p>
                <p className="mt-3">
                  You remain solely responsible for your own NDIS registration obligations,
                  practice standards, reporting requirements, and regulatory compliance. The
                  Service does not replace professional legal, financial, or compliance advice.
                  You should seek independent professional advice regarding your specific
                  regulatory obligations.
                </p>
              </div>
            </div>
          </section>

          {/* 4. Your Account */}
          <section id="your-account">
            <h2 className="text-xl font-bold text-white mb-4">
              4. Your Account
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
                the organisation account and manages Authorised User access. Users may be
                assigned roles including administrator, property manager, staff, or SIL
                provider, each with different permission levels.
              </p>
              <p>
                <strong className="text-white">Security requirements.</strong> You are
                responsible for maintaining the confidentiality of all credentials associated
                with your account. You must:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Use strong, unique passwords for each user account</li>
                <li>Enable multi-factor authentication (MFA) for all administrator accounts</li>
                <li>Not share login credentials between individuals</li>
                <li>
                  Notify us immediately at{" "}
                  <a href="mailto:support@mysdamanager.com" className="text-teal-500 hover:text-teal-400 transition-colors">
                    support@mysdamanager.com
                  </a>{" "}
                  if you suspect any unauthorised access
                </li>
              </ul>
              <p>
                You are responsible for all activity that occurs under your organisation&apos;s
                account and the actions of your Authorised Users, whether or not authorised by
                you.
              </p>
            </div>
          </section>

          {/* 5. Subscription & Payment */}
          <section id="subscription-payment">
            <h2 className="text-xl font-bold text-white mb-4">
              5. Subscription and Payment
            </h2>
            <div className="space-y-3 text-gray-300 leading-relaxed">
              <p className="text-white font-semibold mt-4">
                5.1 Plans and Pricing
              </p>
              <p>
                The Service is offered under three Subscription Plans, with current pricing
                published at{" "}
                <Link href="/pricing" className="text-teal-500 hover:text-teal-400 transition-colors">
                  /pricing
                </Link>:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong className="text-white">Starter</strong> — A$499 per month (up to 10 properties, 5 users)</li>
                <li><strong className="text-white">Professional</strong> — A$899 per month (up to 25 properties, 15 users)</li>
                <li><strong className="text-white">Enterprise</strong> — A$1,499 per month (up to 50 properties, unlimited users)</li>
              </ul>
              <p>
                Annual billing is available at a discounted rate. We will provide at least
                30 days&apos; written notice before any increase to subscription prices.
              </p>

              <p className="text-white font-semibold mt-4">
                5.2 Free Trial
              </p>
              <p>
                New organisations may be eligible for a 14-day free trial. No credit card is
                required during the trial period. At the end of the trial, your account will
                be downgraded to read-only access unless you subscribe to a paid plan. You
                will not be charged without your explicit consent.
              </p>

              <p className="text-white font-semibold mt-4">
                5.3 Payment Terms
              </p>
              <p>
                Subscriptions are billed in advance on a recurring basis (monthly or annual)
                in Australian Dollars (AUD). All prices are exclusive of GST unless otherwise
                stated. Payments are processed securely by Stripe — we do not store your
                credit card details.
              </p>
              <p>
                If a payment fails, we will notify you and provide 14 days to remedy the
                failed payment. If payment is not received within 14 days, we may suspend
                access to the Service until the outstanding amount is resolved.
              </p>

              <p className="text-white font-semibold mt-4">
                5.4 Cancellation and Refunds
              </p>
              <p>
                You may cancel your subscription at any time through your account settings
                or by contacting us. Upon cancellation:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong className="text-white">Monthly subscriptions:</strong> No partial refunds are provided. Access continues until the end of the current billing period.</li>
                <li><strong className="text-white">Annual subscriptions:</strong> A pro-rata refund may be requested within the first 30 days of the annual term. After 30 days, no refunds are provided and access continues until the end of the annual period.</li>
                <li>Your data will be retained for 90 days after cancellation, during which you may export your data or reactivate your account.</li>
                <li>After 90 days, your data will be permanently deleted in accordance with our <Link href="/privacy" className="text-teal-500 hover:text-teal-400 transition-colors">Privacy Policy</Link>.</li>
              </ul>
              <p className="mt-2 text-gray-400 italic">
                These refund terms do not limit your rights under the Australian Consumer Law.
              </p>
            </div>
          </section>

          {/* 6. Customer Data & Privacy */}
          <section id="customer-data-privacy">
            <h2 className="text-xl font-bold text-white mb-4">
              6. Customer Data and Privacy
            </h2>
            <div className="space-y-3 text-gray-300 leading-relaxed">
              <p className="text-white font-semibold mt-4">
                6.1 Data Ownership
              </p>
              <p>
                You retain all ownership rights in your Customer Data. By using the Service,
                you grant us a limited, non-exclusive licence to host, process, store, and
                transmit your Customer Data solely for the purpose of providing the Service.
                We will not access your Customer Data except as necessary to provide the
                Service, respond to support requests, or comply with legal obligations.
              </p>

              <p className="text-white font-semibold mt-4">
                6.2 Data Security
              </p>
              <p>
                We implement the following security measures to protect your Customer Data:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong className="text-white">AES-256-GCM field-level encryption</strong> on NDIS Participant Data (NDIS numbers, dates of birth, emergency contacts, bank account numbers)</li>
                <li><strong className="text-white">Multi-factor authentication (MFA)</strong> for administrator accounts</li>
                <li><strong className="text-white">Role-based access control (RBAC)</strong> with granular permissions per role</li>
                <li><strong className="text-white">Row-level tenant isolation</strong> ensuring one organisation cannot access another&apos;s data</li>
                <li><strong className="text-white">SHA-256 hash-chained audit logging</strong> with daily integrity verification</li>
                <li><strong className="text-white">Bcrypt password hashing</strong> (12 salt rounds)</li>
                <li><strong className="text-white">Content Security Policy (CSP) headers</strong> to prevent code injection</li>
              </ul>

              <p className="text-white font-semibold mt-4">
                6.3 Data Hosting
              </p>
              <div className="bg-gray-800 rounded-lg border border-teal-700 p-6 mt-2">
                <p className="text-white font-semibold mb-3">
                  Important: US-hosted infrastructure
                </p>
                <p>
                  The Service uses cloud infrastructure hosted in the United States, including
                  our database provider (Convex), payment processor (Stripe), and email services
                  (Resend, Postmark). All NDIS Participant Data is encrypted using AES-256-GCM
                  field-level encryption before it is transmitted to our servers. This means the
                  stored data is unreadable without the encryption keys. See our{" "}
                  <Link href="/privacy" className="text-teal-500 hover:text-teal-400 transition-colors">
                    Privacy Policy
                  </Link>{" "}
                  for a full list of third-party service providers and their data residency.
                </p>
              </div>

              <p className="text-white font-semibold mt-4">
                6.4 Data Export
              </p>
              <p>
                You may export a complete copy of your Customer Data at any time during your
                active subscription through the built-in data export feature (Settings &gt;
                Data Export). Following account cancellation, data export is available for 90
                days. You may also request a data export in writing, which we will fulfil
                within 30 days.
              </p>

              <p className="text-white font-semibold mt-4">
                6.5 Data Deletion
              </p>
              <p>
                After termination or cancellation, Customer Data is retained for 90 days and
                then permanently deleted. If you require immediate deletion of your Customer
                Data before the 90-day retention period expires, you may request this in
                writing and we will action it within a reasonable timeframe, subject to any
                legal retention obligations (such as audit logs and incident records, which
                may be retained for up to 7 years under NDIS requirements).
              </p>

              <p className="text-white font-semibold mt-4">
                6.6 Privacy
              </p>
              <p>
                Our collection, use, and handling of personal information is governed by our{" "}
                <Link href="/privacy" className="text-teal-500 hover:text-teal-400 transition-colors">
                  Privacy Policy
                </Link>, which forms part of these Terms. You acknowledge that you are
                responsible for obtaining all necessary consents from NDIS participants (or
                their authorised representatives) before entering their information into the
                Service.
              </p>
            </div>
          </section>

          {/* 7. Acceptable Use */}
          <section id="acceptable-use">
            <h2 className="text-xl font-bold text-white mb-4">
              7. Acceptable Use
            </h2>
            <div className="space-y-3 text-gray-300 leading-relaxed">
              <p>
                You agree to use the Service only for lawful purposes and in accordance with
                these Terms. You must not:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Use the Service for any purpose other than managing SDA properties and related NDIS activities</li>
                <li>Attempt to gain unauthorised access to the Service, other accounts, or our systems</li>
                <li>Use the Service to store or transmit malicious code, viruses, or harmful content</li>
                <li>Reverse-engineer, decompile, or disassemble any part of the Service</li>
                <li>Resell, sublicense, or redistribute access to the Service without our written consent</li>
                <li>Scrape, harvest, or systematically extract data from the Service</li>
                <li>Use the Service in any manner that could impair its performance, overload infrastructure, or affect availability for other users</li>
              </ul>
              <p>
                You must enter accurate and truthful data, particularly participant records,
                financial information, and compliance documentation, and comply with all
                applicable Australian laws including the <em>National Disability Insurance
                Scheme Act 2013</em>, the <em>Privacy Act 1988</em>, and all NDIS Practice
                Standards.
              </p>
            </div>
          </section>

          {/* 8. Intellectual Property */}
          <section id="intellectual-property">
            <h2 className="text-xl font-bold text-white mb-4">
              8. Intellectual Property
            </h2>
            <div className="space-y-3 text-gray-300 leading-relaxed">
              <p className="text-white font-semibold mt-4">
                8.1 Our Intellectual Property
              </p>
              <p>
                The Service, including its software, design, branding, documentation, and all
                underlying technology, is owned by MySDAManager Pty Ltd and is protected by
                Australian and international intellectual property laws. Subject to these Terms,
                we grant you a limited, non-exclusive, non-transferable, revocable licence to
                access and use the Service for the duration of your Subscription Period. Nothing
                in these Terms transfers ownership of the Service to you.
              </p>

              <p className="text-white font-semibold mt-4">
                8.2 Your Intellectual Property
              </p>
              <p>
                You retain all intellectual property rights in your Customer Data. We claim
                no ownership over any content you create, upload, or input into the Service.
              </p>

              <p className="text-white font-semibold mt-4">
                8.3 Feedback
              </p>
              <p>
                If you provide suggestions, feature requests, or other feedback about the
                Service, you grant us a non-exclusive, royalty-free, worldwide licence to use,
                modify, and incorporate that feedback into the Service. You are under no
                obligation to provide feedback.
              </p>
            </div>
          </section>

          {/* 9. Warranties & Disclaimers */}
          <section id="warranties-disclaimers">
            <h2 className="text-xl font-bold text-white mb-4">
              9. Warranties and Disclaimers
            </h2>
            <div className="space-y-3 text-gray-300 leading-relaxed">
              <p className="text-white font-semibold mt-4">
                9.1 Our Warranty
              </p>
              <p>
                We warrant that the Service will be provided with reasonable care and skill,
                and will perform materially in accordance with its published documentation.
              </p>

              <p className="text-white font-semibold mt-4">
                9.2 Disclaimer
              </p>
              <p>
                Subject to Section 9.3 below, the Service is provided &quot;as is&quot; and
                &quot;as available&quot;. We do not warrant that the Service will be
                uninterrupted, error-free, or free from vulnerabilities.
              </p>
              <p>
                We do not warrant that outputs generated by the Service — including SDA
                quotations, NDIS claims CSV exports, compliance reports, inspection PDFs, and
                invoice documents — are accurate or complete. You are responsible for
                reviewing and verifying all outputs before relying on them for compliance,
                financial, or operational purposes.
              </p>

              {/* ACL Callout Box */}
              <div className="bg-teal-900/30 rounded-lg border border-teal-600 p-6 mt-4">
                <p className="text-teal-400 font-semibold mb-3">
                  9.3 Australian Consumer Law
                </p>
                <p>
                  Nothing in these Terms excludes, restricts, or modifies any consumer
                  guarantee, right, or remedy conferred on you by the{" "}
                  <em>Australian Consumer Law</em> (Schedule 2 of the{" "}
                  <em>Competition and Consumer Act 2010</em>) or any other applicable law
                  that cannot be excluded or limited by contract.
                </p>
                <p className="mt-3">
                  Our liability for failure to comply with a consumer guarantee is limited,
                  to the extent permitted by law, to:
                </p>
                <ol className="list-[lower-alpha] pl-6 space-y-1 mt-2">
                  <li>the supply of the services again; or</li>
                  <li>the payment of the cost of having the services supplied again.</li>
                </ol>
              </div>
            </div>
          </section>

          {/* 10. Limitation of Liability */}
          <section id="limitation-of-liability">
            <h2 className="text-xl font-bold text-white mb-4">
              10. Limitation of Liability
            </h2>
            <div className="space-y-3 text-gray-300 leading-relaxed">
              <p className="text-white font-semibold mt-4">
                10.1 Liability Cap
              </p>
              <p>
                To the maximum extent permitted by law, our total aggregate liability to you
                for any and all claims arising from or related to these Terms or the Service
                shall not exceed the total fees paid by you to us in the twelve (12) months
                immediately preceding the event giving rise to the claim.
              </p>

              <p className="text-white font-semibold mt-4">
                10.2 Exclusion of Indirect Damages
              </p>
              <p>
                To the maximum extent permitted by law, we are not liable for any indirect,
                incidental, special, consequential, or punitive damages, including but not
                limited to:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Loss of profits, revenue, or business opportunity</li>
                <li>Loss of data or corruption of data</li>
                <li>Business interruption or loss of goodwill</li>
                <li>Loss of or failure to maintain NDIS registration</li>
                <li>Penalties, fines, or costs imposed by any regulatory authority</li>
              </ul>
              <p>
                regardless of whether we were advised of the possibility of such damages.
              </p>

              <p className="text-white font-semibold mt-4">
                10.3 Exceptions
              </p>
              <p>
                The limitations in Sections 10.1 and 10.2 do not apply to:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>(a) rights and remedies that cannot be excluded under the Australian Consumer Law (see Section 9.3)</li>
                <li>(b) liability arising from our wilful misconduct or fraud</li>
                <li>(c) your obligation to pay fees owed under these Terms</li>
              </ul>
            </div>
          </section>

          {/* 11. Indemnification */}
          <section id="indemnification">
            <h2 className="text-xl font-bold text-white mb-4">
              11. Indemnification
            </h2>
            <div className="space-y-3 text-gray-300 leading-relaxed">
              <p>
                You agree to indemnify, defend, and hold harmless MySDAManager Pty Ltd, its
                officers, directors, employees, and agents from and against any claims,
                liabilities, damages, losses, and expenses (including reasonable legal fees)
                arising from or related to:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Your breach of these Terms or violation of applicable law</li>
                <li>Unauthorised use of the Service by your Authorised Users or through your account</li>
                <li>Your failure to obtain required consents from NDIS participants or their representatives, or any other violation of participant privacy</li>
                <li>Any claim that your Customer Data infringes or misappropriates a third party&apos;s intellectual property rights</li>
              </ul>
            </div>
          </section>

          {/* 12. Term & Termination */}
          <section id="term-termination">
            <h2 className="text-xl font-bold text-white mb-4">
              12. Term and Termination
            </h2>
            <div className="space-y-3 text-gray-300 leading-relaxed">
              <p className="text-white font-semibold mt-4">
                12.1 Commencement
              </p>
              <p>
                These Terms commence on the date you create an account and continue for the
                duration of your use of the Service.
              </p>

              <p className="text-white font-semibold mt-4">
                12.2 Cancellation by You
              </p>
              <p>
                You may cancel your subscription at any time through your account settings
                or by emailing{" "}
                <a href="mailto:support@mysdamanager.com" className="text-teal-500 hover:text-teal-400 transition-colors">
                  support@mysdamanager.com
                </a>. Cancellation is effective at the end of the current paid Subscription
                Period.
              </p>

              <p className="text-white font-semibold mt-4">
                12.3 Termination by Us
              </p>
              <p>
                We may suspend or terminate your access to the Service if:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong className="text-white">Material breach:</strong> You materially breach these Terms and fail to remedy the breach within 14 days of written notice</li>
                <li><strong className="text-white">Non-payment:</strong> Your subscription fees remain unpaid for more than 30 days</li>
                <li><strong className="text-white">Insolvency:</strong> Your organisation becomes insolvent, enters administration, or has a receiver appointed</li>
                <li><strong className="text-white">Security risk:</strong> We reasonably believe your use of the Service poses a security risk to the Service or other customers</li>
                <li><strong className="text-white">Legal requirement:</strong> We are required to do so by law or a government authority</li>
              </ul>

              <p className="text-white font-semibold mt-4">
                12.4 Effect of Termination
              </p>
              <p>
                Upon termination:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>All Authorised User access to the Service will be immediately revoked</li>
                <li>Your Customer Data will be retained for 90 days, during which you may request a data export</li>
                <li>After the 90-day retention period, all Customer Data will be permanently deleted</li>
                <li>Audit logs and incident records may be retained for up to 7 years in accordance with NDIS record-keeping requirements</li>
                <li>Any outstanding fees become immediately due and payable</li>
              </ul>
              <p>
                The following sections survive termination: Section 6 (Customer Data and
                Privacy), Section 8 (Intellectual Property), Section 9 (Warranties and
                Disclaimers), Section 10 (Limitation of Liability), Section 11
                (Indemnification), and Section 14 (Governing Law).
              </p>
            </div>
          </section>

          {/* 13. Changes */}
          <section id="changes">
            <h2 className="text-xl font-bold text-white mb-4">
              13. Changes to These Terms
            </h2>
            <div className="space-y-3 text-gray-300 leading-relaxed">
              <p>
                We may update these Terms from time to time. For material changes, we will
                provide at least 30 days&apos; notice by:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Sending an email to the administrator email address on file</li>
                <li>Displaying a prominent notice within the Service</li>
              </ul>
              <p>
                Non-material changes (such as typographical corrections or clarifications that
                do not affect your rights) may be made without notice.
              </p>
              <p>
                Your continued use of the Service after the notice period constitutes
                acceptance of the updated Terms. If you do not agree with the changes, you
                must stop using the Service and cancel your subscription before the changes
                take effect.
              </p>
            </div>
          </section>

          {/* 14. Governing Law */}
          <section id="governing-law">
            <h2 className="text-xl font-bold text-white mb-4">
              14. Governing Law
            </h2>
            <div className="space-y-3 text-gray-300 leading-relaxed">
              <p>
                These Terms are governed by and construed in accordance with the laws of
                New South Wales, Australia. Both parties submit to the non-exclusive
                jurisdiction of the courts of New South Wales and the Federal Court of
                Australia for any disputes arising from or in connection with these Terms.
              </p>
              <p>
                <strong className="text-white">Dispute resolution.</strong> Before commencing
                formal legal proceedings, both parties agree to attempt to resolve any dispute
                through the following process:
              </p>
              <ol className="list-decimal pl-6 space-y-1">
                <li><strong className="text-white">Negotiation (30 days):</strong> The parties will attempt to resolve the dispute through good-faith negotiation, commencing with written notice of the dispute.</li>
                <li><strong className="text-white">Mediation (60 days):</strong> If the dispute is not resolved through negotiation, the parties will submit the dispute to mediation administered by the Australian Disputes Centre (ADC), or another mutually agreed mediator, with each party bearing its own costs.</li>
                <li><strong className="text-white">Court proceedings:</strong> If the dispute is not resolved through mediation, either party may commence court proceedings.</li>
              </ol>
              <p>
                Nothing in this Section prevents either party from seeking urgent interlocutory
                relief from a court.
              </p>
            </div>
          </section>

          {/* 15. General Provisions */}
          <section id="general">
            <h2 className="text-xl font-bold text-white mb-4">
              15. General Provisions
            </h2>
            <div className="space-y-3 text-gray-300 leading-relaxed">
              <p>
                <strong className="text-white">Entire agreement.</strong> These Terms,
                together with the Privacy Policy and any Subscription Plan details, constitute
                the entire agreement between you and MySDAManager Pty Ltd regarding the Service
                and supersede all prior agreements, negotiations, and representations.
              </p>
              <p>
                <strong className="text-white">Severability.</strong> If any provision of
                these Terms is found to be invalid, illegal, or unenforceable, the remaining
                provisions will continue in full force and effect. The invalid provision will
                be modified to the minimum extent necessary to make it valid and enforceable.
              </p>
              <p>
                <strong className="text-white">Waiver.</strong> Our failure to enforce any
                right or provision of these Terms does not constitute a waiver of that right
                or provision.
              </p>
              <p>
                <strong className="text-white">Assignment.</strong> You may not assign or
                transfer these Terms, or any rights or obligations under them, without our
                prior written consent. We may assign these Terms in connection with a merger,
                acquisition, corporate reorganisation, or sale of all or substantially all of
                our assets, provided the assignee agrees to be bound by these Terms.
              </p>
              <p>
                <strong className="text-white">Force majeure.</strong> Neither party is liable
                for failure to perform its obligations under these Terms (other than payment
                obligations) where such failure results from circumstances beyond its
                reasonable control, including but not limited to natural disasters, pandemic,
                government action, internet outages, third-party service failures, and
                cyberattacks.
              </p>
              <p>
                <strong className="text-white">Notices.</strong> All notices under these Terms
                must be in writing and will be deemed given when sent by email to the
                administrator email address on file (for notices to you) or to{" "}
                <a href="mailto:legal@mysdamanager.com" className="text-teal-500 hover:text-teal-400 transition-colors">
                  legal@mysdamanager.com
                </a>{" "}
                (for notices to us). Either party may update its notice address by written
                notice to the other.
              </p>
            </div>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-xl font-bold text-white mb-4">
              Contact Information
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
                    <span className="text-gray-400">Legal:</span>{" "}
                    <a href="mailto:legal@mysdamanager.com" className="text-teal-500 hover:text-teal-400 transition-colors">
                      legal@mysdamanager.com
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
