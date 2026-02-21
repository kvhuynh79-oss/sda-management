import type { Metadata } from "next";
import Link from "next/link";
import {
  generateFAQPageSchema,
  generateBreadcrumbSchema,
} from "@/lib/seo";
import { FaqAccordion } from "@/components/marketing/FaqAccordion";

export const metadata: Metadata = {
  title: "FAQ -- Frequently Asked Questions",
  description:
    "Common questions about MySDAManager, SDA compliance software, pricing, security, and getting started.",
  keywords: [
    "MySDAManager FAQ",
    "SDA software questions",
    "NDIS software FAQ",
  ],
};

/* ──────────────────────────────────────────────────────────────────────
   FAQ Data
   ────────────────────────────────────────────────────────────────────── */

const FAQ_SECTIONS = [
  {
    title: "Product",
    items: [
      {
        question: "What is MySDAManager?",
        answer:
          "MySDAManager is Australia's only purpose-built SDA property management platform. It replaces spreadsheets, shared drives, and generic NDIS tools with one system for properties, participants, compliance, payments, and documents.",
      },
      {
        question: "Who is MySDAManager for?",
        answer:
          "SDA and SIL providers managing 5-50 properties across Australia. If you manage specialist disability accommodation and need to stay audit-ready, MySDAManager was built for you.",
      },
      {
        question: "How is this different from ShiftCare or Brevity?",
        answer:
          "ShiftCare is a rostering tool. Brevity is a billing tool. Neither manages SDA properties, dwellings, owner reporting, or SDA-specific compliance. MySDAManager is the only platform purpose-built for SDA property management.",
      },
      {
        question: "What is the Evidence Vault?",
        answer:
          "Our document management system with automatic expiry tracking, version control, and audit indexing. Every consent form, certification, and compliance document is AES-256 encrypted and instantly retrievable for audits.",
      },
      {
        question: "What is the Compliance Watchdog?",
        answer:
          "An automated alert system that monitors every document expiry, plan renewal, and certification deadline across your entire portfolio. Alerts at 90, 60, and 30 days so nothing slips through the cracks.",
      },
      {
        question: "Does MySDAManager work offline?",
        answer:
          "Yes. Incident reports can be filed offline with photos and automatically sync when connection is restored. Perfect for field staff in areas with poor connectivity.",
      },
      {
        question: "Can I generate NDIS audit packs?",
        answer:
          "Yes. One click generates a complete 7-section NDIS audit evidence pack covering certifications, incidents, complaints, participant plans, document expiry, and audit log integrity.",
      },
      {
        question: "Do you integrate with Xero?",
        answer:
          "Yes. SDA payments, RRC contributions, and provider fees sync to Xero in one click. We also support Google Calendar and Outlook Calendar integration.",
      },
    ],
  },
  {
    title: "Pricing",
    items: [
      {
        question: "How much does MySDAManager cost?",
        answer:
          "Plans start at $499/month (Starter, up to 10 properties). Professional is $899/month (up to 25 properties). Enterprise is $1,499/month (up to 50 properties). All plans include a 14-day free trial.",
      },
      {
        question: "Is there a free trial?",
        answer:
          "Yes. Every plan includes a 14-day free trial with no credit card required. Start at mysdamanager.com/register.",
      },
      {
        question: "Can I change plans later?",
        answer:
          "Yes. Upgrade or downgrade anytime from your settings page. Changes take effect at your next billing cycle.",
      },
      {
        question: "What payment methods do you accept?",
        answer:
          "We accept all major credit and debit cards via Stripe. Australian bank transfers available for annual plans.",
      },
      {
        question: "Is there a setup fee?",
        answer:
          "No. No setup fees, no hidden costs. Your first 14 days are free.",
      },
      {
        question: "What if I cancel?",
        answer:
          "Cancel anytime from your settings. Your data remains accessible for 30 days after cancellation. You can export all your data at any time.",
      },
    ],
  },
  {
    title: "Security",
    items: [
      {
        question: "Is my data encrypted?",
        answer:
          "Yes. We use AES-256-GCM field-level encryption for sensitive data (NDIS numbers, dates of birth, emergency contacts, bank details). HMAC-SHA256 blind indexes enable search without decryption.",
      },
      {
        question: "How is my data protected?",
        answer:
          "All sensitive data is encrypted at rest with AES-256-GCM. We comply with Australian Privacy Principles (APPs) and NDIS Practice Standards, with immutable audit logging, role-based access control, and 72-hour Notifiable Data Breach response.",
      },
      {
        question: "Do you support multi-factor authentication?",
        answer:
          "Yes. TOTP-based MFA via Google Authenticator or Authy, with backup codes. Automatic screen lock after inactivity.",
      },
      {
        question: "Can staff see participant data?",
        answer:
          "Access is controlled by role-based permissions. Five roles (Admin, Property Manager, Staff, Accountant, SIL Provider) with granular access controls on every API endpoint.",
      },
      {
        question: "What happens if there is a data breach?",
        answer:
          "We follow the 72-hour Notifiable Data Breach scheme. Our immutable audit trail and SHA-256 hash chain ensure complete chain of custody.",
      },
    ],
  },
  {
    title: "Getting Started",
    items: [
      {
        question: "How long does setup take?",
        answer:
          "Most providers are up and running within 15 minutes. Our onboarding wizard guides you through creating your first property and adding participants.",
      },
      {
        question: "Can I import existing data?",
        answer:
          "Yes. Import properties, participants, and documents from CSV files during onboarding.",
      },
      {
        question: "Do I need technical skills?",
        answer:
          "No. MySDAManager is designed for SDA providers, not IT teams. If you can use email, you can use MySDAManager.",
      },
      {
        question: "Is there training available?",
        answer:
          "Every plan includes access to our help guides built into the platform. Enterprise plans include dedicated onboarding support.",
      },
      {
        question: "Can my team use it at the same time?",
        answer:
          "Yes. MySDAManager is cloud-based with real-time sync. All team members can work simultaneously.",
      },
    ],
  },
];

