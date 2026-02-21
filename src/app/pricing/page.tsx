"use client";

import { useState } from "react";
import Link from "next/link";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";

// ---------------------------------------------------------------------------
// Types & Data
// ---------------------------------------------------------------------------

type BillingPeriod = "monthly" | "annual";

interface PlanFeature {
  text: string;
  included: boolean;
}

interface PricingPlan {
  id: "starter" | "professional" | "enterprise";
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  description: string;
  features: PlanFeature[];
  highlighted?: boolean;
  badge?: string;
  propertyLimit: string;
  userLimit: string;
}

const PLANS: PricingPlan[] = [
  {
    id: "starter",
    name: "Starter",
    monthlyPrice: 499,
    annualPrice: 4990,
    description: "Perfect for small SDA providers getting started.",
    propertyLimit: "Up to 10 properties",
    userLimit: "Up to 5 users",
    features: [
      { text: "Property & dwelling management", included: true },
      { text: "Participant management", included: true },
      { text: "Maintenance tracking", included: true },
      { text: "Incident reporting", included: true },
      { text: "Document management", included: true },
      { text: "Email support", included: true },
      { text: "Inspections & checklists", included: false },
      { text: "Advanced reports", included: false },
      { text: "API access", included: false },
      { text: "Xero integration", included: false },
      { text: "Dedicated support", included: false },
    ],
  },
  {
    id: "professional",
    name: "Professional",
    monthlyPrice: 899,
    annualPrice: 8990,
    description: "For growing providers who need more power.",
    propertyLimit: "Up to 25 properties",
    userLimit: "Up to 15 users",
    features: [
      { text: "Property & dwelling management", included: true },
      { text: "Participant management", included: true },
      { text: "Maintenance tracking", included: true },
      { text: "Incident reporting", included: true },
      { text: "Document management", included: true },
      { text: "Priority support", included: true },
      { text: "Inspections & checklists", included: true },
      { text: "Advanced reports", included: true },
      { text: "API access", included: false },
      { text: "Xero integration", included: false },
      { text: "Dedicated support", included: false },
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    monthlyPrice: 1499,
    annualPrice: 14990,
    description: "Full-featured solution for established providers.",
    propertyLimit: "Up to 50 properties",
    userLimit: "Unlimited users",
    highlighted: true,
    badge: "Most Popular",
    features: [
      { text: "Property & dwelling management", included: true },
      { text: "Participant management", included: true },
      { text: "Maintenance tracking", included: true },
      { text: "Incident reporting", included: true },
      { text: "Document management", included: true },
      { text: "Dedicated support", included: true },
      { text: "Inspections & checklists", included: true },
      { text: "Advanced reports", included: true },
      { text: "API access", included: true },
      { text: "Xero integration", included: true },
      { text: "Dedicated account manager", included: true },
    ],
  },
];

// FAQ data
interface FaqItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    question: "How long is the free trial?",
    answer:
      "14 days, no credit card required. You get full access to all features in your chosen plan during the trial period.",
  },
  {
    question: "Can I change plans later?",
    answer:
      "Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately and billing is prorated.",
  },
  {
    question: "What payment methods do you accept?",
    answer:
      "All major credit and debit cards via Stripe, including Visa, Mastercard, and American Express.",
  },
  {
    question: "Is there a setup fee?",
    answer:
      "No setup fees, no hidden costs. The price you see is the price you pay.",
  },
  {
    question: "Can I cancel anytime?",
    answer:
      "Yes, you can cancel your subscription at any time. Your data will remain available for 30 days after cancellation.",
  },
  {
    question: "What's included in the free trial?",
    answer:
      "Full access to all features in your chosen plan. No restrictions, no watermarks, no limitations.",
  },
  {
    question: "Do you offer discounts for annual billing?",
    answer:
      "Yes, save two months (17%) when you choose annual billing. Toggle the billing switch above to see annual pricing.",
  },
  {
    question: "Do you offer a not-for-profit discount?",
    answer:
      "Contact us for special pricing for registered charities and not-for-profits. We are committed to supporting organisations that serve the disability community.",
  },
];

// Real operational metrics
interface MetricCard {
  headline: string;
  description: string;
  icon: "clock" | "fileCheck" | "grid";
}

const METRICS: MetricCard[] = [
  {
    headline: "30 min → 5 seconds",
    description:
      "SDA quotations reduced from 30–60 minutes of manual work to seconds with automated calculations.",
    icon: "clock",
  },
  {
    headline: "Claims in seconds",
    description:
      "NDIS CSV claims processing cut from 15–30 minutes of spreadsheet wrangling to a single click.",
    icon: "fileCheck",
  },
  {
    headline: "60+ features",
    description:
      "Across 12 SDA-specific workflows — property, participant, compliance, maintenance, inspections, and more.",
    icon: "grid",
  },
];

