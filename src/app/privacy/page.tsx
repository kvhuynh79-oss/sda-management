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
  { id: "introduction", title: "1. Introduction" },
  { id: "what-we-collect", title: "2. What We Collect" },
  { id: "how-we-use-information", title: "3. How We Use Your Information" },
  { id: "ndis-data-handling", title: "4. NDIS Data Handling" },
  { id: "how-we-protect-your-data", title: "5. How We Protect Your Data" },
  { id: "where-your-data-is-stored", title: "6. Where Your Data Is Stored" },
  { id: "third-party-services", title: "7. Third-Party Services" },
  { id: "cross-border-transfer", title: "8. Cross-Border Data Transfer" },
  { id: "data-retention", title: "9. Data Retention" },
  { id: "your-rights", title: "10. Your Rights" },
  { id: "cookies-analytics", title: "11. Cookies and Analytics" },
  { id: "childrens-privacy", title: "12. Children's Privacy" },
  { id: "ndis-compliance", title: "13. NDIS Compliance" },
  { id: "changes-to-policy", title: "14. Changes to This Policy" },
  { id: "contact-complaints", title: "15. Contact and Complaints" },
  { id: "effective-date", title: "16. Effective Date" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PrivacyPolicyPage() {
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
          Privacy Policy
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

          {/* 1. Introduction */}
          <section id="introduction">
            <h2 className="text-xl font-bold text-white mb-4">
              1. Introduction
            </h2>
            <div className="space-y-3 text-gray-300 leading-relaxed">
              <p>
                This Privacy Policy explains how MySDAManager Pty Ltd (ABN pending)
                (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) collects, uses,
                stores, and discloses personal information through the MySDAManager
                platform (&quot;Service&quot;), accessible at{" "}
                <a href="https://mysdamanager.com" className="text-teal-500 hover:text-teal-400 transition-colors">
                  https://mysdamanager.com
                </a>.
              </p>
              <p>
                We are committed to protecting the privacy and confidentiality of
                personal information in accordance with the <em>Privacy Act 1988</em>{" "}
                (Cth) and the Australian Privacy Principles (APPs). Given that our
                Service handles information relating to NDIS participants, including
                people with disability, we take particular care to ensure the security
                and appropriate handling of sensitive and personal information.
              </p>
              <p>
                This policy applies to all users of the Service, including organisation
                administrators, property managers, staff members, and any person whose
                personal information is stored within the Service.
              </p>
            </div>
          </section>

          {/* 2. What We Collect */}
          <section id="what-we-collect">
            <h2 className="text-xl font-bold text-white mb-4">
              2. What We Collect
            </h2>
            <div className="space-y-3 text-gray-300 leading-relaxed">
              <p>
                We collect different types of information depending on how you use the Service.
              </p>

              <p className="text-white font-semibold mt-4">
                2.1 Organisation Details
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Organisation name, ABN, and contact details</li>
                <li>Branding preferences (logo, colours) for white-label configuration</li>
                <li>Subscription plan and billing history</li>
              </ul>

              <p className="text-white font-semibold mt-4">
                2.2 User Accounts
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Full names, email addresses, and assigned roles</li>
                <li>Login credentials (passwords are stored as bcrypt hashes with 12 salt rounds -- never in plain text)</li>
                <li>Multi-factor authentication (MFA) configuration</li>
                <li>Session tokens and login timestamps</li>
              </ul>

              <p className="text-white font-semibold mt-4">
                2.3 SDA Property and Participant Data
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Property addresses, dwelling details, and SDA design categories</li>
                <li>Participant names, NDIS numbers, dates of birth, and emergency contacts</li>
                <li>NDIS plan details including funding amounts, plan dates, and support requirements</li>
                <li>Support coordinator, SIL provider, and occupational therapist details</li>
                <li>Owner and investor information, including bank account details for payment distribution</li>
                <li>Maintenance requests, inspection records, incident reports, and complaints</li>
                <li>Photographs attached to inspections, incidents, and maintenance records</li>
                <li>Compliance certifications and uploaded documents</li>
              </ul>

              <p className="text-white font-semibold mt-4">
                2.4 Payment Information
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>SDA payment records, invoices, and MTA claims</li>
                <li>Reasonable Rent Contribution (RRC) calculations</li>
                <li>Subscription billing information (processed and stored by Stripe -- we never store full credit card numbers)</li>
              </ul>

              <p className="text-white font-semibold mt-4">
                2.5 Usage Analytics and Error Logs
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Audit logs of actions performed within the Service (who did what and when)</li>
                <li>Error and crash reports sent to our error monitoring service (personally identifiable information is scrubbed before transmission)</li>
                <li>Device information for push notification delivery</li>
                <li>Browser type, operating system, and general location derived from IP address</li>
              </ul>
            </div>
          </section>

          {/* 3. How We Use Information */}
          <section id="how-we-use-information">
            <h2 className="text-xl font-bold text-white mb-4">
              3. How We Use Your Information
            </h2>
            <div className="space-y-3 text-gray-300 leading-relaxed">
              <p>
                We use the information we collect for the following purposes:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong className="text-white">Providing the Service</strong> -- storing and displaying property, participant, and operational data as directed by you</li>
                <li><strong className="text-white">Authentication and security</strong> -- verifying user identity, managing sessions, and enforcing access controls</li>
                <li><strong className="text-white">Billing and subscription management</strong> -- processing payments, issuing invoices, and managing plan entitlements via Stripe</li>
                <li><strong className="text-white">Notifications</strong> -- sending email and SMS alerts for maintenance, document expiries, compliance deadlines, and other Service-related events</li>
                <li><strong className="text-white">Compliance support</strong> -- generating audit logs, compliance reports, and incident records to assist with NDIS regulatory requirements</li>
                <li><strong className="text-white">AI document analysis</strong> -- analysing uploaded documents (such as NDIS plans and compliance certificates) using AI to extract key information, when you choose to use this feature</li>
                <li><strong className="text-white">Product improvement</strong> -- analysing aggregated and anonymised usage patterns to improve the Service</li>
                <li><strong className="text-white">Customer support</strong> -- responding to enquiries, troubleshooting issues, and providing technical assistance</li>
                <li><strong className="text-white">Legal compliance</strong> -- meeting our obligations under Australian law, including the Privacy Act and NDIS legislation</li>
              </ul>
              <p>
                We will not use personal information for purposes other than those
                described in this policy without your consent, unless required or
                authorised by law (APP 6).
              </p>
            </div>
          </section>

          {/* 4. NDIS Data Handling */}
          <section id="ndis-data-handling">
            <h2 className="text-xl font-bold text-white mb-4">
              4. NDIS Data Handling
            </h2>
            <div className="space-y-3 text-gray-300 leading-relaxed">
              <p>
                The Service is specifically designed for managing NDIS SDA participant
                information, which may include sensitive information as defined under
                the Privacy Act. We apply heightened protections to this data.
              </p>

              <p className="text-white font-semibold mt-4">
                4.1 Sensitive Information (APP 3)
              </p>
              <p>
                NDIS participant data may include health information, disability
                information, and other sensitive information. We only collect such
                information where it is reasonably necessary for the provision of SDA
                management services and where you have obtained appropriate consent from
                participants or their authorised representatives.
              </p>

              <p className="text-white font-semibold mt-4">
                4.2 Data Minimisation
              </p>
              <p>
                We encourage organisations to collect only the minimum amount of
                participant information necessary for SDA management purposes. The
                Service is designed to collect data fields that are relevant to NDIS SDA
                operations and compliance.
              </p>

              <p className="text-white font-semibold mt-4">
                4.3 Your Responsibilities
              </p>
              <p>
                As the organisation using the Service, you are the primary holder of
                participant personal information and bear responsibility for:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Obtaining informed consent from participants (or their authorised representatives) before entering personal information into the Service</li>
                <li>Ensuring the accuracy of participant data</li>
                <li>Providing participants with access to their information upon request</li>
                <li>Complying with the NDIS Code of Conduct regarding participant information</li>
                <li>Notifying the NDIS Quality and Safeguards Commission of reportable incidents in accordance with required timeframes</li>
              </ul>

              <p className="text-white font-semibold mt-4">
                4.4 Incident Data
              </p>
              <p>
                Incident reports and complaints records may contain particularly sensitive
                information. The Service provides secure storage, audit trails, and
                chain-of-custody tracking for this data to support NDIS compliance
                obligations. Incident data is subject to the same security controls as
                all other data within the Service, with additional audit logging for
                regulatory compliance.
              </p>
            </div>
          </section>

          {/* 5. How We Protect Your Data */}
          <section id="how-we-protect-your-data">
            <h2 className="text-xl font-bold text-white mb-4">
              5. How We Protect Your Data
            </h2>
            <div className="space-y-3 text-gray-300 leading-relaxed">
              <p>
                We take reasonable steps to protect personal information from misuse,
                interference, loss, unauthorised access, modification, and disclosure
                (APP 11). Our security measures include:
              </p>

              <p className="text-white font-semibold mt-4">
                5.1 Encryption
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong className="text-white">Encryption in transit:</strong> All data transmitted between your browser and our servers is encrypted using TLS (HTTPS)</li>
                <li><strong className="text-white">Field-level encryption at rest:</strong> NDIS participant personally identifiable information (PII) -- including NDIS numbers, dates of birth, emergency contacts, and bank account numbers -- is encrypted using AES-256-GCM before it is written to the database. This means the stored data is unreadable without your organisation&apos;s encryption keys</li>
              </ul>

              <p className="text-white font-semibold mt-4">
                5.2 Authentication and Access Control
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong className="text-white">Password security:</strong> User passwords are hashed using bcrypt with 12 salt rounds. Plain-text passwords are never stored</li>
                <li><strong className="text-white">Multi-factor authentication (MFA):</strong> TOTP-based MFA (compatible with Google Authenticator and similar apps) is available for administrator accounts, with backup codes for recovery</li>
                <li><strong className="text-white">Role-based access control (RBAC):</strong> Granular permissions based on user roles (administrator, property manager, staff, SIL provider). Each role only has access to the functions and data it needs</li>
                <li><strong className="text-white">Row-level tenant isolation:</strong> Every database record is tagged with an organisation ID. Queries are scoped so that one organisation can never access another organisation&apos;s data</li>
                <li><strong className="text-white">Session management:</strong> Server-side sessions with 24-hour access tokens and 30-day refresh tokens, with automatic expiry</li>
                <li><strong className="text-white">Inactivity lock:</strong> Automatic screen lock after a period of inactivity to protect unattended devices</li>
              </ul>

              <p className="text-white font-semibold mt-4">
                5.3 Audit and Integrity
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong className="text-white">Immutable audit logging:</strong> A comprehensive, tamper-resistant audit trail records all data access and modifications. Each log entry is linked to the previous entry using a SHA-256 hash chain, and integrity is verified automatically every day</li>
                <li><strong className="text-white">Content Security Policy (CSP):</strong> Strict CSP headers prevent cross-site scripting and code injection attacks</li>
                <li><strong className="text-white">Webhook signature verification:</strong> Outbound webhooks are signed with HMAC-SHA256, allowing recipients to verify that payloads have not been tampered with</li>
              </ul>

              <p className="text-white font-semibold mt-4">
                5.4 Data Breach Response
              </p>
              <p>
                In the event of an eligible data breach as defined under Part IIIC of
                the Privacy Act (Notifiable Data Breaches scheme), we will:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Conduct an assessment as soon as practicable, and no later than 30 days, to determine whether the breach is likely to result in serious harm</li>
                <li>Notify the Office of the Australian Information Commissioner (OAIC) and affected individuals within 72 hours of confirming an eligible data breach</li>
                <li>Notify affected organisations so they may fulfil their own notification obligations to participants</li>
                <li>Take reasonable steps to contain the breach and mitigate harm</li>
              </ul>
            </div>
          </section>

          {/* 6. Where Your Data Is Stored */}
          <section id="where-your-data-is-stored">
            <h2 className="text-xl font-bold text-white mb-4">
              6. Where Your Data Is Stored
            </h2>
            <div className="space-y-3 text-gray-300 leading-relaxed">
              <div className="bg-gray-800 rounded-lg border border-teal-700 p-6">
                <p className="text-white font-semibold mb-3">
                  Important: US-hosted infrastructure
                </p>
                <p>
                  MySDAManager uses cloud infrastructure hosted in the United States,
                  including our database provider (Convex), email services (Resend,
                  Postmark), error monitoring (Sentry), and payment processing (Stripe).
                </p>
                <p className="mt-3">
                  All NDIS participant personally identifiable information (PII) is
                  encrypted using AES-256-GCM field-level encryption <strong className="text-white">before
                  it leaves your browser</strong>. This means the data stored on US
                  servers is encrypted and unreadable without your organisation&apos;s
                  encryption keys.
                </p>
                <p className="mt-3">
                  We are actively evaluating Australian-hosted alternatives and will
                  migrate to local hosting when viable options that meet our performance
                  requirements become available.
                </p>
              </div>

              <p className="text-white font-semibold mt-4">
                6.1 Infrastructure Summary
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong className="text-white">Database and backend:</strong> Convex Cloud, a managed serverless database with servers located in the United States</li>
                <li><strong className="text-white">Application hosting:</strong> Vercel, with edge servers distributed globally (primary infrastructure in the United States)</li>
                <li><strong className="text-white">File storage:</strong> Uploaded documents and images are stored in Convex file storage with access controls</li>
              </ul>

              <p className="text-white font-semibold mt-4">
                6.2 What This Means in Practice
              </p>
              <p>
                While our servers are physically located in the United States, the
                sensitive fields that identify NDIS participants (NDIS numbers, dates
                of birth, emergency contact details, and bank account numbers) are
                encrypted with AES-256-GCM before storage. Even if someone gained
                direct access to the database, these fields would appear as
                unreadable ciphertext. Decryption can only occur within our secure
                backend using keys that are not stored alongside the data.
              </p>
            </div>
          </section>

          {/* 7. Third-Party Services */}
          <section id="third-party-services">
            <h2 className="text-xl font-bold text-white mb-4">
              7. Third-Party Services
            </h2>
            <div className="space-y-3 text-gray-300 leading-relaxed">
              <p>
                <strong className="text-white">We do not sell personal information.</strong>{" "}
                We do not sell, rent, or trade personal information to third parties for
                marketing or any other purpose.
              </p>
              <p>
                We share personal information only with the following service providers,
                solely for the purpose of operating the Service:
              </p>

              <div className="overflow-x-auto mt-4">
                <table className="w-full text-sm border border-gray-700 rounded-lg overflow-hidden">
                  <thead>
                    <tr className="bg-gray-800">
                      <th className="text-left px-4 py-3 text-gray-300 font-semibold border-b border-gray-700">Service</th>
                      <th className="text-left px-4 py-3 text-gray-300 font-semibold border-b border-gray-700">Purpose</th>
                      <th className="text-left px-4 py-3 text-gray-300 font-semibold border-b border-gray-700">Data Residency</th>
                      <th className="text-left px-4 py-3 text-gray-300 font-semibold border-b border-gray-700">Data Shared</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-700/50">
                      <td className="px-4 py-3 text-white font-medium">Convex</td>
                      <td className="px-4 py-3">Database and backend</td>
                      <td className="px-4 py-3">United States</td>
                      <td className="px-4 py-3">Encrypted PII, organisation data, uploaded files</td>
                    </tr>
                    <tr className="border-b border-gray-700/50">
                      <td className="px-4 py-3 text-white font-medium">Stripe</td>
                      <td className="px-4 py-3">Payment processing</td>
                      <td className="px-4 py-3">United States</td>
                      <td className="px-4 py-3">Payment details, billing email (PCI-DSS compliant)</td>
                    </tr>
                    <tr className="border-b border-gray-700/50">
                      <td className="px-4 py-3 text-white font-medium">Resend</td>
                      <td className="px-4 py-3">Transactional email</td>
                      <td className="px-4 py-3">United States</td>
                      <td className="px-4 py-3">Email addresses, notification content</td>
                    </tr>
                    <tr className="border-b border-gray-700/50">
                      <td className="px-4 py-3 text-white font-medium">Postmark</td>
                      <td className="px-4 py-3">Inbound email</td>
                      <td className="px-4 py-3">United States</td>
                      <td className="px-4 py-3">Inbound email content</td>
                    </tr>
                    <tr className="border-b border-gray-700/50">
                      <td className="px-4 py-3 text-white font-medium">Twilio</td>
                      <td className="px-4 py-3">SMS notifications</td>
                      <td className="px-4 py-3">United States</td>
                      <td className="px-4 py-3">Phone numbers, SMS content</td>
                    </tr>
                    <tr className="border-b border-gray-700/50">
                      <td className="px-4 py-3 text-white font-medium">Sentry</td>
                      <td className="px-4 py-3">Error monitoring</td>
                      <td className="px-4 py-3">United States</td>
                      <td className="px-4 py-3">Error logs (PII is scrubbed before transmission)</td>
                    </tr>
                    <tr className="border-b border-gray-700/50">
                      <td className="px-4 py-3 text-white font-medium">Anthropic (Claude)</td>
                      <td className="px-4 py-3">AI document analysis</td>
                      <td className="px-4 py-3">United States</td>
                      <td className="px-4 py-3">Document content (encrypted in transit, not used for model training)</td>
                    </tr>
                    <tr className="border-b border-gray-700/50">
                      <td className="px-4 py-3 text-white font-medium">Tawk.to</td>
                      <td className="px-4 py-3">Live chat support</td>
                      <td className="px-4 py-3">Varies</td>
                      <td className="px-4 py-3">Chat messages and contact details you provide</td>
                    </tr>
                    <tr className="border-b border-gray-700/50">
                      <td className="px-4 py-3 text-white font-medium">Google Calendar</td>
                      <td className="px-4 py-3">Calendar scheduling</td>
                      <td className="px-4 py-3">United States</td>
                      <td className="px-4 py-3">Calendar events (if you connect your calendar)</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-white font-medium">Vercel</td>
                      <td className="px-4 py-3">Frontend hosting</td>
                      <td className="px-4 py-3">Edge (US primary)</td>
                      <td className="px-4 py-3">Static assets, API route requests</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p className="mt-4">
                We may also disclose personal information where required or authorised
                by Australian law, including in response to a lawful request from a
                government authority or court order.
              </p>
            </div>
          </section>

          {/* 8. Cross-Border Data Transfer */}
          <section id="cross-border-transfer">
            <h2 className="text-xl font-bold text-white mb-4">
              8. Cross-Border Data Transfer
            </h2>
            <div className="space-y-3 text-gray-300 leading-relaxed">
              <p>
                In accordance with APP 8, we disclose to you that data stored
                in the Service is hosted on servers located in the <strong className="text-white">United States</strong>.
                All ten of our third-party service providers listed in Section 7 operate
                infrastructure in the United States (Tawk.to may also use servers in
                other jurisdictions).
              </p>
              <p>
                We take reasonable steps to ensure that our overseas sub-processors
                handle personal information in a manner consistent with the Australian
                Privacy Principles. This includes:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Selecting sub-processors with robust security practices and certifications (such as SOC 2 compliance)</li>
                <li>Entering into contractual arrangements that require sub-processors to protect personal information</li>
                <li>Reviewing sub-processor security practices periodically</li>
                <li>Encrypting sensitive PII fields before they reach any third-party infrastructure</li>
              </ul>
              <p>
                By using the Service, you acknowledge and consent to the transfer of
                data to the United States for the purposes described in this policy.
                If your organisation requires data to remain within Australia, please
                contact us to discuss available options.
              </p>
            </div>
          </section>

          {/* 9. Data Retention */}
          <section id="data-retention">
            <h2 className="text-xl font-bold text-white mb-4">
              9. Data Retention
            </h2>
            <div className="space-y-3 text-gray-300 leading-relaxed">
              <p>
                We retain personal information in accordance with the following schedule:
              </p>
              <div className="overflow-x-auto mt-4">
                <table className="w-full text-sm border border-gray-700 rounded-lg overflow-hidden">
                  <thead>
                    <tr className="bg-gray-800">
                      <th className="text-left px-4 py-3 text-gray-300 font-semibold border-b border-gray-700">Data Type</th>
                      <th className="text-left px-4 py-3 text-gray-300 font-semibold border-b border-gray-700">Retention Period</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-700/50">
                      <td className="px-4 py-3 text-white font-medium">Active account data</td>
                      <td className="px-4 py-3">Retained for the duration of the active subscription</td>
                    </tr>
                    <tr className="border-b border-gray-700/50">
                      <td className="px-4 py-3 text-white font-medium">Cancelled account data</td>
                      <td className="px-4 py-3">Retained for 90 days after cancellation, then permanently deleted</td>
                    </tr>
                    <tr className="border-b border-gray-700/50">
                      <td className="px-4 py-3 text-white font-medium">Audit logs</td>
                      <td className="px-4 py-3">Retained for 7 years (NDIS record-keeping requirement)</td>
                    </tr>
                    <tr className="border-b border-gray-700/50">
                      <td className="px-4 py-3 text-white font-medium">Incident and complaints records</td>
                      <td className="px-4 py-3">Retained for 7 years (NDIS record-keeping requirement)</td>
                    </tr>
                    <tr className="border-b border-gray-700/50">
                      <td className="px-4 py-3 text-white font-medium">Billing and transaction records</td>
                      <td className="px-4 py-3">Retained for 7 years (Australian tax law requirement)</td>
                    </tr>
                    <tr className="border-b border-gray-700/50">
                      <td className="px-4 py-3 text-white font-medium">Compliance documentation</td>
                      <td className="px-4 py-3">Retained for 7 years (NDIS record-keeping requirement)</td>
                    </tr>
                    <tr className="border-b border-gray-700/50">
                      <td className="px-4 py-3 text-white font-medium">Error monitoring logs (Sentry)</td>
                      <td className="px-4 py-3">Retained for 90 days, then automatically deleted</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-white font-medium">Backup data</td>
                      <td className="px-4 py-3">Retained for 30 days on a rolling basis</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p className="mt-4">
                When data is deleted, we use reasonable measures to ensure it is
                permanently removed from our active systems. Data in backups will be
                overwritten as part of the normal backup rotation cycle.
              </p>
              <p>
                We will not retain personal information longer than is necessary for
                the purposes described in this policy, unless required by law (APP 11.2).
              </p>
            </div>
          </section>

          {/* 10. Your Rights */}
          <section id="your-rights">
            <h2 className="text-xl font-bold text-white mb-4">
              10. Your Rights
            </h2>
            <div className="space-y-3 text-gray-300 leading-relaxed">
              <p>
                Under the Australian Privacy Principles, you have the following rights
                in relation to your personal information:
              </p>

              <p className="text-white font-semibold mt-4">
                10.1 Access Your Data (APP 12)
              </p>
              <p>
                You have the right to request access to the personal information we hold
                about you. Organisation administrators can access and export most data
                directly through the Service using the built-in data export feature
                (Settings &gt; Data Export). For other access requests, please contact
                our Privacy Officer.
              </p>

              <p className="text-white font-semibold mt-4">
                10.2 Correct Your Data (APP 13)
              </p>
              <p>
                You have the right to request correction of personal information that is
                inaccurate, out of date, incomplete, irrelevant, or misleading.
                Organisation administrators can correct most data directly within the
                Service. For other correction requests, please contact our Privacy Officer.
              </p>

              <p className="text-white font-semibold mt-4">
                10.3 Delete Your Data
              </p>
              <p>
                You may request deletion of personal information that is no longer needed
                for the purposes for which it was collected. Please note that we may be
                required to retain certain records (such as audit logs and incident
                reports) for regulatory compliance purposes, even after a deletion request.
              </p>

              <p className="text-white font-semibold mt-4">
                10.4 Export Your Data
              </p>
              <p>
                Active subscribers can export a complete copy of their organisation&apos;s
                data at any time through the Service (Settings &gt; Data Export). The export
                includes all records across all tables in a standard JSON format. After
                account cancellation, data export is available for 90 days.
              </p>

              <p className="text-white font-semibold mt-4">
                10.5 Close Your Account
              </p>
              <p>
                You can cancel your subscription and close your account at any time. After
                cancellation, your data is retained for 90 days (in case you change your
                mind), after which it is permanently deleted. To close your account,
                contact us at{" "}
                <a href="mailto:privacy@mysdamanager.com" className="text-teal-500 hover:text-teal-400 transition-colors">
                  privacy@mysdamanager.com
                </a>.
              </p>

              <p className="text-white font-semibold mt-4">
                10.6 Complain
              </p>
              <p>
                If you believe we have breached the Australian Privacy Principles, you
                may lodge a complaint with us (see Section 15 below) or directly with
                the Office of the Australian Information Commissioner (OAIC):
              </p>
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 mt-2">
                <p className="text-white font-semibold mb-1">Office of the Australian Information Commissioner</p>
                <ul className="space-y-1">
                  <li><span className="text-gray-400">Website:</span>{" "}
                    <a href="https://www.oaic.gov.au" target="_blank" rel="noopener noreferrer" className="text-teal-500 hover:text-teal-400 transition-colors">
                      www.oaic.gov.au
                    </a>
                  </li>
                  <li><span className="text-gray-400">Phone:</span> 1300 363 992</li>
                  <li><span className="text-gray-400">Email:</span>{" "}
                    <a href="mailto:enquiries@oaic.gov.au" className="text-teal-500 hover:text-teal-400 transition-colors">
                      enquiries@oaic.gov.au
                    </a>
                  </li>
                </ul>
              </div>

              <p className="mt-4">
                We will respond to access and correction requests within 30 days. If we
                refuse a request, we will provide written reasons and information about
                how you may complain about the refusal.
              </p>
            </div>
          </section>

          {/* 11. Cookies & Analytics */}
          <section id="cookies-analytics">
            <h2 className="text-xl font-bold text-white mb-4">
              11. Cookies and Analytics
            </h2>
            <div className="space-y-3 text-gray-300 leading-relaxed">
              <p>
                We use a minimal number of cookies, limited to those necessary for the
                operation of the Service:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong className="text-white">Session cookies</strong> -- required for authentication and maintaining your login state</li>
                <li><strong className="text-white">Preference cookies</strong> -- store user preferences such as theme settings and notification preferences</li>
              </ul>
              <p>
                <strong className="text-white">We do not use third-party tracking cookies.</strong>{" "}
                We do not use advertising cookies, social media tracking pixels, or
                third-party analytics services that track individual users across websites.
              </p>
              <p>
                We may collect anonymised, aggregated usage data (such as which features
                are most frequently used) to improve the Service. This data cannot be
                used to identify individual users.
              </p>
            </div>
          </section>

          {/* 12. Children's Privacy */}
          <section id="childrens-privacy">
            <h2 className="text-xl font-bold text-white mb-4">
              12. Children&apos;s Privacy
            </h2>
            <div className="space-y-3 text-gray-300 leading-relaxed">
              <p>
                The Service is designed for use by SDA property providers and their
                staff. It is not directed at, or intended for direct use by, children
                under the age of 18.
              </p>
              <p>
                However, we recognise that NDIS participant records stored within the
                Service may include information about minors who reside in SDA
                properties. Where participant data relates to a child:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Consent for data collection must be obtained from the child&apos;s parent, guardian, or authorised representative</li>
                <li>Such data is handled with the same security protections and access controls as all participant data</li>
                <li>We encourage organisations to apply the principle of data minimisation with particular care to information about minors</li>
              </ul>
            </div>
          </section>

          {/* 13. NDIS Compliance */}
          <section id="ndis-compliance">
            <h2 className="text-xl font-bold text-white mb-4">
              13. NDIS Compliance
            </h2>
            <div className="space-y-3 text-gray-300 leading-relaxed">
              <p>
                MySDAManager is designed to support compliance with the NDIS Practice
                Standards, including the requirements for record-keeping, incident
                management, complaints handling, and participant privacy. The Service
                provides tools such as audit trails, consent workflows, incident
                reporting timelines, and compliance certification tracking to help
                your organisation meet its obligations.
              </p>
              <p>
                <strong className="text-white">However, we do not make regulatory compliance
                guarantees.</strong> Compliance with NDIS Practice Standards, the NDIS
                Code of Conduct, and the NDIS Quality and Safeguards Commission
                requirements is ultimately the responsibility of each registered
                provider. The Service is a tool to assist with compliance, not a
                substitute for your own compliance processes, staff training, and
                professional advice.
              </p>
              <p>
                If you have questions about how the Service supports specific NDIS
                compliance requirements, please contact us at{" "}
                <a href="mailto:support@mysdamanager.com" className="text-teal-500 hover:text-teal-400 transition-colors">
                  support@mysdamanager.com
                </a>.
              </p>
            </div>
          </section>

          {/* 14. Changes to Policy */}
          <section id="changes-to-policy">
            <h2 className="text-xl font-bold text-white mb-4">
              14. Changes to This Policy
            </h2>
            <div className="space-y-3 text-gray-300 leading-relaxed">
              <p>
                We may update this Privacy Policy from time to time to reflect changes
                in our practices, the Service, or legal requirements. For material
                changes, we will provide at least 30 days&apos; notice by:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Sending an email notification to organisation administrators</li>
                <li>Displaying a prominent notice within the Service</li>
              </ul>
              <p>
                Non-material changes (such as formatting corrections or clarifications
                that do not affect your rights) may be made without notice.
              </p>
              <p>
                Your continued use of the Service after the notice period constitutes
                acceptance of the updated policy. If you do not agree with the changes,
                you should stop using the Service and contact us about account
                cancellation.
              </p>
              <p>
                Previous versions of this policy are available upon request.
              </p>
            </div>
          </section>

          {/* 15. Contact & Complaints */}
          <section id="contact-complaints">
            <h2 className="text-xl font-bold text-white mb-4">
              15. Contact and Complaints
            </h2>
            <div className="space-y-3 text-gray-300 leading-relaxed">
              <p>
                If you have any questions about this Privacy Policy, wish to make an
                access or correction request, or want to lodge a privacy complaint,
                please contact our Privacy Officer:
              </p>
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 mt-4">
                <p className="text-white font-semibold mb-2">Privacy Officer</p>
                <p className="text-white mb-3">MySDAManager Pty Ltd</p>
                <ul className="space-y-1.5 text-gray-300">
                  <li>
                    <span className="text-gray-400">Email:</span>{" "}
                    <a href="mailto:privacy@mysdamanager.com" className="text-teal-500 hover:text-teal-400 transition-colors">
                      privacy@mysdamanager.com
                    </a>
                  </li>
                  <li>
                    <span className="text-gray-400">General support:</span>{" "}
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

              <p className="text-white font-semibold mt-6">
                Complaint Process
              </p>
              <ol className="list-decimal pl-6 space-y-1">
                <li>Lodge your complaint in writing to our Privacy Officer at <a href="mailto:privacy@mysdamanager.com" className="text-teal-500 hover:text-teal-400 transition-colors">privacy@mysdamanager.com</a></li>
                <li>We will acknowledge your complaint within 7 business days</li>
                <li>We will investigate and respond within 30 days</li>
                <li>If you are not satisfied with our response, you may escalate your complaint to the OAIC (see Section 10.6 above)</li>
              </ol>
            </div>
          </section>

          {/* 16. Effective Date */}
          <section id="effective-date">
            <h2 className="text-xl font-bold text-white mb-4">
              16. Effective Date
            </h2>
            <div className="space-y-3 text-gray-300 leading-relaxed">
              <p>
                This Privacy Policy is effective as of <strong className="text-white">1 February 2026</strong>.
              </p>
              <p>
                This policy was last reviewed and updated on <strong className="text-white">21 February 2026</strong>.
              </p>
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
              <Link href="/terms" className="text-sm text-gray-400 hover:text-white transition-colors">
                Terms of Service
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
