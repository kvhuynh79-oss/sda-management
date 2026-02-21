"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { trackConversion } from "@/lib/analytics";
import { getAttribution } from "@/hooks/useUtmCapture";

const PROPERTY_OPTIONS = [
  { value: "", label: "Select range" },
  { value: "1-5", label: "1-5 properties" },
  { value: "6-10", label: "6-10 properties" },
  { value: "11-25", label: "11-25 properties" },
  { value: "26-50", label: "26-50 properties" },
  { value: "50+", label: "50+ properties" },
];

export default function BookDemoPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [numberOfProperties, setNumberOfProperties] = useState("");
  const [preferredDateTime, setPreferredDateTime] = useState("");
  const [message, setMessage] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState("");

  const submitDemoRequest = useMutation(api.marketingLeads.submitDemoRequest);

  const canSubmit =
    name.trim().length > 0 && email.trim().length > 0 && !isSubmitting;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const attribution = getAttribution();
      await submitDemoRequest({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        numberOfProperties: numberOfProperties || undefined,
        preferredDateTime: preferredDateTime.trim() || undefined,
        message: message.trim() || undefined,
        // Marketing attribution
        ...(attribution?.utm_source && { utmSource: attribution.utm_source }),
        ...(attribution?.utm_medium && { utmMedium: attribution.utm_medium }),
        ...(attribution?.utm_campaign && { utmCampaign: attribution.utm_campaign }),
        ...(attribution?.utm_content && { utmContent: attribution.utm_content }),
        ...(attribution?.utm_term && { utmTerm: attribution.utm_term }),
        ...(attribution?.gclid && { gclid: attribution.gclid }),
        ...(attribution?.referral_code && { referralCode: attribution.referral_code }),
        ...(attribution?.landing_page && { landingPage: attribution.landing_page }),
      });
      trackConversion({ event: "demo_booking", value: 200, method: "demo_form" });
      setIsSubmitted(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Hero */}
      <section className="py-16 sm:py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight">
            See MySDAManager in Action
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto mt-4 leading-relaxed">
            Book a 15-minute personalised demo with our team. We&apos;ll show
            you how MySDAManager handles your specific SDA compliance workflows.
          </p>
        </div>
      </section>

      {/* Form section */}
      <section className="pb-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
            {/* Left column - Form (60%) */}
            <div className="lg:col-span-3">
              <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6 sm:p-8">
                <h2 className="text-xl font-semibold text-white mb-6">
                  Request your demo
                </h2>

                {isSubmitted ? (
                  <div className="text-center py-8">
                    <div className="flex justify-center mb-4">
                      <div className="w-14 h-14 rounded-full bg-teal-500/10 flex items-center justify-center">
                        <svg
                          className="w-7 h-7 text-teal-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">
                      Demo request received
                    </h3>
                    <p className="text-gray-400 mb-6">
                      Thanks! We&apos;ll be in touch within 24 hours to confirm
                      your demo.
                    </p>
                    <Link
                      href="/features"
                      className="inline-flex items-center px-5 py-2.5 text-sm font-medium text-teal-400 border border-teal-600 hover:bg-teal-600/10 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
                    >
                      Explore Features While You Wait
                    </Link>
                  </div>
                ) : (
                  <form
                    onSubmit={handleSubmit}
                    className="space-y-5"
                    noValidate
                  >
                    {error && (
                      <div
                        className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-400"
                        role="alert"
                      >
                        {error}
                      </div>
                    )}

                    {/* Name */}
                    <div>
                      <label
                        htmlFor="demo-name"
                        className="block text-sm font-medium text-gray-300 mb-1"
                      >
                        Name <span className="text-red-400">*</span>
                      </label>
                      <input
                        id="demo-name"
                        type="text"
                        required
                        autoComplete="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Jane Smith"
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent focus-visible:ring-2 focus-visible:ring-teal-500"
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label
                        htmlFor="demo-email"
                        className="block text-sm font-medium text-gray-300 mb-1"
                      >
                        Email <span className="text-red-400">*</span>
                      </label>
                      <input
                        id="demo-email"
                        type="email"
                        required
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="jane@provider.com.au"
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent focus-visible:ring-2 focus-visible:ring-teal-500"
                      />
                    </div>

                    {/* Phone */}
                    <div>
                      <label
                        htmlFor="demo-phone"
                        className="block text-sm font-medium text-gray-300 mb-1"
                      >
                        Phone{" "}
                        <span className="text-gray-400 font-normal">
                          (optional)
                        </span>
                      </label>
                      <input
                        id="demo-phone"
                        type="tel"
                        autoComplete="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="04XX XXX XXX"
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent focus-visible:ring-2 focus-visible:ring-teal-500"
                      />
                    </div>

                    {/* Number of SDA Properties */}
                    <div>
                      <label
                        htmlFor="demo-properties"
                        className="block text-sm font-medium text-gray-300 mb-1"
                      >
                        Number of SDA Properties
                      </label>
                      <select
                        id="demo-properties"
                        value={numberOfProperties}
                        onChange={(e) => setNumberOfProperties(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent focus-visible:ring-2 focus-visible:ring-teal-500"
                      >
                        {PROPERTY_OPTIONS.map((opt) => (
                          <option
                            key={opt.value}
                            value={opt.value}
                            disabled={!opt.value}
                          >
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Preferred Date/Time */}
                    <div>
                      <label
                        htmlFor="demo-datetime"
                        className="block text-sm font-medium text-gray-300 mb-1"
                      >
                        Preferred Date &amp; Time{" "}
                        <span className="text-gray-400 font-normal">
                          (optional)
                        </span>
                      </label>
                      <input
                        id="demo-datetime"
                        type="text"
                        value={preferredDateTime}
                        onChange={(e) => setPreferredDateTime(e.target.value)}
                        placeholder="e.g. Tuesday 3pm AEST, or any weekday morning"
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent focus-visible:ring-2 focus-visible:ring-teal-500"
                      />
                    </div>

                    {/* Additional notes */}
                    <div>
                      <label
                        htmlFor="demo-message"
                        className="block text-sm font-medium text-gray-300 mb-1"
                      >
                        Anything specific you&apos;d like to see?{" "}
                        <span className="text-gray-400 font-normal">
                          (optional)
                        </span>
                      </label>
                      <textarea
                        id="demo-message"
                        rows={3}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="e.g. compliance reporting, payment tracking, incident management..."
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent focus-visible:ring-2 focus-visible:ring-teal-500 resize-vertical"
                      />
                    </div>

                    {/* Submit */}
                    <button
                      type="submit"
                      disabled={!canSubmit}
                      className="w-full bg-teal-600 hover:bg-teal-500 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
                    >
                      {isSubmitting ? "Submitting..." : "Book My Demo"}
                    </button>

                    <p className="text-sm text-gray-400 text-center">
                      No commitment required. We&apos;ll confirm via email
                      within 24 hours.
                    </p>
                  </form>
                )}
              </div>
            </div>

            {/* Right column - Benefits (40%) */}
            <div className="lg:col-span-2 space-y-6">
              {/* What to expect card */}
              <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6 sm:p-8">
                <h3 className="text-lg font-semibold text-white mb-4">
                  What to expect
                </h3>
                <ul className="space-y-4">
                  {[
                    {
                      icon: (
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      ),
                      title: "15 minutes",
                      description:
                        "Quick, focused walkthrough tailored to your SDA portfolio",
                    },
                    {
                      icon: (
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                      ),
                      title: "Live platform demo",
                      description:
                        "See real features with real data -- not a slideshow",
                    },
                    {
                      icon: (
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      ),
                      title: "Your questions answered",
                      description:
                        "Bring your compliance pain points -- we will show you the solution",
                    },
                    {
                      icon: (
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                      ),
                      title: "No obligation",
                      description:
                        "No sales pressure. Just see if it fits your needs.",
                    },
                  ].map((item) => (
                    <li key={item.title} className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-teal-600/10 flex items-center justify-center mt-0.5">
                        <svg
                          className="w-4 h-4 text-teal-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          {item.icon}
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">
                          {item.title}
                        </p>
                        <p className="text-sm text-gray-400">
                          {item.description}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Social proof */}
              <div className="bg-gradient-to-br from-teal-900/40 to-gray-800 rounded-xl border border-teal-600/30 p-6 sm:p-8">
                <p className="text-gray-300 text-sm leading-relaxed italic">
                  &ldquo;We were managing 12 SDA properties across 4
                  spreadsheets and a shared Google Drive. Within a week of using
                  MySDAManager, everything was in one place and audit-ready.&rdquo;
                </p>
                <p className="mt-3 text-sm text-teal-400 font-medium">
                  -- SDA Provider, NSW
                </p>
              </div>

              {/* Or try free */}
              <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6 text-center">
                <p className="text-sm text-gray-400 mb-3">
                  Prefer to explore on your own?
                </p>
                <Link
                  href="/register"
                  className="inline-flex items-center px-5 py-2.5 text-sm font-medium text-white bg-teal-600 hover:bg-teal-500 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
                >
                  Start 14-Day Free Trial
                </Link>
                <p className="mt-2 text-xs text-gray-400">
                  14 days free, no credit card required
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