// Feature comparison rows for the table
const COMPARISON_CATEGORIES = [
  {
    name: "Core Features",
    features: [
      { name: "Properties", starter: "10", professional: "25", enterprise: "50" },
      { name: "Users", starter: "5", professional: "15", enterprise: "Unlimited" },
      { name: "Participant management", starter: true, professional: true, enterprise: true },
      { name: "Maintenance tracking", starter: true, professional: true, enterprise: true },
      { name: "Incident reporting", starter: true, professional: true, enterprise: true },
      { name: "Document storage", starter: "1 GB", professional: "10 GB", enterprise: "50 GB" },
    ],
  },
  {
    name: "Compliance & Reporting",
    features: [
      { name: "NDIS compliance dashboard", starter: true, professional: true, enterprise: true },
      { name: "Inspections & checklists", starter: false, professional: true, enterprise: true },
      { name: "Advanced reports", starter: false, professional: true, enterprise: true },
      { name: "Complaints management", starter: true, professional: true, enterprise: true },
      { name: "Audit logging", starter: false, professional: true, enterprise: true },
    ],
  },
  {
    name: "Integrations & Support",
    features: [
      { name: "Email notifications", starter: true, professional: true, enterprise: true },
      { name: "SMS notifications", starter: false, professional: true, enterprise: true },
      { name: "Xero accounting", starter: false, professional: false, enterprise: true },
      { name: "REST API access", starter: false, professional: false, enterprise: true },
      { name: "Support level", starter: "Email", professional: "Priority", enterprise: "Dedicated" },
    ],
  },
];

// ---------------------------------------------------------------------------
// Icons (inline SVG to avoid external dependencies)
// ---------------------------------------------------------------------------

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "h-5 w-5"} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "h-5 w-5"} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function CreditCardIcon() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
    </svg>
  );
}

function MetricClockIcon() {
  return (
    <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function FileCheckIcon() {
  return (
    <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.125 2.25h-4.5c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9.375-9z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 15l2.25 2.25L15.75 12" />
    </svg>
  );
}

function LayoutGridIcon() {
  return (
    <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  );
}

const METRIC_ICONS = {
  clock: MetricClockIcon,
  fileCheck: FileCheckIcon,
  grid: LayoutGridIcon,
};

// ---------------------------------------------------------------------------
// FAQ Accordion
// ---------------------------------------------------------------------------

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className || "h-5 w-5"}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  );
}