/* ──────────────────────────────────────────────────────────────────────
   Page Component (Server Component)
   ────────────────────────────────────────────────────────────────────── */

export default function FaqPage() {
  // Flatten all FAQ items for the JSON-LD schema
  const allFaqs = FAQ_SECTIONS.flatMap((section) =>
    section.items.map((item) => ({
      question: item.question,
      answer: item.answer,
    }))
  );

  const faqSchema = generateFAQPageSchema(allFaqs);
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "FAQ", url: "/faq" },
  ]);

  return (
    <>
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      {/* ================================================================
          Hero
          ================================================================ */}
      <section className="py-16 sm:py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight">
            Frequently asked questions
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto mt-4">
            Everything you need to know about MySDAManager. Can not find what
            you are looking for?{" "}
            <Link
              href="/contact"
              className="text-teal-400 hover:text-teal-300 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded-sm"
            >
              Get in touch
            </Link>
          </p>
        </div>
      </section>

      {/* ================================================================
          FAQ Accordion
          ================================================================ */}
      <section className="pb-20 px-4">
        <div className="max-w-3xl mx-auto">
          <FaqAccordion sections={FAQ_SECTIONS} />
        </div>
      </section>

      {/* ================================================================
          CTA
          ================================================================ */}
      <section className="py-16 px-4 bg-gray-800/30">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
            Still have questions?
          </h2>
          <p className="text-gray-400 mb-8">
            Our team is here to help. Reach out and we will get back to you
            within 24 hours.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center px-8 py-3.5 text-base font-medium text-white bg-teal-600 hover:bg-teal-500 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
            >
              Contact Us
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center justify-center px-8 py-3.5 text-base font-medium text-teal-400 border border-teal-600 hover:bg-teal-600/10 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
