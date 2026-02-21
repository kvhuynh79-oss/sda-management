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
  annualSavings: number;
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
    annualSavings: 998,
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
    annualSavings: 1798,
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
    annualSavings: 2998,
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
// ROI Calculator
// ---------------------------------------------------------------------------

function RoiCalculator() {
  const [propertyCount, setPropertyCount] = useState(10);

  // Calculations
  const annualAdminCost = propertyCount * 1560;
  const estimatedSdaRevenuePerProperty = 30000; // conservative avg SDA revenue per property
  const consultingRate = 0.08;
  const annualConsultingCost = Math.round(propertyCount * estimatedSdaRevenuePerProperty * consultingRate);

  // Tier matching
  let planName: string;
  let monthlyPrice: number;
  if (propertyCount <= 10) {
    planName = "Starter";
    monthlyPrice = 499;
  } else if (propertyCount <= 25) {
    planName = "Professional";
    monthlyPrice = 899;
  } else {
    planName = "Enterprise";
    monthlyPrice = 1499;
  }
  const annualSoftwareCost = monthlyPrice * 12;

  // Compare against admin cost (lower of the two anchors)
  const savings = annualAdminCost - annualSoftwareCost;

  return (
    <section className="pb-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold text-white text-center mb-3">
          See how much you could save
        </h2>
        <p className="text-gray-400 text-center mb-10 max-w-2xl mx-auto">
          Adjust the slider to match your portfolio size.
        </p>

        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          {/* Slider input */}
          <div className="px-6 py-6 border-b border-gray-700">
            <label htmlFor="property-slider" className="block text-sm font-semibold text-gray-300 mb-1">
              Number of SDA properties managed
            </label>
            <div className="flex items-center gap-4">
              <input
                id="property-slider"
                type="range"
                min={1}
                max={50}
                value={propertyCount}
                onChange={(e) => setPropertyCount(Number(e.target.value))}
                className="flex-1 h-2 rounded-full appearance-none bg-gray-600 accent-teal-500 cursor-pointer"
              />
              <span className="text-2xl font-bold text-white min-w-[3ch] text-right">{propertyCount}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>1</span>
              <span>50</span>
            </div>
          </div>

          {/* Row 1 — Annual manual admin cost */}
          <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
            <div>
              <span className="block text-sm font-medium text-gray-300">Annual manual admin cost</span>
              <span className="block text-xs text-gray-400">{propertyCount} properties &times; $1,560/year</span>
            </div>
            <span className="text-lg font-bold text-red-400">${annualAdminCost.toLocaleString()}/yr</span>
          </div>

          {/* Row 2 — SDA consulting alternative */}
          <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
            <div>
              <span className="block text-sm font-medium text-gray-300">SDA consulting alternative</span>
              <span className="block text-xs text-gray-400">{propertyCount} &times; ~$30k revenue &times; 8%</span>
            </div>
            <span className="text-lg font-bold text-red-400">${annualConsultingCost.toLocaleString()}/yr</span>
          </div>

          {/* Row 3 — MySDAManager cost */}
          <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
            <div>
              <span className="block text-sm font-medium text-gray-300">MySDAManager {planName}</span>
              <span className="block text-xs text-gray-400">${monthlyPrice}/month &times; 12 months</span>
            </div>
            <span className="text-lg font-bold text-teal-400">${annualSoftwareCost.toLocaleString()}/yr</span>
          </div>

          {/* Net result */}
          <div className="px-6 py-8 bg-teal-950/20 text-center">
            <span className="block text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
              {savings > 0 ? "You save" : "Your investment"}
            </span>
            <span className={`block text-5xl sm:text-6xl font-bold ${savings > 0 ? "text-teal-400" : "text-white"}`}>
              ${Math.abs(savings).toLocaleString()}
            </span>
            <span className="block text-sm text-gray-400 mt-2">
              per year {savings > 0 ? "vs manual admin alone" : ""}
            </span>
          </div>

          {/* Footnote */}
          <div className="px-6 py-3 border-t border-gray-700">
            <p className="text-xs text-gray-400 text-center">
              Based on industry averages for SDA compliance administration.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

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
              <>
                <span className="bg-teal-600/20 text-teal-400 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                  Save 17%
                </span>
                <span className="bg-teal-600 text-white text-xs font-semibold px-2.5 py-0.5 rounded-full">
                  2 months free
                </span>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Cost Anchoring — The Real Cost Without Software                    */}
      {/* ----------------------------------------------------------------- */}
      <section className="pb-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-white text-center mb-3">
            The real cost of managing SDA without software
          </h2>
          <p className="text-gray-400 text-center mb-8 max-w-2xl mx-auto">
            Before you compare plans, consider what you&apos;re already spending.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1 — Manual Admin Cost */}
            <div className="relative rounded-xl border border-red-500/30 bg-red-950/20 p-6 flex flex-col">
              <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-red-500/15 text-red-400 mb-4">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-3xl font-bold text-red-400 mb-1">$15,600/year</span>
              <span className="text-sm font-semibold text-white mb-2">Manual SDA compliance admin</span>
              <p className="text-sm text-gray-400 leading-relaxed">
                15+ hours/week on spreadsheets, emails, audit prep, and NDIS claims
              </p>
            </div>

            {/* Card 2 — SDA Consulting Fees */}
            <div className="relative rounded-xl border border-red-500/30 bg-red-950/20 p-6 flex flex-col">
              <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-red-500/15 text-red-400 mb-4">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                </svg>
              </div>
              <span className="text-3xl font-bold text-red-400 mb-1">$12,000&ndash;$20,000/year</span>
              <span className="text-sm font-semibold text-white mb-2">SDA consulting &amp; management fees</span>
              <p className="text-sm text-gray-400 leading-relaxed">
                6&ndash;10% of your SDA revenue for external compliance management
              </p>
            </div>

            {/* Card 3 — Failed Audit Risk */}
            <div className="relative rounded-xl border border-red-500/30 bg-red-950/20 p-6 flex flex-col">
              <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-red-500/15 text-red-400 mb-4">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <span className="text-3xl font-bold text-red-400 mb-1">$50,000&ndash;$200,000+</span>
              <span className="text-sm font-semibold text-white mb-2">NDIS audit non-compliance</span>
              <p className="text-sm text-gray-400 leading-relaxed">
                Remediation costs, lost enrollments, and reputational damage
              </p>
            </div>
          </div>

          {/* Green resolution callout */}
          <div className="mt-8 rounded-xl border border-teal-500/30 bg-teal-950/20 px-6 py-5 text-center">
            <p className="text-lg font-semibold text-teal-400">
              MySDAManager Professional: $899/month — pays for itself in the first month.
            </p>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Founding Member Banner                                             */}
      {/* ----------------------------------------------------------------- */}
      <section className="pb-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-xl border border-teal-500/40 bg-gradient-to-r from-teal-950/40 via-teal-900/20 to-teal-950/40 px-6 py-6 sm:px-10 sm:py-8 text-center overflow-hidden">
            {/* Decorative corner accents */}
            <div className="absolute top-0 left-0 w-24 h-24 bg-teal-500/5 rounded-br-full" aria-hidden="true" />
            <div className="absolute bottom-0 right-0 w-24 h-24 bg-teal-500/5 rounded-tl-full" aria-hidden="true" />

            <div className="relative">
              <span className="inline-block bg-teal-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide mb-4">
                Limited Offer
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                Founding Member Offer
              </h2>
              <p className="text-lg text-teal-300 font-medium mb-2">
                First 10 customers lock in launch pricing for 24 months
              </p>
              <p className="text-sm text-gray-400">
                Limited spots remaining — secure your rate before prices increase.
              </p>
            </div>
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
                    <>
                      <p className="text-sm text-gray-400 mt-1">
                        ${formatTotalPrice(plan)} billed annually
                      </p>
                      <span className="inline-block mt-2 bg-teal-600/20 text-teal-400 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                        Save ${plan.annualSavings.toLocaleString()}/year
                      </span>
                    </>
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

                {/* Custom demo link for Enterprise plan */}
                {plan.id === "enterprise" && (
                  <Link
                    href="/book-demo"
                    className="block text-center mt-3 text-sm text-teal-400 hover:text-teal-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded"
                  >
                    Managing 30+ properties? Book a custom demo &rarr;
                  </Link>
                )}
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
      <RoiCalculator />

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
