import type { Metadata } from "next";
import Link from "next/link";
import { generateBreadcrumbSchema } from "@/lib/seo";
import { ContactForm } from "@/components/marketing/ContactForm";

export const metadata: Metadata = {
  title: "Contact -- Get in Touch",
  description:
    "Have questions about MySDAManager? Request a demo, get support, or explore partnership opportunities.",
  keywords: [
    "contact MySDAManager",
    "SDA software demo",
    "NDIS software support",
  ],
};

export default function ContactPage() {
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Contact", url: "/contact" },
  ]);

  return (
    <>
      {/* JSON-LD Breadcrumb */}
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
            Get in touch
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto mt-4">
            Have questions about MySDAManager? Request a demo, get support, or
            explore partnership opportunities.
          </p>
        </div>
      </section>

      {/* ================================================================
          Contact Form + Info
          ================================================================ */}
      <section className="pb-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
            {/* Left column - Form (60%) */}
            <div className="lg:col-span-3">
              <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6 sm:p-8">
                <h2 className="text-xl font-semibold text-white mb-6">
                  Send us a message
                </h2>
                <ContactForm />
              </div>
            </div>

            {/* Right column - Info (40%) */}
            <div className="lg:col-span-2 space-y-6">
              {/* Demo CTA card */}
              <div className="bg-gradient-to-br from-teal-900/40 to-gray-800 rounded-xl border border-teal-600/30 p-6 sm:p-8">
                <div className="w-10 h-10 rounded-lg bg-teal-600/10 flex items-center justify-center mb-4">
                  <svg
                    className="w-5 h-5 text-teal-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  Request a Demo
                </h3>
                <p className="text-sm text-gray-400 mb-5 leading-relaxed">
                  See MySDAManager in action. We will walk you through the
                  platform and show you how it works for your specific SDA
                  portfolio.
                </p>
                <Link
                  href="/register"
                  className="inline-flex items-center px-5 py-2.5 text-sm font-medium text-white bg-teal-600 hover:bg-teal-500 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
                >
                  Start Free Trial
                </Link>
              </div>

              {/* Contact info card */}
              <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6 sm:p-8 space-y-5">
                <h3 className="text-lg font-semibold text-white">
                  Contact details
                </h3>

                {/* Email */}
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-gray-700 flex items-center justify-center mt-0.5">
                    <svg
                      className="w-4 h-4 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Email</p>
                    <a
                      href="mailto:hello@mysdamanager.com"
                      className="text-sm text-teal-400 hover:text-teal-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded-sm"
                    >
                      hello@mysdamanager.com
                    </a>
                  </div>
                </div>

                {/* Response time */}
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-gray-700 flex items-center justify-center mt-0.5">
                    <svg
                      className="w-4 h-4 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">
                      Response time
                    </p>
                    <p className="text-sm text-gray-400">
                      We typically respond within 24 hours
                    </p>
                  </div>
                </div>
              </div>

              {/* FAQ link */}
              <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
                <p className="text-sm text-gray-400">
                  Looking for quick answers?{" "}
                  <Link
                    href="/faq"
                    className="text-teal-400 hover:text-teal-300 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded-sm"
                  >
                    Check our FAQ
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
