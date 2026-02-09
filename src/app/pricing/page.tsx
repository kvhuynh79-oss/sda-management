"use client";

import { useState } from "react";
import Link from "next/link";

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
    monthlyPrice: 250,
    annualPrice: 2500,
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
    monthlyPrice: 450,
    annualPrice: 4170,
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
    monthlyPrice: 600,
    annualPrice: 6000,
    description: "Full-featured solution for established providers.",
    propertyLimit: "Up to 50 properties",
    userLimit: "Up to 50 users",
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

// Feature comparison rows for the table
const COMPARISON_CATEGORIES = [
  {
    name: "Core Features",
    features: [
      { name: "Properties", starter: "10", professional: "25", enterprise: "50" },
      { name: "Users", starter: "5", professional: "15", enterprise: "50" },
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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PricingPage() {
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("monthly");

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
    <div className="min-h-screen bg-gray-900">
      {/* ----------------------------------------------------------------- */}
      {/* Header                                                            */}
      {/* ----------------------------------------------------------------- */}
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
                className="text-teal-400 font-medium text-sm"
                aria-current="page"
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
                        <XIcon className="h-5 w-5 text-gray-600 shrink-0 mt-0.5" />
                      )}
                      <span className={feature.included ? "text-sm text-gray-300" : "text-sm text-gray-500"}>
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
                              <XIcon className="h-5 w-5 text-gray-600" />
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
            <Link
              href="/register"
              className="inline-block bg-teal-600 hover:bg-teal-700 text-white font-medium px-8 py-3 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
            >
              Start Your Free Trial
            </Link>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Footer                                                             */}
      {/* ----------------------------------------------------------------- */}
      <footer className="border-t border-gray-800 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-gray-400">
              <ShieldIcon />
              <span className="text-sm">MySDAManager</span>
            </div>
            <div className="flex items-center gap-6">
              <Link href="/pricing" className="text-sm text-gray-400 hover:text-white transition-colors">
                Pricing
              </Link>
              <Link href="/login" className="text-sm text-gray-400 hover:text-white transition-colors">
                Login
              </Link>
              <Link href="/register" className="text-sm text-gray-400 hover:text-white transition-colors">
                Register
              </Link>
            </div>
            <p className="text-sm text-gray-500">
              &copy; {new Date().getFullYear()} MySDAManager. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