function PricingFaq() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="pb-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold text-white text-center mb-10">
          Frequently asked questions
        </h2>

        <div className="divide-y divide-gray-700 border border-gray-700 rounded-xl bg-gray-800 overflow-hidden">
          {FAQ_ITEMS.map((item, index) => (
            <div key={item.question}>
              <button
                type="button"
                onClick={() => toggle(index)}
                aria-expanded={openIndex === index}
                className="w-full flex items-center justify-between px-6 py-4 text-left transition-colors hover:bg-gray-700/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-inset"
              >
                <span className="text-sm font-medium text-white pr-4">
                  {item.question}
                </span>
                <ChevronDownIcon
                  className={`h-5 w-5 text-gray-400 shrink-0 transition-transform duration-200 ${
                    openIndex === index ? "rotate-180" : ""
                  }`}
                />
              </button>
              {openIndex === index && (
                <div className="px-6 pb-4">
                  <p className="text-sm text-gray-400 leading-relaxed">
                    {item.answer}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PricingPage() {
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("monthly");
  const { canInstall, isInstalled, isIOS, promptInstall } = useInstallPrompt();

  const formatPrice = (plan: PricingPlan) => {
    if (billingPeriod === "annual") {
      const monthlyEquivalent = Math.round(plan.annualPrice / 12);
      return monthlyEquivalent;
    }
    return plan.monthlyPrice;
  };

  const formatTotalPrice = (plan: PricingPlan) => {
    if (billingPeriod === "annual") {
      return plan.annualPrice.toLocaleString();
    }
    return plan.monthlyPrice;
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <MarketingHeader />

      <main className="flex-1">
      {/* ----------------------------------------------------------------- */}
      {/* Hero Section                                                       */}
      {/* ----------------------------------------------------------------- */}
      <section className="pt-16 pb-8 text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Simple, transparent pricing
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-8">
            Choose the plan that fits your SDA portfolio. All plans include a 14-day free trial
            with no credit card required.
          </p>

          {/* Billing toggle */}
          <div className="flex items-center justify-center gap-4 mb-12">
            <span
              className={`text-sm font-medium ${billingPeriod === "monthly" ? "text-white" : "text-gray-400"}`}
            >
              Monthly
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={billingPeriod === "annual"}
              aria-label="Toggle between monthly and annual billing"
              onClick={() => setBillingPeriod(billingPeriod === "monthly" ? "annual" : "monthly")}
              className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 ${
                billingPeriod === "annual" ? "bg-teal-600" : "bg-gray-600"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                  billingPeriod === "annual" ? "translate-x-8" : "translate-x-1"
                }`}
              />
            </button>
            <span
              className={`text-sm font-medium ${billingPeriod === "annual" ? "text-white" : "text-gray-400"}`}
            >
              Annual
            </span>
            {billingPeriod === "annual" && (
              <span className="bg-teal-600/20 text-teal-400 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                Save 17%
              </span>
            )}
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Pricing Cards                                                      */}
      {/* ----------------------------------------------------------------- */}
      <section className="pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {PLANS.map((plan) => (
              <div
                key={plan.id}
                className={`relative bg-gray-800 rounded-xl border p-8 flex flex-col ${
                  plan.highlighted
                    ? "border-teal-500 ring-2 ring-teal-500/20"
                    : "border-gray-700"
                }`}
              >
                {/* Badge */}
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-teal-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                      {plan.badge}
                    </span>
                  </div>
                )}

                {/* Plan header */}
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-white mb-1">{plan.name}</h2>
                  <p className="text-sm text-gray-400">{plan.description}</p>
                </div>

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-white">
                      ${formatPrice(plan)}
                    </span>
                    <span className="text-gray-400 text-sm">/month</span>
                  </div>
                  {billingPeriod === "annual" && (
                    <p className="text-sm text-gray-400 mt-1">
                      ${formatTotalPrice(plan)} billed annually
                    </p>
                  )}
                </div>

                {/* Limits */}
                <div className="flex flex-col gap-1 mb-6 pb-6 border-b border-gray-700">
                  <span className="text-sm text-gray-300">{plan.propertyLimit}</span>
                  <span className="text-sm text-gray-300">{plan.userLimit}</span>
                </div>

                {/* Features list */}
                <ul className="flex flex-col gap-3 mb-8 flex-grow" aria-label={`${plan.name} plan features`}>
                  {plan.features.map((feature) => (
                    <li key={feature.text} className="flex items-start gap-2">
                      {feature.included ? (
                        <CheckIcon className="h-5 w-5 text-teal-400 shrink-0 mt-0.5" />
                      ) : (
                        <XIcon className="h-5 w-5 text-gray-400 shrink-0 mt-0.5" />
                      )}
                      <span className={feature.included ? "text-sm text-gray-300" : "text-sm text-gray-400"}>
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Link
                  href={`/register?plan=${plan.id}`}
                  className={`block text-center py-3 px-4 rounded-lg font-medium text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-800 ${
                    plan.highlighted
                      ? "bg-teal-600 hover:bg-teal-700 text-white focus-visible:ring-teal-500"
                      : "bg-gray-700 hover:bg-gray-600 text-white focus-visible:ring-gray-500"
                  }`}
                >
                  Start Free Trial
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Trust Badges                                                       */}
      {/* ----------------------------------------------------------------- */}
      <section className="pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="flex items-center gap-3 justify-center bg-gray-800/50 rounded-lg px-4 py-4 border border-gray-700/50">
              <ClockIcon />
              <span className="text-sm font-medium text-gray-300">14-day free trial</span>
            </div>
            <div className="flex items-center gap-3 justify-center bg-gray-800/50 rounded-lg px-4 py-4 border border-gray-700/50">
              <CreditCardIcon />
              <span className="text-sm font-medium text-gray-300">No credit card required</span>
            </div>
            <div className="flex items-center gap-3 justify-center bg-gray-800/50 rounded-lg px-4 py-4 border border-gray-700/50">
              <ShieldIcon />
              <span className="text-sm font-medium text-gray-300">Cancel anytime</span>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Feature Comparison Table                                           */}
      {/* ----------------------------------------------------------------- */}
      <section className="pb-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-white text-center mb-8">
            Compare plans in detail
          </h2>

          <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-4 gap-4 px-6 py-4 border-b border-gray-700 bg-gray-800/80">
              <div className="text-sm font-medium text-gray-400">Feature</div>
              <div className="text-sm font-medium text-gray-300 text-center">Starter</div>
              <div className="text-sm font-medium text-teal-400 text-center">Professional</div>
              <div className="text-sm font-medium text-gray-300 text-center">Enterprise</div>
            </div>

            {COMPARISON_CATEGORIES.map((category) => (
              <div key={category.name}>
                {/* Category header */}
                <div className="px-6 py-3 bg-gray-900/50 border-b border-gray-700">
                  <h3 className="text-sm font-semibold text-white">{category.name}</h3>
                </div>

                {/* Feature rows */}
                {category.features.map((feature, index) => (
                  <div
                    key={feature.name}
                    className={`grid grid-cols-4 gap-4 px-6 py-3 ${
                      index < category.features.length - 1 ? "border-b border-gray-700/50" : "border-b border-gray-700"
                    }`}
                  >
                    <div className="text-sm text-gray-300">{feature.name}</div>
                    {(["starter", "professional", "enterprise"] as const).map((tier) => {
                      const value = feature[tier];
                      return (
                        <div key={tier} className="flex justify-center">
                          {typeof value === "boolean" ? (
                            value ? (
                              <CheckIcon className="h-5 w-5 text-teal-400" />
                            ) : (
                              <XIcon className="h-5 w-5 text-gray-400" />
                            )
                          ) : (
                            <span className="text-sm text-gray-300">{value}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* CTA Section                                                        */}
      {/* ----------------------------------------------------------------- */}
      <section className="pb-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-gradient-to-br from-teal-900/30 to-gray-800 rounded-xl border border-teal-600/30 p-10">
            <h2 className="text-2xl font-bold text-white mb-3">
              Ready to streamline your SDA management?
            </h2>
            <p className="text-gray-400 mb-6">
              Join Australian SDA providers who trust MySDAManager for compliance, reporting, and property management.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/register"
                className="inline-block bg-teal-600 hover:bg-teal-700 text-white font-medium px-8 py-3 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
              >
                Start Your Free Trial
              </Link>
              {canInstall && !isInstalled && (
                <button
                  onClick={() => promptInstall()}
                  className="inline-flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white font-medium px-8 py-3 rounded-lg border border-gray-600 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Install App
                </button>
              )}
              {isIOS && !isInstalled && (
                <span className="text-sm text-gray-400">
                  On iOS: Tap Share then &quot;Add to Home Screen&quot;
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* FAQ Accordion                                                      */}
      {/* ----------------------------------------------------------------- */}
      <PricingFaq />

      {/* ----------------------------------------------------------------- */}
      {/* ROI Calculator                                                     */}
      {/* ----------------------------------------------------------------- */}
      <section className="pb-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-white text-center mb-10">
            The real cost of workarounds
          </h2>

          <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
            {/* Manual cost */}
            <div className="px-6 py-5 border-b border-gray-700">
              <span className="block text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">
                Manual compliance management
              </span>
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="text-gray-300 text-sm">4 hours/week</span>
                <span className="text-gray-400" aria-hidden="true">x</span>
                <span className="text-gray-300 text-sm">$75/hour</span>
                <span className="text-gray-400" aria-hidden="true">x</span>
                <span className="text-gray-300 text-sm">52 weeks</span>
                <span className="text-gray-400" aria-hidden="true">=</span>
                <span className="text-xl font-bold text-red-400">$15,600/year</span>
              </div>
            </div>

            {/* MySDAManager cost */}
            <div className="px-6 py-5 border-b border-gray-700">
              <span className="block text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">
                MySDAManager Professional
              </span>
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="text-gray-300 text-sm">$899/month</span>
                <span className="text-gray-400" aria-hidden="true">x</span>
                <span className="text-gray-300 text-sm">12 months</span>
                <span className="text-gray-400" aria-hidden="true">=</span>
                <span className="text-xl font-bold text-teal-400">$10,788/year</span>
              </div>
            </div>

            {/* Savings */}
            <div className="px-6 py-8 bg-teal-950/20 text-center">
              <span className="block text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Your annual savings
              </span>
              <span className="block text-5xl sm:text-6xl font-bold text-teal-400">$4,812</span>
              <span className="block text-sm text-gray-400 mt-2">per year</span>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Operational Metrics                                                */}
      {/* ----------------------------------------------------------------- */}
      <section className="pb-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-white text-center mb-3">
            Built for real SDA operations
          </h2>
          <p className="text-gray-400 text-center mb-10 max-w-2xl mx-auto">
            Measurable time savings from day one — not promises, just results.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {METRICS.map((metric) => {
              const IconComponent = METRIC_ICONS[metric.icon];
              return (
                <div
                  key={metric.icon}
                  className="bg-gray-800 rounded-xl border border-gray-700 p-6 flex flex-col items-start"
                >
                  <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-teal-600/15 text-teal-400 mb-4">
                    <IconComponent />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">
                    {metric.headline}
                  </h3>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    {metric.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
